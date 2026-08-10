# PWA de Control y Monitoreo para Red de Máquinas Expendedoras (LIMPIEZIOT)

Aplicación Web Progresiva (PWA) de alto rendimiento para el monitoreo en tiempo real, gestión de inventario de líquidos, control de saldo y seguridad física de máquinas vending expendedoras de productos de limpieza.

---

## 📄 Documentación de Arquitectura Propuesta

La propuesta técnica completa y el diseño arquitectónico de la PWA se encuentran documentados en:
- [`.doc/architecture_proposal.md`](file:///D:/Documents%20sec/Maquina%20Vending/PWA_APP/SW-PWA-VM_MANAGEMENT/.doc/architecture_proposal.md)

---

## 🛠️ Tecnologías y Librerías

- **Framework**: React 18 + Vite
- **Estilos**: Tailwind CSS + Lucide React
- **PWA & Service Worker**: `vite-plugin-pwa` (Workbox)
- **Backend & Autenticación**: `@supabase/supabase-js` (Google OAuth + Email/Password + PostgreSQL RLS)
- **Gráficas**: Recharts
- **Despliegue**: Cloudflare Pages (Gratuito e ilimitado)

---

## 🚀 Inicio Rápido (Desarrollo Local)

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo Vite
npm run dev
```

Abra `http://localhost:5173` en su navegador.

---

## 🔐 Configuración de Autenticación Supabase y Google OAuth

Para conectar la PWA a su instancia real de Supabase:

1. Copie el archivo `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```
2. Ingrese sus credenciales de Supabase:
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=ey...
   ```
3. En el Dashboard de Supabase (**Authentication -> Providers -> Google**):
   - Habilite el proveedor **Google**.
   - Ingrese el *Client ID* y *Client Secret* obtenidos de la consola de Google Cloud Platform (OAuth 2.0).
   - Agregue la URL de su despliegue de Cloudflare Pages a los *Redirect URLs* autorizados.

> **Nota**: Si no configura las llaves de Supabase, la PWA iniciará automáticamente en **Modo Demo**, permitiéndole explorar e interactuar con todas las pantallas y roles precargados.

---

## 🌐 Despliegue en Cloudflare Pages

1. Conecte su repositorio GitHub a la consola de **Cloudflare Pages**.
2. Ajustes de Build:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Build Output Directory**: `dist`
3. Variables de entorno en Cloudflare Pages:
   - Agregar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
4. El archivo `public/_redirects` ya viene incluido para garantizar el funcionamiento SPA (Single Page Application) sin errores 404 al recargar rutas.

---

## 📱 Instalación PWA

- En **Android / Chrome**: Haga clic en el botón de instalación que aparece en la barra flotante o seleccione "Agregar a la pantalla principal".
- En **iOS / Safari**: Seleccione el botón "Compartir" y toque "Agregar a inicio".
- En **Escritorio**: Haga clic en el icono de instalación en la barra de navegación del navegador.
