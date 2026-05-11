'use client'

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/lib/types'

interface AuthContextType {
  session: Session | null
  profile: Profile | null
  loading: boolean
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  profile: null,
  loading: true,
  isAdmin: false,
  signIn: async () => ({ error: null }),
  signOut: async () => {},
})

function saveProfile(p: Profile | null) {
  try {
    if (p) localStorage.setItem('angy_profile', JSON.stringify(p))
    else localStorage.removeItem('angy_profile')
  } catch { /* ignore */ }
}

function loadProfile(): Profile | null {
  try {
    const s = localStorage.getItem('angy_profile')
    return s ? JSON.parse(s) : null
  } catch { return null }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(loadProfile)
  const [loading, setLoading] = useState(true)
  const fetchingRef = useRef(false)
  const initializedRef = useRef(false)

  const fetchProfile = async (userId: string) => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (data) {
        setProfile(data)
        saveProfile(data)
      }
    } finally {
      fetchingRef.current = false
    }
  }

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!active) return
      setSession(s)
      if (s?.user) {
        fetchProfile(s.user.id).then(() => {
          if (active) {
            initializedRef.current = true
            setLoading(false)
          }
        })
      } else {
        saveProfile(null)
        setProfile(null)
        initializedRef.current = true
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (!active) return
      if (event === 'SIGNED_OUT') {
        setSession(null)
        setProfile(null)
        saveProfile(null)
        setLoading(false)
        return
      }
      if (s) {
        setSession(s)
        if (s.user && initializedRef.current) fetchProfile(s.user.id)
      }
      if (initializedRef.current) setLoading(false)
    })

    return () => { active = false; subscription.unsubscribe() }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error ? { error: error.message } : { error: null }
  }

  const signOut = async () => {
    saveProfile(null)
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{
      session,
      profile,
      loading,
      isAdmin: profile?.role === 'admin',
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
