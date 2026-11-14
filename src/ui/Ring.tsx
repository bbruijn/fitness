import { motion } from 'motion/react'
import { useId } from 'react'
import { glide } from './motion'

interface Props {
  /** 0…1 */
  value: number
  size: number
  stroke?: number
  from?: string
  to?: string
  /** Skip the tween — for values that already change smoothly, like a countdown. */
  instant?: boolean
  children?: React.ReactNode
}

/** Circular progress with a gradient stroke and a soft glow. */
export function Ring({ value, size, stroke = 8, from = '#ff3dbb', to = '#ff8a2b', instant, children }: Props) {
  const id = useId()
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.min(1, Math.max(0, value))
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }} aria-hidden>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={from} />
            <stop offset="1" stopColor={to} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - v) }}
          transition={instant ? { duration: 0 } : glide}
          style={{ filter: `drop-shadow(0 0 6px ${from}aa)` }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>{children}</div>
    </div>
  )
}
