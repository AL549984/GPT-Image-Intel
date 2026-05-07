"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { getClientSessionUser, supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"

type UserRole = "admin" | "user" | null

interface UserRoleContextValue {
  role: UserRole
  isAdmin: boolean
  isLoading: boolean
}

const UserRoleContext = createContext<UserRoleContextValue>({
  role: null,
  isAdmin: false,
  isLoading: true,
})

export function UserRoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchRole(authUser?: User | null) {
      const user = authUser ?? await getClientSessionUser()
      if (!user) {
        setRole(null)
        setIsLoading(false)
        return
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      if (error || !data) {
        console.warn("Failed to fetch user role, defaulting to 'user':", error)
        setRole("user")
      } else {
        setRole(data?.role ?? "user")
      }
      setIsLoading(false)
    }

    fetchRole()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchRole(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <UserRoleContext.Provider value={{ role, isAdmin: role === "admin", isLoading }}>
      {children}
    </UserRoleContext.Provider>
  )
}

export function useUserRole() {
  return useContext(UserRoleContext)
}
