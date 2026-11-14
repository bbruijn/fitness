import { motion, type HTMLMotionProps } from 'motion/react'
import { snappy } from './motion'

/** A button that squishes under the finger. */
export function Press({ className, children, ...rest }: HTMLMotionProps<'button'>) {
  return (
    <motion.button type="button" className={className} whileTap={{ scale: 0.94 }} transition={snappy} {...rest}>
      {children}
    </motion.button>
  )
}

interface CtaProps {
  label: string
  onPress: () => void
  tone?: 'hot' | 'quiet' | 'done'
  children: React.ReactNode
}

/**
 * The primary action. The click target is an invisible native `switch` checkbox: on iOS a real tap on
 * one produces a haptic tick, which a web page cannot trigger any other way. Elsewhere it is simply a
 * full-size click target.
 */
export function Cta({ label, onPress, tone = 'hot', children }: CtaProps) {
  return (
    <motion.div className="cta" data-tone={tone} whileTap={{ scale: 0.97 }} transition={snappy}>
      {children}
      <input
        className="cta__tap"
        type="checkbox"
        role="button"
        aria-label={label}
        checked={false}
        onChange={onPress}
        {...{ switch: '' }}
      />
    </motion.div>
  )
}
