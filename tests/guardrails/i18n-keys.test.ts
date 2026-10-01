// AD-20, UX-DR150, UX-DR151: every UI string exists in fr and en, and French typography holds.
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { englishTypographyIssues, frenchTypographyIssues, missingKeys, type Resources } from './i18n-check'

const ROOT = resolve(import.meta.dirname, '../..')
const load = (path: string) => JSON.parse(readFileSync(join(ROOT, path), 'utf8')) as Resources

describe('i18n resources of the app', () => {
  const fr = load('src/i18n/locales/fr.json')
  const en = load('src/i18n/locales/en.json')

  it('have the same keys in fr and en, none empty', () => {
    expect(missingKeys({ fr, en })).toEqual([])
  })

  it('follow French typography in fr', () => {
    expect(frenchTypographyIssues(fr)).toEqual([])
  })

  it('use English punctuation in en', () => {
    expect(englishTypographyIssues(en)).toEqual([])
  })
})

describe('i18n checks reject violating fixtures', () => {
  it('names each key present in one locale only', () => {
    const fr = load('tests/guardrails/fixtures/i18n/missing-key/fr.json')
    const en = load('tests/guardrails/fixtures/i18n/missing-key/en.json')
    expect(missingKeys({ fr, en })).toEqual([
      'settings.language.label is missing in fr',
      'settings.onlyInFrench is missing in en',
    ])
  })

  it('names each French typography fault and accepts correct text', () => {
    const fr = load('tests/guardrails/fixtures/i18n/french-typography/fr.json')
    expect(frenchTypographyIssues(fr)).toEqual([
      'plainSpaceColon: ":" needs U+202F before it',
      'noSpaceQuestion: "?" needs U+202F before it',
      'nbspExclamation: "!" needs U+202F before it',
      'englishQuotes: use « » instead of "',
      'englishQuotes: use « » instead of "',
      'quoteWithoutSpace: "«" needs U+202F after it',
      'quoteWithoutSpace: "»" needs U+202F before it',
    ])
  })

  it('flags French typography in English strings', () => {
    expect(englishTypographyIssues({ a: 'Nearest data: 1454', b: '« Ottoman Empire »' })).toEqual([
      'b: French typography in an English string',
    ])
  })
})
