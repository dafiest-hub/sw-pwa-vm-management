/**
 * Pipeline end-to-end: maquina -> scores -> prioridad -> lista ordenada.
 * Port literal de `hfis/pipeline.py` del repo de la tesis.
 *
 * Las claves de entrada y de salida son snake_case igual que el Python para
 * que el JSON resultante se compare contra el golden sin traducir.
 */

import { evaluar, reglasActivas } from './engine.js';

// Banda de indiferencia (puntos de Prioridad) para la politica de desempate.
export const BANDA = 3.0;

// Temperatura asumida cuando el dato no existe (la BD no la expone hoy).
// 22 C cae en el centro de la MF 'Normal': es el valor neutro del FIS.
const TEMP_NEUTRA = 22.0;

const UMBRALES_ETIQUETA = [
  [25.0, 'Baja'],
  [50.0, 'Media'],
  [75.0, 'Alta'],
];

// A partir de cuantos dias sin keepalive los otros tres dominios son una foto
// vieja. Coincide con el hombro derecho de la MF 'Enlinea' del FIS-Conectividad.
const DIAS_DATOS_RANCIOS = 0.5;

// shortcut: `round()` de Python es half-even y `Math.round` es half-up; sólo
// divergen en un .xx5 exacto pegado a un umbral de etiqueta. Si apareciera,
// habria que replicar half-even aqui.
export const redondear2 = (x) => Math.round(x * 100) / 100;

/** <25 Baja | 25-50 Media | 50-75 Alta | >=75 Critica. */
export function etiquetaPrioridad(p) {
  for (const [limite, etq] of UMBRALES_ETIQUETA) {
    if (p < limite) return etq;
  }
  return 'Critica';
}

/** Sustituye `null` (ninguna regla activa) por 0 y deja constancia. */
function guard(valor, nombre, avisos) {
  if (valor === null) {
    avisos.push(`${nombre}: ninguna regla se activo; se usa 0.`);
    return 0.0;
  }
  return Number(valor);
}

/**
 * Evalua una maquina de extremo a extremo.
 *
 * Inventario se evalua POR TANQUE y se agrega con `max`: cualquier tanque
 * critico debe disparar la visita a la maquina.
 */
