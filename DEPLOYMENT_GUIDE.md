# 📘 Guía Completa de Despliegue en Cloudflare Pages, Supabase DB y Gestión de Usuarios

Este documento contiene la guía paso a paso para desplegar la **PWA de Control y Monitoreo de Máquinas Expendedoras (LIMPIEZIOT)** en **Cloudflare Pages** de forma 100% gratuita, conectar la base de datos **Supabase (PostgreSQL)** y administrar usuarios con filtrado de máquinas asignadas.

---

## 📋 Tabla de Contenidos
1. [Protección de Seguridad y `.gitignore`](#1-protección-de-seguridad-y-gitignore)
2. [Configuración de Conexión a la Base de Datos Supabase](#2-configuración-de-conexión-a-la-base-de-datos-supabase)
3. [Esquema de Base de Datos y Políticas RLS (SQL)](#3-esquema-de-base-de-datos-y-políticas-rls-sql)
4. [Cómo Agregar Nuevos Usuarios y Asignar Máquinas Visibles](#4-cómo-agregar-nuevos-usuarios-y-asignar-máquinas-visibles)
5. [Publicación del Repositorio en GitHub](#5-publicación-del-repositorio-en-github)
6. [Despliegue Paso a Paso en Cloudflare Pages](#6-despliegue-paso-a-paso-en-cloudflare-pages)
7. [Configuración de Google OAuth y Dominio en Supabase](#7-configuración-de-google-oauth-y-dominio-en-supabase)
8. [Verificación PWA y Funcionamiento en Producción](#8-verificación-pwa-y-funcionamiento-en-producción)

---

## 1. 🛡️ Protección de Seguridad y `.gitignore`

Para evitar la filtración de credenciales sensibles, claves de API privadas o documentación interna confidencial en GitHub, el proyecto incluye un archivo `.gitignore` configurado rigurosamente:

### Archivos y Directorios Excluidos:
* **`.env` / `.env.local`**: Contienen tokens de acceso y llaves de desarrollo local.
* **`.doc/`**: Directorio de arquitectura interna y especificaciones del sistema backend.
* **`node_modules/` & `dist/`**: Dependencias y archivos generados en la compilación.
* **`*.pem`, `*.key`**: Certificados y llaves privadas de autenticación.

> 💡 **Buenas Prácticas**: Nunca subas tu `SUPABASE_SERVICE_ROLE_KEY` o `.env` al repositorio. Se ha incluido una plantilla pública llamada [`.env.example`](file://./.env.example) para referencia.

---

## 2. 🗄️ Configuración de Conexión a la Base de Datos Supabase

La PWA utiliza la librería oficial `@supabase/supabase-js` para conectarse a PostgreSQL mediante las APIs REST y WebSockets (Realtime) de Supabase.

### Variables de Entorno Requeridas:
En el frontend desarrollado con Vite, las variables de entorno expuestas al cliente deben iniciar obligatoriamente con el prefijo `VITE_`:

| Nombre de la Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | URL de la instancia de Supabase | `https://fjsbghllelmthypoafgx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Clave pública anónima (Safe for client) | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

⚠️ **IMPORTANTE**: No utilices la `SUPABASE_SERVICE_ROLE_KEY` en la PWA, ya que esa llave omite todas las reglas de seguridad RLS y daría acceso administrativo total a cualquier usuario que la inspeccione en el navegador.

---

## 3. 🛢️ Esquema de Base de Datos y Políticas RLS (SQL)

Ejecuta el siguiente script en el **SQL Editor** de tu panel de Supabase para estructurar la tabla de perfiles de usuario y catálogo de máquinas:

```sql
-- 1. Crear extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabla de Perfiles de Usuario (vincular con auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT CHECK (role IN ('admin', 'technician', 'viewer')) DEFAULT 'viewer',
  assigned_machine_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Acceso RLS
-- Lectura: Cada usuario puede ver su propio perfil, los admins pueden ver todos
CREATE POLICY "Permitir lectura de perfiles" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Actualización: Solo administradores pueden modificar roles y máquinas asignadas
CREATE POLICY "Permitir actualización a administradores" ON public.profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 5. Trigger para crear un perfil automáticamente cuando un usuario se registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, assigned_machine_ids)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'viewer',
    '{}'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 4. 👤 Cómo Agregar Nuevos Usuarios y Asignar Máquinas Visibles

El sistema cuenta con un control de acceso **multi-tenant por máquina**. Cada usuario solo podrá visualizar y monitorear las máquinas cuyos IDs estén contenidos en su lista `assigned_machine_ids`.

Existen **dos formas** de agregar usuarios y asignarles máquinas:

---

### 🔹 Método 1: Desde la Interfaz de la PWA (Recomendado para Administradores)

1. Inicia sesión en la PWA con una cuenta que posea el rol `admin`.
2. Dirígete a la sección **Usuarios** en la barra lateral (`/users`).
3. En la tabla de usuarios registrados:
   - Selecciona el rol correspondiente (`Admin`, `Technician`, `Viewer`).
   - Haz clic en el botón **"Asignar Máquinas"**.
4. Se abrirá un panel modal interactivo. Marca las casillas de las máquinas que este usuario podrá visualizar (ejemplo: `VM-001 - Expendedora Plaza Tec`).
5. Haz clic en **"Guardar Asignación"**. Los cambios se sincronizarán inmediatamente con la base de datos de Supabase.

---

### 🔹 Método 2: Desde el Editor SQL de Supabase (Manual / Backend)

Si necesitas crear un usuario manualmente o asignarle acceso directamente mediante SQL:

#### Paso 1: Registrar el usuario en Supabase Auth
Ve a **Authentication -> Users -> Add User** y registra el correo y contraseña (o pídele al usuario que inicie sesión mediante Google OAuth).

#### Paso 2: Asignar el Rol y Máquinas con Script SQL
Copia el `UUID` del usuario registrado y ejecuta el siguiente comando en el SQL Editor:

```sql
-- Ejemplo: Otorgar acceso a un técnico para las máquinas VM-001 y VM-002
INSERT INTO public.profiles (id, email, full_name, role, assigned_machine_ids)
VALUES (
  'AQUÍ_VA_EL_UUID_DE_SUPABASE_AUTH', -- Ejemplo: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  'tecnico.plaza@limpieziot.com',
  'Carlos Mendoza',
  'technician',
  ARRAY['VM-001', 'VM-002']
)
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  assigned_machine_ids = EXCLUDED.assigned_machine_ids,
  full_name = EXCLUDED.full_name;
```

#### Paso 3: Asignar ACCESO TOTAL a todas las máquinas (Para un Administrador)
```sql
UPDATE public.profiles
SET role = 'admin',
    assigned_machine_ids = (SELECT ARRAY_AGG(id) FROM public.machines)
WHERE email = 'admin@limpieziot.com';
```

---

## 5. 🚀 Publicación del Repositorio en GitHub

Para subir el código a GitHub evitando subir archivos confidenciales:

1. Inicializa y confirma los cambios locales:
   ```bash
   git init
   git branch -M main
   git add .
   git commit -m "Initial commit: PWA Limpieziot Vending Management"
   ```

2. Crea el repositorio en GitHub utilizando la CLI oficiales de GitHub `gh`:
   ```bash
   gh repo create sw-pwa-vm-management --public --source=. --remote=origin --push
   ```

*(O manualmente desde la web de GitHub creando un repositorio vacío y agregando la dirección remota with `git remote add origin ...` y `git push -u origin main`).*

---

## 6. ☁️ Despliegue Paso a Paso en Cloudflare Pages (Gratuito e Ilimitado)

Cloudflare Pages ofrece alojamiento estático gratuito global con soporte nativo para redes CDN y certificados SSL HTTPS automáticos.

### Pasos de Configuración:

1. Inicia sesión en tu cuenta de [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. En el menú lateral, selecciona **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**.
3. Autoriza a Cloudflare para acceder a tu cuenta de GitHub y selecciona el repositorio `sw-pwa-vm-management`.
4. Configura los **Build Settings**:
   * **Project Name**: `sw-pwa-vm-management` (o el nombre de tu preferencia).
   * **Production branch**: `main`
   * **Framework Preset**: `Vite`
   * **Build command**: `npm run build`
   * **Build output directory**: `dist`

5. **Configurar Variables de Entorno (Environment Variables)**:
   Despliega la sección **Environment variables (advanced)** y agrega las siguientes variables de producción:
   * `VITE_SUPABASE_URL` = `https://tu-proyecto.supabase.co`
   * `VITE_SUPABASE_ANON_KEY` = `tu_clave_anonima_publica`

6. Haz clic en **Save and Deploy**. Cloudflare compilará el proyecto en aproximadamente 30 a 60 segundos.

---

### 🔁 Solución de Enrutamiento SPA (`public/_redirects`)

Para evitar que al recargar la página en rutas como `/machines` o `/users` Cloudflare devuelva un error **404 Not Found**, el proyecto incluye el archivo [`public/_redirects`](file://./public/_redirects) con la siguiente instrucción:

```text
/*  /index.html  200
```
Esto redirige todas las peticiones dinámicas al punto de entrada de la SPA React.

---

## 7. 🔐 Configuración de Google OAuth y Dominio en Supabase

Una vez desplegada tu aplicación en Cloudflare Pages (obtendrás una URL del tipo `https://sw-pwa-vm-management.pages.dev`):

1. Ve a tu panel de **Supabase** -> **Authentication** -> **URL Configuration**.
2. Agrega la dirección URL de Cloudflare Pages a los campos:
   * **Site URL**: `https://sw-pwa-vm-management.pages.dev`
   * **Redirect URLs**: `https://sw-pwa-vm-management.pages.dev/**`
3. En **Authentication** -> **Providers** -> **Google**:
   * Habilita el proveedor Google.
   * Ingresa tu `Client ID` y `Client Secret` obtenidos de Google Cloud Console.

---

## 8. 📱 Verificación PWA y Funcionamiento en Producción

Una vez completado el despliegue:

1. Abre `https://sw-pwa-vm-management.pages.dev` desde un dispositivo móvil o navegador de escritorio.
2. Comprueba el icono de instalación de PWA en la barra del navegador o menú ("Agregar a la pantalla principal").
3. Verifica la persistencia sin conexión mediante el Service Worker generado por `vite-plugin-pwa`.
4. Inicia sesión y valida que el menú de máquinas filtre correctamente únicamente aquellas máquinas asignadas a tu perfil de usuario.

---
*Documentación generada para el proyecto LIMPIEZIOT PWA Vending Machine Control.*
