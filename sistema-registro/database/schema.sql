-- =============================================================
-- Creaciones Angy - Schema SQL Completo
-- Sistema de Registro de Alquileres de Trajes Tipicos
-- =============================================================
-- Ejecutar este archivo completo en Supabase > SQL Editor > Run
-- Este script crea TODAS las tablas, funciones, triggers y
-- politicas de seguridad (RLS) necesarias para el sistema.
-- =============================================================

-- =============================================================
-- 1. FUNCIONES AUXILIARES
-- =============================================================

-- Funcion para verificar si el usuario actual es admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
    AND activo = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funcion para verificar si el usuario actual esta activo
CREATE OR REPLACE FUNCTION public.is_active()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND activo = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funcion para generar codigo secuencial automatico
CREATE OR REPLACE FUNCTION public.generar_codigo_alquiler()
RETURNS TRIGGER AS $$
BEGIN
  NEW.codigo := COALESCE(
    (SELECT MAX(codigo) FROM public.alquileres), 0
  ) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Funcion para generar codigo secuencial de ventas
CREATE OR REPLACE FUNCTION public.generar_codigo_venta()
RETURNS TRIGGER AS $$
BEGIN
  NEW.codigo := COALESCE(
    (SELECT MAX(codigo) FROM public.ventas), 0
  ) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Funcion para auto-actualizar updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================
-- 2. TABLA: profiles (Usuarios del sistema)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nombre TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'worker' CHECK (role IN ('admin', 'worker')),
  activo BOOLEAN NOT NULL DEFAULT true,
  contrasena_visible TEXT,  -- Almacena password visible para que admin pueda ver/compartir
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Todos los usuarios activos pueden ver perfiles
DROP POLICY IF EXISTS "Usuarios activos pueden ver perfiles" ON public.profiles;
CREATE POLICY "Usuarios activos pueden ver perfiles" ON public.profiles
  FOR SELECT USING (public.is_active());

-- Solo admins pueden actualizar perfiles
DROP POLICY IF EXISTS "Admins pueden actualizar perfiles" ON public.profiles;
CREATE POLICY "Admins pueden actualizar perfiles" ON public.profiles
  FOR UPDATE USING (public.is_admin());

-- Permitir insert (para creacion de perfil al registrar usuario)
DROP POLICY IF EXISTS "Service role puede insertar perfiles" ON public.profiles;
CREATE POLICY "Service role puede insertar perfiles" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================
-- 3. TABLA: alquileres (Registros de alquiler)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.alquileres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo INTEGER,                                    -- Codigo secuencial auto-generado
  tipo TEXT NOT NULL CHECK (tipo IN ('individual', 'grupal')),
  nombre_cliente TEXT NOT NULL,                       -- Nombre del cliente o responsable del grupo
  celular TEXT,                                       -- Numero de contacto
  ci TEXT,                                            -- Cedula de identidad
  garantia TEXT,                                      -- Descripcion de la garantia
  tipo_garantia TEXT CHECK (tipo_garantia IN ('ci_efectivo', 'ci_prenda', 'ci_qr', 'efectivo', 'qr', 'prenda')),
  danza TEXT,                                         -- Nombre de la danza/baile
  prendas JSONB DEFAULT '[]'::jsonb,                  -- Array de {nombre, cantidad}
  cantidad_prendas INTEGER DEFAULT 0,
  precio_total NUMERIC(10,2) DEFAULT 0,
  metodo_pago TEXT CHECK (metodo_pago IN ('efectivo', 'qr', 'mixto')),
  fecha_alquiler DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_devolucion DATE NOT NULL,                     -- Fecha limite para devolver
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'devuelto', 'vencido', 'perdida')),
  fecha_devuelto TIMESTAMPTZ,                         -- Cuando se devolvio realmente
  recargo NUMERIC(10,2) DEFAULT 0,
  dias_retraso INTEGER DEFAULT 0,
  nombre_grupo TEXT,                                  -- Solo para tipo 'grupal'
  responsable_grupo TEXT,                             -- Solo para tipo 'grupal'
  notas TEXT,
  registrado_por UUID REFERENCES public.profiles(id),
  registrado_por_nombre TEXT,
  devuelto_por UUID REFERENCES public.profiles(id),
  devuelto_por_nombre TEXT,
  perdida BOOLEAN DEFAULT false,
  perdida_por UUID REFERENCES public.profiles(id),
  perdida_fecha TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.alquileres ENABLE ROW LEVEL SECURITY;

-- Todos los usuarios activos pueden ver alquileres
DROP POLICY IF EXISTS "Usuarios activos pueden ver alquileres" ON public.alquileres;
CREATE POLICY "Usuarios activos pueden ver alquileres" ON public.alquileres
  FOR SELECT USING (public.is_active());

