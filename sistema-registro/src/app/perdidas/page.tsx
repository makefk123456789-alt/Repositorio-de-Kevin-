'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import ProtectedLayout from '@/components/ProtectedLayout'
import { Alquiler } from '@/lib/types'
import toast from 'react-hot-toast'
import { FiAlertTriangle, FiRotateCcw } from 'react-icons/fi'

export default function PerdidasPage() {
  const { profile, isAdmin } = useAuth()
  const [perdidas, setPerdidas] = useState<Alquiler[]>([])
  const [loading, setLoading] = useState(true)

  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey(k => k + 1)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('alquileres')
        .select('*')
        .eq('perdida', true)
        .order('perdida_fecha', { ascending: false })
      if (data) setPerdidas(data)
      setLoading(false)
    }
    load()
  }, [reloadKey])

  const restaurarAlquiler = async (alquiler: Alquiler) => {
    if (!profile || !isAdmin) return
    const { error } = await supabase
      .from('alquileres')
      .update({
        estado: 'pendiente',
        perdida: false,
        perdida_por: null,
        perdida_fecha: null,
      })
      .eq('id', alquiler.id)

    if (error) {
      toast.error('Error al restaurar')
      return
    }

    await supabase.from('audit_log').insert({
      usuario_id: profile.id,
      usuario_nombre: profile.nombre,
      accion: 'restaurar_perdida',
      detalle: `Restaurado de perdida: ${alquiler.nombre_cliente} - ${alquiler.danza}`,
      alquiler_id: alquiler.id,
    })

    toast.success('Alquiler restaurado al historial')
    reload()
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiAlertTriangle className="text-red-600" /> Perdidas de Prendas
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Alquileres marcados como perdida (nunca devolvieron)
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-guindo-700 border-t-transparent" />
          </div>
        ) : perdidas.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-400">
            No hay alquileres marcados como perdida
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-red-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Cliente</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Tipo</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Danza</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Prendas</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Fecha Perdida</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Precio</th>
                    {isAdmin && (
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">Acciones</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {perdidas.map(a => (
                    <tr key={a.id} className="hover:bg-red-50/50">
                      <td className="px-4 py-3 text-gray-500">{a.codigo}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{a.nombre_cliente}</div>
                        <div className="text-xs text-gray-400">{a.celular}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          a.tipo === 'individual' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}>{a.tipo}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{a.danza}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {a.prendas.map(p => `${p.nombre} (${p.cantidad})`).join(', ') || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {a.perdida_fecha ? new Date(a.perdida_fecha).toLocaleString('es-BO') : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">Bs. {a.precio_total}</td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => restaurarAlquiler(a)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 flex items-center gap-1 mx-auto"
                          >
                            <FiRotateCcw size={14} /> Restaurar
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </ProtectedLayout>
  )
}
