import React from 'react';
import { Coins, DollarSign, CreditCard, Layers, MinusCircle, AlertCircle, XCircle } from 'lucide-react';
import { Badge } from './Primitives';
import { formatMoney, paymentTypeLabel } from '../../lib/format';

const ICONS = { monedas: Coins, efectivo: DollarSign, tarjeta: CreditCard };

const STATE_ICON = {
  matched: null,
  no_charge: XCircle,
  unlinked: MinusCircle,
  missing: AlertCircle,
};

/**
 * Medio de pago de una venta.
 *
 * Cubre los cuatro estados del enlace (machine_id, tx_id):
 *  - matched   : uno o varios ingresos; si hay más de un tipo, "Mixto (n)"
 *  - no_charge : venta fallida, nunca se cobró
 *  - unlinked  : tx_id NULL (anterior a fw 2.1.0 o capturada a mano)
 *  - missing   : hay tx_id pero no llegó el ingreso — anomalía real, se avisa
 */
export const PaymentBadge = ({ summary }) => {
  if (!summary) return <span className="text-content-muted">—</span>;

  const { state, label, tone, isMixed, methods } = summary;
  const Icon = isMixed ? Layers : STATE_ICON[state] ?? (methods.length === 1 ? ICONS[methods[0]] : null);

  return (
    <Badge
      tone={tone}
      icon={Icon || undefined}
      title={
        isMixed
          ? `Pago mixto: ${methods.map(paymentTypeLabel).join(' + ')}`
          : state === 'unlinked'
            ? 'Venta sin tx_id: anterior al firmware 2.1.0 o capturada a mano'
            : state === 'missing'
              ? 'La venta tiene tx_id pero no hay ingreso asociado en la base'
              : state === 'no_charge'
                ? 'Venta fallida: no se cobró, el saldo quedó a favor del usuario'
                : undefined
      }
    >
      {label}
    </Badge>
  );
};

/** Desglose de los ingresos de una venta, para la fila expandible. */
export const PaymentBreakdown = ({ payments }) => {
  if (!payments?.length) {
    return <p className="text-xs text-content-muted">Sin ingresos registrados para esta venta.</p>;
  }
  return (
    <ul className="space-y-1">
      {payments.map((p) => {
        const Icon = ICONS[p.payment_type] || DollarSign;
        return (
          <li key={p.id} className="flex items-center gap-2 text-xs">
            <Icon className="w-3.5 h-3.5 text-accent-soft" />
            <span className="text-content-secondary">{paymentTypeLabel(p.payment_type)}</span>
            <span className="font-bold text-emerald-300">{formatMoney(p.amount)}</span>
            <span className="text-[10px] text-content-faint font-mono">
              {new Date(p.created_at).toLocaleTimeString('es-MX')}
            </span>
          </li>
        );
      })}
    </ul>
  );
};

export default PaymentBadge;
