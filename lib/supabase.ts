import { createBrowserClient } from "@supabase/ssr"

// Supabase 配置
// 注意：NEXT_PUBLIC_SUPABASE_URL 应为基础 URL，不包含 /rest/v1/
const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tmyjefmykzquwofmodur.supabase.co"
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, "") // 移除可能存在的 /rest/v1/ 后缀
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

// 创建 Supabase 浏览器客户端（使用 @supabase/ssr，session 存入 cookie，与 middleware 互通）
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// 数据库表类型定义 (对应 prompts_library 表)
export interface PromptLibraryRow {
  id: string | number
  title: string // 主题
  audit_status: "通过" | "未通过" | "待审核" // 审计状态
  image_url: string // 效果图 (Supabase Storage Public URL)
  category: string // 应用场景
  prompt: string // 提示词
  text_score: number // 文本渲染得分
  logic_score: number // 空间逻辑得分
  ui_score: number // UI 质量得分
  physic_score: number // 物理特性得分
  audit_detail: string // AI 审计详情
  total_score: number // 加权综合分
  quality_tag: "优质案例" | "良好案例" | "普通案例" | "待改进" // 质量判定
  source_link?: string | null // 原始工程链接
  created_at?: string
  updated_at?: string
}

// 前端使用的类型 (驼峰命名)
export interface CaseItem {
  id: string
  title: string
  auditStatus: "通过" | "未通过" | "待审核"
  imageUrl: string
  category: string
  prompt: string
  textScore: number
  logicScore: number
  uiScore: number
  physicScore: number
  auditDetail: string
  totalScore: number
  qualityTag: "优质案例" | "良好案例" | "普通案例" | "待改进"
  sourceLink?: string
  createdAt?: string
}

// 将图片字段补全为完整的 Supabase Storage Public URL
// 如果 image_url 已经是完整 URL（以 http 开头）直接返回；
// 否则视为 Storage bucket 中的文件路径，自动拼接公开访问地址。
function getFullImageUrl(raw: string | null | undefined): string {
  if (!raw || raw.trim() === "") return ""
  const trimmed = raw.trim()
  // 已经是完整 URL
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed
  // 兜底拼接 Supabase Storage 公开 URL（bucket 名称 = images）
  return `${supabaseUrl}/storage/v1/object/public/images/${trimmed}`
}

// 将数据库行转换为前端格式
export function transformRowToCaseItem(row: PromptLibraryRow): CaseItem {
  return {
    id: String(row.id),
    title: row.title || "未命名案例",
    auditStatus: row.audit_status || "待审核",
    imageUrl: getFullImageUrl(row.image_url),
    category: row.category || "其他创意应用",
    prompt: row.prompt || "",
    textScore: row.text_score ?? 0,
    logicScore: row.logic_score ?? 0,
    uiScore: row.ui_score ?? 0,
    physicScore: row.physic_score ?? 0,
    auditDetail: row.audit_detail || "",
    totalScore: row.total_score ?? 0,
    qualityTag: row.quality_tag || "普通案例",
    sourceLink: row.source_link || undefined,
    createdAt: row.created_at || undefined,
  }
}

// 获取所有案例 (默认按 total_score 降序)
// TODO: 暂时移除 audit_status === '通过' 的过滤，方便核对全部数据
export async function fetchApprovedCases(): Promise<CaseItem[]> {
  const { data, error } = await supabase
    .from("prompts_library")
    .select("*")
    .order("total_score", { ascending: false })

  if (error) {
    console.error("Error fetching cases:", error)
    return []
  }

  console.log('Total fetched:', (data || []).length)
  return (data || []).map(transformRowToCaseItem)
}

