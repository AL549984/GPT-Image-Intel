import { createServerClient } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"
import {
  hasSupabaseServiceRoleKey,
  supabaseAnonKey,
  supabaseServiceRoleKey,
  supabaseUrl,
} from "@/lib/supabase-config"

export { hasSupabaseServiceRoleKey, supabaseAnonKey, supabaseServiceRoleKey, supabaseUrl }

function createSupabaseRequestClient(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  return { supabase, response }
}

export function createSupabaseMiddlewareClient(request: NextRequest) {
  return createSupabaseRequestClient(request)
}

export function createSupabaseRouteClient(request: NextRequest) {
  return createSupabaseRequestClient(request)
}
