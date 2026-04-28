"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Image from "next/image"
import { ImageCard } from "./image-card"
import { CaseDetailSheet } from "./case-detail-sheet"
import { QualityBadge } from "./quality-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Loader2, ChevronDown } from "lucide-react"
import type { CaseItem } from "@/lib/mock-data"

interface MasonryGridProps {
  items: CaseItem[]
  isLoading?: boolean
  viewMode?: "grid" | "list"
}

const ITEMS_PER_PAGE = 20

export function MasonryGrid({ items, isLoading = false, viewMode = "grid" }: MasonryGridProps) {
  const [selectedItem, setSelectedItem] = useState<CaseItem | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [displayedItems, setDisplayedItems] = useState<CaseItem[]>([])
  const [loadingMore, setLoadingMore] = useState(false)

  // 根据 id 去重，id 相同时保留首次出现的项；若无 id 则回退到 title 去重
  const uniqueItems = useMemo(() => {
    const seen = new Set<string | number>()
    return items.filter((item) => {
      const key = item.id ?? item.title
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [items])

  useEffect(() => {
    setDisplayedItems(uniqueItems.slice(0, ITEMS_PER_PAGE))
  }, [uniqueItems])

  const loadMore = useCallback(() => {
    if (loadingMore) return
    setLoadingMore(true)
    setTimeout(() => {
      const currentCount = displayedItems.length
      const nextItems = uniqueItems.slice(0, currentCount + ITEMS_PER_PAGE)
      setDisplayedItems(nextItems)
      setLoadingMore(false)
    }, 400)
  }, [uniqueItems, displayedItems.length, loadingMore])

  const handleItemClick = (item: CaseItem) => {
    setSelectedItem(item)
    setSheetOpen(true)
  }

  // Loading state
  if (isLoading) {
    return viewMode === "grid" ? (
      <div className="columns-1 gap-4 xs:columns-2 sm:columns-2 md:columns-3 lg:columns-3 xl:columns-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="mb-4 break-inside-avoid">
            <Skeleton className="h-48 w-full rounded-xl sm:h-56 md:h-64" />
          </div>
        ))}
      </div>
    ) : (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  // Empty state
  if (uniqueItems.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
        <div className="mb-4 rounded-full bg-slate-100 p-6">
          <svg
            className="h-12 w-12 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-medium text-slate-800">暂无匹配案例</h3>
        <p className="text-sm text-slate-500">尝试调整筛选条件查看更多内容</p>
      </div>
    )
  }

  const hasMore = displayedItems.length < uniqueItems.length

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-600"
    if (score >= 80) return "text-blue-600"
    if (score >= 70) return "text-amber-600"
    return "text-red-600"
  }

  return (
    <>
      {viewMode === "grid" ? (
        /* Grid View */
        <div className="columns-1 gap-4 xs:columns-2 sm:columns-2 md:columns-3 lg:columns-3 xl:columns-4">
          {displayedItems.map((item) => (
            <div key={item.id} className="mb-4 break-inside-avoid">
              <ImageCard item={item} onClick={() => handleItemClick(item)} />
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {/* Table Header */}
          <div className="grid grid-cols-[64px_1fr_120px_80px_100px_100px] items-center gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-500">
            <span>缩略图</span>
            <span>标题</span>
            <span>类别</span>
            <span className="text-center">评分</span>
            <span>质量</span>
            <span>日期</span>
          </div>
          {/* Table Rows */}
          {displayedItems.map((item) => (
            <div
              key={item.id}
              className="grid cursor-pointer grid-cols-[64px_1fr_120px_80px_100px_100px] items-center gap-4 border-b border-slate-100 px-4 py-3 transition-colors last:border-b-0 hover:bg-slate-50"
              onClick={() => handleItemClick(item)}
            >
              <div className="h-10 w-16 overflow-hidden rounded-lg bg-slate-100">
                {item.imageUrl && item.imageUrl.trim() !== "" ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.title}
                    width={64}
                    height={40}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-400">
                    <span className="text-[10px]">无图</span>
                  </div>
                )}
              </div>
              <span className="truncate text-sm font-medium text-slate-800">
                {item.title}
              </span>
              <span className="truncate text-xs text-slate-500">{item.category}</span>
              <span
                className={`text-center text-sm font-semibold ${getScoreColor(item.totalScore)}`}
              >
                {item.totalScore}
              </span>
              <QualityBadge qualityTag={item.qualityTag} size="sm" />
              <span className="text-xs text-slate-400">
                {item.createdAt
                  ? new Date(item.createdAt).toLocaleDateString("zh-CN")
                  : "-"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Load More */}
      {hasMore && (
        <div className="flex items-center justify-center py-8">
          <Button
            variant="outline"
            size="lg"
            onClick={loadMore}
            disabled={loadingMore}
            className="gap-2 border-slate-200 bg-white px-8 text-slate-600 hover:bg-slate-50"
          >
            {loadingMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                加载中...
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                加载更多
                <span className="text-slate-400">
                  ({displayedItems.length} / {uniqueItems.length})
                </span>
              </>
            )}
          </Button>
        </div>
      )}

      {/* All loaded hint */}
      {!hasMore && items.length > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-center py-8">
          <span className="text-sm text-slate-400">已加载全部 {items.length} 个案例</span>
        </div>
      )}

      {/* Sheet Detail Panel */}
      <CaseDetailSheet
        item={selectedItem}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  )
}
