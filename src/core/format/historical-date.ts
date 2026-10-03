// Writing and reading years on the Map and in the Reference Date field (AD-13, AD-25, UX-DR147).
// Map text follows `project.mapLocale`, never the UI language, so it never goes through i18n.

import { type HistoricalDate, MAX_HISTORICAL_YEAR, MIN_HISTORICAL_YEAR } from '../dates/historical-date'
import type { MapLocale } from '../model/project'
import { type Result, err, ok } from '../result'

const NBSP = '\u00A0'

/** The BCE suffix of each Map language; French uses non-breaking spaces (UX-DR151). */
const BCE_SUFFIX: Readonly<Record<MapLocale, string>> = { fr: `av.${NBSP}J.-C.`, en: 'BC' }

/**
 * A year as printed on the Map: years from 1 are plain (« 1453 »), years before are counted from
 * 1 BCE (astronomical 0 → « 1 av. J.-C. », -51 → « 52 av. J.-C. » / "52 BC"). Year precision only.
 */
export function formatYear(year: number, locale: MapLocale): string {
  if (year >= 1) return String(year)
  const separator = locale === 'fr' ? NBSP : ' '
  return `${1 - year}${separator}${BCE_SUFFIX[locale]}`
}

/** A HistoricalDate in the Map language (year precision: the month and day are not written yet). */
export function formatHistoricalDate(date: HistoricalDate, locale: MapLocale): string {
  return formatYear(date.year, locale)
}

const PLAIN_YEAR = /^[+-]?\d+$/
const ERA_YEAR = /^(\d+) ?(bc|bce|av\.? ?j\.?-?c\.?|ad|ce|ap\.? ?j\.?-?c\.?)$/
const BEFORE_ERA = /^(?:bc|bce|av)/

/**
 * Reads a year typed in the Reference Date field. Accepts « 1453 » and « -51 » (astronomical,
 * as stored), and « 52 av. J.-C. », « 52 BC », « 52 BCE », « 1 BC » (counted from 1 BCE). Year 0 is
 * the error `year_zero` (no year 0 on the page); anything else that is not a year inside the
 * supported range is `not_a_year`. Returns the astronomical year.
 */
export function parseYear(text: string): Result<number> {
  const normalized = text
    .replace(/[−–—]/g, '-')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
  let year: number
  if (PLAIN_YEAR.test(normalized)) {
    year = Number(normalized)
    if (year === 0) return err('year_zero')
  } else {
    const match = ERA_YEAR.exec(normalized)
    if (!match) return err('not_a_year')
    const count = Number(match[1])
    if (count === 0) return err('year_zero')
    year = BEFORE_ERA.test(match[2]) ? 1 - count : count
  }
  if (!Number.isSafeInteger(year) || year < MIN_HISTORICAL_YEAR || year > MAX_HISTORICAL_YEAR) return err('not_a_year')
  return ok(year)
}
