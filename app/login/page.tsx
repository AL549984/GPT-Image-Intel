"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push("/")
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0a0a12]">
      {/* Animated grid background */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Glow orbs */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-fuchsia-500/10 blur-[120px]" />

      {/* Login card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Neon border wrapper */}
        <div className="relative rounded-2xl p-[1px] bg-gradient-to-br from-cyan-400 via-fuchsia-500 to-cyan-400">
          <div className="rounded-2xl bg-[#0d0d1a]/95 backdrop-blur-xl px-8 py-10">

            {/* Glitch title */}
            <div className="mb-8 text-center">
              <h1 className="relative text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400 select-none">
                <span className="absolute inset-0 text-cyan-400/30 translate-x-[2px] translate-y-[1px] blur-[1px]" aria-hidden>
                  SYSTEM LOGIN
                </span>
                SYSTEM LOGIN
              </h1>
              <p className="mt-2 text-xs tracking-[0.3em] uppercase text-cyan-500/60 font-mono">
                Authentication Required
              </p>
            </div>

            {/* Error alert */}
            {error && (
              <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 font-mono">
                <span className="mr-2 text-red-500">⚠</span>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email field */}
              <div className="space-y-2">
                <label className="text-[11px] font-mono font-semibold uppercase tracking-[0.2em] text-cyan-400/80">
                  Email
                </label>
                <div className="group relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="
                      w-full rounded-lg border border-cyan-500/20 bg-[#0a0a18] px-4 py-3
                      text-sm text-cyan-50 font-mono placeholder:text-cyan-900/60
                      outline-none transition-all duration-300
                      focus:border-cyan-400/60 focus:shadow-[0_0_15px_rgba(0,255,255,0.1)]
                      focus:ring-1 focus:ring-cyan-400/30
                    "
                  />
                  <div className="pointer-events-none absolute inset-0 rounded-lg opacity-0 transition-opacity duration-300 group-focus-within:opacity-100 bg-gradient-to-r from-cyan-500/5 to-fuchsia-500/5" />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <label className="text-[11px] font-mono font-semibold uppercase tracking-[0.2em] text-cyan-400/80">
                  Password
                </label>
                <div className="group relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="
                      w-full rounded-lg border border-cyan-500/20 bg-[#0a0a18] px-4 py-3
                      text-sm text-cyan-50 font-mono placeholder:text-cyan-900/60
                      outline-none transition-all duration-300
                      focus:border-cyan-400/60 focus:shadow-[0_0_15px_rgba(0,255,255,0.1)]
                      focus:ring-1 focus:ring-cyan-400/30
                    "
                  />
                  <div className="pointer-events-none absolute inset-0 rounded-lg opacity-0 transition-opacity duration-300 group-focus-within:opacity-100 bg-gradient-to-r from-cyan-500/5 to-fuchsia-500/5" />
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="
                  relative w-full rounded-lg py-3 text-sm font-bold uppercase tracking-[0.2em]
                  transition-all duration-300 overflow-hidden
                  bg-gradient-to-r from-cyan-500 to-fuchsia-500
                  text-[#0a0a12]
                  hover:shadow-[0_0_30px_rgba(0,255,255,0.3)]
                  active:scale-[0.98]
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Authenticating...
                  </span>
                ) : (
                  "Access System"
                )}
              </button>
            </form>

            {/* Decorative scan line */}
            <div className="mt-8 flex items-center gap-3">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
              <span className="text-[10px] font-mono text-cyan-500/40 tracking-widest">SECURE</span>
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
            </div>

            {/* Decorative HUD corners */}
            <div className="pointer-events-none absolute top-0 left-0 h-6 w-6 border-t-2 border-l-2 border-cyan-400/40 rounded-tl-2xl" />
            <div className="pointer-events-none absolute top-0 right-0 h-6 w-6 border-t-2 border-r-2 border-fuchsia-400/40 rounded-tr-2xl" />
            <div className="pointer-events-none absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-fuchsia-400/40 rounded-bl-2xl" />
            <div className="pointer-events-none absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-cyan-400/40 rounded-br-2xl" />
          </div>
        </div>
      </div>

      {/* CSS for scan-line animation */}
      <style jsx>{`
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
      `}</style>
    </div>
  )
}
