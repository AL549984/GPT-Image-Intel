import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseMiddlewareClient } from "@/lib/supabase-server"

// 不需要鉴权的公开路径
const publicPaths = ["/login", "/auth"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 公开路径直接放行
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  const { supabase, response } = createSupabaseMiddlewareClient(request)

  // 获取当前用户会话
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 未登录 → 重定向到 /login
  if (!user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/login"
    loginUrl.searchParams.set("redirectTo", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * 匹配所有路径，但排除：
     * - _next/static (静态资源)
     * - _next/image (图片优化)
     * - favicon.ico, sitemap.xml, robots.txt
     * - 公共资源文件夹
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
