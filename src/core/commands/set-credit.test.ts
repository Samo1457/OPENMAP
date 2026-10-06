import { describe, expect, it } from 'vitest'
import { createDispatcher } from '../history/dispatcher'
import { blankProject, roundTrip, withoutRevision } from '../testing/fixtures'
import { apply } from './apply'

describe('SET_CREDIT', () => {
  const project = blankProject()

  it('starts at the default placement', () => {
    expect(project.credit).toEqual({ corner: 'bottom-left', prominence: 'discreet' })
  })

  it('moves the credit and its inverse restores both values', () => {
    const { changed, inverse, reverted } = roundTrip(project, { type: 'SET_CREDIT', payload: { corner: 'top-right' } })
    expect(changed.credit).toEqual({ corner: 'top-right', prominence: 'discreet' })
    expect(inverse).toEqual({ type: 'SET_CREDIT', payload: { corner: 'bottom-left', prominence: 'discreet' } })
    expect(withoutRevision(reverted)).toEqual(withoutRevision(project))
  })

  it('changes the prominence alone and both at once', () => {
    expect(roundTrip(project, { type: 'SET_CREDIT', payload: { prominence: 'legible' } }).changed.credit).toEqual({ corner: 'bottom-left', prominence: 'legible' })
    const both = roundTrip(project, { type: 'SET_CREDIT', payload: { corner: 'bottom-right', prominence: 'legible' } })
    expect(both.changed.credit).toEqual({ corner: 'bottom-right', prominence: 'legible' })
    expect(withoutRevision(both.reverted)).toEqual(withoutRevision(project))
  })

  it('changes nothing but corner and prominence', () => {
    const { changed } = roundTrip(project, { type: 'SET_CREDIT', payload: { corner: 'top-left', prominence: 'legible' } })
    const { credit: _a, revision: _b, ...rest } = changed
    const { credit: _c, revision: _d, ...before } = project
    expect(rest).toEqual(before)
  })

  it('is a no-op for the current placement', () => {
    expect(apply(project, { type: 'SET_CREDIT', payload: { corner: 'bottom-left', prominence: 'discreet' } })).toEqual({ ok: true, value: { changed: false, project } })
  })

  it.each([
    ['an empty payload', {}],
    ['an unknown corner', { corner: 'middle' }],
    ['an unknown prominence', { prominence: 'loud' }],
    ['a hiding field', { hidden: true }],
    ['a visibility field', { corner: 'top-left', visible: false }],
    ['an offset', { offset: 10 }],
    ['an optional-credit field', { showOptional: true }],
  ])('refuses %s with invalid_payload', (_label, payload) => {
    const result = apply(project, { type: 'SET_CREDIT', payload } as never)
    expect(result.ok ? null : result.error.code).toBe('invalid_payload')
  })

  it('is one history entry per change: undo then redo through the dispatcher', () => {
    const dispatcher = createDispatcher(project)
    expect(dispatcher.dispatch({ type: 'SET_CREDIT', payload: { corner: 'top-left' } }).ok).toBe(true)
    expect(dispatcher.dispatch({ type: 'SET_CREDIT', payload: { prominence: 'legible' } }).ok).toBe(true)
    dispatcher.undo()
    expect(dispatcher.getState().project.credit).toEqual({ corner: 'top-left', prominence: 'discreet' })
    dispatcher.undo()
    expect(dispatcher.getState().project.credit).toEqual({ corner: 'bottom-left', prominence: 'discreet' })
    expect(dispatcher.canUndo()).toBe(false)
    dispatcher.redo()
    expect(dispatcher.getState().project.credit).toEqual({ corner: 'top-left', prominence: 'discreet' })
  })

  it('is rejected by a read-only dispatcher, not only hidden', () => {
    const dispatcher = createDispatcher(project, { readOnly: true })
    const result = dispatcher.dispatch({ type: 'SET_CREDIT', payload: { corner: 'top-right' } })
    expect(result.ok ? null : result.error.code).toBe('read_only')
    expect(dispatcher.getState().project).toBe(project)
  })

  it('works inside a BATCH with one undo entry', () => {
    const dispatcher = createDispatcher(project)
    dispatcher.dispatch({ type: 'BATCH', payload: { commands: [{ type: 'SET_CREDIT', payload: { corner: 'top-right' } }, { type: 'SET_CREDIT', payload: { prominence: 'legible' } }] } })
    expect(dispatcher.getState().project.credit).toEqual({ corner: 'top-right', prominence: 'legible' })
    dispatcher.undo()
    expect(dispatcher.getState().project.credit).toEqual({ corner: 'bottom-left', prominence: 'discreet' })
    expect(dispatcher.canUndo()).toBe(false)
  })
})
