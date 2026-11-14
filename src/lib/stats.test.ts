import { describe, expect, it } from 'vitest'
import { buildDemo } from './demo'
import { SEED_EXERCISES, SEED_PROGRAM } from './seed'
import { e1rm, nextWeight, records, sessionPRs, sessionVolume, weekly, weekStart, weekStreak } from './stats'
import type { ExerciseLog, Session } from './types'

const log = (weight: number, reps: number[], over: Partial<ExerciseLog> = {}): ExerciseLog => ({
  id: 'l',
  planItemId: 'p',
  exerciseId: 'leg-press',
  name: 'Leg press',
  muscle: 'benen',
  targetSets: 3,
  targetReps: 10,
  targetWeight: weight,
  rest: 90,
  sets: reps.map((r) => ({ weight, reps: r, done: true })),
  note: '',
  ...over,
})

const session = (id: string, date: string, exercises: ExerciseLog[]): Session => {
  const t = new Date(date).getTime()
  return { id, dayId: 'd', dayName: 'Dag 1', focus: '', startedAt: t - 3600000, finishedAt: t, exercises }
}

describe('nextWeight', () => {
  it('adds a step when every planned set reached the target reps', () => {
    expect(nextWeight(log(80, [10, 10, 10]), 2.5, true)).toBe(82.5)
  })
  it('keeps the weight when a set fell short', () => {
    expect(nextWeight(log(80, [10, 9, 8]), 2.5, true)).toBe(80)
  })
  it('keeps the weight when sets were skipped', () => {
    expect(nextWeight(log(80, [10, 10]), 2.5, true)).toBe(80)
  })
  it('follows the weight that was actually used', () => {
    // advised 35, trained with 25 and hit everything → build from 25
    expect(nextWeight(log(25, [10, 10, 10], { targetWeight: 35 }), 2.5, true)).toBe(27.5)
  })
  it('does not progress when auto-progress is off', () => {
    expect(nextWeight(log(80, [10, 10, 10]), 2.5, false)).toBe(80)
  })
  it('leaves the advice alone when nothing was logged', () => {
    expect(nextWeight({ ...log(80, []), sets: [{ weight: 60, reps: 10, done: false }] }, 2.5, true)).toBe(80)
  })
  it('never invents weight for bodyweight work', () => {
    expect(nextWeight(log(0, [10, 10, 10]), 2.5, true)).toBe(0)
  })
})

describe('weeks', () => {
  it('starts the week on Monday', () => {
    const sunday = new Date('2026-11-15T20:00:00').getTime()
    expect(new Date(weekStart(sunday)).getDay()).toBe(1)
    expect(new Date(weekStart(sunday)).getDate()).toBe(9)
  })
  it('buckets sessions per calendar week, oldest first', () => {
    const now = new Date('2026-11-14T12:00:00').getTime()
    const s = [
      session('a', '2026-11-03T18:00:00', [log(80, [10, 10, 10])]),
      session('b', '2026-11-09T18:00:00', [log(80, [10, 10, 10])]),
      session('c', '2026-11-12T18:00:00', [log(80, [10, 10, 10])]),
    ]
    const w = weekly(s, 3, now)
    expect(w.map((x) => x.workouts)).toEqual([0, 1, 2])
    expect(w[2].volume).toBe(4800)
  })
  it('counts a streak that is still alive when this week is empty so far', () => {
    const now = new Date('2026-11-16T08:00:00').getTime() // Monday morning
    const s = [session('a', '2026-11-03T18:00:00', []), session('b', '2026-11-12T18:00:00', [])]
    expect(weekStreak(s, now)).toBe(2)
    expect(weekStreak([session('a', '2026-10-01T18:00:00', [])], now)).toBe(0)
  })
})

describe('records', () => {
  const first = session('a', '2026-11-03T18:00:00', [log(80, [10, 10, 10])])
  const second = session('b', '2026-11-10T18:00:00', [log(82.5, [10, 10, 9])])

  it('estimates a one-rep max with Epley', () => {
    expect(e1rm(100, 1)).toBe(100)
    expect(e1rm(90, 10)).toBeCloseTo(120)
  })
  it('does not call a first-ever workout a record', () => {
    expect(sessionPRs(first, [first])).toEqual([])
  })
  it('reports a heavier weight as a record', () => {
    const prs = sessionPRs(second, [first, second])
    expect(prs).toHaveLength(1)
    expect(prs[0]).toMatchObject({ kind: 'weight', value: 82.5, previous: 80 })
  })
  it('keeps the all-time best per exercise', () => {
    expect(records([first, second])[0]).toMatchObject({ weight: 82.5, sessions: 2 })
    expect(sessionVolume(first)).toBe(2400)
  })
})

describe('demo history', () => {
  it('is chronological, never in the future, and moves the advice forward', () => {
    const now = new Date('2026-11-14T14:00:00').getTime()
    const exercises = Object.fromEntries(SEED_EXERCISES.map((e) => [e.id, e]))
    const { sessions, program } = buildDemo(SEED_PROGRAM, exercises, 2.5, now)
    expect(sessions.length).toBeGreaterThan(20)
    expect(sessions.every((s, i) => i === 0 || s.finishedAt > sessions[i - 1].finishedAt)).toBe(true)
    expect(Math.max(...sessions.map((s) => s.finishedAt))).toBeLessThan(now)
    // the same exercise on two days shares one advice
    const legPress = program.days.flatMap((d) => d.items).filter((it) => it.exerciseId === 'leg-press')
    expect(new Set(legPress.map((it) => it.weight)).size).toBe(1)
  })
})
