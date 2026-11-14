import { animate, useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { int } from '../lib/format'
import { EASE } from './motion'

/** Counts from 0 to `value` once, when it appears. */
export function CountUp({ value, format = int, delay = 0 }: { value: number; format?: (n: number) => string; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const reduced = useReducedMotion()
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (reduced) {
      el.textContent = format(value)
      return
    }
    const controls = animate(0, value, {
      duration: 1.1,
      delay,
      ease: EASE,
      onUpdate: (v) => (el.textContent = format(v)),
    })
    return () => controls.stop()
  }, [value, format, delay, reduced])
  return <span ref={ref}>{format(0)}</span>
}
