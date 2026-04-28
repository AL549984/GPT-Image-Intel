"use client"

import { useState } from "react"
import Image from "next/image"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScoreProgress } from "@/components/score-progress"
import { QualityBadge } from "@/components/quality-badge"
import { Copy, Check, Sparkles, ExternalLink, MessageSquareQuote, ZoomIn } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { CaseItem } from "@/lib/supabase"

interface CaseDetailSheetProps {
  item: CaseItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CaseDetailSheet({ item, open, onOpenChange }: CaseDetailSheetProps) {
  const [copied, setCopied] = useState(false)
  const [imgError, setImgError] = useState(false)
  const { toast } = useToast()

  if (!item) return null

  const hasPrompt = item.prompt && item.prompt.trim() !== ""

  const parsePrompt = (prompt: string): string => {
    if (!prompt) return ""
    try {
      const parsed = JSON.parse(prompt)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return prompt
    }
  }

  const displayPrompt = parsePrompt(item.prompt)
  const isJsonPrompt = item.prompt.startsWith("{") || item.prompt.startsWith("[")

  const handleCopy = async () => {
    if (hasPrompt) {
      await navigator.clipboard.writeText(item.prompt)
      setCopied(true)
      toast({ title: "复制成功", description: "提示词已复制到剪贴板" })
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto border-l border-slate-200 bg-white p-0 sm:max-w-xl"
      >
        <div className="space-y-6 p-6">
          {/* Header */}
          <SheetHeader className="space-y-3 p-0">
            <div className="flex flex-wrap items-center gap-2">
              <QualityBadge qualityTag={item.qualityTag} />
              <Badge variant="secondary" className="bg-slate-100 text-xs text-slate-600">
                {item.category}
              </Badge>
              {hasPrompt && (
                <Badge
                  variant="outline"
                  className="gap-1 border-blue-200 bg-blue-50 text-xs text-blue-600"
                >
                  <Sparkles className="h-3 w-3" />
                  包含提示词
                </Badge>
              )}
            </div>
            <SheetTitle className="text-xl font-semibold tracking-wide text-slate-900">
              {item.title}
            </SheetTitle>
            <SheetDescription className="sr-only">案例详情</SheetDescription>
          </SheetHeader>

          {/* Image - original aspect ratio */}
          <div className="space-y-2">
            <div className="overflow-hidden rounded-lg border border-slate-200/80">
              {item.imageUrl && item.imageUrl.trim() !== "" && !imgError ? (
                <Image
                  src={item.imageUrl}
                  alt={item.title}
                  width={800}
                  height={600}
                  className="h-auto w-full object-contain"
                  sizes="(max-width: 640px) 100vw, 600px"
                  priority
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="flex h-[200px] w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
                  <span className="text-sm">暂无图片</span>
                </div>
              )}
            </div>
            {item.imageUrl && item.imageUrl.trim() !== "" && !imgError && (
              <a
                href={item.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 transition-colors hover:text-slate-600"
              >
                <ZoomIn className="h-3.5 w-3.5" />
                查看原图
              </a>
            )}
          </div>

          {/* Scores */}
          <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-slate-700">评分详情</h4>
              <span className="text-2xl font-bold text-slate-900">
                {item.totalScore}
                <span className="ml-1 text-sm font-normal text-slate-400">/ 100</span>
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <ScoreProgress label="文本渲染" score={item.textScore} />
              <ScoreProgress label="空间逻辑" score={item.logicScore} />
              <ScoreProgress label="UI 质量" score={item.uiScore} />
              <ScoreProgress label="物理特性" score={item.physicScore} />
            </div>
          </div>

          {/* Prompt */}
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Sparkles className="h-4 w-4 text-blue-500" />
              提示词 / Prompt
              {isJsonPrompt && (
                <Badge variant="outline" className="ml-2 border-slate-200 text-xs">
                  JSON
                </Badge>
              )}
            </h4>
            <div className="relative min-h-[100px] rounded-xl border border-slate-200 bg-slate-50 p-4">
              {hasPrompt ? (
                <>
                  <pre className="max-h-[200px] overflow-y-auto whitespace-pre-wrap pr-12 font-mono text-sm leading-relaxed text-slate-700">
                    {displayPrompt}
                  </pre>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute right-2 top-2 h-8 gap-1.5 px-2 text-slate-500 hover:text-slate-900"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-500" />
                        <span className="text-xs text-emerald-500">已复制</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span className="text-xs">复制</span>
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <p className="text-sm italic text-slate-400">
                  暂无公开提示词 · 仅供灵感参考
                </p>
              )}
            </div>
          </div>

          {/* Audit Detail */}
          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <h4 className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <MessageSquareQuote className="h-4 w-4 text-blue-500" />
              AI 审计详情
            </h4>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
              {item.auditDetail || '正在抓取 AI 审计深度分析...'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              className="flex-1 bg-slate-900 text-white hover:bg-slate-800"
              onClick={handleCopy}
              disabled={!hasPrompt}
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  复制提示词
                </>
              )}
            </Button>
            {item.sourceLink && (
              <Button
                variant="outline"
                className="flex-1 border-slate-200 text-slate-700 hover:bg-slate-50"
                onClick={() => window.open(item.sourceLink, "_blank")}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                查看原始工程
              </Button>
            )}
          </div>

          {/* Metadata */}
          {item.createdAt && (
            <div className="border-t border-slate-100 pt-2">
              <p className="text-xs text-slate-400">
                上传于 {new Date(item.createdAt).toLocaleDateString("zh-CN")}
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
