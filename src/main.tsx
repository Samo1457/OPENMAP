import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { flushPendingSaves } from '@/persistence'
import { installChunkReload } from '@/ui/chunk-reload'
import App from '@/ui/App'
import './index.css'

installChunkReload({
  target: window,
  storage: () => window.sessionStorage,
  flush: flushPendingSaves,
  reload: () => window.location.reload(),
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
