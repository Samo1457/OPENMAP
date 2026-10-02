import { ToastProvider } from '@/ui/components/toast'
import { EditorShell } from '@/ui/editor/EditorShell'
import { HomeScreen } from '@/ui/home/HomeScreen'
import { useRoute } from '@/ui/routing'

// Home (Story 1.4) and the Editor shell (Story 1.5), chosen by
// the address hash. Toasts live above both, so a delete toast survives opening a Project.
export default function App() {
  const route = useRoute()
  return (
    <ToastProvider>
      {route.kind === 'editor' ? <EditorShell key={route.projectId} projectId={route.projectId} /> : <HomeScreen />}
    </ToastProvider>
  )
}
