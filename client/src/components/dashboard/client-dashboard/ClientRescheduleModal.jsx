import { useState } from 'react'
import { supabase } from '../../../supabase'
import {
  X, CalendarClock, CheckCircle, XCircle, Calendar,
  Clock, MessageSquare, Loader2, RefreshCw
} from 'lucide-react'

const TIME_SLOTS = [
  '07:00','07:30','08:00','08:30','09:00','09:30',
  '10:00','10:30','11:00','11:30','12:00','12:30',
  '13:00','13:30','14:00','14:30','15:00','15:30',
  '16:00','16:30','17:00','17:30','18:00','18:30','19:00',
]

const TODAY_STR  = new Date().toISOString().split('T')[0]
const toMins     = t => { const [h, m] = t.split(':'); return parseInt(h) * 60 + parseInt(m) }
const availSlots = (date) => {
  if (date !== TODAY_STR) return TIME_SLOTS
  const nowMins = new Date().getHours() * 60 + new Date().getMinutes()
  return TIME_SLOTS.filter(t => toMins(t) > nowMins)
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ro-RO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}

/**
 * Props:
 *   request   – reschedule_requests row
 *   jobTitle  – titlul job-ului (task/booking)
 *   onClose   – () => void
 *   onUpdated – () => void  (refresh parent)
 */
