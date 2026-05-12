'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import ProtectedLayout from '@/components/ProtectedLayout'
import { Alquiler, IntegranteGrupo } from '@/lib/types'
import { FiUsers, FiLayers, FiDollarSign, FiCreditCard, FiUserCheck, FiPackage } from 'react-icons/fi'
import Link from 'next/link'

interface DashboardStats {
  totalPendientes: number
  totalDevueltos: number
  totalVencidos: number
  ingresosMes: number
  alquileresIndividuales: number
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
    ingresosMes: 0, alquileresIndividuales: 0, personasIndividuales: 0,
    gruposTotales: 0, integrantesGrupos: 0,
    garantiasQrDevolver: 0, garantiasEfectivoDevolver: 0,
    garantiasCiDevolver: 0, garantiasPrendaDevolver: 0,
  })
  const [recentAlquileres, setRecentAlquileres] = useState<Alquiler[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAlquiler, setSelectedAlquiler] = useState<Alquiler | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([
      supabase.from('alquileres').select('*').order('created_at', { ascending: false }),
      supabase.from('integrantes_grupo').select('*'),
    ]).then(([{ data: alquileres }, { data: integrantes }]) => {
      if (!active || !alquileres) return

      const pendientes = alquileres.filter((a: Alquiler) => a.estado === 'pendiente')
      const devueltos = alquileres.filter((a: Alquiler) => a.estado === 'devuelto')
      const vencidos = alquileres.filter((a: Alquiler) => a.estado === 'vencido')

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

      const garantiasQr = pendientes.filter((a: Alquiler) =>
        a.tipo_garantia.includes('qr') || a.metodo_pago === 'qr'
      )
      const garantiasEfectivo = pendientes.filter((a: Alquiler) =>
        a.tipo_garantia.includes('efectivo')
      )

      setStats({
        totalPendientes: pendientes.length,
        totalDevueltos: devueltos.length,
        totalVencidos: vencidos.length,
        ingresosMes: mesActual.reduce((sum: number, a: Alquiler) => sum + a.precio_total, 0),
        alquileresIndividuales: individuales.length,
        personasIndividuales: individuales.length,
        gruposTotales: grupos.length,
        integrantesGrupos: integrantesGrupos.length,
        garantiasQrDevolver: garantiasQr.length,
        garantiasEfectivoDevolver: garantiasEfectivo.length,
        garantiasCiDevolver: pendientes.filter((a: Alquiler) => a.tipo_garantia.includes('ci')).length,
        garantiasPrendaDevolver: pendientes.filter((a: Alquiler) => a.tipo_garantia.includes('prenda')).length,
      })

      setRecentAlquileres(alquileres.slice(0, 10))
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  const isOverdue = (a: Alquiler) => {
    if (a.estado !== 'pendiente') return false
    return new Date(a.fecha_devolucion) < new Date()
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bienvenido, {profile?.nombre}
          </h1>
          <p className="text-gray-500 text-sm mt-1">Resumen del sistema de alquileres</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-guindo-700 border-t-transparent" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={<FiPackage className="text-yellow-600" size={22} />}
                label="Pendientes"
                value={stats.totalPendientes}
                color="bg-yellow-50 border-yellow-200"
              />
              <StatCard
                icon={<FiUserCheck className="text-green-600" size={22} />}
                label="Devueltos"
                value={stats.totalDevueltos}
                color="bg-green-50 border-green-200"
              />
              <StatCard
                icon={<FiPackage className="text-red-600" size={22} />}
                label="Vencidos"
                value={stats.totalVencidos}
                color="bg-red-50 border-red-200"
              />
              <StatCard
                icon={<FiDollarSign className="text-guindo-700" size={22} />}
                label="Ingresos del mes"
                value={`Bs. ${stats.ingresosMes.toFixed(2)}`}
                color="bg-guindo-50 border-guindo-200"
              />
            </div>

            {/* Contadores grandes y claros */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FiUsers className="text-guindo-700" /> Contador de Alquileres Activos
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-5 text-center">
                  <FiUsers className="text-blue-600 mx-auto mb-2" size={28} />
                  <p className="text-3xl font-black text-blue-700">{stats.personasIndividuales}</p>
                  <p className="text-sm font-semibold text-blue-600 mt-1">Personas Individuales</p>
                </div>
                <div className="bg-purple-50 border-2 border-purple-300 rounded-2xl p-5 text-center">
                  <FiLayers className="text-purple-600 mx-auto mb-2" size={28} />
                  <p className="text-3xl font-black text-purple-700">{stats.gruposTotales}</p>
                  <p className="text-sm font-semibold text-purple-600 mt-1">Grupos</p>
                </div>
                <div className="bg-purple-50 border-2 border-purple-300 rounded-2xl p-5 text-center">
                  <FiUsers className="text-purple-600 mx-auto mb-2" size={28} />
                  <p className="text-3xl font-black text-purple-700">{stats.integrantesGrupos}</p>
                  <p className="text-sm font-semibold text-purple-600 mt-1">Integrantes en Grupos</p>
                </div>
                <div className="bg-indigo-50 border-2 border-indigo-300 rounded-2xl p-5 text-center">
                  <FiUsers className="text-indigo-600 mx-auto mb-2" size={28} />
                  <p className="text-3xl font-black text-indigo-700">{stats.personasIndividuales + stats.integrantesGrupos}</p>
                  <p className="text-sm font-semibold text-indigo-600 mt-1">Total Personas</p>
                </div>
              </div>
            </div>

            {/* Garantias por devolver - grandes y claros */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FiCreditCard className="text-guindo-700" /> Garantias por Devolver
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-cyan-50 border-2 border-cyan-300 rounded-2xl p-5 text-center">
                  <FiCreditCard className="text-cyan-600 mx-auto mb-2" size={28} />
                  <p className="text-3xl font-black text-cyan-700">{stats.garantiasQrDevolver}</p>
                  <p className="text-sm font-semibold text-cyan-600 mt-1">Garantias QR a devolver</p>
                </div>
                <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-5 text-center">
                  <FiDollarSign className="text-green-600 mx-auto mb-2" size={28} />
                  <p className="text-3xl font-black text-green-700">{stats.garantiasEfectivoDevolver}</p>
                  <p className="text-sm font-semibold text-green-600 mt-1">Garantias Efectivo a devolver</p>
                </div>
                <div className="bg-orange-50 border-2 border-orange-300 rounded-2xl p-5 text-center">
                  <FiCreditCard className="text-orange-600 mx-auto mb-2" size={28} />
                  <p className="text-3xl font-black text-orange-700">{stats.garantiasCiDevolver}</p>
                  <p className="text-sm font-semibold text-orange-600 mt-1">Garantias CI a devolver</p>
                </div>
                <div className="bg-pink-50 border-2 border-pink-300 rounded-2xl p-5 text-center">
                  <FiPackage className="text-pink-600 mx-auto mb-2" size={28} />
                  <p className="text-3xl font-black text-pink-700">{stats.garantiasPrendaDevolver}</p>
                  <p className="text-sm font-semibold text-pink-600 mt-1">Garantias Prenda a devolver</p>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-800">Ultimos Registros</h2>
                <Link href="/alquileres" className="text-sm text-guindo-700 hover:underline font-medium">
                  Ver todos
                </Link>
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
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Estado</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-600">Precio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {recentAlquileres.map(a => (
                        <tr
                          key={a.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => setSelectedAlquiler(a)}
                        >
                          <td className="px-4 py-3 text-gray-500">{a.codigo}</td>
                          <td className="px-4 py-3 font-medium">{a.nombre_cliente}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              a.tipo === 'individual'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}>
                              {a.tipo}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{a.danza}</td>
                          <td className="px-4 py-3">
                            {a.estado === 'pendiente' ? (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                isOverdue(a)
                                  ? 'bg-yellow-200 text-yellow-800'
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                Alquiler Activo
                              </span>
                            ) : (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                a.estado === 'devuelto' ? 'bg-green-100 text-green-700' :
                                a.estado === 'perdida' ? 'bg-red-100 text-red-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {a.estado === 'devuelto' ? 'Devuelto' :
                                 a.estado === 'perdida' ? 'Perdida' : a.estado}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">Bs. {a.precio_total}</td>
                        </tr>
                      ))}
                      {recentAlquileres.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
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
                <DetailRow label="Tipo" value={selectedAlquiler.tipo} />
                {selectedAlquiler.nombre_grupo && <DetailRow label="Grupo" value={selectedAlquiler.nombre_grupo} />}
                <DetailRow label="Danza" value={selectedAlquiler.danza} />
                <DetailRow label="Prendas" value={selectedAlquiler.prendas.map(p => `${p.nombre} (${p.cantidad})`).join(', ')} />
                <DetailRow label="Garantia" value={`${selectedAlquiler.garantia} (${selectedAlquiler.tipo_garantia})`} />
                <DetailRow label="Metodo de pago" value={selectedAlquiler.metodo_pago} />
                <DetailRow label="Precio" value={`Bs. ${selectedAlquiler.precio_total}`} />
                <DetailRow label="Fecha alquiler" value={new Date(selectedAlquiler.fecha_alquiler).toLocaleString('es-BO')} />
                <DetailRow label="Fecha devolucion" value={new Date(selectedAlquiler.fecha_devolucion).toLocaleDateString('es-BO')} />
                <DetailRow label="Estado" value={selectedAlquiler.estado === 'pendiente' ? 'Alquiler Activo' : selectedAlquiler.estado} />
                <DetailRow label="Registrado por" value={selectedAlquiler.registrado_por_nombre} />
                {selectedAlquiler.notas && <DetailRow label="Notas" value={selectedAlquiler.notas} />}
              </div>
              <div className="mt-4 flex gap-2">
                <Link
                  href={`/alquileres?codigo=${selectedAlquiler.codigo}`}
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

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode
  label: string
  value: string | number
  color: string
}) {
  return (
    <div className={`card-stat border ${color}`}>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-white shadow-sm">{icon}</div>
        <div>
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          <p className="text-lg font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  )
}
