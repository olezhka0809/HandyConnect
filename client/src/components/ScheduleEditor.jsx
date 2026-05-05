import { useState } from 'react'
import { Plus, X, Clock, Car, ChevronDown, ChevronUp } from 'lucide-react'

// ─── constants ────────────────────────────────────────────────────────────────

const DAYS = [
  { key: 'mon', label: 'Luni',      short: 'L' },
  { key: 'tue', label: 'Marți',     short: 'Ma' },
  { key: 'wed', label: 'Miercuri',  short: 'Mi' },
  { key: 'thu', label: 'Joi',       short: 'J' },
  { key: 'fri', label: 'Vineri',    short: 'V' },
  { key: 'sat', label: 'Sâmbătă',   short: 'S' },
  { key: 'sun', label: 'Duminică',  short: 'D' },
]

const BUFFER_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 oră' },
  { value: 90, label: '1.5 ore' },
]

const TIME_OPTIONS = []
for (let h = 6; h <= 23; h++) {
  for (const m of [0, 30]) {
    const hh = String(h).padStart(2, '0')
    const mm = String(m).padStart(2, '0')
    TIME_OPTIONS.push(`${hh}:${mm}`)
  }
}

const EMPTY_SCHEDULE = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] }

// ─── helpers ─────────────────────────────────────────────────────────────────

function timeToMin(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minToTime(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function totalDayMinutes(slots) {
  return slots.reduce((acc, s) => acc + Math.max(0, timeToMin(s.to) - timeToMin(s.from)), 0)
}

function formatMinutes(min) {
  if (min <= 0) return '0 ore'
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} ${h === 1 ? 'oră' : 'ore'}`
  return `${h}h ${m}m`
}

// ─── SlotRow ─────────────────────────────────────────────────────────────────

function SlotRow({ slot, index, dayKey, onChange, onRemove, showRemove }) {
  const fromMin = timeToMin(slot.from)
  const toMin   = timeToMin(slot.to)
  const isValid = toMin > fromMin

  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg border ${isValid ? 'border-gray-200 bg-gray-50' : 'border-red-200 bg-red-50'}`}>
      <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />

      <select
        value={slot.from}
        onChange={e => onChange(index, 'from', e.target.value)}
        className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
      </select>

      <span className="text-gray-400 text-sm flex-shrink-0">→</span>

      <select
        value={slot.to}
        onChange={e => onChange(index, 'to', e.target.value)}
        className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {TIME_OPTIONS.filter(t => timeToMin(t) > timeToMin(slot.from)).map(t => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>

      {showRemove && (
        <button
          onClick={() => onRemove(index)}
          className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition flex-shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {!isValid && (
        <span className="text-xs text-red-500 flex-shrink-0">Oră invalidă</span>
      )}
    </div>
  )
}

// ─── DayRow ──────────────────────────────────────────────────────────────────

function DayRow({ day, slots, onToggle, onSlotChange, onAddSlot, onRemoveSlot }) {
  const isActive = slots.length > 0
  const totalMin = totalDayMinutes(slots)
  const [expanded, setExpanded] = useState(true)

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${isActive ? 'border-blue-200' : 'border-gray-200'}`}>
      {/* Day header */}
      <div
        className={`flex items-center gap-3 px-4 py-3 cursor-pointer select-none transition
          ${isActive ? 'bg-blue-50 hover:bg-blue-100' : 'bg-gray-50 hover:bg-blue-50'}`}
        onClick={() => {
          if (!isActive) onToggle(day.key)
          else setExpanded(e => !e)
        }}
      >
        {/* Toggle active/inactive */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(day.key) }}
          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition
            ${isActive ? 'bg-blue-600 border-blue-600' : 'border-gray-300 hover:border-blue-400'}`}
        >
          {isActive && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        <span className={`font-semibold text-sm flex-1 ${isActive ? 'text-blue-700' : 'text-gray-500'}`}>
          {day.label}
        </span>

        {isActive && (
          <span className="text-xs text-blue-500 font-medium mr-2">
            {slots.length} slot{slots.length !== 1 ? 'uri' : ''} · {formatMinutes(totalMin)}
          </span>
        )}
        {!isActive && (
          <span className="text-xs text-gray-400 mr-2 group-hover:text-blue-400">Liber · <span className="text-blue-400">apasă pentru a activa</span></span>
        )}

        {isActive && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(e2 => !e2) }}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Slots */}
      {isActive && expanded && (
        <div className="px-4 pb-3 pt-2 space-y-2 bg-white">
          {slots.map((slot, i) => (
            <SlotRow
              key={i}
              slot={slot}
              index={i}
              dayKey={day.key}
              onChange={(idx, field, val) => onSlotChange(day.key, idx, field, val)}
              onRemove={(idx) => onRemoveSlot(day.key, idx)}
              showRemove={slots.length > 1}
            />
          ))}
          <button
            onClick={() => onAddSlot(day.key)}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium mt-1 transition"
          >
            <Plus className="w-3.5 h-3.5" /> Adaugă interval
          </button>
        </div>
      )}
    </div>
  )
}

