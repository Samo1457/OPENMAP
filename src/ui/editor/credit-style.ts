import type { CreditStyle, CreditTypeStyle } from '@/render'
import { mapTypography, SANS_STACK, spacing } from '@/ui/theme/tokens'

const px = (value: string) => Number.parseFloat(value)

function typeStyle(name: 'map-credit-discreet' | 'map-credit-legible'): CreditTypeStyle {
  const token = mapTypography[name]
  return { fontSize: px(token.fontSize), fontWeight: Number(token.fontWeight), lineHeight: Number(token.lineHeight) }
}

/** The Map credit tokens (UX-DR21, UX-DR108) in reference px, handed to the Map view: no value is retyped. */
export const CREDIT_STYLE: CreditStyle = {
  fontFamily: SANS_STACK,
  margin: px(spacing['map-credit-margin']),
  discreet: typeStyle('map-credit-discreet'),
  legible: typeStyle('map-credit-legible'),
}
