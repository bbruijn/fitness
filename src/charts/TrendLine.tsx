import { motion, useInView, useReducedMotion } from 'motion/react'
import { useId, useMemo } from 'react'
import type { ReactNode } from 'react'
import { EASE, glide, spring } from '../ui/motion'
import './charts.css'
import { useScrub, useWidth } from './hooks'
import { AXIS_BAND, areaPath, GUTTER, linePath, nearest, PAD_TOP, resample } from './scale'
import type { Axis } from './scale'

export interface TrendPoint {
  id: string | number
  /** Position along the x axis, 0…1. */
  x: number
  y: number
}

export interface TrendLabel {
  x: number
  text: string
  anchor?: 'start' | 'middle' | 'end'
}

interface Props {
  points: TrendPoint[]
  scale: Axis
  formatTick: (v: number) => string
  labels: TrendLabel[]
  tone: 'hot' | 'cool'
  /** Short name of the chart, for the focusable plot. */
  name: string
  /** Accessible summary of the data. */
  label: string
  /** Headline above the plot: the default reading, or the point under the finger. */
  readout: (active: number | null) => ReactNode
  aside?: ReactNode
  below?: ReactNode
  /** Horizontal breathing room inside the plot, for series whose points sit on the plot edges. */
  inset?: number
  /** The axis starts at zero, so its bottom line is a true baseline. */
  zero?: boolean
  empty?: string
  resetKey?: string | number
  height?: number
}

const SAMPLES = 72
const MAX_DOTS = 24
const INSTANT = { duration: 0 }
const TONES = {
  hot: ['#ff3dbb', '#ff8a2b'],
  cool: ['#9b7bff', '#5cd9ff'],
} as const

/**
 * A single-series line over time with a soft wash under it. Drag a finger across it to read any point:
 * the headline above the plot switches to that point, where a thumb cannot cover it.
 */
export function TrendLine({
  points,
  scale,
  formatTick,
  labels,
  tone,
  name,
  label,
  readout,
  aside,
  below,
  inset = 0,
  zero = false,
  empty = 'Nog geen gegevens',
  resetKey = '',
  height = 184,
}: Props) {
  const id = useId()
  const [ref, width] = useWidth<HTMLDivElement>()
  const inView = useInView(ref, { once: true, amount: 0.4 })
  const reduced = useReducedMotion()

  const base = height - AXIS_BAND
  const left = GUTTER + inset
  const right = Math.max(left, width - inset)
  const span = scale.hi - scale.lo
  const yOf = (v: number) => base - ((v - scale.lo) / span) * (base - PAD_TOP)
  const xOf = (x: number) => left + x * (right - left)

  const px = useMemo(
    () =>
      points.map((p) => ({
        x: left + p.x * (right - left),
        y: base - ((p.y - scale.lo) / span) * (base - PAD_TOP),
      })),
    [points, scale.lo, span, left, right, base],
  )
  const xs = useMemo(() => px.map((p) => p.x), [px])
  // Dots follow the line when the same sessions get new values; a different set of sessions pops in afresh.
  const signature = useMemo(() => points.map((p) => p.id).join('|'), [points])
  const sampled = useMemo(() => (px.length > 1 ? resample(px, SAMPLES) : []), [px])
  const line = linePath(sampled)
  const area = areaPath(sampled, base)

  const scrub = useScrub(points.length, (x) => nearest(xs, x), resetKey)
  const active = scrub.index
  const [from, to] = TONES[tone]
  const last = px[px.length - 1]
  const allDots = px.length <= MAX_DOTS
  const still = reduced ? INSTANT : glide

  return (
    <div className="chart">
      <div className="chart-head">
        <div className="chart-readout" aria-live="polite">
          {readout(active)}
        </div>
        {aside}
      </div>
      {below}

      <div
        ref={ref}
        className="chart-plot"
        style={{ height }}
        tabIndex={0}
        role="group"
        aria-label={`${name}. Sleep of gebruik de pijltjestoetsen om losse waarden te lezen.`}
        {...scrub.bind}
      >
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={label}>
            <defs>
              <linearGradient id={`${id}-stroke`} gradientUnits="userSpaceOnUse" x1={GUTTER} y1="0" x2={width} y2="0">
                <stop offset="0" stopColor={from} />
                <stop offset="1" stopColor={to} />
              </linearGradient>
              <linearGradient id={`${id}-wash`} gradientUnits="userSpaceOnUse" x1="0" y1={PAD_TOP} x2="0" y2={base}>
                <stop offset="0" stopColor={to} stopOpacity="0.3" />
                <stop offset="1" stopColor={from} stopOpacity="0" />
              </linearGradient>
            </defs>

            {scale.ticks.map((t, i) => (
              <motion.g key={t} initial={{ opacity: 0, y: yOf(t) }} animate={{ opacity: 1, y: yOf(t) }} transition={still}>
                <line x1={GUTTER} x2={width} className={zero && i === 0 ? 'chart-base' : 'chart-grid'} />
                <text x={GUTTER - 10} dy="0.35em" textAnchor="end" className="chart-tick">
                  {formatTick(t)}
                </text>
              </motion.g>
            ))}

            {labels.map((l) => (
              <text key={`${l.x}-${l.text}`} x={xOf(l.x)} y={height - 6} textAnchor={l.anchor ?? 'middle'} className="chart-tick">
                {l.text}
              </text>
            ))}

            {sampled.length > 0 && (
              <>
                <motion.path
                  fill={`url(#${id}-wash)`}
                  initial={{ d: area, opacity: 0 }}
                  animate={{ d: area, opacity: inView ? 1 : 0 }}
                  transition={reduced ? INSTANT : { d: glide, opacity: { duration: 0.8, delay: 0.35 } }}
                />
                <motion.path
                  fill="none"
                  stroke={`url(#${id}-stroke)`}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ d: line, pathLength: 0, opacity: 0 }}
                  animate={{ d: line, pathLength: inView ? 1 : 0, opacity: inView ? 1 : 0 }}
                  transition={
                    reduced ? INSTANT : { d: glide, pathLength: { duration: 1.1, ease: EASE }, opacity: { duration: 0.2 } }
                  }
                />
              </>
            )}

            {px.map((p, i) => {
              const end = i === px.length - 1
              if (!allDots && !end) return null
              return (
                <motion.circle
                  key={`${signature}-${i}`}
                  className="chart-dot"
                  fill={`url(#${id}-stroke)`}
                  initial={{ cx: p.x, cy: p.y, r: 0 }}
                  animate={{ cx: p.x, cy: p.y, r: inView ? (end ? 5 : 3.5) : 0 }}
                  transition={
                    reduced
                      ? INSTANT
                      : { cx: glide, cy: glide, r: { ...spring, delay: 0.25 + (i / Math.max(1, px.length)) * 0.75 } }
                  }
                />
              )
            })}

            {active !== null && px[active] && (
              <g>
                <line x1={px[active].x} x2={px[active].x} y1={PAD_TOP - 8} y2={base} className="chart-cross" />
                <circle cx={px[active].x} cy={px[active].y} r={6.5} fill={`url(#${id}-stroke)`} className="chart-dot chart-dot--active" />
              </g>
            )}

            {px.length === 0 && (
              <text x={(GUTTER + width) / 2} y={(PAD_TOP + base) / 2} textAnchor="middle" className="chart-empty">
                {empty}
              </text>
            )}
            {px.length === 1 && last && (
              <text x={(GUTTER + width) / 2} y={base - 12} textAnchor="middle" className="chart-empty">
                Eén meting — de lijn komt na de volgende training
              </text>
            )}
          </svg>
        )}
      </div>
    </div>
  )
}
