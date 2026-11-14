import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { num } from '../lib/format'
import { snappy } from './motion'

/** A number that rolls up or down when it changes. */
export function Ticker({ value, format = num, className }: { value: number; format?: (n: number) => string; className?: string }) {
  const prev = useRef(value)
  const dir = value >= prev.current ? 1 : -1
  useEffect(() => {
    prev.current = value
  }, [value])

  return (
    <span className={`ticker ${className ?? ''}`}>
      <AnimatePresence mode="popLayout" initial={false} custom={dir}>
        <motion.span
          key={value}
          custom={dir}
          variants={{
            enter: (d: number) => ({ y: `${d * 0.45}em`, opacity: 0, filter: 'blur(6px)' }),
            center: { y: 0, opacity: 1, filter: 'blur(0px)' },
            exit: (d: number) => ({ y: `${d * -0.45}em`, opacity: 0, filter: 'blur(6px)' }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={snappy}
        >
          {format(value)}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
