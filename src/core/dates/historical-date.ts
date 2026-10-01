// Historical dates are not JavaScript Dates (AD-13): astronomical years (1 BCE = 0, 52 BCE = -51),
// optional month and day, proleptic Gregorian calendar.

import { z } from 'zod'

export const MIN_HISTORICAL_YEAR = -10000
export const MAX_HISTORICAL_YEAR = 2100

/** Proleptic Gregorian leap year on astronomical numbering (year 0 = 1 BCE is a leap year). */
export function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const

export function daysInMonth(year: number, month: number): number {
  if (month === 2 && isLeapYear(year)) return 29
  const days = DAYS_IN_MONTH[month - 1]
  if (days === undefined) throw new Error(`Invalid month: ${month}`)
  return days
}

export const historicalDateSchema = z
  .strictObject({
    year: z.int().min(MIN_HISTORICAL_YEAR).max(MAX_HISTORICAL_YEAR),
    month: z.int().min(1).max(12).optional(),
    day: z.int().min(1).max(31).optional(),
  })
  .superRefine((date, ctx) => {
    if (date.day === undefined) return
    if (date.month === undefined) {
      ctx.addIssue({ code: 'custom', path: ['day'], message: 'A day needs a month.' })
      return
    }
    // An out-of-range month is already reported by its own check; refinements still run then.
    if (!Number.isInteger(date.month) || date.month < 1 || date.month > 12) return
    if (date.day > daysInMonth(date.year, date.month)) {
      ctx.addIssue({ code: 'custom', path: ['day'], message: 'The day does not exist in this month.' })
    }
  })

/** `{year (astronomical), month?: 1..12, day?: 1..31}`, derived from the schema. */
export type HistoricalDate = Readonly<z.infer<typeof historicalDateSchema>>

/** Whether `value` is a valid HistoricalDate within the supported year range. */
export function isValidHistoricalDate(value: unknown): value is HistoricalDate {
  return historicalDateSchema.safeParse(value).success
}

export function sameHistoricalDate(a: HistoricalDate, b: HistoricalDate): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day
}
