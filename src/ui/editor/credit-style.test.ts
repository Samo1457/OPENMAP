import { describe, expect, it } from 'vitest'
import { mapTypography, SANS_STACK, spacing } from '@/ui/theme/tokens'
import { CREDIT_STYLE } from './credit-style'

describe('CREDIT_STYLE (UX-DR21, UX-DR108)', () => {
  it('is the credit tokens in reference px: discreet 18/400/1.2, legible 24/500/1.2, margin 24, the sans stack', () => {
    expect(CREDIT_STYLE).toEqual({
      fontFamily: SANS_STACK,
      margin: 24,
      discreet: { fontSize: 18, fontWeight: 400, lineHeight: 1.2 },
      legible: { fontSize: 24, fontWeight: 500, lineHeight: 1.2 },
    })
  })

  it('reads the tokens, so a change of token changes the style', () => {
    expect(CREDIT_STYLE.margin).toBe(Number.parseFloat(spacing['map-credit-margin']))
    expect(CREDIT_STYLE.discreet.fontSize).toBe(Number.parseFloat(mapTypography['map-credit-discreet'].fontSize))
    expect(CREDIT_STYLE.legible.fontWeight).toBe(Number(mapTypography['map-credit-legible'].fontWeight))
    expect(SANS_STACK.startsWith("'Source Sans 3 Variable'")).toBe(true)
  })
})
