import { motion } from 'motion/react'
import { snappy } from './motion'

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className="toggle" onClick={() => onChange(!checked)}>
      <motion.i animate={{ x: checked ? 20 : 0 }} transition={snappy} />
    </button>
  )
}

interface SegProps<T extends string | number> {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  id: string
}

/** Segmented control whose highlight slides between options. */
export function Segmented<T extends string | number>({ value, options, onChange, id }: SegProps<T>) {
  return (
    <div className="seg" role="group">
      {options.map((o) => (
        <button key={String(o.value)} type="button" className="seg__item" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.value === value && <motion.i layoutId={`seg-${id}`} className="seg__pill" transition={snappy} />}
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  )
}
