import { ToastProvider } from '@/ui/components/toast'
import { EditorPlaceholder } from '@/ui/editor/EditorPlaceholder'
import { HomeScreen } from '@/ui/home/HomeScreen'
import { useRoute } from '@/ui/routing'

// Home (Story 1.4) and the Editor placeholder (the Editor shell arrives in Story 1.5), chosen by
// the address hash. Toasts live above both, so a delete toast survives opening a Project.
export default function App() {
  const route = useRoute()
  return (
    <ToastProvider>
      {route.kind === 'editor' ? <EditorPlaceholder key={route.projectId} projectId={route.projectId} /> : <HomeScreen />}
    </ToastProvider>
  )
}
