import { useTranslation } from 'react-i18next'
import { AppearanceControl } from '@/ui/settings/AppearanceControl'
import { LanguageControl } from '@/ui/settings/LanguageControl'

// Temporary placeholder screen (Story 1.2): the Home (1.4), Editor (1.5) and
// Settings dialog (1.6) replace it.
export default function App() {
  const { t } = useTranslation()

  return (
    <main className="min-h-screen bg-background px-8 py-8">
      <div className="mx-auto flex max-w-home-max-width flex-col gap-6">
        <h1 className="type-title-xl text-om-text-primary">{t('app.name')}</h1>
        <section className="flex w-full max-w-dialog-width-sm flex-col gap-4 border border-om-border bg-om-surface p-6">
          <AppearanceControl />
          <LanguageControl />
        </section>
      </div>
    </main>
  )
}
