import type { HistoricalDate } from './historical-date'

/**
 * Orders two HistoricalDates: negative when `a` is earlier, positive when later, 0 when equal.
 * A missing month or day sorts before every present one (the start of the year or month).
 */
export function compareHistoricalDates(a: HistoricalDate, b: HistoricalDate): number {
  return a.year - b.year || (a.month ?? 0) - (b.month ?? 0) || (a.day ?? 0) - (b.day ?? 0)
}
