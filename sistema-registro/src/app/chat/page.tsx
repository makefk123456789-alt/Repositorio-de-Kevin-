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
  const [loading, setLoading] = useState(true)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadMensajes = async () => {
      const { data } = await supabase
        .from('chat_mensajes')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(200)
      if (data) setMensajes(data)
      setLoading(false)
    }
    loadMensajes()

    const channel = supabase
      .channel('chat-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_mensajes',
      }, (payload) => {
        setMensajes(prev => [...prev, payload.new as ChatMensaje])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  const enviarMensaje = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile || !nuevoMsg.trim()) return

    const msg = nuevoMsg.trim()
    setNuevoMsg('')

    await supabase.from('chat_mensajes').insert({
      usuario_id: profile.id,
      usuario_nombre: profile.nombre,
      mensaje: msg,
    })
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) return 'Hoy'
    if (date.toDateString() === yesterday.toDateString()) return 'Ayer'

    return date.toLocaleDateString('es-BO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('es-BO', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const groupedByDate = mensajes.reduce((acc, msg) => {
    const dateKey = new Date(msg.created_at).toDateString()
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(msg)
    return acc
  }, {} as Record<string, ChatMensaje[]>)

  return (
    <ProtectedLayout>
      <div className="flex flex-col h-[calc(100vh-120px)]">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Chat Grupal Equipo</h1>
          <p className="text-gray-500 text-sm mt-1">Comunicacion interna del equipo en tiempo real</p>
        </div>

        <div className="flex-1 bg-gray-100 rounded-2xl overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-guindo-700 border-t-transparent" />
            </div>
          ) : mensajes.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              No hay mensajes aun. Se el primero en escribir!
            </div>
          ) : (
            Object.entries(groupedByDate).map(([dateKey, msgs]) => (
              <div key={dateKey}>
                {/* Day separator */}
                <div className="flex items-center justify-center my-3">
                  <div className="bg-white px-4 py-1.5 rounded-full shadow-sm text-xs font-medium text-gray-500">
                    {formatDate(msgs[0].created_at)}
                  </div>
                </div>

                {msgs.map(msg => {
                  const isOwn = msg.usuario_id === profile?.id
                  return (
                    <div key={msg.id} className={`flex mb-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${
                        isOwn
                          ? 'bg-guindo-700 text-white rounded-br-md'
                          : 'bg-white text-gray-900 rounded-bl-md'
                      }`}>
                        {!isOwn && (
                          <p className="text-xs font-semibold text-guindo-600 mb-0.5">
                            {msg.usuario_nombre}
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.mensaje}</p>
                        <p className={`text-[10px] mt-1 text-right ${
                          isOwn ? 'text-white/60' : 'text-gray-400'
                        }`}>
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>

        <form onSubmit={enviarMensaje} className="mt-3 flex gap-2">
          <input
            className="input-field flex-1"
            placeholder="Escribe un mensaje..."
            value={nuevoMsg}
            onChange={e => setNuevoMsg(e.target.value)}
            autoComplete="off"
          />
          <button type="submit" className="btn-primary px-6 flex items-center gap-2"
            disabled={!nuevoMsg.trim()}>
            <FiSend size={18} />
          </button>
        </form>
      </div>
    </ProtectedLayout>
  )
}
