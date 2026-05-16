import { NextRequest, NextResponse } from "next/server"
import { createHash } from "node:crypto"
import { createClient } from "@supabase/supabase-js"
import { fetchFeishuCaseByRecordId } from "@/lib/feishu-bitable"
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

type InteractionAction = "like" | "favorite"

type InteractionTarget = {
  storageItemId: string
  notificationCaseId: string
}

type SupabaseLikeError = {
  message?: string
  details?: string
  hint?: string
  code?: string
}

function isInteractionAction(action: unknown): action is InteractionAction {
  return action === "like" || action === "favorite"
}

function getInteractionTable(action: InteractionAction) {
  return action === "like" ? "likes" : "favorites"
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function createStableUuid(value: string) {
  const bytes = createHash("sha256").update(`feishu-record:${value}`).digest().subarray(0, 16)
  bytes[6] = (bytes[6] & 0x0f) | 0x50
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = bytes.toString("hex")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function getItemIdCandidates(itemId: string) {
  const normalizedItemId = itemId.trim()
  if (isUuid(normalizedItemId)) return [normalizedItemId]
  return [normalizedItemId, createStableUuid(normalizedItemId)]
}

function getErrorMessage(error: unknown, fallback = "服务器错误") {
  if (error instanceof Error) return error.message
  if (!error || typeof error !== "object") return String(error || fallback)

  const { message, details, hint, code } = error as SupabaseLikeError
  const readableParts = [message, details, hint, code ? `code: ${code}` : ""].filter(Boolean)
  if (readableParts.length > 0) return readableParts.join(" | ")

  const properties = Object.fromEntries(
    Object.getOwnPropertyNames(error).map((key) => [key, (error as Record<string, unknown>)[key]])
  )
  const constructorName = error.constructor?.name
  const serialized = JSON.stringify({
    ...(constructorName && constructorName !== "Object" ? { name: constructorName } : {}),
    ...properties,
  })

  return serialized && serialized !== "{}" ? serialized : fallback
}

function isInvalidUuidError(error: unknown) {
  if (!error || typeof error !== "object") return false

  const { code, message } = error as SupabaseLikeError
  return code === "22P02" || (message ?? "").toLowerCase().includes("invalid input syntax for type uuid")
}

function isMissingSourceLinkColumnError(error: unknown) {
  if (!error || typeof error !== "object") return false

  const { code, message } = error as SupabaseLikeError
  return code === "PGRST204" && (message ?? "").includes("source_link")
}

async function upsertPromptLibraryCase(
  supabaseClient: { from: (table: string) => any },
  payload: Record<string, unknown>
) {
  const { error } = await supabaseClient
    .from("prompts_library")
    .upsert(payload, { onConflict: "id" })

  if (!isMissingSourceLinkColumnError(error)) return error

  const { source_link, ...fallbackPayload } = payload
  const { error: fallbackError } = await supabaseClient
    .from("prompts_library")
    .upsert(fallbackPayload, { onConflict: "id" })

  return fallbackError
}

async function readSingleInteraction(
  supabaseClient: { from: (table: string) => any },
  table: string,
  userId: string,
  itemId: string
) {
  return supabaseClient
    .from(table)
    .select("id")
    .eq("user_id", userId)
    .eq("item_id", itemId)
    .maybeSingle()
}

async function findExistingInteraction(
  supabaseClient: { from: (table: string) => any },
  table: string,
  userId: string,
  itemIdCandidates: string[]
) {
  let firstAcceptedItemId: string | null = null

  for (const itemId of itemIdCandidates) {
    const { data, error } = await readSingleInteraction(supabaseClient, table, userId, itemId)

    if (error) {
      if (isInvalidUuidError(error)) continue
      console.warn(`Failed to count ${table}:`, getErrorMessage(error))
      continue
    }

    firstAcceptedItemId ??= itemId
    if (data) return { existing: data, storageItemId: itemId }
  }

  return { existing: null, storageItemId: firstAcceptedItemId ?? itemIdCandidates[itemIdCandidates.length - 1] }
}

async function findExistingPromptLibraryId(
  supabaseClient: { from: (table: string) => any },
  itemIdCandidates: string[]
) {
  for (const itemId of itemIdCandidates) {
    const { data, error } = await supabaseClient
      .from("prompts_library")
      .select("id")
      .eq("id", itemId)
      .maybeSingle()

    if (error) {
      if (isInvalidUuidError(error)) continue
      throw error
    }

    if (data?.id) return String(data.id)
  }

  return null
}

async function ensureInteractionTarget(
  supabaseClient: { from: (table: string) => any },
  normalizedItemId: string,
  itemIdCandidates: string[]
): Promise<InteractionTarget | null> {
  const existingPromptLibraryId = await findExistingPromptLibraryId(supabaseClient, itemIdCandidates)
  if (existingPromptLibraryId) {
    return {
      storageItemId: existingPromptLibraryId,
      notificationCaseId: existingPromptLibraryId,
    }
  }

  if (isUuid(normalizedItemId)) return null

  const feishuCase = await fetchFeishuCaseByRecordId(normalizedItemId)
  if (!feishuCase) return null

  const storageItemId = createStableUuid(normalizedItemId)
  const error = await upsertPromptLibraryCase(supabaseClient, {
    id: storageItemId,
    title: feishuCase.title,
    audit_status: feishuCase.status,
    image_url: feishuCase.imageUrl,
    category: feishuCase.scene,
    prompt: feishuCase.prompt,
    text_score: feishuCase.textScore,
    logic_score: feishuCase.logicScore,
    ui_score: feishuCase.uiScore,
    physic_score: feishuCase.physicScore,
    audit_detail: feishuCase.auditDetail,
    total_score: feishuCase.totalScore,
    quality_tag: feishuCase.qualityTag,
    source_link: feishuCase.sourceLink ?? null,
  })

  if (error) throw error

  return {
    storageItemId,
    notificationCaseId: storageItemId,
  }
}

async function countInteractions(
  supabaseClient: { from: (table: string) => any },
  table: string,
  itemIdCandidates: string[]
) {
  let count = 0

  for (const itemId of itemIdCandidates) {
    const { count: nextCount, error } = await supabaseClient
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("item_id", itemId)

    if (error) {
      if (isInvalidUuidError(error)) continue
      console.warn(`Failed to read ${table} status:`, getErrorMessage(error))
      continue
    }

    count += nextCount ?? 0
  }

  return count
}

async function hasInteraction(
  supabaseClient: { from: (table: string) => any },
  table: string,
  userId: string,
  itemIdCandidates: string[]
) {
  for (const itemId of itemIdCandidates) {
    const { data, error } = await readSingleInteraction(supabaseClient, table, userId, itemId)

    if (error) {
      if (isInvalidUuidError(error)) continue
      throw error
    }

    if (data) return true
  }

  return false
}

/**
 * 查找案例所有者逻辑
 */
async function findCaseOwnerId(
  caseId: string,
  supabaseClient: { from: (table: string) => any }
): Promise<string | null> {
  if (!isUuid(caseId)) return null

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

async function getCurrentUser(request: NextRequest) {
  const { supabase } = createSupabaseRouteClient(request)

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      console.error("Auth lookup failed:", getErrorMessage(error))
    }

    return { supabaseAuth: supabase, user }
  } catch (error) {
    console.error("Auth lookup failed:", getErrorMessage(error))
    return { supabaseAuth: supabase, user: null }
  }
}

async function getInteractionStatus(
  supabaseClient: { from: (table: string) => any },
  itemId: string,
  userId?: string
) {
  const itemIdCandidates = getItemIdCandidates(itemId)
  const [likeCount, favoriteCount, liked, favorited] = await Promise.all([
    countInteractions(supabaseClient, "likes", itemIdCandidates),
    countInteractions(supabaseClient, "favorites", itemIdCandidates),
    userId ? hasInteraction(supabaseClient, "likes", userId, itemIdCandidates) : Promise.resolve(false),
    userId ? hasInteraction(supabaseClient, "favorites", userId, itemIdCandidates) : Promise.resolve(false),
  ])

  return {
    liked,
    favorited,
    likeCount,
    favoriteCount,
  }
}

export async function GET(request: NextRequest) {
  try {
    const itemId = request.nextUrl.searchParams.get("itemId")?.trim()

    if (!itemId) {
      return NextResponse.json({ error: "参数缺失" }, { status: 400 })
    }

    const { supabaseAuth, user } = await getCurrentUser(request)
    const interactionClient = supabaseAdmin ?? supabaseAuth
    const status = await getInteractionStatus(interactionClient, itemId, user?.id)

    return NextResponse.json(status)
  } catch (e: any) {
    const message = getErrorMessage(e)
    console.error("Interaction status API Error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // 2. 用 request cookies 读取当前登录态，兼容 Next 16 route handlers
    const { supabaseAuth, user } = await getCurrentUser(request)

    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const body = await request.json()
    const { action, itemId } = body as { action?: unknown; itemId?: unknown }

    if (!action || typeof itemId !== "string" || !itemId.trim()) {
      return NextResponse.json({ error: "参数缺失" }, { status: 400 })
    }

    if (!isInteractionAction(action)) {
      return NextResponse.json({ error: "无效操作" }, { status: 400 })
    }

    const table = getInteractionTable(action)
    const normalizedItemId = itemId.trim()
    const itemIdCandidates = getItemIdCandidates(normalizedItemId)
    const interactionClient = supabaseAdmin ?? supabaseAuth

    // 3. 检查并操作数据库
    const target = await ensureInteractionTarget(interactionClient, normalizedItemId, itemIdCandidates)

    if (!target) {
      return NextResponse.json({ error: "案例不存在，无法进行互动" }, { status: 404 })
    }

    const { existing, storageItemId } = await findExistingInteraction(
      interactionClient,
      table,
      user.id,
      [target.storageItemId]
    )

    if (existing) {
      const { error: delError } = await interactionClient
        .from(table)
        .delete()
        .eq("id", existing.id)
      if (delError) throw delError
      const status = await getInteractionStatus(interactionClient, normalizedItemId, user.id)
      return NextResponse.json({ toggled: false, ...status })
    } else {
      const { error: insError } = await interactionClient
        .from(table)
        .insert({ user_id: user.id, item_id: storageItemId })
      if (insError) throw insError

      // 4. 异步发送通知
      const ownerId = await findCaseOwnerId(target.notificationCaseId, supabaseAuth)
      if (ownerId && ownerId !== user.id && supabaseAdmin) {
        const { data: caseData } = await supabaseAuth
          .from("prompts_library")
          .select("title")
          .eq("id", target.notificationCaseId)
          .maybeSingle()

        const { error: notificationError } = await supabaseAdmin
          .from("notifications")
          .insert({
          user_id: ownerId,
          actor_id: user.id,
          actor_email: user.email || "匿名用户",
          type: action,
          case_id: target.notificationCaseId,
          case_title: caseData?.title || "未知案例",
          })

        if (notificationError) {
          console.error("通知发送失败:", notificationError.message)
        }
      } else if (!supabaseAdmin) {
        console.warn("SUPABASE_SERVICE_ROLE_KEY 未配置，跳过通知写入")
      }
      const status = await getInteractionStatus(interactionClient, normalizedItemId, user.id)
      return NextResponse.json({ toggled: true, ...status })
    }
  } catch (e: any) {
    const message = getErrorMessage(e)
    console.error("API Error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}