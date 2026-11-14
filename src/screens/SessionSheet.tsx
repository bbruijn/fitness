import { useEffect, useState } from 'react'
import { duration, int, longDate, num } from '../lib/format'
import { sessionDuration, sessionSets, sessionVolume } from '../lib/stats'
import { useStore } from '../lib/store'
import type { Session } from '../lib/types'
import { IconTrash } from '../ui/icons'
import { Press } from '../ui/Press'
import { Sheet } from '../ui/Sheet'

/** Everything logged in one past workout. */
export function SessionSheet({ session, onClose }: { session: Session | null; onClose: () => void }) {
  const deleteSession = useStore((s) => s.deleteSession)
  const [confirm, setConfirm] = useState(false)
  // Keep the last session around so the content doesn't vanish while the sheet slides away.
  const [shown, setShown] = useState(session)
  useEffect(() => {
    if (session) {
      setShown(session)
      setConfirm(false)
    }
  }, [session])
  const s = session ?? shown

  return (
    <Sheet open={!!session} onClose={onClose} title={s ? `${s.dayName}${s.focus ? ` · ${s.focus}` : ''}` : ''}>
      {s && (
        <>
          <p className="muted" style={{ textTransform: 'capitalize' }}>
            {longDate(s.finishedAt)}
          </p>
          <div className="row" style={{ flexWrap: 'wrap', gap: 8, margin: '12px 0 18px' }}>
            <span className="pill">{duration(sessionDuration(s))}</span>
            <span className="pill">{sessionSets(s)} sets</span>
            <span className="pill">{int(sessionVolume(s))} kg getild</span>
          </div>
          <div className="glass list">
            {s.exercises.map((e) => (
              <div key={e.id} className="list__row" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 8 }}>
                <div className="list__title">{e.name}</div>
                <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
                  {e.sets.map((set, i) => (
                    <span key={i} className="pill">
                      {num(set.weight)} × {set.reps}
                    </span>
                  ))}
                </div>
                {e.note && <div className="list__sub">“{e.note}”</div>}
              </div>
            ))}
          </div>
          <Press
            className="btn btn--ghost btn--danger btn--block"
            style={{ marginTop: 16 }}
            onClick={() => {
              if (!confirm) return setConfirm(true)
              deleteSession(s.id)
              onClose()
            }}
          >
            <IconTrash size={18} /> {confirm ? 'Zeker weten? Tik nogmaals' : 'Training verwijderen'}
          </Press>
        </>
      )}
    </Sheet>
  )
}
