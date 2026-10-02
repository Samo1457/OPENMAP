// Storage sizes for Settings → Storage: « 12 Mo », "2 GB". Decimal multiples (1 MB = 1000 kB), as
// the labels say, rounded to one decimal under 10 and to a whole number from 10 on.

export type ByteUnit = 'b' | 'kb' | 'mb' | 'gb' | 'tb'

const UNITS: readonly ByteUnit[] = ['b', 'kb', 'mb', 'gb', 'tb']
const STEP = 1000

const round = (value: number) => (value < 10 ? Math.round(value * 10) / 10 : Math.round(value))

/** The size in the largest unit it reaches once rounded. */
export function scaleBytes(bytes: number): { value: number; unit: ByteUnit } {
  let value = Math.max(0, bytes)
  let index = 0
  // Compare the rounded value, so 999 999 B reads 1 MB rather than 1000 kB.
  while (round(value) >= STEP && index < UNITS.length - 1) {
    value /= STEP
    index++
  }
  return { value: round(value), unit: UNITS[index] }
}
