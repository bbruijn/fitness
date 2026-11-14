import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent, RefObject } from 'react'

/** Width of an element in CSS pixels, so charts draw at real size and text stays 11px at any width. */
export function useWidth<T extends HTMLElement>(): [RefObject<T | null>, number] {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.clientWidth)
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width]
}

export interface Scrub {
  /** The data index under the finger, or null when nothing is being inspected. */
  index: number | null
  bind: {
    onPointerDown: (e: PointerEvent<HTMLElement>) => void
    onPointerMove: (e: PointerEvent<HTMLElement>) => void
    onPointerUp: (e: PointerEvent<HTMLElement>) => void
    onPointerCancel: () => void
    onPointerLeave: (e: PointerEvent<HTMLElement>) => void
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => void
    onBlur: () => void
  }
}

const LINGER = 1800
const HOLD = 90

/**
 * Touch-first inspection: put a finger on the chart and drag to read values. There is no hover on a
 * phone, so a tap or a short hold selects, and the reading lingers briefly after the finger lifts. The
 * element needs `touch-action: pan-y`: a vertical swipe still scrolls the page (the browser cancels
 * the pointer, and the short hold keeps a reading from flashing up first). Arrow keys do the same.
 */
export function useScrub(count: number, locate: (x: number, y: number) => number | null, resetKey: string | number = ''): Scrub {
  const [index, setIndex] = useState<number | null>(null)
  const linger = useRef(0)
  const hold = useRef(0)
  /** Latest position of the finger on the chart, while one is down. */
  const finger = useRef<{ x: number; y: number } | null>(null)
  const armed = useRef(false)

  useEffect(
    () => () => {
      window.clearTimeout(linger.current)
      window.clearTimeout(hold.current)
    },
    [],
  )
  useEffect(() => {
    window.clearTimeout(linger.current)
    setIndex(null)
  }, [resetKey, count])

  const point = (e: PointerEvent<HTMLElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - box.left, y: e.clientY - box.top }
  }

  const select = (p: { x: number; y: number }) => {
    const next = locate(p.x, p.y)
    setIndex((prev) => (prev === next ? prev : next))
  }

  const release = useCallback((delay: number) => {
    window.clearTimeout(linger.current)
    if (delay) linger.current = window.setTimeout(() => setIndex(null), delay)
    else setIndex(null)
  }, [])

  const lift = () => {
    window.clearTimeout(hold.current)
    finger.current = null
    armed.current = false
  }

  return {
    index: index !== null && index < count ? index : null,
    bind: {
      onPointerDown: (e) => {
        window.clearTimeout(linger.current)
        if (e.pointerType === 'mouse') return select(point(e))
        finger.current = point(e)
        armed.current = false
        window.clearTimeout(hold.current)
        hold.current = window.setTimeout(() => {
          armed.current = true
          if (finger.current) select(finger.current)
        }, HOLD)
      },
      onPointerMove: (e) => {
        if (e.pointerType === 'mouse') {
          window.clearTimeout(linger.current)
          return select(point(e))
        }
        if (!finger.current) return
        finger.current = point(e)
        if (armed.current) select(finger.current)
      },
      onPointerUp: (e) => {
        if (e.pointerType === 'mouse') return
        if (finger.current) select(finger.current)
        lift()
        release(LINGER)
      },
      onPointerCancel: () => {
        lift()
        release(0)
      },
      onPointerLeave: (e) => {
        if (e.pointerType === 'mouse') release(0)
      },
      onKeyDown: (e) => {
        if (!count) return
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault()
          window.clearTimeout(linger.current)
          const step = e.key === 'ArrowLeft' ? -1 : 1
          setIndex((prev) => (prev === null ? count - 1 : Math.min(count - 1, Math.max(0, prev + step))))
        } else if (e.key === 'Escape') release(0)
      },
      onBlur: () => release(0),
    },
  }
}
