// Expected failures are values, not exceptions (spine Consistency Conventions: Errors).
// Only programmer errors throw. The UI maps each `code` to an i18n key; core never holds UI text.

export type DomainErrorCode =
  /** A Command or its payload is malformed or out of range; the document is unchanged. */
  | 'invalid_payload'
  /** The dispatcher is read-only (no edit lock, or a newer-than-app document; AD-3, AD-9, AD-15). */
  | 'read_only'
  /** Undo was requested with an empty undo stack. */
  | 'nothing_to_undo'
  /** Redo was requested with an empty redo stack. */
  | 'nothing_to_redo'
  /** A loaded document's `schemaVersion` is newer than this app (AD-9). */
  | 'schema_too_new'
  /** A loaded document is not a valid Project of any known schemaVersion (AD-9). */
  | 'invalid_document'
  /** A year typed by the user is « 0 » (1 BCE is year 0 internally but has no year 0 on the page; AD-13). */
  | 'year_zero'
  /** A typed text is not a year, or is outside the supported years (UX-DR147). */
  | 'not_a_year'
  /** Library data cannot be loaded: not found, not JSON, invalid, or another version (AD-12, AD-27). */
  | 'geo_unavailable'
  /** The place search index cannot be loaded: not found, not JSON, or invalid (AD-16, AD-27). */
  | 'search_unavailable'
  /** The datasets metadata (`datasets.json`) cannot be loaded: not found, not JSON, or invalid (AD-17, AD-27). */
  | 'datasets_unavailable'

export type DomainErrorParams = Readonly<Record<string, string | number | boolean>>

export interface DomainError {
  readonly code: DomainErrorCode
  readonly params: DomainErrorParams
}

export type Result<T, E = DomainError> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E }

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value }
}

export function err(code: DomainErrorCode, params: DomainErrorParams = {}): Result<never, DomainError> {
  return { ok: false, error: { code, params } }
}
