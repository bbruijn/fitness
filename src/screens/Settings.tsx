import { useRef, useState } from 'react'
import { useStore } from '../lib/store'
import { Press } from '../ui/Press'
import { Sheet } from '../ui/Sheet'
import { Stepper } from '../ui/Stepper'
import { Segmented, Toggle } from '../ui/Toggle'

const Row = ({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) => (
  <div className="list__row">
    <div className="list__main">
      <div className="list__title">{title}</div>
      {sub && <div className="list__sub">{sub}</div>}
    </div>
    {children}
  </div>
)

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const settings = useStore((s) => s.settings)
  const count = useStore((s) => s.sessions.length)
  const { updateSettings, exportData, importData, loadDemo, resetAll } = useStore.getState()
  const file = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')
  const [confirm, setConfirm] = useState<'demo' | 'reset' | null>(null)

  const backup = async () => {
    const name = `volt-backup-${new Date().toISOString().slice(0, 10)}.json`
    const blob = new Blob([exportData()], { type: 'application/json' })
    // On a phone the share sheet is the natural way to put a file in Files / iCloud.
    const shareFile = new File([blob], name, { type: 'application/json' })
    if (navigator.canShare?.({ files: [shareFile] })) {
      try {
        await navigator.share({ files: [shareFile] })
        return
      } catch {
        return // cancelled
      }
    }
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = name
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const restore = async (f: File | undefined) => {
    if (!f) return
    try {
      importData(await f.text())
      setMessage('Back-up teruggezet.')
    } catch (err) {
      setMessage(err instanceof Error && err.message.startsWith('Dit') ? err.message : 'Dit bestand kon niet worden gelezen.')
    }
  }

  return (
    <Sheet
      open={open}
      onClose={() => {
        setConfirm(null)
        setMessage('')
        onClose()
      }}
      title="Instellingen"
    >
      <span className="label">Training</span>
      <div className="glass list">
        <div className="list__row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
          <div className="list__main">
            <div className="list__title">Stapgrootte gewicht</div>
            <div className="list__sub">Zoveel gaat er per tik op − / + bij of af.</div>
          </div>
          <Segmented
            id="step"
            value={settings.weightStep}
            onChange={(weightStep) => updateSettings({ weightStep })}
            options={[
              { value: 1, label: '1 kg' },
              { value: 2.5, label: '2,5 kg' },
              { value: 5, label: '5 kg' },
            ]}
          />
        </div>
        <div className="list__row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
          <div className="list__title">Weekdoel</div>
          <Stepper size="sm" label="Weekdoel" unit="× per week" value={settings.weeklyGoal} step={1} min={1} max={7} onChange={(weeklyGoal) => updateSettings({ weeklyGoal })} />
        </div>
        <Row title="Automatisch verzwaren" sub="Alle herhalingen gehaald? Dan volgende keer één stap zwaarder.">
          <Toggle label="Automatisch verzwaren" checked={settings.autoProgress} onChange={(autoProgress) => updateSettings({ autoProgress })} />
        </Row>
        <Row title="Geluid" sub="Kort signaal als de rust voorbij is.">
          <Toggle label="Geluid" checked={settings.sound} onChange={(sound) => updateSettings({ sound })} />
        </Row>
        <Row title="Trillen" sub="Waar het toestel dat ondersteunt.">
          <Toggle label="Trillen" checked={settings.haptics} onChange={(haptics) => updateSettings({ haptics })} />
        </Row>
      </div>

      <span className="label" style={{ marginTop: 22 }}>
        Gegevens
      </span>
      <p className="muted" style={{ margin: '0 4px 10px', fontSize: 14 }}>
        Alles staat alleen op dit toestel ({count} {count === 1 ? 'training' : 'trainingen'}). Maak af en toe een back-up.
      </p>
      <div className="stack">
        <Press className="btn btn--block" onClick={backup}>
          Back-up bewaren
        </Press>
        <Press className="btn btn--block" onClick={() => file.current?.click()}>
          Back-up terugzetten
        </Press>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            void restore(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <Press
          className="btn btn--ghost btn--block"
          onClick={() => {
            if (count > 0 && confirm !== 'demo') return setConfirm('demo')
            loadDemo()
            setConfirm(null)
            setMessage('Voorbeelddata geladen.')
          }}
        >
          {confirm === 'demo' ? 'Dit vervangt je trainingen — tik nogmaals' : 'Voorbeelddata laden'}
        </Press>
        <Press
          className="btn btn--ghost btn--danger btn--block"
          onClick={() => {
            if (confirm !== 'reset') return setConfirm('reset')
            resetAll()
            setConfirm(null)
            setMessage('Alles is gewist.')
          }}
        >
          {confirm === 'reset' ? 'Alles wissen? Tik nogmaals' : 'Alles wissen'}
        </Press>
      </div>
      {message && (
        <p role="status" className="muted" style={{ marginTop: 14, textAlign: 'center' }}>
          {message}
        </p>
      )}
    </Sheet>
  )
}
