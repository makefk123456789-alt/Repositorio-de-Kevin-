'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import ProtectedLayout from '@/components/ProtectedLayout'
import { AuditLog } from '@/lib/types'
import { FiActivity } from 'react-icons/fi'

export default function HistorialPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroAccion, setFiltroAccion] = useState('todos')

  useEffect(() => {
    const loadLogs = async () => {
      const { data } = await supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)
      if (data) setLogs(data)
      setLoading(false)
    }
    loadLogs()
  }, [])

  const acciones = ['todos', ...new Set(logs.map(l => l.accion))]

  const filtered = filtroAccion === 'todos'
    ? logs
    : logs.filter(l => l.accion === filtroAccion)

  const getAccionColor = (accion: string) => {
    switch (accion) {
      case 'registro': return 'bg-blue-100 text-blue-700'
      case 'devolucion': return 'bg-green-100 text-green-700'
      case 'perdida': return 'bg-red-100 text-red-700'
      case 'restaurar_perdida': return 'bg-yellow-100 text-yellow-700'
      case 'venta': return 'bg-purple-100 text-purple-700'
      case 'eliminar_venta': return 'bg-red-100 text-red-700'
      case 'agregar_integrante': return 'bg-indigo-100 text-indigo-700'
      case 'aprobar_edicion': return 'bg-green-100 text-green-700'
      case 'rechazar_edicion': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiActivity className="text-guindo-700" /> Historial de Operaciones
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Registro completo de todas las actividades del sistema
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {acciones.map(a => (
            <button
              key={a}
              onClick={() => setFiltroAccion(a)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filtroAccion === a
                  ? 'bg-guindo-700 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {a === 'todos' ? 'Todas' : a}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-guindo-700 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-400">
            No hay registros de actividad
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(log => (
              <div key={log.id} className="bg-white rounded-xl p-4 shadow-sm flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAccionColor(log.accion)}`}>
                    {log.accion}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{log.detalle || log.accion}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {log.usuario_nombre} &middot; {new Date(log.created_at).toLocaleString('es-BO')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedLayout>
  )
}
