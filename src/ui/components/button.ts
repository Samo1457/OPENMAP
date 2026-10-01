// Button looks (DESIGN.md `button-primary`, `button-secondary`, `button-ghost`): square-ish 2px
// corners, 32px controls, no shadow. One primary per screen.

const base = 'inline-flex shrink-0 items-center justify-center gap-2 rounded-sm whitespace-nowrap select-none'

export const buttonClass = {
  primary: `${base} h-control-height px-3 bg-om-accent type-body-strong text-om-on-accent hover:bg-om-accent-hover`,
  secondary: `${base} h-control-height px-3 border border-om-border bg-om-surface-raised type-body text-om-text-primary hover:bg-om-selection`,
  secondarySmall: `${base} h-control-height-sm px-3 border border-om-border bg-om-surface-raised type-label text-om-text-primary hover:bg-om-selection`,
  ghost: `${base} h-control-height px-2 type-label text-om-text-secondary hover:bg-om-selection hover:text-om-text-primary`,
  ghostIcon: `${base} size-control-height text-om-text-secondary hover:bg-om-selection hover:text-om-text-primary`,
} as const

/** Lucide icons at the control size with the 1.5px stroke (UX-DR25). */
export const iconProps = { size: 16, className: 'icon-stroke shrink-0', 'aria-hidden': true } as const
