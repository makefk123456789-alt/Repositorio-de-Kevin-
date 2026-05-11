'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import ProtectedLayout from '@/components/ProtectedLayout'
import { Alquiler, IntegranteGrupo } from '@/lib/types'
import {
  FiUsers, FiLayers, FiDollarSign, FiCreditCard,
  FiUserCheck, FiPackage, FiTrendingUp, FiCalendar
} from 'react-icons/fi'

interface FinanzasStats {
  ingresosTotalMes: number
  ingresosTotalSemana: number
  ingresosHoy: number
  totalAlquileresMes: number
  individualesPendientes: number
  personasIndividuales: number
  gruposPendientes: number
  integrantesGrupos: number
  totalPersonasActivas: number
  garantiasQrDevolver: number
  garantiasEfectivoDevolver: number
  garantiasCiDevolver: number
  garantiasPrendaDevolver: number
  totalGarantiasDevolver: number
  montoGarantiasEfectivo: number
  devueltosHoy: number
  devueltosSemana: number
}

export default function FinanzasPage() {
  const [stats, setStats] = useState<FinanzasStats | null>(null)
  const [alquileresPeriodo, setAlquileresPeriodo] = useState<Alquiler[]>([])
  const [periodo, setPeriodo] = useState<'hoy' | 'semana' | 'mes' | 'todos'>('mes')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    Promise.all([
      supabase.from('alquileres').select('*').order('created_at', { ascending: false }),
      supabase.from('integrantes_grupo').select('*'),
    ]).then(([{ data: alquileres }, { data: integrantes }]) => {
      if (!active || !alquileres) return

      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const startOfWeek = new Date(startOfDay)
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const hoy = alquileres.filter((a: Alquiler) => new Date(a.fecha_alquiler) >= startOfDay)
      const semana = alquileres.filter((a: Alquiler) => new Date(a.fecha_alquiler) >= startOfWeek)
      const mes = alquileres.filter((a: Alquiler) => new Date(a.fecha_alquiler) >= startOfMonth)

      const pendientes = alquileres.filter((a: Alquiler) => a.estado === 'pendiente')
      const individualesPend = pendientes.filter((a: Alquiler) => a.tipo === 'individual')
      const gruposPend = pendientes.filter((a: Alquiler) => a.tipo === 'grupal')

      const grupoIds = gruposPend.map((g: Alquiler) => g.id)
      const integrantesGruposPend = integrantes
        ? integrantes.filter((i: IntegranteGrupo) => grupoIds.includes(i.alquiler_id))
        : []

      const garantiasQr = pendientes.filter((a: Alquiler) => a.tipo_garantia.includes('qr'))
      const garantiasEfectivo = pendientes.filter((a: Alquiler) => a.tipo_garantia.includes('efectivo'))
      const garantiasCi = pendientes.filter((a: Alquiler) => a.tipo_garantia.includes('ci'))
      const garantiasPrenda = pendientes.filter((a: Alquiler) => a.tipo_garantia.includes('prenda'))

      const devueltosHoy = alquileres.filter((a: Alquiler) =>
        a.estado === 'devuelto' && a.fecha_devuelto && new Date(a.fecha_devuelto) >= startOfDay
      )
      const devueltosSemana = alquileres.filter((a: Alquiler) =>
        a.estado === 'devuelto' && a.fecha_devuelto && new Date(a.fecha_devuelto) >= startOfWeek
      )

      setStats({
        ingresosTotalMes: mes.reduce((s: number, a: Alquiler) => s + a.precio_total, 0),
        ingresosTotalSemana: semana.reduce((s: number, a: Alquiler) => s + a.precio_total, 0),
        ingresosHoy: hoy.reduce((s: number, a: Alquiler) => s + a.precio_total, 0),
        totalAlquileresMes: mes.length,
        individualesPendientes: individualesPend.length,
        personasIndividuales: individualesPend.length,
        gruposPendientes: gruposPend.length,
        integrantesGrupos: integrantesGruposPend.length,
        totalPersonasActivas: individualesPend.length + integrantesGruposPend.length,
        garantiasQrDevolver: garantiasQr.length,
        garantiasEfectivoDevolver: garantiasEfectivo.length,
        garantiasCiDevolver: garantiasCi.length,
        garantiasPrendaDevolver: garantiasPrenda.length,
        totalGarantiasDevolver: pendientes.length,
        montoGarantiasEfectivo: garantiasEfectivo.length * 100,
        devueltosHoy: devueltosHoy.length,
        devueltosSemana: devueltosSemana.length,
      })

      setAlquileresPeriodo(alquileres)
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  const getFiltered = () => {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfWeek = new Date(startOfDay)
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    return alquileresPeriodo.filter(a => {
      const fecha = new Date(a.fecha_alquiler)
      if (periodo === 'hoy') return fecha >= startOfDay
      if (periodo === 'semana') return fecha >= startOfWeek
      if (periodo === 'mes') return fecha >= startOfMonth
      return true
    })
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finanzas</h1>
          <p className="text-gray-500 text-sm mt-1">Resumen financiero y estadisticas de alquileres</p>
        </div>

        {loading || !stats ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-guindo-700 border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Ingresos */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <FiTrendingUp className="text-guindo-700" /> Ingresos
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FinCard
                  icon={<FiDollarSign className="text-green-600" size={24} />}
                  label="Ingresos Hoy"
                  value={`Bs. ${stats.ingresosHoy.toFixed(2)}`}
                  bg="bg-green-50 border-green-200"
                />
                <FinCard
                  icon={<FiDollarSign className="text-blue-600" size={24} />}
                  label="Ingresos Semana"
                  value={`Bs. ${stats.ingresosTotalSemana.toFixed(2)}`}
                  bg="bg-blue-50 border-blue-200"
                />
                <FinCard
                  icon={<FiDollarSign className="text-guindo-700" size={24} />}
                  label="Ingresos Mes"
                  value={`Bs. ${stats.ingresosTotalMes.toFixed(2)}`}
                  bg="bg-guindo-50 border-guindo-200"
                />
              </div>
            </div>

            {/* Alquileres activos - individuales y grupales */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <FiUsers className="text-guindo-700" /> Alquileres Activos (Pendientes)
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <FinCard
                  icon={<FiUserCheck className="text-blue-600" size={24} />}
                  label="Alquileres Individuales"
                  value={`${stats.personasIndividuales} personas`}
                  bg="bg-blue-50 border-blue-200"
                />
                <FinCard
                  icon={<FiLayers className="text-purple-600" size={24} />}
                  label="Grupos"
                  value={`${stats.gruposPendientes} grupos`}
                  bg="bg-purple-50 border-purple-200"
                />
                <FinCard
                  icon={<FiUsers className="text-purple-600" size={24} />}
                  label="Integrantes de Grupos"
                  value={`${stats.integrantesGrupos} personas`}
                  bg="bg-purple-50 border-purple-200"
                />
                <FinCard
                  icon={<FiUsers className="text-indigo-600" size={24} />}
                  label="Total Personas Activas"
                  value={`${stats.totalPersonasActivas} personas`}
                  bg="bg-indigo-50 border-indigo-200"
                  highlight
                />
              </div>
            </div>

            {/* Garantias a devolver */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <FiCreditCard className="text-guindo-700" /> Garantias por Devolver
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <FinCard
                  icon={<FiCreditCard className="text-cyan-600" size={24} />}
                  label="Garantias por QR"
                  value={`${stats.garantiasQrDevolver} a devolver`}
                  bg="bg-cyan-50 border-cyan-200"
                />
                <FinCard
                  icon={<FiDollarSign className="text-green-600" size={24} />}
                  label="Garantias en Efectivo"
                  value={`${stats.garantiasEfectivoDevolver} a devolver`}
                  sub={`~ Bs. ${stats.montoGarantiasEfectivo}`}
                  bg="bg-green-50 border-green-200"
                />
                <FinCard
                  icon={<FiCreditCard className="text-orange-600" size={24} />}
                  label="Garantias CI"
                  value={`${stats.garantiasCiDevolver} a devolver`}
                  bg="bg-orange-50 border-orange-200"
                />
                <FinCard
                  icon={<FiPackage className="text-pink-600" size={24} />}
                  label="Garantias Prenda"
                  value={`${stats.garantiasPrendaDevolver} a devolver`}
                  bg="bg-pink-50 border-pink-200"
                />
              </div>
            </div>

            {/* Devoluciones */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <FiCalendar className="text-guindo-700" /> Devoluciones
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FinCard
                  icon={<FiCheck className="text-green-600" size={24} />}
                  label="Devueltos Hoy"
                  value={stats.devueltosHoy.toString()}
                  bg="bg-green-50 border-green-200"
                />
                <FinCard
                  icon={<FiCheck className="text-blue-600" size={24} />}
                  label="Devueltos esta Semana"
                  value={stats.devueltosSemana.toString()}
                  bg="bg-blue-50 border-blue-200"
                />
              </div>
            </div>

            {/* Tabla de alquileres por periodo */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-800">Detalle de Alquileres</h2>
                <div className="flex gap-2">
                  {(['hoy', 'semana', 'mes', 'todos'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setPeriodo(p)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        periodo === p
                          ? 'bg-guindo-700 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {p === 'hoy' ? 'Hoy' : p === 'semana' ? 'Semana' : p === 'mes' ? 'Mes' : 'Todos'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Cliente</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Tipo</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Pago</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Garantia</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Estado</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-600">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {getFiltered().map(a => (
                        <tr key={a.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-500">{a.codigo}</td>
                          <td className="px-4 py-3 font-medium">{a.nombre_cliente}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              a.tipo === 'individual' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                            }`}>
                              {a.tipo}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 capitalize">{a.metodo_pago}</td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{a.garantia}</td>
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
                      {getFiltered().length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                            No hay registros en este periodo
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {getFiltered().length > 0 && (
                      <tfoot className="bg-gray-50 border-t">
                        <tr>
                          <td colSpan={6} className="px-4 py-3 text-right font-semibold text-gray-600">
                            Total:
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-guindo-700">
                            Bs. {getFiltered().reduce((s, a) => s + a.precio_total, 0).toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
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

function FinCard({ icon, label, value, sub, bg, highlight }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; bg: string; highlight?: boolean
}) {
  return (
    <div className={`card-stat border ${bg} ${highlight ? 'ring-2 ring-indigo-300' : ''}`}>
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-white shadow-sm">{icon}</div>
        <div>
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          <p className={`font-bold text-gray-900 ${highlight ? 'text-xl' : 'text-lg'}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  )
}

function FiCheck(props: { className?: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={props.className} width={props.size} height={props.size}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
