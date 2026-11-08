import { useState } from 'react'
import { positionTarget } from '../model/targets'
import type { Profile } from '../model/types'
import type { Lock } from './TunerScreen'

interface Props {
  profile: Profile
  lock: Lock | null
  onLock: (lock: Lock) => void
}

function stopLabel(count: number, stop: number): string {
  if (count < 2) return ''
  return stop === 0 ? ' half' : ' full'
}

/** 14 small string chips; tapping one opens a picker of that string's positions. */
export function StringStrip({ profile, lock, onLock }: Props) {
  const [picking, setPicking] = useState<number | null>(null)
  const string = profile.strings.find((s) => s.number === picking)

  function choose(l: Lock) {
    setPicking(null)
    onLock(l)
  }

  return (
    <>
      <div className="flex flex-wrap justify-center gap-1">
        {profile.strings.map((s) => (
          <button
            key={s.number}
            aria-label={`String ${s.number}, ${s.openNote}`}
            onClick={() => setPicking(s.number)}
            className={`w-[11.5%] rounded-md py-1.5 text-center text-sm leading-tight ${
              lock?.string === s.number ? 'bg-[#35c46f] font-bold text-[#06170d]' : 'bg-[#1d232a] text-[#94a0ad]'
            }`}
          >
            <span className="block text-[10px] opacity-70">{s.number}</span>
            {s.openNote.replace(/\d+$/, '')}
          </button>
        ))}
      </div>
      {string && (
        <div role="dialog" aria-label={`String ${string.number} positions`} className="fixed inset-0 z-10 flex items-end bg-black/60">
          <div className="mx-auto max-h-[80vh] w-full max-w-105 overflow-y-auto rounded-t-2xl bg-[#1d232a] p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-bold">String {string.number}</h2>
              <button onClick={() => setPicking(null)} className="rounded-lg px-3 py-2 text-[#94a0ad]">
                Close
              </button>
            </div>
            <div className="grid gap-2">
              <button
                onClick={() => choose({ string: string.number, change: null, stop: 0 })}
                className="rounded-xl bg-[#0f1216] p-3 text-left"
              >
                Open → {positionTarget(profile, string.number, null).note}
              </button>
              {string.changes.flatMap((c) =>
                c.stops.map((_, i) => (
                  <button
                    key={`${c.control}-${i}`}
                    onClick={() => choose({ string: string.number, change: c.control, stop: i })}
                    className="rounded-xl bg-[#0f1216] p-3 text-left"
                  >
                    {c.control}
                    {stopLabel(c.stops.length, i)}
                    {c.requires ? ` with ${c.requires.join(' + ')}` : ''} → {positionTarget(profile, string.number, c.control, i).note}
                  </button>
                )),
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
