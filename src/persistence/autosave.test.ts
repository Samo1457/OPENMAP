import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDispatcher, type Dispatcher, type Project } from '@/core'
import { blankProject } from '@/core/testing/fixtures'
import { type AutosaveClock, createAutosave, installPageLifecycleFlush, type SaveStatus } from './autosave'
import type { SaveOutcome } from './projects'

const clock: AutosaveClock = {
  now: () => Date.now(),
  setTimeout: (callback, ms) => setTimeout(callback, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
}

let dispatcher: Dispatcher
let saved: Project[]
let save: ReturnType<typeof vi.fn<(project: Project) => Promise<SaveOutcome>>>

const rename = (name: string) => {
  const result = dispatcher.dispatch({ type: 'SET_PROJECT_NAME', payload: { name } })
  if (!result.ok) throw new Error(result.error.code)
}

beforeEach(() => {
  vi.useFakeTimers({ now: 0 })
  dispatcher = createDispatcher(blankProject())
  saved = []
  save = vi.fn<(project: Project) => Promise<SaveOutcome>>(async (project: Project): Promise<SaveOutcome> => {
    saved.push(project)
    return { ok: true }
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('autosave timing (AD-8, NFR-5)', () => {
  it('saves 1 s after the last change', async () => {
    const autosave = createAutosave({ source: dispatcher, save, clock })
    rename('A')
    await vi.advanceTimersByTimeAsync(999)
    expect(save).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(saved.map((p) => p.name)).toEqual(['A'])
    await autosave.close()
  })

  it('restarts the debounce on each change but saves no later than 5 s after the first unsaved one', async () => {
    const autosave = createAutosave({ source: dispatcher, save, clock })
    for (let i = 0; i < 6; i++) {
      rename(`Name ${i}`)
      await vi.advanceTimersByTimeAsync(900)
    }
    // Changes at 0, 900 … 4500 ms: the debounce would wait until 5500, the cap fires at 5000.
    expect(saved.map((p) => p.name)).toEqual(['Name 5'])
    expect(Date.now()).toBe(5400)
    rename('Later')
    await vi.advanceTimersByTimeAsync(1000)
    expect(saved.map((p) => p.name)).toEqual(['Name 5', 'Later'])
    await autosave.close()
  })

  it('writes nothing while nothing changed, and nothing for a read-only document', async () => {
    const autosave = createAutosave({ source: dispatcher, save, clock })
    await vi.advanceTimersByTimeAsync(10_000)
    await autosave.flush()
    dispatcher.reset({ ...dispatcher.getState().project, name: 'Reloaded' })
    dispatcher.setReadOnly(true)
    await vi.advanceTimersByTimeAsync(10_000)
    expect(save).not.toHaveBeenCalled()
    await autosave.close()
  })
})

describe('read-only (AD-9, AD-15)', () => {
  it('drops an unsaved change and its timer when the document turns read-only', async () => {
    const autosave = createAutosave({ source: dispatcher, save, clock })
    rename('Unsaved')
    expect(autosave.getStatus()).toBe('saving')
    dispatcher.setReadOnly(true)
    expect(autosave.getStatus()).toBe('saved')
    await vi.advanceTimersByTimeAsync(10_000)
    await autosave.flush()
    autosave.flushOnPageHide()
    expect(save).not.toHaveBeenCalled()
    await autosave.close()
  })
})

describe('flush (AD-8)', () => {
  it('writes the pending change at once and cancels the timer', async () => {
    const autosave = createAutosave({ source: dispatcher, save, clock })
    rename('A')
    await autosave.flush()
    expect(saved.map((p) => p.name)).toEqual(['A'])
    await vi.advanceTimersByTimeAsync(10_000)
    expect(save).toHaveBeenCalledTimes(1)
    await autosave.close()
  })

  it('waits for a write in flight, then writes the newer change', async () => {
    let release: () => void = () => undefined
    save.mockImplementationOnce(async (project) => {
      await new Promise<void>((resolve) => (release = resolve))
      saved.push(project)
      return { ok: true }
    })
    const autosave = createAutosave({ source: dispatcher, save, clock })
    rename('A')
    await vi.advanceTimersByTimeAsync(1000)
    rename('B')
    const flushed = autosave.flush()
    release()
    await flushed
    expect(saved.map((p) => p.name)).toEqual(['A', 'B'])
    await autosave.close()
  })

  it('close() flushes and stops watching', async () => {
    const autosave = createAutosave({ source: dispatcher, save, clock })
    rename('A')
    await autosave.close()
    rename('B')
    await vi.advanceTimersByTimeAsync(10_000)
    expect(saved.map((p) => p.name)).toEqual(['A'])
  })
})

describe('save status (AD-8)', () => {
  it('goes saving → saved, and error on a refused or failed write, retried on the next change', async () => {
    const autosave = createAutosave({ source: dispatcher, save, clock })
    const statuses: SaveStatus[] = []
    autosave.subscribe((status) => statuses.push(status))
    expect(autosave.getStatus()).toBe('saved')

    rename('A')
    await vi.advanceTimersByTimeAsync(1000)
    expect(statuses).toEqual(['saving', 'saved'])

    save.mockResolvedValueOnce({ ok: false, reason: 'stale_epoch' })
    rename('B')
    await vi.advanceTimersByTimeAsync(1000)
    expect(autosave.getStatus()).toBe('error')

    save.mockRejectedValueOnce(new Error('quota'))
    await autosave.flush()
    expect(autosave.getStatus()).toBe('error')
    expect(save).toHaveBeenCalledTimes(3)

    rename('C')
    await vi.advanceTimersByTimeAsync(1000)
    expect(autosave.getStatus()).toBe('saved')
    expect(saved.map((p) => p.name)).toEqual(['A', 'C'])
    await autosave.close()
  })
})

describe('page hide (AD-8)', () => {
  it('writes the latest unconfirmed snapshot synchronously, then flushes', async () => {
    const saveNow = vi.fn<(project: Project) => boolean>(() => true)
    let release: () => void = () => undefined
    save.mockImplementationOnce(async (project) => {
      await new Promise<void>((resolve) => (release = resolve))
      saved.push(project)
      return { ok: true }
    })
    const autosave = createAutosave({ source: dispatcher, save, saveNow, clock })
    autosave.flushOnPageHide()
    expect(saveNow).not.toHaveBeenCalled()

    rename('A')
    autosave.flushOnPageHide()
    expect(saveNow.mock.calls.map(([p]) => p.name)).toEqual(['A'])
    // The write of A is in flight and unconfirmed: a second page hide writes it again.
    autosave.flushOnPageHide()
    expect(saveNow.mock.calls.map(([p]) => p.name)).toEqual(['A', 'A'])
    release()
    await autosave.close()
    expect(saved.map((p) => p.name)).toEqual(['A'])
    autosave.flushOnPageHide()
    expect(saveNow).toHaveBeenCalledTimes(2)
  })

  it('installPageLifecycleFlush: pagehide runs the page-hide save, hidden visibility a flush', () => {
    const win = new EventTarget()
    const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' })
    const flush = vi.fn<() => Promise<void>>(async () => undefined)
    const onPageHide = vi.fn<() => void>()
    const uninstall = installPageLifecycleFlush({ window: win, document: doc }, { flush, onPageHide })

    win.dispatchEvent(new Event('pagehide'))
    expect(onPageHide).toHaveBeenCalledTimes(1)
    doc.dispatchEvent(new Event('visibilitychange'))
    expect(flush).not.toHaveBeenCalled()
    doc.visibilityState = 'hidden'
    doc.dispatchEvent(new Event('visibilitychange'))
    expect(flush).toHaveBeenCalledTimes(1)

    uninstall()
    win.dispatchEvent(new Event('pagehide'))
    doc.dispatchEvent(new Event('visibilitychange'))
    expect(onPageHide).toHaveBeenCalledTimes(1)
    expect(flush).toHaveBeenCalledTimes(1)
  })
})
