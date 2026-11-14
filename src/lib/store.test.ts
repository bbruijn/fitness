import { beforeEach, describe, expect, it } from 'vitest'
import { nextDayId, useStore } from './store'

const state = () => useStore.getState()

beforeEach(() => state().resetAll())

describe('workout flow', () => {
  it('prefills sets from the plan and carries a weight change forward', () => {
    state().startWorkout('day-1')
    const first = state().active!.exercises[0]
    expect(first.sets).toHaveLength(3)
    expect(first.sets[0]).toMatchObject({ weight: 80, reps: 10, done: false })

    state().updateSet(0, 0, { weight: 85 })
    expect(state().active!.exercises[0].sets.map((s) => s.weight)).toEqual([85, 85, 85])
  })

  it('does not overwrite sets that are already logged', () => {
    state().startWorkout('day-1')
    state().completeSet(0, 0)
    state().updateSet(0, 1, { weight: 90 })
    expect(state().active!.exercises[0].sets.map((s) => s.weight)).toEqual([80, 90, 90])
  })

  it('starts a rest after a set, but not after the very last one', () => {
    state().startWorkout('day-1')
    state().completeSet(0, 0)
    expect(state().active!.restEndsAt).toBeGreaterThan(Date.now())
    state().endRest()
    const a = state().active!
    a.exercises.forEach((e, ei) => e.sets.forEach((_, si) => state().completeSet(ei, si)))
    expect(state().active!.restEndsAt).toBeNull()
  })

  it('saves only what was done and raises the shared advice', () => {
    state().startWorkout('day-1')
    for (let si = 0; si < 3; si++) state().completeSet(0, si) // leg press: all reps
    state().completeSet(1, 0) // leg extension: one set only
    const session = state().finishWorkout()!

    expect(session.exercises.map((e) => e.sets.length)).toEqual([3, 1])
    expect(state().active).toBeNull()
    expect(state().sessions).toHaveLength(1)

    const items = state().program.days.flatMap((d) => d.items)
    // leg press is planned on day 1 and day 4 — both move
    expect(items.filter((it) => it.exerciseId === 'leg-press').map((it) => it.weight)).toEqual([82.5, 82.5])
    expect(items.find((it) => it.exerciseId === 'leg-extension')!.weight).toBe(40)
    expect(nextDayId(state().program, state().sessions)).toBe('day-2')
  })

  it('saves nothing when no set was logged', () => {
    state().startWorkout('day-1')
    expect(state().finishWorkout()).toBeNull()
    expect(state().sessions).toHaveLength(0)
    expect(state().active).toBeNull()
  })

  it('ignores a second start while a workout is running', () => {
    state().startWorkout('day-1')
    const id = state().active!.id
    state().startWorkout('day-2')
    expect(state().active!.id).toBe(id)
  })
})

describe('backup', () => {
  it('round-trips through export and import', () => {
    state().loadDemo()
    const count = state().sessions.length
    const json = state().exportData()
    state().resetAll()
    expect(state().sessions).toHaveLength(0)
    state().importData(json)
    expect(state().sessions).toHaveLength(count)
  })

  it('rejects files that are not a Volt backup', () => {
    expect(() => state().importData('{"hello":"world"}')).toThrow()
    expect(() => state().importData('not json')).toThrow()
  })
})
