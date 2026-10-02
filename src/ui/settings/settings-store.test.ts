import { afterEach, describe, expect, it } from 'vitest'
import { closeSettings, getSettingsState, openSettings, selectSettingsTab } from './settings-store'

afterEach(() => closeSettings())

describe('settings store (UX-DR134)', () => {
  it('opens on Appearance by default, or directly on a tab', () => {
    openSettings()
    expect(getSettingsState()).toMatchObject({ open: true, tab: 'appearance' })
    closeSettings()
    openSettings('storage')
    expect(getSettingsState()).toMatchObject({ open: true, tab: 'storage' })
  })

  it('switches tab while open and keeps the element to refocus', () => {
    openSettings('language')
    const { returnFocus } = getSettingsState() as { returnFocus: unknown }
    openSettings('storage')
    expect(getSettingsState()).toEqual({ open: true, tab: 'storage', returnFocus, trigger: null })
    selectSettingsTab('appearance')
    expect(getSettingsState()).toMatchObject({ open: true, tab: 'appearance' })
  })

  it('keeps the trigger to refocus when the focused element is gone', () => {
    const trigger = { id: 'menu-button' } as unknown as HTMLElement
    openSettings('appearance', trigger)
    expect(getSettingsState()).toMatchObject({ open: true, trigger })
  })

  it('selecting a tab while closed does nothing', () => {
    selectSettingsTab('storage')
    expect(getSettingsState()).toEqual({ open: false })
  })
})
