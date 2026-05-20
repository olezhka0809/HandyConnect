import { useState } from 'react'
import {
  X, Clock, CheckCircle, XCircle, Wrench, Scale, Upload,
  Loader2, CalendarClock, AlertTriangle, Copy,
} from 'lucide-react'

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

const ALL_TIMES = [
  '07:00','07:30','08:00','08:30','09:00','09:30',
  '10:00','10:30','11:00','11:30','12:00','12:30',
  '13:00','13:30','14:00','14:30','15:00','15:30',
  '16:00','16:30','17:00','17:30','18:00','18:30','19:00',
]

const STATUS_CONFIG = {
  open:                          { label: 'Deschis',                        cls: 'bg-red-100 text-red-700 border-red-200' },
  dispute_contested:             { label: 'Contestat — la administrator',   cls: 'bg-orange-100 text-orange-700 border-orange-200' },
  rework_accepted:               { label: 'Relucrare acceptată',            cls: 'bg-orange-100 text-orange-700 border-orange-200' },
  rework_in_progress:            { label: 'Relucrare în desfășurare',       cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  rework_completed:              { label: 'Relucrare finalizată',           cls: 'bg-green-100 text-green-700 border-green-200' },
  admin_review:                  { label: 'La administrator',               cls: 'bg-purple-100 text-purple-700 border-purple-200' },
  admin_review_required:         { label: 'La administrator',               cls: 'bg-purple-100 text-purple-700 border-purple-200' },
  admin_escalated:               { label: 'Escalat la admin',               cls: 'bg-purple-200 text-purple-800 border-purple-300' },
  admin_proposed_rework:         { label: 'Admin propune relucrare',        cls: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  evidence_requested_handyman:   { label: 'Dovezi solicitate de admin',     cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  evidence_requested_client:     { label: 'Dovezi solicitate de la client', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  handyman_declined_rework:           { label: 'Ai refuzat relucrarea',          cls: 'bg-red-100 text-red-700 border-red-200' },
  awaiting_client_rework_choice:      { label: 'Așteptare client',                cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  rework_marketplace:                 { label: 'Relucrare prin marketplace',      cls: 'bg-sky-100 text-sky-700 border-sky-200' },
  resolved:                           { label: 'Rezolvat',                        cls: 'bg-green-100 text-green-700 border-green-200' },
  forced_accepted:               { label: 'Acceptat de admin',              cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  refund_partial:                { label: 'Rambursare parțială',            cls: 'bg-teal-100 text-teal-700 border-teal-200' },
  refund_full:                   { label: 'Rambursare totală',              cls: 'bg-teal-200 text-teal-800 border-teal-300' },
}

const EVENT_LABELS = {
  dispute_opened:                   'Dispută deschisă',
  rework_accepted:                  'Ai acceptat relucrarea',
  rework_rejected:                  'Ai contestat disputa',
  dispute_contested:                'Ai contestat disputa',
  rework_date_confirmed_by_client:  'Clientul a confirmat data',
  client_proposed_new_rework_date:  'Clientul a propus altă dată',
  handyman_confirmed_client_date:      'Ai confirmat noua dată',
  handyman_proposed_new_rework_date:   'Ai propus o nouă dată',
  auto_escalated_to_admin:          'Escalat automat la administrator',
  admin_decision:                   'Decizie administrator',
  admin_resolved:                   'Decizie finală administrator',
  admin_proposed_rework:            'Adminul a propus relucrarea amiabilă',
  handyman_accepted_admin_proposal: 'Ai acceptat propunerea de relucrare',
  handyman_declined_rework_proposal:'Ai refuzat propunerea de relucrare',
  awaiting_client_rework_choice:    'Clientul alege cum să continue',
  handyman_declined_rework:         'Ai refuzat relucrarea',
  client_chose_accept_current:      'Clientul a ales să continue cu tine',
  client_chose_reassign:            'Clientul a ales alt meșter',
  client_chose_cancel_no_refund:    'Clientul a anulat fără rambursare',
  client_requested_reassign:                  'Clientul solicită alt meșter',
  client_requested_partial_refund:            'Clientul solicită rambursare parțială',
  client_requested_full_refund:               'Clientul solicită rambursare totală',
  admin_requested_evidence_from_handyman:     'Adminul a solicitat dovezi suplimentare de la tine',
  admin_requested_evidence_from_client:       'Adminul a solicitat dovezi suplimentare de la client',
  evidence_submitted:                         'Ai trimis dovezi suplimentare',
  evidence_refused:                           'Ai refuzat cererea de dovezi',
  evidence_submitted_by_client:               'Clientul a trimis dovezi suplimentare',
  evidence_refused_by_client:                 'Clientul a refuzat cererea de dovezi',
  handyman_responded:                         'Ai răspuns la dispută',
}

function fmtDt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const date = d.toLocaleDateString('ro-RO', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })
  const time = d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })
  return time !== '00:00' ? `${date} la ${time}` : date
}

export default function HandymanDisputeModal({ isOpen, dispute, onClose, onRefresh }) {
  const [action,          setAction]          = useState(null)
  const [responseText,    setResponseText]    = useState('')
  const [reworkDate,      setReworkDate]      = useState('')
  const [reworkTime,      setReworkTime]      = useState('')
  const [proposalDate,    setProposalDate]    = useState('')
  const [proposalTime,    setProposalTime]    = useState('')
  const [showProposalForm,setShowProposalForm]= useState(false)
  const [evidenceFiles,   setEvidenceFiles]   = useState([])
  const [uploading,       setUploading]       = useState(false)
  const [submitting,      setSubmitting]      = useState(false)
  const [confirmingDate,  setConfirmingDate]  = useState(false)
  const [msg,             setMsg]             = useState('')
  const [showCounterForm, setShowCounterForm] = useState(false)
  const [counterDate,       setCounterDate]       = useState('')
  const [counterTime,       setCounterTime]       = useState('')
  const [counterComment,    setCounterComment]    = useState('')
  const [extraEvidenceText,  setExtraEvidenceText]  = useState('')
  const [extraEvidenceFiles, setExtraEvidenceFiles] = useState([])
  const [extraEvPreviews,    setExtraEvPreviews]    = useState([])

  if (!isOpen || !dispute) return null

  const todayStr = new Date().toISOString().split('T')[0]
  const nowMins  = new Date().getHours() * 60 + new Date().getMinutes()
  const toMins   = t => { const [h, m] = t.split(':'); return parseInt(h) * 60 + parseInt(m) }
  const availTimes = reworkDate === todayStr ? ALL_TIMES.filter(t => toMins(t) > nowMins) : ALL_TIMES

  const parseJsonField = (val) => {
    if (Array.isArray(val)) return val
    try { return JSON.parse(val ?? '[]') } catch { return [] }
  }

  const timeline      = parseJsonField(dispute.timeline)
  const clientPhotos  = parseJsonField(dispute.photos)
  const ownEvidence   = parseJsonField(dispute.handyman_evidence)
  const sortedEvents          = [...timeline].sort((a, b) => new Date(a.at ?? 0) - new Date(b.at ?? 0))
  const clientProposedEvent   = timeline.find(e => e.event === 'client_proposed_new_rework_date')
  const handymanConfirmedEvt  = timeline.find(e => e.event === 'handyman_confirmed_client_date')
  const clientHasProposedDate = !!clientProposedEvent && !handymanConfirmedEvt

  const task       = dispute.task
  const taskTitle  = task?.title ?? `Task #${dispute.task_id?.slice(0, 6).toUpperCase()}`
  const clientName = task?.profiles
    ? `${task.profiles.first_name ?? ''} ${task.profiles.last_name ?? ''}`.trim() || 'Client'
    : 'Client'
  const STATUS = dispute.status

  const canRespond           = dispute.status === 'open' && !dispute.handyman_response_at
  const responded            = !!dispute.handyman_response_at
  const canRespondToProposal = dispute.status === 'admin_proposed_rework'

  // At rework level ≥ 2 the only option left is to contest (admin handles refunds)
  const isReworkTask  = task?.is_rework === true
  const reworkLvl     = task?.rework_level ?? 1
  const canOfferRework = !isReworkTask || reworkLvl < 2

  const { label: statusLabel, cls: statusCls } =
    STATUS_CONFIG[dispute.status] ?? { label: dispute.status, cls: 'bg-gray-100 text-gray-600 border-gray-200' }

  const handleRespondToProposal = async (accept) => {
    if (accept && !proposalDate) { setShowProposalForm(true); return }
    setSubmitting(true); setMsg('')
    try {
      const reworkDeadline = accept && proposalDate
        ? `${proposalDate}T${proposalTime || '09:00'}:00`
        : null
      const { data, error } = await supabase.rpc('handyman_respond_dispute', {
        p_dispute_id:      dispute.id,
        p_response:        accept ? 'accept_rework' : 'decline_rework',
        p_evidence:        [],
        p_rework_deadline: reworkDeadline,
        p_response_text:   '',
      })
      if (error) throw error
      if (!data?.success) throw new Error(data?.error ?? 'Eroare.')
      setMsg(accept ? 'Ai acceptat relucrarea! Propune o dată clientului și acesta va confirma.' : 'Ai refuzat propunerea. Clientul va alege rambursarea.')
      // Notify admins when handyman accepts a rework proposal so they can monitor
      if (accept) {
        try {
          const { data: admins } = await supabase
            .from('user_roles')
            .select('user_id, profiles!user_roles_user_id_fkey(first_name,last_name)')
            .eq('role_id', (await supabase.from('roles').select('id').eq('name','admin').single()).data?.id)
          if (admins?.length) {
            for (const a of admins) {
              const adminId = a.user_id
              await supabase.from('notifications').insert({
                user_id: adminId,
                type: 'rework_proposal',
                title: 'Meșter a acceptat relucrarea',
                body: `Meșterul a acceptat relucrarea pentru taskul "${taskTitle}". Verifică secțiunea Dispute.`,
                data: { dispute_id: dispute.id, task_id: dispute.task_id, redirect: '/dashboard?tab=disputes' },
              })
            }
          }
        } catch (e) { console.warn('Failed to notify admins:', e?.message || e) }
      }
      onRefresh()
      onClose()
    } catch (e) { setMsg('Eroare: ' + e.message) }
    setSubmitting(false)
  }

  const notifyAdmins = async (title, body, extra = {}) => {
    try {
      const { data: roleRow } = await supabase.from('roles').select('id').eq('name', 'admin').single()
      if (!roleRow?.id) return
      const { data: admins } = await supabase.from('user_roles').select('user_id').eq('role_id', roleRow.id)
      if (!admins?.length) return
      for (const { user_id } of admins) {
        await supabase.from('notifications').insert({
          user_id,
          type: 'rework_scheduled',
          title,
          body,
          data: { dispute_id: dispute.id, task_id: dispute.task_id, redirect: '/admin/dashboard?tab=disputes', ...extra },
        })
      }
    } catch (e) { console.warn('[HandymanDispute] notifyAdmins error:', e?.message) }
  }

  const handleConfirmClientDate = async () => {
    const proposedDeadline = clientProposedEvent?.extra?.new_deadline
    if (!proposedDeadline) { setMsg('Nu s-a găsit data propusă de client.'); return }
    setConfirmingDate(true); setMsg('')
    try {
      const { data, error } = await supabase.rpc('confirm_rework_date', {
        p_dispute_id: dispute.id,
        p_deadline:   proposedDeadline,
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      setMsg('Dată confirmată! Relucrarea este programată.')
      setTimeout(() => { onRefresh(); onClose() }, 1500)
    } catch (e) { setMsg('Eroare: ' + e.message) }
    setConfirmingDate(false)
  }

  const ADMIN_ID = 'e7c2a8fa-c2ef-4486-8937-97807b6b04f5'

  const handleSubmitExtraEvidence = async () => {
    setSubmitting(true); setMsg('')
    try {
      const uploadedUrls = []
      for (const file of extraEvidenceFiles) {
        const ext  = file.name.split('.').pop()
        const path = `disputes/${dispute.id}/extra/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage.from('dispute-photos').upload(path, file)
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('dispute-photos').getPublicUrl(path)
          uploadedUrls.push(urlData.publicUrl)
        }
      }
      const tl = parseJsonField(dispute.timeline)
      const newEvent = { event: 'evidence_submitted', by: 'handyman', at: new Date().toISOString(), extra: { text: extraEvidenceText, photos: uploadedUrls } }
      const existingEvidence = parseJsonField(dispute.handyman_evidence)
      const { error } = await supabase.from('task_disputes').update({
        status: 'admin_review',
        timeline: [...tl, newEvent],
        handyman_evidence: [...existingEvidence, ...uploadedUrls],
        handyman_response: extraEvidenceText || dispute.handyman_response || '',
        handyman_response_at: dispute.handyman_response_at || new Date().toISOString(),
      }).eq('id', dispute.id)
      if (error) throw error
      await supabase.from('notifications').insert({
        user_id: ADMIN_ID,
        type: 'dispute_update',
        title: 'Meșterul a trimis dovezi suplimentare',
        body: `Task "${task?.title ?? ''}": dovezi suplimentare disponibile.`,
        data: { section: 'disputes', filter: 'admin_review', redirect: '/admin/dashboard?section=disputes' },
      })
      setMsg('Dovezi trimise! Adminul a fost notificat.')
      setTimeout(() => { onRefresh(); onClose() }, 1500)
    } catch (e) { setMsg('Eroare: ' + e.message) }
    setSubmitting(false)
  }

  const handleRefuseEvidenceRequest = async () => {
    setSubmitting(true); setMsg('')
    try {
      const tl = parseJsonField(dispute.timeline)
      const newEvent = { event: 'evidence_refused', by: 'handyman', at: new Date().toISOString() }
      const { error } = await supabase.from('task_disputes').update({
        status: 'admin_review',
        timeline: [...tl, newEvent],
      }).eq('id', dispute.id)
      if (error) throw error
      await supabase.from('notifications').insert({
        user_id: ADMIN_ID,
        type: 'dispute_update',
        title: 'Meșterul a refuzat cererea de dovezi',
        body: `Task "${task?.title ?? ''}": meșterul a refuzat să trimită dovezi suplimentare.`,
        data: { section: 'disputes', filter: 'admin_review', redirect: '/admin/dashboard?section=disputes' },
      })
      setMsg('Refuz trimis. Adminul a fost notificat.')
      setTimeout(() => { onRefresh(); onClose() }, 1500)
    } catch (e) { setMsg('Eroare: ' + e.message) }
    setSubmitting(false)
  }

  const handleCounterPropose = async () => {
    if (!counterDate) { setMsg('Selectează o dată pentru propunerea ta.'); return }
    setSubmitting(true); setMsg('')
    try {
      const deadline = `${counterDate}T${counterTime || '09:00'}:00`
      const now = new Date().toISOString()
      const newTimeline = [...timeline, {
        event: 'handyman_proposed_new_rework_date',
        by: 'handyman',
        at: now,
        extra: { new_deadline: deadline, comment: counterComment || null },
      }]
      await supabase.from('task_disputes').update({
        rework_deadline: deadline,
        timeline: newTimeline,
        updated_at: now,
      }).eq('id', dispute.id)

      if (task?.client_id) {
        await supabase.from('notifications').insert({
          user_id: task.client_id,
          type:    'rework_date_proposal',
          title:   'Meșterul a propus o nouă dată',
          body:    `Dată propusă: ${fmtDt(deadline)}.${counterComment ? ' Mesaj: ' + counterComment : ''}`,
          data:    { dispute_id: dispute.id, redirect: '/dashboard?tab=tasks&filter=rework' },
          created_at: now,
        })
      }

      setShowCounterForm(false)
      setCounterDate(''); setCounterTime(''); setCounterComment('')
      setMsg('Propunere trimisă clientului.')
      setTimeout(() => onRefresh(), 1000)
    } catch (e) { setMsg('Eroare: ' + e.message) }
    setSubmitting(false)
  }

  const handleSubmit = async () => {
    if (!action) return
    if (action === 'accept_rework' && !reworkDate) { setMsg('Alege data relucrării.'); return }
    if (action === 'contest' && !responseText.trim()) { setMsg('Explică poziția ta.'); return }
    setSubmitting(true); setMsg('')
    try {
      let evidenceUrls = []
      if (evidenceFiles.length > 0) {
        setUploading(true)
        evidenceUrls = await Promise.all(evidenceFiles.map(async file => {
          const ext  = file.name.split('.').pop()
          const path = `${dispute.id}/handyman/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
          const { error: upErr } = await supabase.storage.from('dispute-photos').upload(path, file)
          if (upErr) throw upErr
          return supabase.storage.from('dispute-photos').getPublicUrl(path).data.publicUrl
        }))
        setUploading(false)
      }
      const reworkDeadline = action === 'accept_rework' && reworkDate
        ? `${reworkDate}T${reworkTime || '09:00'}:00`
        : null
      const { data, error } = await supabase.rpc('handyman_respond_dispute', {
        p_dispute_id:      dispute.id,
        p_response:        action,
        p_evidence:        evidenceUrls.length ? evidenceUrls : [],
        p_rework_deadline: reworkDeadline,
        p_response_text:   action === 'contest' ? responseText : '',
      })
      if (error) throw error
      if (!data?.success) throw new Error(data?.error ?? 'Eroare.')
      onRefresh()
      onClose()
    } catch (err) {
      setMsg('Eroare: ' + err.message)
    } finally {
      setSubmitting(false)
      setUploading(false)
    }
  }

  const PhotoRow = ({ urls, borderCls = 'border-gray-200' }) => (
    <div className="flex gap-1.5 flex-wrap">
      {urls.map((url, i) => (
        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
          <img src={url} alt={`foto-${i}`}
            className={`w-16 h-16 rounded-lg object-cover border hover:opacity-80 transition ${borderCls}`} />
        </a>
      ))}
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[92dvh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <h3 className="font-bold text-gray-800 text-base line-clamp-1">{taskTitle}</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border flex-shrink-0 ${statusCls}`}>
                {statusLabel}
              </span>
              {dispute.task_id && <RefBadge id={dispute.task_id} />}
            </div>
            <p className="text-xs text-gray-400">Client: {clientName}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center flex-shrink-0">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">

          {/* ── Client complaint ── */}
          <div className="border border-red-200 rounded-xl overflow-hidden">
            <div className="bg-red-50 px-4 py-2.5 border-b border-red-100">
              <p className="text-xs font-bold text-red-700 uppercase tracking-wide">Reclamația clientului</p>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Motiv</p>
                <p className="text-sm font-bold text-red-700">{dispute.rejection_reasons?.name ?? 'Reclamație'}</p>
              </div>
              {dispute.details && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Descriere</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{dispute.details}</p>
                </div>
              )}
              {clientPhotos.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Dovezi foto</p>
                  <PhotoRow urls={clientPhotos} borderCls="border-red-200" />
                </div>
              )}
            </div>
          </div>

          {/* ── Client proposed new rework date ── */}
          {clientHasProposedDate && (
            <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2">
                <CalendarClock className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-yellow-800">Clientul a propus o nouă dată</p>
                  <p className="text-sm text-yellow-700 mt-0.5">
                    Data propusă: <strong>{fmtDt(clientProposedEvent.extra?.new_deadline)}</strong>
                  </p>
                  {clientProposedEvent.extra?.comment && (
                    <p className="text-xs text-yellow-700 mt-1 italic">„{clientProposedEvent.extra.comment}"</p>
                  )}
                </div>
              </div>

              {!showCounterForm ? (
                <div className="flex gap-2">
                  <button onClick={handleConfirmClientDate} disabled={confirmingDate || submitting}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-yellow-500 text-white text-sm font-bold rounded-xl hover:bg-yellow-600 disabled:opacity-50 transition">
                    {confirmingDate
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <><CheckCircle className="w-4 h-4" /> Confirmă data</>}
                  </button>
                  <button onClick={() => setShowCounterForm(true)} disabled={confirmingDate || submitting}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-yellow-400 text-yellow-800 bg-white text-sm font-bold rounded-xl hover:bg-yellow-50 disabled:opacity-50 transition">
                    <CalendarClock className="w-4 h-4" /> Propune altă dată
                  </button>
                </div>
              ) : (
                <div className="space-y-2 bg-white border border-yellow-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-gray-700">Propune o altă dată:</p>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Data *</label>
                    <input type="date" value={counterDate} min={todayStr}
                      onChange={e => {
                        const d = e.target.value
                        setCounterDate(d)
                        if (d === todayStr && counterTime && toMins(counterTime) <= nowMins) setCounterTime('')
                      }}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Ora</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(counterDate === todayStr ? ALL_TIMES.filter(t => toMins(t) > nowMins) : ALL_TIMES).map(t => (
                        <button key={t} type="button" onClick={() => setCounterTime(t)}
                          className={`py-2 rounded-xl text-xs font-medium border transition-all
                            ${counterTime === t
                              ? 'bg-yellow-500 text-white border-yellow-500'
                              : 'border-gray-200 text-gray-600 hover:border-yellow-400 hover:bg-yellow-50'}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea value={counterComment} onChange={e => setCounterComment(e.target.value)}
                    rows={2} placeholder="Motiv / comentariu (opțional)..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                  <div className="flex gap-2">
                    <button onClick={() => setShowCounterForm(false)}
                      className="flex-1 py-2 border border-gray-200 rounded-xl text-xs text-gray-500 hover:bg-gray-50">
                      Înapoi
                    </button>
                    <button onClick={handleCounterPropose} disabled={submitting || !counterDate}
                      className="flex-1 py-2 bg-yellow-500 text-white rounded-xl text-xs font-bold hover:bg-yellow-600 disabled:opacity-50 transition">
                      {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Trimite propunerea'}
                    </button>
                  </div>
                </div>
              )}

              {msg && <p className={`text-xs font-medium ${msg.startsWith('Eroare') ? 'text-red-600' : 'text-green-600'}`}>{msg}</p>}
            </div>
          )}

          {/* ── Waiting for client to pick rework path ── */}
          {dispute.status === 'awaiting_client_rework_choice' && (
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-300 rounded-xl p-4">
              <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800">Ai acceptat relucrarea — aștepți clientul</p>
                <p className="text-xs text-amber-700 mt-0.5">Clientul alege dacă dorește să continue cu tine, să ceară un alt meșter sau să anuleze. Vei fi notificat imediat ce decide.</p>
              </div>
            </div>
          )}

          {/* ── Admin rework proposal — needs handyman response ── */}
          {canRespondToProposal && (
            <div className={`border rounded-xl overflow-hidden ${dispute.task?.is_rework ? 'border-red-300' : 'border-yellow-300'}`}>
              <div className={`px-4 py-2.5 border-b flex items-center gap-2 ${dispute.task?.is_rework ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                <AlertTriangle className={`w-3.5 h-3.5 ${dispute.task?.is_rework ? 'text-red-600' : 'text-yellow-600'}`} />
                <p className={`text-xs font-bold uppercase tracking-wide ${dispute.task?.is_rework ? 'text-red-700' : 'text-yellow-700'}`}>
                  {dispute.task?.is_rework ? 'Propunere admin — relucrare pe cheltuiala ta' : 'Propunere admin — relucrare amiabilă'}
                </p>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {dispute.task?.is_rework
                    ? <>Administratorul propune să refaci lucrarea <strong>pe cheltuiala ta</strong>, fără cost suplimentar pentru client. Poți <strong>accepta</strong> (vei propune o dată) sau <strong>refuza</strong> (clientul va primi rambursare).</>
                    : <>Administratorul propune să refaci lucrarea în mod amiabil, fără penalizare imediată. Poți <strong>accepta</strong> (vei propune o dată) sau <strong>refuza</strong> (adminul va impune o soluție finală, cu posibile penalizări).</>
                  }
                </p>
                {showProposalForm && (
                  <div className="space-y-2 bg-green-50 border border-green-200 rounded-xl p-3">
                    <p className="text-xs font-bold text-green-700">Când poți efectua relucrarea?</p>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Data *</label>
                      <input type="date" value={proposalDate} min={todayStr}
                        onChange={e => {
                          const d = e.target.value
                          setProposalDate(d)
                          if (d === todayStr && proposalTime && toMins(proposalTime) <= nowMins) setProposalTime('')
                        }}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Ora</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {(proposalDate === todayStr ? ALL_TIMES.filter(t => toMins(t) > nowMins) : ALL_TIMES).map(t => (
                          <button key={t} type="button" onClick={() => setProposalTime(t)}
                            className={`py-2 rounded-xl text-xs font-medium border transition-all
                              ${proposalTime === t
                                ? 'bg-green-600 text-white border-green-600'
                                : 'border-gray-200 text-gray-600 hover:border-green-400 hover:bg-green-50'}`}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {msg && (
                  <p className={`text-xs font-medium ${msg.startsWith('Eroare') ? 'text-red-600' : 'text-green-600'}`}>{msg}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRespondToProposal(true)}
                    disabled={submitting || (showProposalForm && !proposalDate)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 disabled:opacity-50 transition"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Wrench className="w-4 h-4" /> {showProposalForm ? 'Confirmă data' : 'Accept relucrarea'}</>}
                  </button>
                  <button
                    onClick={() => handleRespondToProposal(false)}
                    disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-red-300 text-red-700 bg-white text-sm font-bold rounded-xl hover:bg-red-50 disabled:opacity-50 transition"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Scale className="w-4 h-4" /> Refuz</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Actions panel — for unanswered open disputes ── */}
          {canRespond && (
            <div className="border border-orange-200 rounded-xl overflow-hidden">
              <div className="bg-orange-50 px-4 py-2.5 border-b border-orange-100 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-orange-600" />
                <p className="text-xs font-bold text-orange-700 uppercase tracking-wide">Răspunsul tău</p>
              </div>
              <div className="p-4 space-y-3">

                {!action && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">Contestă disputa pentru a trimite răspunsul tău — adminul va analiza situația.</p>
                    <button onClick={() => setAction('contest')}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 border border-orange-300 text-orange-700 bg-white text-sm font-semibold rounded-xl hover:bg-orange-50 transition">
                      <Scale className="w-4 h-4" /> Contestez
                    </button>
                  </div>
                )}

                {action === 'accept_rework' && (
                  <div className="space-y-3">
                    <p className="text-xs text-green-700 font-semibold">Când poți efectua relucrarea? Clientul va confirma sau propune altă dată.</p>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Data *</label>
                      <input type="date" value={reworkDate} min={todayStr}
                        onChange={e => {
                          const d = e.target.value
                          setReworkDate(d)
                          if (d === todayStr && reworkTime && toMins(reworkTime) <= nowMins) setReworkTime('')
                        }}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Ora</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {availTimes.map(t => (
                          <button key={t} type="button" onClick={() => setReworkTime(t)}
                            className={`py-2 rounded-xl text-xs font-medium border transition-all
                              ${reworkTime === t
                                ? 'bg-green-600 text-white border-green-600'
                                : 'border-gray-200 text-gray-600 hover:border-green-400 hover:bg-green-50'}`}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 cursor-pointer">
                      <Upload className="w-4 h-4" /> Dovezi foto (opțional)
                      <input type="file" accept="image/*" multiple className="hidden"
                        onChange={e => setEvidenceFiles(Array.from(e.target.files ?? []))} />
                    </label>
                    {evidenceFiles.length > 0 && (
                      <p className="text-xs text-green-600">{evidenceFiles.length} {evidenceFiles.length === 1 ? 'fișier selectat' : 'fișiere selectate'}</p>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => setAction(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50">Înapoi</button>
                      <button onClick={handleSubmit} disabled={submitting || uploading || !reworkDate}
                        className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 disabled:opacity-50 transition">
                        {uploading ? 'Se încarcă...' : submitting ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Confirmă relucrarea'}
                      </button>
                    </div>
                  </div>
                )}

                {action === 'contest' && (
                  <div className="space-y-3">
                    <p className="text-xs text-orange-700 font-semibold">Adminul va analiza ambele părți. Explică situația și adaugă dovezi.</p>
                    <textarea value={responseText} onChange={e => setResponseText(e.target.value)} rows={4}
                      placeholder="Explică de ce lucrarea a fost efectuată corect și motivul pentru care contești reclamația..."
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 cursor-pointer">
                      <Upload className="w-4 h-4" /> Dovezi foto contradictoriu (opțional)
                      <input type="file" accept="image/*" multiple className="hidden"
                        onChange={e => setEvidenceFiles(Array.from(e.target.files ?? []))} />
                    </label>
                    {evidenceFiles.length > 0 && (
                      <p className="text-xs text-orange-600">{evidenceFiles.length} {evidenceFiles.length === 1 ? 'fișier selectat' : 'fișiere selectate'}</p>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => setAction(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50">Înapoi</button>
                      <button onClick={handleSubmit} disabled={submitting || uploading || !responseText.trim()}
                        className="flex-1 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-bold hover:bg-orange-700 disabled:opacity-50 transition">
                        {uploading ? 'Se încarcă...' : submitting ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Trimite contestație'}
                      </button>
                    </div>
                  </div>
                )}

                {msg && (
                  <p className={`text-xs font-medium ${msg.startsWith('Eroare') ? 'text-red-600' : 'text-green-600'}`}>{msg}</p>
                )}
              </div>
            </div>
          )}

          {/* ── Already responded (only for accept / contest — not for declined/waiting states) ── */}
          {responded && !['handyman_declined_rework', 'awaiting_client_rework_choice', 'rework_marketplace', 'refund_partial', 'refund_full', 'resolved', 'forced_accepted'].includes(STATUS) && (
            <div className={`border rounded-xl overflow-hidden ${dispute.handyman_response === 'accept_rework' ? 'border-green-200' : 'border-blue-200'}`}>
              <div className={`px-4 py-2.5 border-b ${dispute.handyman_response === 'accept_rework' ? 'bg-green-50 border-green-100' : 'bg-blue-50 border-blue-100'}`}>
                <p className={`text-xs font-bold uppercase tracking-wide ${dispute.handyman_response === 'accept_rework' ? 'text-green-700' : 'text-blue-700'}`}>
                  {dispute.handyman_response === 'accept_rework' ? 'Ai acceptat relucrarea' : 'Ai contestat disputa'}
                </p>
              </div>
              <div className="p-4 space-y-3">
                {dispute.rework_deadline && (
                  <p className="text-sm text-gray-700">
                    Data relucrare: <strong>{fmtDt(dispute.rework_deadline)}</strong>
                    {dispute.client_rework_confirmed_at && <span className="ml-2 text-green-600 text-xs">✓ confirmat de client</span>}
                  </p>
                )}
                {!dispute.rework_deadline && dispute.handyman_response === 'accept_rework' && (
                  <p className="text-xs text-green-700">Task de relucrare creat și transmis clientului.</p>
                )}
                {ownEvidence.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Dovezile tale</p>
                    <PhotoRow urls={ownEvidence} borderCls="border-blue-200" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Admin requested extra evidence from handyman ── */}
          {STATUS === 'evidence_requested_handyman' && (
            <div className="border border-amber-300 rounded-xl overflow-hidden">
              <div className="bg-amber-50 px-4 py-2.5 border-b border-amber-200 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Adminul solicită dovezi suplimentare</p>
              </div>
              <div className="p-4 space-y-3">
                {(() => {
                  const reqEv = [...parseJsonField(dispute.timeline)].reverse().find(e => e.event === 'admin_requested_evidence_from_handyman')
                  return reqEv?.extra?.note ? (
                    <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 italic">„{reqEv.extra.note}"</p>
                  ) : null
                })()}
                <textarea
                  value={extraEvidenceText}
                  onChange={e => setExtraEvidenceText(e.target.value)}
                  rows={3}
                  placeholder="Explică situația sau adaugă informații suplimentare..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <label className="flex items-center gap-2 px-3 py-2.5 border border-dashed border-amber-300 rounded-xl cursor-pointer hover:border-amber-400 hover:bg-amber-50/50 transition text-sm text-gray-500">
                  <Upload className="w-4 h-4" />
                  <span>Atașează foto (opțional)</span>
                  <input type="file" accept="image/*" multiple className="hidden"
                    onChange={e => {
                      const arr = Array.from(e.target.files ?? [])
                      setExtraEvidenceFiles(prev => [...prev, ...arr])
                      setExtraEvPreviews(prev => [...prev, ...arr.map(f => URL.createObjectURL(f))])
                    }} />
                </label>
                {extraEvPreviews.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {extraEvPreviews.map((url, i) => (
                      <div key={i} className="relative group">
                        <img src={url} alt="" className="w-16 h-16 rounded-lg object-cover border border-amber-200" />
                        <button
                          type="button"
                          onClick={() => {
                            URL.revokeObjectURL(url)
                            setExtraEvPreviews(p => p.filter((_, j) => j !== i))
                            setExtraEvidenceFiles(p => p.filter((_, j) => j !== i))
                          }}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-xs font-bold leading-none"
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleRefuseEvidenceRequest}
                    disabled={submitting}
                    className="flex-1 py-2.5 border border-red-300 text-red-700 bg-white text-sm font-bold rounded-xl hover:bg-red-50 disabled:opacity-50 transition"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Refuz cererea'}
                  </button>
                  <button
                    onClick={handleSubmitExtraEvidence}
                    disabled={submitting || uploading}
                    className="flex-1 py-2.5 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 disabled:opacity-50 transition"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Trimit dovezi'}
                  </button>
                </div>
                {msg && <p className={`text-xs font-medium ${msg.startsWith('Eroare') ? 'text-red-600' : 'text-green-600'}`}>{msg}</p>}
              </div>
            </div>
          )}

          {/* ── Admin requested evidence from client (handyman just sees it in timeline) ── */}
          {STATUS === 'evidence_requested_client' && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <Clock className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Adminul a solicitat dovezi de la client</p>
                <p className="text-xs text-amber-600 mt-0.5">Se așteaptă răspunsul clientului. Adminul va lua o decizie după primirea informațiilor.</p>
              </div>
            </div>
          )}

          {/* ── Handyman declined: waiting for admin decision ── */}
          {STATUS === 'handyman_declined_rework' && (
            <div className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-xl p-4">
              <Clock className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-gray-700">Partea ta în această dispută s-a încheiat</p>
                <p className="text-xs text-gray-500 mt-0.5">Clientul și-a ales preferința. Un administrator analizează situația și va lua o decizie finală. Te vom contacta când se decide.</p>
              </div>
            </div>
          )}

          {/* ── Outcome: task reassigned to another handyman ── */}
          {(STATUS === 'rework_marketplace' || (STATUS === 'resolved' && dispute.admin_decision === 'reassign_rework')) && (
            <div className="flex items-start gap-3 bg-sky-50 border border-sky-200 rounded-xl p-4">
              <CheckCircle className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-sky-800">Taskul a fost oferit unui alt meșter pentru relucrare</p>
                <p className="text-xs text-sky-600 mt-0.5">Disputa a fost închisă. Platforma acoperă costul relucrării.</p>
              </div>
            </div>
          )}

          {/* ── Outcome: resolved — admin final decision ── */}
          {STATUS === 'resolved' && !['reassign_rework'].includes(dispute.admin_decision) && (() => {
            const raw = dispute.admin_decision
            const parsed = (() => { try { return typeof raw === 'string' ? JSON.parse(raw) : raw } catch { return null } })()
            const dec = (typeof parsed === 'string' ? parsed : null) ?? parsed?.decision ?? parsed?.type ?? (typeof raw === 'string' ? raw : null) ?? null
            const note = dispute.resolution_note || parsed?.notes || parsed?.note || null
            const handymanWon  = dec === 'approve_handyman' || dec === 'forced_accepted'
            const handymanLost = dec === 'full_refund' || dec === 'partial_refund'
            const finalPrice   = Number(dispute.task?.final_price ?? 0)
            const refundAmt    = Number(dispute.refund_amount ?? 0)
            const payout       = dispute.handyman_payout != null
              ? Number(dispute.handyman_payout)
              : Math.max(0, finalPrice - refundAmt)
            return (
              <div className={`rounded-xl border p-4 space-y-2.5 ${handymanWon ? 'bg-green-50 border-green-300' : handymanLost ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <div className="flex items-center gap-2.5">
                  {handymanWon
                    ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    : handymanLost
                    ? <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    : <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />}
                  <div>
                    <p className={`text-sm font-bold ${handymanWon ? 'text-green-800' : handymanLost ? 'text-red-700' : 'text-emerald-800'}`}>
                      {handymanWon ? 'Ai câștigat disputa!' : handymanLost ? 'Ai pierdut disputa.' : 'Dispută rezolvată de administrator'}
                    </p>
                    <p className={`text-xs mt-0.5 ${handymanWon ? 'text-green-600' : handymanLost ? 'text-red-500' : 'text-emerald-600'}`}>
                      {dec === 'approve_handyman' ? 'Adminul a confirmat că lucrarea ta este conformă.' :
                       dec === 'forced_accepted'  ? 'Adminul a decis eliberarea plății în favoarea ta.' :
                       dec === 'full_refund'      ? 'Clientul a primit rambursare integrală.' :
                       dec === 'partial_refund'   ? 'Clientul a primit rambursare parțială — suma ta e mai jos.' :
                                                    'Adminul a luat o decizie finală asupra disputei.'}
                    </p>
                  </div>
                </div>
                {handymanWon && finalPrice > 0 && (
                  <div className="bg-white border border-green-200 rounded-lg px-3 py-2">
                    <p className="text-xs text-green-600">Suma pe care o primești:</p>
                    <p className="text-base font-bold text-green-900">{finalPrice.toLocaleString('ro-RO')} RON</p>
                  </div>
                )}
                {dec === 'partial_refund' && payout > 0 && (
                  <div className="bg-white border border-red-200 rounded-lg px-3 py-2">
                    <p className="text-xs text-red-600">Suma pe care o primești din task:</p>
                    <p className="text-base font-bold text-red-900">{payout.toLocaleString('ro-RO')} RON</p>
                  </div>
                )}
                {note && (
                  <div className={`text-xs rounded-lg px-3 py-2 ${handymanWon ? 'bg-green-100 text-green-800' : handymanLost ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'}`}>
                    <span className="font-semibold">Motivul adminului: </span>„{note}"
                  </div>
                )}
              </div>
            )
          })()}

          {/* ── Outcome: partial refund — handyman receives remainder ── */}
          {STATUS === 'refund_partial' && (() => {
            const finalPrice = Number(dispute.task?.final_price ?? 0)
            const refundAmt  = Number(dispute.refund_amount ?? 0)
            const payout     = dispute.handyman_payout != null
              ? Number(dispute.handyman_payout)
              : Math.max(0, finalPrice - refundAmt)
            return (
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-semibold text-teal-800">Disputa a fost soluționată — rambursare parțială</p>
                </div>
                {payout > 0 ? (
                  <div className="bg-white border border-teal-100 rounded-lg px-3 py-2">
                    <p className="text-xs text-teal-600">Suma care urmează să o primești din task-ul <strong>{dispute.task?.title ?? ''}</strong>:</p>
                    <p className="text-lg font-bold text-teal-800 mt-0.5">{payout.toLocaleString('ro-RO')} RON</p>
                  </div>
                ) : (
                  <p className="text-xs text-teal-600">Suma va fi alocată în contul tău în curând.</p>
                )}
                {dispute.resolution_note && (
                  <p className="text-xs text-gray-500 italic">Motivul deciziei: "{dispute.resolution_note}"</p>
                )}
              </div>
            )
          })()}

          {/* ── Outcome: full refund ── */}
          {STATUS === 'refund_full' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-semibold text-red-700">Disputa a fost soluționată — rambursare totală acordată clientului</p>
              </div>
              <p className="text-xs text-red-600">Vei primi suma corespunzătoare deplasării la locul de muncă. Această funcționalitate va fi disponibilă în curând.</p>
              {dispute.resolution_note && (
                <p className="text-xs text-gray-500 italic">Motivul deciziei: "{dispute.resolution_note}"</p>
              )}
            </div>
          )}

          {/* ── Timeline ── */}
          {sortedEvents.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Istoricul disputei</p>
              </div>
              <div className="p-4 space-y-3">
                {sortedEvents.map((ev, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0 mt-1.5" />
                    <div>
                      <p className="text-sm font-semibold text-gray-700">
                    {ev.event === 'client_requested_resolution'
                      ? ev.extra?.request === 'reassign'        ? 'Clientul a ales relucrare cu alt meșter'
                        : ev.extra?.request === 'partial_refund' ? 'Clientul solicită rambursare parțială'
                        : ev.extra?.request === 'full_refund'    ? 'Clientul solicită rambursare totală'
                        : 'Clientul a trimis preferința sa'
                      : (EVENT_LABELS[ev.event] ?? ev.event)}
                  </p>
                      {ev.at && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(ev.at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })}
                          {' '}{new Date(ev.at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                      {ev.extra?.new_deadline && (
                        <p className="text-xs text-gray-500 mt-0.5">Dată propusă: {fmtDt(ev.extra.new_deadline)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
