import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { playChime, unlockAudio, vibrate } from '../lib/feedback'
import { clock, num } from '../lib/format'
import { doneSets, lastPerformance, records } from '../lib/stats'
import { activeProgress, useStore } from '../lib/store'
import { MUSCLE_LABEL, type ExerciseLog, type Session } from '../lib/types'
import { useNow } from '../lib/useNow'
import { Confetti } from '../ui/Confetti'
import { IconBolt, IconCheck, IconChevronDown, IconClock, IconList, IconNote, IconPlus, IconTrash, IconTrophy } from '../ui/icons'
import { bouncy, snappy, spring } from '../ui/motion'
import { Cta, Press } from '../ui/Press'
import { Ring } from '../ui/Ring'
import { Sheet } from '../ui/Sheet'
import { Stepper } from '../ui/Stepper'
import './Workout.css'

interface Props {
  onMinimize: () => void
  onFinished: (session: Session | null) => void
}

/** The set to work on next: the first one not yet logged, else the last. */
const nextSet = (e: ExerciseLog): number => {
  const i = e.sets.findIndex((s) => !s.done)
  return i === -1 ? e.sets.length - 1 : i
}

export function Workout({ onMinimize, onFinished }: Props) {
  const a = useStore((s) => s.active)
  const sessions = useStore((s) => s.sessions)
  const settings = useStore((s) => s.settings)
  const { goTo, updateSet, completeSet, undoSet, addSet, removeSet, setNote, adjustRest, endRest, finishWorkout, discardWorkout } =
    useStore.getState()

  const [sel, setSel] = useState(() => (a ? nextSet(a.exercises[a.index]) : 0))
  const [dir, setDir] = useState(1)
  const [overview, setOverview] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [noting, setNoting] = useState(false)
  const [ripple, setRipple] = useState(0)
  const [goUntil, setGoUntil] = useState(0)

  const resting = !!a?.restEndsAt
  const now = useNow(resting ? 100 : 1000)
  const best = useMemo(() => new Map(records(sessions).map((r) => [r.exerciseId, r])), [sessions])
  const advance = useRef<number | undefined>(undefined)
  useEffect(() => () => clearTimeout(advance.current), [])

  // Rest is over: say so on screen first (colour shift + "Go"), sound and vibration are extras.
  const left = a?.restEndsAt ? a.restEndsAt - now : 0
  useEffect(() => {
    if (!a?.restEndsAt || left > 0) return
    const overdue = -left
    endRest()
    if (overdue < 4000) {
      if (settings.sound) playChime()
      if (settings.haptics) vibrate([120, 60, 120])
      setGoUntil(Date.now() + 2600)
    }
  }, [a?.restEndsAt, left, endRest, settings.sound, settings.haptics])

  if (!a) return null

  const ei = a.index
  const e = a.exercises[ei]
  const si = Math.min(sel, e.sets.length - 1)
  const set = e.sets[si]
  const progress = activeProgress(a)
  const allDone = progress.done === progress.total
  const previous = lastPerformance(sessions, e.exerciseId)
  const prior = best.get(e.exerciseId)
  const isRecord = !!prior && doneSets(e).some((s) => s.weight > prior.weight)
  const showGo = !resting && goUntil > now

  const navigate = (i: number) => {
    if (i === ei || i < 0 || i >= a.exercises.length) return
    clearTimeout(advance.current)
    setDir(i > ei ? 1 : -1)
    setSel(nextSet(a.exercises[i]))
    goTo(i)
  }

  /** Where to go once this set is logged: the next open set here, else the next exercise with work left. */
  const forward = (skip: number) => {
    const here = e.sets.findIndex((s, i) => !s.done && i !== skip)
    if (here !== -1) return setSel(here)
    const n = a.exercises.length
    for (let k = 1; k < n; k++) {
      const j = (ei + k) % n
      if (a.exercises[j].sets.some((s) => !s.done)) {
        advance.current = window.setTimeout(() => navigate(j), 700)
        return
      }
    }
  }

  const press = () => {
    unlockAudio()
    if (allDone) return finish()
    if (set.done) return forward(-1)
    if (settings.haptics) vibrate(18)
    setRipple((r) => r + 1)
    setGoUntil(0)
    completeSet(ei, si)
    forward(si)
  }

  const finish = () => {
    clearTimeout(advance.current)
    onFinished(finishWorkout())
  }

  const cta = allDone
    ? { label: 'Training afronden', tone: 'done' as const }
    : set.done
      ? { label: 'Volgende', tone: 'quiet' as const }
      : { label: 'Set voltooid', tone: 'hot' as const }

  const upNext = (() => {
    const i = e.sets.findIndex((s) => !s.done)
    if (i !== -1) return `Set ${i + 1} · ${num(e.sets[i].weight)} kg × ${e.sets[i].reps}`
    const nx = a.exercises.find((x, j) => j !== ei && x.sets.some((s) => !s.done))
    return nx ? nx.name : 'Klaar!'
  })()

  return (
    <motion.div
      className="workout"
      initial={{ opacity: 0, y: 60, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 60, scale: 0.96 }}
      transition={spring}
    >
      <header className="workout__bar">
        <Press className="icon-btn" aria-label="Training verkleinen" onClick={onMinimize}>
          <IconChevronDown />
        </Press>
        <div className="workout__clock">
          <b>{clock(now - a.startedAt)}</b>
          <span>
            {a.dayName}
            {a.focus ? ` · ${a.focus}` : ''}
          </span>
        </div>
        <Press className="btn btn--sm" onClick={() => (allDone ? finish() : setFinishing(true))}>
          Klaar
        </Press>
      </header>

      <div className="segs" role="tablist" aria-label="Oefeningen">
        {a.exercises.map((x, i) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            className="segs__item"
            aria-selected={i === ei}
            aria-current={i === ei}
            aria-label={`${x.name}: ${doneSets(x).length} van ${x.sets.length} sets`}
            onClick={() => navigate(i)}
          >
            <span className="segs__track">
              <motion.i
                className="segs__fill"
                initial={false}
                animate={{ scaleX: doneSets(x).length / x.sets.length }}
                transition={spring}
              />
            </span>
          </button>
        ))}
      </div>

      <div className="workout__stage">
        <AnimatePresence initial={false} custom={dir}>
          <motion.section
            key={e.id}
            className="exercise"
            custom={dir}
            variants={{
              enter: (d: number) => ({ opacity: 0, x: d * 90, scale: 0.96 }),
              center: { opacity: 1, x: 0, scale: 1 },
              exit: (d: number) => ({ opacity: 0, x: d * -90, scale: 0.96 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={spring}
            drag="x"
            dragDirectionLock
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={(_, info) => {
              if (info.offset.x < -70 || info.velocity.x < -500) navigate(ei + 1)
              else if (info.offset.x > 70 || info.velocity.x > 500) navigate(ei - 1)
            }}
          >
            <div className="row">
              <div className="eyebrow" style={{ flex: 1 }}>
                Oefening {ei + 1} van {a.exercises.length} · {MUSCLE_LABEL[e.muscle]}
              </div>
              <Press className="icon-btn icon-btn--plain" aria-label="Alle oefeningen" onClick={() => setOverview(true)}>
                <IconList />
              </Press>
            </div>
            <h1 className="exercise__title">{e.name}</h1>

            <div className="exercise__pills">
              <span className="pill pill--hot">
                <IconBolt size={14} /> Advies {num(e.targetWeight)} kg × {e.targetReps}
              </span>
              {previous ? (
                <span className="pill">
                  <IconClock size={14} /> Vorige {num(Math.max(...doneSets(previous).map((s) => s.weight)))} kg ×{' '}
                  {doneSets(previous)
                    .map((s) => s.reps)
                    .join(' · ')}
                </span>
              ) : (
                <span className="pill">Eerste keer</span>
              )}
            </div>

            <div className="glass dial">
              <AnimatePresence>
                {isRecord && (
                  <motion.span
                    className="pill pill--up dial__record"
                    initial={{ opacity: 0, scale: 0.4, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.4 }}
                    transition={bouncy}
                  >
                    <Confetti count={24} spread={130} />
                    <IconTrophy size={14} /> Nieuw record
                  </motion.span>
                )}
              </AnimatePresence>
              <Stepper
                label="Gewicht"
                unit="kg"
                value={set.weight}
                step={settings.weightStep}
                max={500}
                onChange={(weight) => updateSet(ei, si, { weight })}
              />
              <div className="dial__rule" />
              <Stepper
                label="Herhalingen"
                unit="reps"
                value={set.reps}
                step={1}
                min={1}
                max={99}
                numClass="reps-text"
                onChange={(reps) => updateSet(ei, si, { reps })}
              />
            </div>

            <div className="sets" role="group" aria-label="Sets">
              {e.sets.map((s, i) => (
                <motion.button
                  key={i}
                  type="button"
                  className="setchip"
                  data-done={s.done}
                  aria-pressed={i === si}
                  aria-label={`Set ${i + 1}${s.done ? `, gedaan: ${num(s.weight)} kg × ${s.reps}` : ''}`}
                  whileTap={{ scale: 0.94 }}
                  transition={snappy}
                  onClick={() => setSel(i)}
                >
                  {i === si && <motion.i layoutId={`ring-${e.id}`} className="setchip__ring" transition={snappy} />}
                  <span className="setchip__n">
                    Set {i + 1}
                    {s.done && (
                      <motion.i className="setchip__check" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={bouncy}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <motion.path d="m5 12.5 4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35, delay: 0.1 }} />
                        </svg>
                      </motion.i>
                    )}
                  </span>
                  {s.done && (
                    <span className="setchip__v">
                      {num(s.weight)} × {s.reps}
                    </span>
                  )}
                </motion.button>
              ))}
              {e.sets.length < 6 && (
                <Press className="setchip setchip--add" aria-label="Set toevoegen" onClick={() => addSet(ei)}>
                  <IconPlus size={20} />
                </Press>
              )}
            </div>

            <div className="exercise__tools">
              <Press className="btn btn--sm" onClick={() => setNoting(true)}>
                <IconNote size={17} /> {e.note ? 'Notitie bekijken' : 'Notitie'}
              </Press>
              {set.done && (
                <Press className="btn btn--sm" onClick={() => undoSet(ei, si)}>
                  Set {si + 1} ongedaan maken
                </Press>
              )}
              {!set.done && e.sets.length > 1 && (
                <Press
                  className="btn btn--sm btn--ghost"
                  onClick={() => {
                    removeSet(ei, si)
                    setSel(Math.max(0, si - 1))
                  }}
                >
                  <IconTrash size={17} /> Set {si + 1} schrappen
                </Press>
              )}
            </div>
          </motion.section>
        </AnimatePresence>
      </div>

      <footer className="workout__foot">
        <AnimatePresence initial={false}>
          {(resting || showGo) && (
            <motion.div
              key="rest"
              className="glass rest"
              data-go={showGo}
              initial={{ opacity: 0, y: 30, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto', marginBottom: 12 }}
              exit={{ opacity: 0, y: 30, height: 0, marginBottom: 0 }}
              transition={spring}
            >
              {showGo ? (
                <>
                  <motion.span className="rest__go" initial={{ scale: 0.3 }} animate={{ scale: [0.3, 1.15, 1] }} transition={{ duration: 0.5 }}>
                    <IconBolt size={28} />
                  </motion.span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="rest__label" style={{ color: '#fff' }}>
                      Rust voorbij
                    </div>
                    <div className="rest__next">{upNext}</div>
                  </div>
                </>
              ) : (
                <>
                  <Ring value={left / Math.max(1, a.restTotal * 1000)} size={76} stroke={7} from="#5cd9ff" to="#7c5cff" instant>
                    <span className="rest__time">{clock(left + 999)}</span>
                  </Ring>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="rest__next">
                      <span className="rest__label">Rust · hierna </span>
                      {upNext}
                    </div>
                    <div className="row" style={{ gap: 8, marginTop: 8 }}>
                      <Press className="btn btn--sm" aria-label="15 seconden korter rusten" onClick={() => adjustRest(-15)}>
                        −15
                      </Press>
                      <Press className="btn btn--sm" aria-label="15 seconden langer rusten" onClick={() => adjustRest(15)}>
                        +15
                      </Press>
                      <Press className="btn btn--sm" style={{ flex: 1 }} onClick={endRest}>
                        Sla over
                      </Press>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="cta-wrap">
          <AnimatePresence>
            {ripple > 0 && (
              <motion.i
                key={ripple}
                className="cta__ripple"
                initial={{ opacity: 0.9, scaleX: 1, scaleY: 1 }}
                animate={{ opacity: 0, scaleX: 1.12, scaleY: 1.7 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
              />
            )}
          </AnimatePresence>
          <Cta label={cta.label} tone={cta.tone} onPress={press}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={cta.label}
                className="row"
                style={{ gap: 10 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.16 }}
              >
                {cta.tone === 'hot' && <IconCheck size={22} strokeWidth={3} />}
                {cta.tone === 'done' && <IconTrophy size={22} />}
                {cta.label}
              </motion.span>
            </AnimatePresence>
          </Cta>
        </div>
      </footer>

      <Sheet open={overview} onClose={() => setOverview(false)} title="Oefeningen">
        <div className="glass list">
          {a.exercises.map((x, i) => {
            const d = doneSets(x).length
            return (
              <button
                key={x.id}
                type="button"
                className="list__row"
                aria-current={i === ei}
                onClick={() => {
                  navigate(i)
                  setOverview(false)
                }}
              >
                <span className="ovw__state" data-done={d === x.sets.length}>
                  {d === x.sets.length ? <IconCheck size={16} strokeWidth={3} /> : i + 1}
                </span>
                <div className="list__main">
                  <div className="list__title">{x.name}</div>
                  <div className="list__sub">
                    {d} van {x.sets.length} sets · {num(x.targetWeight)} kg × {x.targetReps}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </Sheet>

      <Sheet open={noting} onClose={() => setNoting(false)} title="Notitie">
        <label className="label" htmlFor="note">
          {e.name}
        </label>
        <textarea
          id="note"
          className="field"
          rows={4}
          placeholder="Bijv. stoelstand 4, voeten hoog op de plaat…"
          value={e.note}
          onChange={(ev) => setNote(ei, ev.target.value)}
        />
        <Press className="btn btn--hot btn--block" style={{ marginTop: 14 }} onClick={() => setNoting(false)}>
          Bewaren
        </Press>
      </Sheet>

      <Sheet
        open={finishing}
        onClose={() => {
          setFinishing(false)
          setConfirmDiscard(false)
        }}
        title="Training afronden?"
      >
        <p className="muted" style={{ marginBottom: 18 }}>
          {progress.done === 0
            ? 'Je hebt nog geen sets gelogd. Afronden bewaart dan niets.'
            : `${progress.done} van ${progress.total} sets gelogd. De overige ${progress.total - progress.done} tellen niet mee.`}
        </p>
        <div className="stack">
          <Press className="btn btn--hot btn--block" onClick={finish}>
            {progress.done === 0 ? 'Stoppen zonder bewaren' : 'Afronden en bewaren'}
          </Press>
          <Press className="btn btn--block" onClick={() => setFinishing(false)}>
            Verder trainen
          </Press>
          {progress.done > 0 && (
            <Press
              className="btn btn--ghost btn--danger btn--block"
              onClick={() => {
                if (!confirmDiscard) return setConfirmDiscard(true)
                clearTimeout(advance.current)
                discardWorkout()
                onFinished(null)
              }}
            >
              <IconTrash size={18} /> {confirmDiscard ? 'Zeker weten? Tik nogmaals' : 'Training weggooien'}
            </Press>
          )}
        </div>
      </Sheet>
    </motion.div>
  )
}
