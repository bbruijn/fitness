import '@fontsource-variable/outfit'
import { MotionConfig } from 'motion/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/base.css'
import './styles/ui.css'
// Shared styles first, so each screen's own stylesheet can refine them.
import App from './App'
import { useStore } from './lib/store'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
)

// iOS does not move fixed elements out of the keyboard's way; expose its height so sheets can sit above it.
const viewport = window.visualViewport
if (viewport) {
  const sync = () => {
    const covered = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
    document.documentElement.style.setProperty('--kb', `${Math.round(covered)}px`)
  }
  viewport.addEventListener('resize', sync)
  viewport.addEventListener('scroll', sync)
}

// Ask the browser not to evict the training history, and cache the app for offline use.
void navigator.storage?.persist?.()
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  void navigator.serviceWorker.register('./sw.js').catch(() => {})
}

// Handy while developing: `__volt.getState().loadDemo()` in the console.
if (import.meta.env.DEV) (window as unknown as { __volt: typeof useStore }).__volt = useStore
