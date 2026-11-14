import type { ExerciseLog, Muscle, Session, SetLog } from './types'

const DAY = 86400000
export const WEEK = 7 * DAY

export const doneSets = (e: ExerciseLog): SetLog[] => e.sets.filter((s) => s.done)

export const exerciseVolume = (e: ExerciseLog): number =>
  doneSets(e).reduce((sum, s) => sum + s.weight * s.reps, 0)

export const sessionVolume = (s: Session): number =>
  s.exercises.reduce((sum, e) => sum + exerciseVolume(e), 0)

export const sessionSets = (s: Session): number =>
  s.exercises.reduce((sum, e) => sum + doneSets(e).length, 0)

export const sessionDuration = (s: Session): number => s.finishedAt - s.startedAt

/** Epley estimate of a one-rep max. */
export const e1rm = (weight: number, reps: number): number =>
  reps <= 1 ? weight : weight * (1 + reps / 30)

export const topWeight = (e: ExerciseLog): number =>
  doneSets(e).reduce((m, s) => Math.max(m, s.weight), 0)

export const bestE1rm = (e: ExerciseLog): number =>
  doneSets(e).reduce((m, s) => Math.max(m, e1rm(s.weight, s.reps)), 0)

/** Monday 00:00 local time of the week containing `t`. */
export function weekStart(t: number): number {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d.getTime()
}

/** Adds whole weeks via the calendar so DST shifts don't drift the bucket boundaries. */
export function addWeeks(start: number, n: number): number {
  const d = new Date(start)
  d.setDate(d.getDate() + n * 7)
  return d.getTime()
}

export interface WeekBucket {
  start: number
  workouts: number
  volume: number
  sets: number
}

/** The last `weeks` calendar weeks (oldest first), including the current one. */
export function weekly(sessions: Session[], weeks: number, now = Date.now()): WeekBucket[] {
  const current = weekStart(now)
  const buckets: WeekBucket[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    buckets.push({ start: addWeeks(current, -i), workouts: 0, volume: 0, sets: 0 })
  }
  const index = new Map(buckets.map((b, i) => [b.start, i]))
  for (const s of sessions) {
    const i = index.get(weekStart(s.finishedAt))
    if (i === undefined) continue
    buckets[i].workouts++
    buckets[i].volume += sessionVolume(s)
    buckets[i].sets += sessionSets(s)
  }
  return buckets
}

/** Consecutive weeks with at least one workout, counting back from this week (or last week if this one is still empty). */
export function weekStreak(sessions: Session[], now = Date.now()): number {
  const weeks = new Set(sessions.map((s) => weekStart(s.finishedAt)))
  let cursor = weekStart(now)
  if (!weeks.has(cursor)) cursor = addWeeks(cursor, -1)
  let streak = 0
  while (weeks.has(cursor)) {
    streak++
    cursor = addWeeks(cursor, -1)
  }
  return streak
}

export interface ExercisePoint {
  t: number
  top: number
  e1rm: number
  volume: number
  reps: number[]
}

export function exerciseHistory(sessions: Session[], exerciseId: string): ExercisePoint[] {
  const points: ExercisePoint[] = []
  for (const s of sessions) {
    for (const e of s.exercises) {
      if (e.exerciseId !== exerciseId) continue
      const done = doneSets(e)
      if (!done.length) continue
      points.push({
        t: s.finishedAt,
        top: topWeight(e),
        e1rm: bestE1rm(e),
        volume: exerciseVolume(e),
        reps: done.map((x) => x.reps),
      })
    }
  }
  return points
}

/** The most recent logged performance of an exercise, if any. */
export function lastPerformance(sessions: Session[], exerciseId: string): ExerciseLog | null {
  for (let i = sessions.length - 1; i >= 0; i--) {
    const hit = sessions[i].exercises.find((e) => e.exerciseId === exerciseId && doneSets(e).length)
    if (hit) return hit
  }
  return null
}

