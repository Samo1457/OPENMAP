import { PROJECT_NAME_MAX_LENGTH } from '@/core'

const length = (text: string) => Array.from(text).length

/**
 * The name of a duplicate: « {nom} (copie) » / "{name} (copy)" through `format` (the i18n
 * template), with `name` shortened so the result fits the 120 code-point limit.
 */
export function copyName(name: string, format: (name: string) => string, max = PROJECT_NAME_MAX_LENGTH): string {
  const full = format(name)
  if (length(full) <= max) return full
  const room = Math.max(0, max - length(format('')))
  return format(Array.from(name).slice(0, room).join('').trimEnd())
}
