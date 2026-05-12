'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import ProtectedLayout from '@/components/ProtectedLayout'
import { Alquiler, IntegranteGrupo } from '@/lib/types'
import toast from 'react-hot-toast'
import { FiSearch, FiCheck, FiX, FiAlertTriangle, FiPrinter, FiUserPlus, FiPlus, FiTrash2 } from 'react-icons/fi'
import { Prenda } from '@/lib/types'

export default function AlquileresPage() {
  const { profile, isAdmin } = useAuth()
  const [alquileres, setAlquileres] = useState<Alquiler[]>([])
  const [filtro, setFiltro] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('todos')
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | 'individual' | 'grupal'>('todos')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Alquiler | null>(null)
  const [solicitandoEdicion, setSolicitandoEdicion] = useState(false)
  const [motivoEdicion, setMotivoEdicion] = useState('')
  const [integrantes, setIntegrantes] = useState<IntegranteGrupo[]>([])
  const [loadingIntegrantes, setLoadingIntegrantes] = useState(false)
  const [buscarIntegrante, setBuscarIntegrante] = useState('')
  const [showAgregarIntegrante, setShowAgregarIntegrante] = useState(false)
  const [nuevoIntNombre, setNuevoIntNombre] = useState('')
  const [nuevoIntGarantia, setNuevoIntGarantia] = useState('')
  const [nuevoIntTipoGarantia, setNuevoIntTipoGarantia] = useState('ci_efectivo')
  const [nuevoIntMetodoPago, setNuevoIntMetodoPago] = useState('efectivo')
  const [nuevoIntMonto, setNuevoIntMonto] = useState('')
  const [nuevoIntNotas, setNuevoIntNotas] = useState('')
  const [nuevoIntPrendas, setNuevoIntPrendas] = useState<Prenda[]>([{ nombre: '', cantidad: 1 }])
  const [agregandoInt, setAgregandoInt] = useState(false)

  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey(k => k + 1)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('alquileres')
        .select('*')
        .order('created_at', { ascending: false })
      if (data) setAlquileres(data)
      setLoading(false)
    }
    load()
  }, [reloadKey])

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
    reload()
  }

  const marcarPerdida = async (alquiler: Alquiler) => {
    if (!profile) return
    const { error } = await supabase
      .from('alquileres')
      .update({
        estado: 'perdida',
        perdida: true,
        perdida_por: profile.id,
        perdida_fecha: new Date().toISOString(),
      })
      .eq('id', alquiler.id)

    if (error) {
      toast.error('Error al marcar como perdida')
      return
    }

    await supabase.from('audit_log').insert({
      usuario_id: profile.id,
      usuario_nombre: profile.nombre,
      accion: 'perdida',
      detalle: `Marcado como perdida: ${alquiler.nombre_cliente} - ${alquiler.danza}`,
      alquiler_id: alquiler.id,
    })

    toast.success('Marcado como perdida')
    setSelected(null)
    reload()
  }

  const solicitarEdicion = async (alquiler: Alquiler) => {
    if (!profile || !motivoEdicion.trim()) {
      toast.error('Escribe el motivo de la edicion')
      return
    }
    const { error } = await supabase.from('solicitudes_edicion').insert({
      alquiler_id: alquiler.id,
      tipo: 'edicion_alquiler',
      solicitante_id: profile.id,
      solicitante_nombre: profile.nombre,
      motivo: motivoEdicion,
      estado: 'pendiente',
      aprobada_usada: false,
    })
    if (error) {
      console.error('Error solicitud:', error)
      toast.error('Error al enviar solicitud. Contacta al administrador.')
    } else {
      toast.success('Solicitud enviada al administrador')
      setSolicitandoEdicion(false)
      setMotivoEdicion('')
    }
  }

  const openDetail = async (alquiler: Alquiler) => {
    setSelected(alquiler)
    if (alquiler.tipo === 'grupal') {
      setLoadingIntegrantes(true)
      const { data } = await supabase
        .from('integrantes_grupo')
        .select('*')
        .eq('alquiler_id', alquiler.id)
        .order('numero', { ascending: true })
      setIntegrantes(data || [])
      setLoadingIntegrantes(false)
    } else {
      setIntegrantes([])
    }
  }

  const marcarIntegranteDevuelto = async (integrante: IntegranteGrupo) => {
    if (!profile) return
    if (integrante.devuelto && !isAdmin) {
      toast.error('Ya esta marcado como devuelto. Solicita edicion al administrador para revertir.')
      return
    }
    const nuevoEstado = !integrante.devuelto
    const { error } = await supabase
      .from('integrantes_grupo')
      .update({
        devuelto: nuevoEstado,
        devuelto_fecha: nuevoEstado ? new Date().toISOString() : null,
        devuelto_por: nuevoEstado ? profile.id : null,
      })
      .eq('id', integrante.id)

    if (error) {
      toast.error('Error al actualizar integrante')
      return
    }

    setIntegrantes(prev =>
      prev.map(i => i.id === integrante.id
        ? { ...i, devuelto: nuevoEstado, devuelto_fecha: nuevoEstado ? new Date().toISOString() : null, devuelto_por: nuevoEstado ? profile.id : null }
        : i
      )
    )

    await supabase.from('audit_log').insert({
      usuario_id: profile.id,
      usuario_nombre: profile.nombre,
      accion: nuevoEstado ? 'devolucion_integrante' : 'revertir_devolucion_integrante',
      detalle: `${nuevoEstado ? 'Devuelto' : 'Revertido'}: ${integrante.nombre} del grupo`,
      alquiler_id: integrante.alquiler_id,
    })

    toast.success(nuevoEstado ? `${integrante.nombre} marcado como devuelto` : `${integrante.nombre} revertido`)
  }

  const agregarIntegrante = async () => {
    if (!profile || !selected) return
    if (!nuevoIntNombre.trim()) {
      toast.error('Escribe el nombre del integrante')
      return
    }
    if (!nuevoIntMonto || isNaN(Number(nuevoIntMonto))) {
      toast.error('Escribe un monto valido')
      return
    }
    setAgregandoInt(true)
    const nuevoNumero = integrantes.length + 1
    const insertData: Record<string, unknown> = {
      alquiler_id: selected.id,
      numero: nuevoNumero,
      nombre: nuevoIntNombre.trim(),
      garantia: nuevoIntGarantia.trim() ? `${nuevoIntGarantia.trim()} (${nuevoIntTipoGarantia})` : null,
      metodo_pago: nuevoIntMetodoPago,
      prendas: nuevoIntPrendas.filter(p => p.nombre.trim()),
      monto: Number(nuevoIntMonto),
      notas: nuevoIntNotas.trim() || null,
      devuelto: false,
    }

    // Try with tipo_garantia column first, fallback without it
    let data, error
    const res1 = await supabase.from('integrantes_grupo').insert({
      ...insertData,
      tipo_garantia: nuevoIntTipoGarantia,
    }).select().single()

    if (res1.error && res1.error.message.includes('tipo_garantia')) {
      const res2 = await supabase.from('integrantes_grupo').insert(insertData).select().single()
      data = res2.data
      error = res2.error
    } else {
      data = res1.data
      error = res1.error
    }

    if (error) {
      console.error('Error agregar integrante:', error)
      toast.error(`Error: ${error.message || 'No se pudo agregar integrante'}`)
      setAgregandoInt(false)
      return
    }

    if (data) {
      setIntegrantes(prev => [...prev, data])
    }

    await supabase.from('audit_log').insert({
      usuario_id: profile.id,
      usuario_nombre: profile.nombre,
      accion: 'agregar_integrante',
      detalle: `Nuevo integrante #${nuevoNumero}: ${nuevoIntNombre.trim()} al grupo ${selected.nombre_grupo || selected.nombre_cliente}`,
      alquiler_id: selected.id,
    })

    toast.success(`Integrante ${nuevoIntNombre.trim()} agregado`)
    setNuevoIntNombre('')
    setNuevoIntGarantia('')
    setNuevoIntTipoGarantia('ci_efectivo')
    setNuevoIntMetodoPago('efectivo')
    setNuevoIntMonto('')
    setNuevoIntNotas('')
    setNuevoIntPrendas([{ nombre: '', cantidad: 1 }])
    setShowAgregarIntegrante(false)
    setAgregandoInt(false)
  }

  const [solicitandoRevertir, setSolicitandoRevertir] = useState<string | null>(null)
  const [motivoRevertir, setMotivoRevertir] = useState('')

  const solicitarRevertirIntegrante = async (integrante: IntegranteGrupo) => {
    if (!profile || !motivoRevertir.trim()) {
      toast.error('Escribe el motivo para solicitar revertir')
      return
    }
    const { error } = await supabase.from('solicitudes_edicion').insert({
      alquiler_id: integrante.alquiler_id,
      tipo: 'revertir_devolucion',
      solicitante_id: profile.id,
      solicitante_nombre: profile.nombre,
      motivo: `Revertir devolucion de ${integrante.nombre}: ${motivoRevertir}`,
      estado: 'pendiente',
      aprobada_usada: false,
    })
    if (error) {
      toast.error('Error al enviar solicitud. Contacta al administrador.')
    } else {
      toast.success('Solicitud enviada al administrador')
      setSolicitandoRevertir(null)
      setMotivoRevertir('')
    }
  }

  const printAlquiler = (alquiler: Alquiler) => {
    const win = window.open('', '_blank', 'width=300,height=500')
    if (!win) return
    win.document.write(`
      <html><head><title>Recibo #${alquiler.codigo}</title>
      <style>
        body { font-family: monospace; font-size: 12px; padding: 10px; max-width: 280px; margin: 0 auto; }
        h2 { text-align: center; margin: 5px 0; font-size: 14px; }
        hr { border: 1px dashed #000; }
        .row { display: flex; justify-content: space-between; margin: 3px 0; }
        .center { text-align: center; }
        @media print { body { margin: 0; padding: 5px; } }
      </style></head><body>
      <h2>CREACIONES ANGY</h2>
      <p class="center">Recibo de Alquiler</p>
      <hr>
      <div class="row"><span>Codigo:</span><strong>#${alquiler.codigo}</strong></div>
      <div class="row"><span>Fecha:</span><span>${new Date(alquiler.fecha_alquiler).toLocaleString('es-BO')}</span></div>
      <div class="row"><span>Cliente:</span><span>${alquiler.nombre_cliente}</span></div>
      <div class="row"><span>Celular:</span><span>${alquiler.celular}</span></div>
      <div class="row"><span>Tipo:</span><span>${alquiler.tipo}</span></div>
      <div class="row"><span>Danza:</span><span>${alquiler.danza}</span></div>
      <hr>
      <p><strong>Prendas:</strong></p>
      ${alquiler.prendas.map(p => `<div class="row"><span>${p.nombre}</span><span>x${p.cantidad}</span></div>`).join('')}
      <hr>
      <div class="row"><span>Garantia:</span><span>${alquiler.garantia}</span></div>
      <div class="row"><span>Tipo garantia:</span><span>${alquiler.tipo_garantia}</span></div>
      <div class="row"><span>Pago:</span><span>${alquiler.metodo_pago}</span></div>
      <div class="row"><strong>TOTAL:</strong><strong>Bs. ${alquiler.precio_total}</strong></div>
      <hr>
      <div class="row"><span>Devolucion:</span><span>${new Date(alquiler.fecha_devolucion).toLocaleDateString('es-BO')}</span></div>
      <p class="center" style="margin-top:10px;font-size:10px;">Creaciones Angy - Tarija, Bolivia</p>
      <script>window.print();</script>
      </body></html>
    `)
    win.document.close()
  }

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

  const filtered = alquileres.filter(a => {
    if (a.estado === 'perdida') return false
    const matchText = !filtro ||
      a.nombre_cliente.toLowerCase().includes(filtro.toLowerCase()) ||
      a.danza.toLowerCase().includes(filtro.toLowerCase()) ||
      a.codigo?.toString().includes(filtro)
    const matchEstado = estadoFiltro === 'todos' || a.estado === estadoFiltro
    const matchTipo = tipoFiltro === 'todos' || a.tipo === tipoFiltro
    return matchText && matchEstado && matchTipo
  })

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Alquileres</h1>
            <p className="text-gray-500 text-sm mt-1">{filtered.length} registros</p>
          </div>

          <div className="flex flex-wrap gap-3">
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
              <option value="pendiente">Activos</option>
              <option value="devuelto">Devueltos</option>
              <option value="vencido">Vencidos</option>
            </select>
          </div>
        </div>

        {/* Type filter buttons */}
        <div className="flex gap-3">
          {(['todos', 'individual', 'grupal'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTipoFiltro(t)}
              className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
                tipoFiltro === t
                  ? 'bg-guindo-700 text-white shadow-lg'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {t === 'todos' ? 'Todos' : t === 'individual' ? 'Individuales' : 'Grupales'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-guindo-700 border-t-transparent" />
          </div>
        ) : (
          <>
          {/* Leyenda de colores */}
          <div className="flex flex-wrap gap-4 text-xs mb-1 bg-gray-50 rounded-xl px-4 py-2">
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
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Garantia</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Devolucion</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Estado</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Precio</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map(a => (
                    <tr
                      key={a.id}
                      className={`cursor-pointer hover:brightness-95 transition-all ${getRowColor(a)}`}
                      onClick={() => openDetail(a)}
                    >
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{a.codigo}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{a.nombre_cliente}</div>
                        <div className="text-xs text-gray-400">{a.celular}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          a.tipo === 'individual' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {a.tipo === 'individual' ? 'Individual' : 'Grupal'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{a.danza}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{a.garantia}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
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
                      <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => printAlquiler(a)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                            title="Imprimir recibo"
                          >
                            <FiPrinter size={16} />
                          </button>
                          {a.estado === 'pendiente' && a.tipo === 'individual' && (
                            <button
                              onClick={() => marcarDevuelto(a)}
                              className="p-1.5 rounded-lg hover:bg-green-100 text-green-600"
                              title="Marcar devuelto"
                            >
                              <FiCheck size={16} />
                            </button>
                          )}
                          {a.estado === 'pendiente' && (
                            <button
                              onClick={() => marcarPerdida(a)}
                              className="p-1.5 rounded-lg hover:bg-red-100 text-red-600"
                              title="Marcar como perdida"
                            >
                              <FiAlertTriangle size={16} />
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
          </>
        )}

        {/* Detail modal */}
        {selected && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Detalle Alquiler #{selected.codigo}</h2>
                <button onClick={() => { setSelected(null); setSolicitandoEdicion(false) }} className="text-gray-400 hover:text-gray-600">
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
                <Detail label="Estado" value={selected.estado === 'pendiente' ? 'Alquiler Activo' : selected.estado} />
                <Detail label="Registrado por" value={selected.registrado_por_nombre} />
                {selected.notas && <Detail label="Notas" value={selected.notas} />}
              </div>

              {/* Estado de devolucion - INDIVIDUAL */}
              {selected.tipo === 'individual' && selected.estado === 'pendiente' && (
                <div className="mt-4 p-4 bg-orange-50 border-2 border-orange-200 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                      <FiAlertTriangle className="text-orange-600" size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-orange-800">Pendiente de devolucion</p>
                      <p className="text-xs text-orange-600">Fecha limite: {new Date(selected.fecha_devolucion).toLocaleDateString('es-BO')}</p>
                    </div>
                  </div>
                </div>
              )}
              {selected.tipo === 'individual' && selected.estado === 'devuelto' && (
                <div className="mt-4 p-4 bg-green-50 border-2 border-green-300 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                      <FiCheck className="text-green-600" size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-green-800">Devuelto</p>
                      <p className="text-xs text-green-600">
                        {selected.fecha_devuelto ? new Date(selected.fecha_devuelto).toLocaleString('es-BO') : ''}
                        {selected.devuelto_por_nombre ? ` por ${selected.devuelto_por_nombre}` : ''}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Integrantes del grupo con checkboxes individuales */}
              {selected.tipo === 'grupal' && (
                <div className="mt-4">
                  <h3 className="text-sm font-bold text-gray-800 mb-2">Integrantes del Grupo — Control de Devoluciones</h3>
                  <p className="text-xs text-gray-500 mb-3">Marca a cada integrante cuando devuelva su ropa. Una vez marcado, no se puede deshacer sin solicitud al administrador.</p>
                  {loadingIntegrantes ? (
                    <div className="text-center py-3 text-gray-400 text-sm">Cargando integrantes...</div>
                  ) : integrantes.length === 0 ? (
                    <div className="text-center py-3 text-gray-400 text-sm">Sin integrantes registrados</div>
                  ) : (
                    <div className="space-y-2">
                      {integrantes.length > 5 && (
                        <div className="relative mb-2">
                          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                          <input
                            className="input-field pl-8 text-sm"
                            placeholder="Buscar integrante por nombre..."
                            value={buscarIntegrante}
                            onChange={e => setBuscarIntegrante(e.target.value)}
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-gray-700">
                          {integrantes.filter(i => i.devuelto).length} de {integrantes.length} devolvieron
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          integrantes.filter(i => i.devuelto).length === integrantes.length
                            ? 'bg-green-200 text-green-800'
                            : 'bg-orange-200 text-orange-800'
                        }`}>
                          {integrantes.filter(i => i.devuelto).length === integrantes.length ? 'TODOS DEVOLVIERON' : 'FALTAN DEVOLUCIONES'}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                        <div
                          className={`h-3 rounded-full transition-all ${
                            integrantes.filter(i => i.devuelto).length === integrantes.length ? 'bg-green-500' : 'bg-orange-400'
                          }`}
                          style={{ width: `${integrantes.length > 0 ? (integrantes.filter(i => i.devuelto).length / integrantes.length) * 100 : 0}%` }}
                        />
                      </div>
                      {integrantes.filter(i =>
                        !buscarIntegrante ||
                        i.nombre.toLowerCase().includes(buscarIntegrante.toLowerCase()) ||
                        i.numero.toString().includes(buscarIntegrante)
                      ).map(i => (
                        <div key={i.id}>
                          <div
                            className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                              i.devuelto
                                ? 'bg-green-50 border-green-300'
                                : 'bg-orange-50 border-orange-200'
                            }`}
                          >
                            <button
                              onClick={() => {
                                if (i.devuelto && !isAdmin) {
                                  setSolicitandoRevertir(solicitandoRevertir === i.id ? null : i.id)
                                  return
                                }
                                marcarIntegranteDevuelto(i)
                              }}
                              className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${
                                i.devuelto
                                  ? 'bg-green-500 border-green-500 text-white'
                                  : 'border-orange-300 hover:border-orange-500 hover:bg-orange-100'
                              }`}
                              title={i.devuelto ? (isAdmin ? 'Clic para revertir' : 'Solicitar revertir al admin') : 'Marcar como devuelto'}
                            >
                              {i.devuelto && <FiCheck size={18} />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-bold ${
                                i.devuelto ? 'line-through text-gray-400' : 'text-gray-800'
                              }`}>
                                {i.numero}. {i.nombre}
                              </p>
                              <p className="text-xs text-gray-500">
                                Pago: {i.metodo_pago} | Garantia: {i.tipo_garantia || 'N/A'} | Bs. {i.monto}
                              </p>
                              {i.prendas && i.prendas.length > 0 && (
                                <p className="text-xs text-gray-400 mt-0.5">
                                  Prendas: {i.prendas.map((p: Prenda) => `${p.nombre}(x${p.cantidad})`).join(', ')}
                                </p>
                              )}
                              {i.garantia && (
                                <p className="text-xs text-gray-400">Garantia: {i.garantia}</p>
                              )}
                              {i.devuelto && i.devuelto_fecha && (
                                <p className="text-xs text-green-600 mt-0.5">
                                  Devolvio: {new Date(i.devuelto_fecha).toLocaleString('es-BO')}
                                </p>
                              )}
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                              i.devuelto
                                ? 'bg-green-200 text-green-800'
                                : 'bg-orange-200 text-orange-800'
                            }`}>
                              {i.devuelto ? 'DEVUELTO' : 'PENDIENTE'}
                            </span>
                          </div>
                          {/* Formulario para solicitar revertir (solo workers) */}
                          {solicitandoRevertir === i.id && !isAdmin && (
                            <div className="ml-11 mt-1 p-3 bg-yellow-50 border border-yellow-200 rounded-xl space-y-2">
                              <p className="text-xs font-semibold text-yellow-800">Solicitar revertir devolucion de {i.nombre}</p>
                              <textarea
                                className="input-field text-sm"
                                rows={2}
                                value={motivoRevertir}
                                onChange={e => setMotivoRevertir(e.target.value)}
                                placeholder="Explica por que necesitas revertir..."
                              />
                              <div className="flex gap-2">
                                <button onClick={() => solicitarRevertirIntegrante(i)} className="btn-primary flex-1 text-xs">
                                  Enviar Solicitud
                                </button>
                                <button onClick={() => { setSolicitandoRevertir(null); setMotivoRevertir('') }}
                                  className="flex-1 py-1.5 px-3 border border-gray-200 rounded-xl text-xs text-gray-600 hover:bg-gray-50">
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Agregar integrante a grupo existente */}
              {selected.tipo === 'grupal' && selected.estado === 'pendiente' && (
                <div className="mt-3">
                  {!showAgregarIntegrante ? (
                    <button
                      onClick={() => setShowAgregarIntegrante(true)}
                      className="w-full py-2.5 px-4 bg-guindo-700 text-white rounded-xl text-sm font-semibold hover:bg-guindo-800 flex items-center justify-center gap-2"
                    >
                      <FiUserPlus size={16} /> Agregar Integrante
                    </button>
                  ) : (
                    <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-2xl space-y-3">
                      <h4 className="text-sm font-bold text-purple-800 flex items-center gap-2">
                        <FiUserPlus size={16} /> Nuevo Integrante #{integrantes.length + 1}
                      </h4>
                      <div>
                        <label className="label-field">Nombre completo *</label>
                        <input className="input-field" placeholder="Nombre del integrante" value={nuevoIntNombre} onChange={e => setNuevoIntNombre(e.target.value)} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label-field">Metodo de pago</label>
                          <select className="input-field" value={nuevoIntMetodoPago} onChange={e => setNuevoIntMetodoPago(e.target.value)}>
                            <option value="efectivo">Efectivo</option>
                            <option value="qr">QR</option>
                          </select>
                        </div>
                        <div>
                          <label className="label-field">Monto (Bs.) *</label>
                          <input className="input-field" type="number" placeholder="0" value={nuevoIntMonto} onChange={e => setNuevoIntMonto(e.target.value)} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label-field">Garantia</label>
                          <input className="input-field" placeholder="CI, efectivo, etc." value={nuevoIntGarantia} onChange={e => setNuevoIntGarantia(e.target.value)} />
                        </div>
                        <div>
                          <label className="label-field">Tipo garantia</label>
                          <select className="input-field" value={nuevoIntTipoGarantia} onChange={e => setNuevoIntTipoGarantia(e.target.value)}>
                            <option value="ci_efectivo">CI + Efectivo</option>
                            <option value="ci_qr">CI + QR</option>
                            <option value="ci_prenda">CI + Prenda</option>
                            <option value="ci">CI</option>
                            <option value="efectivo">Efectivo</option>
                            <option value="qr">QR</option>
                            <option value="prenda">Prenda</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="label-field">Prendas que lleva</label>
                        <div className="space-y-2">
                          {nuevoIntPrendas.map((p, pi) => (
                            <div key={pi} className="flex gap-2 items-center">
                              <input className="input-field flex-1" placeholder="Nombre prenda" value={p.nombre}
                                onChange={e => setNuevoIntPrendas(prev => prev.map((pr, i) => i === pi ? { ...pr, nombre: e.target.value } : pr))} />
                              <input className="input-field w-16" type="number" min={1} value={p.cantidad}
                                onChange={e => setNuevoIntPrendas(prev => prev.map((pr, i) => i === pi ? { ...pr, cantidad: Number(e.target.value) } : pr))} />
                              {nuevoIntPrendas.length > 1 && (
                                <button onClick={() => setNuevoIntPrendas(prev => prev.filter((_, i) => i !== pi))}
                                  className="p-1 text-red-400 hover:text-red-600"><FiTrash2 size={14} /></button>
                              )}
                            </div>
                          ))}
                          <button onClick={() => setNuevoIntPrendas(prev => [...prev, { nombre: '', cantidad: 1 }])}
                            className="text-xs text-guindo-700 hover:text-guindo-800 flex items-center gap-1"><FiPlus size={12} /> Otra prenda</button>
                        </div>
                      </div>
                      <div>
                        <label className="label-field">Notas (opcional)</label>
                        <input className="input-field" placeholder="Observaciones..." value={nuevoIntNotas} onChange={e => setNuevoIntNotas(e.target.value)} />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={agregarIntegrante} disabled={agregandoInt} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                          {agregandoInt ? 'Guardando...' : 'Guardar Integrante'}
                        </button>
                        <button onClick={() => { setShowAgregarIntegrante(false); setNuevoIntNombre(''); setNuevoIntGarantia(''); setNuevoIntMonto(''); setNuevoIntNotas(''); setNuevoIntPrendas([{ nombre: '', cantidad: 1 }]) }}
                          className="flex-1 py-2 px-4 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 space-y-2">
                {selected.estado === 'pendiente' && selected.tipo === 'individual' && (
                  <button onClick={() => marcarDevuelto(selected)} className="w-full py-3 px-4 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 flex items-center justify-center gap-2">
                    <FiCheck size={18} /> Marcar como Devuelto
                  </button>
                )}
                {selected.estado === 'pendiente' && (
                  <button onClick={() => marcarPerdida(selected)}
                    className="w-full py-2 px-4 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700">
                    Marcar como Perdida
                  </button>
                )}

                <button onClick={() => printAlquiler(selected)}
                  className="w-full py-2 px-4 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2">
                  <FiPrinter size={16} /> Imprimir Recibo
                </button>

                {!isAdmin && !solicitandoEdicion && (
                  <button onClick={() => setSolicitandoEdicion(true)}
                    className="w-full py-2 px-4 border border-guindo-200 rounded-xl text-sm text-guindo-700 hover:bg-guindo-50">
                    Solicitar Edicion
                  </button>
                )}

                {solicitandoEdicion && (
                  <div className="p-3 bg-gray-50 rounded-xl space-y-2">
                    <label className="label-field">Motivo de la edicion</label>
                    <textarea
                      className="input-field"
                      rows={2}
                      value={motivoEdicion}
                      onChange={e => setMotivoEdicion(e.target.value)}
                      placeholder="Explica que deseas cambiar y por que..."
                    />
                    <div className="flex gap-2">
                      <button onClick={() => solicitarEdicion(selected)} className="btn-primary flex-1 text-sm">
                        Enviar Solicitud
                      </button>
                      <button onClick={() => { setSolicitandoEdicion(false); setMotivoEdicion('') }}
                        className="flex-1 py-2 px-4 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
