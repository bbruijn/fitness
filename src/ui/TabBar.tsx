import { motion } from 'motion/react'
import { IconChart, IconHome, IconList } from './icons'
import { snappy } from './motion'

export type Tab = 'home' | 'schema' | 'stats'

const TABS: { id: Tab; label: string; Icon: typeof IconHome }[] = [
  { id: 'home', label: 'Vandaag', Icon: IconHome },
  { id: 'schema', label: 'Schema', Icon: IconList },
  { id: 'stats', label: 'Voortgang', Icon: IconChart },
]

export function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="tabbar" aria-label="Hoofdnavigatie">
      {TABS.map(({ id, label, Icon }) => (
        <button key={id} type="button" className="tabbar__item" aria-current={tab === id ? 'page' : undefined} onClick={() => onChange(id)}>
          {tab === id && <motion.i layoutId="tab-pill" className="tabbar__pill" transition={snappy} />}
          <motion.span animate={{ y: tab === id ? -1 : 0, scale: tab === id ? 1.08 : 1 }} transition={snappy} style={{ display: 'grid' }}>
            <Icon size={22} />
          </motion.span>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
