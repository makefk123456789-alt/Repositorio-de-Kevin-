import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'Creaciones Angy - Sistema de Alquileres',
  description: 'Sistema de registro de alquileres de trajes tipicos - Creaciones Angy, Tarija, Bolivia',
  icons: { icon: '/img/logo.png', apple: '/img/logo.png' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className="h-full antialiased">
        <AuthProvider>
          {children}
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  )
}
