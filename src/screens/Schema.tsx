import { AnimatePresence, motion, Reorder, useDragControls } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { num } from '../lib/format'
import { nextDayId, useStore } from '../lib/store'
import { MUSCLE_LABEL, MUSCLES, type Day, type Muscle, type PlanItem } from '../lib/types'
import { IconChevronDown, IconChevronRight, IconCopy, IconGrip, IconPlay, IconPlus, IconSearch, IconTrash } from '../ui/icons'
import { rise, snappy, spring, stagger } from '../ui/motion'
import { Press } from '../ui/Press'
import { Sheet } from '../ui/Sheet'
import { Stepper } from '../ui/Stepper'
import './Schema.css'

type Editing = { dayId: string; itemId: string } | null

export function Schema({ onStart }: { onStart: (dayId: string) => void }) {
  const program = useStore((s) => s.program)
  const sessions = useStore((s) => s.sessions)
  const active = useStore((s) => s.active)
  const { renameProgram, addDay } = useStore.getState()

  const [open, setOpen] = useState<string | null>(() => nextDayId(program, sessions))
  const [editing, setEditing] = useState<Editing>(null)
  const [picking, setPicking] = useState<string | null>(null)
  const [dayEdit, setDayEdit] = useState<string | null>(null)
  /** A just-created copy: slides in and gets scrolled into view. */
  const [fresh, setFresh] = useState<string | null>(null)
  useEffect(() => {
    if (!fresh) return
    const t = window.setTimeout(
      () => document.querySelector('.day[data-fresh]')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      350,
    )
    return () => clearTimeout(t)
  }, [fresh])

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <motion.header variants={rise}>
        <div className="eyebrow">Schema</div>
        <input
          className="schema-name"
          aria-label="Naam van het schema"
          value={program.name}
          onChange={(e) => renameProgram(e.target.value)}
          enterKeyHint="done"
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
        <p className="muted" style={{ marginTop: 6 }}>
          Het advies per oefening past zich na elke training aan.
        </p>
      </motion.header>

      {program.days.map((day, i) => (
        <motion.section
          key={day.id}
          className="glass day"
          data-fresh={day.id === fresh || undefined}
          variants={rise}
          initial={day.id === fresh ? { opacity: 0, y: -16, scale: 0.97 } : undefined}
          animate={day.id === fresh ? { opacity: 1, y: 0, scale: 1 } : undefined}
          layout="position"
          transition={spring}
        >
          <button type="button" className="day__head" aria-expanded={open === day.id} onClick={() => setOpen(open === day.id ? null : day.id)}>
            <span className="day__badge">{i + 1}</span>
            <div className="list__main">
              <div className="list__title">
                {day.name}
                {day.focus ? ` · ${day.focus}` : ''}
              </div>
              <div className="list__sub">
                {day.items.length} {day.items.length === 1 ? 'oefening' : 'oefeningen'} · {day.items.reduce((n, it) => n + it.sets, 0)} sets
              </div>
            </div>
            <motion.span animate={{ rotate: open === day.id ? 180 : 0 }} transition={snappy} className="dim" style={{ display: 'grid' }}>
              <IconChevronDown />
            </motion.span>
          </button>

          <AnimatePresence initial={false}>
            {open === day.id && (
              <motion.div
                className="day__body"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={spring}
              >
                <DayItems day={day} onEdit={(itemId) => setEditing({ dayId: day.id, itemId })} />
                <div className="day__foot">
                  <Press className="btn btn--sm" onClick={() => setPicking(day.id)}>
                    <IconPlus size={17} /> Oefening
                  </Press>
                  <Press className="btn btn--sm" onClick={() => setDayEdit(day.id)}>
                    Bewerken
                  </Press>
                  <span className="spacer" />
                  <Press className="btn btn--sm btn--hot" disabled={!day.items.length || (!!active && active.dayId !== day.id)} onClick={() => onStart(day.id)}>
                    <IconPlay size={15} /> {active?.dayId === day.id ? 'Verder' : 'Start'}
                  </Press>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>
      ))}

      <motion.div variants={rise} style={{ marginTop: 16 }}>
        <Press className="btn btn--block" onClick={addDay}>
          <IconPlus size={18} /> Dag toevoegen
        </Press>
      </motion.div>

      <ItemSheet editing={editing} onClose={() => setEditing(null)} />
      <PickerSheet dayId={picking} onClose={() => setPicking(null)} />
      <DaySheet
        dayId={dayEdit}
        onClose={() => setDayEdit(null)}
        onCopied={(id) => {
          setDayEdit(null)
          setOpen(id)
          setFresh(id)
        }}
      />
    </motion.div>
  )
}

function DayItems({ day, onEdit }: { day: Day; onEdit: (itemId: string) => void }) {
  const reorderItems = useStore((s) => s.reorderItems)
  if (!day.items.length)
    return (
      <p className="muted" style={{ padding: '4px 16px 8px' }}>
        Nog geen oefeningen op deze dag.
      </p>
    )
  return (
    <Reorder.Group as="ul" axis="y" className="day__items" values={day.items.map((it) => it.id)} onReorder={(ids) => reorderItems(day.id, ids as string[])}>
      {day.items.map((it) => (
        <ItemRow key={it.id} item={it} onEdit={() => onEdit(it.id)} />
      ))}
    </Reorder.Group>
  )
}

function ItemRow({ item, onEdit }: { item: PlanItem; onEdit: () => void }) {
  const name = useStore((s) => s.exercises[item.exerciseId]?.name ?? 'Oefening')
  const controls = useDragControls()
  return (
    <Reorder.Item
      as="li"
      value={item.id}
      className="item"
      dragListener={false}
      dragControls={controls}
      whileDrag={{ scale: 1.03, backgroundColor: 'rgba(60, 48, 130, 0.95)', boxShadow: '0 18px 40px rgba(0,0,0,.5)', zIndex: 2 }}
      transition={spring}
    >
      <span className="item__grip" aria-label={`${name} verplaatsen`} onPointerDown={(e) => controls.start(e)}>
        <IconGrip size={20} />
      </span>
      <button type="button" className="item__main" onClick={onEdit}>
        <div className="list__main">
          <div className="list__title">{name}</div>
          <div className="list__sub">
            {item.sets} × {item.reps} · {num(item.weight)} kg · rust {item.rest} s
          </div>
        </div>
        <IconChevronRight className="dim" size={20} />
      </button>
    </Reorder.Item>
  )
}

function ItemSheet({ editing, onClose }: { editing: Editing; onClose: () => void }) {
  const program = useStore((s) => s.program)
  const exercises = useStore((s) => s.exercises)
  const step = useStore((s) => s.settings.weightStep)
  const { updateItem, removeItem } = useStore.getState()
  const item = editing ? program.days.find((d) => d.id === editing.dayId)?.items.find((it) => it.id === editing.itemId) : undefined
  const patch = (p: Partial<PlanItem>) => editing && updateItem(editing.dayId, editing.itemId, p)

  return (
    <Sheet open={!!item} onClose={onClose} title={item ? (exercises[item.exerciseId]?.name ?? 'Oefening') : ''}>
      {item && editing && (
        <>
          <div className="form-row">
            <span className="label">Advies gewicht</span>
            <Stepper size="sm" label="Gewicht" unit="kg" value={item.weight} step={step} max={500} onChange={(weight) => patch({ weight })} />
          </div>
          <div className="form-row">
            <span className="label">Sets</span>
            <Stepper size="sm" label="Sets" unit="sets" value={item.sets} step={1} min={1} max={8} onChange={(sets) => patch({ sets })} />
          </div>
          <div className="form-row">
            <span className="label">Herhalingen</span>
            <Stepper size="sm" label="Herhalingen" unit="reps" value={item.reps} step={1} min={1} max={50} onChange={(reps) => patch({ reps })} />
          </div>
          <div className="form-row">
            <span className="label">Rust tussen sets</span>
            <Stepper size="sm" label="Rust" unit="sec" value={item.rest} step={15} min={0} max={600} onChange={(rest) => patch({ rest })} />
          </div>
          <Press
            className="btn btn--ghost btn--danger btn--block"
            onClick={() => {
              removeItem(editing.dayId, editing.itemId)
              onClose()
            }}
          >
            <IconTrash size={18} /> Uit deze dag halen
          </Press>
        </>
      )}
    </Sheet>
  )
}

function PickerSheet({ dayId, onClose }: { dayId: string | null; onClose: () => void }) {
  const exercises = useStore((s) => s.exercises)
  const { addItem, addExercise } = useStore.getState()
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<Muscle>('benen')

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const all = Object.values(exercises)
      .filter((e) => !q || e.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, 'nl'))
    return MUSCLES.map((m) => ({ muscle: m, list: all.filter((e) => e.muscle === m) })).filter((g) => g.list.length)
  }, [exercises, query])

  const exact = Object.values(exercises).some((e) => e.name.toLowerCase() === query.trim().toLowerCase())
  const pick = (exerciseId: string) => {
    if (dayId) addItem(dayId, exerciseId)
    setQuery('')
    onClose()
  }

  return (
    <Sheet open={!!dayId} onClose={onClose} title="Oefening toevoegen">
      <div style={{ position: 'relative' }}>
        <IconSearch size={18} className="dim" style={{ position: 'absolute', left: 16, top: 16 }} />
        <input
          className="field"
          style={{ paddingLeft: 44 }}
          placeholder="Zoek of typ een nieuwe naam"
          aria-label="Zoek oefening"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {query.trim().length > 1 && !exact && (
        <div className="glass" style={{ padding: 16, marginTop: 14 }}>
          <div className="list__title">“{query.trim()}” als nieuwe oefening</div>
          <div className="chips" style={{ margin: '12px 0' }} role="group" aria-label="Spiergroep">
            {MUSCLES.map((m) => (
              <button key={m} type="button" className="chip" aria-pressed={m === muscle} onClick={() => setMuscle(m)}>
                {MUSCLE_LABEL[m]}
              </button>
            ))}
          </div>
          <Press className="btn btn--hot btn--block" onClick={() => pick(addExercise(query, muscle))}>
            <IconPlus size={18} /> Aanmaken en toevoegen
          </Press>
        </div>
      )}

      {groups.map((g) => (
        <div key={g.muscle}>
          <div className="eyebrow picker__group">{MUSCLE_LABEL[g.muscle]}</div>
          <div className="glass list">
            {g.list.map((e) => (
              <button key={e.id} type="button" className="list__row" onClick={() => pick(e.id)}>
                <div className="list__main">
                  <div className="list__title">{e.name}</div>
                </div>
                <IconPlus size={18} className="dim" />
              </button>
            ))}
          </div>
        </div>
      ))}
    </Sheet>
  )
}

