'use client'

import { Suspense, useState, useEffect, type FormEvent } from 'react'
import { useSearchParams } from 'next/navigation'

type AuthMode = 'login' | 'register'

function LoginForm() {
  const searchParams = useSearchParams()
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login'
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [supabase, setSupabase] = useState<any>(null)

  useEffect(() => {
    import('@/lib/supabase').then((mod) => {
      setSupabase(mod.supabase)
      setReady(true)
    })
  }, [])

  const isLogin = mode === 'login'

  const switchMode = (target: AuthMode) => {
    setMode(target)
    setError('')
    setSuccess('')
    setConfirmPassword('')
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!supabase) return

    // ── 用 FormData 直接从 DOM 读取，防止浏览器自动填充未触发 onChange ──
    const fd = new FormData(e.currentTarget)
    const formEmail = (fd.get('email') as string ?? '').trim()
    const formPassword = (fd.get('password') as string ?? '')
    const formConfirm = (fd.get('confirmPassword') as string ?? '')

    // 手动同步回 state（保持 UI 一致）
    setEmail(formEmail)
    setPassword(formPassword)
    setConfirmPassword(formConfirm)

    setError('')
    setSuccess('')
    setIsLoading(true)

    try {
      if (mode === 'register') {
        if (formPassword !== formConfirm) {
          setError('两次输入的密码不一致')
          return
        }
        if (formPassword.length < 6) {
          setError('密码至少需要 6 个字符')
          return
        }

        const { error: signUpErr } = await supabase.auth.signUp({
          email: formEmail,
          password: formPassword,
        })
        if (signUpErr) {
          setError(signUpErr.message)
          return
        }
        window.location.assign('/')
        return
      }

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: formEmail,
        password: formPassword,
      })
      if (signInErr) {
        setError(signInErr.message)
        return
      }
      window.location.assign('/')
    } catch (err: any) {
      setError(err?.message || '未知错误，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB]">
        <div className="w-full max-w-[420px] mx-4 rounded-xl bg-white p-10 shadow-[0_1px_3px_rgba(0,0,0,0.08)] animate-pulse">
          <div className="mx-auto h-6 w-48 rounded bg-gray-200" />
          <div className="mt-3 mx-auto h-4 w-32 rounded bg-gray-100" />
          <div className="mt-8 space-y-5">
            <div className="h-11 rounded-lg bg-gray-100" />
            <div className="h-11 rounded-lg bg-gray-100" />
            <div className="h-11 rounded-lg bg-gray-200" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-[#F9FAFB] px-4"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      <div className="w-full max-w-[420px]">
        <div className="rounded-xl bg-white px-8 py-10 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.04)]">
          <div className="text-center">
            <h1 className="text-[22px] font-bold tracking-tight text-[#111827]">
              GPT-Image Intel
            </h1>
            <p className="mt-1.5 text-sm text-[#6B7280]">
              {isLogin ? '登录以继续使用平台' : '创建一个新账号'}
            </p>
          </div>

          <div className="relative mt-8 flex border-b border-[#E5E7EB]">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`relative flex-1 pb-3 text-sm font-medium transition-colors duration-200 ${
                isLogin
                  ? 'text-[#1E3A5F]'
                  : 'text-[#9CA3AF] hover:text-[#6B7280]'
              }`}
            >
              登录
              {isLogin && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#1E3A5F]" />
              )}
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`relative flex-1 pb-3 text-sm font-medium transition-colors duration-200 ${
                !isLogin
                  ? 'text-[#1E3A5F]'
                  : 'text-[#9CA3AF] hover:text-[#6B7280]'
              }`}
            >
              注册
              {!isLogin && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#1E3A5F]" />
              )}
            </button>
          </div>

          {success && (
            <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <span className="mr-1.5 font-medium">✓</span>
              {success}
            </div>
          )}

          {error && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              <span className="mr-1.5 font-medium">!</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[#374151]">
                邮箱地址
              </label>
              <input
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="block w-full rounded-lg border border-[#D1D5DB] bg-white px-3.5 py-2.5 text-sm text-[#111827] placeholder:text-[#9CA3AF] outline-none transition-all duration-150 focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[#374151]">
                密码
              </label>
              <input
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 个字符"
                className="block w-full rounded-lg border border-[#D1D5DB] bg-white px-3.5 py-2.5 text-sm text-[#111827] placeholder:text-[#9CA3AF] outline-none transition-all duration-150 focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20"
              />
            </div>

            {!isLogin && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-[#374151]">
                  确认密码
                </label>
                <input
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入密码"
                  className="block w-full rounded-lg border border-[#D1D5DB] bg-white px-3.5 py-2.5 text-sm text-[#111827] placeholder:text-[#9CA3AF] outline-none transition-all duration-150 focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20"
                />
              </div>
            )}

            {isLogin && (
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-xs text-[#1E3A5F] hover:text-[#152D4A] transition-colors"
                  onClick={() => {
                    if (supabase && email) {
                      supabase.auth.resetPasswordForEmail(email)
                      setSuccess('密码重置邮件已发送，请检查收件箱。')
                    } else {
                      setError('请先填写邮箱地址')
                    }
                  }}
                >
                  忘记密码？
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-[#1E3A5F] px-4 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:bg-[#152D4A] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  {isLogin ? '登录中…' : '注册中…'}
                </span>
              ) : isLogin ? (
                '登录'
              ) : (
                '创建账号'
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-[#9CA3AF] leading-relaxed">
          继续即表示您同意我们的
          <span className="text-[#6B7280] hover:text-[#374151] cursor-pointer">
            {' '}服务条款{' '}
          </span>
          和
          <span className="text-[#6B7280] hover:text-[#374151] cursor-pointer">
            {' '}隐私政策
          </span>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB]">
        <div className="w-full max-w-[420px] mx-4 rounded-xl bg-white p-10 shadow-[0_1px_3px_rgba(0,0,0,0.08)] animate-pulse">
          <div className="mx-auto h-6 w-48 rounded bg-gray-200" />
          <div className="mt-3 mx-auto h-4 w-32 rounded bg-gray-100" />
          <div className="mt-8 space-y-5">
            <div className="h-11 rounded-lg bg-gray-100" />
            <div className="h-11 rounded-lg bg-gray-100" />
            <div className="h-11 rounded-lg bg-gray-200" />
          </div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
