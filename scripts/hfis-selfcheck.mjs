/**
 * Comprobación del port del sistema experto difuso contra el Python original.
 *
 * Es la ÚNICA prueba del repositorio, así que cubre los dos riesgos reales por
 * separado:
 *
 *   A. motor + pipeline — las 6 máquinas de `ejemplos.maquinas_ejemplo()`, que
 *      entran ya como grados difusos y no tocan ni una fecha. Verifica las
 *      funciones de pertenencia, el centroide, los pesos de regla y el orden.
 *   B. dbMapping — los 4 bundles de `ejemplos.bundles_ejemplo()`, filas crudas
 *      estilo Supabase con un instante de referencia fijo. Verifica las once
 *      derivaciones y, sobre todo, el parseo de fechas: Python asume UTC cuando
 *      el ISO no trae offset y JS asumiría hora local, y seis horas bastan para
 *      mover una máquina de «En línea» a «Caída». VM103 con
 *      `dias_sin_contacto = 5.0` es el caso que lo delata.
 *
 * Los ficheros `hfis-*.json` de esta carpeta se generan desde el repo de la
 * tesis y se versionan: son el contrato entre los dos lenguajes. Para
 * regenerarlos, ver `.doc/HFIS_RECOMENDACIONES.md`.
 *
 * Viven en scripts/ y no en src/ para que Vite no los meta en el bundle.
 *
 * Uso:  node scripts/hfis-selfcheck.mjs       (o `npm run hfis:check`)
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { fisDesdeSpec } from '../src/lib/hfis/engine.js';
import { priorizarRed } from '../src/lib/hfis/pipeline.js';
import { construirRed } from '../src/lib/hfis/dbMapping.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..');
const TOL = 1e-6;

/** Mismo instante de referencia que usa `ejemplos.AHORA` del lado Python. */
const AHORA = new Date('2026-09-01T12:00:00Z');

const leerJson = async (p) => JSON.parse(await readFile(join(RAIZ, p), 'utf8'));

/**
 * Los specs se leen con readFile, NO con `import ... with { type: 'json' }`:
 * Vite resuelve el import de JSON de forma nativa pero Node exige el atributo,
 * y esa asimetría rompería uno de los dos lados. Por eso `fis.js` —el único
 * archivo que importa JSON— queda fuera de esta cadena; lo que de verdad hay
 * que verificar es engine/pipeline/dbMapping, y esos se importan directo.
 */
async function cargarFis() {
  const nombres = ['inventario', 'seguridad', 'mantenimiento', 'conectividad', 'maestro'];
  const specs = await Promise.all(
    nombres.map((n) => leerJson(`src/lib/hfis/specs/${n}.json`))
  );
  return Object.fromEntries(nombres.map((n, i) => [n, fisDesdeSpec(specs[i])]));
}

// ─── Comparación ─────────────────────────────────────────────────────────────

/**
 * Compara recursivamente lo obtenido contra el golden. Recorre las claves del
 * GOLDEN, no las del resultado: así los extras que la PWA añade (`nombre`,
 * `machine_id`, que el `Resultado` de Python no lleva) no cuentan como
 * diferencia, pero ninguna de las claves del contrato puede faltar.
 */
