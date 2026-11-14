import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Heatmap } from '../charts/Heatmap'
import { MuscleBars } from '../charts/MuscleBars'
import { axis, pinLastLabel, weekdayDate, weekLabelled } from '../charts/scale'
import { TrendLine } from '../charts/TrendLine'
import type { TrendLabel } from '../charts/TrendLine'
import { WeekBars } from '../charts/WeekBars'
import { duration, int, kg, num, relativeDay, shortDate, volume } from '../lib/format'
import {
  addWeeks,
  exerciseHistory,
  muscleSets,
  records,
  sessionDuration,
  sessionPRs,
  sessionSets,
  sessionVolume,
  WEEK,
  weekly,
  weekStart,
  weekStreak,
} from '../lib/stats'
import type { ExerciseRecord, WeekBucket } from '../lib/stats'
import { useStore } from '../lib/store'
import { MUSCLE_LABEL } from '../lib/types'
import type { Session } from '../lib/types'
import { CountUp } from '../ui/CountUp'
import { IconArrowUp, IconBolt, IconChevronRight, IconClock, IconDumbbell, IconFlame, IconTrophy } from '../ui/icons'
import { rise, snappy, stagger } from '../ui/motion'
import { Press } from '../ui/Press'
import { Segmented } from '../ui/Toggle'
import './Stats.css'

type Period = 4 | 12 | 'all'
type Metric = 'top' | 'e1rm'

const PERIODS: { value: Period; label: string }[] = [
  { value: 4, label: '4 wk' },
  { value: 12, label: '12 wk' },
  { value: 'all', label: 'Alles' },
]

const METRICS: { value: Metric; label: string }[] = [
  { value: 'top', label: 'Gewicht' },
  { value: 'e1rm', label: '1RM' },
]

const one = (n: number): string => num(Math.round(n * 10) / 10)
const kg1 = (n: number): string => `${one(n)} kg`
const tons = (n: number): string => one(n / 1000)
/** [10, 10, 10] → "3×10", [10, 9, 8] → "10-9-8" */
const repsText = (reps: number[]): string =>
  reps.every((r) => r === reps[0]) ? `${reps.length}×${reps[0]}` : reps.join('-')
const minutes = (ms: number): string => int(ms / 60000)

export function Stats({ onOpenSession }: { onOpenSession: (s: Session) => void }) {
  const sessions = useStore((s) => s.sessions)
  const goal = useStore((s) => s.settings.weeklyGoal)
  const [period, setPeriod] = useState<Period>(12)
  const [now] = useState(() => Date.now())

  const view = useMemo(() => {
    const current = weekStart(now)
    const span = sessions.length ? Math.round((current - weekStart(sessions[0].finishedAt)) / WEEK) + 1 : 1
    const weeks = period === 'all' ? Math.max(4, span) : period
    const from = addWeeks(current, -(weeks - 1))
    const inPeriod = sessions.filter((s) => s.finishedAt >= from)
    return {
      weeks,
      inPeriod,
      buckets: weekly(sessions, weeks, now),
      muscles: muscleSets(inPeriod),
      volume: inPeriod.reduce((sum, s) => sum + sessionVolume(s), 0),
      time: inPeriod.reduce((sum, s) => sum + sessionDuration(s), 0),
    }
  }, [sessions, period, now])

  const bests = useMemo(() => records(sessions), [sessions])
  const streak = useMemo(() => weekStreak(sessions, now), [sessions, now])

  if (!sessions.length) return <Empty />

  const count = view.inPeriod.length
  const total = volume(view.volume)
  const perWorkout = volume(count ? view.volume / count : 0)

  return (
    <div className="stats">
      <motion.header variants={stagger} initial="hidden" animate="show">
        <motion.div variants={rise}>
          <p className="eyebrow">Voortgang</p>
          <h1 className="title stats-title">
            Jouw <span className="hot-text">progressie</span>
          </h1>
        </motion.div>

        <motion.div variants={rise} className="stats-period">
          <Segmented id="stats-period" value={period} options={PERIODS} onChange={setPeriod} />
        </motion.div>

        <div className="stats-kpis">
          <Kpi tone="pink" icon={<IconDumbbell size={18} />} label="Trainingen" value={count} note={`${one(count / view.weeks)} per week`} />
          <Kpi
            tone="orange"
            icon={<IconBolt size={18} />}
            label="Totaal volume"
            value={view.volume}
            format={total.unit === 'ton' ? tons : int}
            unit={total.unit}
            note={`${perWorkout.value} ${perWorkout.unit} per training`}
          />
          <Kpi
            tone="cyan"
            icon={<IconClock size={18} />}
            label="Gem. duur"
            value={count ? view.time / count : 0}
            format={minutes}
            unit="min"
            note={count ? `${duration(view.time)} in totaal` : 'Geen trainingen'}
          />
          <Kpi
            tone="violet"
            icon={<IconFlame size={18} />}
            label="Weken op rij"
            value={streak}
            unit={streak === 1 ? 'week' : 'weken'}
            note={`Doel ${goal}× per week`}
          />
        </div>
      </motion.header>

      <Section title="Trainingen per week">
        <div className="glass stats-card">
          <WeekBars weeks={view.buckets} goal={goal} />
        </div>
      </Section>

      <Section title="Volume per week">
        <div className="glass stats-card">
          <VolumeTrend weeks={view.buckets} />
        </div>
      </Section>

      <Section title="Progressie per oefening">
        <ExerciseProgress sessions={view.inPeriod} exercises={bests} />
      </Section>

      <Section title="Spiergroepen" aside={view.muscles.length ? <span className="stats-aside">sets</span> : null}>
        <div className="glass stats-card">
          {view.muscles.length ? <MuscleBars data={view.muscles} /> : <p className="stats-none">Geen sets in deze periode.</p>}
        </div>
      </Section>

      <Section title="Consistentie">
        <div className="glass stats-card">
          <Heatmap sessions={sessions} now={now} />
        </div>
      </Section>

      <Section title="Records" aside={<span className="stats-aside">sinds het begin</span>}>
        <Records items={bests} />
      </Section>

      <Section title="Geschiedenis" aside={<span className="stats-aside">{count === 1 ? '1 training' : `${count} trainingen`}</span>}>
        <History key={period} sessions={view.inPeriod} all={sessions} now={now} onOpen={onOpenSession} />
      </Section>
    </div>
  )
}

