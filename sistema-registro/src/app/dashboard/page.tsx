'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import ProtectedLayout from '@/components/ProtectedLayout'
import { Alquiler, IntegranteGrupo } from '@/lib/types'
import { FiUsers, FiLayers, FiDollarSign, FiCreditCard, FiUserCheck, FiPackage } from 'react-icons/fi'

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

      setRecentAlquileres(alquileres.slice(0, 5))
      setLoading(false)
    })
    return () => { active = false }
  }, [])

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
            {/* Stats principales */}
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

            {/* Contadores de alquileres individuales y grupales */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Alquileres Activos</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon={<FiUsers className="text-blue-600" size={22} />}
                  label="Individuales"
                  value={`${stats.personasIndividuales} personas`}
                  color="bg-blue-50 border-blue-200"
                />
                <StatCard
                  icon={<FiLayers className="text-purple-600" size={22} />}
                  label="Grupos"
                  value={`${stats.gruposTotales} grupos`}
                  color="bg-purple-50 border-purple-200"
                />
                <StatCard
                  icon={<FiUsers className="text-purple-600" size={22} />}
                  label="Integrantes de grupos"
                  value={`${stats.integrantesGrupos} personas`}
                  color="bg-purple-50 border-purple-200"
                />
                <StatCard
                  icon={<FiUsers className="text-indigo-600" size={22} />}
                  label="Total personas"
                  value={`${stats.personasIndividuales + stats.integrantesGrupos} personas`}
                  color="bg-indigo-50 border-indigo-200"
                />
              </div>
            </div>

            {/* Garantias a devolver */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Garantias por Devolver</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon={<FiCreditCard className="text-cyan-600" size={22} />}
                  label="Garantias por QR"
                  value={`${stats.garantiasQrDevolver} a devolver`}
                  color="bg-cyan-50 border-cyan-200"
                />
                <StatCard
                  icon={<FiDollarSign className="text-green-600" size={22} />}
                  label="Garantias en efectivo"
                  value={`${stats.garantiasEfectivoDevolver} a devolver`}
                  color="bg-green-50 border-green-200"
                />
                <StatCard
                  icon={<FiCreditCard className="text-orange-600" size={22} />}
                  label="Garantias CI"
                  value={`${stats.garantiasCiDevolver} a devolver`}
                  color="bg-orange-50 border-orange-200"
                />
                <StatCard
                  icon={<FiPackage className="text-pink-600" size={22} />}
                  label="Garantias prenda"
                  value={`${stats.garantiasPrendaDevolver} a devolver`}
                  color="bg-pink-50 border-pink-200"
                />
              </div>
            </div>

            {/* Ultimos alquileres */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Ultimos Registros</h2>
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
                        <tr key={a.id} className="hover:bg-gray-50">
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
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              a.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-700' :
                              a.estado === 'devuelto' ? 'bg-green-100 text-green-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {a.estado}
                            </span>
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
      </div>
    </ProtectedLayout>
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
