import { useState, useEffect } from 'react'
import { X, Send, DollarSign, Calendar, AlertCircle, Clock, Sparkles, Loader2, Copy, CheckCircle } from 'lucide-react'

function RefBadge({ id }) {
  const [copied, setCopied] = useState(false)
  if (!id) return null
  const ref = '#' + id.replace(/-/g, '').slice(0, 7).toUpperCase()
  const copy = (e) => { e.stopPropagation(); navigator.clipboard.writeText(ref).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500) }
  return (
    <button onClick={copy} title="Copiază referința"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 hover:bg-blue-50 hover:border-blue-200 border border-gray-200 text-gray-500 hover:text-blue-600 rounded-lg text-xs font-mono font-bold transition-all">
      {copied ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
      {copied ? <span className="text-green-600">Copiat!</span> : ref}
    </button>
  )
}
import { supabase } from '../../supabase'

const API_URL = import.meta.env.VITE_API_URL ?? ''

const DURATION_SLOTS = (() => {
  const slots = []
  for (let m = 15; m <= 480; m += 15) {
    const h = Math.floor(m / 60)
    const min = m % 60
    const label = h > 0
      ? (min > 0 ? `${h}h ${min}min` : `${h}h`)
      : `${min}min`
    slots.push({ value: m, label })
  }
  return slots
})()
import TaskPhoto from '../../components/TaskPhoto'

const ALL_SLOTS = [
  '07:00','07:30','08:00','08:30','09:00','09:30',
  '10:00','10:30','11:00','11:30','12:00','12:30',
  '13:00','13:30','14:00','14:30','15:00','15:30',
  '16:00','16:30','17:00','17:30','18:00','18:30','19:00',
]

