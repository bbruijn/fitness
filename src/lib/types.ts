export type Muscle = 'benen' | 'borst' | 'rug' | 'schouders' | 'armen' | 'core' | 'overig'

export const MUSCLES: Muscle[] = ['benen', 'borst', 'rug', 'schouders', 'armen', 'core', 'overig']

export const MUSCLE_LABEL: Record<Muscle, string> = {
  benen: 'Benen',
  borst: 'Borst',
  rug: 'Rug',
  schouders: 'Schouders',
  armen: 'Armen',
  core: 'Core',
  overig: 'Overig',
}

export interface Exercise {
  id: string
  name: string
  muscle: Muscle
}

/** One exercise inside a training day: the advice the workout starts from. */
export interface PlanItem {
  id: string
  exerciseId: string
  sets: number
  reps: number
  /** Advised weight in kg. Moves up automatically when a workout hits every rep. */
  weight: number
  /** Rest between sets, seconds. */
  rest: number
}

export interface Day {
  id: string
  name: string
  focus: string
  items: PlanItem[]
}

export interface Program {
  name: string
  days: Day[]
}

export interface SetLog {
  weight: number
  reps: number
  done: boolean
  at?: number
}

export interface ExerciseLog {
  id: string
  planItemId: string
  exerciseId: string
  name: string
  muscle: Muscle
  targetSets: number
  targetReps: number
  targetWeight: number
  rest: number
  sets: SetLog[]
  note: string
}

export interface Session {
  id: string
  dayId: string
  dayName: string
  focus: string
  startedAt: number
  finishedAt: number
  exercises: ExerciseLog[]
}

export interface ActiveSession extends Omit<Session, 'finishedAt'> {
  /** Exercise currently on screen. */
  index: number
  restEndsAt: number | null
  restTotal: number
}

export interface Settings {
  weightStep: number
  weeklyGoal: number
  sound: boolean
  haptics: boolean
  autoProgress: boolean
}
