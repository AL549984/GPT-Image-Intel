const DEFAULT_SUPABASE_URL = "https://tmyjefmykzquwofmodur.supabase.co"

const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL

export const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, "")
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
export const hasSupabaseServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
export const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey