"use client"

import { useState } from "react"
import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScoreProgress } from "@/components/score-progress"
import { QualityBadge } from "@/components/quality-badge"
import { Copy, Check, Sparkles, X, ExternalLink, MessageSquareQuote } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { CaseItem } from "@/lib/mock-data"

interface CaseModalProps {
  item: CaseItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CaseModal({ item, open, onOpenChange }: CaseModalProps) {
  const [copied, setCopied] = useState(false)
  const [imgError, setImgError] = useState(false)
  const { toast } = useToast()

  if (!item) return null

  const hasPrompt = item.prompt && item.prompt.trim() !== ""

  // 解析 prompt，支持纯文本和 JSON 格式
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
      toast({
        title: "复制成功",
        description: "提示词已复制到剪贴板",
      })
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-500"
    if (score >= 80) return "text-blue-500"
    if (score >= 70) return "text-amber-500"
    return "text-red-500"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto border-border/50 bg-card/95 p-0 backdrop-blur-xl">
        {/* 关闭按钮 */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute -right-2 -top-12 z-50 rounded-full bg-foreground/90 p-2 text-background transition-all hover:bg-foreground hover:scale-110"
        >
          <X className="h-5 w-5" />
          <span className="sr-only">关闭</span>
        </button>

        {/* 顶部：大图展示 + 质量标签 */}
        <div className="relative aspect-video w-full overflow-hidden rounded-t-lg">
          {item.imageUrl && item.imageUrl.trim() !== "" && !imgError ? (
            <Image
              src={item.imageUrl}
              alt={item.title}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 896px"
              priority
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
              <span className="text-sm">暂无图片</span>
            </div>
          )}
          {/* 质量标签 - 悬浮在图片上方 */}
          <div className="absolute left-4 top-4">
            <QualityBadge qualityTag={item.qualityTag} />
          </div>
          {/* 综合评分 */}
          <div className="absolute right-4 top-4 flex flex-col items-center rounded-xl bg-background/90 px-4 py-2 backdrop-blur-sm">
            <span className={`text-3xl font-bold ${getScoreColor(item.totalScore)}`}>
              {item.totalScore}
            </span>
            <span className="text-xs text-muted-foreground">综合分</span>
          </div>
        </div>

        <div className="space-y-5 p-6">
          {/* 标题和分类 */}
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary">{item.category}</Badge>
              {hasPrompt && (
                <Badge variant="outline" className="gap-1 border-primary/50 text-primary">
                  <Sparkles className="h-3 w-3" />
                  包含提示词
                </Badge>
              )}
            </div>
            <DialogTitle className="text-balance text-2xl font-semibold">
              {item.title}
            </DialogTitle>
          </DialogHeader>

          {/* 四维度评分 - 紧凑水平布局 */}
          <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
            <h4 className="mb-4 flex items-center gap-2 text-sm font-medium">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/20 text-xs text-primary">
                A
              </span>
              四维度评分
            </h4>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <ScoreProgress label="文本渲染" score={item.textScore} />
              <ScoreProgress label="空间逻辑" score={item.logicScore} />
              <ScoreProgress label="UI 质量" score={item.uiScore} />
              <ScoreProgress label="物理特性" score={item.physicScore} />
            </div>
          </div>

          {/* 核心区：Prompt 复制区（占据最大空间）*/}
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              提示词 / Prompt
              {isJsonPrompt && (
                <Badge variant="outline" className="ml-2 text-xs">
                  JSON 格式
                </Badge>
              )}
            </h4>
            <div className="relative min-h-[120px] rounded-lg border border-border/50 bg-muted/50 p-4">
              {hasPrompt ? (
                <>
                  <pre className="max-h-[200px] overflow-y-auto pr-16 font-mono text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                    {displayPrompt}
                  </pre>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute right-2 top-2 h-8 gap-1.5 px-2"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-xs text-green-500">已复制</span>
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
                <p className="text-sm italic text-muted-foreground">
                  暂无公开提示词 · 仅供灵感参考
                </p>
              )}
            </div>
          </div>

          {/* 底部：AI 审计详情（专家点评）*/}
          <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-medium">
              <MessageSquareQuote className="h-4 w-4 text-primary" />
              AI 审计详情 · 专家点评
            </h4>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
              {item.auditDetail || '正在抓取 AI 审计深度分析...'}
            </p>
          </div>

          {/* 操作按钮 */}
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button
              className="flex-1"
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
                className="flex-1"
                onClick={() => window.open(item.sourceLink, "_blank")}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                查看原始工程
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
