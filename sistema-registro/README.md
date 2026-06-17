# Creaciones Angy - Sistema de Registro de Alquileres

Sistema de registro online para alquiler y venta de trajes tipicos. Desarrollado para **Creaciones Angy**, Tarija, Bolivia.

## Tecnologias Utilizadas

| Tecnologia | Version | Uso |
|---|---|---|
| **Next.js** | 16.2.6 | Framework frontend (React) |
| **React** | 19.2.4 | Libreria UI |
| **TypeScript** | ^5 | Tipado estatico |
| **Tailwind CSS** | v4 | Estilos y diseño responsive |
| **Supabase** | ^2.105.4 | Backend (PostgreSQL + Auth + RLS) |
| **React Icons** | ^5.6.0 | Iconos (Feather Icons) |
| **React Hot Toast** | ^2.6.0 | Notificaciones |
| **date-fns** | ^4.1.0 | Manejo de fechas |

## Arquitectura del Sistema

```
Frontend (Next.js 16 - Static Export)
    |
    v
Supabase (Backend as a Service)
    |
    +-- Auth (Autenticacion con email/password)
    +-- PostgreSQL (Base de datos)
    +-- RLS (Row Level Security - Permisos)
    +-- Realtime (Chat en tiempo real)
```

**No hay backend personalizado.** Todo se conecta directamente a Supabase desde el frontend usando el SDK de JavaScript. La seguridad se maneja con **Row Level Security (RLS)** en PostgreSQL.

## Estructura del Proyecto

```
sistema-registro/
├── public/
│   └── img/
│       └── logo.png              # Logo de Creaciones Angy
├── src/
│   ├── app/
│   │   ├── layout.tsx            # Layout principal (AuthProvider + Toaster)
│   │   ├── page.tsx              # Pagina raiz (redirect a /dashboard)
│   │   ├── globals.css           # Estilos globales + colores guindo + componentes
│   │   ├── login/page.tsx        # Inicio de sesion
│   │   ├── dashboard/page.tsx    # Panel principal con estadisticas
│   │   ├── registro/page.tsx     # Formulario nuevo alquiler (individual/grupal)
│   │   ├── alquileres/page.tsx   # Lista de alquileres + detalle + devoluciones
│   │   ├── finanzas/page.tsx     # Estado de resultados y contadores financieros
│   │   ├── ventas/page.tsx       # Registro y lista de ventas
│   │   ├── perdidas/page.tsx     # Registro de prendas perdidas
│   │   ├── chat/page.tsx         # Chat del equipo en tiempo real
│   │   ├── historial/page.tsx    # Log de operaciones/auditoria
│   │   ├── admin/page.tsx        # Panel admin (usuarios, solicitudes, auditoria)
│   │   └── manual/page.tsx       # Manual de instrucciones para trabajadores
│   ├── components/
│   │   ├── AuthProvider.tsx      # Contexto de autenticacion (session, profile, roles)
│   │   ├── ProtectedLayout.tsx   # Layout protegido (redirect a login si no auth)
│   │   ├── Sidebar.tsx           # Menu lateral con navegacion y presencia online
│   │   └── ConfirmModal.tsx      # Modal de confirmacion reutilizable
│   └── lib/
│       ├── supabase.ts           # Cliente Supabase (URL + anon key)
│       └── types.ts              # Interfaces TypeScript de todas las tablas
├── package.json
├── tsconfig.json
├── next.config.ts                # Configuracion Next.js (output: export, images: unoptimized)
├── postcss.config.mjs            # PostCSS con Tailwind CSS v4
├── eslint.config.mjs             # ESLint con reglas Next.js
├── AGENTS.md                     # Instrucciones para IAs
├── CLAUDE.md                     # Instrucciones para Claude
└── database/
    └── schema.sql                # Schema SQL completo de la base de datos
```

## Instalacion Local

### Requisitos Previos

