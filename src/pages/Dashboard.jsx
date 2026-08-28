import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  AlertTriangle, ArrowRight, Banknote, CheckCircle2, Cpu, Droplet,
  Receipt, ShieldAlert, TrendingUp,
} from 'lucide-react';
import { getConsumptionByMachine, getFinancialSummary } from '../services/salesService';
import { getAlerts } from '../services/alertService';
import { useScopedMachines } from '../hooks/useScopedMachines';
import { defaultRange } from '../services/_filters';
import { DateRangeFilter } from '../components/ui/Filters';
import { Badge, EmptyState, ErrorState, LoadingState, MachineChip, StatusPill } from '../components/ui/Primitives';
import { DataTable } from '../components/ui/DataTable';
import { StatCard } from '../components/common/StatCard';
import { alertCategoryMeta, alertMessage } from '../lib/alerts';
import { useChartTheme, tooltipStyle } from '../theme/chartTheme';
import {
  formatLiters, formatMoney, formatRelative, paymentTypeLabel, PAYMENT_TYPES,
} from '../lib/format';

const initialRange = () => ({ ...defaultRange(30), preset: '30d' });

export const Dashboard = () => {
  const { machines, scopeFor, loading: loadingMachines, error: machinesError } = useScopedMachines();
  const chart = useChartTheme();

  const [range, setRange] = useState(initialRange);
  const [finance, setFinance] = useState(null);
  const [consumption, setConsumption] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const filters = useMemo(
    () => ({ machineIds: scopeFor(null), from: range.from, to: range.to }),
    [scopeFor, range.from, range.to]
  );

  const load = useCallback(async () => {
    if (loadingMachines) return;
    setLoading(true);
    setError(null);
    try {
      const [fin, cons, alr] = await Promise.all([
        getFinancialSummary(filters),
        getConsumptionByMachine(filters),
        getAlerts({ machineIds: filters.machineIds, resolved: 'pending' }),
      ]);
      setFinance(fin);
      setConsumption(cons);
      setAlerts(alr);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [filters, loadingMachines]);

  useEffect(() => {
    load();
  }, [load]);

  const onlineCount = machines.filter((m) => m.status === 'online').length;

  const pendingCash = useMemo(
    () => machines.reduce((a, m) => a + Number(m.machine_status?.stored_cash_balance || 0), 0),
    [machines]
  );

  const paymentData = useMemo(() => {
    if (!finance) return [];
    return PAYMENT_TYPES.map((t, i) => ({
      name: paymentTypeLabel(t),
      amount: finance.byPaymentType?.[t] || 0,
      color: chart.series[i % chart.series.length],
    })).filter((d) => d.amount > 0);
  }, [finance, chart]);

  const consumptionChart = useMemo(
    () =>
      consumption.slice(0, 8).map((c, i) => ({
        name: c.device_id || c.name,
        litros: Number(c.liters.toFixed(2)),
        color: chart.series[i % chart.series.length],
      })),
    [consumption, chart]
  );

  const failRate =
    finance && finance.totalSalesCount
      ? (finance.failedSalesCount / finance.totalSalesCount) * 100
      : 0;

  if (loadingMachines || loading) return <LoadingState label="Cargando panel…" />;

  const fatal = machinesError || error;
  if (fatal && !finance) {
    return (
      <div className="card">
        <ErrorState error={fatal} onRetry={load} />
      </div>
    );
  }

  const consumptionColumns = [
    {
      id: 'maquina',
      header: 'Máquina',
      accessor: (r) => (
        <Link to={`/machines/${r.machine_id}`} className="hover:underline">
          <MachineChip name={r.name} deviceId={r.device_id} />
        </Link>
      ),
    },
    { id: 'litros', header: 'Litros surtidos', align: 'right', accessor: (r) => <span className="font-bold text-content">{formatLiters(r.liters, 2)}</span> },
    { id: 'ingresos', header: 'Ingresos', align: 'right', accessor: (r) => <span className="font-bold text-emerald-300">{formatMoney(r.income)}</span> },
    { id: 'ventas', header: 'Ventas', align: 'right', hideBelow: 'sm', accessor: (r) => <span className="text-content-secondary">{r.salesOk}</span> },
    {
      id: 'fallidas',
      header: 'Fallidas',
      align: 'right',
      hideBelow: 'md',
      accessor: (r) =>
        r.salesFailed ? (
          <Badge tone="warn">{r.salesFailed}</Badge>
        ) : (
          <span className="text-content-faint">—</span>
        ),
    },
    { id: 'ticket', header: 'Ticket medio', align: 'right', hideBelow: 'lg', accessor: (r) => <span className="text-content-muted">{formatMoney(r.avgTicket)}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-content tracking-tight">Panel de control</h2>
          <p className="text-xs text-content-muted mt-0.5">
            Resultado del negocio y estado operativo de la red
          </p>
        </div>
        <DateRangeFilter value={range} onChange={setRange} />
      </div>

      {/* KPIs de negocio */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Ingresos del periodo"
          value={formatMoney(finance?.totalIncome || 0)}
          subtitle={`${formatLiters(finance?.totalLiters || 0, 1)} surtidos`}
          icon={TrendingUp}
          tone="ok"
        />
        <StatCard
          title="Ventas concretadas"
          value={String(finance?.successSalesCount ?? 0)}
          subtitle={
            finance?.failedSalesCount
              ? `${finance.failedSalesCount} fallidas (${failRate.toFixed(1)} %)`
              : 'sin ventas fallidas'
          }
          icon={Receipt}
          tone={failRate > 5 ? 'warn' : 'accent'}
        />
        <StatCard
          title="Efectivo por recolectar"
          value={formatMoney(pendingCash)}
          subtitle="acumulado en los monederos"
          icon={Banknote}
          tone={pendingCash > 2000 ? 'warn' : 'accent'}
        />
        <StatCard
          title="Alertas pendientes"
          value={String(alerts.length)}
          subtitle={alerts.length ? 'requieren atención' : 'sin incidencias abiertas'}
          icon={alerts.length ? ShieldAlert : CheckCircle2}
          tone={alerts.length ? 'danger' : 'ok'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Consumo POR MÁQUINA — sustituye al total agregado, que no era accionable */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplet className="w-5 h-5 text-accent-soft" />
                <h3 className="font-bold text-content text-base">Consumo por máquina</h3>
              </div>
              <Link to="/sales" className="text-xs text-accent-soft hover:underline font-semibold flex items-center gap-1">
                Ver ventas <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {consumptionChart.length > 0 && (
              <div className="card p-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={consumptionChart} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" stroke={chart.axis} fontSize={10} tickLine={false} />
                    <YAxis stroke={chart.axis} fontSize={10} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: chart.grid, opacity: 0.4 }}
                      contentStyle={tooltipStyle(chart)}
                      formatter={(v) => [`${v} L`, 'Surtido']}
                    />
                    <Bar dataKey="litros" radius={[8, 8, 0, 0]}>
                      {consumptionChart.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <DataTable
              columns={consumptionColumns}
              rows={consumption}
              keyField="machine_id"
              empty={<EmptyState icon={Droplet} title="Sin ventas en el periodo" description="No hay consumo registrado en el rango seleccionado." />}
            />
          </section>

          {/* Estado de la red */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-accent-soft" />
                <h3 className="font-bold text-content text-base">
                  Máquinas en red ({onlineCount}/{machines.length})
                </h3>
              </div>
              <Link to="/machines" className="text-xs text-accent-soft hover:underline font-semibold flex items-center gap-1">
                Ver todas <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {machines.map((m) => {
                const st = m.machine_status;
                const pendientes = alerts.filter((a) => a.machine_id === m.id).length;
                return (
                  <Link
                    key={m.id}
                    to={`/machines/${m.id}`}
                    className="card card-hover p-4 space-y-3 block"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono text-accent-soft font-bold">{m.device_id}</span>
                        <h4 className="text-sm font-bold text-content truncate">{m.name}</h4>
                      </div>
                      <StatusPill status={m.status} />
                    </div>

                    <p className="text-xs text-content-muted line-clamp-1">{m.location_address}</p>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-line-subtle">
                      <div>
                        <span className="text-[10px] text-content-faint block">En monedero</span>
                        <span className="text-xs font-bold text-emerald-300">
                          {formatMoney(st?.stored_cash_balance)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-content-faint block">Última señal</span>
                        <span className="text-xs font-semibold text-content-secondary">
                          {formatRelative(st?.last_keepalive_at)}
                        </span>
                      </div>
                    </div>

                    {pendientes > 0 && (
                      <Badge tone="warn" icon={AlertTriangle}>
                        {pendientes} alerta{pendientes > 1 ? 's' : ''} pendiente{pendientes > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        </div>

        {/* Columna derecha */}
        <div className="space-y-6">
          <section className="card p-5 space-y-4">
            <h3 className="font-bold text-content text-base flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-400" />
              Ingresos por medio de pago
            </h3>
            {paymentData.length ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={paymentData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" stroke={chart.axis} fontSize={11} tickLine={false} />
                    <YAxis stroke={chart.axis} fontSize={11} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: chart.grid, opacity: 0.4 }}
                      contentStyle={tooltipStyle(chart)}
                      formatter={(v) => [formatMoney(v), 'Ingreso']}
                    />
                    <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                      {paymentData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState icon={Banknote} title="Sin ingresos en el periodo" />
            )}
          </section>

          {/* Alertas recientes: cada una identifica SU máquina */}
          <section className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-content text-base flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                Alertas pendientes
              </h3>
              <Link to="/alerts" className="text-xs text-accent-soft hover:underline font-semibold">
                Ver todas
              </Link>
            </div>

            {alerts.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="Sin incidencias abiertas" />
            ) : (
              <div className="space-y-2">
                {alerts.slice(0, 6).map((a) => {
                  const cat = alertCategoryMeta(a.category);
                  return (
                    <Link
                      key={a.id}
                      to="/alerts"
                      className="block p-3 rounded-xl border border-status-warn/25 bg-status-warn/5 hover:bg-status-warn/10 transition-colors space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge tone={cat.tone}>{cat.label}</Badge>
                        <span className="text-[10px] text-content-muted whitespace-nowrap">
                          {formatRelative(a.created_at)}
                        </span>
                      </div>
                      <MachineChip machine={a.machine} />
                      <p className="text-xs text-content-secondary">{alertMessage(a)}</p>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
