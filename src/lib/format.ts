const nf = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 2 })
const nf0 = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 0 })

/** 82.5 → "82,5" */
export const num = (n: number): string => nf.format(n)

/** 12480 → "12.480" */
export const int = (n: number): string => nf0.format(Math.round(n))

export const kg = (n: number): string => `${num(n)} kg`

/** Compact volume: 950 → "950 kg", 12480 → "12,5 t" */
export function volume(n: number): { value: string; unit: string } {
  if (n >= 10000) return { value: nf.format(Math.round(n / 100) / 10), unit: 'ton' }
  return { value: int(n), unit: 'kg' }
}

export function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

export function duration(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60000))
  if (min < 60) return `${min} min`
  return `${Math.floor(min / 60)} u ${String(min % 60).padStart(2, '0')}`
}

const dayFmt = new Intl.DateTimeFormat('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
const shortFmt = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' })

export const longDate = (t: number): string => dayFmt.format(t)
export const shortDate = (t: number): string => shortFmt.format(t).replace('.', '')

export function relativeDay(t: number, now = Date.now()): string {
  const d0 = new Date(now).setHours(0, 0, 0, 0)
  const d1 = new Date(t).setHours(0, 0, 0, 0)
  const days = Math.round((d0 - d1) / 86400000)
  if (days === 0) return 'Vandaag'
  if (days === 1) return 'Gisteren'
  if (days < 7) return `${days} dagen geleden`
  return shortDate(t)
}

export function greeting(now = new Date()): string {
  const h = now.getHours()
  if (h < 6) return 'Goedenacht'
  if (h < 12) return 'Goedemorgen'
  if (h < 18) return 'Goedemiddag'
  return 'Goedenavond'
}
