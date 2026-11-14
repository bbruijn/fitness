/**
 * Sound, vibration and keep-awake. All of it is best-effort: iOS has no Vibration API, mutes Web Audio
 * with the silent switch and suspends timers when the screen locks — so the UI never depends on these.
 */

/** A short two-tone chime as a WAV data URI. An <audio> element is used because, unlike Web Audio, it is not muted by the iOS silent switch. */
function chime(): string {
  const rate = 22050
  const tones = [
    { f: 880, d: 0.13 },
    { f: 1318.5, d: 0.26 },
  ]
  const total = tones.reduce((n, t) => n + Math.floor(t.d * rate), 0)
  const buf = new ArrayBuffer(44 + total * 2)
  const v = new DataView(buf)
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)))
  str(0, 'RIFF')
  v.setUint32(4, 36 + total * 2, true)
  str(8, 'WAVEfmt ')
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true)
  v.setUint16(22, 1, true)
  v.setUint32(24, rate, true)
  v.setUint32(28, rate * 2, true)
  v.setUint16(32, 2, true)
  v.setUint16(34, 16, true)
  str(36, 'data')
  v.setUint32(40, total * 2, true)
  let o = 44
  for (const t of tones) {
    const n = Math.floor(t.d * rate)
    for (let i = 0; i < n; i++) {
      const env = Math.min(1, i / 200) * Math.min(1, (n - i) / (n * 0.6))
      v.setInt16(o, Math.sin((2 * Math.PI * t.f * i) / rate) * env * 0.5 * 32767, true)
      o += 2
    }
  }
  let bin = ''
  new Uint8Array(buf).forEach((b) => (bin += String.fromCharCode(b)))
  return `data:audio/wav;base64,${btoa(bin)}`
}

let audio: HTMLAudioElement | null = null
let unlocked = false

/** Call from a tap: browsers only allow sound after a user gesture. */
export function unlockAudio(): void {
  if (unlocked) return
  unlocked = true
  try {
    audio = new Audio(chime())
    audio.preload = 'auto'
    audio.volume = 0
    void audio
      .play()
      .then(() => {
        audio?.pause()
        if (audio) {
          audio.currentTime = 0
          audio.volume = 1
        }
      })
      .catch(() => {
        if (audio) audio.volume = 1
      })
  } catch {
    audio = null
  }
}

export function playChime(): void {
  if (!audio) return
  try {
    audio.currentTime = 0
    void audio.play().catch(() => {})
  } catch {
    /* ignore */
  }
}

export function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* unsupported */
  }
}

let lock: WakeLockSentinel | null = null
let wanted = false

async function acquire(): Promise<void> {
  if (!wanted || lock || document.visibilityState !== 'visible' || !('wakeLock' in navigator)) return
  try {
    lock = await navigator.wakeLock.request('screen')
    lock.addEventListener('release', () => (lock = null))
  } catch {
    /* refused, e.g. low-power mode */
  }
}

// The lock is dropped whenever the page is hidden, so take it again when it comes back.
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => void acquire())

/** Keep the screen on while a workout is open. */
export function keepAwake(on: boolean): void {
  wanted = on
  if (on) void acquire()
  else {
    void lock?.release().catch(() => {})
    lock = null
  }
}
