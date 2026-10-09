import { IS_DEMO } from '../lib/dataAccess';
import { getMachines, getMachineTanks } from './machineService';
import { getSales } from './salesService';
import { getAlerts } from './alertService';
import { getTankOperations, getMoneyCollections } from './operationService';
import { construirRed, PARAMS } from '../lib/hfis/dbMapping';
import { priorizarRed } from '../lib/hfis/pipeline';
import { FIS } from '../lib/hfis/fis';

/**
 * Ruta de atención: el sistema experto difuso (H-FIS) aplicado a las máquinas
 * que el usuario tiene asignadas.
 *
 * Es el ÚNICO puente entre el motor difuso (`src/lib/hfis/`, aritmética pura
 * sin dependencias) y los datos. El motor no sabe que existe Supabase y no debe
 * importar nada del repo: así los mismos archivos se pueden levantar a una Edge
 * Function el día que haya un consumidor sin sesión (un cron que notifique).
 *
 * No se escriben consultas nuevas: se reusan los seis servicios que ya existen.
 * Eso cumple el contrato del CLAUDE.md gratis —todos pasan por `query()`, ya
 * lanzan `ServiceError` y ya tienen su rama demo con la misma semántica de
 * filtrado—, mientras que unos SELECT propios duplicarían seis ramas demo, que
 * es justo donde el CLAUDE.md advierte que divergen.
 *
 * El cálculo corre en el navegador a propósito: la prioridad se calcula sobre
 * las máquinas que ese usuario puede ver, y de eso ya se encargan
 * `assigned_machine_ids` (la petición) y la RLS (la respuesta). Un cálculo
 * centralizado tendría que reimplementar ese alcance a mano.
 */

const DIA = 86400000;

/** ISO del instante `dias` antes de `ahora`. Las ventanas se cuentan hacia atrás. */
const desde = (ahora, dias) => new Date(ahora.getTime() - dias * DIA).toISOString();

/**
 * Instante de referencia de todo el cálculo. Las once entradas difusas son
 * antigüedades ("días desde…"), así que de este valor dependen todas.
 *
 * shortcut: en modo demo se ancla al keepalive más reciente del juego de datos
 * de ejemplo, que está congelado en el pasado. Con `new Date()` la demo saldría
 * entera «Crítica» —las ventas caerían fuera de la ventana de 28 días y
 * `dias_sin_contacto` saturaría a 14—, y la demo es lo que ve cualquiera que
 * entre desde la portada. Quitar cuando el mock se genere relativo a hoy.
 */
function instanteDeReferencia(machines) {
  if (!IS_DEMO()) return new Date();
  const sellos = machines
    .map((m) => m.machine_status?.last_keepalive_at)
    .filter(Boolean)
    .map((s) => new Date(s).getTime())
    .filter((t) => Number.isFinite(t));
  return sellos.length ? new Date(Math.max(...sellos)) : new Date();
}

const PAGINA = 1000;

/**
 * Lee una tabla histórica entera, no sólo su primera página.
 *
 * `applyPaging` limita a 100 filas por defecto y PostgREST **no avisa** de que
 * truncó. Con 28 días de una red de varias máquinas, quedarse con el centenar
 * de ventas más reciente hunde la demanda de todos los tanques, dispara
 * `dias_stockout` al tope y deja el inventario artificialmente tranquilo: el
 * fallo más peligroso posible aquí, porque la recomendación resultante dice
 * «no vayas».
 */
async function leerTodo(fetcher, filtros) {
  const filas = [];
  for (let page = 0; ; page++) {
    const lote = await fetcher({ ...filtros, page, pageSize: PAGINA });
    filas.push(...lote);
    if (lote.length < PAGINA) break;
    // La rama demo ignora el paginado y devuelve siempre el mismo conjunto
    // completo: sin esto, un mock de más de PAGINA filas giraría para siempre.
    if (IS_DEMO()) break;
  }
  return filas;
}

/**
 * @param {{ machineIds: string[] }} opts máquinas visibles para el usuario.
 * @returns {Promise<{ ahora: Date, resultados: object[] }>} red priorizada, de
 *   la más urgente a la menos. La salida operativa es el ORDEN, no la etiqueta.
 */
export async function getRecommendedRoute({ machineIds } = {}) {
  const machines = await getMachines(machineIds);
  if (!machines.length) return { ahora: new Date(), resultados: [] };

  const ahora = instanteDeReferencia(machines);
  const ids = machines.map((m) => m.id);
  const base = { machineIds: ids };

  // Cada ventana es el tope del universo de su FIS: más atrás, el valor ya
  // satura y traer las filas sólo costaría ancho de banda.
  const [tanquesPorMaquina, sales, alerts, operations, collections] = await Promise.all([
    // Un GET por máquina. Con una decena son peticiones de 8 filas
    // multiplexadas sobre la conexión ya abierta; ampliar el servicio a
    // `machineIds` costaría una firma y una rama demo nuevas para ahorrar
    // round-trips concurrentes. Si alguna vez duele: añadir `filters.machineIds`
    // opcional a getMachineTanks con el applyCommonFilters que ya existe.
    Promise.all(machines.map((m) => getMachineTanks(m.id))),
    leerTodo(getSales, { ...base, from: desde(ahora, PARAMS.ventanaDemandaDias) }),
    // Sin filtro de `resolved` ni de `category`: el H-FIS cuenta la alerta esté
    // resuelta o no (filtrarla subestimaría la severidad), y la categoría la
    // discrimina dbMapping, que trata distinto 'security' y 'pump'.
    leerTodo(getAlerts, { ...base, from: desde(ahora, PARAMS.ventanaSaludDias) }),
    leerTodo(getTankOperations, { ...base, from: desde(ahora, PARAMS.tIntervencionMax) }),
    leerTodo(getMoneyCollections, { ...base, from: desde(ahora, PARAMS.tRecoleccionMax) }),
  ]);

  const porMaquina = (filas) => {
    const mapa = new Map(ids.map((id) => [id, []]));
    for (const f of filas) mapa.get(f.machine_id)?.push(f);
    return mapa;
  };
  const ventasDe = porMaquina(sales);
  const alertasDe = porMaquina(alerts);
  const operacionesDe = porMaquina(operations);
  const cortesDe = porMaquina(collections);

  // Misma forma que devolvería la función SQL bundle_hfis() del repo de la
  // tesis: así la fase 2 (Edge Function) sólo cambia de dónde salen los datos,
  // no el mapeo ni el motor.
  const bundles = machines.map((m, i) => ({
    machine: m,
    status: m.machine_status || null,
    tanks: tanquesPorMaquina[i] || [],
    sales: ventasDe.get(m.id) || [],
    alerts: alertasDe.get(m.id) || [],
    operations: operacionesDe.get(m.id) || [],
    collections: cortesDe.get(m.id) || [],
  }));

  const maquinas = construirRed(bundles, ahora);
  return { ahora, resultados: priorizarRed(maquinas, FIS, { explicar: true }) };
}