export interface ExerciseRecord {
  exerciseId: string
  name: string
  muscle: Muscle
  weight: number
  weightAt: number
  e1rm: number
  e1rmAt: number
  sessions: number
}

/** All-time bests per exercise, heaviest estimated 1RM first. */
export function records(sessions: Session[]): ExerciseRecord[] {
  const map = new Map<string, ExerciseRecord>()
  for (const s of sessions) {
    for (const e of s.exercises) {
      if (!doneSets(e).length) continue
      const r = map.get(e.exerciseId) ?? {
        exerciseId: e.exerciseId,
        name: e.name,
        muscle: e.muscle,
        weight: 0,
        weightAt: 0,
        e1rm: 0,
        e1rmAt: 0,
        sessions: 0,
      }
      r.name = e.name
      r.sessions++
      const w = topWeight(e)
      if (w > r.weight) {
        r.weight = w
        r.weightAt = s.finishedAt
      }
      const one = bestE1rm(e)
      if (one > r.e1rm) {
        r.e1rm = one
        r.e1rmAt = s.finishedAt
      }
      map.set(e.exerciseId, r)
    }
  }
  return [...map.values()].sort((a, b) => b.e1rm - a.e1rm)
}

export interface SessionPR {
  exerciseId: string
  name: string
  kind: 'weight' | 'e1rm'
  value: number
  previous: number
}

/**
 * Records set in `session` versus everything before it. An exercise only counts once it has history,
 * so a first-ever workout is not a wall of "records".
 */
export function sessionPRs(session: Session, all: Session[]): SessionPR[] {
  const before = all.filter((s) => s.finishedAt < session.finishedAt && s.id !== session.id)
  const prior = new Map(records(before).map((r) => [r.exerciseId, r]))
  const prs: SessionPR[] = []
  for (const e of session.exercises) {
    const p = prior.get(e.exerciseId)
    if (!p || !doneSets(e).length) continue
    const w = topWeight(e)
    const one = bestE1rm(e)
    if (w > p.weight) prs.push({ exerciseId: e.exerciseId, name: e.name, kind: 'weight', value: w, previous: p.weight })
    else if (one > p.e1rm + 0.01)
      prs.push({ exerciseId: e.exerciseId, name: e.name, kind: 'e1rm', value: one, previous: p.e1rm })
  }
  return prs
}

export function muscleSets(sessions: Session[]): { muscle: Muscle; sets: number }[] {
  const map = new Map<Muscle, number>()
  for (const s of sessions)
    for (const e of s.exercises) {
      const n = doneSets(e).length
      if (n) map.set(e.muscle, (map.get(e.muscle) ?? 0) + n)
    }
  return [...map.entries()].map(([muscle, sets]) => ({ muscle, sets })).sort((a, b) => b.sets - a.sets)
}

/** Local-midnight timestamps of days with a workout → number of workouts. */
export function trainedDays(sessions: Session[]): Map<number, number> {
  const map = new Map<number, number>()
  for (const s of sessions) {
    const d = new Date(s.finishedAt).setHours(0, 0, 0, 0)
    map.set(d, (map.get(d) ?? 0) + 1)
  }
  return map
}

const round = (n: number): number => Math.round(n * 100) / 100

/**
 * Double progression: when every planned set reached the target reps, advise one step more next time.
 * Otherwise advise the weight that was actually used most, so the plan follows what happens in the gym.
 */
export function nextWeight(log: ExerciseLog, step: number, autoProgress: boolean): number {
  const done = doneSets(log)
  if (!done.length) return log.targetWeight
  const counts = new Map<number, number>()
  for (const s of done) counts.set(s.weight, (counts.get(s.weight) ?? 0) + 1)
  const usual = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0]
  const lightest = Math.min(...done.map((s) => s.weight))
  const hitAll = done.length >= log.targetSets && done.every((s) => s.reps >= log.targetReps)
  if (autoProgress && hitAll && lightest > 0) return round(lightest + step)
  return usual
}