/* ---------- pieces ---------- */

function Empty() {
  return (
    <motion.div className="stats" variants={stagger} initial="hidden" animate="show">
      <motion.div variants={rise}>
        <p className="eyebrow">Voortgang</p>
        <h1 className="title stats-title">
          Jouw <span className="hot-text">progressie</span>
        </h1>
      </motion.div>
      <motion.div variants={rise} className="glass empty stats-empty">
        <img src="./img/dumbbell.webp" className="float" alt="" />
        <h2 className="h2">Nog niets te zien</h2>
        <p className="muted">Rond je eerste training af en je grafieken, records en streak verschijnen hier.</p>
        <Press className="btn btn--hot" onClick={() => useStore.getState().loadDemo()}>
          Voorbeelddata laden
        </Press>
      </motion.div>
    </motion.div>
  )
}

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <motion.section
      className="section"
      variants={rise}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.12 }}
    >
      <div className="section__head">
        <h2 className="h2">{title}</h2>
        {aside}
      </div>
      {children}
    </motion.section>
  )
}

interface KpiProps {
  tone: 'pink' | 'orange' | 'cyan' | 'violet'
  icon: ReactNode
  label: string
  value: number
  format?: (n: number) => string
  unit?: string
  note: string
}

function Kpi({ tone, icon, label, value, format = int, unit, note }: KpiProps) {
  return (
    <motion.div variants={rise} className="glass stats-kpi">
      <p className="stats-kpi__label">
        <span className="stats-kpi__icon" data-tone={tone}>
          {icon}
        </span>
        {label}
      </p>
      <p className="stats-kpi__value">
        <CountUp value={value} format={format} delay={0.15} />
        {unit && <small>{unit}</small>}
      </p>
      <p className="stats-kpi__note">{note}</p>
    </motion.div>
  )
}

