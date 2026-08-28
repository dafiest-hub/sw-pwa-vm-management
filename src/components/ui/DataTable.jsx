import React, { Fragment, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from './Primitives';

/**
 * Tabla común.
 *
 * columns: [{ id, header, accessor(row), align, className, hideBelow: 'sm'|'md'|'lg', width }]
 *
 * El contenedor tiene overflow-x propio: en móvil la tabla se desplaza sola sin
 * arrastrar el scroll horizontal de la página.
 */
const HIDE = { sm: 'hidden sm:table-cell', md: 'hidden md:table-cell', lg: 'hidden lg:table-cell' };
const ALIGN = { right: 'text-right', center: 'text-center' };

export const DataTable = ({
  columns,
  rows,
  keyField = 'id',
  loading,
  error,
  onRetry,
  empty,
  renderExpanded,
  footer,
}) => {
  const [expanded, setExpanded] = useState(null);
  const expandable = typeof renderExpanded === 'function';

  if (loading) {
    return (
      <div className="table-shell">
        <LoadingState rows={5} />
      </div>
    );
  }
  if (error) {
    return (
      <div className="table-shell">
        <ErrorState error={error} onRetry={onRetry} />
      </div>
    );
  }
  if (!rows?.length) {
    return (
      <div className="table-shell">
        {empty || <EmptyState title="Sin resultados" description="No hay datos que coincidan con los filtros." />}
      </div>
    );
  }

  return (
    <div className="table-shell">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse">
          <thead className="bg-surface-sunken/60 border-b border-line-subtle">
            <tr>
              {expandable && <th className="th w-8" aria-label="Detalle" />}
              {columns.map((c) => (
                <th
                  key={c.id}
                  style={c.width ? { width: c.width } : undefined}
                  className={`th ${ALIGN[c.align] || ''} ${c.hideBelow ? HIDE[c.hideBelow] : ''}`}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line-subtle">
            {rows.map((row) => {
              const key = row[keyField];
              const isOpen = expanded === key;
              return (
                <Fragment key={key}>
                  <tr
                    className={`hover:bg-surface-hover/40 transition-colors ${expandable ? 'cursor-pointer' : ''}`}
                    onClick={expandable ? () => setExpanded(isOpen ? null : key) : undefined}
                  >
                    {expandable && (
                      <td className="td">
                        <ChevronDown
                          className={`w-4 h-4 text-content-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </td>
                    )}
                    {columns.map((c) => (
                      <td
                        key={c.id}
                        className={`td ${ALIGN[c.align] || ''} ${c.className || ''} ${c.hideBelow ? HIDE[c.hideBelow] : ''}`}
                      >
                        {c.accessor(row)}
                      </td>
                    ))}
                  </tr>
                  {expandable && isOpen && (
                    <tr className="bg-surface-sunken/50">
                      <td colSpan={columns.length + 1} className="px-4 pb-4 pt-0">
                        {renderExpanded(row)}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
          {footer && (
            <tfoot className="bg-surface-sunken/60 border-t border-line-subtle font-bold">{footer}</tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

export default DataTable;
