import { useEffect } from 'react'
import { ToastProvider } from '@/ui/components/toast'
import { EditorShell } from '@/ui/editor/EditorShell'
import { HomeScreen } from '@/ui/home/HomeScreen'
import { HELP_SHORTCUTS, closeShortcutHelp } from '@/ui/keyboard/help-store'
import { installKeyboard, registerShortcuts } from '@/ui/keyboard/registry'
import { ShortcutHelp } from '@/ui/keyboard/ShortcutHelp'
import { useRoute } from '@/ui/routing'
import { SettingsDialog } from '@/ui/settings/SettingsDialog'
import { closeSettings } from '@/ui/settings/settings-store'

// Home (Story 1.4) and the Editor shell (Story 1.5), chosen by
// the address hash. Toasts live above both, so a delete toast survives opening a Project. The one
// Settings dialog (Story 1.6) and the shortcuts help (Story 1.7) serve both; the keyboard registry
// listens on the window for the whole app.
export default function App() {
  const route = useRoute()
  const screen = route.kind === 'editor' ? `editor:${route.projectId}` : 'home'
  // Back/Forward (or any hash change) closes Settings: it must not stay over another screen.
  useEffect(() => {
    closeSettings()
    closeShortcutHelp()
  }, [screen])
  useEffect(() => {
    const uninstall = installKeyboard(window)
    const unregister = registerShortcuts(HELP_SHORTCUTS)
    return () => {
      unregister()
      uninstall()
    }
  }, [])
  return (
    <ToastProvider>
      {route.kind === 'editor' ? <EditorShell key={route.projectId} projectId={route.projectId} /> : <HomeScreen />}
      <SettingsDialog />
      <ShortcutHelp />
    </ToastProvider>
  )
}