export default function TaskRequestModal({
  isOpen,
  task,
  mode,
  onClose,
  onSubmit,
  form,
  setForm,
  sending,
  requireDateTime = false,
}) {
  const [aiLoading,     setAiLoading]     = useState(false)
  const [aiReason,      setAiReason]      = useState(null)
  const [mySlots,       setMySlots]       = useState(null)
  const [slotsLoading,  setSlotsLoading]  = useState(false)

  // Trebuie declarat ÎNAINTE de useEffect ca să nu fie în temporal dead zone
  const isMessageMode = mode === 'message'

  const todayStr = new Date().toISOString().split('T')[0]
  const nowMins  = new Date().getHours() * 60 + new Date().getMinutes()
  const toMins   = t => { const [h, m] = t.split(':'); return parseInt(h) * 60 + parseInt(m) }

  // Calculează durata noului task din form sau fallback
  const newTaskDur = form.estimated_duration_minutes || 60
  const fmtDurationLabel = (m) => {
    if (m === '' || m == null) return ''
    const mins = parseInt(m, 10) || 0
    if (mins === 0) return ''
    const h = Math.floor(mins / 60)
    const mm = mins % 60
    return h > 0 ? (mm > 0 ? `${h}h ${mm}min` : `${h}h`) : `${mm}min`
  }

  // Încarcă sloturile libere ale handymanului când se schimbă data
  useEffect(() => {
    if (!form.available_date || isMessageMode) { setMySlots(null); return }
    let cancelled = false
    const load = async () => {
      setSlotsLoading(true)
      setMySlots(null)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || cancelled) return

        const DAY_KEY = ['sun','mon','tue','wed','thu','fri','sat']
        const dayKey = DAY_KEY[new Date(form.available_date + 'T00:00:00').getDay()]

        const [schedRes, tasksRes, bookingsRes] = await Promise.all([
          supabase.from('handyman_schedule').select('schedule,travel_buffer_min').eq('handyman_id', user.id).maybeSingle(),
          supabase.from('tasks').select('scheduled_time, estimated_duration_minutes, scheduled_end_time')
            .eq('handyman_id', user.id).eq('scheduled_date', form.available_date)
            .in('status', ['assigned','in_progress','delayed']).neq('id', task?.id || ''),
          supabase.from('bookings').select('scheduled_time, handyman_services(estimated_duration)')
            .eq('handyman_id', user.id).eq('scheduled_date', form.available_date)
            .in('status', ['upcoming','confirmed','accepted']),
        ])

        if (cancelled) return

        const sched = schedRes.data
        const buffer = sched?.travel_buffer_min ?? 15
        const cd = t => { if (!t) return null; const [h, m] = t.split(':').map(Number); return h * 60 + m }

        // Determină intervalul de lucru din schedule
        let workStart = 7 * 60, workEnd = 21 * 60
        let schedSlots = ALL_SLOTS
        if (sched?.schedule?.[dayKey]) {
          const daySlots = sched.schedule[dayKey]
          if (!daySlots?.length) { setMySlots([]); setSlotsLoading(false); return }
          workStart = Math.min(...daySlots.map(s => cd(s.from)))
          workEnd   = Math.max(...daySlots.map(s => cd(s.to)))
          schedSlots = ALL_SLOTS.filter(t => {
            const m = cd(t)
            return daySlots.some(s => m >= cd(s.from) && m < cd(s.to))
          })
        }

        // Intervale blocate
        const busy = []
        ;(tasksRes.data ?? []).forEach(t => {
          if (!t.scheduled_time) return
          const s = cd(t.scheduled_time), dur = t.estimated_duration_minutes || 60
          busy.push({ start: s, end: s + dur })
        })
        ;(bookingsRes.data ?? []).forEach(b => {
          if (!b.scheduled_time) return
          const s = cd(b.scheduled_time), dur = parseInt(b.handyman_services?.estimated_duration ?? '') || 60
          busy.push({ start: s, end: s + dur })
        })

        const todayNow = form.available_date === todayStr ? nowMins : 0

        const free = schedSlots.filter(t => {
          const slotStart = cd(t)
          const slotEnd = slotStart + newTaskDur
          if (slotStart <= todayNow) return false
          if (slotEnd > workEnd) return false
          return !busy.some(b => slotStart + newTaskDur + buffer > b.start && slotStart < b.end + buffer)
        })

        setMySlots(free)
      } finally {
        if (!cancelled) setSlotsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [form.available_date, newTaskDur, isMessageMode, task?.id])

  if (!isOpen || !task) return null

  const availableSlots = mySlots ?? (
    form.available_date === todayStr
      ? ALL_SLOTS.filter(t => toMins(t) > nowMins)
      : ALL_SLOTS
  )

  async function estimateDuration() {
    setAiLoading(true)
    setAiReason(null)
    try {
      const body = new FormData()
      body.append('title', task.title || '')
      body.append('description', task.description || '')
      body.append('category', task.category_name || task.category?.name || '')
      const res = await fetch(`${API_URL}/api/ai/estimate-duration`, { method: 'POST', body })
      const json = await res.json()
      if (json.ok) {
        const mins = json.data.duration_minutes
        setForm(prev => ({ ...prev, estimated_duration_minutes: mins, estimated_duration: fmtDurationLabel(mins) }))
        setAiReason(json.data.reason)
      }
    } catch { /* ignore */ } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-800">
              {isMessageMode ? 'Mesaj pentru client' : task.budget ? 'Negociază oferta' : 'Propune prețul tău'}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-sm text-gray-500">{task.title}</p>
              <RefBadge id={task.id} />
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Task summary */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <TaskPhoto photos={task.photos} category={task.category_name} className="w-10 h-10 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-800 text-sm">{task.title}</p>
                <p className="text-xs text-gray-500">{task.client_name} • {task.city}</p>
              </div>
            </div>
            {task.budget
              ? <p className="text-sm text-gray-600">Buget client: <strong>{Number(task.budget).toLocaleString('ro-RO')} RON</strong></p>
              : !isMessageMode && <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-1.5">Clientul nu a specificat un buget — tu propui primul prețul.</p>
            }
            {task.scheduled_date && (
              <div className="flex items-center gap-2 mt-2 text-sm text-blue-700 bg-blue-50 rounded-lg px-3 py-1.5">
                <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                <span>
                  Data dorită de client: <strong>
                    {new Date(task.scheduled_date + 'T00:00:00').toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })}
                    {task.scheduled_time && ` la ${task.scheduled_time}`}
                  </strong>
                </span>
              </div>
            )}
          </div>

          {requireDateTime && !isMessageMode && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-xs text-red-800">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span><strong>Slotul clientului este ocupat în programul tău.</strong> Trebuie să propui o dată și oră diferită din programul tău liber.</span>
            </div>
          )}
          {!requireDateTime && task.scheduled_date && !isMessageMode && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-800">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>Propune data când ești disponibil. Clientul va putea alege dintre disponibilitățile tale.</span>
            </div>
          )}

          {/* Price */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">Prețul tău (RON) *</label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number"
                value={form.proposed_price}
                onChange={(e) => setForm(prev => ({ ...prev, proposed_price: e.target.value }))}
                placeholder="Ex: 250"
                className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* (removed free-text duration input) */}

          {/* Date picker */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">
              Disponibil pe {requireDateTime && <span className="text-red-500">* (obligatoriu)</span>}
            </label>
            <input
              type="date"
              value={form.available_date}
              min={todayStr}
              onChange={(e) => {
                const d = e.target.value
                setForm(prev => ({
                  ...prev,
                  available_date: d,
                  available_time: d === todayStr && prev.available_time && toMins(prev.available_time) <= nowMins
                    ? ''
                    : prev.available_time,
                }))
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Time slots — filtrate după programul handymanului */}
          {form.available_date && !isMessageMode && (
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1">Ora disponibilă</label>
              {mySlots !== null && (
                <p className="text-xs text-gray-400 mb-2">
                  {mySlots.length > 0
                    ? 'Ore libere din programul tău (ținând cont de buffer și joburi existente)'
                    : ''}
                </p>
              )}
              {slotsLoading ? (
                <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Se verifică programul tău...
                </div>
              ) : availableSlots.length === 0 ? (
                <p className="text-xs text-orange-600 italic bg-orange-50 rounded-lg px-3 py-2">
                  Nu ai ore libere în această zi (ținând cont de joburi și timp de deplasare). Alege altă zi.
                </p>
              ) : (
                <div className="grid grid-cols-5 gap-1.5">
                  {availableSlots.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, available_time: t === prev.available_time ? '' : t }))}
                      className={`py-2 rounded-lg text-xs font-semibold border transition-all
                        ${form.available_time === t
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-blue-400 hover:text-blue-600'
                        }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Duration */}
          {!isMessageMode && (
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                Durată estimată *
              </label>
              <div className="flex gap-2">
                <select
                  value={form.estimated_duration_minutes || ''}
                  onChange={e => {
                    const val = e.target.value ? parseInt(e.target.value, 10) : ''
                    setForm(prev => ({ ...prev, estimated_duration_minutes: val, estimated_duration: fmtDurationLabel(val) }))
                  }}
                  className="flex-1 px-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                >
                  <option value="">— alege durata —</option>
                  {DURATION_SLOTS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={estimateDuration}
                  disabled={aiLoading}
                  className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 border border-purple-200 text-purple-700 rounded-xl text-xs font-semibold hover:bg-purple-100 transition disabled:opacity-60 whitespace-nowrap"
                >
                  {aiLoading
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Sparkles className="w-3.5 h-3.5" />}
                  AI
                </button>
              </div>
              {aiReason && (
                <p className="text-xs text-purple-600 mt-1.5 italic">{aiReason}</p>
              )}
            </div>
          )}

          {/* Message */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">
              {isMessageMode ? 'Mesaj către client' : 'Mesaj de negociere'}
            </label>
            <textarea
              value={form.message}
              onChange={(e) => setForm(prev => ({ ...prev, message: e.target.value }))}
              placeholder={isMessageMode ? 'Scrie un mesaj pentru client...' : 'Prezintă-te și argumentează oferta ta...'}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
          >
            Anulează
          </button>
          <button
            onClick={onSubmit}
            disabled={
              !form.proposed_price ||
              (!isMessageMode && !form.estimated_duration_minutes) ||
              (requireDateTime && (!form.available_date || !form.available_time)) ||
              sending
            }
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {sending ? 'Se trimite...' : isMessageMode ? 'Trimite mesaj' : 'Trimite negocierea'}
          </button>
        </div>
      </div>
    </div>
  )
}
