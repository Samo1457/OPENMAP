import { useEffect } from 'react'
import { ToastProvider } from '@/ui/components/toast'
import { EditorShell } from '@/ui/editor/EditorShell'
import { HomeScreen } from '@/ui/home/HomeScreen'
import { useRoute } from '@/ui/routing'
import { SettingsDialog } from '@/ui/settings/SettingsDialog'
import { closeSettings } from '@/ui/settings/settings-store'

// Home (Story 1.4) and the Editor shell (Story 1.5), chosen by
// the address hash. Toasts live above both, so a delete toast survives opening a Project. The one
// Settings dialog (Story 1.6) serves both.
export default function App() {
  const route = useRoute()
  const screen = route.kind === 'editor' ? `editor:${route.projectId}` : 'home'
  // Back/Forward (or any hash change) closes Settings: it must not stay over another screen.
  useEffect(() => closeSettings(), [screen])
  return (
    <ToastProvider>
      {route.kind === 'editor' ? <EditorShell key={route.projectId} projectId={route.projectId} /> : <HomeScreen />}
      <SettingsDialog />
    </ToastProvider>
  )
}
