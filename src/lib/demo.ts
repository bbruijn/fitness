import { uid } from './id'
import { addWeeks, nextWeight, weekStart } from './stats'
import type { Exercise, ExerciseLog, Program, Session } from './types'

/** Small deterministic PRNG so the demo history looks the same every time. */
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Ten weeks of plausible history for the given program, ending yesterday. Returns the sessions and the
 * program with its advised weights moved to where that history ends.
 */
export function buildDemo(
  program: Program,
  exercises: Record<string, Exercise>,
  step: number,
  now = Date.now(),
): { sessions: Session[]; program: Program } {
  const rand = mulberry32(42)
  const weeks = 10
  const offsets = [0, 1, 3, 5] // Mon, Tue, Thu, Sat
  const next: Program = structuredClone(program)
  // Start lighter than today's advice so there is a visible trend.
  for (const day of next.days)
    for (const it of day.items) it.weight = Math.max(step, Math.round((it.weight * 0.7) / step) * step)

  const sessions: Session[] = []
  const firstWeek = addWeeks(weekStart(now), -(weeks - 1))
  let dayIndex = 0
  for (let w = 0; w < weeks; w++) {
    for (const off of offsets) {
      const date = new Date(addWeeks(firstWeek, w))
      date.setDate(date.getDate() + off)
      date.setHours(17 + Math.floor(rand() * 3), Math.floor(rand() * 60), 0, 0)
      if (date.getTime() > now - 12 * 3600000) continue
      if (rand() < 0.14) continue // a missed day now and then
      const day = next.days[dayIndex % next.days.length]
      dayIndex++
      if (!day.items.length) continue
      const startedAt = date.getTime()
      let clock = startedAt
      const logs: ExerciseLog[] = day.items.map((it) => {
        const e = exercises[it.exerciseId]
        const strong = rand() < 0.45
        const sets = Array.from({ length: it.sets }, (_, i) => {
          clock += (45 + it.rest + rand() * 40) * 1000
          const drop = strong ? 0 : i === 0 ? 0 : Math.floor(rand() * 3)
          return { weight: it.weight, reps: Math.max(1, it.reps - drop), done: true, at: clock }
        })
        const log: ExerciseLog = {
          id: uid(),
          planItemId: it.id,
          exerciseId: it.exerciseId,
          name: e?.name ?? 'Oefening',
          muscle: e?.muscle ?? 'overig',
          targetSets: it.sets,
          targetReps: it.reps,
          targetWeight: it.weight,
          rest: it.rest,
          sets,
          note: '',
        }
        const weight = nextWeight(log, step, true)
        for (const d of next.days) for (const x of d.items) if (x.exerciseId === it.exerciseId) x.weight = weight
        return log
      })
      sessions.push({
        id: uid(),
        dayId: day.id,
        dayName: day.name,
        focus: day.focus,
        startedAt,
        finishedAt: clock + 60000,
        exercises: logs,
      })
    }
  }
  return { sessions, program: next }
}
