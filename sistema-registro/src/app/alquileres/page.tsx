'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import ProtectedLayout from '@/components/ProtectedLayout'
import { Alquiler } from '@/lib/types'
import toast from 'react-hot-toast'
import { FiSearch, FiCheck, FiEye, FiX } from 'react-icons/fi'

export default function AlquileresPage() {
  const { profile } = useAuth()
  const [alquileres, setAlquileres] = useState<Alquiler[]>([])
  const [filtro, setFiltro] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('todos')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Alquiler | null>(null)

  useEffect(() => {
    let active = true
    supabase
      .from('alquileres')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (active && data) setAlquileres(data)
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const reloadAlquileres = async () => {
    const { data } = await supabase
      .from('alquileres')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setAlquileres(data)
  }

  const marcarDevuelto = async (alquiler: Alquiler) => {
    if (!profile) return
    const { error } = await supabase
      .from('alquileres')
      .update({
        estado: 'devuelto',
        fecha_devuelto: new Date().toISOString(),
        devuelto_por: profile.id,
        devuelto_por_nombre: profile.nombre,
      })
      .eq('id', alquiler.id)

    if (error) {
      toast.error('Error al actualizar')
      return
    }

    await supabase.from('audit_log').insert({
      usuario_id: profile.id,
      usuario_nombre: profile.nombre,
      accion: 'devolucion',
      detalle: `Devolucion: ${alquiler.nombre_cliente} - ${alquiler.danza}`,
      alquiler_id: alquiler.id,
    })

    toast.success('Marcado como devuelto')
    setSelected(null)
    reloadAlquileres()
  }

  const filtered = alquileres.filter(a => {
    const matchText = !filtro ||
      a.nombre_cliente.toLowerCase().includes(filtro.toLowerCase()) ||
      a.danza.toLowerCase().includes(filtro.toLowerCase()) ||
      a.codigo.toString().includes(filtro)
    const matchEstado = estadoFiltro === 'todos' || a.estado === estadoFiltro
    return matchText && matchEstado
  })

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Alquileres</h1>
            <p className="text-gray-500 text-sm mt-1">{filtered.length} registros</p>
          </div>

          <div className="flex gap-3">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                className="input-field pl-9 !w-56"
                placeholder="Buscar..."
                value={filtro}
                onChange={e => setFiltro(e.target.value)}
              />
            </div>
            <select
              className="input-field !w-40"
              value={estadoFiltro}
              onChange={e => setEstadoFiltro(e.target.value)}
            >
              <option value="todos">Todos</option>
              <option value="pendiente">Pendientes</option>
              <option value="devuelto">Devueltos</option>
              <option value="vencido">Vencidos</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-guindo-700 border-t-transparent" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Cliente</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Tipo</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Danza</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Garantia</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Devolucion</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Estado</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Precio</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map(a => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500">{a.codigo}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{a.nombre_cliente}</div>
                        <div className="text-xs text-gray-400">{a.celular}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          a.tipo === 'individual' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {a.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{a.danza}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{a.garantia}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {a.fecha_devolucion ? new Date(a.fecha_devolucion).toLocaleDateString('es-BO') : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          a.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-700' :
                          a.estado === 'devuelto' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {a.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">Bs. {a.precio_total}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSelected(a)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                            title="Ver detalle"
                          >
                            <FiEye size={16} />
                          </button>
                          {a.estado === 'pendiente' && (
                            <button
                              onClick={() => marcarDevuelto(a)}
                              className="p-1.5 rounded-lg hover:bg-green-100 text-green-600"
                              title="Marcar devuelto"
                            >
                              <FiCheck size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                        No se encontraron alquileres
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal detalle */}
        {selected && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Detalle Alquiler #{selected.codigo}</h2>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                  <FiX size={20} />
                </button>
              </div>
              <div className="space-y-3 text-sm">
                <Detail label="Cliente" value={selected.nombre_cliente} />
                <Detail label="Celular" value={selected.celular} />
                <Detail label="CI" value={selected.ci || '-'} />
                <Detail label="Tipo" value={selected.tipo} />
                {selected.nombre_grupo && <Detail label="Grupo" value={selected.nombre_grupo} />}
                {selected.responsable_grupo && <Detail label="Responsable" value={selected.responsable_grupo} />}
                <Detail label="Danza" value={selected.danza} />
                <Detail label="Prendas" value={selected.prendas.map(p => `${p.nombre} (${p.cantidad})`).join(', ')} />
                <Detail label="Garantia" value={`${selected.garantia} (${selected.tipo_garantia})`} />
                <Detail label="Metodo de pago" value={selected.metodo_pago} />
                <Detail label="Precio" value={`Bs. ${selected.precio_total}`} />
                <Detail label="Fecha alquiler" value={new Date(selected.fecha_alquiler).toLocaleString('es-BO')} />
                <Detail label="Fecha devolucion" value={new Date(selected.fecha_devolucion).toLocaleDateString('es-BO')} />
                <Detail label="Estado" value={selected.estado} />
                <Detail label="Registrado por" value={selected.registrado_por_nombre} />
                {selected.notas && <Detail label="Notas" value={selected.notas} />}
              </div>
              {selected.estado === 'pendiente' && (
                <button
                  onClick={() => marcarDevuelto(selected)}
                  className="btn-primary w-full mt-6"
                >
                  Marcar como Devuelto
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </ProtectedLayout>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-100">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900 text-right">{value}</span>
    </div>
  )
}
