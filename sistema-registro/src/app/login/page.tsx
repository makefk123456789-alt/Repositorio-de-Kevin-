'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import Image from 'next/image'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) {
      setError('Correo o contrasena incorrectos')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-guindo-900 via-guindo-800 to-guindo-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-32 h-32 mx-auto mb-4 relative">
            <Image
              src="/img/logo.png"
              alt="Creaciones Angy"
              fill
              className="object-contain brightness-0 invert"
            />
          </div>
          <h1 className="text-2xl font-bold text-white">Sistema de Alquileres</h1>
          <p className="text-guindo-200 mt-1">Ingresa con tu cuenta</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl p-8 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="label-field">Correo electronico</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input-field"
              placeholder="tu@correo.com"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="label-field">Contrasena</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input-field"
              placeholder="Tu contrasena"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full text-lg"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className="text-center text-guindo-300 text-xs mt-6">
          Creaciones Angy &copy; {new Date().getFullYear()} - Tarija, Bolivia
        </p>
      </div>
    </div>
  )
}
