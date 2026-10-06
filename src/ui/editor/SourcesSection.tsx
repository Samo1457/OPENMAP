import { Lock } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { SourceEntry } from '@/core'
import { iconProps } from '@/ui/components/button'

/**
 * « Sources et licences » (FR-10, AD-17): every source whose metadata is loaded for this Project, drawn
 * or not, with its name, licence and attribution as the pipeline wrote them (the attribution is the
 * source's own English wording, so it carries `lang="en"`), and a « Crédit obligatoire » marker, in
 * words and with a padlock, when the licence requires the credit on the Map. A source whose metadata
 * could not be loaded is not listed.
 */
export function SourcesSection({ sources }: { sources: readonly SourceEntry[] }) {
  const { t } = useTranslation()
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} data-testid="sources-section" className="flex flex-col gap-2">
      <h3 id={titleId} className="type-label text-om-text-secondary">
        {t('editor.sources.title')}
      </h3>
      {sources.length === 0 ? (
        <p className="type-caption text-om-text-muted">{t('editor.sources.empty')}</p>
      ) : (
        <ul aria-label={t('editor.sources.list')} className="flex flex-col gap-3">
          {sources.map((entry) => (
            <li key={entry.ids.join('+')} data-source={entry.ids.join(' ')} className="flex flex-col gap-0.5">
              <span className="break-words [overflow-wrap:anywhere] type-body-strong text-om-text-primary">{entry.source}</span>
              <span className="type-caption text-om-text-secondary">{t('editor.sources.licence', { licence: entry.licence })}</span>
              <span lang="en" className="break-words [overflow-wrap:anywhere] type-caption text-om-text-muted">
                {entry.attribution}
              </span>
              {entry.creditRequired && (
                <span className="mt-0.5 inline-flex items-center gap-1 type-caption text-om-text-secondary">
                  <Lock {...iconProps} className="icon-stroke shrink-0" />
                  {t('editor.sources.required')}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
