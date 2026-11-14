import type { Transition } from 'motion/react'

/** Shared motion vocabulary so every screen moves the same way. */
export const EASE = [0.625, 0.05, 0, 1] as const

export const spring: Transition = { type: 'spring', stiffness: 260, damping: 28 }
export const snappy: Transition = { type: 'spring', stiffness: 400, damping: 30 }
export const bouncy: Transition = { type: 'spring', stiffness: 320, damping: 18 }
export const glide: Transition = { duration: 0.6, ease: EASE }

/** Children fade/slide in one after another. */
export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}

export const rise = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: spring },
}
