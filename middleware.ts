import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseMiddlewareClient } from "@/lib/supabase-server"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── 安全网：排除静态资源 ──
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/public") ||
    pathname === "/favicon.ico" ||
    pathname === "/sitemap.xml" ||
    pathname === "/robots.txt" ||
    /\.(?:svg|png|jpe?g|gif|webp|ico|woff2?|ttf|eot|css|js|map)$/i.test(pathname)
  ) {
    return NextResponse.next()
  }

  // ── 刷新 Supabase session cookie ──
  const { supabase, response } = createSupabaseMiddlewareClient(request)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 已登录 + 在 /login → 跳首页
  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url))
  }

  // 仅 /admin 需要强制登录
  if (!user && pathname.startsWith("/admin")) {
    const url = new URL("/login", request.url)
    url.searchParams.set("redirectTo", pathname)
    return NextResponse.redirect(url)
  }

  // 其余页面（含首页）不强制登录，直接放行
  return response
}

export const config = {
  matcher: ["/((?!_next|static|public|api|favicon\\.ico|sitemap\\.xml|robots\\.txt).*)"],
}
