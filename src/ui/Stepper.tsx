import { useEffect, useRef, useState } from 'react'
import { IconMinus, IconPlus } from './icons'
import { Press } from './Press'
import { Ticker } from './Ticker'

interface Props {
  value: number
  onChange: (v: number) => void
  step: number
  min?: number
  max?: number
  unit: string
  label: string
  size?: 'lg' | 'sm'
  /** Class for the big number, e.g. a gradient text. */
  numClass?: string
}

const round = (n: number): number => Math.round(n * 100) / 100

/** −/+ with hold-to-repeat; tap the number to type it. */
export function Stepper({ value, onChange, step, min = 0, max = 999, unit, label, size = 'lg', numClass = 'grad-text' }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const latest = useRef(value)
  latest.current = value
  const timers = useRef<{ t?: number; i?: number }>({})

  const bump = (dir: 1 | -1) => {
    const next = Math.min(max, Math.max(min, round(latest.current + dir * step)))
    if (next !== latest.current) {
      latest.current = next
      onChange(next)
    }
  }

  const stop = () => {
    clearTimeout(timers.current.t)
    clearInterval(timers.current.i)
    timers.current = {}
  }
  useEffect(() => stop, [])

  const hold = (dir: 1 | -1) => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0) return
      stop()
      bump(dir)
      timers.current.t = window.setTimeout(() => {
        timers.current.i = window.setInterval(() => bump(dir), 90)
      }, 380)
    },
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        bump(dir)
      }
    },
  })

  const commit = () => {
    const parsed = Number.parseFloat(draft.replace(',', '.'))
    if (Number.isFinite(parsed)) onChange(Math.min(max, Math.max(min, round(parsed))))
    setEditing(false)
  }

  return (
    <div className={`stepper ${size === 'sm' ? 'stepper--sm' : ''}`}>
      <Press className="stepper__btn" aria-label={`${label} omlaag`} {...hold(-1)}>
        <IconMinus size={size === 'sm' ? 20 : 26} />
      </Press>
      {editing ? (
        <input
          className="stepper__input"
          autoFocus
          inputMode="decimal"
          enterKeyHint="done"
          aria-label={label}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={(e) => e.target.select()}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
        />
      ) : (
        <button
          type="button"
          className="stepper__value"
          aria-label={`${label}: ${value} ${unit}, tik om te typen`}
          onClick={() => {
            setDraft(String(value).replace('.', ','))
            setEditing(true)
          }}
        >
          <Ticker value={value} className={`stepper__num ${numClass}`} />
          <span className="stepper__unit dim">{unit}</span>
        </button>
      )}
      <Press className="stepper__btn" aria-label={`${label} omhoog`} {...hold(1)}>
        <IconPlus size={size === 'sm' ? 20 : 26} />
      </Press>
    </div>
  )
}
