# Documentacion Tecnica - Creaciones Angy

## Indice

1. [Arquitectura General](#1-arquitectura-general)
2. [Flujo de Alquileres](#2-flujo-de-alquileres)
3. [Flujo de Devoluciones](#3-flujo-de-devoluciones)
4. [Roles y Permisos](#4-roles-y-permisos)
5. [Sistema de Solicitudes](#5-sistema-de-solicitudes)
6. [Estados Visuales (Colores)](#6-estados-visuales-colores)
7. [Base de Datos](#7-base-de-datos)
8. [Componentes Frontend](#8-componentes-frontend)
9. [Autenticacion](#9-autenticacion)
10. [Guia para Continuar Desarrollo](#10-guia-para-continuar-desarrollo)

---

## 1. Arquitectura General

```
+---------------------------+
|   Frontend (Next.js 16)   |
|   React 19 + TypeScript   |
|   Tailwind CSS v4         |
+-------------|-------------+
              |
              | HTTPS (SDK JavaScript)
              |
+-------------|-------------+
|       Supabase Cloud      |
|                           |
|  +---------------------+  |
|  |   Auth (email/pass) |  |
|  +---------------------+  |
|  |   PostgreSQL (BD)   |  |
|  |   + RLS (Seguridad) |  |
|  +---------------------+  |
|  |   Realtime (Chat)   |  |
|  +---------------------+  |
+---------------------------+
```

**No hay backend propio.** El frontend se comunica directamente con Supabase.
La seguridad se maneja con **Row Level Security (RLS)** en PostgreSQL:
cada tabla tiene politicas que verifican si el usuario esta autenticado,
activo y tiene el rol correcto.

**Despliegue:** El proyecto se exporta como sitio estatico (`output: 'export'`
en `next.config.ts`). La carpeta `/out` se sube a cualquier hosting estatico.

---

## 2. Flujo de Alquileres

### 2.1 Alquiler Individual

```
Trabajador abre "Nuevo Registro"
    |
    v
Selecciona "Individual"
    |
    v
Llena formulario:
  - Nombre del cliente
  - Celular, CI
  - Danza (tipo de baile)
  - Prendas (nombre + cantidad, puede agregar varias)
  - Precio total (Bs.)
  - Metodo de pago (Efectivo / QR / Mixto)
  - Tipo de garantia (CI+Efectivo, CI+QR, CI+Prenda, etc.)
  - Fecha de devolucion
  - Notas opcionales
    |
    v
Click "Guardar Alquiler"
    |
    v
Se inserta en tabla `alquileres` con:
  - tipo = 'individual'
  - estado = 'pendiente'
  - codigo = auto-generado (trigger)
  - registrado_por = usuario actual
    |
    v
Aparece en lista de Alquileres con fila BLANCA (activo)
```

### 2.2 Alquiler Grupal

```
Trabajador abre "Nuevo Registro"
    |
    v
Selecciona "Grupal"
    |
    v
Llena datos del grupo:
  - Nombre del responsable
  - Nombre del grupo
  - Danza, garantia general
  - Fecha de devolucion
    |
    v
Agrega integrantes (puede ser 1 o muchos):
  - Nombre del integrante
  - Prendas individuales (nombre + cantidad)
  - Monto individual (Bs.)
  - Metodo de pago
  - Tipo de garantia
    |
    v
Click "Guardar Alquiler"
    |
    v
Se inserta:
  1. Un registro en `alquileres` (tipo = 'grupal')
  2. Cada integrante en `integrantes_grupo` (alquiler_id = ID del grupo)
    |
    v
DESPUES se pueden agregar mas integrantes:
  - Abrir detalle del grupo > "Agregar Integrante"
  - Los integrantes ya guardados NO se pueden editar (solo con solicitud)
```

---

## 3. Flujo de Devoluciones

### 3.1 Devolucion Individual

```
Trabajador abre lista de Alquileres
    |
    v
Click en la fila del alquiler (abre detalle)
    |
    v
Ve boton grande naranja "REGISTRAR DEVOLUCION"
    |
    v
Aparece ventana de confirmacion: "¿Estas seguro?"
    |
    v
Click "Confirmar"
    |
    v
Se actualiza en `alquileres`:
  - estado = 'devuelto'
  - fecha_devuelto = NOW()
  - devuelto_por = usuario actual
    |
    v
La fila cambia a color NARANJA (devuelto)
El nombre se TACHA en la lista
```

### 3.2 Devolucion Grupal (por integrante)

```
Trabajador abre detalle del grupo
    |
    v
Ve lista de integrantes con checkbox al lado de cada nombre
    |
    v
Cuando un integrante devuelve, click en su checkbox
    |
    v
Aparece confirmacion: "¿Marcar a [nombre] como devuelto?"
    |
    v
Se actualiza en `integrantes_grupo`:
  - devuelto = true
  - devuelto_fecha = NOW()
  - devuelto_por = usuario actual
    |
    v
El integrante se TACHA y aparece verde
Barra de progreso se actualiza: "5 de 10 devolvieron"
    |
    v
Cuando TODOS devolvieron:
  - Aparece boton "REGISTRAR DEVOLUCION DEL GRUPO"
  - Al confirmar, se actualiza el alquiler completo a 'devuelto'
```

### 3.3 Revertir Devolucion

```
TRABAJADOR:
  - Click en checkbox verde de integrante devuelto
  - Aparece formulario para explicar motivo
  - "Enviar Solicitud" → se inserta en `solicitudes_edicion`
  - Solo el admin puede aprobar y revertir

ADMINISTRADOR:
  - Click directo en checkbox verde
  - Aparece confirmacion y se revierte directamente
```

---

## 4. Roles y Permisos

### Admin
- Ve TODO el sistema
- Puede crear/desactivar usuarios
- Puede aprobar/rechazar solicitudes de edicion
- Puede revertir devoluciones directamente
- Puede eliminar registros
- Ve auditoria completa

### Trabajador (Worker)
- Puede registrar alquileres (individual y grupal)
- Puede marcar devoluciones
- NO puede editar registros guardados
- NO puede eliminar registros
- NO puede revertir devoluciones (debe enviar solicitud)
- Puede enviar solicitudes de edicion con motivo
- Puede usar el chat del equipo
- Puede ver finanzas y historial

### Implementacion Tecnica
- Rol almacenado en `profiles.role` ('admin' | 'worker')
- Funciones SQL: `is_admin()` e `is_active()` verifican rol y estado
- En el frontend: `useAuth()` hook devuelve `isAdmin` boolean
- RLS policies usan estas funciones para control de acceso

---

## 5. Sistema de Solicitudes

```
Trabajador quiere editar/revertir algo
    |
    v
Abre detalle del alquiler
    |
    v
"Solicitar Edicion" o intenta revertir devolucion
    |
    v
Llena motivo obligatorio
    |
    v
Se inserta en `solicitudes_edicion`:
  - tipo: 'edicion' | 'revertir_devolucion'
  - solicitante_id, solicitante_nombre
  - motivo
  - estado: 'pendiente'
  - aprobada_usada: false
    |
    v
Admin ve en Administracion > Solicitudes
    |
    v
Admin puede:
  - Aprobar (estado = 'aprobada', aprobado_por = admin)
  - Rechazar (estado = 'rechazada')
  - Ver quien envio, fecha/hora, motivo
```

---

## 6. Estados Visuales (Colores)

| Color Fila | Borde Izquierdo | Estado | Condicion |
|---|---|---|---|
| Blanco | 4px naranja | Activo | `estado = 'pendiente'` Y `fecha_devolucion >= hoy` |
| Rojo suave | 4px rojo | Vencido | `estado = 'pendiente'` Y `fecha_devolucion < hoy` |
| Naranja suave | 4px naranja | Devuelto | `estado = 'devuelto'` |
| Rojo | 4px rojo | Perdida | `estado = 'perdida'` |

- **Devueltos** se muestran con texto **tachado** y opacidad reducida
- **Vencidos** tienen una animacion suave de pulso para llamar la atencion
- Estos colores se aplican en las 3 vistas: Todos, Individuales, Grupales

---

## 7. Base de Datos

### Tablas Principales

| Tabla | Descripcion | Registros Tipicos |
|---|---|---|
| `profiles` | Usuarios del sistema (admin/worker) | 5-20 |
| `alquileres` | Registros de alquiler (individual/grupal) | 100-10000 |
| `integrantes_grupo` | Miembros de alquileres grupales | 500-50000 |
| `solicitudes_edicion` | Peticiones de edicion de trabajadores | 10-500 |
| `audit_log` | Historial de operaciones | 1000+ |
| `ventas` | Registros de ventas directas | 50-5000 |
| `chat_mensajes` | Mensajes del chat del equipo | 100-10000 |
| `presencia` | Estado online de usuarios | 5-20 |

### Relaciones

```
profiles (1) ----< alquileres (registrado_por)
profiles (1) ----< alquileres (devuelto_por)
profiles (1) ----< audit_log (usuario_id)
profiles (1) ----< solicitudes_edicion (solicitante_id)
profiles (1) ----< chat_mensajes (usuario_id)
profiles (1) ---- presencia (id)

alquileres (1) ----< integrantes_grupo (alquiler_id)
alquileres (1) ----< solicitudes_edicion (alquiler_id)
alquileres (1) ----< audit_log (alquiler_id)
```

### Campo `prendas` (JSONB)

Tanto `alquileres.prendas` como `integrantes_grupo.prendas` usan JSONB:

```json
[
  { "nombre": "Pollera", "cantidad": 1 },
  { "nombre": "Blusa", "cantidad": 1 },
  { "nombre": "Manta", "cantidad": 2 }
]
```

---

## 8. Componentes Frontend

### AuthProvider (`src/components/AuthProvider.tsx`)
- Contexto React que maneja autenticacion
- Provee: `session`, `profile`, `loading`, `isAdmin`, `signIn`, `signOut`
- Persiste perfil en localStorage para carga rapida
- Hook: `useAuth()`

### ProtectedLayout (`src/components/ProtectedLayout.tsx`)
- Wrapper que protege rutas autenticadas
- Si no hay sesion, redirige a `/login`
- Muestra spinner mientras carga
- Incluye `Sidebar` automaticamente

### Sidebar (`src/components/Sidebar.tsx`)
- Menu lateral con navegacion
- Muestra estado online del equipo (presencia)
- Responsive: hamburger menu en movil
- Items dinamicos segun rol (admin ve "Administracion")

### ConfirmModal (`src/components/ConfirmModal.tsx`)
- Modal reutilizable de confirmacion
- Props: `open`, `title`, `message`, `type` (warning/danger/info), `onConfirm`, `onCancel`
- Colores automaticos segun tipo
- Se usa antes de TODA accion sensible

### Estilos Globales (`src/app/globals.css`)
- Colores personalizados: `guindo-50` a `guindo-950` (bordo/vino)
- Clases utilitarias: `.btn-primary`, `.input-field`, `.label-field`, `.card-stat`
- Responsive: inputs 16px en movil (evita zoom iOS)
- Animacion `pulse-soft` para filas vencidas

---

## 9. Autenticacion

### Flujo de Login
```
Usuario abre la app
    |
    v
AuthProvider verifica sesion con Supabase
    |
    v
Sin sesion → redirect a /login
    |
    v
Usuario ingresa email + password
    |
    v
supabase.auth.signInWithPassword()
    |
    v
Si exito → carga perfil de `profiles`
    |
    v
Redirect a /dashboard
```

### Crear Usuarios (Admin)
- Admin va a Administracion > Crear Usuario
- Llena: nombre, email, password, rol
- Se usa `supabase.auth.admin.createUser()` con service role key
- Se inserta perfil en `profiles` con `contrasena_visible`
- El trigger `handle_new_user` tambien crea el perfil automaticamente

---

## 10. Guia para Continuar Desarrollo

### Agregar una nueva pagina

1. Crear archivo: `src/app/NOMBRE/page.tsx`
2. Estructura basica:
```tsx
'use client'

import ProtectedLayout from '@/components/ProtectedLayout'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'

export default function NuevaPage() {
  const { profile, isAdmin } = useAuth()

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Nueva Seccion</h1>
        {/* Contenido */}
      </div>
    </ProtectedLayout>
  )
}
```
3. Agregar en `src/components/Sidebar.tsx` > array `navItems`:
```tsx
{ href: '/nombre', label: 'Nueva Seccion', icon: FiIcon },
```

### Agregar una nueva tabla en Supabase

1. Crear tabla en SQL Editor
2. Habilitar RLS: `ALTER TABLE nombre ENABLE ROW LEVEL SECURITY;`
3. Crear policies (SELECT, INSERT, UPDATE, DELETE)
4. Agregar interface en `src/lib/types.ts`
5. Usar en el frontend: `supabase.from('nombre').select('*')`

### Modificar estilos

- Colores guindo: `src/app/globals.css` > `@theme inline`
- Componentes globales: `.btn-primary`, `.input-field`, `.card-stat`
- Tailwind v4: usar clases directamente, no necesita `tailwind.config.js`

### Variables de entorno para produccion

Para cambiar de proyecto Supabase, editar `src/lib/supabase.ts` o configurar:
```
NEXT_PUBLIC_SUPABASE_URL=nueva-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=nueva-key
```

El service role key solo se necesita en el panel admin para crear usuarios.
Actualmente esta hardcodeado en `src/app/admin/page.tsx` para simplicidad.
En produccion se recomienda moverlo a una API route o variable de entorno.