function VolumeTrend({ weeks }: { weeks: WeekBucket[] }) {
  const n = weeks.length
  const peak = weeks.reduce((m, w) => Math.max(m, w.volume), 0)
  const scale = useMemo(() => axis(0, peak, { zero: true }), [peak])
  const inTons = scale.hi >= 10000
  const points = useMemo(() => weeks.map((w, i) => ({ id: w.start, x: (i + 0.5) / n, y: w.volume })), [weeks, n])
  const labels = useMemo(() => {
    const out: TrendLabel[] = []
    weeks.forEach((w, i) => {
      if (!weekLabelled(i, n)) return
      const pin = i === n - 1 && pinLastLabel(n)
      out.push({ x: pin ? 1 : (i + 0.5) / n, text: shortDate(w.start), anchor: pin ? 'end' : 'middle' })
    })
    return out
  }, [weeks, n])

  const sum = weeks.reduce((s, w) => s + w.volume, 0)
  const mean = volume(n ? sum / n : 0)
  const best = weeks.reduce((a, b) => (b.volume > a.volume ? b : a), weeks[0])
  const bestText = volume(best?.volume ?? 0)

  return (
    <TrendLine
      tone="cool"
      zero
      points={points}
      scale={scale}
      labels={labels}
      resetKey={n}
      formatTick={(v) => (v === 0 ? '0' : inTons ? `${num(v / 1000)} t` : int(v))}
      label={
        `Vlakdiagram van het trainingsvolume per week over ${n} weken. ` +
        `Gemiddeld ${mean.value} ${mean.unit} per week, in totaal ${volume(sum).value} ${volume(sum).unit}. ` +
        (best ? `Zwaarste week: ${bestText.value} ${bestText.unit} in de week van ${shortDate(best.start)}.` : '')
      }
      readout={(i) => {
        const w = i === null ? null : weeks[i]
        const v = w ? volume(w.volume) : mean
        return (
          <>
            <p className="chart-readout__line">
              <b className="chart-readout__value">{v.value}</b>
              <span className="chart-readout__unit">{v.unit}</span>
            </p>
            <p className="chart-readout__note">
              {w ? `Week van ${shortDate(w.start)}${i === n - 1 ? ' · deze week' : ` · ${w.sets} sets`}` : 'Gemiddeld per week'}
            </p>
          </>
        )
      }}
    />
  )
}

function ExerciseProgress({ sessions, exercises }: { sessions: Session[]; exercises: ExerciseRecord[] }) {
  const [picked, setPicked] = useState<string | null>(null)
  const [metric, setMetric] = useState<Metric>('top')

  // Most-trained first; the name breaks ties so the order is stable.
  const chips = useMemo(
    () => [...exercises].sort((a, b) => b.sessions - a.sessions || a.name.localeCompare(b.name, 'nl')),
    [exercises],
  )
  const current = chips.find((c) => c.exerciseId === picked) ?? chips[0]
  const id = current?.exerciseId ?? ''
  const history = useMemo(() => (id ? exerciseHistory(sessions, id) : []), [sessions, id])

  const chart = useMemo(() => {
    const values = history.map((p) => p[metric])
    const t0 = history[0]?.t ?? 0
    const t1 = history[history.length - 1]?.t ?? 0
    const points = history.map((p, i) => ({ id: p.t, x: t1 > t0 ? (p.t - t0) / (t1 - t0) : 0.5, y: values[i] }))
    const scale = values.length ? axis(Math.min(...values), Math.max(...values)) : axis(0, 1, { zero: true })
    const labels: TrendLabel[] =
      history.length > 1
        ? [
            { x: 0, text: shortDate(t0), anchor: 'start' },
            ...(t1 - t0 > 3 * WEEK ? [{ x: 0.5, text: shortDate((t0 + t1) / 2) } satisfies TrendLabel] : []),
            { x: 1, text: shortDate(t1), anchor: 'end' },
          ]
        : history.length
          ? [{ x: 0.5, text: shortDate(t0) }]
          : []
    return { values, points, scale, labels }
  }, [history, metric])

  if (!current) return null

  const { values } = chart
  const first = history[0]
  const last = history[history.length - 1]
  const delta = values.length > 1 ? values[values.length - 1] - values[0] : 0
  const what = metric === 'top' ? 'topgewicht' : 'geschat 1RM'

  return (
    <>
      <motion.div className="stats-chips" layoutScroll role="group" aria-label="Kies een oefening">
        {chips.map((c) => {
          const on = c.exerciseId === id
          return (
            <button
              key={c.exerciseId}
              type="button"
              className="stats-chip"
              aria-pressed={on}
              onClick={(e) => {
                setPicked(c.exerciseId)
                e.currentTarget.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
              }}
            >
              {on && <motion.i layoutId="stats-chip" className="stats-chip__pill" transition={snappy} />}
              <span>{c.name}</span>
            </button>
          )
        })}
      </motion.div>

      <div className="glass stats-card">
        <TrendLine
          tone="hot"
          inset={8}
          points={chart.points}
          scale={chart.scale}
          labels={chart.labels}
          resetKey={`${id}-${metric}`}
          formatTick={num}
          empty="Geen metingen in deze periode"
          label={
            values.length
              ? `Lijndiagram van ${current.name}: ${what} per training, ${values.length} metingen van ${shortDate(first.t)} tot ${shortDate(last.t)}. ` +
                `Eerste ${kg1(values[0])}, laatste ${kg1(values[values.length - 1])}, hoogste ${kg1(Math.max(...values))}.`
              : `${current.name}: geen metingen in deze periode.`
          }
          aside={
            <div className="stats-metric">
              <Segmented id="stats-metric" value={metric} options={METRICS} onChange={setMetric} />
            </div>
          }
          readout={(i) => {
            const p = i === null ? last : history[i]
            if (!p)
              return (
                <>
                  <p className="chart-readout__line">
                    <b className="chart-readout__value">–</b>
                  </p>
                  <p className="chart-readout__note">{current.name}</p>
                </>
              )
            return (
              <>
                <p className="chart-readout__line">
                  <b className="chart-readout__value">{one(p[metric])}</b>
                  <span className="chart-readout__unit">kg</span>
                </p>
                <p className="chart-readout__note">
                  {i === null ? `Laatste · ${weekdayDate(p.t)}` : `${weekdayDate(p.t)} · ${repsText(p.reps)}`}
                </p>
              </>
            )
          }}
          below={
            <div className="stats-delta">
              {values.length > 1 ? (
                <span className={delta > 0 ? 'pill pill--up' : 'pill'}>
                  {delta !== 0 && <IconArrowUp size={14} style={delta < 0 ? { transform: 'rotate(180deg)' } : undefined} />}
                  {delta === 0 ? 'Gelijk' : `${delta > 0 ? '+' : '−'}${kg1(Math.abs(delta))}`} sinds {shortDate(first.t)}
                </span>
              ) : values.length ? (
                <span className="pill">Eerste meting · {shortDate(first.t)}</span>
              ) : (
                <span className="pill">Geen metingen</span>
              )}
              <span className="stats-delta__note">{metric === 'top' ? 'Topgewicht per training' : 'Geschat 1RM per training'}</span>
            </div>
          }
        />
      </div>
    </>
  )
}

