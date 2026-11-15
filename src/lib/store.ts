import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { buildDemo } from './demo'
import { uid } from './id'
import { DEFAULT_SETTINGS, SEED_EXERCISES, SEED_PROGRAM } from './seed'
import { doneSets, nextWeight } from './stats'
import type {
  ActiveSession,
  Day,
  Exercise,
  ExerciseLog,
  Muscle,
  PlanItem,
  Program,
  Session,
  SetLog,
  Settings,
} from './types'

interface Data {
  exercises: Record<string, Exercise>
  program: Program
  /** Finished workouts, oldest first. */
  sessions: Session[]
  active: ActiveSession | null
  settings: Settings
}

interface Actions {
  startWorkout: (dayId: string) => void
  goTo: (index: number) => void
  updateSet: (ei: number, si: number, patch: Partial<Pick<SetLog, 'weight' | 'reps'>>) => void
  completeSet: (ei: number, si: number) => void
  undoSet: (ei: number, si: number) => void
  addSet: (ei: number) => void
  removeSet: (ei: number, si: number) => void
  setNote: (ei: number, note: string) => void
  adjustRest: (seconds: number) => void
  endRest: () => void
  finishWorkout: () => Session | null
  discardWorkout: () => void

  renameProgram: (name: string) => void
  addDay: () => void
  updateDay: (dayId: string, patch: Partial<Pick<Day, 'name' | 'focus'>>) => void
  removeDay: (dayId: string) => void
  /** Copies a day with all its exercises right after the original; returns the new day's id. */
  duplicateDay: (dayId: string) => string | null
  addItem: (dayId: string, exerciseId: string) => void
  updateItem: (dayId: string, itemId: string, patch: Partial<Omit<PlanItem, 'id'>>) => void
  removeItem: (dayId: string, itemId: string) => void
  reorderItems: (dayId: string, itemIds: string[]) => void
  reorderDays: (dayIds: string[]) => void
  addExercise: (name: string, muscle: Muscle) => string

  deleteSession: (id: string) => void
  updateSettings: (patch: Partial<Settings>) => void
  loadDemo: () => void
  importData: (json: string) => void
  exportData: () => string
  resetAll: () => void
}

export type Store = Data & Actions

const fresh = (): Data => ({
  exercises: Object.fromEntries(SEED_EXERCISES.map((e) => [e.id, e])),
  program: structuredClone(SEED_PROGRAM),
  sessions: [],
  active: null,
  settings: { ...DEFAULT_SETTINGS },
})

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n))

