'use client'

import { useAuth } from './AuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect, ReactNode } from 'react'
import Sidebar from './Sidebar'

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/login')
    }
  }, [session, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-guindo-800 border-t-transparent" />
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 lg:p-8 pt-16 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  )
}
