// Fields of the panel that keep an uncommitted draft (the Project name) register here so the edit
// session can commit them before the holder's last save on a takeover (AD-15): typed work is not lost
// when the panel turns read-only. A commit is a Command like any other (AD-3).

const committers = new Set<() => void>()

/** Registers a function that commits the field's draft, if any; returns the unregister function. */
export function registerPendingEdit(commit: () => void): () => void {
  committers.add(commit)
  return () => {
    committers.delete(commit)
  }
}

/** Commits every registered draft. */
export function commitPendingEdits(): void {
  for (const commit of Array.from(committers)) commit()
}
