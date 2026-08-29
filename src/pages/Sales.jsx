import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Coins, Download, Gauge, Receipt, TrendingUp } from 'lucide-react';
import { getSalesWithPayments, getSaleIncomes } from '../services/salesService';
import { getProducts } from '../services/productService';
import { useScopedMachines } from '../hooks/useScopedMachines';
import { defaultRange } from '../services/_filters';
import { DataTable } from '../components/ui/DataTable';
import { Badge, EmptyState, MachineChip, Notice, RefreshButton } from '../components/ui/Primitives';
import { PaymentBadge, PaymentBreakdown } from '../components/ui/PaymentBadge';
import {
  DateRangeFilter,
  FilterBar,
  MachineFilter,
  ProductFilter,
  SelectFilter,
} from '../components/ui/Filters';
import {
  formatDateTime,
  formatLiters,
  formatMoney,
  paymentTypeLabel,
  PAYMENT_TYPES,
} from '../lib/format';

const initialRange = () => ({ ...defaultRange(30), preset: '30d' });

export const Sales = () => {
  const { machines, scopeFor, loading: loadingMachines, reload: reloadMachines } =
    useScopedMachines();

  const [tab, setTab] = useState('sales');
  const [range, setRange] = useState(initialRange);
  const [machineId, setMachineId] = useState(null);
  const [productId, setProductId] = useState(null);
  const [paymentType, setPaymentType] = useState(null);
  const [status, setStatus] = useState(null);

  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProducts = useCallback(async () => {
    try {
      setProducts(await getProducts());
    } catch {
      setProducts([]);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const filters = useMemo(
    () => ({
      machineIds: scopeFor(machineId),
      productId,
      from: range.from,
      to: range.to,
      status,
      pageSize: 500,
    }),
    [scopeFor, machineId, productId, range.from, range.to, status]
  );

  const load = useCallback(async () => {
    if (loadingMachines) return;
    setLoading(true);
    setError(null);
    try {
      const [s, i] = await Promise.all([
        getSalesWithPayments(filters),
        getSaleIncomes({ ...filters, productId: undefined, status: undefined }),
      ]);
      setSales(s);
      setIncomes(i);
    } catch (e) {
      setError(e);
      setSales([]);
      setIncomes([]);
    } finally {
      setLoading(false);
    }
  }, [filters, loadingMachines]);

  useEffect(() => {
    load();
  }, [load]);

  // Recarga todo lo que se ve en la página, no sólo la tabla.
  const refreshAll = useCallback(
    () => Promise.all([reloadMachines(), loadProducts(), load()]),
    [reloadMachines, loadProducts, load]
  );

  // El filtro por medio de pago se aplica DESPUÉS del cruce: sólo entonces se
  // sabe con qué se pagó cada venta.
  const visibleSales = useMemo(
    () =>
      paymentType
        ? sales.filter((s) => s.payment_summary.methods.includes(paymentType))
        : sales,
    [sales, paymentType]
  );

  const visibleIncomes = useMemo(
    () => (paymentType ? incomes.filter((i) => i.payment_type === paymentType) : incomes),
    [incomes, paymentType]
  );

  const totals = useMemo(() => {
    const ok = visibleSales.filter((s) => s.status === 'success');
    return {
      count: visibleSales.length,
      ok: ok.length,
      failed: visibleSales.length - ok.length,
      revenue: ok.reduce((a, s) => a + Number(s.price_paid || 0), 0),
      liters: ok.reduce((a, s) => a + Number(s.liters_purchased || 0), 0),
      income: visibleIncomes.reduce((a, i) => a + Number(i.amount || 0), 0),
    };
  }, [visibleSales, visibleIncomes]);

  // Señal de que sale_incomes no se está pudiendo leer (típicamente RLS):
  // hay ventas enlazables pero no llegó ni un solo ingreso.
  const sinIngresosLegibles =
    !loading &&
    !error &&
    incomes.length === 0 &&
    visibleSales.some((s) => s.payment_summary.state === 'missing');

  const activeCount =
    (machineId ? 1 : 0) +
    (productId ? 1 : 0) +
    (paymentType ? 1 : 0) +
    (status ? 1 : 0) +
    (range.preset !== '30d' ? 1 : 0);

  const resetFilters = () => {
    setMachineId(null);
    setProductId(null);
    setPaymentType(null);
    setStatus(null);
    setRange(initialRange());
  };

  const exportCsv = () => {
    const rows = visibleSales.map((s) => [
      formatDateTime(s.created_at),
      s.machine?.name || '',
      s.machine?.device_id || '',
      s.tank_number,
      s.product?.name || '',
      s.price_paid,
      s.liters_purchased,
      s.liters_flow_sensor,
      s.status,
      s.tx_id ?? '',
      s.payment_summary.label,
      s.payment_summary.amount,
    ]);
    const header = [
      'Fecha', 'Máquina', 'Device ID', 'Tanque', 'Producto', 'Cobrado',
      'Litros solicitados', 'Litros medidor', 'Estado', 'tx_id',
      'Método de pago', 'Ingresado',
    ];
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `ventas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saleColumns = [
    { id: 'fecha', header: 'Fecha y hora', accessor: (s) => <span className="text-content-secondary whitespace-nowrap">{formatDateTime(s.created_at)}</span> },
    { id: 'maquina', header: 'Máquina', accessor: (s) => <MachineChip machine={s.machine} /> },
    {
      id: 'producto',
      header: 'Tanque y producto',
      accessor: (s) => (
        <div className="min-w-0">
          <span className="text-[10px] font-mono text-accent-soft">T{s.tank_number}</span>
          <p className="text-content-secondary truncate">{s.product?.name || 'Sin producto'}</p>
        </div>
      ),
    },
    { id: 'pago', header: 'Método de pago', accessor: (s) => <PaymentBadge summary={s.payment_summary} /> },
    { id: 'cobrado', header: 'Cobrado', align: 'right', accessor: (s) => <span className="font-bold text-emerald-300">{formatMoney(s.price_paid)}</span> },
    { id: 'litros', header: 'Litros', align: 'right', hideBelow: 'md', accessor: (s) => <span className="text-content-secondary">{formatLiters(s.liters_purchased)}</span> },
    {
      id: 'medidor',
      header: 'Medidor',
      align: 'right',
      hideBelow: 'lg',
      accessor: (s) => {
        const delta = Number(s.liters_flow_sensor || 0) - Number(s.liters_purchased || 0);
        const off = Math.abs(delta) > 0.05;
        return (
          <span className={off ? 'text-amber-300 font-semibold' : 'text-content-muted'}>
            {formatLiters(s.liters_flow_sensor, 4)}
          </span>
        );
      },
    },
    {
      id: 'estado',
      header: 'Estado',
      accessor: (s) => (
        <Badge tone={s.status === 'success' ? 'ok' : 'danger'}>
          {s.status === 'success' ? 'Concretada' : 'Fallida'}
        </Badge>
      ),
    },
  ];

  const incomeColumns = [
    { id: 'fecha', header: 'Fecha y hora', accessor: (i) => <span className="text-content-secondary whitespace-nowrap">{formatDateTime(i.created_at)}</span> },
    { id: 'maquina', header: 'Máquina', accessor: (i) => <MachineChip machine={i.machine} /> },
    {
      id: 'medio',
      header: 'Medio de pago',
      accessor: (i) => <Badge tone="accent">{paymentTypeLabel(i.payment_type)}</Badge>,
    },
    {
      id: 'venta',
      header: 'Venta asociada',
      hideBelow: 'sm',
      accessor: (i) =>
        i.tx_id == null ? (
          <span className="text-content-muted text-[10px]">Sin enlace</span>
        ) : (
          <span className="font-mono text-[10px] text-content-muted">tx {i.tx_id}</span>
        ),
    },
    { id: 'monto', header: 'Ingresado', align: 'right', accessor: (i) => <span className="font-bold text-emerald-300">+{formatMoney(i.amount)}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-content tracking-tight">Ventas e ingresos</h2>
          <p className="text-xs text-content-muted mt-0.5">
            Auditoría de dispensado y de dinero recibido, enlazados por máquina y transacción
          </p>
        </div>
        <RefreshButton onClick={refreshAll} loading={loading || loadingMachines} />
      </div>

      <FilterBar activeCount={activeCount} onReset={resetFilters}>
        <MachineFilter machines={machines} value={machineId} onChange={setMachineId} />
        {tab === 'sales' && (
          <ProductFilter products={products} value={productId} onChange={setProductId} />
        )}
        <SelectFilter
          label="Medio de pago"
          value={paymentType}
          onChange={setPaymentType}
          allLabel="Cualquier medio"
          options={PAYMENT_TYPES.map((t) => ({ value: t, label: paymentTypeLabel(t) }))}
        />
        {tab === 'sales' && (
          <SelectFilter
            label="Estado"
            value={status}
            onChange={setStatus}
            allLabel="Concretadas y fallidas"
            options={[
              { value: 'success', label: 'Sólo concretadas' },
              { value: 'fail', label: 'Sólo fallidas' },
            ]}
          />
        )}
        <DateRangeFilter value={range} onChange={setRange} />
      </FilterBar>

      {/* Resumen del rango filtrado */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryTile icon={Receipt} label="Ventas" value={`${totals.ok} concretadas`} hint={totals.failed ? `${totals.failed} fallidas` : 'sin fallos'} tone={totals.failed ? 'warn' : 'ok'} />
        <SummaryTile icon={TrendingUp} label="Importe de ventas" value={formatMoney(totals.revenue)} hint="sólo concretadas" />
        <SummaryTile icon={Coins} label="Dinero ingresado" value={formatMoney(totals.income)} hint="registrado en la máquina" />
        <SummaryTile icon={Gauge} label="Volumen surtido" value={formatLiters(totals.liters, 2)} hint="litros dispensados" />
      </div>

      {sinIngresosLegibles && (
        <Notice tone="warn" title="No se están recibiendo los cobros">
          Hay {visibleSales.length} venta{visibleSales.length !== 1 && 's'} registrada{visibleSales.length !== 1 && 's'},
          pero no se recuperó ningún cobro asociado, así que de momento no se puede saber el medio de pago de cada una.
          Los importes de venta que ves siguen siendo correctos. Si esto persiste, avisa al responsable técnico de la
          plataforma.
        </Notice>
      )}

      {totals.income > totals.revenue && (
        <p className="text-[11px] text-content-muted bg-surface-raised border border-line-subtle rounded-xl px-3 py-2">
          El dinero ingresado supera al importe de ventas porque incluye el saldo introducido que
          todavía no se ha gastado. No es un descuadre.
        </p>
      )}

      <div className="flex items-center justify-between gap-2 border-b border-line-subtle pb-2">
        <div className="flex items-center gap-2">
          <TabButton active={tab === 'sales'} onClick={() => setTab('sales')}>
            Ventas ({visibleSales.length})
          </TabButton>
          <TabButton active={tab === 'incomes'} onClick={() => setTab('incomes')}>
            Ingresos ({visibleIncomes.length})
          </TabButton>
        </div>
        <button onClick={exportCsv} className="btn-secondary" disabled={!visibleSales.length}>
          <Download className="w-3.5 h-3.5" /> CSV
        </button>
      </div>

      {tab === 'sales' ? (
        <DataTable
          columns={saleColumns}
          rows={visibleSales}
          loading={loading || loadingMachines}
          error={error}
          onRetry={load}
          empty={<EmptyState icon={Receipt} title="Sin ventas en este rango" description="Amplía el rango de fechas o quita algún filtro." />}
          renderExpanded={(s) => (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-content-muted font-bold mb-2">
                  Desglose del ingreso
                </p>
                <PaymentBreakdown payments={s.payments} />
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <Detail label="Transacción">{s.tx_id ?? 'sin tx_id'}</Detail>
                <Detail label="Total ingresado">{formatMoney(s.payment_summary.amount)}</Detail>
                <Detail label="Nivel antes">{formatLiters(s.tank_liters_before)}</Detail>
                <Detail label="Nivel después">{formatLiters(s.tank_liters_after)}</Detail>
                <Detail label="Solicitado">{formatLiters(s.liters_purchased)}</Detail>
                <Detail label="Medidor">{formatLiters(s.liters_flow_sensor, 4)}</Detail>
              </dl>
            </div>
          )}
        />
      ) : (
        <DataTable
          columns={incomeColumns}
          rows={visibleIncomes}
          loading={loading || loadingMachines}
          error={error}
          onRetry={load}
          empty={<EmptyState icon={Coins} title="Sin ingresos en este rango" />}
        />
      )}
    </div>
  );
};

const TabButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-control text-xs font-bold transition-all ${
      active
        ? 'bg-accent/20 text-accent-soft border border-accent/30'
        : 'text-content-muted hover:text-content'
    }`}
  >
    {children}
  </button>
);

const TONE_TEXT = { ok: 'text-emerald-300', warn: 'text-amber-300', danger: 'text-rose-300' };

const SummaryTile = ({ icon: Icon, label, value, hint, tone }) => (
  <div className="card p-4">
    <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold text-content-muted">
      <Icon className="w-3.5 h-3.5" /> {label}
    </div>
    <p className={`text-lg font-extrabold mt-1 ${TONE_TEXT[tone] || 'text-content'}`}>{value}</p>
    {hint && <p className="text-[10px] text-content-faint">{hint}</p>}
  </div>
);

const Detail = ({ label, children }) => (
  <>
    <dt className="text-content-muted">{label}</dt>
    <dd className="text-content-secondary font-semibold font-mono">{children}</dd>
  </>
);
