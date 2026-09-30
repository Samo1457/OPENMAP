// Outside src/core the AD-2 bans do not apply, and jumpTo is the allowed camera call.
export function allowed(map: { jumpTo(options: object): void }) {
  map.jumpTo({ zoom: 4 })
  return Math.random() + Date.now() + performance.now()
}
