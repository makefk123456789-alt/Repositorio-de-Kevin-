'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import ProtectedLayout from '@/components/ProtectedLayout'
import { Alquiler, IntegranteGrupo } from '@/lib/types'
import { FiTrendingUp, FiDollarSign, FiUsers, FiCreditCard, FiCalendar, FiLayers, FiPackage } from 'react-icons/fi'

interface FinStats {
  ingresosHoy: number
  ingresosTotalSemana: number
  ingresosTotalMes: number
  personasIndividuales: number
  gruposPendientes: number
  integrantesGrupos: number
  totalPersonasActivas: number
  garantiasQrDevolver: number
  garantiasEfectivoDevolver: number
  garantiasCiDevolver: number
  garantiasPrendaDevolver: number
  montoGarantiasEfectivo: string
  devueltosHoy: number
  devueltosSemana: number
  // Detailed breakdowns
  individualesEfectivo: number
  individualesQr: number
  garantiasIndQr: number
  garantiasIndEfectivo: number
  grupalesEfectivo: number
  grupalesQr: number
  garantiasGrupoQr: number
  garantiasGrupoEfectivo: number
}

interface DayData {
  fecha: string
  individualesEfectivo: number
  individualesQr: number
  grupalesEfectivo: number
  grupalesQr: number
  total: number
  contadorIndividuales: number
  contadorGrupos: number
  contadorIntegrantes: number
}