- **Node.js** >= 18.x (recomendado 20+)
- **npm** >= 9.x
- Cuenta en [Supabase](https://supabase.com) (gratis)

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/makefk123456789-alt/Repositorio-de-Kevin-.git
cd Repositorio-de-Kevin-/sistema-registro

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales de Supabase

# 4. Ejecutar en modo desarrollo
npm run dev

# 5. Abrir en el navegador
# http://localhost:3000
```

### Variables de Entorno

Crear archivo `.env.local` en la raiz de `sistema-registro/`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui
```

**Donde encontrar estas credenciales:**
1. Ve a [app.supabase.com](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **Settings > API**
4. Copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret key` → `SUPABASE_SERVICE_ROLE_KEY` (solo para crear usuarios desde admin)

> **NOTA:** El archivo `src/lib/supabase.ts` tiene credenciales hardcodeadas del proyecto actual como fallback. Para usar tu propio Supabase, configura las variables de entorno y estas tomaran prioridad.

## Configuracion de la Base de Datos (Supabase)

### Opcion 1: Proyecto nuevo en Supabase

1. Crea un proyecto en [app.supabase.com](https://app.supabase.com)
2. Ve a **SQL Editor**
3. Ejecuta el archivo `database/schema.sql` completo
4. Copia las credenciales API a tu `.env.local`

### Opcion 2: Usar el proyecto existente

El proyecto ya esta conectado a `evppovogdwivjlmvmlrk.supabase.co` (proyecto "creaciones-angy"). Si tienes acceso, solo clona y ejecuta.

## Comandos Disponibles

```bash
npm run dev      # Servidor de desarrollo (http://localhost:3000)
npm run build    # Construir para produccion (genera /out para static hosting)
npm run start    # Servidor de produccion
npm run lint     # Verificar errores de codigo
```

## Despliegue

### Opcion 1: Hosting estatico (recomendado)

El proyecto esta configurado con `output: 'export'` en `next.config.ts`, lo que genera archivos estaticos en la carpeta `/out`.

```bash
npm run build    # Genera la carpeta /out
# Sube la carpeta /out a cualquier hosting estatico:
# - Netlify (drag & drop)
# - Vercel
# - GitHub Pages
# - AWS S3 + CloudFront
# - Firebase Hosting
```

### Opcion 2: Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Desplegar
vercel --prod
```

### Opcion 3: Netlify

1. Sube el repositorio a GitHub
2. Conecta en [netlify.com](https://netlify.com)
3. Build command: `npm run build`
4. Publish directory: `out`

## Roles y Permisos

| Funcion | Admin | Trabajador |
|---|---|---|
| Ver dashboard | Si | Si |
| Registrar alquileres | Si | Si |
| Ver lista de alquileres | Si | Si |
| Marcar devoluciones | Si | Si |
| Revertir devoluciones | Si (directo) | Solo con solicitud |
| Editar registros | Si | Solo con solicitud |
| Borrar registros | Si | No |
| Aprobar solicitudes | Si | No |
| Crear usuarios | Si | No |
| Ver auditoria | Si | No |
| Activar/desactivar usuarios | Si | No |

## Sistema de Colores (Estados)

| Color | Estado | Significado |
|---|---|---|
| **Blanco** | Activo | Alquiler dentro del plazo, pendiente de devolucion |
| **Naranja** | Devuelto | Cliente devolvio correctamente la ropa |
| **Rojo** | Vencido | Fecha vencida y no devolvio (requiere seguimiento) |

Los colores se aplican automaticamente a cada fila de la tabla y al borde izquierdo de cada registro.

## Flujo de Trabajo

### Registro Individual
1. Trabajador va a "Nuevo Registro" > Individual
2. Llena datos del cliente (nombre, celular, CI, danza, prendas, precio, garantia)
3. Guarda el alquiler
4. Cuando el cliente devuelve, abre el detalle y marca "Registrar Devolucion"

### Registro Grupal
1. Trabajador va a "Nuevo Registro" > Grupal
2. Crea el grupo con responsable y datos generales
3. Agrega integrantes con sus prendas y montos individuales
4. Puede agregar mas integrantes despues (llegan en distintos momentos)
5. Marca a cada integrante individualmente cuando devuelve
6. Cuando todos devolvieron, marca el grupo completo como devuelto

### Solicitudes de Edicion
1. Trabajador no puede editar/borrar directamente
2. Envia solicitud explicando el motivo
3. Admin la ve en "Administracion > Solicitudes"
4. Admin aprueba o rechaza

## Como Continuar el Desarrollo

### Con Cursor AI / Windsurf / Copilot
1. Abre la carpeta `sistema-registro/` en tu editor
2. Los archivos `AGENTS.md` y `CLAUDE.md` ya tienen instrucciones para IAs
3. Las interfaces TypeScript en `src/lib/types.ts` definen toda la estructura de datos
4. Los estilos globales estan en `src/app/globals.css` (colores guindo personalizados)

### Con ChatGPT / Claude / Gemini
1. Comparte el contenido de `src/lib/types.ts` como contexto de la base de datos
2. Comparte `src/lib/supabase.ts` como configuracion de conexion
3. Comparte `database/schema.sql` como estructura de la BD
4. Indica que el proyecto usa Next.js 16, React 19, Tailwind CSS v4, Supabase

### Agregar nuevas paginas
1. Crea `src/app/NOMBRE/page.tsx`
2. Usa `ProtectedLayout` como wrapper
3. Importa `useAuth` para acceder al perfil y roles
4. Importa `supabase` de `@/lib/supabase` para consultas a BD
5. Agrega la ruta en `src/components/Sidebar.tsx` en el array `navItems`

### Agregar nuevas tablas
1. Crea la tabla en Supabase SQL Editor
2. Habilita RLS: `ALTER TABLE nombre ENABLE ROW LEVEL SECURITY;`
3. Crea politicas de SELECT, INSERT, UPDATE segun necesites
4. Agrega la interface en `src/lib/types.ts`

## Proyecto Supabase Actual

- **Nombre:** creaciones-angy
- **Region:** (configurado en Supabase)
- **URL:** `https://evppovogdwivjlmvmlrk.supabase.co`
- **Anon Key:** Ver `src/lib/supabase.ts`

## Despliegue Actual

- **URL:** https://out-cepawtcf.devinapps.com
- **Tipo:** Static hosting
- **Branch:** `devin/1778538323-sistema-registro`

## Licencia

Proyecto privado - Creaciones Angy, Tarija, Bolivia.
