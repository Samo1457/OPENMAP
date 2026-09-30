// Public API of the persistence adapter. Other layers import this file only (spine Design Paradigm).

/**
 * Writes every pending Project save to IndexedDB right now (AD-8 `flush()`).
 * No-op until autosave lands in Story 1.4; callers already await it so the
 * contract does not change then.
 */
export async function flushPendingSaves(): Promise<void> {}