export default function ClientRescheduleModal({ request, jobTitle, onClose, onUpdated }) {
  // mode: 'review' | 'counter' | 'done'
  const [mode,         setMode]         = useState('review')
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState(null)
  const [counterDate,  setCounterDate]  = useState('')
  const [counterTime,  setCounterTime]  = useState('')
  const [counterMsg,   setCounterMsg]   = useState('')

  const handleAccept = async () => {
    setSaving(true); setError(null)
    try {
      // 1. Mark reschedule as accepted
      await supabase.from('reschedule_requests')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .eq('id', request.id)

      // 2. Update job date/time
      const table = request.job_type === 'booking' ? 'bookings' : 'tasks'
      await supabase.from(table).update({
        scheduled_date: request.proposed_date,
        scheduled_time: request.proposed_time,
        updated_at: new Date().toISOString(),
      }).eq('id', request.job_id)

      // 3. Notify handyman
      if (request.handyman_id) {
        await supabase.from('notifications').insert({
          user_id: request.handyman_id,
          type: 'task_accepted',
          title: 'Reprogramare acceptată!',
          body: `Clientul a acceptat reprogramarea pentru ${fmtDate(request.proposed_date)} la ${request.proposed_time}.`,
          data: { job_id: request.job_id, job_type: request.job_type, redirect: '/handyman/jobs?tab=reschedule' },
        })
      }

      setMode('done')
      onUpdated?.()
    } catch (e) {
      setError('Eroare: ' + (e.message ?? ''))
    } finally { setSaving(false) }
  }

  const handleReject = async () => {
    setSaving(true); setError(null)
    try {
      await supabase.from('reschedule_requests')
        .update({ status: 'rejected', responded_at: new Date().toISOString() })
        .eq('id', request.id)
      if (request.handyman_id) {
        await supabase.from('notifications').insert({
          user_id: request.handyman_id,
          type: 'new_offer',
          title: 'Reprogramare refuzată',
          body: `Clientul a refuzat reprogramarea propusă pentru ${fmtDate(request.proposed_date)}.`,
          data: { job_id: request.job_id, job_type: request.job_type, redirect: '/handyman/jobs' },
        })
      }
      setMode('done')
      onUpdated?.()
    } catch (e) {
      setError('Eroare: ' + (e.message ?? ''))
    } finally { setSaving(false) }
  }

  const handleCounter = async () => {
    if (!counterDate || !counterTime) { setError('Selectează data și ora alternativă.'); return }
    setSaving(true); setError(null)
    try {
      // Reject original, insert a new reschedule FROM client (swap roles)
      await supabase.from('reschedule_requests')
        .update({ status: 'rejected', responded_at: new Date().toISOString() })
        .eq('id', request.id)

      await supabase.from('reschedule_requests').insert({
        job_id:        request.job_id,
        job_type:      request.job_type,
        handyman_id:   request.handyman_id,
        client_id:     request.client_id,
        proposed_date: counterDate,
        proposed_time: counterTime,
        message:       counterMsg || null,
        status:        'pending_handyman',
        created_at:    new Date().toISOString(),
      })

      if (request.handyman_id) {
        await supabase.from('notifications').insert({
          user_id: request.handyman_id,
          type: 'new_offer',
          title: 'Contra-propunere de reprogramare',
          body: `Clientul propune o dată alternativă: ${fmtDate(counterDate)} la ${counterTime}.`,
          data: { job_id: request.job_id, job_type: request.job_type, redirect: '/handyman/jobs' },
        })
      }

      setMode('done')
      onUpdated?.()
    } catch (e) {
      setError('Eroare: ' + (e.message ?? ''))
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:px-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[90dvh]"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <CalendarClock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800 text-sm">Cerere de Reprogramare</h2>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{jobTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

          {/* ── REVIEW ── */}
          {mode === 'review' && (
            <>
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <p className="text-xs font-bold text-orange-600 uppercase tracking-wide mb-3">Handymanul propune reprogramare</p>
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-gray-800">{fmtDate(request.proposed_date)}</p>
                    <p className="text-sm text-orange-700 font-medium">Ora {request.proposed_time}</p>
                  </div>
                </div>
                {request.message && (
                  <div className="mt-3 pt-3 border-t border-orange-200">
                    <p className="text-xs text-orange-500 font-medium mb-1">Motiv:</p>
                    <p className="text-sm text-gray-700 italic">"{request.message}"</p>
                  </div>
                )}
              </div>

              <p className="text-sm text-gray-500 text-center">Ce vrei să faci cu această cerere?</p>
            </>
          )}

          {/* ── COUNTER ── */}
          {mode === 'counter' && (
            <>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-xs font-bold text-blue-500 uppercase tracking-wide mb-1">Propunerea handymanului</p>
                <p className="text-sm font-semibold text-gray-700">{fmtDate(request.proposed_date)} · {request.proposed_time}</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1 text-gray-400" />
                  Data ta alternativă *
                </label>
                <input type="date" value={counterDate}
                  onChange={e => {
                    const d = e.target.value
                    setCounterDate(d)
                    if (d === TODAY_STR && counterTime && toMins(counterTime) <= new Date().getHours() * 60 + new Date().getMinutes()) setCounterTime('')
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1 text-gray-400" />
                  Ora ta *
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {availSlots(counterDate).map(t => (
                    <button key={t} onClick={() => setCounterTime(t)}
                      className={`py-2.5 rounded-xl text-sm font-medium border transition-all
                        ${counterTime === t ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-400'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  <MessageSquare className="w-4 h-4 inline mr-1 text-gray-400" />
                  Mesaj <span className="font-normal text-gray-400">(opțional)</span>
                </label>
                <textarea value={counterMsg} onChange={e => setCounterMsg(e.target.value)} rows={2}
                  placeholder="Ex: Prefer dimineața sau altă zi..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm" />
              </div>
            </>
          )}

          {/* ── DONE ── */}
          {mode === 'done' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-9 h-9 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-lg">Răspuns trimis!</h3>
                <p className="text-sm text-gray-500 mt-1">Handymanul va fi notificat cu decizia ta.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {mode === 'review' && (
          <div className="flex flex-col gap-2 p-5 border-t border-gray-100 flex-shrink-0">
            <button onClick={handleAccept} disabled={saving}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Acceptă — {fmtDate(request.proposed_date)}, {request.proposed_time}
            </button>
            <div className="flex gap-2">
              <button onClick={() => setMode('counter')}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-blue-300 text-blue-600 bg-blue-50 rounded-xl text-sm font-medium hover:bg-blue-100 transition">
                <RefreshCw className="w-4 h-4" /> Propune altă dată
              </button>
              <button onClick={handleReject} disabled={saving}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition disabled:opacity-60">
                <XCircle className="w-4 h-4" /> Refuză
              </button>
            </div>
          </div>
        )}
        {mode === 'counter' && (
          <div className="flex gap-2 p-5 border-t border-gray-100 flex-shrink-0">
            <button onClick={() => setMode('review')}
              className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
              Înapoi
            </button>
            <button onClick={handleCounter} disabled={saving || !counterDate || !counterTime}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarClock className="w-4 h-4" />}
              Trimite Contra-propunerea
            </button>
          </div>
        )}
        {mode === 'done' && (
          <div className="p-5 border-t border-gray-100 flex-shrink-0">
            <button onClick={onClose} className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">
              Închide
            </button>
          </div>
        )}
      </div>
    </div>
  )
}