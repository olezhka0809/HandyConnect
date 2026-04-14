import { useState } from 'react'
import { supabase } from '../../../supabase'
import {
  X, CalendarClock, CheckCircle, Clock, Loader2, AlertCircle,
} from 'lucide-react'

export default function ReworkConfirmModal({
  dispute,
  fmtDeadline,
  availSlots,
  todayStr,
  onClose,
  onSuccess,
}) {
  const [mode,      setMode]      = useState('idle')   // idle | propose | saving
  const [propDate,  setPropDate]  = useState('')
  const [propTime,  setPropTime]  = useState('')
  const [error,     setError]     = useState(null)

  const toMins = t => { const [h, m] = t.split(':'); return parseInt(h) * 60 + parseInt(m) }
  const nowMins = new Date().getHours() * 60 + new Date().getMinutes()

  const slots = availSlots(propDate)

  const handleConfirm = async () => {
    setMode('saving')
    setError(null)
    try {
      const { data, error: err } = await supabase.rpc('client_confirm_rework_date', {
        p_dispute_id: dispute.id,
        p_action:     'confirm',
      })
      if (err) throw err
      if (data?.error) throw new Error(data.error)
      onSuccess()
    } catch (e) {
      setError(e.message)
      setMode('idle')
    }
  }

  const handlePropose = async () => {
    if (!propDate) { setError('Selectează o dată.'); return }
    setMode('saving')
    setError(null)
    try {
      const { data, error: err } = await supabase.rpc('client_confirm_rework_date', {
        p_dispute_id:    dispute.id,
        p_action:        'propose',
        p_proposed_date: propDate,
        p_proposed_time: propTime || null,
      })
      if (err) throw err
      if (data?.error) throw new Error(data.error)
      onSuccess()
    } catch (e) {
      setError(e.message)
      setMode('idle')
    }
  }

  const isSaving = mode === 'saving'
  const taskTitle = dispute.task?.title ?? 'Task'
  const handymanName = dispute.handyman
    ? `${dispute.handyman.first_name ?? ''} ${dispute.handyman.last_name ?? ''}`.trim()
    : 'Handyman'

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-orange-500" />
            <h2 className="font-bold text-gray-800">Dată Relucrare</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Task info */}
          <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-0.5">
            <p className="text-xs text-gray-400 uppercase font-semibold tracking-wide">Task</p>
            <p className="text-sm font-bold text-gray-800 leading-tight">{taskTitle}</p>
            <p className="text-xs text-gray-500">{handymanName}</p>
          </div>

          {/* Data propusă de meșter */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1.5">Data propusă de meșter</p>
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
              <CalendarClock className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <p className="text-sm font-semibold text-orange-800">
                {dispute.rework_deadline ? fmtDeadline(dispute.rework_deadline) : 'Dată necomunicată'}
              </p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {/* ── Formular de propunere altă dată ── */}
          {mode === 'propose' && (
            <div className="space-y-3 border border-orange-200 rounded-xl p-4 bg-orange-50/40">
              <p className="text-xs font-bold text-orange-700 uppercase tracking-wide">
                Propune o altă dată
              </p>

              {/* Date picker */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Data *</label>
                <input
                  type="date"
                  value={propDate}
                  min={todayStr}
                  onChange={e => {
                    const d = e.target.value
                    setPropDate(d)
                    if (d === todayStr && propTime && toMins(propTime) <= nowMins) setPropTime('')
                  }}
                  className="w-full px-3 py-2.5 border border-orange-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              {/* Time slots */}
              {propDate && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                    Ora <span className="font-normal text-gray-400">(opțional)</span>
                  </label>
                  {slots.length === 0 ? (
                    <p className="text-xs text-orange-600 italic">
                      Nu mai sunt ore disponibile azi — alege altă zi.
                    </p>
                  ) : (
                    <div className="grid grid-cols-5 gap-1.5">
                      {slots.map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setPropTime(t === propTime ? '' : t)}
                          className={`py-2 rounded-lg text-xs font-semibold border transition-all
                            ${propTime === t
                              ? 'bg-orange-500 text-white border-orange-500'
                              : 'bg-white border-orange-200 text-orange-700 hover:bg-orange-100'
                            }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Propose actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setMode('idle'); setError(null) }}
                  disabled={isSaving}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition font-medium"
                >
                  Înapoi
                </button>
                <button
                  onClick={handlePropose}
                  disabled={isSaving || !propDate}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 disabled:opacity-50 transition"
                >
                  {isSaving
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <><CalendarClock className="w-4 h-4" /> Trimite propunerea</>
                  }
                </button>
              </div>
            </div>
          )}

          {/* ── Butoane principale (idle) ── */}
          {mode !== 'propose' && (
            <div className="flex gap-3">
              <button
                onClick={handleConfirm}
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 disabled:opacity-50 transition"
              >
                {isSaving
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><CheckCircle className="w-4 h-4" /> Confirmă data</>
                }
              </button>
              <button
                onClick={() => { setMode('propose'); setError(null) }}
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-orange-300 text-orange-700 bg-white rounded-xl font-bold text-sm hover:bg-orange-50 transition"
              >
                <CalendarClock className="w-4 h-4" /> Altă dată
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
