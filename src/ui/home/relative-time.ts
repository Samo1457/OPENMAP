// The "Modifié …" part of a Project card (Story 1.4 decision): à l'instant (< 1 min), il y a 5 min,
// il y a 2 h (same day), hier (previous calendar day), then the date. UI-side, so the clock is fine.

export type RelativeTime =
  | { readonly key: 'justNow' }
  | { readonly key: 'minutes'; readonly n: number }
  | { readonly key: 'hours'; readonly n: number }
  | { readonly key: 'yesterday' }
  | { readonly key: 'date'; readonly date: string }

const MINUTE = 60_000
const HOUR = 60 * MINUTE

function startOfDay(ms: number): number {
  const day = new Date(ms)
  day.setHours(0, 0, 0, 0)
  return day.getTime()
}

/** `then` and `now` in ms since the epoch; calendar days in the local time zone. */
export function relativeTime(then: number, now: number, language: string): RelativeTime {
  const date = () => new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short', year: 'numeric' }).format(then)
  // A time more than a minute ahead (another device's clock, a clock set back) gets its date.
  if (then - now > MINUTE) return { key: 'date', date: date() }
  const elapsed = Math.max(0, now - then)
  if (elapsed < MINUTE) return { key: 'justNow' }
  if (elapsed < HOUR) return { key: 'minutes', n: Math.floor(elapsed / MINUTE) }
  const today = startOfDay(now)
  if (then >= today) return { key: 'hours', n: Math.floor(elapsed / HOUR) }
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (then >= yesterday.getTime()) return { key: 'yesterday' }
  return { key: 'date', date: date() }
}
