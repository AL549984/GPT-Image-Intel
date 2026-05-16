import "server-only"

import { createHash } from "node:crypto"
import NodeCache from "node-cache"

const FEISHU_API_BASE = "https://open.feishu.cn/open-apis"
const FEISHU_LIST_PAGE_SIZE = 500
const DEFAULT_CASES_PAGE_SIZE = 20
const MAX_CASES_PAGE_SIZE = 100
const RAW_RECORDS_CACHE_TTL_SECONDS = 600
const IMAGE_URL_CACHE_TTL_SECONDS = 300
const TOKEN_CACHE_KEY = "tenant_access_token"
const RECORDS_CACHE_KEY = "bitable_records"
const FEISHU_TRANSIENT_RETRY_LIMIT = 3

const feishuCache = new NodeCache({ stdTTL: RAW_RECORDS_CACHE_TTL_SECONDS, useClones: false })
const imageUrlCache = new NodeCache({ stdTTL: IMAGE_URL_CACHE_TTL_SECONDS, useClones: false })

type FeishuAuditStatus = "通过" | "未通过" | "待审核"
type FeishuQualityTag = "优质案例" | "良好案例" | "普通案例" | "待改进"

interface FeishuApiResponse<T> {
  code: number
  msg?: string
  message?: string
  data?: T
}

interface FeishuTenantTokenData {
  tenant_access_token: string
  expire: number
}

interface FeishuAttachment {
  file_token?: string
  tmp_url?: string
  url?: string
  download_url?: string
}

interface FeishuRecord {
  record_id: string
  fields: Record<string, unknown>
}

interface FeishuRecordListData {
  has_more?: boolean
  page_token?: string
  items?: FeishuRecord[]
}

interface FeishuBatchDownloadUrlItem {
  file_token?: string
  tmp_download_url?: string
}

interface FeishuBatchDownloadUrlData {
  tmp_download_urls?: FeishuBatchDownloadUrlItem[]
}

export interface FeishuCaseItem {
  id: string
  recordId: string
  title: string
  status: FeishuAuditStatus
  imageUrl: string
  scene: string
  prompt: string
  textScore: number
  logicScore: number
  uiScore: number
  physicScore: number
  auditDetail: string
  totalScore: number
  qualityTag: FeishuQualityTag
  sourceLink?: string
  createdAt?: string
  isLiked: boolean
  likedByCurrentUser: boolean
}

export interface FeishuCasesPageResult {
  cases: FeishuCaseItem[]
  page: number
  limit: number
  total: number
  totalPages: number
  hasMore: boolean
}

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function readOptionalEnv(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback
}

function getFieldName(envName: string, fallback: string): string {
  return readOptionalEnv(envName, fallback)
}

function getFieldValue(fields: Record<string, unknown>, fieldName: string): unknown {
  if (fieldName in fields) return fields[fieldName]

  const matchedKey = Object.keys(fields).find(
    (key) => key.trim().toLowerCase() === fieldName.trim().toLowerCase()
  )

  return matchedKey ? fields[matchedKey] : undefined
}

function toStringValue(value: unknown): string {
  if (value == null) return ""
  if (typeof value === "string") return value.trim()
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (Array.isArray(value)) {
    return value.map((item) => toStringValue(item)).filter(Boolean).join(" ")
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>
    const preferredKeys = ["text", "name", "value", "label"]
    for (const key of preferredKeys) {
      const next = record[key]
      if (typeof next === "string" && next.trim()) return next.trim()
    }
  }
  return ""
}

