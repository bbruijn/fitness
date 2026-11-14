import { motion, useInView, useReducedMotion } from 'motion/react'
import { useMemo } from 'react'
import { addWeeks, sessionSets, weekStart } from '../lib/stats'
import type { Session } from '../lib/types'
import { EASE } from '../ui/motion'
import './charts.css'
import { useScrub, useWidth } from './hooks'
import { weekdayDate } from './scale'

const LEFT = 26
const TOP = 20
const GAP = 4
const ROWS = ['ma', '', 'wo', '', 'vr', '', 'zo']
const monthFmt = new Intl.DateTimeFormat('nl-NL', { month: 'short' })

interface Cell {
  t: number
  col: number
  row: number
  sets: number
  count: number
  title: string
  /** 0 = rest day, 1…3 = lighter → heavier training day. */
  level: 0 | 1 | 2 | 3
  future: boolean
  today: boolean
}

/**
 * Training calendar: one column per week, Monday on top. One hue in three strengths — a brighter cell
 * is a day with more sets — and a ring marks today. Touch a cell to read that day.
 */
export function Heatmap({ sessions, now, weeks = 15 }: { sessions: Session[]; now: number; weeks?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const inView = useInView(ref, { once: true, amount: 0.4 })
  const reduced = useReducedMotion()

  const { cells, months, trained } = useMemo(() => {
    const byDay = new Map<number, { sets: number; count: number; title: string }>()
    for (const s of sessions) {
      const key = new Date(s.finishedAt).setHours(0, 0, 0, 0)
      const d = byDay.get(key) ?? { sets: 0, count: 0, title: '' }
      d.sets += sessionSets(s)
      d.count++
      d.title = d.title ? `${d.title} + ${s.dayName}` : [s.dayName, s.focus].filter(Boolean).join(' · ')
      byDay.set(key, d)
    }
    const today = new Date(now).setHours(0, 0, 0, 0)
    const first = addWeeks(weekStart(now), -(weeks - 1))
    const cells: Cell[] = []
    const months: { col: number; text: string }[] = []
    let peak = 0
    let trained = 0
    let month = -1
    for (let col = 0; col < weeks; col++) {
      const monday = new Date(addWeeks(first, col))
      if (monday.getMonth() !== month) {
        month = monday.getMonth()
        // Skip a label that would run into the previous one.
        if (!months.length || col - months[months.length - 1].col >= 3) months.push({ col, text: monthFmt.format(monday).replace('.', '') })
      }
      for (let row = 0; row < 7; row++) {
        const d = new Date(monday)
        d.setDate(d.getDate() + row)
        const t = d.getTime()
        const hit = byDay.get(t)
        if (hit) {
          peak = Math.max(peak, hit.sets)
          trained++
        }
        cells.push({ t, col, row, sets: hit?.sets ?? 0, count: hit?.count ?? 0, title: hit?.title ?? '', level: 0, future: t > today, today: t === today })
      }
    }
    for (const c of cells) if (c.count) c.level = c.sets < peak * 0.5 ? 1 : c.sets < peak * 0.8 ? 2 : 3
    return { cells, months, trained }
  }, [sessions, now, weeks])

  const size = Math.max(0, Math.min(24, (width - LEFT - GAP * (weeks - 1)) / weeks))
  const pitch = size + GAP
  const height = TOP + 7 * size + 6 * GAP + 2
  const xOf = (col: number) => LEFT + col * pitch
  const yOf = (row: number) => TOP + row * pitch

  const scrub = useScrub(cells.length, (x, y) => {
    const col = Math.min(weeks - 1, Math.max(0, Math.floor((x - LEFT + GAP / 2) / pitch)))
    const row = Math.min(6, Math.max(0, Math.floor((y - TOP + GAP / 2) / pitch)))
    return col * 7 + row
  })
  const picked = scrub.index === null ? null : cells[scrub.index]
  const todayCell = cells.find((c) => c.today)

  return (
    <div className="chart">
      <div className="chart-head">
        <div className="chart-readout" aria-live="polite">
          {picked ? (
            <>
              <p className="chart-readout__line">
                <b className="chart-readout__value chart-readout__value--sm">{weekdayDate(picked.t)}</b>
              </p>
              <p className="chart-readout__note">
                {picked.count
                  ? `${picked.title} · ${picked.sets} sets`
                  : picked.future
                    ? 'Nog te gaan'
                    : picked.today
                      ? 'Vandaag nog niet getraind'
                      : 'Rustdag'}
              </p>
            </>
          ) : (
            <>
              <p className="chart-readout__line">
                <b className="chart-readout__value">{trained}</b>
                <span className="chart-readout__unit">{trained === 1 ? 'trainingsdag' : 'trainingsdagen'}</span>
              </p>
              <p className="chart-readout__note">in de laatste {weeks} weken</p>
            </>
          )}
        </div>
      </div>

      <div ref={ref} className="chart-plot" style={{ height: width ? height : 160 }} tabIndex={0} {...scrub.bind}>
        {width > 0 && (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={`Kalender van de laatste ${weeks} weken, een kolom per week van maandag tot zondag: ${trained} trainingsdagen.`}
          >
            {months.map((m) => (
              <text key={m.col} x={xOf(m.col)} y={11} className="chart-tick">
                {m.text}
              </text>
            ))}
            {ROWS.map((r, row) =>
              r ? (
                <text key={row} x={0} y={yOf(row) + size / 2} dy="0.35em" className="chart-tick">
                  {r}
                </text>
              ) : null,
            )}
            {cells.map((c) => (
              <motion.rect
                key={c.t}
                x={xOf(c.col)}
                y={yOf(c.row)}
                width={size}
                height={size}
                rx={Math.min(5, size / 3)}
                className={`chart-cell chart-cell--${c.future ? 'future' : c.level}`}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.4 }}
                transition={reduced ? { duration: 0 } : { duration: 0.45, ease: EASE, delay: c.col * 0.028 + c.row * 0.012 }}
              />
            ))}
            {todayCell && (
              <rect
                x={xOf(todayCell.col) - 2}
                y={yOf(todayCell.row) - 2}
                width={size + 4}
                height={size + 4}
                rx={Math.min(5, size / 3) + 2}
                className="chart-today"
              />
            )}
            {picked && (
              <rect
                x={xOf(picked.col) - 2}
                y={yOf(picked.row) - 2}
                width={size + 4}
                height={size + 4}
                rx={Math.min(5, size / 3) + 2}
                className="chart-pick"
              />
            )}
          </svg>
        )}
      </div>

      <ul className="chart-legend" aria-hidden>
        <li>
          Minder
          <i className="chart-key chart-key--cell chart-cell--1" />
          <i className="chart-key chart-key--cell chart-cell--2" />
          <i className="chart-key chart-key--cell chart-cell--3" />
          meer sets
        </li>
        <li>
          <i className="chart-key chart-key--today" />
          Vandaag
        </li>
      </ul>
    </div>
  )
}
