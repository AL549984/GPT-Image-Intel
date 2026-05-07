"use client"

import { useState, useEffect, useCallback } from "react"
import { getClientSessionUser, supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getClientSessionUser().then((sessionUser) => {
      setUser(sessionUser)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
  }, [])

  /** Returns true if logged in; if not, redirects to /login and returns false */
  const requireAuth = useCallback(() => {
    if (user) return true
    window.location.assign("/login")
    return false
  }, [user])

  return { user, loading, signOut, requireAuth, isLoggedIn: !!user }
}