export function evaluarMaquina(maquina, fis, { explicar = true } = {}) {
  const avisos = [];
  const fInv = fis.inventario;
  const fSeg = fis.seguridad;
  const fMant = fis.mantenimiento;
  const fMae = fis.maestro;

  // ---- Inventario (por tanque) ----
  const tanques = maquina.tanques ?? [];
  const scoresT = tanques.map((t) => {
    // El FIS se construye con un Dmax; si el tanque declara otro, se reescala
    // la demanda al universo del FIS para no saturarla.
    const dmaxFis = fInv.entradas[1].rango[1];
    const demanda = t.dmax ? t.demanda * (dmaxFis / t.dmax) : t.demanda;
    const v = evaluar(fInv, [t.nivel, demanda, t.dias_stockout]);
    return guard(v, `Score_Inv (tanque ${t.tank_number})`, avisos);
  });

  let scoreInv = 0.0;
  let tanqueCritico = null;
  let cargaInventario = 0.0;
  if (scoresT.length > 0) {
    scoreInv = Math.max(...scoresT);
    tanqueCritico = tanques[scoresT.indexOf(scoreInv)].tank_number;
    cargaInventario = scoresT.reduce((a, b) => a + b, 0) / scoresT.length;
  } else {
    avisos.push('La maquina no tiene tanques registrados; Score_Inv = 0.');
  }

  // ---- Seguridad ----
  const s = maquina.seguridad;
  const xSeg = [s.severidad, s.t_recoleccion, s.efectivo];
  const scoreSeg = guard(evaluar(fSeg, xSeg), 'Score_Seg', avisos);

  // ---- Mantenimiento (3 entradas o variante 2D sin temperatura) ----
  const m = maquina.mantenimiento;
  let xMant;
  if (fMant.entradas.length === 3) {
    let temp = m.temp;
    if (temp === null || temp === undefined) {
      temp = TEMP_NEUTRA;
      avisos.push(
        `Temperatura no disponible en la BD; se usa el valor neutro ${TEMP_NEUTRA.toFixed(1)} C (ver doc/02_mapeo_datos.md).`,
      );
    }
    xMant = [m.salud, temp, m.t_intervencion];
  } else {
    xMant = [m.salud, m.t_intervencion];
  }
  const scoreMant = guard(evaluar(fMant, xMant), 'Score_Mant', avisos);

  // ---- Conectividad ----
  // No entra al Maestro como cuarta entrada: ver `combinarConConectividad`.
  const fCon = fis.conectividad ?? null;
  const con = maquina.conectividad ?? null;
  let scoreCon = 0.0;
  let diasSinContacto = 0.0;
  let xCon = null;
  if (fCon && con) {
    diasSinContacto = con.dias_sin_contacto;
    const refFis = fCon.entradas[1].rango[1];
    const valor = con.valor_ref
      ? con.valor_diario * (refFis / con.valor_ref)
      : con.valor_diario;
    xCon = [diasSinContacto, valor];
    scoreCon = guard(evaluar(fCon, xCon), 'Score_Con', avisos);
  }

  // ---- Maestro ----
  const xMae = [scoreInv, scoreSeg, scoreMant];
  const prioridadFis = guard(evaluar(fMae, xMae), 'Prioridad', avisos);

  // La conectividad es la AUSENCIA de informacion sobre los otros tres
  // dominios, no un cuarto problema: como cuarta entrada del Maestro el
  // centroide la diluiria con las reglas de comodin (una maquina incomunicada
  // con ultimos datos tranquilos saldria ~Alta en vez de Critica). El `max`
  // dice directo que no saber nunca rebaja la urgencia de lo que si consta.
  const prioridad = prioridadFis >= scoreCon ? prioridadFis : scoreCon;

  const datosRancios = diasSinContacto > DIAS_DATOS_RANCIOS;
  if (datosRancios) {
    avisos.push(
      `Sin contacto desde hace ${diasSinContacto.toFixed(1)} d: inventario, seguridad y mantenimiento son la ultima foto conocida, no el estado actual.`,
    );
    if (con && con.alertas_antes_de_caer) {
      avisos.push(
        'Hubo alertas de bomba o seguridad justo antes de perder contacto: la caida apunta al equipo, no a la SIM.',
      );
    } else if (con) {
      avisos.push(
        'Desconexion sin alertas previas: verificar el saldo de la SIM antes de enviar a alguien.',
      );
    }
  }

  // Inventario no aparece: su explicacion es por tanque, no por maquina.
  let explicacion = {};
  if (explicar) {
    explicacion = {
      seguridad: reglasActivas(fSeg, xSeg),
      mantenimiento: reglasActivas(fMant, xMant),
      maestro: reglasActivas(fMae, xMae),
    };
    if (fCon && xCon) explicacion.conectividad = reglasActivas(fCon, xCon);
  }

  return {
    id: maquina.id,
    score_inv: redondear2(scoreInv),
    score_seg: redondear2(scoreSeg),
    score_mant: redondear2(scoreMant),
    score_con: redondear2(scoreCon),
    prioridad: redondear2(prioridad),
    // La etiqueta se deriva del valor REDONDEADO, el mismo que se publica:
    // `wtaver` puede devolver 74.99999999999999, que se publica como 75.00
    // (Critica) pero sobre el valor crudo se etiquetaba "Alta".
    etiqueta: etiquetaPrioridad(redondear2(prioridad)),
    dias_desde_visita: maquina.dias_desde_visita,
    scores_inv_tanques: scoresT.map(redondear2),
    tanque_critico: tanqueCritico,
    carga_inventario: redondear2(cargaInventario),
    prioridad_fis: redondear2(prioridadFis),
    dias_sin_contacto: redondear2(diasSinContacto),
    datos_rancios: datosRancios,
    explicacion,
    avisos,
    // Extras de la PWA (el Python no los lleva en `Resultado`): la UI los
    // necesita para enlazar a la ficha; el selfcheck los ignora.
    nombre: maquina.nombre ?? '',
    machine_id: maquina.machine_id ?? '',
  };
}

/**
 * Comparador equivalente a la `clave_orden` del Python, criterio por criterio:
 * JS no compara tuplas. La banda de indiferencia se implementa cuantizando la
 * Prioridad en cubetas de `banda` puntos; dentro de la cubeta las diferencias
 * son ruido de defuzzificacion y manda el criterio operativo.
 *
 * La CARGA existe porque `score_inv` es un `max` sobre 8 tanques y se satura:
 * entre dos maquinas con un tanque critico va primero aquella cuyos demas
 * tanques tambien estan bajos (un solo viaje resuelve mas trabajo).
 *
 * Es transitivo por construccion, asi que el orden no depende de la secuencia
 * en que lleguen las maquinas. Se porta sólo esta clave, no el comparador
 * pairwise `_va_antes` del Python, que no es transitivo.
 */
function comparar(a, b, banda) {
  const criterios = [
    // `Math.floor`, nunca `Math.trunc` ni `| 0`: replica el `//` de Python.
    -Math.floor(a.prioridad / banda) - -Math.floor(b.prioridad / banda),
    b.score_seg - a.score_seg,
    b.score_con - a.score_con,
    b.score_mant - a.score_mant,
    b.score_inv - a.score_inv,
    b.carga_inventario - a.carga_inventario,
    b.dias_desde_visita - a.dias_desde_visita,
  ];
  for (const c of criterios) {
    if (c !== 0) return c < 0 ? -1 : 1;
  }
  // Comparacion de cadena cruda, nunca `localeCompare`: dependeria del locale
  // del navegador y el desempate dejaria de ser determinista.
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Ordena la red aplicando la banda de indiferencia y el desempate. */
export function ordenarConDesempate(resultados, banda = BANDA) {
  return [...resultados].sort((a, b) => comparar(a, b, banda));
}

/** Evalua la red completa y devuelve la lista ordenada por prioridad. */
export function priorizarRed(maquinas, fis, { banda = BANDA, explicar = false } = {}) {
  const resultados = [...maquinas].map((m) => evaluarMaquina(m, fis, { explicar }));
  return ordenarConDesempate(resultados, banda);
}
