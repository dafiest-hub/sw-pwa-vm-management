/**
 * Los cinco sistemas de inferencia difusa, cargados desde sus especificaciones.
 *
 * Los `specs/*.json` NO se editan a mano: son la exportación del sistema de la
 * tesis y se regeneran desde allí con
 *
 *   python -m hfis --perfil refinado --sin-temperatura exportar --destino <specs/>
 *
 * Reajustar el sistema difuso es cambiar un JSON y volver a desplegar, no tocar
 * código. Si alguien los regenera con `--perfil fiel` cambian cinco
 * consecuentes y dos pesos del Maestro sin que se vea en el diff del código:
 * el orden de la ruta cambiaría y `scripts/hfis-selfcheck.mjs` lo detectaría.
 *
 * Este es el ÚNICO archivo del motor que no se puede subir a una Edge Function
 * tal cual: Vite resuelve el `import` de JSON de forma nativa y Deno pediría
 * otra forma de cargarlo. `engine.js`, `pipeline.js` y `dbMapping.js` sí.
 */
import { fisDesdeSpec } from './engine';
import inventario from './specs/inventario.json';
import seguridad from './specs/seguridad.json';
import mantenimiento from './specs/mantenimiento.json';
import conectividad from './specs/conectividad.json';
import maestro from './specs/maestro.json';

export const FIS = {
  inventario: fisDesdeSpec(inventario),
  seguridad: fisDesdeSpec(seguridad),
  mantenimiento: fisDesdeSpec(mantenimiento),
  conectividad: fisDesdeSpec(conectividad),
  maestro: fisDesdeSpec(maestro),
};

export default FIS;
