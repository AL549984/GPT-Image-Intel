import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Use service role key for backend operations (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Google Gemini free tier: 15 RPM for gemini-2.0-flash
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ""
const GEMINI_MODEL = "gemini-2.0-flash"

interface AuditScores {
  text_score: number
  logic_score: number
  ui_score: number
  physic_score: number
  audit_detail: string
}

async function auditWithGemini(imageUrl: string, prompt: string, title: string, category: string): Promise<AuditScores> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not configured")
  }

  const systemPrompt = `你是一个专业的 AI 图像生成质量审计专家。请根据以下维度对这个 AI 图像生成案例进行评分（每项 0-100 分）：

1. **文本渲染得分 (text_score)**：图片中文字的清晰度、准确性、排版质量。如果图片中没有文字，根据是否应该有文字来评判。
2. **空间逻辑得分 (logic_score)**：空间关系是否合理，物体大小比例是否正确，透视是否准确。
3. **UI 质量得分 (ui_score)**：整体视觉效果、美观度、色彩搭配、构图、细节精度。
4. **物理特性得分 (physic_score)**：物理规律是否正确（光影、反射、材质、重力等）。

请严格按照以下 JSON 格式输出，不要输出其他内容：
{
  "text_score": <number>,
  "logic_score": <number>,
  "ui_score": <number>,
  "physic_score": <number>,
  "audit_detail": "<一段 50-150 字的中文审计总结>"
}`

  const userMessage = `案例信息：
- 标题：${title}
- 应用场景：${category}
- 使用的提示词：${prompt}

请分析这张 AI 生成的图片并打分。`

  // Download image and convert to base64 for Gemini
  const parts: any[] = [{ text: `${systemPrompt}\n\n${userMessage}` }]

  try {
    const imgResp = await fetch(imageUrl)
    if (imgResp.ok) {
      const buffer = await imgResp.arrayBuffer()
      const base64 = Buffer.from(buffer).toString("base64")
      const mimeType = imgResp.headers.get("content-type") || "image/png"
      parts.push({
        inline_data: { mime_type: mimeType, data: base64 },
      })
    }
  } catch {
    // If image download fails, continue with text-only
    parts[0] = {
      text: `${systemPrompt}\n\n${userMessage}\n\n（注意：无法加载图片，请根据提示词和案例信息进行合理评估）`,
    }
  }

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
      }),
    }
  )

  if (!resp.ok) {
    const errText = await resp.text()
    throw new Error(`Gemini API error ${resp.status}: ${errText}`)
  }

  const data = await resp.json()
  return parseGeminiResponse(data)
}

function parseGeminiResponse(data: any): AuditScores {
  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text || ""

  // Extract JSON from the response
  const jsonMatch = text.match(/\{[\s\S]*?\}/)
  if (!jsonMatch) {
    throw new Error("Failed to parse Gemini response")
  }

  const parsed = JSON.parse(jsonMatch[0])
  return {
    text_score: clamp(parsed.text_score ?? 70, 0, 100),
    logic_score: clamp(parsed.logic_score ?? 70, 0, 100),
    ui_score: clamp(parsed.ui_score ?? 70, 0, 100),
    physic_score: clamp(parsed.physic_score ?? 70, 0, 100),
    audit_detail: (parsed.audit_detail || "AI 审计完成").slice(0, 500),
  }
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(v)))
}

function computeTotalScore(scores: AuditScores): number {
  // Weighted average matching existing scoring system
  return Math.round(
    scores.text_score * 0.2 +
      scores.logic_score * 0.25 +
      scores.ui_score * 0.35 +
      scores.physic_score * 0.2
  )
}

function getQualityTag(total: number): string {
  if (total >= 90) return "优质案例"
  if (total >= 80) return "良好案例"
  if (total >= 60) return "普通案例"
  return "待改进"
}

export async function POST(request: NextRequest) {
  try {
    const { caseId } = await request.json()

    if (!caseId) {
      return NextResponse.json({ error: "caseId is required" }, { status: 400 })
    }

    // Fetch the case
    const { data: row, error: fetchErr } = await supabaseAdmin
      .from("prompts_library")
      .select("*")
      .eq("id", caseId)
      .single()

    if (fetchErr || !row) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 })
    }

    let scores: AuditScores

    try {
      scores = await auditWithGemini(
        row.image_url,
        row.prompt,
        row.title,
        row.category
      )
    } catch (aiErr: any) {
      // If AI fails, use a simple heuristic fallback
      console.error("AI audit failed, using fallback:", aiErr.message)
      const hasPrompt = row.prompt && row.prompt.trim().length > 20
      const base = hasPrompt ? 75 : 60
      scores = {
        text_score: base + Math.floor(Math.random() * 10),
        logic_score: base + Math.floor(Math.random() * 10),
        ui_score: base + Math.floor(Math.random() * 10),
        physic_score: base + Math.floor(Math.random() * 10),
        audit_detail: "自动评估完成（AI 审计暂不可用，使用基础评估）。",
      }
    }

    const totalScore = computeTotalScore(scores)
    const qualityTag = getQualityTag(totalScore)

    // Update the case with scores
    const { error: updateErr } = await supabaseAdmin
      .from("prompts_library")
      .update({
        text_score: scores.text_score,
        logic_score: scores.logic_score,
        ui_score: scores.ui_score,
        physic_score: scores.physic_score,
        audit_detail: scores.audit_detail,
        total_score: totalScore,
        quality_tag: qualityTag,
        audit_status: "通过",
      })
      .eq("id", caseId)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      totalScore,
      qualityTag,
    })
  } catch (err: any) {
    console.error("Audit API error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
