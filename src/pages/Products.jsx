import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Package, PackagePlus, Pencil } from 'lucide-react';
import {
  createProduct,
  getProducts,
  updateProduct,
  validateProduct,
} from '../services/productService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import { DataTable } from '../components/ui/DataTable';
import { EmptyState, RefreshButton } from '../components/ui/Primitives';
import { FilterBar, SearchInput } from '../components/ui/Filters';
import { formatMoney } from '../lib/format';

const EMPTY = {
  sku: '',
  name: '',
  description: '',
  default_price_per_liter: '',
  density_kg_m3: '1000',
};

export const Products = () => {
  const { isAdmin } = useAuth();
  const toast = useToast();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const [editing, setEditing] = useState(null); // null | 'new' | producto
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProducts(await getProducts());
    } catch (e) {
      setError(e);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
    );
  }, [products, search]);

  const openNew = () => {
    setForm(EMPTY);
    setFormError(null);
    setEditing('new');
  };

  const openEdit = (p) => {
    setForm({
      sku: p.sku,
      name: p.name,
      description: p.description || '',
      default_price_per_liter: String(p.default_price_per_liter),
      density_kg_m3: String(p.density_kg_m3 ?? 1000),
    });
    setFormError(null);
    setEditing(p);
  };

  const close = () => {
    setEditing(null);
    setFormError(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    const problem = validateProduct(form);
    if (problem) {
      setFormError(problem);
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      if (editing === 'new') {
        await createProduct(form);
        toast.success(`Producto "${form.name}" añadido al catálogo.`);
      } else {
        await updateProduct(editing.id, form);
        toast.success(`Producto "${form.name}" actualizado.`);
      }
      close();
      await load();
    } catch (err) {
      // Inline y no como alert(): el error pertenece al formulario.
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      id: 'sku',
      header: 'SKU',
      accessor: (p) => <span className="font-mono text-[11px] font-bold text-accent-soft">{p.sku}</span>,
    },
    {
      id: 'name',
      header: 'Producto',
      accessor: (p) => (
        <div className="min-w-0">
          <p className="font-bold text-content truncate">{p.name}</p>
          {p.description && (
            <p className="text-[11px] text-content-muted truncate max-w-md">{p.description}</p>
          )}
        </div>
      ),
    },
    {
      id: 'price',
      header: 'Precio de catálogo',
      align: 'right',
      accessor: (p) => (
        <span className="font-bold text-emerald-300">{formatMoney(p.default_price_per_liter)}/L</span>
      ),
    },
    {
      id: 'density',
      header: 'Densidad',
      align: 'right',
      hideBelow: 'md',
      accessor: (p) => (
        <span className="text-content-muted">{Number(p.density_kg_m3 || 0).toFixed(0)} kg/m³</span>
      ),
    },
    ...(isAdmin
      ? [
          {
            id: 'acciones',
            header: '',
            align: 'right',
            accessor: (p) => (
              <button onClick={() => openEdit(p)} className="btn-ghost" aria-label={`Editar ${p.name}`}>
                <Pencil className="w-3.5 h-3.5" />
              </button>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-content tracking-tight">Catálogo de productos</h2>
          <p className="text-xs text-content-muted mt-0.5">
            Productos disponibles para asignar a los tanques. El precio de catálogo es la referencia;
            el precio que cobra cada máquina se ajusta en su ficha.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RefreshButton onClick={load} loading={loading} />
        {isAdmin && (
          <button onClick={openNew} className="btn-primary">
            <PackagePlus className="w-4 h-4" /> Nuevo producto
          </button>
        )}
        </div>
      </div>

      <FilterBar activeCount={search ? 1 : 0} onReset={() => setSearch('')}>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre, SKU o descripción…" />
      </FilterBar>

      <DataTable
        columns={columns}
        rows={filtered}
        loading={loading}
        error={error}
        onRetry={load}
        empty={
          <EmptyState
            icon={Package}
            title={search ? 'Sin coincidencias' : 'El catálogo está vacío'}
            description={search ? 'Prueba con otro término de búsqueda.' : 'Añade el primer producto para poder asignarlo a los tanques.'}
          />
        }
      />

      <Modal
        open={editing !== null}
        onClose={close}
        icon={editing === 'new' ? PackagePlus : Pencil}
        title={editing === 'new' ? 'Nuevo producto' : 'Editar producto'}
        subtitle={editing && editing !== 'new' ? editing.sku : undefined}
      >
        <form onSubmit={submit} className="space-y-3">
          {formError && (
            <div className="p-3 rounded-xl bg-status-danger/10 border border-status-danger/30 text-xs text-rose-300">
              {formError}
            </div>
          )}

          <div>
            <label className="field-label" htmlFor="sku">
              SKU (ej. DET-COLOR)
            </label>
            <input
              id="sku"
              className="input uppercase"
              required
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              placeholder="DET-COLOR"
            />
          </div>

          <div>
            <label className="field-label" htmlFor="name">
              Nombre
            </label>
            <input
              id="name"
              className="input"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Detergente Pro-Color"
            />
          </div>

          <div>
            <label className="field-label" htmlFor="description">
              Descripción
            </label>
            <textarea
              id="description"
              rows={2}
              className="textarea"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Detergente para ropa de color, protege la intensidad."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label" htmlFor="price">
                Precio por litro (MXN)
              </label>
              <input
                id="price"
                type="number"
                step="0.01"
                min="0"
                required
                className="input"
                value={form.default_price_per_liter}
                onChange={(e) => setForm({ ...form, default_price_per_liter: e.target.value })}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="density">
                Densidad (kg/m³)
              </label>
              <input
                id="density"
                type="number"
                step="0.01"
                min="1"
                required
                className="input"
                value={form.density_kg_m3}
                onChange={(e) => setForm({ ...form, density_kg_m3: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-3">
            <button type="button" onClick={close} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              <Check className="w-3.5 h-3.5" />
              {submitting ? 'Guardando…' : editing === 'new' ? 'Crear producto' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
