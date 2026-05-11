export interface Profile {
  id: string
  email: string
  nombre: string
  role: 'admin' | 'worker'
  activo: boolean
  created_at: string
  updated_at: string
  contrasena_visible: string | null
}

export interface Prenda {
  nombre: string
  cantidad: number
}

export interface Alquiler {
  id: string
  tipo: 'individual' | 'grupal'
  nombre_cliente: string
  celular: string
  ci: string | null
  garantia: string
  tipo_garantia: 'ci_efectivo' | 'ci_prenda' | 'ci_qr' | 'efectivo' | 'qr' | 'prenda'
  danza: string
  prendas: Prenda[]
  cantidad_prendas: number
  precio_total: number
  metodo_pago: 'efectivo' | 'qr' | 'mixto'
  fecha_alquiler: string
  fecha_devolucion: string
  estado: 'pendiente' | 'devuelto' | 'vencido' | 'perdida'
  fecha_devuelto: string | null
  recargo: number
  dias_retraso: number
  nombre_grupo: string | null
  responsable_grupo: string | null
  notas: string | null
  registrado_por: string
  registrado_por_nombre: string
  devuelto_por: string | null
  devuelto_por_nombre: string | null
  created_at: string
  updated_at: string
  codigo: number
  perdida: boolean
  perdida_por: string | null
  perdida_fecha: string | null
}

export interface IntegranteGrupo {
  id: string
  alquiler_id: string
  numero: number
  nombre: string
  garantia: string | null
  metodo_pago: string
  prendas: Prenda[]
  monto: number
  notas: string | null
  created_at: string
}

export interface Venta {
  id: string
  codigo: number
  nombre_comprador: string
  prendas_vendidas: string
  precio_venta: number
  fecha_venta: string
  registrado_por: string
  registrado_por_nombre: string
  created_at: string
}

export interface AuditLog {
  id: string
  usuario_id: string
  usuario_nombre: string
  accion: string
  detalle: string
  alquiler_id: string | null
  created_at: string
}

export interface ChatMensaje {
  id: string
  usuario_id: string
  usuario_nombre: string
  mensaje: string
  created_at: string
}

export interface SolicitudEdicion {
  id: string
  alquiler_id: string | null
  venta_id: string | null
  tipo: string
  solicitante_id: string
  solicitante_nombre: string
  motivo: string
  estado: 'pendiente' | 'aprobada' | 'rechazada'
  aprobado_por: string | null
  aprobado_por_nombre: string | null
  aprobada_usada: boolean
  created_at: string
  updated_at: string
}

export interface Presencia {
  id: string
  en_linea: boolean
  ultima_conexion: string
  ultima_actividad: string | null
}