// 获取案例总数统计
export async function fetchCaseStats(): Promise<{
  total: number
  highQuality: number
}> {
  const { count: total, error: totalError } = await supabase
    .from("prompts_library")
    .select("*", { count: "exact", head: true })

  const { count: highQuality, error: hqError } = await supabase
    .from("prompts_library")
    .select("*", { count: "exact", head: true })
    .gte("total_score", 90)

  if (totalError || hqError) {
    console.error("Error fetching stats:", totalError || hqError)
    return { total: 0, highQuality: 0 }
  }

  return {
    total: total || 0,
    highQuality: highQuality || 0,
  }
}

// ============ 通知系统 ============

export interface NotificationItem {
  id: string
  userId: string
  actorId: string
  actorEmail: string
  type: "like" | "favorite"
  caseId: string
  caseTitle: string
  read: boolean
  createdAt: string
}

/**
 * 从 image_url 中提取上传者的 user_id
 * URL 格式: https://xxx.supabase.co/storage/v1/object/public/images/{user_id}/{timestamp}.{ext}
 */
export function extractOwnerIdFromImageUrl(imageUrl: string): string | null {
  if (!imageUrl) return null
  try {
    const match = imageUrl.match(/\/images\/([0-9a-f-]{36})\//)
    return match?.[1] ?? null
  } catch {
    return null
  }
}

/**
 * 查找案例的所有者 user_id
 * 优先使用 submitted_by 字段，回退到从 image_url 提取
 */
export async function findCaseOwnerId(caseId: string): Promise<string | null> {
  const { data } = await supabase
    .from("prompts_library")
    .select("submitted_by, image_url")
    .eq("id", caseId)
    .maybeSingle()
  if (!data) return null
  if (data.submitted_by) return data.submitted_by
  return extractOwnerIdFromImageUrl(data.image_url)
}

/**
 * 创建通知
 */
export async function createNotification(params: {
  userId: string
  actorId: string
  actorEmail: string
  type: "like" | "favorite"
  caseId: string
  caseTitle: string
}): Promise<{ success: boolean; error?: string }> {
  // 不给自己发通知
  if (params.userId === params.actorId) return { success: true }
  const { error } = await supabase.from("notifications").insert({
    user_id: params.userId,
    actor_id: params.actorId,
    actor_email: params.actorEmail,
    type: params.type,
    case_id: params.caseId,
    case_title: params.caseTitle,
  })
  if (error) {
    console.error("Failed to create notification:", error)
    return { success: false, error: error.message }
  }
  return { success: true }
}

/**
 * 获取当前用户的通知列表
 */
export async function fetchNotifications(userId: string): Promise<NotificationItem[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) {
    console.error("Error fetching notifications:", error)
    return []
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    actorId: row.actor_id,
    actorEmail: row.actor_email || "匿名用户",
    type: row.type,
    caseId: row.case_id,
    caseTitle: row.case_title || "未知案例",
    read: row.read ?? false,
    createdAt: row.created_at,
  }))
}

/**
 * 标记所有通知为已读
 */
export async function markAllNotificationsRead(userId: string) {
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false)
}

/**
 * 获取未读通知数量
 */
export async function fetchUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false)
  if (error) return 0
  return count ?? 0
}

/**
 * 删除案例（仅限案例所有者）
 */
export async function deleteCase(caseId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  // 验证归属权：检查 submitted_by 或 image_url
  const { data: row } = await supabase
    .from("prompts_library")
    .select("submitted_by, image_url")
    .eq("id", caseId)
    .maybeSingle()

  if (!row) return { success: false, error: "案例不存在" }

  const ownerId = row.submitted_by || extractOwnerIdFromImageUrl(row.image_url)
  if (ownerId !== userId) return { success: false, error: "无权删除此案例" }

  // 删除关联的 likes 和 favorites
  await Promise.all([
    supabase.from("likes").delete().eq("item_id", caseId),
    supabase.from("favorites").delete().eq("item_id", caseId),
    supabase.from("notifications").delete().eq("case_id", caseId),
  ])

  // 删除案例记录
  const { error } = await supabase
    .from("prompts_library")
    .delete()
    .eq("id", caseId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
