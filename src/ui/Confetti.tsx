import { motion, useReducedMotion } from 'motion/react'
import { useMemo } from 'react'

const COLORS = ['#ff3dbb', '#ff8a2b', '#ffd23f', '#9b7bff', '#5cd9ff', '#ffffff']

/** One soft burst of particles from its own position. Reserved for the end of a workout and records. */
export function Confetti({ count = 46, spread = 230 }: { count?: number; spread?: number }) {
  const reduced = useReducedMotion()
  const bits = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.5
        const dist = spread * (0.35 + Math.random() * 0.75)
        return {
          id: i,
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          fall: 160 + Math.random() * 260,
          rot: (Math.random() - 0.5) * 900,
          size: 6 + Math.random() * 7,
          round: Math.random() < 0.35,
          color: COLORS[i % COLORS.length],
          delay: Math.random() * 0.12,
          time: 1.6 + Math.random() * 1.1,
        }
      }),
    [count, spread],
  )
  if (reduced) return null
  return (
    <div className="confetti" aria-hidden>
      {bits.map((b) => (
        <motion.i
          key={b.id}
          style={{ width: b.size, height: b.round ? b.size : b.size * 0.55, background: b.color, borderRadius: b.round ? '50%' : 3 }}
          initial={{ x: 0, y: 0, opacity: 0, rotate: 0, scale: 0.4 }}
          animate={{ x: [0, b.x, b.x * 1.15], y: [0, b.y, b.y + b.fall], opacity: [0, 1, 0], rotate: b.rot, scale: [0.4, 1, 0.8] }}
          transition={{ duration: b.time, delay: b.delay, times: [0, 0.32, 1], ease: ['easeOut', 'easeIn'] }}
        />
      ))}
    </div>
  )
}
