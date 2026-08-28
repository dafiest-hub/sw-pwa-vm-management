import { supabase, isSupabaseConfigured } from './supabaseClient';

/**
 * Modo demo: no hay credenciales de Supabase, se sirve el mock en memoria.
 * OJO: es lo ÚNICO que activa el mock. Un error de consulta NUNCA cae al mock
 * (antes sí lo hacía, y por eso un cambio de esquema se manifestaba como
 * cifras falsas en vez de como un fallo visible).
 */
export const IS_DEMO = !isSupabaseConfigured || !supabase;

export class ServiceError extends Error {
  constructor(scope, cause) {
    super(cause?.message || 'Error al consultar los datos');
    this.name = 'ServiceError';
    this.scope = scope;
    this.code = cause?.code || null;
    this.details = cause?.details || null;
    this.hint = cause?.hint || null;
    this.cause = cause;
  }
}

/**
 * Ejecuta la rama Supabase o la rama demo, según la configuración.
 * @param {string} scope   Etiqueta para el log, ej. 'sales.getSales'
 * @param {(sb) => Promise<{data,error}>} runSupabase
 * @param {() => any} runDemo
 */
export async function query(scope, runSupabase, runDemo) {
  if (IS_DEMO) return runDemo();

  const { data, error } = await runSupabase(supabase);
  if (error) {
    console.error(
      `[${scope}] ${error.code || 'sin-código'} — ${error.message}`,
      { details: error.details, hint: error.hint }
    );
    throw new ServiceError(scope, error);
  }
  return data ?? [];
}

/** Igual que query(), pero para escrituras que devuelven una sola fila. */
export async function mutate(scope, runSupabase, runDemo) {
  if (IS_DEMO) return runDemo();

  const { data, error } = await runSupabase(supabase);
  if (error) {
    console.error(`[${scope}] ${error.code || 'sin-código'} — ${error.message}`, {
      details: error.details,
      hint: error.hint,
    });
    throw new ServiceError(scope, error);
  }
  return data;
}

/** Parte un array en lotes; PostgREST recibe .in() por querystring y la URL tiene límite. */
export function chunk(arr, size = 200) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Detecta "esta columna no existe" para poder degradar sin romper. */
export function isMissingColumn(err, column) {
  if (!err) return false;
  if (err.code === 'PGRST204' || err.code === '42703') return true;
  return typeof err.message === 'string' && err.message.includes(column);
}

/** Detecta violación de índice único (SKU duplicado, dedup_key repetido). */
export const isUniqueViolation = (err) => err?.code === '23505';
