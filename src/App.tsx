import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { keepAwake, unlockAudio } from './lib/feedback'
import { useStore } from './lib/store'
import type { Session } from './lib/types'
import { Home } from './screens/Home'
import { Schema } from './screens/Schema'
import { SessionSheet } from './screens/SessionSheet'
import { SettingsSheet } from './screens/Settings'
import { Stats } from './screens/Stats'
import { Summary } from './screens/Summary'
import { Workout } from './screens/Workout'
import { glide, spring } from './ui/motion'
import { TabBar, type Tab } from './ui/TabBar'

const ORDER: Tab[] = ['home', 'schema', 'stats']

export default function App() {
  const active = useStore((s) => s.active)
  const startWorkout = useStore((s) => s.startWorkout)

  const [tab, setTab] = useState<Tab>('home')
  const [dir, setDir] = useState(1)
  const [workoutOpen, setWorkoutOpen] = useState(false)
  const [summary, setSummary] = useState<Session | null>(null)
  const [detail, setDetail] = useState<Session | null>(null)
  const [settings, setSettings] = useState(false)

  const inWorkout = workoutOpen && !!active
  const covered = inWorkout || !!summary

  // The background shifts hue with what you are doing — the one constant "you are here" signal.
  const mood = summary ? 'done' : inWorkout ? (active.restEndsAt ? 'rest' : 'workout') : tab

  useEffect(() => {
    keepAwake(inWorkout)
    return () => keepAwake(false)
  }, [inWorkout])

  const go = (next: Tab) => {
    setDir(ORDER.indexOf(next) >= ORDER.indexOf(tab) ? 1 : -1)
    setTab(next)
  }

  const begin = (dayId: string) => {
    unlockAudio()
    if (!active) startWorkout(dayId)
    setWorkoutOpen(true)
  }

  return (
    <div className="app">
      <div className="aurora" data-mood={mood} aria-hidden>
        <i />
        <i />
        <i />
      </div>

      <div className="column">
        <motion.div
          style={{ position: 'absolute', inset: 0 }}
          animate={covered ? { opacity: 0, scale: 0.94, pointerEvents: 'none' } : { opacity: 1, scale: 1, pointerEvents: 'auto' }}
          transition={glide}
          inert={covered}
        >
          <AnimatePresence initial={false} custom={dir}>
            <motion.main
              key={tab}
              className="screen"
              custom={dir}
              variants={{
                enter: (d: number) => ({ opacity: 0, x: d * 36, scale: 0.985 }),
                center: { opacity: 1, x: 0, scale: 1 },
                exit: (d: number) => ({ opacity: 0, x: d * -36, scale: 0.985 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={spring}
            >
              {tab === 'home' && <Home onStart={begin} onOpenSession={setDetail} onOpenSettings={() => setSettings(true)} />}
              {tab === 'schema' && <Schema onStart={begin} />}
              {tab === 'stats' && <Stats onOpenSession={setDetail} />}
            </motion.main>
          </AnimatePresence>
          <TabBar tab={tab} onChange={go} />
        </motion.div>

        <AnimatePresence>
          {inWorkout && (
            <Workout
              key="workout"
              onMinimize={() => setWorkoutOpen(false)}
              onFinished={(session) => {
                setWorkoutOpen(false)
                setSummary(session)
              }}
            />
          )}
          {summary && <Summary key="summary" session={summary} onClose={() => setSummary(null)} />}
        </AnimatePresence>

        <SessionSheet session={detail} onClose={() => setDetail(null)} />
        <SettingsSheet open={settings} onClose={() => setSettings(false)} />
      </div>
    </div>
  )
}
