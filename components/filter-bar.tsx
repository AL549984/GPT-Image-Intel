"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  LayoutGrid,
  List,
  X,
  Sparkles,
} from "lucide-react"
import { type SortOrder } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

interface FilterBarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  sortOrder: SortOrder
  onSortOrderChange: (order: SortOrder) => void
  scoreRange: [number, number]
  onScoreRangeChange: (range: [number, number]) => void
  dateRange: string
  onDateRangeChange: (range: string) => void
  selectedCategories: string[]
  onCategoriesChange: (categories: string[]) => void
  showOnlyWithPrompt: boolean
  onPromptFilterChange: (value: boolean) => void
  viewMode: "grid" | "list"
  onViewModeChange: (mode: "grid" | "list") => void
  isSearching?: boolean
  categoryOptions?: string[]
}



const datePresets = [
  { label: "全部时间", value: "all" },
  { label: "最近 7 天", value: "7d" },
  { label: "最近 30 天", value: "30d" },
  { label: "最近 90 天", value: "90d" },
]

export function FilterBar({
  searchQuery,
  onSearchChange,
  sortOrder,
  onSortOrderChange,
  scoreRange,
  onScoreRangeChange,
  dateRange,
  onDateRangeChange,
  selectedCategories,
  onCategoriesChange,
  showOnlyWithPrompt,
  onPromptFilterChange,
  viewMode,
  onViewModeChange,
  isSearching = false,
  categoryOptions = [],
}: FilterBarProps) {
  const getSortIcon = () => {
    if (sortOrder === "desc") return <ArrowDown className="h-4 w-4" />
    if (sortOrder === "asc") return <ArrowUp className="h-4 w-4" />
    return <ArrowUpDown className="h-4 w-4" />
  }

  const getSortLabel = () => {
    if (sortOrder === "desc") return "高→低"
    if (sortOrder === "asc") return "低→高"
    return "默认"
  }

  const cycleSortOrder = () => {
    if (sortOrder === "default") onSortOrderChange("desc")
    else if (sortOrder === "desc") onSortOrderChange("asc")
    else onSortOrderChange("default")
  }

  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      onCategoriesChange(selectedCategories.filter((c) => c !== category))
    } else {
      onCategoriesChange([...selectedCategories, category])
    }
  }

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (scoreRange[0] > 0 || scoreRange[1] < 100) count++
    if (dateRange !== "all") count++
    if (selectedCategories.length > 0) count++
    if (showOnlyWithPrompt) count++
    return count
  }, [scoreRange, dateRange, selectedCategories, showOnlyWithPrompt])

  const resetFilters = () => {
    onScoreRangeChange([0, 100])
    onDateRangeChange("all")
    onCategoriesChange([])
    onPromptFilterChange(false)
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search
          className={cn(
            "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors",
            isSearching ? "animate-pulse text-blue-500" : "text-slate-400"
          )}
        />
        <Input
          type="text"
          placeholder="搜索标题或提示词..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="border-slate-200 bg-white pl-9 text-sm placeholder:text-slate-400 focus-visible:border-slate-300 focus-visible:ring-slate-200"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          </div>
        )}
      </div>

      {/* Notion-style Filter Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "gap-2 border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              activeFilterCount > 0 && "border-blue-200 bg-blue-50 text-blue-700"
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>筛选</span>
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 border-slate-200 bg-white p-0" align="end">
          <div className="space-y-1 p-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3">
              <h4 className="text-sm font-medium text-slate-900">筛选条件</h4>
              {activeFilterCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  重置全部
                </button>
              )}
            </div>

            {/* Score Range */}
            <div className="space-y-3 border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-500">评分区间</label>
                <span className="text-xs font-medium text-slate-700">
                  {scoreRange[0]} – {scoreRange[1]}
                </span>
              </div>
              <Slider
                min={0}
                max={100}
                step={1}
                value={scoreRange}
                onValueChange={(val) => onScoreRangeChange(val as [number, number])}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>0</span>
                <span>25</span>
                <span>50</span>
                <span>75</span>
                <span>100</span>
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <label className="text-xs font-medium text-slate-500">上传日期</label>
              <div className="flex flex-wrap gap-1.5">
                {datePresets.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => onDateRangeChange(preset.value)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                      dateRange === preset.value
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Selection */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-500">业务领域</label>
                {selectedCategories.length > 0 && (
                  <button
                    onClick={() => onCategoriesChange([])}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    清除
                  </button>
                )}
              </div>
              <div className="max-h-[180px] space-y-1 overflow-y-auto">
                {categoryOptions.map((category) => (
                  <label
                    key={category}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Checkbox
                      checked={selectedCategories.includes(category)}
                      onCheckedChange={() => toggleCategory(category)}
                    />
                    <span className="text-xs">{category}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Prompt Filter */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <Label
                htmlFor="prompt-filter-popover"
                className="flex cursor-pointer items-center gap-2 text-xs text-slate-600"
              >
                <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                仅有提示词
              </Label>
              <Switch
                id="prompt-filter-popover"
                checked={showOnlyWithPrompt}
                onCheckedChange={onPromptFilterChange}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Sort Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={cycleSortOrder}
        className={cn(
          "gap-1.5 border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
          sortOrder !== "default" && "border-blue-200 bg-blue-50 text-blue-700"
        )}
      >
        {getSortIcon()}
        <span className="hidden sm:inline">{getSortLabel()}</span>
      </Button>

      {/* View Mode Toggle */}
      <div className="flex overflow-hidden rounded-lg border border-slate-200">
        <button
          onClick={() => onViewModeChange("grid")}
          className={cn(
            "flex items-center justify-center px-2.5 py-1.5 transition-colors",
            viewMode === "grid"
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-400 hover:text-slate-600"
          )}
        >
          <LayoutGrid className="h-4 w-4" />
        </button>
        <button
          onClick={() => onViewModeChange("list")}
          className={cn(
            "flex items-center justify-center px-2.5 py-1.5 transition-colors",
            viewMode === "list"
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-400 hover:text-slate-600"
          )}
        >
          <List className="h-4 w-4" />
        </button>
      </div>

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 sm:hidden">
          {(scoreRange[0] > 0 || scoreRange[1] < 100) && (
            <Badge
              variant="secondary"
              className="gap-1 bg-blue-50 text-xs text-blue-700"
            >
              {scoreRange[0]}–{scoreRange[1]} 分
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onScoreRangeChange([0, 100])}
              />
            </Badge>
          )}
          {dateRange !== "all" && (
            <Badge
              variant="secondary"
              className="gap-1 bg-blue-50 text-xs text-blue-700"
            >
              {datePresets.find((d) => d.value === dateRange)?.label}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onDateRangeChange("all")}
              />
            </Badge>
          )}
          {selectedCategories.length > 0 && (
            <Badge
              variant="secondary"
              className="gap-1 bg-blue-50 text-xs text-blue-700"
            >
              {selectedCategories.length} 个领域
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onCategoriesChange([])}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
