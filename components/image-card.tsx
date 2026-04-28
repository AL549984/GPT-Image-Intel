"use client"

import { useState } from "react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { QualityBadge } from "@/components/quality-badge"
import { ImageOff } from "lucide-react"
import type { CaseItem } from "@/lib/mock-data"

interface ImageCardProps {
  item: CaseItem
  onClick: () => void
}

export function ImageCard({ item, onClick }: ImageCardProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [imgError, setImgError] = useState(false)
  const hasImage = !!(item.imageUrl && item.imageUrl.trim() !== "") && !imgError

  const getScoreColor = (score: number) => {
    if (score >= 90) return "bg-emerald-50 text-emerald-700"
    if (score >= 80) return "bg-blue-50 text-blue-700"
    if (score >= 70) return "bg-amber-50 text-amber-700"
    return "bg-red-50 text-red-700"
  }

  return (
    <div
      className="group cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
      onClick={onClick}
    >
      {/* Clean image - no overlay text */}
      <div className="relative overflow-hidden">
        {!hasImage ? (
          <div className="flex h-[200px] w-full flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/60">
              <ImageOff className="h-6 w-6" />
            </div>
            <span className="mt-2 text-xs font-medium">暂无图片</span>
          </div>
        ) : (
          <>
            {isLoading && (
              <Skeleton className="absolute inset-0 z-10 h-full min-h-[200px] w-full" />
            )}
            <Image
              src={item.imageUrl}
              alt={item.title}
              width={400}
              height={300}
              className={`h-auto w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] ${
                isLoading ? "opacity-0" : "opacity-100"
              }`}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              onLoad={() => setIsLoading(false)}
              onError={() => setImgError(true)}
            />
          </>
        )}
      </div>

      {/* Info below image */}
      <div className="space-y-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <QualityBadge qualityTag={item.qualityTag} size="sm" />
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getScoreColor(item.totalScore)}`}
          >
            {item.totalScore} 分
          </span>
        </div>
        <h3 className="line-clamp-2 text-sm font-medium leading-snug tracking-wide text-slate-800">
          {item.title}
        </h3>
        <Badge variant="secondary" className="bg-slate-100 text-xs text-slate-500">
          {item.category}
        </Badge>
      </div>
    </div>
  )
}
