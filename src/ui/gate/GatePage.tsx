import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Banner } from '@/ui/components/Banner'
import { TopBar } from '@/ui/components/TopBar'
import type { Capability } from './capabilities'

/** The result of the latest copy; `attempt` changes on every click so the message is re-announced. */
type CopyState = { readonly result: 'idle' | 'copied' | 'failed'; readonly attempt: number }

async function copyLink(href: string): Promise<boolean> {
  try {
    if (!navigator.clipboard?.writeText) return false
    await navigator.clipboard.writeText(href)
    return true
  } catch {
    return false
  }
}

/**
 * Shown instead of the app (AD-19, NFR-4): « conçu pour un ordinateur » on a phone or tablet
 * (UX-DR135, blocking), or the unsupported-browser message when WebGL2, IndexedDB or Web Locks is
 * missing. The message is a warning banner with « Copier le lien »; each click resets and
 * re-announces the result, which describes the button. When copying fails, the link is shown to copy
 * by hand.
 */
export function GatePage({ reason, missing = [] }: { reason: 'desktopOnly' | 'unsupported'; missing?: readonly Capability[] }) {
  const { t } = useTranslation()
  const [copy, setCopy] = useState<CopyState>({ result: 'idle', attempt: 0 })
  const attempts = useRef(0)
  const resultId = useId()
  const href = window.location.href

  function onCopy() {
    const attempt = ++attempts.current
    setCopy({ result: 'idle', attempt })
    void copyLink(href).then((ok) => {
      // Only the latest click reports.
      if (attempt === attempts.current) setCopy({ result: ok ? 'copied' : 'failed', attempt })
    })
  }

  return (
    <div className="flex min-h-screen flex-col bg-om-background">
      <TopBar end={null} />
      <main className="mx-auto flex w-full max-w-160 flex-col gap-4 px-4 py-10">
        <h1 className="type-title-lg text-om-text-primary">{t(`gate.${reason}.title`)}</h1>
        <Banner tone="warning" action={{ label: t('gate.copyLink'), onClick: onCopy, describedBy: resultId }}>
          {t(`gate.${reason}.message`)}
        </Banner>
        {missing.length > 0 && (
          <p className="type-caption text-om-text-secondary">{t('gate.missing', { list: missing.map((capability) => t(`gate.capability.${capability}`)).join(', ') })}</p>
        )}
        <div id={resultId} role="status" className="flex flex-col gap-1">
          {copy.result === 'copied' && (
            <p key={copy.attempt} className="type-body text-om-text-primary">
              {t('gate.copied')}
            </p>
          )}
          {copy.result === 'failed' && (
            <div key={copy.attempt} className="flex flex-col gap-1">
              <p className="type-body text-om-text-primary">{t('gate.copyFailed')}</p>
              <p className="type-body break-all text-om-text-primary select-all" data-testid="gate-link">
                {href}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
