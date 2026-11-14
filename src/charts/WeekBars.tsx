import { motion, useInView, useReducedMotion } from 'motion/react'
import { useId, useMemo } from 'react'
import { num, shortDate } from '../lib/format'
import type { WeekBucket } from '../lib/stats'
import { glide, spring } from '../ui/motion'
import './charts.css'
import { useScrub, useWidth } from './hooks'
import { AXIS_BAND, axis, GUTTER, nearest, PAD_TOP, pinLastLabel, weekLabelled } from './scale'

const HEIGHT = 176
const RADIUS = 4
const INSTANT = { duration: 0 }

const one = (n: number): string => num(Math.round(n * 10) / 10)

/**
 * Workouts per week against the weekly goal. Weeks that reach the goal are drawn solid with a tick
 * above them; weeks that fall short are a faint version of the same bar — so the difference survives
 * without colour vision — and the dashed line shows how far short.
 */
export function WeekBars({ weeks, goal }: { weeks: WeekBucket[]; goal: number }) {
  const id = useId()
  const [ref, width] = useWidth<HTMLDivElement>()
  const inView = useInView(ref, { once: true, amount: 0.4 })
  const reduced = useReducedMotion()

  const n = weeks.length
  const total = weeks.reduce((sum, w) => sum + w.workouts, 0)
  const met = weeks.filter((w) => w.workouts >= goal).length
  const peak = weeks.reduce((m, w) => Math.max(m, w.workouts), 0)
  const scale = useMemo(() => axis(0, Math.max(goal, peak), { zero: true, integer: true }), [goal, peak])

  const base = HEIGHT - AXIS_BAND
  const plotW = Math.max(0, width - GUTTER)
  const slot = n ? plotW / n : 0
  const barW = Math.min(22, Math.max(2, slot * 0.56))
  const rx = Math.min(RADIUS, barW / 2)
  const yOf = (v: number) => base - ((v - scale.lo) / (scale.hi - scale.lo)) * (base - PAD_TOP)
  const centers = useMemo(() => weeks.map((_, i) => GUTTER + slot * (i + 0.5)), [weeks, slot])

  const scrub = useScrub(n, (x) => nearest(centers, x), n)
  const active = scrub.index
  const picked = active === null ? null : weeks[active]

  const showTicks = slot >= 18
  const goalY = yOf(goal)

  const label =
    `Staafdiagram van het aantal trainingen per week over ${n} weken. ` +
    `Gemiddeld ${one(n ? total / n : 0)} per week, het doel is ${goal}. ` +
    `Doel gehaald in ${met} van de ${n} weken. Deze week: ${weeks[n - 1]?.workouts ?? 0}.`

  return (
    <div className="chart">
      <div className="chart-head">
        <div className="chart-readout" aria-live="polite">
          {picked ? (
            <>
              <p className="chart-readout__line">
                <b className="chart-readout__value">{picked.workouts}</b>
                <span className="chart-readout__unit">{picked.workouts === 1 ? 'training' : 'trainingen'}</span>
              </p>
              <p className="chart-readout__note">
                Week van {shortDate(picked.start)}
                {active === n - 1 ? ' · deze week' : picked.workouts >= goal ? ' · doel gehaald' : ''}
              </p>
            </>
          ) : (
            <>
              <p className="chart-readout__line">
                <b className="chart-readout__value">{one(n ? total / n : 0)}</b>
                <span className="chart-readout__unit">per week</span>
              </p>
              <p className="chart-readout__note">
                Doel gehaald in {met} van {n} weken
              </p>
            </>
          )}
        </div>
      </div>

      <div ref={ref} className="chart-plot" style={{ height: HEIGHT }} tabIndex={0} {...scrub.bind}>
        {width > 0 && (
          <svg width={width} height={HEIGHT} role="img" aria-label={label}>
            <defs>
              <linearGradient id={`${id}-fill`} gradientUnits="userSpaceOnUse" x1="0" y1={base} x2="0" y2={PAD_TOP}>
                <stop offset="0" stopColor="#ff3dbb" />
                <stop offset="0.55" stopColor="#ff5470" />
                <stop offset="1" stopColor="#ff8a2b" />
              </linearGradient>
              <clipPath id={`${id}-clip`}>
                <rect x={0} y={0} width={width} height={base} />
              </clipPath>
            </defs>

            {scale.ticks.map((t) => (
              <motion.g
                key={t}
                initial={{ opacity: 0, y: yOf(t) }}
                animate={{ opacity: 1, y: yOf(t) }}
                transition={reduced ? INSTANT : glide}
              >
                <line x1={GUTTER} x2={width} className={t === 0 ? 'chart-base' : 'chart-grid'} />
                <text x={GUTTER - 10} dy="0.35em" textAnchor="end" className="chart-tick">
                  {t}
                </text>
              </motion.g>
            ))}

            {active !== null && (
              <rect x={GUTTER + slot * active} y={PAD_TOP - 8} width={slot} height={base - PAD_TOP + 8} rx={6} className="chart-band" />
            )}

            <g clipPath={`url(#${id}-clip)`}>
              {weeks.map((w, i) => {
                const y = yOf(w.workouts)
                const hit = w.workouts >= goal
                const dim = active !== null && active !== i
                const x = centers[i] - barW / 2
                return (
                  <motion.rect
                    key={w.start}
                    rx={rx}
                    fill={`url(#${id}-fill)`}
                    initial={{ attrX: x, width: barW, attrY: base, height: RADIUS, opacity: hit ? 1 : 0.4 }}
                    animate={{
                      attrX: x,
                      width: barW,
                      attrY: inView ? y : base,
                      height: (inView ? base - y : 0) + RADIUS,
                      opacity: (hit ? 1 : 0.4) * (dim ? 0.45 : 1),
                    }}
                    transition={
                      reduced
                        ? INSTANT
                        : { ...spring, delay: (i / Math.max(1, n)) * 0.35, opacity: { duration: 0.15 } }
                    }
                  />
                )
              })}
            </g>

            <motion.g
              initial={{ y: goalY, opacity: 0 }}
              animate={{ y: goalY, opacity: inView ? 1 : 0 }}
              transition={reduced ? INSTANT : glide}
            >
              <line x1={GUTTER} x2={width} className="chart-goal" />
            </motion.g>

            {showTicks &&
              weeks.map((w, i) => {
                if (w.workouts < goal) return null
                const cx = centers[i]
                const cy = yOf(w.workouts) - 8
                const d = `M ${cx - 3.5} ${cy} L ${cx - 1} ${cy + 2.5} L ${cx + 3.5} ${cy - 2.5}`
                return (
                  <g key={w.start} opacity={active !== null && active !== i ? 0.4 : 1}>
                    <motion.path
                      className="chart-check"
                      initial={{ d, opacity: 0 }}
                      animate={{ d, opacity: inView ? 1 : 0 }}
                      transition={reduced ? INSTANT : { d: glide, opacity: { duration: 0.3, delay: 0.35 } }}
                    />
                  </g>
                )
              })}

            {weeks.map((w, i) => {
              if (!weekLabelled(i, n)) return null
              const pin = i === n - 1 && pinLastLabel(n)
              return (
                <text key={w.start} x={pin ? width : centers[i]} y={HEIGHT - 6} textAnchor={pin ? 'end' : 'middle'} className="chart-tick">
                  {shortDate(w.start)}
                </text>
              )
            })}
          </svg>
        )}
      </div>

      <ul className="chart-legend" aria-hidden>
        <li>
          <i className="chart-key chart-key--goal" />
          Doel {goal}× per week
        </li>
        <li>
          <i className="chart-key chart-key--hit" />
          Gehaald
        </li>
        <li>
          <i className="chart-key chart-key--miss" />
          Niet gehaald
        </li>
      </ul>
    </div>
  )
}
