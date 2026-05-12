'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import ProtectedLayout from '@/components/ProtectedLayout'
import { Alquiler, IntegranteGrupo } from '@/lib/types'
import toast from 'react-hot-toast'
import { FiSearch, FiCheck, FiEye, FiX, FiAlertTriangle, FiPrinter } from 'react-icons/fi'

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
    if (!profile || !motivoEdicion.trim()) return
    const { error } = await supabase.from('solicitudes_edicion').insert({
      alquiler_id: alquiler.id,
      tipo: 'edicion_alquiler',
      solicitante_id: profile.id,
      solicitante_nombre: profile.nombre,
      motivo: motivoEdicion,
      estado: 'pendiente',
    })
    if (error) {
      toast.error('Error al enviar solicitud')
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
                        {a.estado === 'pendiente' ? (
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            isOverdue(a)
                              ? 'bg-yellow-300 text-yellow-900'
                              : 'bg-orange-100 text-orange-700'
                          }`}>
                            Alquiler Activo
                          </span>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            a.estado === 'devuelto' ? 'bg-green-100 text-green-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {a.estado === 'devuelto' ? 'Devuelto' : a.estado}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">Bs. {a.precio_total}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openDetail(a)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                            title="Ver detalle"
                          >
                            <FiEye size={16} />
                          </button>
                          <button
                            onClick={() => printAlquiler(a)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                            title="Imprimir recibo"
                          >
                            <FiPrinter size={16} />
                          </button>
                          {a.estado === 'pendiente' && (
                            <>
                              <button
                                onClick={() => marcarDevuelto(a)}
                                className="p-1.5 rounded-lg hover:bg-green-100 text-green-600"
                                title="Marcar devuelto"
                              >
                                <FiCheck size={16} />
                              </button>
                              <button
                                onClick={() => marcarPerdida(a)}
                                className="p-1.5 rounded-lg hover:bg-red-100 text-red-600"
                                title="Marcar como perdida"
                              >
                                <FiAlertTriangle size={16} />
                              </button>
                            </>
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

              {/* Integrantes del grupo con checkboxes individuales */}
              {selected.tipo === 'grupal' && (
                <div className="mt-4">
                  <h3 className="text-sm font-bold text-gray-800 mb-2">Integrantes del Grupo</h3>
                  {loadingIntegrantes ? (
                    <div className="text-center py-3 text-gray-400 text-sm">Cargando integrantes...</div>
                  ) : integrantes.length === 0 ? (
                    <div className="text-center py-3 text-gray-400 text-sm">Sin integrantes registrados</div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-xs text-gray-500 mb-1">
                        {integrantes.filter(i => i.devuelto).length} de {integrantes.length} devolvieron
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${integrantes.length > 0 ? (integrantes.filter(i => i.devuelto).length / integrantes.length) * 100 : 0}%` }}
                        />
                      </div>
                      {integrantes.map(i => (
                        <div
                          key={i.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                            i.devuelto
                              ? 'bg-green-50 border-green-300'
                              : 'bg-orange-50 border-orange-200'
                          }`}
                        >
                          <button
                            onClick={() => marcarIntegranteDevuelto(i)}
                            className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${
                              i.devuelto
                                ? 'bg-green-500 border-green-500 text-white'
                                : 'border-gray-300 hover:border-orange-400'
                            }`}
                          >
                            {i.devuelto && <FiCheck size={16} />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold ${
                              i.devuelto ? 'line-through text-gray-400' : 'text-gray-800'
                            }`}>
                              {i.numero}. {i.nombre}
                            </p>
                            <p className="text-xs text-gray-500">
                              Pago: {i.metodo_pago} | Garantia: {i.tipo_garantia || 'N/A'} | Bs. {i.monto}
                            </p>
                            {i.devuelto && i.devuelto_fecha && (
                              <p className="text-xs text-green-600 mt-0.5">
                                Devuelto: {new Date(i.devuelto_fecha).toLocaleString('es-BO')}
                              </p>
                            )}
                          </div>
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                            i.devuelto
                              ? 'bg-green-200 text-green-800'
                              : 'bg-orange-200 text-orange-800'
                          }`}>
                            {i.devuelto ? 'Devuelto' : 'Pendiente'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 space-y-2">
                {selected.estado === 'pendiente' && (
                  <div className="flex gap-2">
                    <button onClick={() => marcarDevuelto(selected)} className="btn-primary flex-1 text-sm">
                      Marcar Devuelto
                    </button>
                    <button onClick={() => marcarPerdida(selected)}
                      className="flex-1 py-2 px-4 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700">
                      Marcar Perdida
                    </button>
                  </div>
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
