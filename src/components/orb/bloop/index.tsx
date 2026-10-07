'use client'

import React, { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { BloopState, type OrbBloopProps } from './types'
import { useOrbAudio } from '@/components/orb/smooth/use-orb-audio'

export function OrbBloop({
  audioMode = 'ambient',
  demoMode = false,
  audioElement,
  audioSrc,
  state = BloopState.idle,
  bloopColorMain = [0.1, 0.5, 1.0],
  bloopColorLow = [0.1, 0.2, 0.8],
  bloopColorMid = [0.2, 0.4, 0.9],
  bloopColorHigh = [0.5, 0.8, 1.0],
  size = 144,
  watercolorStrength = 0.5,
  watercolorAnimated = false,
  className = '',
  style,
}: OrbBloopProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const audioAnalyzerRef = useOrbAudio(audioMode, audioElement, audioSrc)
  const animRef = useRef<number | null>(null)
  const startTime = useRef(Date.now())

  // Convert normalized RGB [0..1] to CSS rgb string
  const toRgbStr = (c: [number, number, number]) => {
    return `rgb(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)})`
  }

  const mainColor = toRgbStr(bloopColorMain)
  const lowColor = toRgbStr(bloopColorLow)
  const midColor = toRgbStr(bloopColorMid)
  const highColor = toRgbStr(bloopColorHigh)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let cancelled = false

    const render = () => {
      if (cancelled) return
      const now = Date.now()
      const time = (now - startTime.current) / 1000

      let audioLevel = 0.15
      if (audioAnalyzerRef.current) {
        audioAnalyzerRef.current.update()
        audioLevel = Math.min(1.0, (audioAnalyzerRef.current.allAvg / 255) * 1.5)
      } else if (demoMode || state !== BloopState.idle) {
        if (state === BloopState.speak) {
          audioLevel = 0.35 + Math.sin(time * 12) * 0.25 + Math.cos(time * 8) * 0.2
        } else if (state === BloopState.listen) {
          audioLevel = 0.25 + Math.sin(time * 4) * 0.15
        } else if (state === BloopState.think) {
          audioLevel = 0.2 + Math.sin(time * 3) * 0.1
        } else {
          audioLevel = 0.12 + Math.sin(time * 2) * 0.05
        }
      }

      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)

      const cx = w / 2
      const cy = h / 2
      const baseRadius = Math.min(w, h) * 0.38 + audioLevel * (Math.min(w, h) * 0.12)

      // Draw organic layered watercolor glowing bloop
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseRadius * 1.4)
      gradient.addColorStop(0, mainColor)
      gradient.addColorStop(0.4, midColor)
      gradient.addColorStop(0.8, lowColor)
      gradient.addColorStop(1, 'transparent')

      ctx.save()
      ctx.beginPath()

      // Organic wave deformation
      const points = 32
      for (let i = 0; i <= points; i++) {
        const theta = (i / points) * Math.PI * 2
        const warp = Math.sin(theta * 4 + time * 3) * 4 + Math.cos(theta * 3 - time * 2) * 3
        const r = baseRadius + warp * (1 + audioLevel * 2)
        const x = cx + r * Math.cos(theta)
        const y = cy + r * Math.sin(theta)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.fillStyle = gradient
      ctx.globalAlpha = 0.85 + watercolorStrength * 0.15
      ctx.fill()

      // Inner intense kopilot highlight
      const kopilotGrad = ctx.createRadialGradient(cx - baseRadius * 0.2, cy - baseRadius * 0.2, 0, cx, cy, baseRadius * 0.8)
      kopilotGrad.addColorStop(0, highColor)
      kopilotGrad.addColorStop(0.6, mainColor)
      kopilotGrad.addColorStop(1, 'transparent')

      ctx.beginPath()
      ctx.arc(cx, cy, baseRadius * 0.65, 0, Math.PI * 2)
      ctx.fillStyle = kopilotGrad
      ctx.globalAlpha = 0.9
      ctx.fill()

      ctx.restore()

      animRef.current = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelled = true
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [state, demoMode, audioMode, mainColor, lowColor, midColor, highColor, watercolorStrength])

  return (
    <canvas
      ref={canvasRef}
      width={256}
      height={256}
      className={cn('aspect-square rounded-full object-contain', className)}
      style={{
        width: size !== undefined ? `${size}px` : '100%',
        height: size !== undefined ? `${size}px` : '100%',
        ...style,
      }}
    />
  )
}
