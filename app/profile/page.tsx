"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase, transformRowToCaseItem, type CaseItem, fetchNotifications, markAllNotificationsRead, fetchUnreadCount, deleteCase, type NotificationItem } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { ImageCard } from "@/components/image-card"
import { CaseDetailSheet } from "@/components/case-detail-sheet"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Database, ArrowLeft, Heart, Bookmark, Upload, Bell, Trash2 } from "lucide-react"
import Link from "next/link"

type Tab = "submitted" | "likes" | "favorites" | "notifications"

export default function ProfilePage() {
  const { user, isLoggedIn, loading: authLoading } = useAuth()
  const [tab, setTab] = useState<Tab>("submitted")
  const [submittedCases, setSubmittedCases] = useState<CaseItem[]>([])
  const [likedCases, setLikedCases] = useState<CaseItem[]>([])
  const [favoritedCases, setFavoritedCases] = useState<CaseItem[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<CaseItem | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const fetchUserCases = useCallback(async () => {
    if (!user) return
    setIsLoading(true)

    // Fetch user's submitted cases (submitted_by 或 image_url 中包含 user.id)
    const submittedByPromise = supabase
      .from("prompts_library")
      .select("*")
      .eq("submitted_by", user.id)
      .order("created_at", { ascending: false })

    const submittedByUrlPromise = supabase
      .from("prompts_library")
      .select("*")
      .is("submitted_by", null)
      .like("image_url", `%/${user.id}/%`)
      .order("created_at", { ascending: false })

    const [submittedByRes, submittedByUrlRes, likesRes, favsRes] = await Promise.all([
      submittedByPromise,
      submittedByUrlPromise,
      supabase
        .from("likes")
        .select("item_id")
        .eq("user_id", user.id),
      supabase
        .from("favorites")
        .select("item_id")
        .eq("user_id", user.id),
    ])

    // 合并两种方式查到的提交记录并去重
    const allSubmitted = [...(submittedByRes.data ?? []), ...(submittedByUrlRes.data ?? [])]
    const seenIds = new Set<string>()
    const uniqueSubmitted = allSubmitted.filter((r) => {
      const id = String(r.id)
      if (seenIds.has(id)) return false
      seenIds.add(id)
      return true
    })

    setSubmittedCases(
      uniqueSubmitted.map(transformRowToCaseItem)
    )

    const likeIds = (likesRes.data ?? []).map((r) => r.item_id)
    const favIds = (favsRes.data ?? []).map((r) => r.item_id)

    const allIds = [...new Set([...likeIds, ...favIds])]

    if (allIds.length === 0) {
      setLikedCases([])
      setFavoritedCases([])
      setIsLoading(false)
      return
    }

    const { data: rows } = await supabase
      .from("prompts_library")
      .select("*")
      .in("id", allIds)

    const caseMap = new Map<string, CaseItem>()
    for (const row of rows ?? []) {
      const item = transformRowToCaseItem(row)
      caseMap.set(item.id, item)
    }

    setLikedCases(likeIds.map((id) => caseMap.get(String(id))).filter(Boolean) as CaseItem[])
    setFavoritedCases(favIds.map((id) => caseMap.get(String(id))).filter(Boolean) as CaseItem[])
    setIsLoading(false)
  }, [user])

  const fetchUserNotifications = useCallback(async () => {
    if (!user) return
    const [notifs, count] = await Promise.all([
      fetchNotifications(user.id),
      fetchUnreadCount(user.id),
    ])
    setNotifications(notifs)
    setUnreadCount(count)
  }, [user])

  const handleMarkAllRead = async () => {
    if (!user) return
    await markAllNotificationsRead(user.id)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  const handleDeleteCase = async (caseId: string) => {
    if (!user || deletingId) return
    if (!window.confirm("确定要删除这个案例吗？此操作不可撤销。")) return
    setDeletingId(caseId)
    const result = await deleteCase(caseId, user.id)
    if (result.success) {
      setSubmittedCases((prev) => prev.filter((c) => c.id !== caseId))
    } else {
      alert(result.error || "删除失败")
    }
    setDeletingId(null)
  }

  useEffect(() => {
    if (isLoggedIn) fetchUserCases()
  }, [isLoggedIn, fetchUserCases])

  useEffect(() => {
    if (isLoggedIn) fetchUserNotifications()
  }, [isLoggedIn, fetchUserNotifications])

  // 切换到通知 tab 时标记已读
  useEffect(() => {
    if (tab === "notifications" && unreadCount > 0) {
      handleMarkAllRead()
    }
  }, [tab])

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      window.location.assign("/login")
    }
  }, [authLoading, isLoggedIn])

  if (authLoading || !isLoggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-400">加载中…</div>
      </div>
    )
  }

  const currentCases = tab === "submitted" ? submittedCases : tab === "likes" ? likedCases : favoritedCases

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                <Link href="/">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900">
                <Database className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-wide text-slate-900">
                  我的空间
                </h1>
                <p className="text-xs tracking-wide text-slate-400">
                  {user?.email}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Tabs */}
        <div className="mb-8 flex gap-1 rounded-lg border border-slate-200 bg-white p-1 w-fit">
          <button
            onClick={() => setTab("submitted")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === "submitted"
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Upload className={`h-4 w-4`} />
            我的发布
            <span className={`rounded-full px-2 py-0.5 text-xs ${
              tab === "submitted" ? "bg-white/20" : "bg-slate-100"
            }`}>
              {submittedCases.length}
            </span>
          </button>
          <button
            onClick={() => setTab("likes")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === "likes"
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Heart className={`h-4 w-4 ${tab === "likes" ? "fill-current" : ""}`} />
            我的点赞
            <span className={`rounded-full px-2 py-0.5 text-xs ${
              tab === "likes" ? "bg-white/20" : "bg-slate-100"
            }`}>
              {likedCases.length}
            </span>
          </button>
          <button
            onClick={() => setTab("favorites")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === "favorites"
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Bookmark className={`h-4 w-4 ${tab === "favorites" ? "fill-current" : ""}`} />
            我的收藏
            <span className={`rounded-full px-2 py-0.5 text-xs ${
              tab === "favorites" ? "bg-white/20" : "bg-slate-100"
            }`}>
              {favoritedCases.length}
            </span>
          </button>
          <button
            onClick={() => setTab("notifications")}
            className={`relative flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === "notifications"
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Bell className={`h-4 w-4`} />
            消息
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        {tab === "notifications" ? (
          // ========== 消息通知列表 ==========
          notifications.length === 0 ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
              <div className="mb-4 rounded-full bg-slate-100 p-6">
                <Bell className="h-12 w-12 text-slate-300" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-slate-800">暂无消息</h3>
              <p className="mb-4 text-sm text-slate-500">当有人点赞或收藏你的案例时，会在这里收到通知</p>
            </div>
          ) : (
            <div className="space-y-3 max-w-2xl">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-4 rounded-xl border p-4 transition-colors ${
                    n.read
                      ? "border-slate-200 bg-white"
                      : "border-blue-200 bg-blue-50/50"
                  }`}
                >
                  <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    n.type === "like" ? "bg-red-100" : "bg-amber-100"
                  }`}>
                    {n.type === "like" ? (
                      <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                    ) : (
                      <Bookmark className="h-4 w-4 text-amber-500 fill-amber-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-800">
                      <span className="font-medium">{n.actorEmail}</span>
                      {" "}
                      {n.type === "like" ? "赞了" : "收藏了"}你的案例
                      {" "}
                      <span className="font-medium text-slate-900">「{n.caseTitle}」</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {new Date(n.createdAt).toLocaleString("zh-CN")}
                    </p>
                  </div>
                  {!n.read && (
                    <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                  )}
                </div>
              ))}
            </div>
          )
        ) : isLoading ? (
          <div className="columns-1 gap-4 xs:columns-2 sm:columns-2 md:columns-3 lg:columns-3 xl:columns-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="mb-4 break-inside-avoid">
                <Skeleton className="h-48 w-full rounded-xl sm:h-56 md:h-64" />
              </div>
            ))}
          </div>
        ) : currentCases.length === 0 ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
            <div className="mb-4 rounded-full bg-slate-100 p-6">
              {tab === "submitted" ? (
                <Upload className="h-12 w-12 text-slate-300" />
              ) : tab === "likes" ? (
                <Heart className="h-12 w-12 text-slate-300" />
              ) : (
                <Bookmark className="h-12 w-12 text-slate-300" />
              )}
            </div>
            <h3 className="mb-2 text-lg font-medium text-slate-800">
              {tab === "submitted" ? "还没有发布案例" : tab === "likes" ? "还没有点赞的案例" : "还没有收藏的案例"}
            </h3>
            <p className="mb-4 text-sm text-slate-500">
              {tab === "submitted" ? "去提交你的第一个 AI 图像作品吧" : "去案例库看看，发现感兴趣的内容吧"}
            </p>
            <Button variant="outline" asChild>
              <Link href={tab === "submitted" ? "/submit" : "/"}>
                {tab === "submitted" ? "提交案例" : "浏览案例库"}
              </Link>
            </Button>
          </div>
        ) : (
          <div className="columns-1 gap-4 xs:columns-2 sm:columns-2 md:columns-3 lg:columns-3 xl:columns-4">
            {currentCases.map((item) => (
              <div key={item.id} className="relative mb-4 break-inside-avoid">
                <ImageCard
                  item={item}
                  onClick={() => {
                    setSelectedItem(item)
                    setSheetOpen(true)
                  }}
                />
                {/* 删除按钮 —— 仅在"我的发布" tab 显示 */}
                {tab === "submitted" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteCase(item.id)
                    }}
                    disabled={deletingId === item.id}
                    className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-400 shadow-sm backdrop-blur-sm transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                    title="删除案例"
                  >
                    <Trash2 className={`h-4 w-4 ${deletingId === item.id ? "animate-spin" : ""}`} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <CaseDetailSheet
        item={selectedItem}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </main>
  )
}
