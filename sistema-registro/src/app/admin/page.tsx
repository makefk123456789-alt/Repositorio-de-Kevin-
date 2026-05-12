'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import ProtectedLayout from '@/components/ProtectedLayout'
import { Profile, AuditLog, SolicitudEdicion } from '@/lib/types'
import toast from 'react-hot-toast'
import { FiEye, FiEyeOff, FiCheck, FiX } from 'react-icons/fi'

export default function AdminPage() {
  const { profile, isAdmin } = useAuth()
  const [tab, setTab] = useState<'usuarios' | 'auditoria' | 'solicitudes'>('usuarios')
  const [users, setUsers] = useState<Profile[]>([])
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [solicitudes, setSolicitudes] = useState<SolicitudEdicion[]>([])
  const [loading, setLoading] = useState(true)
  const [passwordVisible, setPasswordVisible] = useState<Record<string, boolean>>({})

  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey(k => k + 1)

  useEffect(() => {
    if (!isAdmin) return
    const loadData = async () => {
      const [usersRes, logsRes, solicitudesRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('solicitudes_edicion').select('*').order('created_at', { ascending: false }),
      ])
      if (usersRes.data) setUsers(usersRes.data)
      if (logsRes.data) setLogs(logsRes.data)
      if (solicitudesRes.data) setSolicitudes(solicitudesRes.data)
      setLoading(false)
    }
    loadData()
  }, [isAdmin, reloadKey])

  const toggleUserStatus = async (user: Profile) => {
    if (!profile) return
    const { error } = await supabase
      .from('profiles')
      .update({ activo: !user.activo })
      .eq('id', user.id)

    if (error) {
      toast.error('Error al actualizar')
      return
    }

    await supabase.from('audit_log').insert({
      usuario_id: profile.id,
      usuario_nombre: profile.nombre,
      accion: user.activo ? 'desactivar_usuario' : 'activar_usuario',
      detalle: `Usuario ${user.nombre} ${user.activo ? 'desactivado' : 'activado'}`,
    })

    toast.success(`Usuario ${user.activo ? 'desactivado' : 'activado'}`)
    reload()
  }

  const togglePasswordVisibility = (userId: string) => {
    setPasswordVisible(prev => ({ ...prev, [userId]: !prev[userId] }))
  }

  const aprobarSolicitud = async (solicitud: SolicitudEdicion) => {
    if (!profile) return
    const { error } = await supabase
      .from('solicitudes_edicion')
      .update({
        estado: 'aprobada',
        aprobado_por: profile.id,
        aprobado_por_nombre: profile.nombre,
      })
      .eq('id', solicitud.id)

    if (error) {
      toast.error('Error al aprobar')
      return
    }

    await supabase.from('audit_log').insert({
      usuario_id: profile.id,
      usuario_nombre: profile.nombre,
      accion: 'aprobar_edicion',
      detalle: `Solicitud aprobada de ${solicitud.solicitante_nombre}: ${solicitud.motivo}`,
      alquiler_id: solicitud.alquiler_id,
    })

    toast.success('Solicitud aprobada')
    reload()
  }

  const rechazarSolicitud = async (solicitud: SolicitudEdicion) => {
    if (!profile) return
    const { error } = await supabase
      .from('solicitudes_edicion')
      .update({
        estado: 'rechazada',
        aprobado_por: profile.id,
        aprobado_por_nombre: profile.nombre,
      })
      .eq('id', solicitud.id)

    if (error) {
      toast.error('Error al rechazar')
      return
    }

    await supabase.from('audit_log').insert({
      usuario_id: profile.id,
      usuario_nombre: profile.nombre,
      accion: 'rechazar_edicion',
      detalle: `Solicitud rechazada de ${solicitud.solicitante_nombre}: ${solicitud.motivo}`,
      alquiler_id: solicitud.alquiler_id,
    })

    toast.success('Solicitud rechazada')
    reload()
  }

  if (!isAdmin) {
    return (
      <ProtectedLayout>
        <div className="text-center py-12 text-gray-500">
          Acceso restringido. Solo administradores.
        </div>
      </ProtectedLayout>
    )
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Administracion</h1>
          <p className="text-gray-500 text-sm mt-1">Gestion de usuarios, auditoria y solicitudes</p>
        </div>

        <div className="flex gap-2">
          {(['usuarios', 'auditoria', 'solicitudes'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === t
                  ? 'bg-guindo-700 text-white shadow-lg'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {t === 'usuarios' ? 'Usuarios' : t === 'auditoria' ? 'Auditoria' : 'Solicitudes'}
              {t === 'solicitudes' && solicitudes.filter(s => s.estado === 'pendiente').length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {solicitudes.filter(s => s.estado === 'pendiente').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-guindo-700 border-t-transparent" />
          </div>
        ) : (
          <>
            {tab === 'usuarios' && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Nombre</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Contrasena</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Rol</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Estado</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{u.nombre}</td>
                        <td className="px-4 py-3 text-gray-600">{u.email}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600 text-xs font-mono">
                              {passwordVisible[u.id]
                                ? (u.contrasena_visible || 'No guardada')
                                : '••••••••'}
                            </span>
                            <button
                              onClick={() => togglePasswordVisibility(u.id)}
                              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                              title={passwordVisible[u.id] ? 'Ocultar contrasena' : 'Ver contrasena'}
                            >
                              {passwordVisible[u.id] ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            u.role === 'admin' ? 'bg-guindo-100 text-guindo-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            u.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {u.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggleUserStatus(u)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium ${
                              u.activo
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {u.activo ? 'Desactivar' : 'Activar'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'auditoria' && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Fecha</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Usuario</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Accion</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {logs.map(l => (
                      <tr key={l.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {new Date(l.created_at).toLocaleString('es-BO')}
                        </td>
                        <td className="px-4 py-3 font-medium">{l.usuario_nombre}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-gray-100 rounded-full text-xs font-medium">
                            {l.accion}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{l.detalle}</td>
                      </tr>
                    ))}
                    {logs.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                          No hay registros de auditoria
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'solicitudes' && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Fecha</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Solicitante</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Tipo</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Motivo</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Estado</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {solicitudes.map(s => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {new Date(s.created_at).toLocaleString('es-BO')}
                        </td>
                        <td className="px-4 py-3 font-medium">{s.solicitante_nombre}</td>
                        <td className="px-4 py-3">{s.tipo}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{s.motivo}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            s.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-700' :
                            s.estado === 'aprobada' ? 'bg-green-100 text-green-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {s.estado}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {s.estado === 'pendiente' && (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => aprobarSolicitud(s)}
                                className="p-1.5 rounded-lg hover:bg-green-100 text-green-600"
                                title="Aprobar"
                              >
                                <FiCheck size={16} />
                              </button>
                              <button
                                onClick={() => rechazarSolicitud(s)}
                                className="p-1.5 rounded-lg hover:bg-red-100 text-red-600"
                                title="Rechazar"
                              >
                                <FiX size={16} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {solicitudes.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                          No hay solicitudes
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </ProtectedLayout>
  )
}
