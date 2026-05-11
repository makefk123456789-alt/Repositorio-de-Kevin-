'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import ProtectedLayout from '@/components/ProtectedLayout'
import toast from 'react-hot-toast'
import { Prenda } from '@/lib/types'

const DANZAS = [
  'Chacarera', 'Morenada', 'Caporales', 'Diablada', 'Tobas',
  'Tinkus', 'Kullawada', 'Pujllay', 'Cueca', 'Bailecito',
  'Salay', 'Saya', 'Rueda', 'Waca Waca', 'Llamerada',
  'Zampoñeros', 'Doctorcitos', 'Antahuara', 'Chunchus', 'Otra'
]

export default function RegistroPage() {
  const { profile } = useAuth()
  const [tipo, setTipo] = useState<'individual' | 'grupal'>('individual')
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    nombre_cliente: '', celular: '', ci: '', danza: '',
    metodo_pago: 'efectivo', fecha_devolucion: '',
    tipo_garantia: 'ci_efectivo', garantia: '',
    nombre_grupo: '', responsable_grupo: '', notas: '',
  })

  const [prendas, setPrendas] = useState<Prenda[]>([{ nombre: '', cantidad: 1 }])
  const [precioTotal, setPrecioTotal] = useState('')

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const addPrenda = () => setPrendas(prev => [...prev, { nombre: '', cantidad: 1 }])
  const removePrenda = (i: number) => setPrendas(prev => prev.filter((_, idx) => idx !== i))
  const updatePrenda = (i: number, field: keyof Prenda, value: string | number) => {
    setPrendas(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    setSaving(true)
    try {
      const cantidadTotal = prendas.reduce((s, p) => s + p.cantidad, 0)

      const { error } = await supabase.from('alquileres').insert({
        tipo,
        nombre_cliente: form.nombre_cliente,
        celular: form.celular,
        ci: form.ci || null,
        garantia: form.garantia,
        tipo_garantia: form.tipo_garantia,
        danza: form.danza,
        prendas: prendas.filter(p => p.nombre),
        cantidad_prendas: cantidadTotal,
        precio_total: parseFloat(precioTotal) || 0,
        metodo_pago: form.metodo_pago,
        fecha_alquiler: new Date().toISOString(),
        fecha_devolucion: form.fecha_devolucion,
        estado: 'pendiente',
        recargo: 0,
        dias_retraso: 0,
        nombre_grupo: tipo === 'grupal' ? form.nombre_grupo : null,
        responsable_grupo: tipo === 'grupal' ? form.responsable_grupo : null,
        notas: form.notas || null,
        registrado_por: profile.id,
        registrado_por_nombre: profile.nombre,
        perdida: false,
      })

      if (error) throw error

      await supabase.from('audit_log').insert({
        usuario_id: profile.id,
        usuario_nombre: profile.nombre,
        accion: 'registro',
        detalle: `Nuevo alquiler ${tipo}: ${form.nombre_cliente} - ${form.danza}`,
      })

      toast.success('Alquiler registrado exitosamente')
      setForm({
        nombre_cliente: '', celular: '', ci: '', danza: '',
        metodo_pago: 'efectivo', fecha_devolucion: '',
        tipo_garantia: 'ci_efectivo', garantia: '',
        nombre_grupo: '', responsable_grupo: '', notas: '',
      })
      setPrendas([{ nombre: '', cantidad: 1 }])
      setPrecioTotal('')
    } catch {
      toast.error('Error al registrar el alquiler')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ProtectedLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nuevo Registro</h1>
          <p className="text-gray-500 text-sm mt-1">Registrar un nuevo alquiler de trajes</p>
        </div>

        {/* Tipo selector */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setTipo('individual')}
            className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
              tipo === 'individual'
                ? 'bg-guindo-700 text-white shadow-lg'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Individual
          </button>
          <button
            type="button"
            onClick={() => setTipo('grupal')}
            className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
              tipo === 'grupal'
                ? 'bg-guindo-700 text-white shadow-lg'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Grupal
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
          {/* Datos del cliente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-field">Nombre del cliente *</label>
              <input
                className="input-field" required
                value={form.nombre_cliente}
                onChange={e => updateField('nombre_cliente', e.target.value)}
                placeholder="Nombre completo"
              />
            </div>
            <div>
              <label className="label-field">Celular *</label>
              <input
                className="input-field" required
                value={form.celular}
                onChange={e => updateField('celular', e.target.value)}
                placeholder="Numero de celular"
              />
            </div>
            <div>
              <label className="label-field">CI</label>
              <input
                className="input-field"
                value={form.ci}
                onChange={e => updateField('ci', e.target.value)}
                placeholder="Carnet de identidad"
              />
            </div>
            <div>
              <label className="label-field">Danza *</label>
              <select
                className="input-field" required
                value={form.danza}
                onChange={e => updateField('danza', e.target.value)}
              >
                <option value="">Seleccionar danza</option>
                {DANZAS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {/* Grupo fields */}
          {tipo === 'grupal' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-purple-50 rounded-xl">
              <div>
                <label className="label-field">Nombre del grupo *</label>
                <input
                  className="input-field" required={tipo === 'grupal'}
                  value={form.nombre_grupo}
                  onChange={e => updateField('nombre_grupo', e.target.value)}
                  placeholder="Nombre del grupo"
                />
              </div>
              <div>
                <label className="label-field">Responsable *</label>
                <input
                  className="input-field" required={tipo === 'grupal'}
                  value={form.responsable_grupo}
                  onChange={e => updateField('responsable_grupo', e.target.value)}
                  placeholder="Nombre del responsable"
                />
              </div>
            </div>
          )}

          {/* Prendas */}
          <div>
            <label className="label-field">Prendas *</label>
            <div className="space-y-2">
              {prendas.map((p, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    className="input-field flex-1"
                    placeholder="Nombre de prenda"
                    value={p.nombre}
                    onChange={e => updatePrenda(i, 'nombre', e.target.value)}
                    required
                  />
                  <input
                    type="number" min={1}
                    className="input-field w-20 text-center"
                    value={p.cantidad}
                    onChange={e => updatePrenda(i, 'cantidad', parseInt(e.target.value) || 1)}
                  />
                  {prendas.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePrenda(i)}
                      className="text-red-500 hover:text-red-700 p-2"
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button" onClick={addPrenda}
                className="text-guindo-700 text-sm font-medium hover:underline"
              >
                + Agregar prenda
              </button>
            </div>
          </div>

          {/* Pago y garantia */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-field">Precio total (Bs.) *</label>
              <input
                type="number" step="0.01" min="0"
                className="input-field" required
                value={precioTotal}
                onChange={e => setPrecioTotal(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="label-field">Metodo de pago *</label>
              <select
                className="input-field" required
                value={form.metodo_pago}
                onChange={e => updateField('metodo_pago', e.target.value)}
              >
                <option value="efectivo">Efectivo</option>
                <option value="qr">QR</option>
                <option value="mixto">Mixto</option>
              </select>
            </div>
            <div>
              <label className="label-field">Tipo de garantia *</label>
              <select
                className="input-field" required
                value={form.tipo_garantia}
                onChange={e => updateField('tipo_garantia', e.target.value)}
              >
                <option value="ci_efectivo">CI + Efectivo (100 Bs)</option>
                <option value="ci_prenda">CI + Prenda de valor</option>
                <option value="ci_qr">CI + QR</option>
                <option value="efectivo">Solo efectivo</option>
                <option value="qr">Solo QR</option>
                <option value="prenda">Solo prenda</option>
              </select>
            </div>
            <div>
              <label className="label-field">Detalle de garantia *</label>
              <input
                className="input-field" required
                value={form.garantia}
                onChange={e => updateField('garantia', e.target.value)}
                placeholder="Ej: Carnet mas 100bs"
              />
            </div>
          </div>

          {/* Fecha devolucion */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-field">Fecha de devolucion *</label>
              <input
                type="date"
                className="input-field" required
                value={form.fecha_devolucion}
                onChange={e => updateField('fecha_devolucion', e.target.value)}
              />
            </div>
            <div>
              <label className="label-field">Notas</label>
              <input
                className="input-field"
                value={form.notas}
                onChange={e => updateField('notas', e.target.value)}
                placeholder="Observaciones opcionales"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn-primary w-full text-lg"
          >
            {saving ? 'Registrando...' : 'Registrar Alquiler'}
          </button>
        </form>
      </div>
    </ProtectedLayout>
  )
}