function toNumberValue(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  const raw = toStringValue(value)
  if (!raw) return 0
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeAuditStatus(value: string): FeishuAuditStatus {
  if (value === "通过" || value === "未通过") return value
  return "待审核"
}

function normalizeQualityTag(value: string, totalScore: number): FeishuQualityTag {
  if (value === "优质案例" || value === "良好案例" || value === "普通案例" || value === "待改进") {
    return value
  }

  if (totalScore >= 90) return "优质案例"
  if (totalScore >= 80) return "良好案例"
  if (totalScore >= 60) return "普通案例"
  return "待改进"
}

function clampPage(value: number): number {
  if (!Number.isFinite(value) || value < 1) return 1
  return Math.floor(value)
}

function clampLimit(value: number): number {
  if (!Number.isFinite(value) || value < 1) return DEFAULT_CASES_PAGE_SIZE
  return Math.min(Math.floor(value), MAX_CASES_PAGE_SIZE)
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function createStableUuid(value: string) {
  const bytes = createHash("sha256").update(`feishu-record:${value}`).digest().subarray(0, 16)
  bytes[6] = (bytes[6] & 0x0f) | 0x50
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = bytes.toString("hex")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function extractAttachments(value: unknown): FeishuAttachment[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is FeishuAttachment => Boolean(item) && typeof item === "object")
  }

  if (value && typeof value === "object") {
    return [value as FeishuAttachment]
  }

  return []
}

function resolveDirectImageUrl(value: unknown): string {
  if (typeof value === "string") return value.trim()

  const attachments = extractAttachments(value)
  for (const attachment of attachments) {
    const candidate =
      toStringValue(attachment.tmp_url) ||
      toStringValue(attachment.url) ||
      toStringValue(attachment.download_url)

    if (candidate) return candidate
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    return (
      toStringValue(record.tmp_url) ||
      toStringValue(record.url) ||
      toStringValue(record.download_url)
    )
  }

  return ""
}

async function parseFeishuResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as FeishuApiResponse<T> & T

  if (!response.ok || payload.code !== 0) {
    console.log("[Feishu] API error payload:", payload)
    throw new Error(payload.msg || payload.message || `Feishu API request failed with status ${response.status}`)
  }

  if (payload.data != null) {
    return payload.data
  }

  return payload as T
}

async function getTenantAccessToken(): Promise<string> {
  const cachedToken = feishuCache.get<string>(TOKEN_CACHE_KEY)
  if (cachedToken) return cachedToken

  const appId = readRequiredEnv("FEISHU_APP_ID")
  const appSecret = readRequiredEnv("FEISHU_APP_SECRET")

  const response = await fetch(`${FEISHU_API_BASE}/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
    cache: "no-store",
  })

  const data = await parseFeishuResponse<FeishuTenantTokenData>(response)
  const tokenTtl = Math.max(Math.min(data.expire - 60, RAW_RECORDS_CACHE_TTL_SECONDS), 60)
  feishuCache.set(TOKEN_CACHE_KEY, data.tenant_access_token, tokenTtl)
  return data.tenant_access_token
}

async function listBitableRecords(tenantAccessToken: string): Promise<FeishuRecord[]> {
  const cachedRecords = feishuCache.get<FeishuRecord[]>(RECORDS_CACHE_KEY)
  if (cachedRecords) return cachedRecords

  const appToken = readRequiredEnv("FEISHU_BITABLE_APP_TOKEN")
  const tableId = readRequiredEnv("FEISHU_BITABLE_TABLE_ID")
  const viewId = readOptionalEnv("FEISHU_BITABLE_VIEW_ID")
  const records: FeishuRecord[] = []
  let pageToken = ""

  do {
    const searchParams = new URLSearchParams({
      page_size: String(FEISHU_LIST_PAGE_SIZE),
    })

    if (viewId) searchParams.set("view_id", viewId)
    if (pageToken) searchParams.set("page_token", pageToken)

    let data: FeishuRecordListData | null = null

    for (let attempt = 1; attempt <= FEISHU_TRANSIENT_RETRY_LIMIT; attempt += 1) {
      const response = await fetch(
        `${FEISHU_API_BASE}/bitable/v1/apps/${appToken}/tables/${tableId}/records?${searchParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${tenantAccessToken}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        }
      )

      try {
        data = await parseFeishuResponse<FeishuRecordListData>(response)
        break
      } catch (error) {
        const isTransient = error instanceof Error && error.message.includes("Data not ready")

        if (isTransient && attempt < FEISHU_TRANSIENT_RETRY_LIMIT) {
          await wait(attempt * 1000)
          continue
        }

        console.log("[Feishu] records request context:", {
          appToken,
          tableId,
          viewId: viewId || null,
        })
        throw error
      }
    }

    if (!data) {
      throw new Error("Feishu records response is empty after retries")
    }

    records.push(...(data.items || []))
    pageToken = data.has_more ? data.page_token || "" : ""
  } while (pageToken)

  feishuCache.set(RECORDS_CACHE_KEY, records, RAW_RECORDS_CACHE_TTL_SECONDS)
  return records
}

