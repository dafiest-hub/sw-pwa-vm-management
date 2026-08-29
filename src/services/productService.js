import { query, mutate, isUniqueViolation, IS_DEMO } from '../lib/dataAccess';
import { sampleProducts } from '../mock/sampleData';

/**
 * Columnas REALES de `products`. La tabla no tiene category, unit, is_active ni
 * updated_at: mandar cualquier campo extra rompe el INSERT con 42703.
 */
function toPayload(input) {
  return {
    sku: String(input.sku || '').trim().toUpperCase(),
    name: String(input.name || '').trim(),
    description: input.description?.trim() || null,
    default_price_per_liter: Number(input.default_price_per_liter),
    density_kg_m3: Number(input.density_kg_m3 || 1000),
  };
}

export function validateProduct(input) {
  const p = toPayload(input);
  if (!p.sku) return 'El SKU es obligatorio.';
  if (!/^[A-Z0-9-]+$/.test(p.sku)) return 'El SKU sólo admite letras, números y guiones (ej. DET-COLOR).';
  if (!p.name) return 'El nombre es obligatorio.';
  if (!Number.isFinite(p.default_price_per_liter) || p.default_price_per_liter < 0)
    return 'El precio por litro debe ser un número mayor o igual a 0.';
  if (!Number.isFinite(p.density_kg_m3) || p.density_kg_m3 <= 0)
    return 'La densidad debe ser un número mayor que 0.';
  return null;
}

export async function getProducts() {
  return query(
    'products.getProducts',
    (sb) => sb.from('products').select('*').order('sku', { ascending: true }),
    () => [...sampleProducts].sort((a, b) => a.sku.localeCompare(b.sku))
  );
}

export async function createProduct(input) {
  const problema = validateProduct(input);
  if (problema) throw new Error(problema);

  const payload = toPayload(input);

  if (IS_DEMO()) {
    if (sampleProducts.some((p) => p.sku === payload.sku))
      throw new Error(`Ya existe un producto con el SKU "${payload.sku}".`);
    const nuevo = { id: `p-${Date.now()}`, ...payload, created_at: new Date().toISOString() };
    sampleProducts.push(nuevo);
    return nuevo;
  }

  try {
    return await mutate(
      'products.createProduct',
      (sb) => sb.from('products').insert([payload]).select().single(),
      () => null
    );
  } catch (e) {
    if (isUniqueViolation(e.cause || e))
      throw new Error(`Ya existe un producto con el SKU "${payload.sku}".`);
    throw e;
  }
}

export async function updateProduct(id, input) {
  const problema = validateProduct(input);
  if (problema) throw new Error(problema);

  const payload = toPayload(input);

  try {
    return await mutate(
      'products.updateProduct',
      (sb) => sb.from('products').update(payload).eq('id', id).select().single(),
      () => {
        const p = sampleProducts.find((x) => x.id === id);
        if (p) Object.assign(p, payload);
        return p;
      }
    );
  } catch (e) {
    if (isUniqueViolation(e.cause || e))
      throw new Error(`Ya existe otro producto con el SKU "${payload.sku}".`);
    throw e;
  }
}
