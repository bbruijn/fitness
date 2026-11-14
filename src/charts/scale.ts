/** Geometry shared by the time charts so their weeks line up when stacked on screen. */
export const GUTTER = 34
export const PAD_TOP = 14
export const AXIS_BAND = 24

export interface Axis {
  lo: number
  hi: number
  ticks: number[]
}

function niceStep(span: number, target: number): number {
  const raw = span / Math.max(1, target)
  const mag = 10 ** Math.floor(Math.log10(raw))
  const r = raw / mag
  return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10) * mag
}

/**
 * Round axis bounds and ticks. `zero` pins the axis to 0 (bars, areas); without it the axis hugs the
 * data, which is what a progression line needs. `integer` keeps ticks whole (counts).
 */
export function axis(min: number, max: number, opts: { zero?: boolean; integer?: boolean; target?: number } = {}): Axis {
  const target = opts.target ?? 3
  let lo = opts.zero ? 0 : min
  let hi = Math.max(max, lo)
  if (hi - lo < 1e-9) {
    const pad = opts.zero ? 1 : Math.max(1, Math.abs(hi) * 0.1)
    hi += pad
    if (!opts.zero) lo -= pad
  }
  let step = niceStep(hi - lo, target)
  if (opts.integer) step = Math.max(1, Math.ceil(step))
  lo = Math.floor(lo / step + 1e-9) * step
  hi = Math.ceil(hi / step - 1e-9) * step
  const ticks: number[] = []
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 1000) / 1000)
  return { lo, hi, ticks }
}

export interface XY {
  x: number
  y: number
}

/**
 * Re-samples a polyline at `n` evenly spaced x positions. Every dataset then yields a path with the
 * same number of commands, so one path can morph into the next instead of popping.
 */
export function resample(points: XY[], n: number): XY[] {
  if (!points.length) return []
  const first = points[0]
  const last = points[points.length - 1]
  const out: XY[] = []
  let seg = 0
  for (let i = 0; i < n; i++) {
    const x = first.x + ((last.x - first.x) * i) / (n - 1)
    while (seg < points.length - 2 && points[seg + 1].x < x) seg++
    const a = points[seg]
    const b = points[Math.min(seg + 1, points.length - 1)]
    const t = b.x - a.x > 1e-9 ? Math.min(1, Math.max(0, (x - a.x) / (b.x - a.x))) : 0
    out.push({ x, y: a.y + (b.y - a.y) * t })
  }
  return out
}

const f = (n: number): string => (Math.round(n * 10) / 10).toString()

export const linePath = (pts: XY[]): string => pts.map((p, i) => `${i ? 'L' : 'M'} ${f(p.x)} ${f(p.y)}`).join(' ')

export const areaPath = (pts: XY[], base: number): string =>
  pts.length ? `${linePath(pts)} L ${f(pts[pts.length - 1].x)} ${f(base)} L ${f(pts[0].x)} ${f(base)} Z` : ''

/** Index of the entry in `xs` closest to `x`. */
export function nearest(xs: number[], x: number): number | null {
  let best: number | null = null
  let dist = Infinity
  for (let i = 0; i < xs.length; i++) {
    const d = Math.abs(xs[i] - x)
    if (d < dist) {
      dist = d
      best = i
    }
  }
  return best
}

/** Which week columns get a date label: about four, always including the newest. */
export function weekLabelled(i: number, n: number): boolean {
  const every = n <= 5 ? 1 : Math.ceil(n / 4)
  return (n - 1 - i) % every === 0
}

/** With many weeks the newest column hugs the edge, so its label is pinned to the edge instead. */
export const pinLastLabel = (n: number): boolean => n > 20

const dayFmt = new Intl.DateTimeFormat('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })

/** "di 10 nov" */
export const weekdayDate = (t: number): string => dayFmt.format(t).replaceAll('.', '')
