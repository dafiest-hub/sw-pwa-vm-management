import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ListOrdered, WifiOff, Droplets, ArrowUpRight } from 'lucide-react';
import { getRecommendedRoute } from '../services/recommendationService';
import { useScopedMachines } from '../hooks/useScopedMachines';
import { useAuth } from '../context/AuthContext';
import { DataTable } from '../components/ui/DataTable';
import { FilterBar, MachineFilter } from '../components/ui/Filters';
import { Badge, MachineChip, Notice, RefreshButton } from '../components/ui/Primitives';
import { StatCard } from '../components/common/StatCard';

/**
 * Ruta de atención — el sistema experto difuso de la tesis, aplicado a las
 * máquinas asignadas al usuario.
 *
 * La salida operativa es el ORDEN, no la etiqueta: con ocho tanques por máquina
 * basta que uno esté mal para que salga «Crítica», así que en una red real la
 * mayoría lo estará. De ahí que la primera columna sea la posición y que la
 * tabla no se pueda reordenar por ninguna otra.
 */

const ETIQUETA_TONO = { Critica: 'danger', Alta: 'warn', Media: 'info', Baja: 'neutral' };

/** Tono del sub-score, con los cortes de las MF de entrada del Maestro. */
const tonoScore = (v) => (v >= 80 ? 'danger' : v >= 60 ? 'warn' : v >= 30 ? 'info' : 'neutral');

const n2 = (v) => Number(v ?? 0).toFixed(2);
const dias = (v) => `${Number(v ?? 0).toFixed(1)} d`;

const ScoreCell = (valor) => <Badge tone={tonoScore(valor)}>{n2(valor)}</Badge>;

/**
 * Los `avisos` del motor son de dos clases: unos le dicen algo al técnico y
 * otros son diagnósticos del propio cálculo (ninguna regla activa, temperatura
 * ausente, máquina sin tanques). Aquí sólo se traduce la primera clase; los
 * diagnósticos se quedan en `.doc/HFIS_RECOMENDACIONES.md`, que es su sitio.
 *
 * Se reescriben en vez de mostrarse tal cual por dos razones: el motor los
 * emite sin acentos y en el vocabulario del sistema, y sus cadenas se comparan
 * como texto exacto contra el Python en `scripts/hfis-selfcheck.mjs`, así que
 * corregirlas allí rompería la verificación.
 */
const PISTAS_CAIDA = [
  [
    /alertas de bomba o seguridad/,
    'Hubo alertas de bomba o de seguridad justo antes de perder contacto: la avería apunta al equipo, conviene ir.',
  ],
  [
    /sin alertas previas/,
    'Se desconectó sin ninguna alerta previa: revisa el saldo de la SIM antes de enviar a alguien.',
  ],
];

const pistaDeCaida = (r) =>
  PISTAS_CAIDA.find(([patron]) => (r.avisos || []).some((a) => patron.test(a)))?.[1] || null;

/** Reglas que dispararon en un dominio, de la más fuerte a la más débil. */
const Reglas = ({ titulo, reglas }) => {
  if (!reglas?.length) return null;
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider font-bold text-content-muted mb-1">{titulo}</p>
      <ul className="space-y-0.5">
        {reglas.slice(0, 4).map(([idx, fuerza, glosa]) => (
          <li key={idx} className="text-[11px] text-slate-300 leading-snug">
            <span className="font-mono text-content-muted">R{idx}</span>{' '}
            <span className="font-mono text-accent-soft">{Number(fuerza).toFixed(2)}</span> {glosa}
          </li>
        ))}
      </ul>
    </div>
  );
};