function comparar(esperado, obtenido, ruta, fallos) {
  if (typeof esperado === 'number') {
    if (typeof obtenido !== 'number' || !Number.isFinite(obtenido)) {
      fallos.push(`${ruta}: se esperaba el número ${esperado}, llegó ${JSON.stringify(obtenido)}`);
    } else if (Math.abs(esperado - obtenido) > TOL) {
      fallos.push(`${ruta}: esperado ${esperado}, obtenido ${obtenido} (Δ ${Math.abs(esperado - obtenido).toExponential(2)})`);
    }
    return;
  }
  if (esperado === null || typeof esperado !== 'object') {
    if (esperado !== obtenido) {
      fallos.push(`${ruta}: esperado ${JSON.stringify(esperado)}, obtenido ${JSON.stringify(obtenido)}`);
    }
    return;
  }
  if (Array.isArray(esperado)) {
    if (!Array.isArray(obtenido)) {
      fallos.push(`${ruta}: se esperaba un array de ${esperado.length}, llegó ${typeof obtenido}`);
      return;
    }
    if (esperado.length !== obtenido.length) {
      fallos.push(`${ruta}: longitud esperada ${esperado.length}, obtenida ${obtenido.length}`);
      return;
    }
    esperado.forEach((v, i) => comparar(v, obtenido[i], `${ruta}[${i}]`, fallos));
    return;
  }
  if (!obtenido || typeof obtenido !== 'object') {
    fallos.push(`${ruta}: se esperaba un objeto, llegó ${JSON.stringify(obtenido)}`);
    return;
  }
  for (const k of Object.keys(esperado)) {
    comparar(esperado[k], obtenido[k], `${ruta}.${k}`, fallos);
  }
}

function revisarCaso(nombre, golden, resultados) {
  const fallos = [];

  // El orden es la salida operativa del sistema: se compara antes que los
  // números, porque un orden distinto con cifras idénticas sigue siendo un fallo.
  const esperadoIds = golden.map((r) => r.id).join(' > ');
  const obtenidoIds = resultados.map((r) => r.id).join(' > ');
  if (esperadoIds !== obtenidoIds) {
    fallos.push(`orden: esperado  ${esperadoIds}\n          obtenido ${obtenidoIds}`);
  }

  const porId = new Map(resultados.map((r) => [r.id, r]));
  for (const esperado of golden) {
    const obtenido = porId.get(esperado.id);
    if (!obtenido) {
      fallos.push(`${esperado.id}: no aparece en el resultado`);
      continue;
    }
    comparar(esperado, obtenido, esperado.id, fallos);
  }

  if (fallos.length) {
    console.error(`\n  ✗ ${nombre} — ${fallos.length} diferencia(s):`);
    for (const f of fallos.slice(0, 25)) console.error(`      ${f}`);
    if (fallos.length > 25) console.error(`      … y ${fallos.length - 25} más`);
  } else {
    const resumen = golden.map((r) => `${r.id} ${r.prioridad.toFixed(2)}`).join(', ');
    console.log(`  ✓ ${nombre} — ${golden.length} casos (${resumen})`);
  }
  return fallos.length;
}

async function main() {
  const fis = await cargarFis();
  console.log('Comprobando el port del H-FIS contra el Python de la tesis (tol 1e-6)\n');

  let fallos = 0;

  // A — motor y pipeline, con las entradas difusas ya calculadas.
  const maquinas = await leerJson('scripts/hfis-maquinas.json');
  fallos += revisarCaso(
    'motor + pipeline',
    await leerJson('scripts/hfis-golden-maquinas.json'),
    priorizarRed(maquinas, fis, { explicar: true })
  );

  // B — dbMapping, desde filas crudas y con fechas reales.
  const bundles = await leerJson('scripts/hfis-bundles.json');
  fallos += revisarCaso(
    'dbMapping + motor',
    await leerJson('scripts/hfis-golden-bundles.json'),
    priorizarRed(construirRed(bundles, AHORA), fis, { explicar: true })
  );

  if (fallos) {
    console.error(
      '\nEl port divergió del original. El culpable es casi siempre uno de tres:\n' +
        '  · los bordes degenerados de trimf/trapmf (a==b o c==d) — todos los hombros de los specs lo son;\n' +
        '  · el muestreo del centroide Mamdani (tienen que ser exactamente 101 puntos);\n' +
        '  · el parseo de fechas en dbMapping (un ISO sin offset es UTC, no hora local).\n' +
        'El campo que falla arriba los distingue.'
    );
    process.exit(1);
  }
  console.log('\nTodo coincide.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
