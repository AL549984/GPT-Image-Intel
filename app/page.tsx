"use client"

import { useState, useMemo, useEffect, useTransition } from "react"
import { FilterBar } from "@/components/filter-bar"
import { MasonryGrid } from "@/components/masonry-grid"
import { type SortOrder } from "@/lib/mock-data"
import { fetchApprovedCases, type CaseItem } from "@/lib/supabase"
import { Database, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  // Filter state
  const [searchQuery, setSearchQuery] = useState("")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [minScore, setMinScore] = useState(0)
  const [dateRange, setDateRange] = useState("all")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [showOnlyWithPrompt, setShowOnlyWithPrompt] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [isPending, startTransition] = useTransition()

  // Data state
  const [cases, setCases] = useState<CaseItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchApprovedCases()
      setCases(data)
    } catch (err) {
      setError("无法加载数据，请稍后重试")
      console.error("Failed to fetch cases:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        setDebouncedQuery(searchQuery)
      })
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const filteredCases = useMemo(() => {
    const query = debouncedQuery.toLowerCase().trim()

    let results = cases.filter((item) => {
      // Category filter (empty = all)
      const categoryMatch =
        selectedCategories.length === 0 || selectedCategories.includes(item.category)
      // Prompt filter
      const hasPrompt = item.prompt && item.prompt.trim() !== ""
      const promptMatch = !showOnlyWithPrompt || hasPrompt
      // Search filter
      const searchMatch =
        query === "" ||
        item.title.toLowerCase().includes(query) ||
        item.prompt.toLowerCase().includes(query)
      // Score filter
      const scoreMatch = item.totalScore >= minScore
      // Date filter
      let dateMatch = true
      if (dateRange !== "all" && item.createdAt) {
        const now = new Date()
        const created = new Date(item.createdAt)
        const diffDays =
          (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
        if (dateRange === "7d") dateMatch = diffDays <= 7
        else if (dateRange === "30d") dateMatch = diffDays <= 30
        else if (dateRange === "90d") dateMatch = diffDays <= 90
      }

      return categoryMatch && promptMatch && searchMatch && scoreMatch && dateMatch
    })

    // Sort
    if (sortOrder === "desc") {
      results = [...results].sort((a, b) => b.totalScore - a.totalScore)
    } else if (sortOrder === "asc") {
      results = [...results].sort((a, b) => a.totalScore - b.totalScore)
    }

    return results
  }, [
    cases,
    selectedCategories,
    showOnlyWithPrompt,
    debouncedQuery,
    sortOrder,
    minScore,
    dateRange,
  ])

  // Stats
  const stats = useMemo(() => {
    const total = filteredCases.length
    const avgScore =
      total > 0
        ? Math.round(
            filteredCases.reduce((sum, item) => sum + item.totalScore, 0) /
              total
          )
        : 0
    const highQuality = filteredCases.filter(
      (item) => item.totalScore >= 90
    ).length
    return { total, avgScore, highQuality }
  }, [filteredCases])

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-5">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900">
                <Database className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-wide text-slate-900">
                  GPT-image-2 优质案例库
                </h1>
                <p className="text-xs tracking-wide text-slate-400">
                  探索 AI 生成图像的无限可能
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 sm:flex">
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
                  <span className="text-xs text-slate-400">共</span>
                  <span className="text-sm font-semibold text-slate-800">
                    {cases.length}
                  </span>
                </div>
                {stats.highQuality > 0 && (
                  <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5">
                    <span className="text-xs text-emerald-600">优质 90+</span>
                    <span className="text-sm font-semibold text-emerald-700">
                      {stats.highQuality}
                    </span>
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={loadData}
                disabled={isLoading}
                className="h-8 w-8 text-slate-400 hover:text-slate-600"
                title="刷新数据"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>

          <FilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
            minScore={minScore}
            onMinScoreChange={setMinScore}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            selectedCategories={selectedCategories}
            onCategoriesChange={setSelectedCategories}
            showOnlyWithPrompt={showOnlyWithPrompt}
            onPromptFilterChange={setShowOnlyWithPrompt}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            isSearching={isPending}
          />
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Error State */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="mt-2 border-red-200 text-red-600 hover:bg-red-100"
            >
              重试
            </Button>
          </div>
        )}

        {/* Stats Bar */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <p className="text-sm text-slate-500">
            共{" "}
            <span className="font-medium text-slate-800">{stats.total}</span>{" "}
            个案例
            <span className="ml-1 text-xs text-slate-400">
              (仅显示审计通过)
            </span>
          </p>
          {stats.total > 0 && (
            <>
              <span className="text-slate-200">|</span>
              <p className="text-sm text-slate-500">
                平均分{" "}
                <span className="font-medium text-slate-800">
                  {stats.avgScore}
                </span>
              </p>
              <span className="text-slate-200">|</span>
              <p className="text-sm text-slate-500">
                优质案例{" "}
                <span className="font-medium text-emerald-600">
                  {stats.highQuality}
                </span>
              </p>
            </>
          )}
        </div>

        {/* Grid */}
        <MasonryGrid
          items={filteredCases}
          isLoading={isLoading || isPending}
          viewMode={viewMode}
        />
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-slate-400">
          <p>GPT-image-2 优质案例库 · 激发创意灵感</p>
        </div>
      </footer>
    </main>
  )
}
