'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from './AuthProvider'
import {
  FiHome, FiFileText, FiList, FiDollarSign,
  FiSettings, FiLogOut, FiMessageSquare, FiMenu, FiX
} from 'react-icons/fi'
import { useState } from 'react'

const navItems = [
  { href: '/dashboard', label: 'Inicio', icon: FiHome },
  { href: '/registro', label: 'Nuevo Registro', icon: FiFileText },
  { href: '/alquileres', label: 'Alquileres', icon: FiList },
  { href: '/finanzas', label: 'Finanzas', icon: FiDollarSign },
  { href: '/chat', label: 'Chat Interno', icon: FiMessageSquare },
]

const adminItems = [
  { href: '/admin', label: 'Administracion', icon: FiSettings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { profile, isAdmin, signOut } = useAuth()
  const [open, setOpen] = useState(false)

  const allItems = isAdmin ? [...navItems, ...adminItems] : navItems

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-guindo-800 text-white p-2 rounded-lg shadow-lg"
      >
        {open ? <FiX size={20} /> : <FiMenu size={20} />}
      </button>

      {/* Overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-64 bg-guindo-900 text-white flex flex-col
        transform transition-transform lg:transform-none
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
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

        {/* Nav */}
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
        </nav>

        {/* User */}
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
