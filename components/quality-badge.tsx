"use client"

import { Badge } from "@/components/ui/badge"
import { Star, Award, CheckCircle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CaseItem } from "@/lib/mock-data"

interface QualityBadgeProps {
  qualityTag: CaseItem["qualityTag"]
  className?: string
  size?: "sm" | "default"
}

export function QualityBadge({ qualityTag, className, size = "default" }: QualityBadgeProps) {
  // Extract text before first '|' to handle tags like "优质案例|xxx"
  const cleanTag = qualityTag.split("|")[0].trim()

  const config: Record<string, { icon: typeof Star; label: string; color: string }> = {
    优质案例: {
      icon: Star,
      label: "优质案例",
      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    良好案例: {
      icon: Award,
      label: "良好案例",
      color: "bg-blue-50 text-blue-700 border-blue-200",
    },
    普通案例: {
      icon: CheckCircle,
      label: "普通案例",
      color: "bg-amber-50 text-amber-700 border-amber-200",
    },
    待改进: {
      icon: AlertCircle,
      label: "待改进",
      color: "bg-red-50 text-red-700 border-red-200",
    },
  }

  const tagConfig = config[cleanTag] || {
    icon: CheckCircle,
    label: cleanTag,
    color: "bg-slate-50 text-slate-600 border-slate-200",
  }

  const Icon = tagConfig.icon

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-medium border whitespace-nowrap max-w-[120px]",
        size === "sm" ? "px-1.5 py-0.5 text-xs max-w-[100px]" : "px-2 py-1",
        tagConfig.color,
        className
      )}
    >
      <Icon className={cn("shrink-0", size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />
      <span className="truncate">{tagConfig.label}</span>
    </Badge>
  )
}
