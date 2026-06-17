'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import ProtectedLayout from '@/components/ProtectedLayout'
import { Alquiler, IntegranteGrupo } from '@/lib/types'
import { FiUsers, FiLayers, FiDollarSign, FiCreditCard, FiPackage, FiSearch, FiAlertCircle, FiClock, FiCheckCircle } from 'react-icons/fi'
import Link from 'next/link'

interface DashboardStats {
  totalPendientes: number
  totalDevueltos: number
  totalVencidos: number
  ingresosMes: number
  personasIndividuales: number
  gruposTotales: number
  integrantesGrupos: number
  garantiasQrDevolver: number
  garantiasEfectivoDevolver: number
  garantiasCiDevolver: number
  garantiasPrendaDevolver: number
}

export default function DashboardPage() {
  const { profile } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalPendientes: 0, totalDevueltos: 0, totalVencidos: 0,
    ingresosMes: 0, personasIndividuales: 0,
    gruposTotales: 0, integrantesGrupos: 0,
    garantiasQrDevolver: 0, garantiasEfectivoDevolver: 0,
    garantiasCiDevolver: 0, garantiasPrendaDevolver: 0,
  })
  const [recentAlquileres, setRecentAlquileres] = useState<Alquiler[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAlquiler, setSelectedAlquiler] = useState<Alquiler | null>(null)
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([
      supabase.from('alquileres').select('*').order('created_at', { ascending: false }),
      supabase.from('integrantes_grupo').select('*'),
    ]).then(([{ data: alquileres }, { data: integrantes }]) => {
      if (!active || !alquileres) return

      const pendientes = alquileres.filter((a: Alquiler) => a.estado === 'pendiente')
      const devueltos = alquileres.filter((a: Alquiler) => a.estado === 'devuelto')
      const vencidos = pendientes.filter((a: Alquiler) => new Date(a.fecha_devolucion) < new Date())

      const now = new Date()
      const mesActual = alquileres.filter((a: Alquiler) => {
        const fecha = new Date(a.fecha_alquiler)
        return fecha.getMonth() === now.getMonth() && fecha.getFullYear() === now.getFullYear()
      })

      const individuales = pendientes.filter((a: Alquiler) => a.tipo === 'individual')
      const grupos = pendientes.filter((a: Alquiler) => a.tipo === 'grupal')
      const grupoIds = grupos.map((g: Alquiler) => g.id)
      const integrantesGrupos = integrantes
        ? integrantes.filter((i: IntegranteGrupo) => grupoIds.includes(i.alquiler_id))
        : []

      setStats({
        totalPendientes: pendientes.length,
        totalDevueltos: devueltos.length,
        totalVencidos: vencidos.length,
        ingresosMes: mesActual.reduce((sum: number, a: Alquiler) => sum + a.precio_total, 0),
        personasIndividuales: individuales.length,
        gruposTotales: grupos.length,
        integrantesGrupos: integrantesGrupos.length,
        garantiasQrDevolver: pendientes.filter((a: Alquiler) => a.tipo_garantia.includes('qr')).length,
        garantiasEfectivoDevolver: pendientes.filter((a: Alquiler) => a.tipo_garantia.includes('efectivo')).length,
        garantiasCiDevolver: pendientes.filter((a: Alquiler) => a.tipo_garantia.includes('ci')).length,
        garantiasPrendaDevolver: pendientes.filter((a: Alquiler) => a.tipo_garantia.includes('prenda')).length,
      })

      setRecentAlquileres(alquileres.slice(0, 15))
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  const isOverdue = (a: Alquiler) => {
    if (a.estado !== 'pendiente') return false
    return new Date(a.fecha_devolucion) < new Date()
  }

  const getRowColor = (a: Alquiler) => {
    if (a.estado === 'devuelto') return 'bg-orange-50 border-l-4 border-l-orange-400'
    if (a.estado === 'perdida') return 'bg-red-50 border-l-4 border-l-red-400'
    if (isOverdue(a)) return 'bg-red-50 border-l-4 border-l-red-400'
    return 'bg-white border-l-4 border-l-transparent'
  }

  const totalAlquileres = stats.totalPendientes + stats.totalDevueltos
  const progDevueltos = totalAlquileres > 0 ? (stats.totalDevueltos / totalAlquileres) * 100 : 0
  const progVencidos = totalAlquileres > 0 ? (stats.totalVencidos / totalAlquileres) * 100 : 0

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bienvenido, {profile?.nombre}
          </h1>
          <p className="text-gray-500 text-sm mt-1">Panel principal — Creaciones Angy</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-guindo-700 border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Alerta de vencidos */}
            {stats.totalVencidos > 0 && (
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                  <FiAlertCircle className="text-red-600" size={24} />
                </div>
                <div>
                  <p className="font-bold text-red-800 text-lg">{stats.totalVencidos} alquiler(es) vencido(s)</p>
                  <p className="text-red-600 text-sm">Hay clientes que no devolvieron y ya paso la fecha limite</p>
                </div>
                <Link href="/alquileres" className="ml-auto bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-700 shrink-0">
                  Ver ahora
                </Link>
              </div>
            )}

            {/* Resumen rapido — 4 tarjetas */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-100 p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <FiClock className="text-blue-600" size={20} />
                  </div>
                  <span className="text-sm font-medium text-gray-500">Activos</span>
                </div>
                <p className="text-3xl font-black text-gray-900">{stats.totalPendientes}</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border-2 border-orange-200 p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                    <FiCheckCircle className="text-orange-600" size={20} />
                  </div>
                  <span className="text-sm font-medium text-gray-500">Devueltos</span>
                </div>
                <p className="text-3xl font-black text-gray-900">{stats.totalDevueltos}</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border-2 border-red-200 p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                    <FiAlertCircle className="text-red-600" size={20} />
                  </div>
                  <span className="text-sm font-medium text-gray-500">Vencidos</span>
                </div>
                <p className="text-3xl font-black text-red-600">{stats.totalVencidos}</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border-2 border-green-200 p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <FiDollarSign className="text-green-600" size={20} />
                  </div>
                  <span className="text-sm font-medium text-gray-500">Ingresos del mes</span>
                </div>
                <p className="text-2xl font-black text-gray-900">Bs. {stats.ingresosMes.toFixed(0)}</p>
              </div>
            </div>

            {/* Barra de progreso visual */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-base font-bold text-gray-800 mb-4">Progreso de Devoluciones</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Devueltos</span>
                  <span className="font-bold text-orange-600">{stats.totalDevueltos} de {totalAlquileres}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-5 overflow-hidden">
                  <div className="h-5 bg-orange-400 rounded-full transition-all flex items-center justify-center"
                    style={{ width: `${Math.max(progDevueltos, 2)}%` }}>
                    {progDevueltos > 10 && <span className="text-white text-xs font-bold">{progDevueltos.toFixed(0)}%</span>}
                  </div>
                </div>
                {stats.totalVencidos > 0 && (
                  <>
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="text-red-500 font-medium">Vencidos sin devolver</span>
                      <span className="font-bold text-red-600">{stats.totalVencidos}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div className="h-3 bg-red-400 rounded-full transition-all"
                        style={{ width: `${Math.max(progVencidos, 2)}%` }} />
                    </div>
                  </>
                )}
              </div>
              <div className="mt-4 flex gap-4 text-xs">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-white border border-gray-300" /> Activo (a tiempo)</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-orange-300" /> Devuelto</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-red-300" /> Vencido</div>
              </div>
            </div>

            {/* Contadores */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 text-center">
                <FiUsers className="text-blue-600 mx-auto mb-2" size={24} />
                <p className="text-3xl font-black text-blue-700">{stats.personasIndividuales}</p>
                <p className="text-xs font-semibold text-blue-600 mt-1">Individuales activos</p>
              </div>
              <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-5 text-center">
                <FiLayers className="text-purple-600 mx-auto mb-2" size={24} />
                <p className="text-3xl font-black text-purple-700">{stats.gruposTotales}</p>
                <p className="text-xs font-semibold text-purple-600 mt-1">Grupos activos</p>
              </div>
              <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-5 text-center">
                <FiUsers className="text-purple-600 mx-auto mb-2" size={24} />
                <p className="text-3xl font-black text-purple-700">{stats.integrantesGrupos}</p>
                <p className="text-xs font-semibold text-purple-600 mt-1">Integrantes en grupos</p>
              </div>
              <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-5 text-center">
                <FiUsers className="text-indigo-600 mx-auto mb-2" size={24} />
                <p className="text-3xl font-black text-indigo-700">{stats.personasIndividuales + stats.integrantesGrupos}</p>
                <p className="text-xs font-semibold text-indigo-600 mt-1">Total personas</p>
              </div>
            </div>

            {/* Garantias */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-cyan-50 border-2 border-cyan-200 rounded-2xl p-4 text-center">
                <FiCreditCard className="text-cyan-600 mx-auto mb-1" size={20} />
                <p className="text-2xl font-black text-cyan-700">{stats.garantiasQrDevolver}</p>
                <p className="text-xs font-semibold text-cyan-600">Garantias QR</p>
              </div>
              <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 text-center">
                <FiDollarSign className="text-green-600 mx-auto mb-1" size={20} />
                <p className="text-2xl font-black text-green-700">{stats.garantiasEfectivoDevolver}</p>
                <p className="text-xs font-semibold text-green-600">Garantias Efectivo</p>
              </div>
              <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 text-center">
                <FiCreditCard className="text-amber-600 mx-auto mb-1" size={20} />
                <p className="text-2xl font-black text-amber-700">{stats.garantiasCiDevolver}</p>
                <p className="text-xs font-semibold text-amber-600">Garantias CI</p>
              </div>
              <div className="bg-pink-50 border-2 border-pink-200 rounded-2xl p-4 text-center">
                <FiPackage className="text-pink-600 mx-auto mb-1" size={20} />
                <p className="text-2xl font-black text-pink-700">{stats.garantiasPrendaDevolver}</p>
                <p className="text-xs font-semibold text-pink-600">Garantias Prenda</p>
              </div>
            </div>

            {/* Ultimos registros */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <h2 className="text-lg font-bold text-gray-800">Ultimos Registros</h2>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input
                      className="input-field pl-8 !w-48 text-sm"
                      placeholder="Buscar cliente..."
                      value={busqueda}
                      onChange={e => setBusqueda(e.target.value)}
                    />
                  </div>
                  <Link href="/alquileres" className="text-sm text-guindo-700 hover:underline font-medium">
                    Ver todos →
                  </Link>
                </div>
              </div>

              {/* Leyenda de colores */}
              <div className="flex flex-wrap gap-4 text-xs mb-3 bg-gray-50 rounded-xl px-4 py-2">
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-white border border-gray-200" /> Activo (a tiempo)</div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-orange-100 border border-orange-300" /> Ya devolvio</div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-red-100 border border-red-300" /> Vencido (no devolvio)</div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Cliente</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Tipo</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Danza</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Devolucion</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Estado</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-600">Precio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {recentAlquileres.filter(a =>
                        !busqueda ||
                        a.nombre_cliente.toLowerCase().includes(busqueda.toLowerCase()) ||
                        a.danza.toLowerCase().includes(busqueda.toLowerCase()) ||
                        a.codigo?.toString().includes(busqueda)
                      ).map(a => (
                        <tr
                          key={a.id}
                          className={`cursor-pointer hover:brightness-95 transition-all ${getRowColor(a)}`}
                          onClick={() => setSelectedAlquiler(a)}
                        >
                          <td className="px-4 py-3 text-gray-500 font-mono text-xs">{a.codigo}</td>
                          <td className="px-4 py-3 font-medium text-gray-800">{a.nombre_cliente}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              a.tipo === 'individual' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                            }`}>
                              {a.tipo === 'individual' ? 'Individual' : 'Grupal'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{a.danza}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {a.fecha_devolucion ? new Date(a.fecha_devolucion).toLocaleDateString('es-BO') : '-'}
                          </td>
                          <td className="px-4 py-3">
                            {a.estado === 'devuelto' ? (
                              <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-200 text-orange-800">Devuelto</span>
                            ) : a.estado === 'perdida' ? (
                              <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-200 text-red-800">Perdida</span>
                            ) : isOverdue(a) ? (
                              <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-200 text-red-800 animate-pulse">Vencido</span>
                            ) : (
                              <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">Activo</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-gray-800">Bs. {a.precio_total}</td>
                        </tr>
                      ))}
                      {recentAlquileres.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                            No hay registros aun
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Detail modal */}
        {selectedAlquiler && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Alquiler #{selectedAlquiler.codigo}</h2>
                <button onClick={() => setSelectedAlquiler(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
              </div>
              <div className="space-y-3 text-sm">
                <DetailRow label="Cliente" value={selectedAlquiler.nombre_cliente} />
                <DetailRow label="Celular" value={selectedAlquiler.celular} />
                <DetailRow label="CI" value={selectedAlquiler.ci || '-'} />
                <DetailRow label="Tipo" value={selectedAlquiler.tipo === 'individual' ? 'Individual' : 'Grupal'} />
                {selectedAlquiler.nombre_grupo && <DetailRow label="Grupo" value={selectedAlquiler.nombre_grupo} />}
                <DetailRow label="Danza" value={selectedAlquiler.danza} />
                <DetailRow label="Prendas" value={selectedAlquiler.prendas.map(p => `${p.nombre} (${p.cantidad})`).join(', ')} />
                <DetailRow label="Garantia" value={`${selectedAlquiler.garantia} (${selectedAlquiler.tipo_garantia})`} />
                <DetailRow label="Pago" value={selectedAlquiler.metodo_pago} />
                <DetailRow label="Precio" value={`Bs. ${selectedAlquiler.precio_total}`} />
                <DetailRow label="Fecha alquiler" value={new Date(selectedAlquiler.fecha_alquiler).toLocaleString('es-BO')} />
                <DetailRow label="Devolucion" value={new Date(selectedAlquiler.fecha_devolucion).toLocaleDateString('es-BO')} />
                <DetailRow label="Estado" value={
                  selectedAlquiler.estado === 'devuelto' ? 'Devuelto' :
                  selectedAlquiler.estado === 'perdida' ? 'Perdida' :
                  isOverdue(selectedAlquiler) ? 'Vencido' : 'Activo'
                } />
                <DetailRow label="Registrado por" value={selectedAlquiler.registrado_por_nombre} />
                {selectedAlquiler.notas && <DetailRow label="Notas" value={selectedAlquiler.notas} />}
              </div>
              <div className="mt-4 flex gap-2">
                <Link
                  href={`/alquileres`}
                  className="btn-primary flex-1 text-center text-sm"
                >
                  Ver en Alquileres
                </Link>
                <button onClick={() => setSelectedAlquiler(null)} className="flex-1 py-2 px-4 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedLayout>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-100">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900 text-right">{value}</span>
    </div>
  )
}
