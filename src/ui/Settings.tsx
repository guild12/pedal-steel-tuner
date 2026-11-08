import { useEffect, useState } from 'react'
import { exportProfile } from '../model/exportProfile'
import { frenchNoteTable } from '../model/targets'
import type { Profile, StringChange, StringConfig, TargetRule } from '../model/types'
import type { Shown } from '../pitch/display'
import { DropWizard } from './DropWizard'

interface Props {
  profile: Profile
  shown: Shown | null
  onChange: (p: Profile) => void
  onClose: () => void
}

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
const field = 'rounded-lg bg-[#0e1114] p-2 text-white'
const btn = 'rounded-lg bg-[#2a323b] px-3 py-2 font-bold'

function num(v: string, fallback = 0): number {
  const n = Number(v)
  return v.trim() !== '' && Number.isFinite(n) ? n : fallback
}

/** Keeps what the user is typing; calls `commit` only with a value `parse` accepts. */
function DraftInput<V>({
  value, parse, commit, label, className, ...rest
}: {
  value: V
  parse: (text: string) => V | null
  commit: (v: V) => void
  label: string
  className?: string
  type?: string
  step?: number
  min?: number
  max?: number
}) {
  const [draft, setDraft] = useState(String(value))
  useEffect(() => {
    setDraft((d) => (parse(d) === value ? d : String(value)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  const ok = parse(draft) !== null
  return (
    <input
      aria-label={label}
      aria-invalid={!ok}
      {...rest}
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value)
        const v = parse(e.target.value)
        if (v !== null) commit(v)
      }}
      className={`${className ?? ''} ${ok ? '' : 'outline outline-2 outline-red-500'}`}
    />
  )
}

const NOTE_RE = /^([A-G]#?)(-?\d+)$/
const parseNote = (t: string) => (NOTE_RE.test(t) ? t : null)
const parseRef = (t: string) => {
  const n = Number(t)
  return t.trim() !== '' && n >= 430 && n <= 450 ? n : null
}
const parseDrop = (t: string) => {
  const n = Number(t)
  return t.trim() !== '' && Number.isFinite(n) ? Math.min(30, Math.max(0, Math.round(n * 10) / 10)) : null
}

function RuleEditor({ label, rule, onChange }: { label: string; rule: TargetRule; onChange: (r: TargetRule) => void }) {
  return (
    <span className="flex items-center gap-1">
      <select
        aria-label={`${label} rule`}
        value={rule.kind}
        onChange={(e) => {
          const k = e.target.value
          onChange(k === 'cents' ? { kind: 'cents', cents: 0 } : { kind: k as 'up' | 'down' })
        }}
        className={field}
      >
        <option value="up">Pedals up</option>
        <option value="down">A+B down</option>
        <option value="cents">Fixed ¢</option>
      </select>
      {rule.kind === 'cents' && (
        <input
          aria-label={`${label} cents`}
          type="number"
          step={0.01}
          value={rule.cents}
          onChange={(e) => onChange({ kind: 'cents', cents: num(e.target.value) })}
          className={`${field} w-20`}
        />
      )}
    </span>
  )
}

export function Settings({ profile, shown, onChange, onClose }: Props) {
  const [measuring, setMeasuring] = useState(false)
  const set = (patch: Partial<Profile>) => onChange({ ...profile, ...patch })

  const setString = (number: number, f: (s: StringConfig) => StringConfig) =>
    set({ strings: profile.strings.map((s) => (s.number === number ? f(s) : s)) })
  const setChange = (number: number, i: number, f: (c: StringChange) => StringChange) =>
    setString(number, (s) => ({ ...s, changes: s.changes.map((c, j) => (j === i ? f(c) : c)) }))

  const doExport = () => {
    const url = URL.createObjectURL(new Blob([exportProfile(profile)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${profile.name || 'profile'}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    // Safari needs the URL alive for a moment after the click.
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="flex flex-col gap-4 text-left">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Settings</h1>
        <button onClick={onClose} className={btn}>Done</button>
      </div>

      <label className="flex flex-col gap-1 text-sm text-[#94a0ad]">
        Name
        <input value={profile.name} onChange={(e) => set({ name: e.target.value })} className={field} />
      </label>

      <div className="flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-1 text-sm text-[#94a0ad]">
          Cabinet drop
          <DraftInput
            label="Cabinet drop"
            type="number"
            step={0.1}
            value={profile.cabinetDrop}
            parse={parseDrop}
            commit={(cabinetDrop) => set({ cabinetDrop })}
            className={field}
          />
        </div>
        <button onClick={() => setMeasuring(true)} className={btn}>Measure</button>
      </div>
      {measuring && (
        <DropWizard
          profile={profile}
          shown={shown}
          onSave={(cabinetDrop) => {
            set({ cabinetDrop })
            setMeasuring(false)
          }}
          onCancel={() => setMeasuring(false)}
        />
      )}

      <div className="flex flex-col gap-1 text-sm text-[#94a0ad]">
        A reference (430–450)
        <DraftInput
          label="A reference (430–450)"
          type="number"
          step={0.1}
          value={profile.aRef}
          parse={parseRef}
          commit={(aRef) => set({ aRef })}
          className={field}
        />
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="font-bold">Note table (¢)</h2>
        <div className="grid grid-cols-4 gap-2">
          {NOTES.map((n) => (
            <label key={n} className="flex flex-col gap-1 text-xs text-[#94a0ad]">
              {n}
              <input
                aria-label={`Note ${n}`}
                type="number"
                step={0.01}
                value={profile.noteTable[n]}
                onChange={(e) => set({ noteTable: { ...profile.noteTable, [n]: num(e.target.value) } })}
                className={`${field} w-full`}
              />
            </label>
          ))}
        </div>
        <button onClick={() => set({ noteTable: frenchNoteTable() })} className={btn}>Reset to French values</button>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-bold">Copedent</h2>
        {profile.strings.map((s) => {
          const sl = `String ${s.number}`
          return (
            <div key={s.number} className="flex flex-col gap-2 rounded-xl bg-[#1d232a] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold">{sl}</span>
                <DraftInput
                  label={`${sl} open note`}
                  value={s.openNote}
                  parse={parseNote}
                  commit={(openNote) => setString(s.number, (x) => ({ ...x, openNote }))}
                  className={`${field} w-20`}
                />
                <RuleEditor
                  label={`${sl} open`}
                  rule={s.openTarget}
                  onChange={(r) => setString(s.number, (x) => ({ ...x, openTarget: r }))}
                />
              </div>
              {s.changes.map((c, i) => {
                const cl = `${sl} ${c.control}`
                return (
                  <div key={i} className="flex flex-col gap-2 rounded-lg bg-[#14181d] p-2">
                    <div className="flex items-center gap-2">
                      <select
                        aria-label={`${sl} change ${i + 1} control`}
                        value={c.control}
                        onChange={(e) => setChange(s.number, i, (x) => ({ ...x, control: e.target.value }))}
                        className={field}
                      >
                        {profile.controls.map((k) => (
                          <option key={k.id} value={k.id}>{k.id}</option>
                        ))}
                      </select>
                      <button
                        aria-label={`Remove ${cl}`}
                        onClick={() => setString(s.number, (x) => ({ ...x, changes: x.changes.filter((_, j) => j !== i) }))}
                        className={btn}
                      >
                        Remove
                      </button>
                    </div>
                    {c.stops.map((st, k) => (
                      <div key={k} className="flex flex-wrap items-center gap-2">
                        <input
                          aria-label={`${cl} stop ${k + 1} semitones`}
                          type="number"
                          step={1}
                          value={st.semitones}
                          onChange={(e) =>
                            setChange(s.number, i, (x) => ({
                              ...x,
                              stops: x.stops.map((y, j) => (j === k ? { ...y, semitones: num(e.target.value) } : y)),
                            }))
                          }
                          className={`${field} w-16`}
                        />
                        <RuleEditor
                          label={`${cl} stop ${k + 1}`}
                          rule={st.target}
                          onChange={(r) =>
                            setChange(s.number, i, (x) => ({
                              ...x,
                              stops: x.stops.map((y, j) => (j === k ? { ...y, target: r } : y)),
                            }))
                          }
                        />
                        {c.stops.length > 1 && (
                          <button
                            aria-label={`Remove stop ${k + 1} from ${cl}`}
                            onClick={() => setChange(s.number, i, (x) => ({ ...x, stops: x.stops.filter((_, j) => j !== k) }))}
                            className={btn}
                          >
                            −
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      aria-label={`Add stop to ${cl}`}
                      onClick={() =>
                        setChange(s.number, i, (x) => ({
                          ...x,
                          stops: [...x.stops, { semitones: 0, target: { kind: 'up' } }],
                        }))
                      }
                      className={btn}
                    >
                      Add stop
                    </button>
                  </div>
                )
              })}
              <button
                aria-label={`Add change to ${sl}`}
                onClick={() =>
                  setString(s.number, (x) => ({
                    ...x,
                    changes: [
                      ...x.changes,
                      { control: profile.controls[0]?.id ?? '', stops: [{ semitones: 0, target: { kind: 'up' } }] },
                    ],
                  }))
                }
                className={btn}
              >
                Add change
              </button>
            </div>
          )
        })}
      </section>

      <button onClick={doExport} className={`${btn} bg-green-500 text-black`}>Export</button>
    </div>
  )
}
