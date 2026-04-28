"use client"

import { useState, useRef, type FormEvent } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Upload, ImagePlus, Loader2, CheckCircle2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect } from "react"

const CATEGORIES = [
  "视觉海报",
  "UI 设计",
  "角色设定",
  "摄影写实",
  "插画绘本",
  "Logo/图标",
  "3D 渲染",
  "游戏概念",
  "表情包/贴纸",
  "建筑设计",
  "产品设计",
  "其他创意应用",
]

export default function SubmitPage() {
  const { user, isLoggedIn, loading: authLoading } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState("")
  const [category, setCategory] = useState(CATEGORIES[0])
  const [prompt, setPrompt] = useState("")
  const [sourceLink, setSourceLink] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      window.location.assign("/login")
    }
  }, [authLoading, isLoggedIn])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setError("请选择图片文件")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("图片大小不能超过 5MB")
      return
    }
    setImageFile(file)
    setError("")
    const reader = new FileReader()
    reader.onload = (ev) => setImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user || !imageFile) return
    setError("")
    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append("file", imageFile)
      formData.append("title", title.trim())
      formData.append("category", category)
      formData.append("prompt", prompt.trim())
      formData.append("sourceLink", sourceLink.trim())

      const resp = await fetch("/api/submit", {
        method: "POST",
        body: formData,
      })

      const result = await resp.json()

      if (!resp.ok) {
        setError(result.error || "提交失败，请重试")
        setIsSubmitting(false)
        return
      }

      setSubmitted(true)
    } catch (err: any) {
      setError(err?.message || "提交失败，请重试")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (authLoading || !isLoggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-400">加载中…</div>
      </div>
    )
  }

  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-sm text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900">提交成功</h2>
          <p className="mt-2 text-sm text-slate-500">
            你的案例已提交，AI 正在后台审计打分，稍后即可在案例库中看到。
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button variant="outline" asChild>
              <Link href="/">返回案例库</Link>
            </Button>
            <Button
              onClick={() => {
                setSubmitted(false)
                setTitle("")
                setPrompt("")
                setSourceLink("")
                setImageFile(null)
                setImagePreview(null)
              }}
            >
              继续提交
            </Button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto max-w-2xl px-4 py-5">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild className="h-8 w-8">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-lg font-semibold tracking-wide text-slate-900">
                提交案例
              </h1>
              <p className="text-xs tracking-wide text-slate-400">
                分享你的 AI 图像生成作品
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image upload */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              效果图 <span className="text-red-500">*</span>
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group cursor-pointer overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-white transition-colors hover:border-slate-400"
            >
              {imagePreview ? (
                <div className="relative">
                  <Image
                    src={imagePreview}
                    alt="预览"
                    width={800}
                    height={600}
                    className="h-auto w-full object-contain"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                    <span className="rounded-lg bg-white/90 px-3 py-1.5 text-sm font-medium text-slate-700 opacity-0 transition-opacity group-hover:opacity-100">
                      点击更换图片
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <ImagePlus className="mb-3 h-10 w-10" />
                  <p className="text-sm font-medium">点击上传效果图</p>
                  <p className="mt-1 text-xs text-slate-300">
                    支持 JPG / PNG / WebP，最大 5MB
                  </p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              案例标题 <span className="text-red-500">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：赛博朋克风格城市夜景"
              required
              maxLength={100}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              应用场景 <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Prompt */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              提示词 (Prompt) <span className="text-red-500">*</span>
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="粘贴你使用的完整提示词…"
              required
              rows={6}
              className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 resize-none"
            />
          </div>

          {/* Source link */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              原始链接 <span className="text-xs text-slate-400">(可选)</span>
            </label>
            <Input
              value={sourceLink}
              onChange={(e) => setSourceLink(e.target.value)}
              placeholder="ChatGPT 对话链接、社交媒体链接等"
              type="url"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting || !imageFile || !title.trim() || !prompt.trim()}
              className="gap-2 bg-slate-900 text-white hover:bg-slate-800"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  提交中…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  提交案例
                </>
              )}
            </Button>
            <p className="text-xs text-slate-400">
              提交后将由 AI 自动审计打分
            </p>
          </div>
        </form>
      </div>
    </main>
  )
}
