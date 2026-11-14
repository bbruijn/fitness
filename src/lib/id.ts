/** `crypto.randomUUID` only exists in secure contexts; fall back so the app also runs over plain http on a LAN. */
export const uid = (): string =>
  crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36)
