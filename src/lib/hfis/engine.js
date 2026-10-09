/**
 * Motor de inferencia difusa (Mamdani y Sugeno orden-0), port literal de
 * `hfis/membership.py` + `hfis/engine.py` del repo de la tesis.
 *
 * Equivalente de `evalfis` de la Fuzzy Logic Toolbox para el subconjunto que
 * usa el sistema:
 *     Mamdani : and=min, or=max, impl=min, agg=max, defuzz=centroid
 *     Sugeno-0: and=min, or=max, impl=prod, agg=sum, defuzz=wtaver
 *
 * Sin dependencias y sin estado de modulo: los resultados se comparan contra
 * el Python con tolerancia 1e-6, asi que cada detalle numerico de abajo esta
 * replicado a proposito, no por casualidad.
 *
 * Convencion de reglas (identica a MATLAB): los antecedentes son indices de
 * MF **1-based** y 0 significa comodin. `conexion` 1 = AND, 2 = OR.
 */

// MATLAB defuzzifica el centroide sobre 101 puntos del universo de salida.
// Cambiar este numero mueve el resultado de todos los FIS Mamdani.
export const N_MUESTRAS_SALIDA = 101;

/**
 * Triangular. params = [a, b, c] con a <= b <= c.
 *
 * El caso x === b se resuelve ANTES que los bordes: en una MF degenerada
 * (a === b, hombro izquierdo) MATLAB devuelve 1 en x = a, no 0.
 */
export function trimf(x, p) {
  const [a, b, c] = p;
  if (x === b) return 1.0;
  if (x <= a || x >= c) return 0.0;
  if (x < b) return b > a ? (x - a) / (b - a) : 1.0;
  return c > b ? (c - x) / (c - b) : 1.0;
}

/**
 * Trapezoidal. params = [a, b, c, d] con a <= b <= c <= d.
 *
 * Los 30 trapmf de los specs son TODOS degenerados (son los hombros de cada
 * variable: a===b o c===d). Sin los dos bordes cerrados de abajo el grado en
 * los extremos del universo de salida cae a 0 y el centroide se desplaza.
 */
export function trapmf(x, p) {
  const [a, b, c, d] = p;
  if (x <= a || x >= d) {
    if (x === a && a === b) return 1.0;
    if (x === d && d === c) return 1.0;
    return 0.0;
  }
  if (x >= b && x <= c) return 1.0;
  if (x < b) return b > a ? (x - a) / (b - a) : 1.0;
  return d > c ? (d - x) / (d - c) : 1.0;
}

// `gaussmf` no se porta: ningun spec la usa. `constant` tampoco entra aqui,
// el camino Sugeno lee `params[0]` directamente sin evaluar la MF.
const MF_REGISTRY = { trimf, trapmf };

export function evaluarMF(tipo, x, params) {
  const f = MF_REGISTRY[tipo];
  if (!f) throw new Error(`Tipo de MF no soportado: ${tipo}`);
  return f(x, params);
}

/**
 * Normaliza el spec JSON al objeto que consume el motor. Casi la identidad:
 * sólo fuerza numeros (el JSON podria traer strings) y rellena los valores
 * por omision de `peso` y `conexion` que el Python aplica al leer.
 */
export function fisDesdeSpec(spec) {
  const variable = (v) => ({
    nombre: v.nombre,
    rango: [Number(v.rango[0]), Number(v.rango[1])],
    mfs: v.mfs.map((m) => ({
      nombre: m.nombre,
      tipo: m.tipo,
      params: m.params.map(Number),
    })),
  });

  return {
    nombre: spec.nombre,
    tipo: spec.tipo,
    operadores: spec.operadores,
    entradas: spec.entradas.map(variable),
    salida: variable(spec.salida),
    reglas: spec.reglas.map((r) => ({
      antecedentes: r.antecedentes.map((i) => Math.trunc(Number(i))),
      consecuente: Math.trunc(Number(r.consecuente)),
      peso: r.peso === undefined ? 1.0 : Number(r.peso),
      conexion: r.conexion === undefined ? 1 : Math.trunc(Number(r.conexion)),
      glosa: r.glosa === undefined ? '' : r.glosa,
    })),
  };
}

const recortar = (x, [lo, hi]) => Math.min(hi, Math.max(lo, x));

/** Grado de activacion (firing strength) de cada regla. */
export function fuerzas(fis, x) {
  if (x.length !== fis.entradas.length) {
    throw new Error(
      `${fis.nombre}: se esperaban ${fis.entradas.length} entradas, llegaron ${x.length}`,
    );
  }
  // Recorte al universo, igual que MATLAB: satura, no extrapola.
  const grados = fis.entradas.map((v, i) => {
    const xi = recortar(Number(x[i]), v.rango);
    return v.mfs.map((mf) => evaluarMF(mf.tipo, xi, mf.params));
  });

  return fis.reglas.map((regla) => {
    const terminos = [];
    regla.antecedentes.forEach((idx, i) => {
      if (idx !== 0) terminos.push(grados[i][idx - 1]);
    });
    let w;
    if (terminos.length === 0) w = 1.0; // regla sin antecedentes: siempre activa
    else if (regla.conexion === 1) w = Math.min(...terminos);
    else w = Math.max(...terminos);
    return w * regla.peso;
  });
}

/** Salida defuzzificada, o `null` si ninguna regla se activa. */
export function evaluar(fis, x) {
  const w = fuerzas(fis, x);
  return fis.tipo === 'sugeno' ? defuzzSugeno(fis, w) : defuzzMamdani(fis, w);
}

/** Media ponderada de las constantes de salida (wtaver). */
function defuzzSugeno(fis, w) {
  let num = 0.0;
  let den = 0.0;
  for (let i = 0; i < fis.reglas.length; i++) {
    const wi = w[i];
    if (wi <= 0.0) continue;
    const c = Number(fis.salida.mfs[fis.reglas[i].consecuente - 1].params[0]);
    num += wi * c;
    den += wi;
  }
  if (den <= 0.0) return null;
  return num / den;
}

/** Implicacion min, agregacion max y centroide sobre el universo muestreado. */
function defuzzMamdani(fis, w) {
  const [lo, hi] = fis.salida.rango;
  const n = N_MUESTRAS_SALIDA;
  const paso = (hi - lo) / (n - 1);

  let num = 0.0;
  let den = 0.0;
  let activa = false;
  for (let k = 0; k < n; k++) {
    const y = lo + k * paso;
    let agg = 0.0;
    for (let i = 0; i < fis.reglas.length; i++) {
      const wi = w[i];
      if (wi <= 0.0) continue;
      const mf = fis.salida.mfs[fis.reglas[i].consecuente - 1];
      const mu = evaluarMF(mf.tipo, y, mf.params);
      const val = mu < wi ? mu : wi; // implicacion = min
      if (val > agg) agg = val; // agregacion = max
    }
    if (agg > 0.0) activa = true;
    // Sin multiplicar por `paso`: se cancela entre numerador y denominador.
    num += y * agg;
    den += agg;
  }
  if (!activa || den <= 0.0) return null;
  return num / den;
}

/** [[indice1based, fuerza, glosa]] de las reglas que disparan, de mayor a menor. */
export function reglasActivas(fis, x, umbral = 1e-9) {
  const w = fuerzas(fis, x);
  const res = [];
  w.forEach((wi, i) => {
    if (wi > umbral) res.push([i + 1, wi, fis.reglas[i].glosa ?? '']);
  });
  res.sort((a, b) => b[1] - a[1]);
  return res;
}
