import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"

// Admin client bypasses RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function createAuthClient(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    }
  )
  return supabase
}

/**
 * 查找案例所有者
 */
async function findCaseOwnerId(caseId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("prompts_library")
    .select("submitted_by, image_url")
    .eq("id", caseId)
    .maybeSingle()
  if (!data) return null
  if (data.submitted_by) return data.submitted_by
  // 从 image_url 提取 user_id
  const match = data.image_url?.match(/\/images\/([0-9a-f-]{36})\//)
  return match?.[1] ?? null
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAuth = createAuthClient(request)
    const { data: { user } } = await supabaseAuth.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const body = await request.json()
    const { action, itemId } = body as { action: "like" | "favorite"; itemId: string }

    if (!action || !itemId) {
      return NextResponse.json({ error: "参数缺失" }, { status: 400 })
    }

    if (action !== "like" && action !== "favorite") {
      return NextResponse.json({ error: "无效操作" }, { status: 400 })
    }

    const table = action === "like" ? "likes" : "favorites"

    // 检查是否已存在
    const { data: existing } = await supabaseAdmin
      .from(table)
      .select("id")
      .eq("user_id", user.id)
      .eq("item_id", itemId)
      .maybeSingle()

    if (existing) {
      // 取消点赞/收藏
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .eq("user_id", user.id)
        .eq("item_id", itemId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ toggled: false })
    } else {
      // 添加点赞/收藏
      const { error } = await supabaseAdmin
        .from(table)
        .insert({ user_id: user.id, item_id: itemId })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // 发送通知给案例所有者
      const ownerId = await findCaseOwnerId(itemId)
      if (ownerId && ownerId !== user.id) {
        // 获取案例标题
        const { data: caseData } = await supabaseAdmin
          .from("prompts_library")
          .select("title")
          .eq("id", itemId)
          .maybeSingle()

        await supabaseAdmin.from("notifications").insert({
          user_id: ownerId,
          actor_id: user.id,
          actor_email: user.email || "匿名用户",
          type: action,
          case_id: itemId,
          case_title: caseData?.title || "未知案例",
        })
      }

      return NextResponse.json({ toggled: true })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "服务器错误" }, { status: 500 })
  }
}
