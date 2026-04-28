import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"

// Admin client bypasses RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Verify the user is authenticated via cookies
    let response = NextResponse.next({ request })
    const supabaseAuth = createServerClient(
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

    const {
      data: { user },
    } = await supabaseAuth.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const title = (formData.get("title") as string)?.trim()
    const category = formData.get("category") as string
    const prompt = (formData.get("prompt") as string)?.trim()
    const sourceLink = (formData.get("sourceLink") as string)?.trim() || null

    if (!file || !title || !category || !prompt) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 })
    }

    // 1. Upload image via admin client (bypasses Storage RLS)
    const ext = file.name.split(".").pop() || "png"
    const fileName = `${user.id}/${Date.now()}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadErr } = await supabaseAdmin.storage
      .from("images")
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      })

    if (uploadErr) {
      return NextResponse.json(
        { error: `图片上传失败: ${uploadErr.message}` },
        { status: 500 }
      )
    }

    // 2. Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from("images")
      .getPublicUrl(fileName)

    // 3. Insert into prompts_library via admin client (bypasses RLS)
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("prompts_library")
      .insert({
        title,
        category,
        prompt,
        image_url: urlData.publicUrl,
        audit_status: "待审核",
        text_score: 0,
        logic_score: 0,
        ui_score: 0,
        physic_score: 0,
        audit_detail: "",
        total_score: 0,
        quality_tag: "普通案例",
        submitted_by: user.id,
      })
      .select("id")
      .single()

    if (insertErr) {
      return NextResponse.json(
        { error: `数据写入失败: ${insertErr.message}` },
        { status: 500 }
      )
    }

    // 4. Trigger AI audit in background (fire-and-forget)
    const auditUrl = new URL("/api/audit", request.url)
    fetch(auditUrl.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId: inserted.id }),
    }).catch(() => {})

    return NextResponse.json({ success: true, caseId: inserted.id })
  } catch (err: any) {
    console.error("Submit API error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
