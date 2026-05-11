'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import ProtectedLayout from '@/components/ProtectedLayout'
import { Profile, AuditLog, SolicitudEdicion } from '@/lib/types'
import toast from 'react-hot-toast'
import { FiUsers, FiClipboard, FiAlertCircle } from 'react-icons/fi'

export default function AdminPage() {
  const { isAdmin } = useAuth()
  const [tab, setTab] = useState<'usuarios' | 'auditoria' | 'solicitudes'>('usuarios')
  const [users, setUsers] = useState<Profile[]>([])
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [solicitudes, setSolicitudes] = useState<SolicitudEdicion[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchKey, setFetchKey] = useState(0)

  useEffect(() => {
    let active = true
    const query = tab === 'usuarios'
      ? supabase.from('profiles').select('*').order('created_at', { ascending: false })
      : tab === 'auditoria'
        ? supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(100)
        : supabase.from('solicitudes_edicion').select('*').order('created_at', { ascending: false })

    query.then(({ data }) => {
      if (!active) return
      if (tab === 'usuarios' && data) setUsers(data as Profile[])
      else if (tab === 'auditoria' && data) setLogs(data as AuditLog[])
      else if (data) setSolicitudes(data as SolicitudEdicion[])
      setLoading(false)
    })
    return () => { active = false }
  }, [tab, fetchKey])

  const reloadData = () => {
    setLoading(true)
    setFetchKey(k => k + 1)
  }

  const toggleUserStatus = async (user: Profile) => {
    const { error } = await supabase
      .from('profiles')
      .update({ activo: !user.activo })
      .eq('id', user.id)
    if (error) toast.error('Error al actualizar')
    else {
      toast.success(user.activo ? 'Usuario desactivado' : 'Usuario activado')
      reloadData()
    }
  }

  if (!isAdmin) {
    return (
      <ProtectedLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">No tienes permisos de administrador</p>
        </div>
      </ProtectedLayout>
    )
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Administracion</h1>

        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { key: 'usuarios', label: 'Usuarios', icon: FiUsers },
            { key: 'auditoria', label: 'Auditoria', icon: FiClipboard },
            { key: 'solicitudes', label: 'Solicitudes', icon: FiAlertCircle },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as typeof tab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === t.key
                  ? 'bg-guindo-700 text-white shadow-lg'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <t.icon size={16} />
              {t.label}
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
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            u.role === 'admin' ? 'bg-guindo-100 text-guindo-700' : 'bg-gray-100 text-gray-600'
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
                      </tr>
                    ))}
                    {solicitudes.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
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
