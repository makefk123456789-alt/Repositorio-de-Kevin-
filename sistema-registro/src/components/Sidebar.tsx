'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from './AuthProvider'
import {
  FiHome, FiFileText, FiList, FiDollarSign,
  FiSettings, FiLogOut, FiMessageSquare, FiMenu, FiX,
  FiAlertTriangle, FiShoppingBag, FiActivity, FiUsers
} from 'react-icons/fi'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Presencia } from '@/lib/types'

const navItems = [
  { href: '/dashboard', label: 'Inicio', icon: FiHome },
  { href: '/registro', label: 'Nuevo Registro', icon: FiFileText },
  { href: '/alquileres', label: 'Alquileres', icon: FiList },
  { href: '/finanzas', label: 'Finanzas', icon: FiDollarSign },
  { href: '/ventas', label: 'Ventas', icon: FiShoppingBag },
  { href: '/perdidas', label: 'Perdidas de Prendas', icon: FiAlertTriangle },
  { href: '/chat', label: 'Chat Equipo', icon: FiMessageSquare },
  { href: '/historial', label: 'Historial Operaciones', icon: FiActivity },
]

const adminItems = [
  { href: '/admin', label: 'Administracion', icon: FiSettings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { profile, isAdmin, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [presencias, setPresencias] = useState<(Presencia & { nombre?: string })[]>([])
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 15000)
    return () => clearInterval(tick)
  }, [])

  useEffect(() => {
    if (!profile) return

    const updatePresencia = async () => {
      await supabase.from('presencia').upsert({
        id: profile.id,
        en_linea: true,
        ultima_conexion: new Date().toISOString(),
        ultima_actividad: new Date().toISOString(),
      })
    }
    updatePresencia()

    const interval = setInterval(updatePresencia, 30000)

    const handleBeforeUnload = () => {
      supabase.from('presencia').upsert({
        id: profile.id,
        en_linea: false,
        ultima_conexion: new Date().toISOString(),
      })
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    const loadPresencias = async () => {
      const { data: profiles } = await supabase.from('profiles').select('id, nombre')
      const { data: pres } = await supabase.from('presencia').select('*')
      if (pres && profiles) {
        setPresencias(pres.map(p => ({
          ...p,
          nombre: profiles.find(pr => pr.id === p.id)?.nombre
        })))
      }
    }
    loadPresencias()
    const presInterval = setInterval(loadPresencias, 15000)

    return () => {
      clearInterval(interval)
      clearInterval(presInterval)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [profile])

  const allItems = isAdmin ? [...navItems, ...adminItems] : navItems

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-guindo-800 text-white p-2 rounded-lg shadow-lg"
      >
        {open ? <FiX size={20} /> : <FiMenu size={20} />}
      </button>

      {open && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setOpen(false)} />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-64 bg-guindo-900 text-white flex flex-col
        transform transition-transform lg:transform-none
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-guindo-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 relative">
              <Image
                src="/img/logo.png"
                alt="Creaciones Angy"
                fill
                className="object-contain brightness-0 invert"
              />
            </div>
            <div>
              <h2 className="font-bold text-sm">Creaciones Angy</h2>
              <p className="text-guindo-300 text-xs">Sistema de Alquileres</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {allItems.map(item => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-guindo-700 text-white shadow-lg'
                    : 'text-guindo-200 hover:bg-guindo-800 hover:text-white'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            )
          })}

          {/* Online status section */}
          <div className="mt-4 pt-4 border-t border-guindo-700">
            <div className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-guindo-300 uppercase">
              <FiUsers size={14} />
              Equipo
            </div>
            {presencias.map(p => {
              const isOnline = p.en_linea && p.ultima_conexion &&
                (now - new Date(p.ultima_conexion).getTime()) < 60000
              const lastSeen = p.ultima_conexion
                ? new Date(p.ultima_conexion).toLocaleString('es-BO', {
                    hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'
                  })
                : 'Nunca'
              return (
                <div key={p.id} className="flex items-center gap-2 px-4 py-1.5 text-xs">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    isOnline ? 'bg-green-400' : 'bg-red-400'
                  }`} />
                  <span className="text-guindo-200 truncate flex-1">{p.nombre || 'Usuario'}</span>
                  {!isOnline && (
                    <span className="text-guindo-400 text-[10px]">{lastSeen}</span>
                  )}
                </div>
              )
            })}
          </div>
        </nav>

        <div className="p-4 border-t border-guindo-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-guindo-700 rounded-full flex items-center justify-center text-xs font-bold">
              {profile?.nombre?.charAt(0) || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile?.nombre}</p>
              <p className="text-xs text-guindo-300 capitalize">{profile?.role}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-guindo-300 hover:text-white text-sm w-full px-2 py-1.5 rounded-lg hover:bg-guindo-800 transition-colors"
          >
            <FiLogOut size={16} />
            Cerrar sesion
          </button>
        </div>
      </aside>
    </>
  )
}
