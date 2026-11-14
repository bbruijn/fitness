import type { Exercise, Muscle, PlanItem, Program, Settings } from './types'

const ex = (id: string, name: string, muscle: Muscle): Exercise => ({ id, name, muscle })

export const SEED_EXERCISES: Exercise[] = [
  ex('leg-press', 'Leg press plate loaded', 'benen'),
  ex('leg-extension', 'Leg extension', 'benen'),
  ex('seated-leg-curl', 'Seated leg curl', 'benen'),
  ex('hip-abduction', 'Hip abduction', 'benen'),
  ex('hip-adduction', 'Hip adduction', 'benen'),
  ex('calf-raise', 'Calf raise', 'benen'),
  ex('squat', 'Squat', 'benen'),
  ex('chest-press', 'Chest press', 'borst'),
  ex('incline-press', 'Incline chest press', 'borst'),
  ex('pec-fly', 'Pec fly', 'borst'),
  ex('bench-press', 'Bench press', 'borst'),
  ex('lat-pulldown', 'Lat pulldown', 'rug'),
  ex('seated-row', 'Seated row', 'rug'),
  ex('back-extension', 'Back extension', 'rug'),
  ex('assisted-pull-up', 'Assisted pull-up', 'rug'),
  ex('shoulder-press', 'Shoulder press', 'schouders'),
  ex('lateral-raise', 'Lateral raise', 'schouders'),
  ex('rear-delt-fly', 'Rear delt fly', 'schouders'),
  ex('biceps-curl', 'Biceps curl', 'armen'),
  ex('triceps-pushdown', 'Triceps pushdown', 'armen'),
  ex('triceps-extension', 'Triceps extension', 'armen'),
  ex('ab-crunch', 'Machine ab crunch', 'core'),
  ex('torso-rotation', 'Torso rotation', 'core'),
  ex('plank', 'Plank', 'core'),
]

let n = 0
const item = (exerciseId: string, weight: number, sets = 3, reps = 10, rest = 90): PlanItem => ({
  id: `seed-${++n}`,
  exerciseId,
  sets,
  reps,
  weight,
  rest,
})

/**
 * Day 1 mirrors the gym's "Schema 4 keer in de week" as far as it was visible; the other days are a
 * sensible starting template meant to be edited in the Schema tab.
 */
export const SEED_PROGRAM: Program = {
  name: 'Schema 4× per week',
  days: [
    {
      id: 'day-1',
      name: 'Dag 1',
      focus: 'Benen & core',
      items: [
        item('leg-press', 80),
        item('leg-extension', 40),
        item('seated-leg-curl', 50),
        item('ab-crunch', 35, 3, 10, 60),
        item('torso-rotation', 35, 3, 10, 60),
      ],
    },
    {
      id: 'day-2',
      name: 'Dag 2',
      focus: 'Borst & triceps',
      items: [
        item('chest-press', 40),
        item('incline-press', 30),
        item('pec-fly', 35),
        item('shoulder-press', 25),
        item('triceps-pushdown', 20, 3, 12, 60),
      ],
    },
    {
      id: 'day-3',
      name: 'Dag 3',
      focus: 'Rug & biceps',
      items: [
        item('lat-pulldown', 45),
        item('seated-row', 40),
        item('rear-delt-fly', 25, 3, 12),
        item('biceps-curl', 20, 3, 12, 60),
        item('back-extension', 30, 3, 12, 60),
      ],
    },
    {
      id: 'day-4',
      name: 'Dag 4',
      focus: 'Full body',
      items: [
        item('leg-press', 80),
        item('chest-press', 40),
        item('lat-pulldown', 45),
        item('lateral-raise', 15, 3, 12, 60),
        item('ab-crunch', 35, 3, 10, 60),
      ],
    },
  ],
}

export const DEFAULT_SETTINGS: Settings = {
  weightStep: 2.5,
  weeklyGoal: 4,
  sound: true,
  haptics: true,
  autoProgress: true,
}
