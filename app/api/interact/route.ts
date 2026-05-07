import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import {
  createSupabaseRouteClient,
  hasSupabaseServiceRoleKey,
  supabaseServiceRoleKey,
  supabaseUrl,
} from "@/lib/supabase-server"

// 1. Admin Client (绕过 RLS，用于处理通知)
const supabaseAdmin = hasSupabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : null

interface CaseOwnerRecord {
  submitted_by: string | null
  image_url: string | null
}

/**
 * 查找案例所有者逻辑
 */
async function findCaseOwnerId(
  caseId: string,
  supabaseClient: { from: (table: string) => any }
): Promise<string | null> {
  const { data } = await supabaseClient
    .from("prompts_library")
    .select("submitted_by, image_url")
    .eq("id", caseId)
    .maybeSingle()
  const caseOwner = data as CaseOwnerRecord | null
  if (!caseOwner) return null
  if (caseOwner.submitted_by) return caseOwner.submitted_by
  const match = caseOwner.image_url?.match(/\/images\/([0-9a-f-]{36})\//)
  return match?.[1] ?? null
}

export async function POST(request: NextRequest) {
  try {
    // 2. 用 request cookies 读取当前登录态，兼容 Next 16 route handlers
    const { supabase: supabaseAuth } = createSupabaseRouteClient(request)
    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser()

    if (userError) {
      console.error("Auth lookup failed:", userError.message)
    }

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

    // 3. 检查并操作数据库
    const { data: existing, error: existingError } = await supabaseAuth
      .from(table)
      .select("id")
      .eq("user_id", user.id)
      .eq("item_id", itemId)
      .maybeSingle()

    if (existingError) {
      throw existingError
    }

    if (existing) {
      const { error: delError } = await supabaseAuth
        .from(table)
        .delete()
        .eq("id", existing.id)
      if (delError) throw delError
      return NextResponse.json({ toggled: false })
    } else {
      const { error: insError } = await supabaseAuth
        .from(table)
        .insert({ user_id: user.id, item_id: itemId })
      if (insError) throw insError

      // 4. 异步发送通知
      const ownerId = await findCaseOwnerId(itemId, supabaseAuth)
      if (ownerId && ownerId !== user.id && supabaseAdmin) {
        const { data: caseData } = await supabaseAuth
          .from("prompts_library")
          .select("title")
          .eq("id", itemId)
          .maybeSingle()

        const { error: notificationError } = await supabaseAdmin
          .from("notifications")
          .insert({
          user_id: ownerId,
          actor_id: user.id,
          actor_email: user.email || "匿名用户",
          type: action,
          case_id: itemId,
          case_title: caseData?.title || "未知案例",
          })

        if (notificationError) {
          console.error("通知发送失败:", notificationError.message)
        }
      } else if (!supabaseAdmin) {
        console.warn("SUPABASE_SERVICE_ROLE_KEY 未配置，跳过通知写入")
      }
      return NextResponse.json({ toggled: true })
    }
  } catch (e: any) {
    console.error("API Error:", e.message)
    return NextResponse.json({ error: e.message || "服务器错误" }, { status: 500 })
  }
}