async function batchResolveAttachmentUrls(
  tenantAccessToken: string,
  fileTokens: string[]
): Promise<Map<string, string>> {
  const uniqueFileTokens = Array.from(new Set(fileTokens.filter(Boolean)))
  const resolvedUrls = new Map<string, string>()
  const tokensToFetch: string[] = []

  for (const token of uniqueFileTokens) {
    const cachedUrl = imageUrlCache.get<string>(token)
    if (cachedUrl) {
      resolvedUrls.set(token, cachedUrl)
      continue
    }

    tokensToFetch.push(token)
  }

  if (tokensToFetch.length === 0) {
    return resolvedUrls
  }

  const extra = readOptionalEnv("FEISHU_BITABLE_ATTACHMENT_EXTRA")
  const chunkSize = 50

  for (let index = 0; index < tokensToFetch.length; index += chunkSize) {
    const chunk = tokensToFetch.slice(index, index + chunkSize)
    const searchParams = new URLSearchParams()

    for (const token of chunk) {
      searchParams.append("file_tokens", token)
    }

    if (extra) {
      searchParams.set("extra", extra)
    }

    try {
      const response = await fetch(
        `${FEISHU_API_BASE}/drive/v1/medias/batch_get_tmp_download_url?${searchParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${tenantAccessToken}`,
            "Content-Type": "application/json; charset=utf-8",
          },
          cache: "no-store",
        }
      )

      const data = await parseFeishuResponse<FeishuBatchDownloadUrlData>(response)

      for (const item of data.tmp_download_urls || []) {
        const token = item.file_token?.trim()
        const url = item.tmp_download_url?.trim()

        if (!token || !url) continue

        resolvedUrls.set(token, url)
        imageUrlCache.set(token, url, IMAGE_URL_CACHE_TTL_SECONDS)
      }
    } catch (error) {
      console.log("[Feishu] batch attachment fallback:", {
        chunkSize: chunk.length,
        error: error instanceof Error ? error.message : String(error),
      })

      for (const token of chunk) {
        const singleParams = new URLSearchParams()
        singleParams.append("file_tokens", token)
        if (extra) {
          singleParams.set("extra", extra)
        }

        try {
          const response = await fetch(
            `${FEISHU_API_BASE}/drive/v1/medias/batch_get_tmp_download_url?${singleParams.toString()}`,
            {
              headers: {
                Authorization: `Bearer ${tenantAccessToken}`,
                "Content-Type": "application/json; charset=utf-8",
              },
              cache: "no-store",
            }
          )

          const data = await parseFeishuResponse<FeishuBatchDownloadUrlData>(response)
          const item = data.tmp_download_urls?.[0]
          const url = item?.tmp_download_url?.trim()

          if (!url) continue

          resolvedUrls.set(token, url)
          imageUrlCache.set(token, url, IMAGE_URL_CACHE_TTL_SECONDS)
        } catch (singleError) {
          console.log("[Feishu] skip attachment token:", {
            token,
            error: singleError instanceof Error ? singleError.message : String(singleError),
          })
        }
      }
    }
  }

  return resolvedUrls
}

async function resolveAttachmentUrlMap(records: FeishuRecord[], tenantAccessToken: string): Promise<Map<string, string>> {
  const imageField = getFieldName("FEISHU_BITABLE_IMAGE_FIELD", "效果图")
  const fileTokens: string[] = []

  for (const record of records) {
    const attachments = extractAttachments(getFieldValue(record.fields || {}, imageField))
    for (const attachment of attachments) {
      const fileToken = toStringValue(attachment.file_token)
      if (fileToken) fileTokens.push(fileToken)
    }
  }

  return batchResolveAttachmentUrls(tenantAccessToken, fileTokens)
}

function resolveImageUrl(value: unknown, attachmentUrlMap: Map<string, string>): string {
  const attachments = extractAttachments(value)
  for (const attachment of attachments) {
    const fileToken = toStringValue(attachment.file_token)
    if (!fileToken) continue

    const resolvedUrl = attachmentUrlMap.get(fileToken)
    if (resolvedUrl) return resolvedUrl
  }

  const directUrl = resolveDirectImageUrl(value)
  if (directUrl) return directUrl

  return ""
}

