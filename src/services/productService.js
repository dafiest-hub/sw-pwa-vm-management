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

/**
 * Longitudes de las columnas en Postgres: sku VARCHAR(50), name VARCHAR(100).
 * Sin comprobarlas aquí, pasarse devuelve un 22001 crudo de PostgREST en vez de
 * un mensaje en el formulario. `description` es TEXT y no tiene límite en la
 * base; el de aquí es para que un pegado accidental no se guarde sin querer.
 */
const LIMITES = { sku: 50, name: 100, description: 500 };

export function validateProduct(input) {
  const p = toPayload(input);
  if (!p.sku) return 'El SKU es obligatorio.';
  if (!/^[A-Z0-9-]+$/.test(p.sku)) return 'El SKU sólo admite letras, números y guiones (ej. DET-COLOR).';
  if (p.sku.length > LIMITES.sku) return `El SKU no puede pasar de ${LIMITES.sku} caracteres.`;
  if (!p.name) return 'El nombre es obligatorio.';
  if (p.name.length > LIMITES.name) return `El nombre no puede pasar de ${LIMITES.name} caracteres.`;
  if ((p.description || '').length > LIMITES.description)
    return `La descripción no puede pasar de ${LIMITES.description} caracteres.`;
  // > 0, no >= 0 aunque el CHECK de la base sea `>= 0`: el botón «Precio de
  // catálogo» del editor de tanques copia este valor a los 8 tanques, y allí un
  // 0 es inguardable (el firmware lo descarta). Un producto a 0 dejaría el
  // formulario en rojo sin que se entienda por qué.
  if (!Number.isFinite(p.default_price_per_liter) || p.default_price_per_liter <= 0)
    return 'El precio por litro debe ser un número mayor que 0.';
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