export default function FinanzasPage() {
  const [stats, setStats] = useState<FinStats | null>(null)
  const [alquileres, setAlquileres] = useState<Alquiler[]>([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState<'hoy' | 'semana' | 'mes' | 'todos'>('hoy')
  const [dayBreakdown, setDayBreakdown] = useState<DayData[]>([])

  useEffect(() => {
    let active = true
    Promise.all([
      supabase.from('alquileres').select('*').order('created_at', { ascending: false }),
      supabase.from('integrantes_grupo').select('*'),
    ]).then(([{ data: alqs }, { data: integrantes }]) => {
      if (!active || !alqs) return
      setAlquileres(alqs)

      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const startOfWeek = new Date(startOfDay)
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const hoy = alqs.filter((a: Alquiler) => new Date(a.fecha_alquiler) >= startOfDay)
      const semana = alqs.filter((a: Alquiler) => new Date(a.fecha_alquiler) >= startOfWeek)
      const mes = alqs.filter((a: Alquiler) => new Date(a.fecha_alquiler) >= startOfMonth)

      const pendientes = alqs.filter((a: Alquiler) => a.estado === 'pendiente')
      const individuales = pendientes.filter((a: Alquiler) => a.tipo === 'individual')
      const grupos = pendientes.filter((a: Alquiler) => a.tipo === 'grupal')

      const grupoIds = grupos.map((g: Alquiler) => g.id)
      const integrantesGr = integrantes
        ? integrantes.filter((i: IntegranteGrupo) => grupoIds.includes(i.alquiler_id))
        : []

      const devueltosHoy = alqs.filter((a: Alquiler) =>
        a.estado === 'devuelto' && a.fecha_devuelto && new Date(a.fecha_devuelto) >= startOfDay
      )
      const devueltosSemana = alqs.filter((a: Alquiler) =>
        a.estado === 'devuelto' && a.fecha_devuelto && new Date(a.fecha_devuelto) >= startOfWeek
      )

      const individualesEfectivo = individuales.filter((a: Alquiler) => a.metodo_pago === 'efectivo')
        .reduce((s: number, a: Alquiler) => s + a.precio_total, 0)
      const individualesQr = individuales.filter((a: Alquiler) => a.metodo_pago === 'qr')
        .reduce((s: number, a: Alquiler) => s + a.precio_total, 0)

      const garantiasIndQr = individuales.filter((a: Alquiler) => a.tipo_garantia.includes('qr')).length
      const garantiasIndEfectivo = individuales.filter((a: Alquiler) => a.tipo_garantia.includes('efectivo')).length

      const grupalesEfectivo = grupos.filter((a: Alquiler) => a.metodo_pago === 'efectivo')
        .reduce((s: number, a: Alquiler) => s + a.precio_total, 0)
      const grupalesQr = grupos.filter((a: Alquiler) => a.metodo_pago === 'qr')
        .reduce((s: number, a: Alquiler) => s + a.precio_total, 0)

      const garantiasGrupoQr = grupos.filter((a: Alquiler) => a.tipo_garantia.includes('qr')).length
      const garantiasGrupoEfectivo = grupos.filter((a: Alquiler) => a.tipo_garantia.includes('efectivo')).length

      setStats({
        ingresosHoy: hoy.reduce((s: number, a: Alquiler) => s + a.precio_total, 0),
        ingresosTotalSemana: semana.reduce((s: number, a: Alquiler) => s + a.precio_total, 0),
        ingresosTotalMes: mes.reduce((s: number, a: Alquiler) => s + a.precio_total, 0),
        personasIndividuales: individuales.length,
        gruposPendientes: grupos.length,
        integrantesGrupos: integrantesGr.length,
        totalPersonasActivas: individuales.length + integrantesGr.length,
        garantiasQrDevolver: pendientes.filter((a: Alquiler) => a.tipo_garantia.includes('qr')).length,
        garantiasEfectivoDevolver: pendientes.filter((a: Alquiler) => a.tipo_garantia.includes('efectivo')).length,
        garantiasCiDevolver: pendientes.filter((a: Alquiler) => a.tipo_garantia.includes('ci')).length,
        garantiasPrendaDevolver: pendientes.filter((a: Alquiler) => a.tipo_garantia.includes('prenda')).length,
        montoGarantiasEfectivo: (pendientes.filter((a: Alquiler) => a.tipo_garantia.includes('efectivo')).length * 100).toFixed(2),
        devueltosHoy: devueltosHoy.length,
        devueltosSemana: devueltosSemana.length,
        individualesEfectivo,
        individualesQr,
        garantiasIndQr,
        garantiasIndEfectivo,
        grupalesEfectivo,
        grupalesQr,
        garantiasGrupoQr,
        garantiasGrupoEfectivo,
      })

      // Day breakdown
      const dateMap: Record<string, DayData> = {}
      alqs.forEach((a: Alquiler) => {
        const dateKey = new Date(a.fecha_alquiler).toLocaleDateString('es-BO')
        if (!dateMap[dateKey]) {
          dateMap[dateKey] = {
            fecha: dateKey,
            individualesEfectivo: 0, individualesQr: 0,
            grupalesEfectivo: 0, grupalesQr: 0,
            total: 0, contadorIndividuales: 0, contadorGrupos: 0, contadorIntegrantes: 0,
          }
        }
        const d = dateMap[dateKey]
        d.total += a.precio_total
        if (a.tipo === 'individual') {
          d.contadorIndividuales++
          if (a.metodo_pago === 'efectivo') d.individualesEfectivo += a.precio_total
          else if (a.metodo_pago === 'qr') d.individualesQr += a.precio_total
          else { d.individualesEfectivo += a.precio_total / 2; d.individualesQr += a.precio_total / 2 }
        } else {
          d.contadorGrupos++
          if (a.metodo_pago === 'efectivo') d.grupalesEfectivo += a.precio_total
          else if (a.metodo_pago === 'qr') d.grupalesQr += a.precio_total
          else { d.grupalesEfectivo += a.precio_total / 2; d.grupalesQr += a.precio_total / 2 }
        }
      })

      if (integrantes) {
        integrantes.forEach((i: IntegranteGrupo) => {
          const alq = alqs.find((a: Alquiler) => a.id === i.alquiler_id)
          if (alq) {
            const dateKey = new Date(alq.fecha_alquiler).toLocaleDateString('es-BO')
            if (dateMap[dateKey]) {
              dateMap[dateKey].contadorIntegrantes++
            }
          }
        })
      }

      setDayBreakdown(Object.values(dateMap).reverse())
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

    return alquileres.filter(a => {
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
                <FinCard icon={<FiDollarSign className="text-green-600" size={24} />}
                  label="Ingresos Hoy" value={`Bs. ${stats.ingresosHoy.toFixed(2)}`} bg="bg-green-50 border-green-200" />
                <FinCard icon={<FiDollarSign className="text-blue-600" size={24} />}
                  label="Ingresos Semana" value={`Bs. ${stats.ingresosTotalSemana.toFixed(2)}`} bg="bg-blue-50 border-blue-200" />
                <FinCard icon={<FiDollarSign className="text-guindo-700" size={24} />}
                  label="Ingresos Mes" value={`Bs. ${stats.ingresosTotalMes.toFixed(2)}`} bg="bg-guindo-50 border-guindo-200" />
              </div>
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
                  <p className="text-3xl font-black text-purple-700">{stats.gruposPendientes}</p>
                  <p className="text-sm font-semibold text-purple-600 mt-1">Grupos</p>
                </div>
                <div className="bg-purple-50 border-2 border-purple-300 rounded-2xl p-5 text-center">
                  <FiUsers className="text-purple-600 mx-auto mb-2" size={28} />
                  <p className="text-3xl font-black text-purple-700">{stats.integrantesGrupos}</p>
                  <p className="text-sm font-semibold text-purple-600 mt-1">Integrantes en Grupos</p>
                </div>
                <div className="bg-indigo-50 border-2 border-indigo-300 rounded-2xl p-5 text-center">
                  <FiUsers className="text-indigo-600 mx-auto mb-2" size={28} />
                  <p className="text-3xl font-black text-indigo-700">{stats.totalPersonasActivas}</p>
                  <p className="text-sm font-semibold text-indigo-600 mt-1">Total Personas</p>
                </div>
              </div>
            </div>

            {/* Desglose Alquileres Individuales */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <FiDollarSign className="text-blue-600" /> Desglose Alquileres Individuales
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <FinCard icon={<FiDollarSign className="text-green-600" size={24} />}
                  label="Ingresos Ind. Efectivo" value={`Bs. ${stats.individualesEfectivo.toFixed(2)}`} bg="bg-green-50 border-green-200" />
                <FinCard icon={<FiCreditCard className="text-cyan-600" size={24} />}
                  label="Ingresos Ind. QR" value={`Bs. ${stats.individualesQr.toFixed(2)}`} bg="bg-cyan-50 border-cyan-200" />
                <FinCard icon={<FiDollarSign className="text-green-600" size={24} />}
                  label="Garantias Ind. Efectivo" value={`${stats.garantiasIndEfectivo} a devolver`} bg="bg-green-50 border-green-200" />
                <FinCard icon={<FiCreditCard className="text-cyan-600" size={24} />}
                  label="Garantias Ind. QR" value={`${stats.garantiasIndQr} a devolver`} bg="bg-cyan-50 border-cyan-200" />
              </div>
            </div>

            {/* Desglose Alquileres Grupales */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <FiDollarSign className="text-purple-600" /> Desglose Alquileres Grupales
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <FinCard icon={<FiDollarSign className="text-green-600" size={24} />}
                  label="Ingresos Grupal Efectivo" value={`Bs. ${stats.grupalesEfectivo.toFixed(2)}`} bg="bg-green-50 border-green-200" />
                <FinCard icon={<FiCreditCard className="text-cyan-600" size={24} />}
                  label="Ingresos Grupal QR" value={`Bs. ${stats.grupalesQr.toFixed(2)}`} bg="bg-cyan-50 border-cyan-200" />
                <FinCard icon={<FiDollarSign className="text-green-600" size={24} />}
                  label="Garantias Grupal Efectivo" value={`${stats.garantiasGrupoEfectivo} a devolver`} bg="bg-green-50 border-green-200" />
                <FinCard icon={<FiCreditCard className="text-cyan-600" size={24} />}
                  label="Garantias Grupal QR" value={`${stats.garantiasGrupoQr} a devolver`} bg="bg-cyan-50 border-cyan-200" />
              </div>
            </div>

            {/* Subtotales */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Estado de Resultados</h2>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Subtotal Individuales (Efectivo)</span>
                  <span className="font-medium">Bs. {stats.individualesEfectivo.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Subtotal Individuales (QR)</span>
                  <span className="font-medium">Bs. {stats.individualesQr.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200 font-semibold">
                  <span className="text-gray-800">Subtotal Individuales</span>
                  <span className="text-blue-700">Bs. {(stats.individualesEfectivo + stats.individualesQr).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Subtotal Grupales (Efectivo)</span>
                  <span className="font-medium">Bs. {stats.grupalesEfectivo.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Subtotal Grupales (QR)</span>
                  <span className="font-medium">Bs. {stats.grupalesQr.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200 font-semibold">
                  <span className="text-gray-800">Subtotal Grupales</span>
                  <span className="text-purple-700">Bs. {(stats.grupalesEfectivo + stats.grupalesQr).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-3 bg-guindo-50 rounded-xl px-4 mt-2">
                  <span className="text-lg font-bold text-guindo-800">TOTAL INGRESOS</span>
                  <span className="text-lg font-bold text-guindo-700">
                    Bs. {(stats.individualesEfectivo + stats.individualesQr + stats.grupalesEfectivo + stats.grupalesQr).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Garantias grandes y claras */}
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

            {/* Devoluciones */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <FiCalendar className="text-guindo-700" /> Devoluciones
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FinCard icon={<CheckIcon className="text-green-600" size={24} />}
                  label="Devueltos Hoy" value={stats.devueltosHoy.toString()} bg="bg-green-50 border-green-200" />
                <FinCard icon={<CheckIcon className="text-blue-600" size={24} />}
                  label="Devueltos esta Semana" value={stats.devueltosSemana.toString()} bg="bg-blue-50 border-blue-200" />
              </div>
            </div>

            {/* Desglose por dias */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Desglose por Dias</h2>
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Fecha</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-600">Ind. Efectivo</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-600">Ind. QR</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-600">Grupal Efectivo</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-600">Grupal QR</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-600">Total</th>
                        <th className="text-center px-4 py-3 font-semibold text-gray-600">Ind.</th>
                        <th className="text-center px-4 py-3 font-semibold text-gray-600">Grupos</th>
                        <th className="text-center px-4 py-3 font-semibold text-gray-600">Integ.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {dayBreakdown.slice(0, 30).map(d => (
                        <tr key={d.fecha} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{d.fecha}</td>
                          <td className="px-4 py-3 text-right">Bs. {d.individualesEfectivo.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right">Bs. {d.individualesQr.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right">Bs. {d.grupalesEfectivo.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right">Bs. {d.grupalesQr.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-bold text-guindo-700">Bs. {d.total.toFixed(2)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                              {d.contadorIndividuales}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                              {d.contadorGrupos}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                              {d.contadorIntegrantes}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Detail table by period */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-800">Detalle de Alquileres</h2>
                <div className="flex gap-2">
                  {(['hoy', 'semana', 'mes', 'todos'] as const).map(p => (
                    <button key={p} onClick={() => setPeriodo(p)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        periodo === p ? 'bg-guindo-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
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
                            }`}>{a.tipo}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 capitalize">{a.metodo_pago}</td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{a.garantia}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              a.estado === 'devuelto' ? 'bg-orange-100 text-orange-700' :
                              a.estado === 'pendiente' && new Date(a.fecha_devolucion) < new Date() ? 'bg-red-100 text-red-700' :
                              a.estado === 'pendiente' ? 'bg-gray-100 text-gray-700' :
                              'bg-red-100 text-red-700'
                            }`}>{
                              a.estado === 'devuelto' ? 'Devuelto' :
                              a.estado === 'pendiente' && new Date(a.fecha_devolucion) < new Date() ? 'Vencido' :
                              a.estado === 'pendiente' ? 'Activo' : a.estado
                            }</span>
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
                          <td colSpan={6} className="px-4 py-3 text-right font-semibold text-gray-600">Total:</td>
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

function CheckIcon(props: { className?: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={props.className} width={props.size} height={props.size}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