function transformRecordToCaseItem(
  record: FeishuRecord,
  likedRecordIds: Set<string>,
  attachmentUrlMap: Map<string, string>
): FeishuCaseItem {
  const titleField = getFieldName("FEISHU_BITABLE_TITLE_FIELD", "主题")
  const sceneField = getFieldName("FEISHU_BITABLE_SCENE_FIELD", "应用场景")
  const promptField = getFieldName("FEISHU_BITABLE_PROMPT_FIELD", "prompt")
  const imageField = getFieldName("FEISHU_BITABLE_IMAGE_FIELD", "效果图")
  const statusField = getFieldName("FEISHU_BITABLE_STATUS_FIELD", "审计状态")
  const textScoreField = getFieldName("FEISHU_BITABLE_TEXT_SCORE_FIELD", "文本渲染得分")
  const logicScoreField = getFieldName("FEISHU_BITABLE_LOGIC_SCORE_FIELD", "空间逻辑得分")
  const uiScoreField = getFieldName("FEISHU_BITABLE_UI_SCORE_FIELD", "UI 质量得分")
  const physicScoreField = getFieldName("FEISHU_BITABLE_PHYSIC_SCORE_FIELD", "物理特性得分")
  const auditDetailField = getFieldName("FEISHU_BITABLE_AUDIT_DETAIL_FIELD", "AI 审计详情")
  const totalScoreField = getFieldName("FEISHU_BITABLE_TOTAL_SCORE_FIELD", "加权综合分")
  const qualityTagField = getFieldName("FEISHU_BITABLE_QUALITY_TAG_FIELD", "质量判定")
  const sourceLinkField = getFieldName("FEISHU_BITABLE_SOURCE_LINK_FIELD", "source_link")
  const createdAtField = getFieldName("FEISHU_BITABLE_CREATED_AT_FIELD", "created_at")

  const fields = record.fields || {}
  const totalScore = toNumberValue(getFieldValue(fields, totalScoreField))
  const isLiked = likedRecordIds.has(record.record_id) || likedRecordIds.has(createStableUuid(record.record_id))

  return {
    id: record.record_id,
    recordId: record.record_id,
    title: toStringValue(getFieldValue(fields, titleField)) || "未命名案例",
    status: normalizeAuditStatus(toStringValue(getFieldValue(fields, statusField))),
    imageUrl: resolveImageUrl(getFieldValue(fields, imageField), attachmentUrlMap),
    scene: toStringValue(getFieldValue(fields, sceneField)) || "其他创意应用",
    prompt: toStringValue(getFieldValue(fields, promptField)),
    textScore: toNumberValue(getFieldValue(fields, textScoreField)),
    logicScore: toNumberValue(getFieldValue(fields, logicScoreField)),
    uiScore: toNumberValue(getFieldValue(fields, uiScoreField)),
    physicScore: toNumberValue(getFieldValue(fields, physicScoreField)),
    auditDetail: toStringValue(getFieldValue(fields, auditDetailField)),
    totalScore,
    qualityTag: normalizeQualityTag(toStringValue(getFieldValue(fields, qualityTagField)), totalScore),
    sourceLink: toStringValue(getFieldValue(fields, sourceLinkField)) || undefined,
    createdAt: toStringValue(getFieldValue(fields, createdAtField)) || undefined,
    isLiked,
    likedByCurrentUser: isLiked,
  }
}

export async function fetchFeishuCasesPage(options?: {
  page?: number
  limit?: number
  likedRecordIds?: string[]
}): Promise<FeishuCasesPageResult> {
  const page = clampPage(options?.page ?? 1)
  const limit = clampLimit(options?.limit ?? DEFAULT_CASES_PAGE_SIZE)
  const likedRecordIds = new Set((options?.likedRecordIds || []).map(String))
  const tenantAccessToken = await getTenantAccessToken()
  const records = await listBitableRecords(tenantAccessToken)
  const totalScoreField = getFieldName("FEISHU_BITABLE_TOTAL_SCORE_FIELD", "加权综合分")
  const sortedRecords = [...records].sort((left, right) => {
    const leftScore = toNumberValue(getFieldValue(left.fields || {}, totalScoreField))
    const rightScore = toNumberValue(getFieldValue(right.fields || {}, totalScoreField))
    return rightScore - leftScore
  })

  const total = sortedRecords.length
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit)
  const startIndex = (page - 1) * limit
  const pageRecords = sortedRecords.slice(startIndex, startIndex + limit)
  const attachmentUrlMap = await resolveAttachmentUrlMap(pageRecords, tenantAccessToken)
  const pageCases = pageRecords.map((record) => transformRecordToCaseItem(record, likedRecordIds, attachmentUrlMap))

  return {
    cases: pageCases,
    page,
    limit,
    total,
    totalPages,
    hasMore: page < totalPages,
  }
}

export async function fetchFeishuCaseByRecordId(recordId: string): Promise<FeishuCaseItem | null> {
  const normalizedRecordId = recordId.trim()
  if (!normalizedRecordId) return null

  const tenantAccessToken = await getTenantAccessToken()
  const records = await listBitableRecords(tenantAccessToken)
  const record = records.find((item) => item.record_id === normalizedRecordId)

  if (!record) return null

  const attachmentUrlMap = await resolveAttachmentUrlMap([record], tenantAccessToken)
  return transformRecordToCaseItem(record, new Set(), attachmentUrlMap)
}
