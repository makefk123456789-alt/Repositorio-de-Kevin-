'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import ProtectedLayout from '@/components/ProtectedLayout'
import { ChatMensaje } from '@/lib/types'
import { FiSend } from 'react-icons/fi'

export default function ChatPage() {
  const { profile } = useAuth()
  const [mensajes, setMensajes] = useState<ChatMensaje[]>([])
  const [nuevoMsg, setNuevoMsg] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true

    supabase
      .from('chat_mensajes')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(200)
      .then(({ data }) => {
        if (active && data) setMensajes(data)
      })

    const channel = supabase
      .channel('chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_mensajes' }, payload => {
        setMensajes(prev => [...prev, payload.new as ChatMensaje])
      })
      .subscribe()

    return () => { active = false; supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevoMsg.trim() || !profile || sending) return

    setSending(true)
    const { error } = await supabase.from('chat_mensajes').insert({
      usuario_id: profile.id,
      usuario_nombre: profile.nombre,
      mensaje: nuevoMsg.trim(),
    })
    if (!error) setNuevoMsg('')
    setSending(false)
  }

  return (
    <ProtectedLayout>
      <div className="flex flex-col h-[calc(100vh-6rem)]">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Chat Interno</h1>
          <p className="text-gray-500 text-sm mt-1">Comunicacion entre el equipo</p>
        </div>

        {/* Messages */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm overflow-y-auto p-4 space-y-3">
          {mensajes.map(m => {
            const isOwn = m.usuario_id === profile?.id
            return (
              <div key={m.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${
                  isOwn
                    ? 'bg-guindo-700 text-white rounded-br-md'
                    : 'bg-gray-100 text-gray-900 rounded-bl-md'
                }`}>
                  {!isOwn && (
                    <p className="text-xs font-semibold text-guindo-600 mb-1">{m.usuario_nombre}</p>
                  )}
                  <p className="text-sm">{m.mensaje}</p>
                  <p className={`text-[10px] mt-1 ${isOwn ? 'text-guindo-200' : 'text-gray-400'}`}>
                    {new Date(m.created_at).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )
          })}
          {mensajes.length === 0 && (
            <div className="flex items-center justify-center h-full text-gray-400">
              No hay mensajes aun. Inicia la conversacion.
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} className="mt-3 flex gap-2">
          <input
            className="input-field flex-1"
            placeholder="Escribe un mensaje..."
            value={nuevoMsg}
            onChange={e => setNuevoMsg(e.target.value)}
          />
          <button
            type="submit"
            disabled={sending || !nuevoMsg.trim()}
            className="btn-primary px-5 flex items-center gap-2"
          >
            <FiSend size={16} />
          </button>
        </form>
      </div>
    </ProtectedLayout>
  )
}
