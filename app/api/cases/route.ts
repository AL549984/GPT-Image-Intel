import { NextRequest, NextResponse } from "next/server"
import { fetchFeishuCasesPage } from "@/lib/feishu-bitable"
import { createSupabaseRouteClient } from "@/lib/supabase-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function parsePositiveInteger(value: string | null, fallback: number): number {
  if (!value) return fallback

  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback

  return Math.floor(parsed)
}

export async function GET(request: NextRequest) {
  try {
    const page = parsePositiveInteger(request.nextUrl.searchParams.get("page"), 1)
    const limit = parsePositiveInteger(request.nextUrl.searchParams.get("limit"), 20)
    const { supabase } = createSupabaseRouteClient(request)
    let userId: string | null = null
    let likedRecordIds: string[] = []

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        console.error("Failed to read Supabase session:", userError.message)
      }

      if (user) {
        userId = user.id

        const { data, error } = await supabase
          .from("likes")
          .select("item_id")
          .eq("user_id", user.id)

        if (error) {
          console.error("Failed to load likes:", error.message)
        } else {
          likedRecordIds = (data || []).map((row) => String(row.item_id))
        }
      }
    } catch (supabaseError) {
      console.error("Supabase session fallback enabled:", supabaseError)
    }

    const result = await fetchFeishuCasesPage({
      page,
      limit,
      likedRecordIds,
    })

    return NextResponse.json(
      {
        cases: result.cases,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
          hasMore: result.hasMore,
        },
        userId,
      },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (error) {
    console.error("Cases API error:", error)
    const message = error instanceof Error ? error.message : "无法拉取案例数据"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}