function Records({ items }: { items: ExerciseRecord[] }) {
  const [open, setOpen] = useState(false)
  const shown = open ? items : items.slice(0, 5)
  return (
    <div className="glass stats-records">
      <table>
        <thead>
          <tr>
            <th scope="col">Oefening</th>
            <th scope="col">Zwaarst</th>
            <th scope="col">Gesch. 1RM</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((r) => (
            <tr key={r.exerciseId}>
              <th scope="row">
                <span className="stats-records__name">{r.name}</span>
                <small>
                  {MUSCLE_LABEL[r.muscle]} · {r.sessions}×
                </small>
              </th>
              <td>
                <b>{kg(r.weight)}</b>
                <small>{shortDate(r.weightAt)}</small>
              </td>
              <td>
                <b>{kg1(r.e1rm)}</b>
                <small>{shortDate(r.e1rmAt)}</small>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length > 5 && (
        <Press className="stats-more" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? 'Toon minder' : `Toon alle ${items.length} oefeningen`}
        </Press>
      )}
    </div>
  )
}

const PAGE = 6

function History({ sessions, all, now, onOpen }: { sessions: Session[]; all: Session[]; now: number; onOpen: (s: Session) => void }) {
  const [limit, setLimit] = useState(PAGE)
  const rows = useMemo(
    () =>
      [...sessions]
        .reverse()
        .slice(0, limit)
        .map((s) => ({ session: s, prs: sessionPRs(s, all).length })),
    [sessions, all, limit],
  )

  if (!sessions.length) return <p className="glass stats-card stats-none">Geen trainingen in deze periode.</p>

  return (
    <div className="glass list">
      {rows.map(({ session: s, prs }) => {
        const v = volume(sessionVolume(s))
        return (
          <motion.button key={s.id} type="button" className="list__row stats-session" whileTap={{ scale: 0.98 }} transition={snappy} onClick={() => onOpen(s)}>
            <div className="list__main">
              <div className="list__title">{[s.dayName, s.focus].filter(Boolean).join(' · ')}</div>
              <div className="list__sub">
                {relativeDay(s.finishedAt, now)} · {duration(sessionDuration(s))} · {v.value} {v.unit} · {sessionSets(s)} sets
              </div>
            </div>
            {prs > 0 && (
              <span className="pill pill--hot" aria-label={prs === 1 ? '1 record' : `${prs} records`}>
                <IconTrophy size={14} />
                {prs}
              </span>
            )}
            <IconChevronRight size={18} className="stats-session__go" />
          </motion.button>
        )
      })}
      {sessions.length > limit && (
        <Press className="stats-more" onClick={() => setLimit(limit + 10)}>
          Toon meer ({sessions.length - limit})
        </Press>
      )}
    </div>
  )
}
