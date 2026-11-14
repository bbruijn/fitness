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

/**
 * Touch-first inspection: put a finger on the chart and drag to read values. There is no hover on a
 * phone, so a touch selects immediately and the reading lingers briefly after the finger lifts. The
 * element needs `touch-action: pan-y` so the page still scrolls vertically. Arrow keys do the same.
 */
export function useScrub(count: number, locate: (x: number, y: number) => number | null, resetKey: string | number = ''): Scrub {
  const [index, setIndex] = useState<number | null>(null)
  const timer = useRef(0)

  useEffect(() => () => window.clearTimeout(timer.current), [])
  useEffect(() => {
    window.clearTimeout(timer.current)
    setIndex(null)
  }, [resetKey, count])

  const pick = (e: PointerEvent<HTMLElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const next = locate(e.clientX - box.left, e.clientY - box.top)
    setIndex((prev) => (prev === next ? prev : next))
  }

  const release = useCallback((delay: number) => {
    window.clearTimeout(timer.current)
    if (delay) timer.current = window.setTimeout(() => setIndex(null), delay)
    else setIndex(null)
  }, [])

  return {
    index: index !== null && index < count ? index : null,
    bind: {
      onPointerDown: (e) => {
        window.clearTimeout(timer.current)
        pick(e)
      },
      onPointerMove: (e) => {
        if (e.pointerType === 'mouse' || e.buttons > 0 || e.pressure > 0) {
          window.clearTimeout(timer.current)
          pick(e)
        }
      },
      onPointerUp: (e) => {
        if (e.pointerType !== 'mouse') release(LINGER)
      },
      onPointerCancel: () => release(LINGER),
      onPointerLeave: (e) => {
        if (e.pointerType === 'mouse') release(0)
      },
      onKeyDown: (e) => {
        if (!count) return
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault()
          window.clearTimeout(timer.current)
          const step = e.key === 'ArrowLeft' ? -1 : 1
          setIndex((prev) => (prev === null ? count - 1 : Math.min(count - 1, Math.max(0, prev + step))))
        } else if (e.key === 'Escape') release(0)
      },
      onBlur: () => release(0),
    },
  }
}