// ─── WeekPreview ─────────────────────────────────────────────────────────────

function WeekPreview({ schedule }) {
  const dayStart = 6 * 60  // 06:00
  const dayEnd   = 23 * 60 // 23:00
  const total    = dayEnd - dayStart

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
      <p className="text-xs font-bold text-gray-600 mb-3">Previzualizare program săptămânal</p>
      <div className="space-y-1.5">
        {DAYS.map(day => {
          const slots = schedule[day.key] ?? []
          const isActive = slots.length > 0
          return (
            <div key={day.key} className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-6 flex-shrink-0">{day.short}</span>
              <div className="flex-1 h-5 bg-gray-200 rounded-full relative overflow-hidden">
                {isActive
                  ? slots.map((slot, i) => {
                      const left  = ((timeToMin(slot.from) - dayStart) / total) * 100
                      const width = ((timeToMin(slot.to) - timeToMin(slot.from)) / total) * 100
                      return (
                        <div
                          key={i}
                          className="absolute top-0 h-full bg-blue-500 rounded-full"
                          style={{ left: `${Math.max(0, left)}%`, width: `${Math.min(width, 100 - left)}%` }}
                        />
                      )
                    })
                  : null}
              </div>
              <span className="text-[10px] text-gray-400 w-20 text-right flex-shrink-0">
                {isActive
                  ? slots.map(s => `${s.from}–${s.to}`).join(', ')
                  : 'Liber'}
              </span>
            </div>
          )
        })}
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
        <span className="text-xs text-gray-500">Total săptămânal</span>
        <span className="text-xs font-bold text-blue-600">
          {formatMinutes(DAYS.reduce((acc, d) => acc + totalDayMinutes(schedule[d.key] ?? []), 0))}
        </span>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// ScheduleEditor — componenta principală exportată
// Props:
//   schedule        — obiect {mon:[{from,to},...], ...}
//   travelBuffer    — INT minute
//   onChange        — fn(schedule, travelBuffer)
//   compact         — bool: ascunde preview (pentru onboarding)
// ═════════════════════════════════════════════════════════════════════════════
export default function ScheduleEditor({ schedule = EMPTY_SCHEDULE, travelBuffer = 30, onChange, compact = false }) {
  const sched = { ...EMPTY_SCHEDULE, ...schedule }

  function handleToggle(dayKey) {
    const newSched = { ...sched }
    if (newSched[dayKey].length > 0) {
      newSched[dayKey] = []
    } else {
      newSched[dayKey] = [{ from: '09:00', to: '17:00' }]
    }
    onChange(newSched, travelBuffer)
  }

  function handleSlotChange(dayKey, idx, field, val) {
    const newSched = { ...sched }
    const slots = [...newSched[dayKey]]
    slots[idx] = { ...slots[idx], [field]: val }
    newSched[dayKey] = slots
    onChange(newSched, travelBuffer)
  }

  function handleAddSlot(dayKey) {
    const newSched = { ...sched }
    const slots = [...newSched[dayKey]]
    const lastEnd = slots.length > 0 ? slots[slots.length - 1].to : '09:00'
    const newFrom = minToTime(Math.min(timeToMin(lastEnd) + 60, 22 * 60))
    const newTo   = minToTime(Math.min(timeToMin(newFrom) + 60, 23 * 60))
    slots.push({ from: newFrom, to: newTo })
    newSched[dayKey] = slots
    onChange(newSched, travelBuffer)
  }

  function handleRemoveSlot(dayKey, idx) {
    const newSched = { ...sched }
    const slots = [...newSched[dayKey]]
    slots.splice(idx, 1)
    newSched[dayKey] = slots
    onChange(newSched, travelBuffer)
  }

  const activeDays = DAYS.filter(d => sched[d.key].length > 0).length

  return (
    <div className="space-y-4">
      {/* Zile */}
      <div className="space-y-2">
        {DAYS.map(day => (
          <DayRow
            key={day.key}
            day={day}
            slots={sched[day.key] ?? []}
            onToggle={handleToggle}
            onSlotChange={handleSlotChange}
            onAddSlot={handleAddSlot}
            onRemoveSlot={handleRemoveSlot}
          />
        ))}
      </div>

      {activeDays === 0 && (
        <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          Selectează cel puțin o zi de lucru pentru a continua.
        </p>
      )}

      {/* Buffer transport */}
      <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
        <Car className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-700">Timp minim între joburi</p>
          <p className="text-xs text-gray-400">Rezervat pentru deplasare + pregătire</p>
        </div>
        <select
          value={travelBuffer}
          onChange={e => onChange(sched, Number(e.target.value))}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {BUFFER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Preview */}
      {!compact && <WeekPreview schedule={sched} />}
    </div>
  )
}

export { EMPTY_SCHEDULE, DAYS, timeToMin, minToTime }
