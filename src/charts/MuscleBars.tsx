import { motion, useInView } from 'motion/react'
import { useRef } from 'react'
import { int } from '../lib/format'
import { MUSCLE_LABEL } from '../lib/types'
import type { Muscle } from '../lib/types'
import { spring } from '../ui/motion'
import './charts.css'

/**
 * Ranked horizontal bars, one hue: the sets per muscle group. Built from plain elements — the label and
 * the number are real text, so the list is its own table view for assistive tech.
 */
export function MuscleBars({ data }: { data: { muscle: Muscle; sets: number }[] }) {
  const ref = useRef<HTMLUListElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.3 })
  const max = data.reduce((m, d) => Math.max(m, d.sets), 0)
  const total = data.reduce((sum, d) => sum + d.sets, 0)

  return (
    <ul ref={ref} className="chart-rows" aria-label="Sets per spiergroep, meeste eerst">
      {data.map((d, i) => {
        const share = max ? d.sets / max : 0
        return (
          <motion.li key={d.muscle} layout="position" transition={spring} className="chart-row">
            <span className="chart-row__name">{MUSCLE_LABEL[d.muscle]}</span>
            <span className="chart-row__track" aria-hidden>
              <motion.i
                initial={{ x: '-100%' }}
                animate={{ x: inView ? `${(share - 1) * 100}%` : '-100%' }}
                transition={{ ...spring, delay: i * 0.05 }}
              />
            </span>
            <span className="chart-row__value">
              {int(d.sets)}
              <small>{total ? ` · ${Math.round((d.sets / total) * 100)}%` : ''}</small>
            </span>
          </motion.li>
        )
      })}
    </ul>
  )
}
