// 重新导出 Supabase 类型
export type { CaseItem } from "./supabase"

// 分类常量
export const categories = [
  "全部",
  "视觉/海报",
  "UI/网页设计",
  "角色/头像",
  "YouTube 缩略图",
  "个人资料/头像",
  "信息图/教育视觉",
  "其他创意应用",
  "摄影写实/风格实验",
  "社交媒体帖子",
  "营销物料/电商广告",
  "角色设定/漫画分镜",
  "基础视觉",
] as const

export type Category = (typeof categories)[number]

export type SortOrder = "desc" | "asc" | "default"
