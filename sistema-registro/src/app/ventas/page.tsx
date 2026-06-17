'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import ProtectedLayout from '@/components/ProtectedLayout'
import { Venta } from '@/lib/types'
import toast from 'react-hot-toast'
import { FiShoppingBag, FiPlus, FiTrash2, FiPrinter } from 'react-icons/fi'

export default function VentasPage() {
  const { profile, isAdmin } = useAuth()
  const [ventas, setVentas] = useState<Venta[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    nombre_comprador: '',
    prendas_vendidas: '',
    precio_venta: '',
  })

  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey(k => k + 1)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('ventas')
        .select('*')
        .order('created_at', { ascending: false })
      if (data) setVentas(data)
      setLoading(false)
    }
    load()
  }, [reloadKey])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    setSaving(true)
    try {
      const { error } = await supabase.from('ventas').insert({
        nombre_comprador: form.nombre_comprador,
        prendas_vendidas: form.prendas_vendidas,
        precio_venta: parseFloat(form.precio_venta) || 0,
        fecha_venta: new Date().toISOString(),
        registrado_por: profile.id,
        registrado_por_nombre: profile.nombre,
      })

      if (error) throw error

      await supabase.from('audit_log').insert({
        usuario_id: profile.id,
        usuario_nombre: profile.nombre,
        accion: 'venta',
        detalle: `Venta registrada: ${form.nombre_comprador} - Bs. ${form.precio_venta}`,
      })

      toast.success('Venta registrada exitosamente')
      setForm({ nombre_comprador: '', prendas_vendidas: '', precio_venta: '' })
      setShowForm(false)
      reload()
    } catch {
      toast.error('Error al registrar la venta')
    } finally {
      setSaving(false)
    }
  }

  const solicitarEliminacion = async (venta: Venta) => {
    if (!profile) return
    if (isAdmin) {
      const { error } = await supabase.from('ventas').delete().eq('id', venta.id)
      if (error) {
        toast.error('Error al eliminar')
      } else {
        await supabase.from('audit_log').insert({
          usuario_id: profile.id,
          usuario_nombre: profile.nombre,
          accion: 'eliminar_venta',
          detalle: `Venta eliminada: ${venta.nombre_comprador} - Bs. ${venta.precio_venta}`,
        })
        toast.success('Venta eliminada')
        reload()
      }
    } else {
      const { error } = await supabase.from('solicitudes_edicion').insert({
        venta_id: venta.id,
        tipo: 'eliminar_venta',
        solicitante_id: profile.id,
        solicitante_nombre: profile.nombre,
        motivo: `Solicita eliminar venta de ${venta.nombre_comprador}`,
        estado: 'pendiente',
      })
      if (error) toast.error('Error al enviar solicitud')
      else toast.success('Solicitud enviada al administrador')
    }
  }

  const printVenta = (venta: Venta) => {
    const win = window.open('', '_blank', 'width=300,height=400')
    if (!win) return
    win.document.write(`
      <html><head><title>Recibo Venta #${venta.codigo}</title>
      <style>
        body { font-family: monospace; font-size: 12px; padding: 10px; max-width: 280px; margin: 0 auto; }
        h2 { text-align: center; margin: 5px 0; font-size: 14px; }
        hr { border: 1px dashed #000; }
        .row { display: flex; justify-content: space-between; margin: 3px 0; }
        .center { text-align: center; }
        @media print { body { margin: 0; padding: 5px; } }
      </style></head><body>
      <h2>CREACIONES ANGY</h2>
      <p class="center">Recibo de Venta</p>
      <hr>
      <div class="row"><span>Codigo:</span><strong>#${venta.codigo}</strong></div>
      <div class="row"><span>Fecha:</span><span>${new Date(venta.fecha_venta).toLocaleString('es-BO')}</span></div>
      <div class="row"><span>Comprador:</span><span>${venta.nombre_comprador}</span></div>
      <hr>
      <p><strong>Prendas:</strong></p>
      <p>${venta.prendas_vendidas}</p>
      <hr>
      <div class="row"><strong>TOTAL:</strong><strong>Bs. ${venta.precio_venta}</strong></div>
      <hr>
      <div class="row"><span>Vendido por:</span><span>${venta.registrado_por_nombre}</span></div>
      <p class="center" style="margin-top:10px;font-size:10px;">Creaciones Angy - Tarija, Bolivia</p>
      <script>window.print();</script>
      </body></html>
    `)
    win.document.close()
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FiShoppingBag className="text-guindo-700" /> Ventas
            </h1>
            <p className="text-gray-500 text-sm mt-1">Registro de ventas de prendas</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2 text-sm">
            <FiPlus size={16} /> Nueva Venta
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-gray-800">Registrar Nueva Venta</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label-field">Nombre del comprador *</label>
                <input className="input-field" required value={form.nombre_comprador}
                  onChange={e => setForm(prev => ({ ...prev, nombre_comprador: e.target.value }))}
                  placeholder="Nombre completo" />
              </div>
              <div>
                <label className="label-field">Precio de venta (Bs.) *</label>
                <input type="number" step="0.01" min="0" className="input-field" required
                  value={form.precio_venta}
                  onChange={e => setForm(prev => ({ ...prev, precio_venta: e.target.value }))}
                  placeholder="0.00" />
              </div>
            </div>
            <div>
              <label className="label-field">Prendas vendidas *</label>
              <textarea className="input-field" rows={3} required value={form.prendas_vendidas}
                onChange={e => setForm(prev => ({ ...prev, prendas_vendidas: e.target.value }))}
                placeholder="Describe las prendas vendidas (ej: 1 pollera roja, 2 sombreros negros)" />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="btn-primary flex-1 text-sm">
                {saving ? 'Guardando...' : 'Registrar Venta'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 py-2 px-4 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-guindo-700 border-t-transparent" />
          </div>
        ) : ventas.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-400">
            No hay ventas registradas
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Comprador</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Prendas</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Fecha</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Vendedor</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Precio</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {ventas.map(v => (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500">{v.codigo}</td>
                      <td className="px-4 py-3 font-medium">{v.nombre_comprador}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs max-w-48 truncate">{v.prendas_vendidas}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {new Date(v.fecha_venta).toLocaleString('es-BO')}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{v.registrado_por_nombre}</td>
                      <td className="px-4 py-3 text-right font-medium">Bs. {v.precio_venta}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => printVenta(v)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" title="Imprimir">
                            <FiPrinter size={16} />
                          </button>
                          <button onClick={() => solicitarEliminacion(v)}
                            className="p-1.5 rounded-lg hover:bg-red-100 text-red-500" title={isAdmin ? 'Eliminar' : 'Solicitar eliminacion'}>
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      </td>
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
