// Checks over the i18next resources (AD-20, UX-DR150, UX-DR151), used by i18n-keys.test.ts.

export type Resources = { [key: string]: string | Resources }

/** Flattens nested resources to dotted keys: { a: { b: 'x' } } → { 'a.b': 'x' }. */
export function flatten(resources: Resources, prefix = ''): Record<string, string> {
  const flat: Record<string, string> = {}
  for (const [key, value] of Object.entries(resources)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') flat[path] = value
    else Object.assign(flat, flatten(value, path))
  }
  return flat
}

/** Every key missing from one locale, as "<key> is missing in <locale>". */
export function missingKeys(locales: Record<string, Resources>): string[] {
  const flat = Object.fromEntries(Object.entries(locales).map(([locale, resources]) => [locale, flatten(resources)]))
  const allKeys = new Set(Object.values(flat).flatMap((entries) => Object.keys(entries)))
  const problems: string[] = []
  for (const key of [...allKeys].sort()) {
    for (const [locale, entries] of Object.entries(flat)) {
      if (!(key in entries)) problems.push(`${key} is missing in ${locale}`)
      else if (entries[key].trim() === '') problems.push(`${key} is empty in ${locale}`)
    }
  }
  return problems
}

const NNBSP = ' '

/**
 * French typography (UX-DR151): U+202F before « : ; ? ! », inside « », and no
 * straight or English quotes. A colon between digits (a timecode such as 00:08,4) is allowed.
 */
export function frenchTypographyIssues(fr: Resources): string[] {
  const problems: string[] = []
  for (const [key, text] of Object.entries(flatten(fr))) {
    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      const before = text[i - 1]
      const after = text[i + 1]
      if (':;?!'.includes(char)) {
        const timecode = char === ':' && /\d/.test(before ?? '') && /\d/.test(after ?? '')
        if (!timecode && before !== NNBSP) problems.push(`${key}: "${char}" needs U+202F before it`)
      } else if (char === '«' && after !== NNBSP) {
        problems.push(`${key}: "«" needs U+202F after it`)
      } else if (char === '»' && before !== NNBSP) {
        problems.push(`${key}: "»" needs U+202F before it`)
      } else if ('"“”'.includes(char)) {
        problems.push(`${key}: use « » instead of ${char}`)
      }
    }
  }
  return problems
}

/** English strings use English punctuation: no « » and no U+202F (UX-DR151). */
export function englishTypographyIssues(en: Resources): string[] {
  return Object.entries(flatten(en))
    .filter(([, text]) => /[«» ]/.test(text))
    .map(([key]) => `${key}: French typography in an English string`)
}
