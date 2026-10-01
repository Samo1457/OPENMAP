import { describe, expect, it, vi } from 'vitest'
import type { Command } from '../commands/command'
import { blankProject, withoutRevision } from '../testing/fixtures'
import { createDispatcher, type DispatcherState, UNDO_DEPTH } from './dispatcher'

const basemap = (id: 'parchment' | 'sombre' | 'clair' | 'relief'): Command => ({ type: 'SET_BASEMAP', payload: { basemap: id } })
const rename = (name: string): Command => ({ type: 'SET_PROJECT_NAME', payload: { name } })

const unwrap = <T>(result: { ok: true; value: T } | { ok: false; error: unknown }): T => {
  if (!result.ok) throw new Error(JSON.stringify(result.error))
  return result.value
}

describe('dispatcher and undo engine (AD-3, FR-55)', () => {
  it('apply → undo restores a deep-equal document except revision, which went up twice', () => {
    const initial = blankProject()
    const dispatcher = createDispatcher(initial)
    unwrap(dispatcher.dispatch(rename('Vienne 1683')))
    const undone = unwrap(dispatcher.undo())
    expect(withoutRevision(undone)).toEqual(withoutRevision(initial))
    expect(undone.revision).toBe(initial.revision + 2)
    expect(dispatcher.canUndo()).toBe(false)
    expect(dispatcher.canRedo()).toBe(true)
  })

  it('undoes and redoes over many levels, and revision never goes backwards', () => {
    const initial = blankProject()
    const dispatcher = createDispatcher(initial)
    const history = [initial]
    const revisions = [initial.revision]
    for (const command of [basemap('sombre'), rename('A'), basemap('relief'), rename('B'), basemap('clair')]) {
      history.push(unwrap(dispatcher.dispatch(command)))
      revisions.push(dispatcher.getState().project.revision)
    }
    for (let i = history.length - 2; i >= 0; i--) {
      expect(withoutRevision(unwrap(dispatcher.undo()))).toEqual(withoutRevision(history[i]))
      revisions.push(dispatcher.getState().project.revision)
    }
    expect(dispatcher.undo()).toEqual({ ok: false, error: { code: 'nothing_to_undo', params: {} } })
    for (let i = 1; i < history.length; i++) {
      expect(withoutRevision(unwrap(dispatcher.redo()))).toEqual(withoutRevision(history[i]))
      revisions.push(dispatcher.getState().project.revision)
    }
    expect(dispatcher.redo()).toEqual({ ok: false, error: { code: 'nothing_to_redo', params: {} } })
    expect(revisions).toEqual(Array.from({ length: revisions.length }, (_, i) => i))
  })

  it('a new Command after undo empties the redo stack', () => {
    const dispatcher = createDispatcher(blankProject())
    dispatcher.dispatch(basemap('sombre'))
    dispatcher.dispatch(basemap('relief'))
    dispatcher.undo()
    expect(dispatcher.canRedo()).toBe(true)
    dispatcher.dispatch(rename('Autre'))
    expect(dispatcher.canRedo()).toBe(false)
    expect(dispatcher.getState().canRedo).toBe(false)
  })

  it('a BATCH is one undo entry that reverts all its members', () => {
    const initial = blankProject()
    const dispatcher = createDispatcher(initial)
    unwrap(
      dispatcher.dispatch({
        type: 'BATCH',
        payload: { commands: [basemap('sombre'), rename('Batch'), { type: 'SET_OUTPUT_FORMAT', payload: { outputFormat: '9:16' } }] },
      }),
    )
    expect(withoutRevision(unwrap(dispatcher.undo()))).toEqual(withoutRevision(initial))
    expect(dispatcher.canUndo()).toBe(false)
  })

  it('an invalid BATCH member rejects the whole batch: no entry, document unchanged', () => {
    const initial = blankProject()
    const dispatcher = createDispatcher(initial)
    const result = dispatcher.dispatch({ type: 'BATCH', payload: { commands: [basemap('sombre'), rename('')] } })
    expect(result.ok ? null : result.error.code).toBe('invalid_payload')
    expect(dispatcher.getState().project).toBe(initial)
    expect(dispatcher.canUndo()).toBe(false)
  })

  it('an invalid payload is refused with invalid_payload and changes nothing', () => {
    const initial = blankProject()
    const dispatcher = createDispatcher(initial)
    const listener = vi.fn<(state: DispatcherState) => void>()
    dispatcher.subscribe(listener)
    const result = dispatcher.dispatch({ type: 'SET_OUTPUT_FORMAT', payload: { outputFormat: '4:3' } } as never)
    expect(result.ok ? null : result.error.code).toBe('invalid_payload')
    expect(dispatcher.getState().project).toBe(initial)
    expect(listener).not.toHaveBeenCalled()
  })

  it('a no-op Command adds no entry and keeps the revision', () => {
    const initial = blankProject()
    const dispatcher = createDispatcher(initial)
    const listener = vi.fn<(state: DispatcherState) => void>()
    dispatcher.subscribe(listener)
    expect(dispatcher.dispatch(basemap('parchment'))).toEqual({ ok: true, value: initial })
    expect(dispatcher.getState().project.revision).toBe(0)
    expect(dispatcher.canUndo()).toBe(false)
    expect(listener).not.toHaveBeenCalled()
  })

  it('read-only rejects dispatch, undo and redo with read_only and changes neither document nor history', () => {
    const dispatcher = createDispatcher(blankProject())
    dispatcher.dispatch(basemap('sombre'))
    dispatcher.dispatch(basemap('relief'))
    dispatcher.undo()
    dispatcher.setReadOnly(true)
    const before = dispatcher.getState()
    expect(before.readOnly).toBe(true)
    for (const result of [dispatcher.dispatch(rename('x')), dispatcher.undo(), dispatcher.redo()]) {
      expect(result).toEqual({ ok: false, error: { code: 'read_only', params: {} } })
    }
    expect(dispatcher.getState()).toBe(before)
    expect([dispatcher.canUndo(), dispatcher.canRedo()]).toEqual([true, true])
    dispatcher.setReadOnly(false)
    expect(unwrap(dispatcher.redo()).map.basemap.id).toBe('relief')
  })

  it('can start read-only', () => {
    const dispatcher = createDispatcher(blankProject(), { readOnly: true })
    expect(dispatcher.dispatch(rename('x')).ok).toBe(false)
  })

  it('clear() empties undo and redo but keeps the document', () => {
    const dispatcher = createDispatcher(blankProject())
    dispatcher.dispatch(basemap('sombre'))
    dispatcher.dispatch(basemap('relief'))
    dispatcher.undo()
    const project = dispatcher.getState().project
    dispatcher.clear()
    expect(dispatcher.getState()).toEqual({ project, canUndo: false, canRedo: false, readOnly: false })
  })

  it('reset() replaces the document and empties the history', () => {
    const dispatcher = createDispatcher(blankProject())
    dispatcher.dispatch(basemap('sombre'))
    const other = blankProject({ prefix: 'o' })
    dispatcher.reset(other)
    expect(dispatcher.getState()).toEqual({ project: other, canUndo: false, canRedo: false, readOnly: false })
  })

  it(`keeps at most ${UNDO_DEPTH} entries, dropping the oldest`, () => {
    const dispatcher = createDispatcher(blankProject())
    for (let i = 1; i <= UNDO_DEPTH + 5; i++) unwrap(dispatcher.dispatch(rename(`Name ${i}`)))
    let undone = 0
    while (dispatcher.undo().ok) undone++
    expect(undone).toBe(UNDO_DEPTH)
    expect(dispatcher.getState().project.name).toBe('Name 5')
  })

  it('notifies subscribers with a stable state snapshot until the next change, and unsubscribes', () => {
    const dispatcher = createDispatcher(blankProject())
    const listener = vi.fn<(state: DispatcherState) => void>()
    const unsubscribe = dispatcher.subscribe(listener)
    expect(dispatcher.getState()).toBe(dispatcher.getState())
    dispatcher.dispatch(basemap('sombre'))
    dispatcher.undo()
    dispatcher.redo()
    dispatcher.setReadOnly(true)
    dispatcher.clear()
    expect(listener).toHaveBeenCalledTimes(5)
    expect(listener).toHaveBeenLastCalledWith(dispatcher.getState())
    unsubscribe()
    dispatcher.setReadOnly(false)
    expect(listener).toHaveBeenCalledTimes(5)
  })

  it('is deterministic: the same Commands on the same document give deep-equal results', () => {
    const run = () => {
      const dispatcher = createDispatcher(blankProject())
      dispatcher.dispatch(basemap('sombre'))
      dispatcher.dispatch({ type: 'SET_REFERENCE_DATE', payload: { referenceDate: { year: -51 } } })
      dispatcher.undo()
      dispatcher.redo()
      dispatcher.dispatch({ type: 'SET_BASEMAP_ADJUSTMENTS', payload: { adjustments: { tintColor: '#a35a2b', tintIntensity: 30 } } })
      return dispatcher.getState()
    }
    expect(run()).toEqual(run())
  })

  it('isolates a throwing listener: the others still run, the change stays committed, the error is reported', () => {
    const errors: unknown[] = []
    const dispatcher = createDispatcher(blankProject(), { onListenerError: (error) => errors.push(error) })
    const boom = new Error('listener failed')
    const after = vi.fn<(state: DispatcherState) => void>()
    dispatcher.subscribe(() => {
      throw boom
    })
    dispatcher.subscribe(after)
    const result = dispatcher.dispatch(basemap('sombre'))
    expect(result.ok).toBe(true)
    expect(dispatcher.getState().project.map.basemap.id).toBe('sombre')
    expect(after).toHaveBeenCalledTimes(1)
    expect(errors).toEqual([boom])
    expect(dispatcher.undo().ok).toBe(true)
    expect(errors).toEqual([boom, boom])
  })

  it('rethrows a listener error asynchronously by default instead of from dispatch', () => {
    const dispatcher = createDispatcher(blankProject())
    const rejections: unknown[] = []
    const spy = vi.spyOn(Promise, 'reject').mockImplementation((reason?: unknown) => {
      rejections.push(reason)
      return new Promise<never>(() => {})
    })
    dispatcher.subscribe(() => {
      throw new Error('late')
    })
    expect(() => dispatcher.dispatch(basemap('sombre'))).not.toThrow()
    spy.mockRestore()
    expect(rejections).toEqual([new Error('late')])
  })

  it('gives every listener of one round the same snapshot, even when one dispatches re-entrantly', () => {
    const dispatcher = createDispatcher(blankProject())
    const seen: string[] = []
    dispatcher.subscribe((state) => {
      seen.push(`a:${state.project.map.basemap.id}`)
      if (state.project.map.basemap.id === 'sombre') dispatcher.dispatch(basemap('relief'))
    })
    dispatcher.subscribe((state) => seen.push(`b:${state.project.map.basemap.id}`))
    dispatcher.dispatch(basemap('sombre'))
    expect(seen).toEqual(['a:sombre', 'a:relief', 'b:relief', 'b:sombre'])
  })
})