-- Usuarios activos pueden crear alquileres
DROP POLICY IF EXISTS "Usuarios activos pueden crear alquileres" ON public.alquileres;
CREATE POLICY "Usuarios activos pueden crear alquileres" ON public.alquileres
  FOR INSERT WITH CHECK (public.is_active());

-- Usuarios activos pueden actualizar alquileres (para devoluciones)
DROP POLICY IF EXISTS "Usuarios activos pueden actualizar alquileres" ON public.alquileres;
CREATE POLICY "Usuarios activos pueden actualizar alquileres" ON public.alquileres
  FOR UPDATE USING (public.is_active());

-- Solo admins pueden eliminar
DROP POLICY IF EXISTS "Admins pueden eliminar alquileres" ON public.alquileres;
CREATE POLICY "Admins pueden eliminar alquileres" ON public.alquileres
  FOR DELETE USING (public.is_admin());

-- Triggers
DROP TRIGGER IF EXISTS alquileres_codigo ON public.alquileres;
CREATE TRIGGER alquileres_codigo
  BEFORE INSERT ON public.alquileres
  FOR EACH ROW EXECUTE FUNCTION public.generar_codigo_alquiler();

DROP TRIGGER IF EXISTS alquileres_updated_at ON public.alquileres;
CREATE TRIGGER alquileres_updated_at
  BEFORE UPDATE ON public.alquileres
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================
-- 4. TABLA: integrantes_grupo (Miembros de alquileres grupales)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.integrantes_grupo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alquiler_id UUID NOT NULL REFERENCES public.alquileres(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,                            -- Numero secuencial dentro del grupo
  nombre TEXT NOT NULL,
  garantia TEXT,
  tipo_garantia TEXT,                                 -- ci_efectivo, ci_qr, ci_prenda, etc.
  metodo_pago TEXT DEFAULT 'efectivo',
  prendas JSONB DEFAULT '[]'::jsonb,                  -- Array de {nombre, cantidad}
  monto NUMERIC(10,2) DEFAULT 0,
  notas TEXT,
  devuelto BOOLEAN DEFAULT false,                     -- Si este integrante ya devolvio
  devuelto_fecha TIMESTAMPTZ,                         -- Cuando devolvio
  devuelto_por UUID REFERENCES public.profiles(id),   -- Quien registro la devolucion
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.integrantes_grupo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios activos pueden ver integrantes" ON public.integrantes_grupo;
CREATE POLICY "Usuarios activos pueden ver integrantes" ON public.integrantes_grupo
  FOR SELECT USING (public.is_active());

DROP POLICY IF EXISTS "Usuarios activos pueden crear integrantes" ON public.integrantes_grupo;
CREATE POLICY "Usuarios activos pueden crear integrantes" ON public.integrantes_grupo
  FOR INSERT WITH CHECK (public.is_active());

DROP POLICY IF EXISTS "Usuarios activos pueden actualizar integrantes" ON public.integrantes_grupo;
CREATE POLICY "Usuarios activos pueden actualizar integrantes" ON public.integrantes_grupo
  FOR UPDATE USING (public.is_active());

-- =============================================================
-- 5. TABLA: solicitudes_edicion (Peticiones de trabajadores)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.solicitudes_edicion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alquiler_id UUID REFERENCES public.alquileres(id) ON DELETE SET NULL,
  venta_id UUID,                                      -- Referencia a ventas si aplica
  tipo TEXT NOT NULL,                                  -- 'edicion', 'revertir_devolucion', 'eliminar'
  solicitante_id UUID NOT NULL REFERENCES public.profiles(id),
  solicitante_nombre TEXT NOT NULL,
  motivo TEXT NOT NULL,                                -- Explicacion del trabajador
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
  aprobado_por UUID REFERENCES public.profiles(id),
  aprobado_por_nombre TEXT,
  aprobada_usada BOOLEAN DEFAULT false,                -- Si la aprobacion ya fue utilizada
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.solicitudes_edicion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios activos pueden crear solicitudes" ON public.solicitudes_edicion;
CREATE POLICY "Usuarios activos pueden crear solicitudes" ON public.solicitudes_edicion
  FOR INSERT WITH CHECK (public.is_active());

DROP POLICY IF EXISTS "Usuarios activos pueden ver solicitudes" ON public.solicitudes_edicion;
CREATE POLICY "Usuarios activos pueden ver solicitudes" ON public.solicitudes_edicion
  FOR SELECT USING (public.is_active());

DROP POLICY IF EXISTS "Admins pueden actualizar solicitudes" ON public.solicitudes_edicion;
CREATE POLICY "Admins pueden actualizar solicitudes" ON public.solicitudes_edicion
  FOR UPDATE USING (public.is_admin());

DROP TRIGGER IF EXISTS solicitudes_updated_at ON public.solicitudes_edicion;
CREATE TRIGGER solicitudes_updated_at
  BEFORE UPDATE ON public.solicitudes_edicion
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================
-- 6. TABLA: audit_log (Registro de operaciones)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES public.profiles(id),
  usuario_nombre TEXT NOT NULL,
  accion TEXT NOT NULL,                                -- 'registrar_alquiler', 'marcar_devolucion', etc.
  detalle TEXT,                                        -- Descripcion libre del evento
  alquiler_id UUID REFERENCES public.alquileres(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios activos pueden ver auditoria" ON public.audit_log;
CREATE POLICY "Usuarios activos pueden ver auditoria" ON public.audit_log
  FOR SELECT USING (public.is_active());

DROP POLICY IF EXISTS "Usuarios activos pueden crear logs" ON public.audit_log;
CREATE POLICY "Usuarios activos pueden crear logs" ON public.audit_log
  FOR INSERT WITH CHECK (public.is_active());

-- =============================================================
-- 7. TABLA: ventas (Registro de ventas)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo INTEGER,
  nombre_comprador TEXT NOT NULL,
  prendas_vendidas TEXT NOT NULL,                      -- Descripcion de prendas vendidas
  precio_venta NUMERIC(10,2) NOT NULL DEFAULT 0,
  fecha_venta DATE NOT NULL DEFAULT CURRENT_DATE,
  registrado_por UUID REFERENCES public.profiles(id),
  registrado_por_nombre TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios activos pueden ver ventas" ON public.ventas;
CREATE POLICY "Usuarios activos pueden ver ventas" ON public.ventas
  FOR SELECT USING (public.is_active());

DROP POLICY IF EXISTS "Usuarios activos pueden crear ventas" ON public.ventas;
CREATE POLICY "Usuarios activos pueden crear ventas" ON public.ventas
  FOR INSERT WITH CHECK (public.is_active());

DROP POLICY IF EXISTS "Admins pueden actualizar ventas" ON public.ventas;
CREATE POLICY "Admins pueden actualizar ventas" ON public.ventas
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Admins pueden eliminar ventas" ON public.ventas;
CREATE POLICY "Admins pueden eliminar ventas" ON public.ventas
  FOR DELETE USING (public.is_admin());

DROP TRIGGER IF EXISTS ventas_codigo ON public.ventas;
CREATE TRIGGER ventas_codigo
  BEFORE INSERT ON public.ventas
  FOR EACH ROW EXECUTE FUNCTION public.generar_codigo_venta();

-- =============================================================
-- 8. TABLA: chat_mensajes (Chat del equipo)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.chat_mensajes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES public.profiles(id),
  usuario_nombre TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.chat_mensajes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios activos pueden ver mensajes" ON public.chat_mensajes;
CREATE POLICY "Usuarios activos pueden ver mensajes" ON public.chat_mensajes
  FOR SELECT USING (public.is_active());

DROP POLICY IF EXISTS "Usuarios activos pueden enviar mensajes" ON public.chat_mensajes;
CREATE POLICY "Usuarios activos pueden enviar mensajes" ON public.chat_mensajes
  FOR INSERT WITH CHECK (public.is_active());

-- =============================================================
-- 9. TABLA: presencia (Estado online de usuarios)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.presencia (
  id UUID PRIMARY KEY REFERENCES public.profiles(id),
  en_linea BOOLEAN DEFAULT false,
  ultima_conexion TIMESTAMPTZ,
  ultima_actividad TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.presencia ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios activos pueden ver presencia" ON public.presencia;
CREATE POLICY "Usuarios activos pueden ver presencia" ON public.presencia
  FOR SELECT USING (public.is_active());

DROP POLICY IF EXISTS "Usuarios pueden actualizar su presencia" ON public.presencia;
CREATE POLICY "Usuarios pueden actualizar su presencia" ON public.presencia
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Usuarios pueden upsert su presencia" ON public.presencia;
CREATE POLICY "Usuarios pueden upsert su presencia" ON public.presencia
  FOR UPDATE USING (auth.uid() = id);

-- =============================================================
-- 10. TRIGGER PARA CREAR PERFIL AL REGISTRAR USUARIO
-- =============================================================

-- Esta funcion se ejecuta automaticamente cuando un usuario
-- se registra via Supabase Auth. Crea su perfil en profiles.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nombre, role, activo)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'worker'),
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================
-- 11. DATOS INICIALES (OPCIONAL)
-- =============================================================

-- Descomenta las siguientes lineas si necesitas crear un usuario admin inicial.
-- Primero crea el usuario en Supabase Auth (Dashboard > Authentication > Users > Add user)
-- Luego actualiza su perfil:

-- UPDATE public.profiles
-- SET role = 'admin', nombre = 'Administrador'
-- WHERE email = 'tu-email@ejemplo.com';

-- =============================================================
-- FIN DEL SCHEMA
-- =============================================================
-- Para verificar que todo se creo correctamente:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
