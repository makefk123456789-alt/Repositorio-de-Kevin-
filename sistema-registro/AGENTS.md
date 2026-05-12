<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Creaciones Angy - Guia para IAs de Programacion

## Contexto del Proyecto
Sistema de registro de alquileres de trajes tipicos para Creaciones Angy (Tarija, Bolivia).
El sistema es usado por trabajadores con poca experiencia tecnica, asi que la UI debe ser
extremadamente simple, didactica y visual.

## Stack Tecnologico
- **Next.js 16.2.6** con `output: 'export'` (sitio estatico)
- **React 19.2.4** con TypeScript
- **Tailwind CSS v4** (NO usa tailwind.config.js, usa `@theme inline` en globals.css)
- **Supabase** como backend (PostgreSQL + Auth + RLS)
- **react-icons** (Feather Icons - prefijo Fi)
- **react-hot-toast** para notificaciones
- **date-fns** para fechas

## Archivos Importantes
- `src/lib/types.ts` - TODAS las interfaces TypeScript (tablas de BD)
- `src/lib/supabase.ts` - Cliente Supabase (URL + anon key)
- `src/app/globals.css` - Colores guindo personalizados + clases utilitarias
- `src/components/AuthProvider.tsx` - Hook useAuth() para session/profile/isAdmin
- `src/components/ProtectedLayout.tsx` - Wrapper para rutas protegidas
- `src/components/ConfirmModal.tsx` - Modal reutilizable de confirmacion
- `database/schema.sql` - Schema SQL completo de la BD

## Convenciones
- Cada pagina usa `'use client'` y ProtectedLayout como wrapper
- Hook `useAuth()` da acceso a `profile`, `isAdmin`, `signIn`, `signOut`
- Queries a BD: `supabase.from('tabla').select('*')` (SDK directo)
- Colores: `guindo-*` (50-950) es el color principal (bordo/vino)
- Clases globales: `.btn-primary`, `.input-field`, `.label-field`, `.card-stat`
- Navegacion: agregar rutas en `src/components/Sidebar.tsx` > array `navItems`

## Sistema de Colores de Estado
- **Blanco** = Alquiler activo dentro del plazo
- **Naranja** = Ya devolvio correctamente
- **Rojo suave** = Vencido, no devolvio (requiere seguimiento)

## Reglas de Negocio
- Trabajadores NO pueden editar/borrar registros (solo enviar solicitudes al admin)
- Devoluciones de integrantes son individuales (checkbox por persona)
- Una vez marcado como devuelto, solo se revierte con solicitud al admin
- Integrantes se pueden agregar a grupos ya guardados
- Cada accion sensible muestra ConfirmModal antes de ejecutar

## Comandos
```bash
npm run dev      # Desarrollo local
npm run build    # Build produccion (genera /out)
npm run lint     # Verificar errores
```
