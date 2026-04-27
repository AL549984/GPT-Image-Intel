"use client"

import { cn } from "@/lib/utils"

interface ScoreProgressProps {
  label: string
  score: number
  className?: string
}

export function ScoreProgress({ label, score, className }: ScoreProgressProps) {
  const getScoreColor = (score: number) => {
    if (score >= 90) return "bg-emerald-500"
    if (score >= 80) return "bg-blue-500"
    if (score >= 70) return "bg-amber-500"
    return "bg-red-500"
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{score}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-500", getScoreColor(score))}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  )
}
