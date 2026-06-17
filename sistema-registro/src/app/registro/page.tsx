'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import ProtectedLayout from '@/components/ProtectedLayout'
import toast from 'react-hot-toast'
import { Prenda, IntegranteGrupo, Alquiler } from '@/lib/types'
import { FiPlus, FiTrash2, FiUsers, FiUser } from 'react-icons/fi'

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

  // Group members management
  const [gruposExistentes, setGruposExistentes] = useState<Alquiler[]>([])
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<string | null>(null)
  const [integrantes, setIntegrantes] = useState<{
    nombre: string; garantia: string; tipo_garantia: string;
    metodo_pago: string; prendas: Prenda[]; monto: string; notas: string;
  }[]>([])
  const [addingIntegrante, setAddingIntegrante] = useState(false)

  useEffect(() => {
    if (tipo === 'grupal') {
      supabase.from('alquileres')
        .select('*')
        .eq('tipo', 'grupal')
        .eq('estado', 'pendiente')
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          if (data) setGruposExistentes(data)
        })
    }
  }, [tipo])

  useEffect(() => {
    if (grupoSeleccionado) {
      supabase.from('integrantes_grupo')
        .select('*')
        .eq('alquiler_id', grupoSeleccionado)
        .order('numero', { ascending: true })
        .then(({ data }) => {
          if (data) {
            setIntegrantes(data.map((i: IntegranteGrupo) => ({
              nombre: i.nombre,
              garantia: i.garantia || '',
              tipo_garantia: i.tipo_garantia || 'ci_efectivo',
              metodo_pago: i.metodo_pago,
              prendas: i.prendas || [{ nombre: '', cantidad: 1 }],
              monto: i.monto.toString(),
              notas: i.notas || '',
            })))
          }
        })
    }
  }, [grupoSeleccionado])

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const addPrenda = () => setPrendas(prev => [...prev, { nombre: '', cantidad: 1 }])
  const removePrenda = (i: number) => setPrendas(prev => prev.filter((_, idx) => idx !== i))
  const updatePrenda = (i: number, field: keyof Prenda, value: string | number) => {
    setPrendas(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p))
  }

  const addIntegrante = () => {
    setIntegrantes(prev => [...prev, {
      nombre: '', garantia: '', tipo_garantia: 'ci_efectivo',
      metodo_pago: 'efectivo', prendas: [{ nombre: '', cantidad: 1 }],
      monto: '', notas: '',
    }])
    setAddingIntegrante(true)
  }

  const removeIntegrante = (i: number) => setIntegrantes(prev => prev.filter((_, idx) => idx !== i))

  const updateIntegrante = (i: number, field: string, value: string) => {
    setIntegrantes(prev => prev.map((ing, idx) => idx === i ? { ...ing, [field]: value } : ing))
  }

  const addPrendaIntegrante = (i: number) => {
    setIntegrantes(prev => prev.map((ing, idx) =>
      idx === i ? { ...ing, prendas: [...ing.prendas, { nombre: '', cantidad: 1 }] } : ing
    ))
  }

  const updatePrendaIntegrante = (intIdx: number, prendaIdx: number, field: keyof Prenda, value: string | number) => {
    setIntegrantes(prev => prev.map((ing, idx) =>
      idx === intIdx ? {
        ...ing,
        prendas: ing.prendas.map((p, pi) => pi === prendaIdx ? { ...p, [field]: value } : p)
      } : ing
    ))
  }

  const removePrendaIntegrante = (intIdx: number, prendaIdx: number) => {
    setIntegrantes(prev => prev.map((ing, idx) =>
      idx === intIdx ? {
        ...ing,
        prendas: ing.prendas.filter((_, pi) => pi !== prendaIdx)
      } : ing
    ))
  }

  const handleAddIntegranteToExisting = async () => {
    if (!profile || !grupoSeleccionado) return
    setSaving(true)
    try {
      const newIntegrantes = integrantes.filter(i => i.nombre.trim())
      const { data: existing } = await supabase
        .from('integrantes_grupo')
        .select('numero')
        .eq('alquiler_id', grupoSeleccionado)
        .order('numero', { ascending: false })
        .limit(1)

      const startNum = existing && existing.length > 0 ? existing[0].numero + 1 : 1

      for (let i = 0; i < newIntegrantes.length; i++) {
        const ing = newIntegrantes[i]
        await supabase.from('integrantes_grupo').insert({
          alquiler_id: grupoSeleccionado,
          numero: startNum + i,
          nombre: ing.nombre,
          garantia: ing.garantia || null,
          tipo_garantia: ing.tipo_garantia || null,
          metodo_pago: ing.metodo_pago,
          prendas: ing.prendas.filter(p => p.nombre),
          monto: parseFloat(ing.monto) || 0,
          notas: ing.notas || null,
        })
      }

      const totalMonto = newIntegrantes.reduce((s, i) => s + (parseFloat(i.monto) || 0), 0)
      const { data: alquiler } = await supabase
        .from('alquileres')
        .select('precio_total, cantidad_prendas')
        .eq('id', grupoSeleccionado)
        .single()

      if (alquiler) {
        const newPrendas = newIntegrantes.reduce((s, i) =>
          s + i.prendas.reduce((ps, p) => ps + p.cantidad, 0), 0)
        await supabase.from('alquileres').update({
          precio_total: alquiler.precio_total + totalMonto,
          cantidad_prendas: alquiler.cantidad_prendas + newPrendas,
        }).eq('id', grupoSeleccionado)
      }

      await supabase.from('audit_log').insert({
        usuario_id: profile.id,
        usuario_nombre: profile.nombre,
        accion: 'agregar_integrante',
        detalle: `${newIntegrantes.length} integrante(s) agregado(s) al grupo`,
        alquiler_id: grupoSeleccionado,
      })

      toast.success(`${newIntegrantes.length} integrante(s) agregado(s)`)
      setGrupoSeleccionado(null)
      setIntegrantes([])
      setAddingIntegrante(false)
    } catch {
      toast.error('Error al agregar integrantes')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    setSaving(true)
    try {
      const cantidadTotal = tipo === 'individual'
        ? prendas.reduce((s, p) => s + p.cantidad, 0)
        : integrantes.reduce((s, i) => s + i.prendas.reduce((ps, p) => ps + p.cantidad, 0), 0)

      const totalPrecio = tipo === 'individual'
        ? parseFloat(precioTotal) || 0
        : integrantes.reduce((s, i) => s + (parseFloat(i.monto) || 0), 0)

      const { data: alquiler, error } = await supabase.from('alquileres').insert({
        tipo,
        nombre_cliente: tipo === 'grupal' ? form.responsable_grupo : form.nombre_cliente,
        celular: form.celular,
        ci: form.ci || null,
        garantia: form.garantia,
        tipo_garantia: form.tipo_garantia,
        danza: form.danza,
        prendas: tipo === 'individual' ? prendas.filter(p => p.nombre) : [],
        cantidad_prendas: cantidadTotal,
        precio_total: totalPrecio,
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
      }).select().single()

      if (error) throw error

      if (tipo === 'grupal' && alquiler) {
        for (let i = 0; i < integrantes.length; i++) {
          const ing = integrantes[i]
          if (!ing.nombre.trim()) continue
          await supabase.from('integrantes_grupo').insert({
            alquiler_id: alquiler.id,
            numero: i + 1,
            nombre: ing.nombre,
            garantia: ing.garantia || null,
            tipo_garantia: ing.tipo_garantia || null,
            metodo_pago: ing.metodo_pago,
            prendas: ing.prendas.filter(p => p.nombre),
            monto: parseFloat(ing.monto) || 0,
            notas: ing.notas || null,
          })
        }
      }

      await supabase.from('audit_log').insert({
        usuario_id: profile.id,
        usuario_nombre: profile.nombre,
        accion: 'registro',
        detalle: `Nuevo alquiler ${tipo}: ${form.nombre_cliente || form.responsable_grupo} - ${form.danza}`,
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
      setIntegrantes([])
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
            onClick={() => { setTipo('individual'); setGrupoSeleccionado(null) }}
            className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
              tipo === 'individual'
                ? 'bg-guindo-700 text-white shadow-lg'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <FiUser size={18} /> Individual
          </button>
          <button
            type="button"
            onClick={() => setTipo('grupal')}
            className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
              tipo === 'grupal'
                ? 'bg-guindo-700 text-white shadow-lg'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <FiUsers size={18} /> Grupal
          </button>
        </div>

        {/* For group: option to add to existing group */}
        {tipo === 'grupal' && gruposExistentes.length > 0 && (
          <div className="bg-purple-50 rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-purple-800 text-sm">Agregar integrantes a un grupo existente</h3>
            <select
              className="input-field"
              value={grupoSeleccionado || ''}
              onChange={e => setGrupoSeleccionado(e.target.value || null)}
            >
              <option value="">-- Crear nuevo grupo --</option>
              {gruposExistentes.map(g => (
                <option key={g.id} value={g.id}>
                  #{g.codigo} - {g.nombre_grupo} ({g.responsable_grupo}) - {g.danza}
                </option>
              ))}
            </select>

            {grupoSeleccionado && (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-gray-700">Integrantes actuales:</h4>
                {integrantes.map((ing, i) => (
                  <div key={i} className="bg-white rounded-lg p-3 border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm text-purple-700">Integrante #{i + 1}</span>
                    </div>
                    <p className="text-sm">{ing.nombre} - {ing.metodo_pago} - Bs. {ing.monto}</p>
                  </div>
                ))}

                <button type="button" onClick={addIntegrante}
                  className="w-full py-2 border-2 border-dashed border-purple-300 rounded-xl text-purple-700 text-sm font-medium hover:bg-purple-100 flex items-center justify-center gap-2">
                  <FiPlus size={16} /> Agregar Integrante
                </button>

                {addingIntegrante && integrantes.length > 0 && (
                  <div className="space-y-3">
                    {integrantes.slice(-1).map((ing) => {
                      const realIdx = integrantes.length - 1
                      return (
                        <IntegranteForm key={realIdx} ing={ing} idx={realIdx}
                          updateIntegrante={updateIntegrante}
                          addPrendaIntegrante={addPrendaIntegrante}
                          updatePrendaIntegrante={updatePrendaIntegrante}
                          removePrendaIntegrante={removePrendaIntegrante}
                          removeIntegrante={removeIntegrante}
                        />
                      )
                    })}
                    <button onClick={handleAddIntegranteToExisting} disabled={saving}
                      className="btn-primary w-full text-sm">
                      {saving ? 'Guardando...' : 'Guardar Integrante(s)'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* New registration form */}
        {(!grupoSeleccionado || tipo === 'individual') && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
            {tipo === 'grupal' && (
              <div className="bg-purple-50 rounded-xl p-4 space-y-4">
                <h3 className="text-lg font-bold text-purple-800 flex items-center gap-2">
                  <FiUsers size={20} /> Reserva y Datos del Encargado
                </h3>
                <p className="text-xs text-purple-600">Primero ingresa los datos del responsable del grupo</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label-field">Nombre del grupo *</label>
                    <input
                      className="input-field" required
                      value={form.nombre_grupo}
                      onChange={e => updateField('nombre_grupo', e.target.value)}
                      placeholder="Ej: Grupo Morenada Central"
                    />
                  </div>
                  <div>
                    <label className="label-field">Nombre del responsable *</label>
                    <input
                      className="input-field" required
                      value={form.responsable_grupo}
                      onChange={e => updateField('responsable_grupo', e.target.value)}
                      placeholder="Nombre completo del encargado"
                    />
                  </div>
                  <div>
                    <label className="label-field">Celular del responsable *</label>
                    <input
                      className="input-field" required
                      value={form.celular}
                      onChange={e => updateField('celular', e.target.value)}
                      placeholder="Numero de celular"
                    />
                  </div>
                  <div>
                    <label className="label-field">CI del responsable</label>
                    <input
                      className="input-field"
                      value={form.ci}
                      onChange={e => updateField('ci', e.target.value)}
                      placeholder="Carnet de identidad"
                    />
                  </div>
                </div>
              </div>
            )}

            {tipo === 'individual' && (
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
              </div>
            )}

            {/* Common: Danza */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div>
                <label className="label-field">Fecha de devolucion *</label>
                <input
                  type="date"
                  className="input-field" required
                  value={form.fecha_devolucion}
                  onChange={e => updateField('fecha_devolucion', e.target.value)}
                />
              </div>
            </div>

            {/* Individual: Prendas */}
            {tipo === 'individual' && (
              <>
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
                          <button type="button" onClick={() => removePrenda(i)} className="text-red-500 hover:text-red-700 p-2">
                            <FiTrash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={addPrenda}
                      className="text-guindo-700 text-sm font-medium hover:underline flex items-center gap-1">
                      <FiPlus size={14} /> Agregar prenda
                    </button>
                  </div>
                </div>

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
                    <select className="input-field" required value={form.metodo_pago}
                      onChange={e => updateField('metodo_pago', e.target.value)}>
                      <option value="efectivo">Efectivo</option>
                      <option value="qr">QR</option>
                      <option value="mixto">Mixto</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-field">Tipo de garantia *</label>
                    <select className="input-field" required value={form.tipo_garantia}
                      onChange={e => updateField('tipo_garantia', e.target.value)}>
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
                    <input className="input-field" required value={form.garantia}
                      onChange={e => updateField('garantia', e.target.value)}
                      placeholder="Ej: Carnet mas 100bs" />
                  </div>
                </div>
              </>
            )}

            {/* Group: Integrantes */}
            {tipo === 'grupal' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-800">Lista de Integrantes</h3>
                  <span className="text-sm text-gray-500">{integrantes.length} integrante(s)</span>
                </div>

                {integrantes.map((ing, i) => (
                  <IntegranteForm key={i} ing={ing} idx={i}
                    updateIntegrante={updateIntegrante}
                    addPrendaIntegrante={addPrendaIntegrante}
                    updatePrendaIntegrante={updatePrendaIntegrante}
                    removePrendaIntegrante={removePrendaIntegrante}
                    removeIntegrante={removeIntegrante}
                  />
                ))}

                <button type="button" onClick={addIntegrante}
                  className="w-full py-3 border-2 border-dashed border-guindo-300 rounded-xl text-guindo-700 font-semibold text-sm hover:bg-guindo-50 flex items-center justify-center gap-2">
                  <FiPlus size={18} /> Agregar Integrante
                </button>

                {integrantes.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-700">Total del grupo:</span>
                      <span className="text-xl font-bold text-guindo-700">
                        Bs. {integrantes.reduce((s, i) => s + (parseFloat(i.monto) || 0), 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label-field">Garantia general del grupo</label>
                    <input className="input-field" value={form.garantia}
                      onChange={e => updateField('garantia', e.target.value)}
                      placeholder="Garantia grupal general (opcional)" />
                  </div>
                  <div>
                    <label className="label-field">Tipo de garantia grupal</label>
                    <select className="input-field" value={form.tipo_garantia}
                      onChange={e => updateField('tipo_garantia', e.target.value)}>
                      <option value="ci_efectivo">CI + Efectivo</option>
                      <option value="ci_prenda">CI + Prenda</option>
                      <option value="ci_qr">CI + QR</option>
                      <option value="efectivo">Solo efectivo</option>
                      <option value="qr">Solo QR</option>
                      <option value="prenda">Solo prenda</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="label-field">Notas</label>
              <input className="input-field" value={form.notas}
                onChange={e => updateField('notas', e.target.value)}
                placeholder="Observaciones opcionales" />
            </div>

            <button type="submit" disabled={saving} className="btn-primary w-full text-lg">
              {saving ? 'Registrando...' : 'Registrar Alquiler'}
            </button>
          </form>
        )}
      </div>
    </ProtectedLayout>
  )
}

function IntegranteForm({ ing, idx, updateIntegrante, addPrendaIntegrante, updatePrendaIntegrante, removePrendaIntegrante, removeIntegrante }: {
  ing: { nombre: string; garantia: string; tipo_garantia: string; metodo_pago: string; prendas: Prenda[]; monto: string; notas: string }
  idx: number
  updateIntegrante: (i: number, field: string, value: string) => void
  addPrendaIntegrante: (i: number) => void
  updatePrendaIntegrante: (intIdx: number, prendaIdx: number, field: keyof Prenda, value: string | number) => void
  removePrendaIntegrante: (intIdx: number, prendaIdx: number) => void
  removeIntegrante: (i: number) => void
}) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-200">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-guindo-700">Integrante #{idx + 1}</h4>
        <button type="button" onClick={() => removeIntegrante(idx)}
          className="text-red-500 hover:text-red-700 p-1">
          <FiTrash2 size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label-field text-xs">Nombre completo *</label>
          <input className="input-field text-sm" required value={ing.nombre}
            onChange={e => updateIntegrante(idx, 'nombre', e.target.value)}
            placeholder="Nombre del integrante" />
        </div>
        <div>
          <label className="label-field text-xs">Monto a pagar (Bs.) *</label>
          <input type="number" step="0.01" min="0" className="input-field text-sm"
            value={ing.monto} onChange={e => updateIntegrante(idx, 'monto', e.target.value)}
            placeholder="0.00" />
        </div>
        <div>
          <label className="label-field text-xs">Metodo de pago</label>
          <select className="input-field text-sm" value={ing.metodo_pago}
            onChange={e => updateIntegrante(idx, 'metodo_pago', e.target.value)}>
            <option value="efectivo">Efectivo</option>
            <option value="qr">QR</option>
            <option value="mixto">Mixto</option>
          </select>
        </div>
        <div>
          <label className="label-field text-xs">Tipo de garantia</label>
          <select className="input-field text-sm" value={ing.tipo_garantia}
            onChange={e => updateIntegrante(idx, 'tipo_garantia', e.target.value)}>
            <option value="ci_efectivo">CI + Efectivo</option>
            <option value="ci_prenda">CI + Prenda</option>
            <option value="ci_qr">CI + QR</option>
            <option value="efectivo">Solo efectivo</option>
            <option value="qr">Solo QR</option>
            <option value="prenda">Solo prenda</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label-field text-xs">Detalle de garantia</label>
        <input className="input-field text-sm" value={ing.garantia}
          onChange={e => updateIntegrante(idx, 'garantia', e.target.value)}
          placeholder="Ej: CI 12345 + 100bs" />
      </div>

      <div>
        <label className="label-field text-xs">Prendas</label>
        <div className="space-y-2">
          {ing.prendas.map((p, pi) => (
            <div key={pi} className="flex gap-2 items-center">
              <input className="input-field text-sm flex-1" placeholder="Nombre de prenda"
                value={p.nombre} onChange={e => updatePrendaIntegrante(idx, pi, 'nombre', e.target.value)} />
              <input type="number" min={1} className="input-field text-sm w-16 text-center"
                value={p.cantidad} onChange={e => updatePrendaIntegrante(idx, pi, 'cantidad', parseInt(e.target.value) || 1)} />
              {ing.prendas.length > 1 && (
                <button type="button" onClick={() => removePrendaIntegrante(idx, pi)}
                  className="text-red-400 hover:text-red-600 p-1"><FiTrash2 size={14} /></button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => addPrendaIntegrante(idx)}
            className="text-guindo-700 text-xs font-medium hover:underline flex items-center gap-1">
            <FiPlus size={12} /> Agregar prenda
          </button>
        </div>
      </div>

      <div>
        <label className="label-field text-xs">Notas</label>
        <input className="input-field text-sm" value={ing.notas}
          onChange={e => updateIntegrante(idx, 'notas', e.target.value)}
          placeholder="Observaciones del integrante" />
      </div>
    </div>
  )
}