export const Recommendations = () => {
  const { isDemo } = useAuth();
  const { machines, scopeFor, loading: loadingMachines, reload: reloadMachines } = useScopedMachines();

  const [resultados, setResultados] = useState([]);
  const [ahora, setAhora] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [machineId, setMachineId] = useState(null);

  const machineIds = useMemo(() => scopeFor(machineId), [scopeFor, machineId]);

  const cargar = useCallback(async () => {
    if (loadingMachines) return;
    setLoading(true);
    setError(null);
    try {
      const { ahora: instante, resultados: red } = await getRecommendedRoute({ machineIds });
      setResultados(red);
      setAhora(instante);
    } catch (err) {
      // Nunca se cae al mock: una recomendación inventada es peor que un error.
      setError(err);
      setResultados([]);
    } finally {
      setLoading(false);
    }
  }, [machineIds, loadingMachines]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const refrescar = useCallback(
    () => Promise.all([reloadMachines(), cargar()]),
    [reloadMachines, cargar]
  );

  const primera = resultados[0] || null;
  const incomunicadas = resultados.filter((r) => r.datos_rancios).length;
  const inventarioCritico = resultados.filter((r) => r.score_inv >= 75).length;

  // La posición es el dato principal de la fila y el accessor no conoce el
  // índice, así que se materializa antes de pintar.
  const rows = useMemo(() => resultados.map((r, i) => ({ ...r, pos: i + 1 })), [resultados]);

  const columns = useMemo(
    () => [
      {
        id: 'orden',
        header: '#',
        width: 44,
        accessor: (r) => (
          <span className={`font-black ${r.pos === 1 ? 'text-rose-300' : 'text-content-muted'}`}>
            {r.pos}
          </span>
        ),
      },
      {
        id: 'maquina',
        header: 'Máquina',
        accessor: (r) => <MachineChip deviceId={r.id} name={r.nombre} />,
      },
      {
        id: 'prioridad',
        header: 'Prioridad',
        align: 'right',
        accessor: (r) => (
          <div className="flex items-center justify-end gap-2">
            <span className="text-base font-black text-white tabular-nums">{n2(r.prioridad)}</span>
            <Badge tone={ETIQUETA_TONO[r.etiqueta] || 'neutral'}>{r.etiqueta}</Badge>
          </div>
        ),
      },
      { id: 'inv', header: 'Inv', align: 'center', hideBelow: 'md', accessor: (r) => ScoreCell(r.score_inv) },
      { id: 'seg', header: 'Seg', align: 'center', hideBelow: 'md', accessor: (r) => ScoreCell(r.score_seg) },
      { id: 'mant', header: 'Mant', align: 'center', hideBelow: 'md', accessor: (r) => ScoreCell(r.score_mant) },
      { id: 'con', header: 'Con', align: 'center', hideBelow: 'md', accessor: (r) => ScoreCell(r.score_con) },
      {
        id: 'tanque',
        header: 'Tanque crítico',
        align: 'center',
        hideBelow: 'lg',
        accessor: (r) => (r.tanque_critico != null ? `T${r.tanque_critico}` : '—'),
      },
      {
        id: 'visita',
        header: 'Sin visita',
        align: 'right',
        hideBelow: 'lg',
        accessor: (r) => <span className="tabular-nums text-slate-300">{dias(r.dias_desde_visita)}</span>,
      },
      {
        id: 'senal',
        header: 'Señal',
        align: 'right',
        accessor: (r) =>
          r.datos_rancios ? (
            <Badge tone="warn" icon={WifiOff} title="Los demás valores son la última foto conocida">
              {dias(r.dias_sin_contacto)}
            </Badge>
          ) : (
            <Badge tone="ok">en línea</Badge>
          ),
      },
    ],
    []
  );

  const detalle = (r) => (
    <div className="space-y-4 pt-1">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          ['Inventario', r.score_inv],
          ['Seguridad', r.score_seg],
          ['Mantenimiento', r.score_mant],
          ['Conectividad', r.score_con],
        ].map(([etiqueta, valor]) => (
          <div key={etiqueta} className="rounded-xl border border-line-subtle bg-surface-sunken/60 p-2">
            <p className="text-[10px] uppercase tracking-wider text-content-muted font-bold">{etiqueta}</p>
            <p className="text-sm font-black text-white tabular-nums">{n2(valor)}</p>
          </div>
        ))}
      </div>

      {/* Una máquina sin reportar sube al principio aunque sus cifras se vean
          tranquilas: son la última foto que llegó, no el estado de ahora. Es lo
          que más desconcierta de la lista, así que se explica en la fila. */}
      {r.datos_rancios && (
        <div className="rounded-xl border border-status-warn/30 bg-status-warn/10 p-3 space-y-1">
          <p className="text-[11px] font-bold text-amber-200">
            Sin reportar desde hace {dias(r.dias_sin_contacto)}
          </p>
          <p className="text-[11px] text-amber-200/90 leading-relaxed">
            Las cifras de arriba son la última información que envió, no su estado de ahora. Sube al
            principio de la lista precisamente porque no se sabe qué está pasando en ella.
          </p>
          {pistaDeCaida(r) && (
            <p className="text-[11px] text-amber-200/90 leading-relaxed">{pistaDeCaida(r)}</p>
          )}
        </div>
      )}

      {r.scores_inv_tanques?.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider font-bold text-content-muted mb-1">
            Inventario por tanque · carga media {n2(r.carga_inventario)}
          </p>
          <div className="flex flex-wrap gap-1">
            {r.scores_inv_tanques.map((s, i) => (
              <Badge
                key={i}
                tone={tonoScore(s)}
                className={i + 1 === r.tanque_critico ? 'ring-1 ring-rose-400/60' : ''}
              >
                T{i + 1} · {n2(s)}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Reglas titulo="Seguridad" reglas={r.explicacion?.seguridad} />
        <Reglas titulo="Mantenimiento" reglas={r.explicacion?.mantenimiento} />
        <Reglas titulo="Conectividad" reglas={r.explicacion?.conectividad} />
        <Reglas titulo="Decisión final" reglas={r.explicacion?.maestro} />
      </div>

      {r.machine_id && (
        <Link
          to={`/machines/${r.machine_id}`}
          className="inline-flex items-center gap-1 text-xs font-bold text-accent-soft hover:underline"
        >
          Ver la ficha de la máquina <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white tracking-tight">Ruta de atención</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Orden sugerido de visita, calculado con el sistema experto difuso sobre las máquinas que
          tienes asignadas
          {ahora ? ` · datos al ${new Date(ahora).toLocaleString('es-MX')}` : ''}
        </p>
        <div className="mt-3">
          <RefreshButton onClick={refrescar} loading={loading || loadingMachines} />
        </div>
      </div>

      <Notice tone="info" title="Atiende de arriba hacia abajo">
        El orden es la recomendación. Dos máquinas con menos de 3 puntos de diferencia tienen la
        misma urgencia: atiende primero la que te quede más cerca.
      </Notice>

      {isDemo && (
        <Notice tone="info" title="Datos de demostración">
          Las máquinas y las cifras de esta pantalla son de ejemplo.
        </Notice>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Primera visita"
          value={primera ? primera.nombre || primera.id : '—'}
          subtitle={
            primera
              ? `Prioridad ${n2(primera.prioridad)} · ${primera.etiqueta}`
              : 'Sin máquinas que atender'
          }
          icon={ListOrdered}
          tone="danger"
          to={primera?.machine_id ? `/machines/${primera.machine_id}` : undefined}
        />
        <StatCard
          title="Incomunicadas"
          value={incomunicadas}
          subtitle="Sin telemetría reciente: su estado es la última foto conocida"
          icon={WifiOff}
          tone={incomunicadas ? 'warn' : 'neutral'}
        />
        <StatCard
          title="Inventario crítico"
          value={inventarioCritico}
          subtitle="Máquinas con al menos un tanque próximo a agotarse"
          icon={Droplets}
          tone={inventarioCritico ? 'warn' : 'neutral'}
        />
      </div>

      <FilterBar activeCount={machineId ? 1 : 0} onReset={() => setMachineId(null)}>
        <MachineFilter machines={machines} value={machineId} onChange={setMachineId} />
      </FilterBar>

      <DataTable
        columns={columns}
        rows={rows}
        keyField="id"
        loading={loading || loadingMachines}
        error={error}
        onRetry={cargar}
        renderExpanded={detalle}
      />

      <p className="text-[11px] text-content-muted leading-relaxed">
        Pulsa una fila para ver por qué esa máquina está en esa posición.
      </p>
    </div>
  );
};

export default Recommendations;