export const useStore = create<Store>()(
  persist(
    (set, get) => {
      /** Apply a change to a copy of the running workout. */
      const active = (fn: (a: ActiveSession) => void) =>
        set((s) => {
          if (!s.active) return s
          const a = structuredClone(s.active)
          fn(a)
          return { active: a }
        })

      const program = (fn: (p: Program) => void) =>
        set((s) => {
          const p = structuredClone(s.program)
          fn(p)
          return { program: p }
        })

      return {
        ...fresh(),

        startWorkout: (dayId) => {
          const { program: p, exercises, active: running } = get()
          if (running) return
          const day = p.days.find((d) => d.id === dayId)
          if (!day || !day.items.length) return
          const logs: ExerciseLog[] = day.items.map((it) => {
            const e = exercises[it.exerciseId]
            return {
              id: uid(),
              planItemId: it.id,
              exerciseId: it.exerciseId,
              name: e?.name ?? 'Oefening',
              muscle: e?.muscle ?? 'overig',
              targetSets: it.sets,
              targetReps: it.reps,
              targetWeight: it.weight,
              rest: it.rest,
              sets: Array.from({ length: it.sets }, () => ({ weight: it.weight, reps: it.reps, done: false })),
              note: '',
            }
          })
          set({
            active: {
              id: uid(),
              dayId: day.id,
              dayName: day.name,
              focus: day.focus,
              startedAt: Date.now(),
              exercises: logs,
              index: 0,
              restEndsAt: null,
              restTotal: 0,
            },
          })
        },

        goTo: (index) => active((a) => void (a.index = clamp(index, 0, a.exercises.length - 1))),

        updateSet: (ei, si, patch) =>
          active((a) => {
            const sets = a.exercises[ei]?.sets
            if (!sets?.[si]) return
            Object.assign(sets[si], patch)
            // A weight change carries forward to the sets still to come.
            if (patch.weight !== undefined)
              for (let i = si + 1; i < sets.length; i++) if (!sets[i].done) sets[i].weight = patch.weight
          }),

        completeSet: (ei, si) =>
          active((a) => {
            const e = a.exercises[ei]
            const s = e?.sets[si]
            if (!s || s.done) return
            s.done = true
            s.at = Date.now()
            const remaining = a.exercises.some((x) => x.sets.some((y) => !y.done))
            a.restTotal = remaining ? e.rest : 0
            a.restEndsAt = remaining && e.rest > 0 ? Date.now() + e.rest * 1000 : null
          }),

        undoSet: (ei, si) =>
          active((a) => {
            const s = a.exercises[ei]?.sets[si]
            if (!s) return
            s.done = false
            delete s.at
            a.restEndsAt = null
          }),

        addSet: (ei) =>
          active((a) => {
            const e = a.exercises[ei]
            if (!e || e.sets.length >= 10) return
            const last = e.sets[e.sets.length - 1]
            e.sets.push({ weight: last?.weight ?? e.targetWeight, reps: last?.reps ?? e.targetReps, done: false })
          }),

        removeSet: (ei, si) =>
          active((a) => {
            const e = a.exercises[ei]
            if (!e || e.sets.length <= 1) return
            e.sets.splice(si, 1)
          }),

        setNote: (ei, note) => active((a) => void (a.exercises[ei] && (a.exercises[ei].note = note))),

        adjustRest: (seconds) =>
          active((a) => {
            if (!a.restEndsAt) return
            a.restEndsAt = Math.max(Date.now(), a.restEndsAt + seconds * 1000)
            a.restTotal = Math.max(1, a.restTotal + seconds)
          }),

        endRest: () => active((a) => void (a.restEndsAt = null)),

        finishWorkout: () => {
          const { active: a, settings, program: p, sessions } = get()
          if (!a) return null
          const exercises = a.exercises
            .map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) }))
            .filter((e) => e.sets.length)
          if (!exercises.length) {
            set({ active: null })
            return null
          }
          const session: Session = {
            id: a.id,
            dayId: a.dayId,
            dayName: a.dayName,
            focus: a.focus,
            startedAt: a.startedAt,
            finishedAt: Date.now(),
            exercises,
          }
          // Move the plan's advice to where this workout leaves off.
          const nextProgram = structuredClone(p)
          // An exercise that is planned on several days keeps one shared advice.
          for (const e of exercises) {
            const weight = nextWeight(e, settings.weightStep, settings.autoProgress)
            for (const d of nextProgram.days)
              for (const it of d.items) if (it.exerciseId === e.exerciseId) it.weight = weight
          }
          set({ active: null, sessions: [...sessions, session], program: nextProgram })
          return session
        },

        discardWorkout: () => set({ active: null }),

        renameProgram: (name) => program((p) => void (p.name = name)),

        addDay: () =>
          program((p) => {
            p.days.push({ id: uid(), name: `Dag ${p.days.length + 1}`, focus: '', items: [] })
          }),

        updateDay: (dayId, patch) =>
          program((p) => {
            const d = p.days.find((x) => x.id === dayId)
            if (d) Object.assign(d, patch)
          }),

        removeDay: (dayId) => program((p) => void (p.days = p.days.filter((d) => d.id !== dayId))),

        duplicateDay: (dayId) => {
          const i = get().program.days.findIndex((d) => d.id === dayId)
          if (i === -1) return null
          const id = uid()
          program((p) => {
            const source = p.days[i]
            p.days.splice(i + 1, 0, {
              id,
              name: `${source.name} (kopie)`,
              focus: source.focus,
              items: source.items.map((it) => ({ ...it, id: uid() })),
            })
          })
          return id
        },

        addItem: (dayId, exerciseId) =>
          program((p) => {
            const d = p.days.find((x) => x.id === dayId)
            if (!d) return
            // Reuse the advice from wherever this exercise is already planned.
            const known = p.days.flatMap((x) => x.items).find((x) => x.exerciseId === exerciseId)
            d.items.push({
              id: uid(),
              exerciseId,
              sets: known?.sets ?? 3,
              reps: known?.reps ?? 10,
              weight: known?.weight ?? 20,
              rest: known?.rest ?? 90,
            })
          }),

        updateItem: (dayId, itemId, patch) =>
          program((p) => {
            const it = p.days.find((x) => x.id === dayId)?.items.find((x) => x.id === itemId)
            if (it) Object.assign(it, patch)
          }),

        removeItem: (dayId, itemId) =>
          program((p) => {
            const d = p.days.find((x) => x.id === dayId)
            if (d) d.items = d.items.filter((x) => x.id !== itemId)
          }),

        reorderDays: (dayIds) =>
          program((p) => {
            const byId = new Map(p.days.map((d) => [d.id, d]))
            const ordered = dayIds.map((id) => byId.get(id)).filter((d): d is Day => !!d)
            if (ordered.length === p.days.length) p.days = ordered
          }),

        reorderItems: (dayId, itemIds) =>
          program((p) => {
            const d = p.days.find((x) => x.id === dayId)
            if (!d) return
            const byId = new Map(d.items.map((x) => [x.id, x]))
            const ordered = itemIds.map((id) => byId.get(id)).filter((x): x is PlanItem => !!x)
            if (ordered.length === d.items.length) d.items = ordered
          }),

        addExercise: (name, muscle) => {
          const id = uid()
          set((s) => ({ exercises: { ...s.exercises, [id]: { id, name: name.trim(), muscle } } }))
          return id
        },

        deleteSession: (id) => set((s) => ({ sessions: s.sessions.filter((x) => x.id !== id) })),

        updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

        loadDemo: () => {
          const { program: p, exercises, settings } = get()
          const demo = buildDemo(p, exercises, settings.weightStep)
          set({ sessions: demo.sessions, program: demo.program, active: null })
        },

        exportData: () => {
          const { exercises, program: p, sessions, settings } = get()
          return JSON.stringify({ app: 'volt', version: 1, exportedAt: Date.now(), exercises, program: p, sessions, settings }, null, 2)
        },

        importData: (json) => {
          const data = JSON.parse(json) as Partial<Data> & { app?: string }
          if (data.app !== 'volt' || !data.program?.days || !Array.isArray(data.sessions) || !data.exercises)
            throw new Error('Dit is geen Volt-back-up.')
          set({
            exercises: data.exercises,
            program: data.program,
            sessions: [...data.sessions].sort((a, b) => a.finishedAt - b.finishedAt),
            settings: { ...DEFAULT_SETTINGS, ...data.settings },
            active: null,
          })
        },

        resetAll: () => set(fresh()),
      }
    },
    {
      name: 'volt-v1',
      version: 1,
      partialize: ({ exercises, program, sessions, active, settings }) => ({ exercises, program, sessions, active, settings }),
    },
  ),
)

/** The day that follows the most recently trained one. */
export function nextDayId(program: Program, sessions: Session[]): string | null {
  if (!program.days.length) return null
  const last = sessions[sessions.length - 1]
  const i = last ? program.days.findIndex((d) => d.id === last.dayId) : -1
  return program.days[(i + 1) % program.days.length].id
}

export const activeProgress = (a: ActiveSession): { done: number; total: number } => ({
  done: a.exercises.reduce((n, e) => n + doneSets(e).length, 0),
  total: a.exercises.reduce((n, e) => n + e.sets.length, 0),
})
