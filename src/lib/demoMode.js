import { supabase, isSupabaseConfigured } from './supabaseClient';

/**
 * Modo demostración.
 *
 * Antes era una constante de módulo derivada sólo de si había credenciales, y
 * los botones de «Acceso Directo Modo Demo» llamaban a `switchDemoRole()` sin
 * mirarla. En producción eso metía un perfil falso en el contexto de React
 * —suficiente para pasar `ProtectedRoute`, que sólo comprueba que `user` no sea
 * nulo— mientras la capa de datos seguía en modo real. Resultado: una sesión sin
 * autenticar consultando la base de producción con la clave anon. La RLS
 * aguantaba (sólo `products` es legible por `anon`), pero la demostración
 * enseñaba el catálogo real y fallaba en todo lo demás.
 *
 * Ahora el modo demostración es un estado en tiempo de ejecución: entrar en la
 * demo conmuta TAMBIÉN la capa de datos, así que ninguna petición llega a la
 * base. Se persiste en `sessionStorage` para sobrevivir a un recargado sin
 * quedarse pegado entre pestañas ni entre visitas.
 */

/** Si no hay credenciales, la demostración es el único modo posible. */
export const HAS_BACKEND = isSupabaseConfigured && !!supabase;

const STORAGE_KEY = 'limpieziot.demo';

// En navegación privada o con el almacenamiento bloqueado, acceder lanza.
const readStored = () => {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

const writeStored = (on) => {
  try {
    if (on) sessionStorage.setItem(STORAGE_KEY, '1');
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Sin persistencia el modo sigue siendo correcto durante esta carga.
  }
};

let active = !HAS_BACKEND || readStored();

const listeners = new Set();

/** Consultar SIEMPRE con esta función: el valor cambia durante la sesión. */
export const isDemoActive = () => active;

function setActive(next) {
  // Sin credenciales no se puede salir de la demostración.
  const value = HAS_BACKEND ? next : true;
  if (value === active) return;
  active = value;
  writeStored(value);
  listeners.forEach((fn) => fn(value));
}

export const enterDemoMode = () => setActive(true);
export const exitDemoMode = () => setActive(false);

/** Devuelve la función para cancelar la suscripción. */
export function subscribeDemoMode(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
