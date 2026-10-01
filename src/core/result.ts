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
