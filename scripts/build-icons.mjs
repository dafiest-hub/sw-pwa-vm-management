/**
 * Genera el logo recortado y el juego completo de iconos PWA.
 *
 * Motivo: los cuatro PNG de public/ eran el MISMO archivo de 644 KB copiado y
 * renombrado (2.5 MB en total). favicon.ico no era un ICO y pwa-192x192.png no
 * estaba redimensionado a 192 px.
 *
 * Uso:  node scripts/build-icons.mjs
 * Requiere la devDependency `sharp` (no entra en el bundle de producción).
 */
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(root, 'src/assets/logo-source.png');
const PUB = resolve(root, 'public');

// Fondo de la interfaz (SURFACE_HEX de src/theme/brand.js)
const SURFACE = { r: 11, g: 17, b: 32, alpha: 1 };

/** Recorta el margen blanco del original conservando el trazo del logo. */
async function trimmed() {
  return sharp(SRC)
    .flatten({ background: '#ffffff' })
    // threshold alto: el fondo es blanco puro y el logo tiene antialiasing claro
    .trim({ background: '#ffffff', threshold: 20 })
    .toBuffer();
}

/** Convierte el blanco del fondo en transparencia (para usarlo sobre oscuro). */
async function transparentLogo(buf) {
  const { data, info } = await sharp(buf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const px = Buffer.from(data);
  for (let i = 0; i < px.length; i += 4) {
    const [r, g, b] = [px[i], px[i + 1], px[i + 2]];
    // Los píxeles casi blancos son fondo; el resto es trazo.
    const lightness = Math.min(r, g, b);
    if (lightness > 232) px[i + 3] = 0;
    else if (lightness > 200) px[i + 3] = Math.round(((232 - lightness) / 32) * 255);
  }

  return sharp(px, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** Icono cuadrado: logo centrado sobre el color de superficie. */
async function squareIcon(logo, size, padRatio) {
  const inner = Math.round(size * padRatio);
  const resized = await sharp(logo)
    .resize({ width: inner, height: inner, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  return sharp({
    create: { width: size, height: size, channels: 4, background: SURFACE },
  })
    .composite([{ input: resized, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

const kb = (buf) => `${(buf.length / 1024).toFixed(1)} KB`;

async function main() {
  await mkdir(PUB, { recursive: true });

  const base = await trimmed();
  const meta = await sharp(base).metadata();
  console.log(`Original recortado: ${meta.width}x${meta.height}`);

  const logo = await transparentLogo(base);

  // Logo para la interfaz (fondo transparente, ancho máximo 720 px)
  const logoWide = await sharp(logo)
    .resize({ width: 720, withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(resolve(PUB, 'logo.png'), logoWide);

  const outputs = [
    // maskable necesita zona segura: el contenido ocupa ~60 % del lienzo
    ['pwa-512x512-maskable.png', await squareIcon(logo, 512, 0.6)],
    ['pwa-512x512.png', await squareIcon(logo, 512, 0.82)],
    ['pwa-192x192.png', await squareIcon(logo, 192, 0.82)],
    ['apple-touch-icon.png', await squareIcon(logo, 180, 0.78)],
    // Se sirve como PNG y se declara como tal en index.html
    ['favicon.ico', await squareIcon(logo, 32, 0.92)],
    ['logo.png', logoWide],
  ];

  let total = 0;
  for (const [name, buf] of outputs) {
    await writeFile(resolve(PUB, name), buf);
    total += buf.length;
    console.log(`  ${name.padEnd(28)} ${kb(buf)}`);
  }
  console.log(`Total: ${(total / 1024).toFixed(1)} KB`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