function DaySheet({ dayId, onClose, onCopied }: { dayId: string | null; onClose: () => void; onCopied: (newDayId: string) => void }) {
  const day = useStore((s) => s.program.days.find((d) => d.id === dayId))
  const count = useStore((s) => s.program.days.length)
  const { updateDay, removeDay, duplicateDay } = useStore.getState()
  const [confirm, setConfirm] = useState(false)
  const close = () => {
    setConfirm(false)
    onClose()
  }
  return (
    <Sheet open={!!day} onClose={close} title="Dag bewerken">
      {day && (
        <>
          <div className="form-row">
            <label className="label" htmlFor="day-name">
              Naam
            </label>
            <input id="day-name" className="field" value={day.name} onChange={(e) => updateDay(day.id, { name: e.target.value })} />
          </div>
          <div className="form-row">
            <label className="label" htmlFor="day-focus">
              Focus
            </label>
            <input id="day-focus" className="field" placeholder="Bijv. Benen & core" value={day.focus} onChange={(e) => updateDay(day.id, { focus: e.target.value })} />
          </div>
          <Press className="btn btn--hot btn--block" onClick={close}>
            Klaar
          </Press>
          <Press
            className="btn btn--block"
            style={{ marginTop: 10 }}
            onClick={() => {
              const id = duplicateDay(day.id)
              setConfirm(false)
              if (id) onCopied(id)
            }}
          >
            <IconCopy size={18} /> Dag kopiëren
          </Press>
          {count > 1 && (
            <Press
              className="btn btn--ghost btn--danger btn--block"
              style={{ marginTop: 10 }}
              onClick={() => {
                if (!confirm) return setConfirm(true)
                removeDay(day.id)
                close()
              }}
            >
              <IconTrash size={18} /> {confirm ? 'Zeker weten? Tik nogmaals' : 'Dag verwijderen'}
            </Press>
          )}
        </>
      )}
    </Sheet>
  )
}
