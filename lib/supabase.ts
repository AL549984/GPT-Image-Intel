import { createClient } from "@supabase/supabase-js"

// Supabase 配置
// 注意：NEXT_PUBLIC_SUPABASE_URL 应为基础 URL，不包含 /rest/v1/
const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tmyjefmykzquwofmodur.supabase.co"
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, "") // 移除可能存在的 /rest/v1/ 后缀
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

// 创建 Supabase 客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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

// 将数据库行转换为前端格式
export function transformRowToCaseItem(row: PromptLibraryRow): CaseItem {
  return {
    id: String(row.id),
    title: row.title || "未命名案例",
    auditStatus: row.audit_status || "待审核",
    imageUrl: row.image_url || "",
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
