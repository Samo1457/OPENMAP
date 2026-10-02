import { useTranslation } from 'react-i18next'
import { Dialog } from '@/ui/components/Dialog'
import { closeShortcutHelp, useShortcutHelpOpen } from './help-store'
import { formatCombo, type ShortcutDef, type ShortcutGroup, useShortcuts } from './registry'

const GROUP_ORDER: readonly ShortcutGroup[] = ['editing', 'tools', 'navigation', 'help']

/**
 * The shortcuts help (`?`, UX-DR110): every shortcut registered right now, by group, in the UI
 * language. Later stories extend it by registering their shortcuts. The shared Dialog closes it on
 * Escape and gives the focus back.
 */
export function ShortcutHelp() {
  const open = useShortcutHelpOpen()
  return open ? <ShortcutHelpDialog /> : null
}

function ShortcutHelpDialog() {
  const { t } = useTranslation()
  const shortcuts = useShortcuts()
  const translate = (key: string) => t(key as never)
  const groups = GROUP_ORDER.map((group) => ({ group, items: shortcuts.filter((shortcut) => shortcut.group === group) })).filter(({ items }) => items.length > 0)

  return (
    <Dialog title={t('keyboard.help.title')} closeLabel={t('dialog.close')} onClose={closeShortcutHelp} className="w-export-dialog-width">
      <div
        role="region"
        aria-label={t('keyboard.help.title')}
        tabIndex={0}
        data-autofocus
        className="flex min-h-0 flex-col gap-5 overflow-y-auto px-6 pt-1 pb-6"
      >
        {groups.map(({ group, items }) => (
          <section key={group} aria-labelledby={`shortcut-group-${group}`} className="flex flex-col gap-2">
            <h3 id={`shortcut-group-${group}`} className="type-label-caps text-om-text-secondary">
              {t(`keyboard.groups.${group}`)}
            </h3>
            <dl className="flex flex-col">
              {items.map((shortcut) => (
                <Row key={shortcut.id} shortcut={shortcut} translate={translate} name={t(shortcut.nameKey as never)} />
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Dialog>
  )
}

function Row({ shortcut, name, translate }: { shortcut: ShortcutDef; name: string; translate: (key: string) => string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-om-border py-2 last:border-b-0">
      <dt className="type-body text-om-text-primary">{name}</dt>
      <dd className="flex flex-wrap justify-end gap-1.5">
        {shortcut.keys.map((combo) => {
          const text = formatCombo(combo, translate)
          return (
            <kbd key={text} className="rounded-sm border border-om-border bg-om-surface-raised px-1.5 py-0.5 type-caption whitespace-nowrap text-om-text-primary">
              {text}
            </kbd>
          )
        })}
      </dd>
    </div>
  )
}
