import { useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { Banner, useSessionDismissal } from '@/ui/components/Banner'
import { isFirefox, isSmallWindow } from './capabilities'

function subscribeToResize(onChange: () => void): () => void {
  window.addEventListener('resize', onChange)
  return () => window.removeEventListener('resize', onChange)
}

const smallWindow = () => isSmallWindow(window.innerWidth, window.innerHeight)

/** « OPENMAP est conçu pour Chrome et Edge… », on Home in Firefox (UX-DR148, NFR-4); dismissable for the session. */
export function FirefoxBanner({ userAgent = navigator.userAgent }: { userAgent?: string }) {
  const { t } = useTranslation()
  const [dismissed, dismiss] = useSessionDismissal('firefox')
  if (dismissed || !isFirefox(userAgent)) return null
  return (
    <Banner tone="warning" onDismiss={dismiss}>
      {t('gate.firefoxBanner')}
    </Banner>
  )
}

/**
 * « OPENMAP est conçu pour un écran d'au moins 1366 × 768. » while the window is narrower than
 * 1366 px or lower than that screen's 648 px viewport (UX-DR148); dismissable for the session.
 */
export function SmallWindowBanner() {
  const { t } = useTranslation()
  const [dismissed, dismiss] = useSessionDismissal('smallWindow')
  const small = useSyncExternalStore(subscribeToResize, smallWindow)
  if (dismissed || !small) return null
  return (
    <Banner tone="warning" onDismiss={dismiss}>
      {t('gate.smallWindowBanner')}
    </Banner>
  )
}
