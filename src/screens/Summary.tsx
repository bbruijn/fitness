import { motion } from 'motion/react'
import { useMemo } from 'react'
import { duration, num, volume } from '../lib/format'
import { sessionDuration, sessionPRs, sessionSets, sessionVolume, topWeight, weekly } from '../lib/stats'
import { useStore } from '../lib/store'
import type { Session } from '../lib/types'
import { Confetti } from '../ui/Confetti'
import { CountUp } from '../ui/CountUp'
import { IconArrowUp, IconTrophy } from '../ui/icons'
import { bouncy, rise, spring, stagger } from '../ui/motion'
import { Cta } from '../ui/Press'
import './Summary.css'

/** The pay-off after a workout: what you did, what you beat, and what the plan advises next time. */
export function Summary({ session, onClose }: { session: Session; onClose: () => void }) {
  const sessions = useStore((s) => s.sessions)
  const program = useStore((s) => s.program)
  const goal = useStore((s) => s.settings.weeklyGoal)

  const prs = useMemo(() => sessionPRs(session, sessions), [session, sessions])
  const week = useMemo(() => weekly(sessions, 1)[0], [sessions])
  const vol = volume(sessionVolume(session))
  const advice = new Map(program.days.flatMap((d) => d.items).map((it) => [it.id, it.weight]))

  return (
    <>
      <motion.div
        className="summary"
        initial={{ opacity: 0, scale: 1.04 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, y: 40 }}
        transition={spring}
      >
        <motion.div variants={stagger} initial="hidden" animate="show">
          <div className="summary__art">
            <div style={{ position: 'absolute', left: '50%', top: '45%' }}>
              <Confetti count={64} spread={250} />
            </div>
            <motion.img
              src="./img/trophy.webp"
              alt=""
              className="float"
              initial={{ opacity: 0, scale: 0.2, rotate: -40, y: 60 }}
              animate={{ opacity: 1, scale: 1, rotate: 0, y: 0 }}
              transition={{ ...bouncy, delay: 0.1 }}
            />
          </div>

          <motion.div className="eyebrow" variants={rise}>
            {session.dayName}
            {session.focus ? ` · ${session.focus}` : ''}
          </motion.div>
          <motion.h1 className="summary__title" variants={rise}>
            Lekker <span className="hot-text">gewerkt!</span>
          </motion.h1>
          <motion.p className="muted" variants={rise} style={{ marginTop: 8 }}>
            {week.workouts >= goal
              ? `Weekdoel gehaald: ${week.workouts} van ${goal} trainingen.`
              : `${week.workouts} van ${goal} trainingen deze week.`}
          </motion.p>

          <motion.div className="summary__grid" variants={rise}>
            <div className="glass summary__tile">
              <b>{duration(sessionDuration(session))}</b>
              <span>duur</span>
            </div>
            <div className="glass summary__tile">
              <b>
                {vol.unit === 'kg' ? <CountUp value={sessionVolume(session)} delay={0.3} /> : vol.value}
                <small>{vol.unit}</small>
              </b>
              <span>totaal getild</span>
            </div>
            <div className="glass summary__tile">
              <b>
                <CountUp value={sessionSets(session)} delay={0.4} />
              </b>
              <span>sets</span>
            </div>
            <div className="glass summary__tile">
              <b style={prs.length ? { color: 'var(--pink)' } : undefined}>
                <CountUp value={prs.length} delay={0.5} />
              </b>
              <span>{prs.length === 1 ? 'record' : 'records'}</span>
            </div>
          </motion.div>

          {prs.length > 0 && (
            <motion.div variants={rise}>
              <h2 className="h2">Nieuwe records</h2>
              <div className="glass list">
                {prs.map((pr) => (
                  <div key={pr.exerciseId} className="next-row">
                    <IconTrophy size={20} style={{ color: 'var(--orange)', flex: 'none' }} />
                    <div className="list__main">
                      <div className="list__title">{pr.name}</div>
                      <div className="list__sub">
                        {pr.kind === 'weight' ? 'Zwaarste gewicht' : 'Beste geschatte 1RM'} · was {num(Math.round(pr.previous * 10) / 10)} kg
                      </div>
                    </div>
                    <span className="pill pill--up">{num(Math.round(pr.value * 10) / 10)} kg</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          <motion.div variants={rise}>
            <h2 className="h2">Volgende keer</h2>
            <div className="glass list">
              {session.exercises.map((e) => {
                const next = advice.get(e.planItemId)
                const top = topWeight(e)
                return (
                  <div key={e.id} className="next-row">
                    <div className="list__main">
                      <div className="list__title">{e.name}</div>
                      <div className="list__sub">
                        {num(top)} kg × {e.sets.map((s) => s.reps).join(' · ')}
                      </div>
                    </div>
                    {next !== undefined &&
                      (next > top ? (
                        <span className="pill pill--up">
                          <IconArrowUp size={14} /> {num(next)} kg
                        </span>
                      ) : (
                        <span className="pill">{num(next)} kg</span>
                      ))}
                  </div>
                )
              })}
            </div>
          </motion.div>
        </motion.div>
      </motion.div>

      <motion.div
        className="summary__foot"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        transition={{ ...spring, delay: 0.5 }}
      >
        <Cta label="Klaar" tone="done" onPress={onClose}>
          Klaar
        </Cta>
      </motion.div>
    </>
  )
}
