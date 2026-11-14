import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { duration, greeting, int, longDate, relativeDay, volume } from '../lib/format'
import { sessionDuration, sessionSets, sessionVolume, trainedDays, weekly, weekStart, weekStreak } from '../lib/stats'
import { activeProgress, nextDayId, useStore } from '../lib/store'
import type { Day, Session } from '../lib/types'
import { CountUp } from '../ui/CountUp'
import { IconBolt, IconCheck, IconChevronRight, IconDumbbell, IconFlame, IconGear, IconPlay } from '../ui/icons'
import { bouncy, rise, snappy, spring, stagger } from '../ui/motion'
import { Press } from '../ui/Press'
import { Ring } from '../ui/Ring'
import './Home.css'

interface Props {
  onStart: (dayId: string) => void
  onOpenSession: (s: Session) => void
  onOpenSettings: () => void
}

const WEEKDAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']

/** Rough length of a day: work time plus rest for every set. */
const estimate = (day: Day): number =>
  Math.max(5, Math.round(day.items.reduce((sec, it) => sec + it.sets * (it.rest + 40), 0) / 300) * 5)

export function Home({ onStart, onOpenSession, onOpenSettings }: Props) {
  const program = useStore((s) => s.program)
  const sessions = useStore((s) => s.sessions)
  const exercises = useStore((s) => s.exercises)
  const active = useStore((s) => s.active)
  const goal = useStore((s) => s.settings.weeklyGoal)

  const suggested = nextDayId(program, sessions)
  const [picked, setPicked] = useState<string | null>(null)
  const dayId = active?.dayId ?? picked ?? suggested
  const day = program.days.find((d) => d.id === dayId) ?? program.days[0]

  const now = Date.now()
  const week = useMemo(() => weekly(sessions, 1, now)[0], [sessions, now])
  const streak = useMemo(() => weekStreak(sessions, now), [sessions, now])
  const trained = useMemo(() => trainedDays(sessions), [sessions])
  const monday = weekStart(now)
  const today = new Date(now).setHours(0, 0, 0, 0)
  const last = sessions[sessions.length - 1]
  const vol = volume(week.volume)
  const progress = active ? activeProgress(active) : null

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <motion.header className="home-head" variants={rise}>
        <div style={{ flex: 1 }}>
          <div className="eyebrow">{longDate(now)}</div>
          <h1 className="title">{greeting()}</h1>
        </div>
        <Press className="icon-btn" aria-label="Instellingen" onClick={onOpenSettings}>
          <IconGear />
        </Press>
      </motion.header>

      {day ? (
        <motion.section className="glass hero" variants={rise}>
          <motion.img
            className="hero__art float"
            src="./img/dumbbell.webp"
            alt=""
            initial={{ opacity: 0, scale: 0.5, rotate: -30 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ ...bouncy, delay: 0.25 }}
          />
          <div className="eyebrow">{active ? 'Training bezig' : day.id === suggested ? 'Volgende training' : 'Gekozen training'}</div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={day.id}
              initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(6px)' }}
              transition={{ duration: 0.22 }}
            >
              <h2 className="hero__day grad-text">{day.name}</h2>
              <p className="hero__focus">{day.focus || 'Eigen training'}</p>
              <div className="hero__meta">
                <span className="pill">
                  <IconDumbbell size={15} /> {day.items.length} oefeningen
                </span>
                <span className="pill">{day.items.reduce((n, it) => n + it.sets, 0)} sets</span>
                <span className="pill">± {estimate(day)} min</span>
              </div>
              <p className="hero__names">
                {day.items.length
                  ? day.items
                      .slice(0, 3)
                      .map((it) => exercises[it.exerciseId]?.name ?? 'Oefening')
                      .join(' · ') + (day.items.length > 3 ? ` · +${day.items.length - 3}` : '')
                  : 'Nog geen oefeningen — voeg ze toe in het schema.'}
              </p>
            </motion.div>
          </AnimatePresence>

          {!active && program.days.length > 1 && (
            <div className="days" role="group" aria-label="Kies een trainingsdag">
              {program.days.map((d) => (
                <button key={d.id} type="button" className="days__item" aria-pressed={d.id === day.id} onClick={() => setPicked(d.id)}>
                  {d.id === day.id && <motion.i layoutId="day-pill" className="days__pill" transition={snappy} />}
                  <span>{d.name}</span>
                </button>
              ))}
            </div>
          )}

          <div className="orb-wrap">
            <i className="orb__halo" />
            <i className="orb__halo" />
            {progress ? (
              <Ring value={progress.done / Math.max(1, progress.total)} size={178} stroke={5} />
            ) : (
              <i className="orb__spin" />
            )}
            <div className="orb__breathe">
              <motion.button
                type="button"
                className="orb"
                disabled={!day.items.length}
                whileTap={{ scale: 0.9 }}
                transition={bouncy}
                onClick={() => onStart(day.id)}
              >
                {progress ? (
                  <>
                    Verder
                    <small>
                      {progress.done} / {progress.total} sets
                    </small>
                  </>
                ) : (
                  <>
                    <IconPlay size={30} />
                    Start
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </motion.section>
      ) : (
        <motion.section className="glass empty" variants={rise}>
          <img className="float" src="./img/dumbbell.webp" alt="" />
          <p className="h2">Je schema is nog leeg</p>
          <p className="muted">Voeg een trainingsdag toe in het tabblad Schema.</p>
        </motion.section>
      )}

      <motion.section className="section" variants={rise}>
        <div className="glass week">
          <Ring value={week.workouts / Math.max(1, goal)} size={74} stroke={7}>
            <span className="week__count">
              {week.workouts}
              <span className="dim" style={{ fontSize: 14 }}>
                /{goal}
              </span>
            </span>
          </Ring>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="h2">Deze week</div>
            <div className="week__days">
              {WEEKDAYS.map((label, i) => {
                const d = new Date(monday)
                d.setDate(d.getDate() + i)
                const t = d.getTime()
                const on = trained.has(t)
                return (
                  <div key={label} className="week__day" data-today={t === today}>
                    <motion.span
                      className="week__dot"
                      data-on={on}
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ ...bouncy, delay: 0.3 + i * 0.05 }}
                    >
                      {on && <IconCheck size={14} strokeWidth={3} />}
                    </motion.span>
                    {label}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="tiles">
          <div className="glass tile">
            <div className="tile__icon" style={{ color: 'var(--orange)' }}>
              <IconFlame size={18} />
            </div>
            <div className="tile__value">
              <CountUp value={streak} />
              <small>wk</small>
            </div>
            <div className="tile__label">op rij</div>
          </div>
          <div className="glass tile">
            <div className="tile__icon" style={{ color: 'var(--pink)' }}>
              <IconBolt size={18} />
            </div>
            <div className="tile__value">
              <CountUp value={sessions.length} />
            </div>
            <div className="tile__label">trainingen</div>
          </div>
          <div className="glass tile">
            <div className="tile__icon" style={{ color: 'var(--violet)' }}>
              <IconDumbbell size={18} />
            </div>
            <div className="tile__value">
              {vol.value}
              <small>{vol.unit}</small>
            </div>
            <div className="tile__label">deze week</div>
          </div>
        </div>
      </motion.section>

      {last && (
        <motion.section className="section" variants={rise}>
          <div className="section__head">
            <h2 className="h2">Laatste training</h2>
          </div>
          <motion.button
            type="button"
            className="glass list__row"
            style={{ borderRadius: 'var(--r-lg)', padding: '14px 16px' }}
            whileTap={{ scale: 0.98 }}
            transition={spring}
            onClick={() => onOpenSession(last)}
          >
            <div className="list__main">
              <div className="list__title">
                {last.dayName}
                {last.focus ? ` · ${last.focus}` : ''}
              </div>
              <div className="list__sub">
                {relativeDay(last.finishedAt)} · {duration(sessionDuration(last))} · {sessionSets(last)} sets · {int(sessionVolume(last))} kg
              </div>
            </div>
            <IconChevronRight className="dim" />
          </motion.button>
        </motion.section>
      )}
    </motion.div>
  )
}
