import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../supabase'
import {
  X, Calendar, Clock, MapPin, Phone, Mail, User,
  ChevronLeft, ChevronRight, CheckCircle, Loader2,
  AlertTriangle, Zap, Shield, Wrench, Star, CreditCard, XCircle,
  Banknote, MessageSquare, AlertCircle, ExternalLink,
  CalendarClock, Send, Copy
} from 'lucide-react'

function RefBadge({ id, prefix = '' }) {
  const [copied, setCopied] = useState(false)
  if (!id) return null
  const ref = prefix + id.replace(/-/g, '').slice(0, 7).toUpperCase()
  const copy = (e) => { e.stopPropagation(); navigator.clipboard.writeText(ref).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500) }
  return (
    <button onClick={copy} title="Copiază referința"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 hover:bg-blue-50 hover:border-blue-200 border border-gray-200 text-gray-500 hover:text-blue-600 rounded-lg text-xs font-mono font-bold transition-all mt-1">
      {copied ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
      {copied ? <span className="text-green-600">Copiat!</span> : `#${ref}`}
    </button>
  )
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })
}
function fmtRON(v) {
  if (!v) return '0,00 RON'
  return `${Number(v).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`
}

function StarRow({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`w-3.5 h-3.5 ${i <= Math.round(rating ?? 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`}/>
      ))}
    </div>
  )
}

function StarRating({ value, onChange, readOnly = false }) {
  const [hovered, setHovered] = useState(null)
  const display = hovered ?? value

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => !readOnly && onChange?.(n)}
          onMouseEnter={() => !readOnly && setHovered(n)}
          onMouseLeave={() => !readOnly && setHovered(null)}
          className={`w-9 h-9 flex items-center justify-center rounded-lg transition ${readOnly ? 'cursor-default' : 'hover:scale-110 cursor-pointer'}`}
        >
          <Star className={`w-7 h-7 transition-colors ${n <= display ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`} />
        </button>
      ))}
    </div>
  )
}

const STATUS_LABEL = {
  pending:    'În așteptare',
  confirmed:  'Confirmat',
  assigned:   'Alocat',
  in_progress:'În lucru',
  delayed:    'Întârziat',
  completed:  'Finalizat',
  client_approved: 'Acceptat de client',
  client_rejected: 'Respins de client',
  cancelled:  'Anulat',
}
const STATUS_COLOR = {
  pending:    'bg-yellow-100 text-yellow-700',
  confirmed:  'bg-blue-100 text-blue-700',
  assigned:   'bg-blue-100 text-blue-700',
  in_progress:'bg-purple-100 text-purple-700',
  delayed:    'bg-orange-100 text-orange-700',
  completed:  'bg-green-100 text-green-700',
  client_approved: 'bg-emerald-100 text-emerald-700',
  client_rejected: 'bg-rose-100 text-rose-700',
  cancelled:  'bg-red-100 text-red-700',
}
function StatusBadge({ status }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

function UrgencyBadge({ urgency }) {
  const map = {
    high:   { label: 'Urgent',    Icon: AlertTriangle, cls: 'bg-red-100 text-red-700 border-red-200' },
    medium: { label: 'Mediu',     Icon: Zap,           cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    normal: { label: 'Normal',    Icon: Clock,         cls: 'bg-green-100 text-green-700 border-green-200' },
    low:    { label: 'Fără grabă',Icon: Clock,         cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  }
  const cfg = map[urgency] ?? map.normal
  const Icon = cfg.Icon
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}>
      <Icon className="w-3 h-3"/>{cfg.label}
    </span>
  )
}

// ─── photo gallery ─────────────────────────────────────────────────────────────

function PhotoGallery({ photos }) {
  const [current, setCurrent] = useState(0)
  if (!photos?.length) return (
    <div className="h-52 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center rounded-xl">
      <Wrench className="w-12 h-12 text-blue-400"/>
    </div>
  )
  return (
    <div className="relative h-52 rounded-xl overflow-hidden bg-gray-100 group">
      <img src={photos[current]} alt="" className="w-full h-full object-cover"/>
      {photos.length > 1 && (
        <>
          <button onClick={() => setCurrent(i => Math.max(0, i-1))}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white transition opacity-0 group-hover:opacity-100">
            <ChevronLeft className="w-4 h-4"/>
          </button>
          <button onClick={() => setCurrent(i => Math.min(photos.length-1, i+1))}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white transition opacity-0 group-hover:opacity-100">
            <ChevronRight className="w-4 h-4"/>
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {photos.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className={`w-1.5 h-1.5 rounded-full transition ${i === current ? 'bg-white' : 'bg-white/50'}`}/>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── MAIN MODAL ───────────────────────────────────────────────────────────────

function getMinDate() {
  const d = new Date(); d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

const TIME_SLOTS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00']

export default function ClientBookingDetailModal({ bookingId, onClose, onUpdated }) {
  const navigate  = useNavigate()
  const [booking, setBooking] = useState(null)
  const [completion, setCompletion] = useState(null)
  const [bookingReview, setBookingReview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const [rating, setRating] = useState(5)
  const [reviewText, setReviewText] = useState('')
  const [reviewSaving, setReviewSaving] = useState(false)
  const [reviewError, setReviewError] = useState(null)
  const [clientReplyText, setClientReplyText] = useState('')
  const [clientReplySaving, setClientReplySaving] = useState(false)
  const [showClientReplyForm, setShowClientReplyForm] = useState(false)

  // reschedule state
  const [showReschedForm, setShowReschedForm] = useState(false)
  const [reschedDate,     setReschedDate]     = useState('')
  const [reschedTime,     setReschedTime]     = useState('')
  const [reschedMsg,      setReschedMsg]      = useState('')
  const [reschedSaving,   setReschedSaving]   = useState(false)
  const [reschedDone,     setReschedDone]     = useState(false)
  const [reschedError,    setReschedError]    = useState(null)

  useEffect(() => {
    if (!bookingId) return
    setLoading(true)
    Promise.all([
      supabase
        .from('bookings')
        .select(`
          *,
          handyman:handyman_id(id, first_name, last_name, avatar_url),
          service:service_id(id, title, description, base_price, price_per_hour, estimated_duration, photos, categories(name)),
          handyman_profile:handyman_id(handyman_profiles(rating_avg, total_jobs_completed, has_insurance, is_verified, specialties))
        `)
        .eq('id', bookingId)
        .single(),
      supabase
        .from('job_completions')
        .select('id, booking_id, handyman_id, completion_photos, completion_description, client_accepted, client_rating, client_review, client_responded_at, created_at')
        .eq('booking_id', bookingId)
        .maybeSingle(),
      supabase
        .from('reviews')
        .select('id, rating, title, description, created_at, owner_reply, owner_reply_at, client_reply, client_reply_at')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false })
        .maybeSingle(),
    ]).then(([bookingRes, completionRes, reviewRes]) => {
      if (bookingRes.error) {
        setError(bookingRes.error.message)
      } else {
        setBooking(bookingRes.data)
      }

      setCompletion(completionRes.data ?? null)
      setBookingReview(reviewRes.data ?? null)
      setRating(reviewRes.data?.rating ?? completionRes.data?.client_rating ?? 5)
      setReviewText(reviewRes.data?.description ?? completionRes.data?.client_review ?? '')
      setClientReplyText(reviewRes.data?.client_reply ?? '')
      setLoading(false)
    }).catch(err => {
      setError(err?.message ?? 'Nu am putut încărca rezervarea.')
      setLoading(false)
    })
  }, [bookingId])

  const completionPhotos = Array.isArray(completion?.completion_photos) ? completion.completion_photos : []
  const isCompleted = booking?.status === 'completed'
  const isApproved = booking?.status === 'client_approved'
  const isReviewable = !!completion && (isCompleted || isApproved)

  const resolveCurrentUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id ?? null
  }

  const persistReview = async (now) => {
    const reviewerId = await resolveCurrentUserId()
    if (!reviewerId || !booking?.handyman_id) return

    const payload = {
      booking_id: bookingId,
      rating,
      title: booking.service?.title ?? 'Rezervare finalizată',
      description: reviewText.trim() || null,
      review_type: 'for_handyman',
      reviewer_id: reviewerId,
      reviewed_id: booking.handyman_id,
    }

    if (bookingReview?.id) {
      const { error: reviewErr } = await supabase.from('reviews').update(payload).eq('id', bookingReview.id)
      if (reviewErr) throw reviewErr
    } else {
      const { error: reviewErr } = await supabase.from('reviews').insert({ ...payload, created_at: now })
      if (reviewErr) throw reviewErr
    }
  }

  const submitClientReply = async () => {
    if (!bookingReview?.id || !clientReplyText.trim()) return
    setClientReplySaving(true)
    const now = new Date().toISOString()
    const { error } = await supabase.from('reviews').update({
      client_reply: clientReplyText.trim(),
      client_reply_at: now,
    }).eq('id', bookingReview.id)

    if (!error) {
      setBookingReview(prev => prev ? { ...prev, client_reply: clientReplyText.trim(), client_reply_at: now } : prev)
      setShowClientReplyForm(false)
    }
    setClientReplySaving(false)
  }

  const handleApproveBooking = async () => {
    if (!completion) {
      setReviewError('Așteaptă dovezile handymanului înainte de aprobare.')
      return
    }

    setReviewSaving(true)
    setReviewError(null)
    try {
      const now = new Date().toISOString()

      const { error: completionErr } = await supabase.from('job_completions').update({
        client_accepted: true,
        client_rating: rating,
        client_review: reviewText.trim() || null,
        client_responded_at: now,
        payment_released: true,
      }).eq('id', completion.id)
      if (completionErr) throw completionErr

      const { error: bookingErr } = await supabase.from('bookings').update({
        status: 'client_approved',
        updated_at: now,
      }).eq('id', bookingId)
      if (bookingErr) throw bookingErr

      await persistReview(now)

      if (booking?.handyman_id) {
        await supabase.from('notifications').insert({
          user_id: booking.handyman_id,
          type: 'new_review',
          title: 'Rezervarea a fost aprobată',
          body: `Clientul a aprobat lucrarea pentru „${booking.service?.title ?? 'rezervarea'}".`,
          data: { booking_id: bookingId, redirect: '/handyman/reviews' },
        })
      }

      setBooking(prev => prev ? { ...prev, status: 'client_approved' } : prev)
      setBookingReview(prev => prev ? { ...prev, rating, description: reviewText.trim() || null } : { rating, description: reviewText.trim() || null })
      onUpdated?.()
    } catch (e) {
      setReviewError('Eroare: ' + (e.message ?? ''))
    } finally {
      setReviewSaving(false)
    }
  }

  const handleRejectBooking = async () => {
    if (!completion) {
      setReviewError('Așteaptă dovezile handymanului înainte de respingere.')
      return
    }

    setReviewSaving(true)
    setReviewError(null)
    try {
      const now = new Date().toISOString()

      const { error: completionErr } = await supabase.from('job_completions').update({
        client_accepted: false,
        client_responded_at: now,
      }).eq('id', completion.id)
      if (completionErr) throw completionErr

      const { error: bookingErr } = await supabase.from('bookings').update({
        status: 'in_progress',
        updated_at: now,
      }).eq('id', bookingId)
      if (bookingErr) throw bookingErr

      setBooking(prev => prev ? { ...prev, status: 'in_progress' } : prev)
      onUpdated?.()
    } catch (e) {
      setReviewError('Eroare: ' + (e.message ?? ''))
    } finally {
      setReviewSaving(false)
    }
  }

  const handleReschedule = async () => {
    if (!reschedDate || !reschedTime) { setReschedError('Selectează data și ora.'); return }
    setReschedSaving(true); setReschedError(null)
    try {
      await supabase.from('reschedule_requests').insert({
        job_id:       bookingId,
        job_type:     'booking',
        handyman_id:  booking.handyman_id,
        client_id:    booking.client_id,
        proposed_date: reschedDate,
        proposed_time: reschedTime,
        message:      reschedMsg || null,
        status:       'pending_handyman',
        created_at:   new Date().toISOString(),
      })
      if (booking.handyman_id) {
        await supabase.from('notifications').insert({
          user_id: booking.handyman_id,
          type: 'new_offer',
          title: 'Cerere de reprogramare',
          body: `Clientul propune reprogramarea „${booking.service?.title ?? 'rezervarea'}" pe ${reschedDate} la ${reschedTime}.`,
          data: { booking_id: bookingId, redirect: '/handyman/jobs' },
        })
      }
      setReschedDone(true)
      setShowReschedForm(false)
      onUpdated?.()
    } catch(e) {
      setReschedError('Eroare: ' + (e.message ?? ''))
    } finally {
      setReschedSaving(false)
    }
  }

  if (!bookingId) return null

  const slugify = (f, l) =>
    `${f}-${l}`.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')

  const handymanName = booking?.handyman
    ? `${booking.handyman.first_name ?? ''} ${booking.handyman.last_name ?? ''}`.trim()
    : '—'
  const handymanInitials = handymanName.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase()
  const hp = booking?.handyman_profile?.handyman_profiles?.[0] ?? null
  const photos = booking?.service?.photos ?? []

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:px-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[92dvh]"
        onClick={e => e.stopPropagation()}>

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-bold text-gray-800 text-base leading-tight">
              {booking?.service?.title ?? 'Rezervare'}
            </h2>
            <RefBadge id={bookingId} />
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center ml-3 flex-shrink-0">
            <X className="w-4 h-4 text-gray-400"/>
          </button>
        </div>

        {/* ── BODY ── */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500"/>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0"/>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {!loading && !error && booking && (
            <>
              {/* Status + price row */}
              <div className="flex items-center justify-between">
                <StatusBadge status={booking.status}/>
                <div className="text-right">
                  <p className="text-xl font-black text-blue-700">{fmtRON(booking.total)}</p>
                  <p className="text-xs text-gray-400">total cu comision</p>
                </div>
              </div>

              {booking.status === 'delayed' && (
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-3.5">
                  <p className="text-sm font-bold text-orange-800">Rezervare marcată ca întârziată</p>
                  {booking.delay_reason ? (
                    <p className="text-xs text-orange-700 mt-1">Motiv: {booking.delay_reason}</p>
                  ) : (
                    <p className="text-xs text-orange-700 mt-1">Handymanul a anunțat o întârziere pentru această rezervare.</p>
                  )}
                </div>
              )}

              {/* Photos din serviciu */}
              <PhotoGallery photos={photos}/>

              {/* Dovezi handyman */}
              {completion ? (
                <div className="border border-green-100 rounded-xl p-4 bg-green-50/60 space-y-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5"/>
                    <div>
                      <p className="text-sm font-bold text-green-800">Dovezi de finalizare</p>
                      <p className="text-xs text-green-700">
                        Trimise de handyman{completion.created_at ? ` pe ${fmtDate(completion.created_at)}` : ''}.
                      </p>
                    </div>
                  </div>

                  {completionPhotos.length > 0 ? <PhotoGallery photos={completionPhotos}/> : (
                    <div className="h-40 rounded-xl border border-dashed border-green-200 bg-white/70 flex items-center justify-center">
                      <p className="text-sm text-green-600">Nu există poze atașate.</p>
                    </div>
                  )}

                  {completion.completion_description && (
                    <div className="bg-white/80 rounded-xl p-3 border border-green-100">
                      <p className="text-xs font-bold text-green-700 uppercase tracking-wide mb-1">Nota handymanului</p>
                      <p className="text-sm text-gray-700 leading-relaxed italic">"{completion.completion_description}"</p>
                    </div>
                  )}
                </div>
              ) : isCompleted ? (
                <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 flex items-start gap-2">
                  <Loader2 className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5 animate-spin"/>
                  <div>
                    <p className="text-sm font-bold text-yellow-800">Așteptăm dovezile de la handyman</p>
                    <p className="text-xs text-yellow-700 mt-0.5">Lucrarea a fost marcată ca finalizată, dar încă nu au fost încărcate pozele de finalizare.</p>
                  </div>
                </div>
              ) : null}

              {/* Handyman card */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <button onClick={() => {
                  if (booking.handyman?.first_name && booking.handyman?.last_name) {
                    onClose()
                    navigate(`/handymen/${slugify(booking.handyman.first_name, booking.handyman.last_name)}`)
                  }
                }} className="flex-shrink-0">
                  {booking.handyman?.avatar_url
                    ? <img src={booking.handyman.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover hover:ring-2 hover:ring-blue-400 transition"/>
                    : <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm hover:bg-blue-700 transition">{handymanInitials}</div>
                  }
                </button>
                <div className="flex-1 min-w-0">
                  <button onClick={() => {
                    if (booking.handyman?.first_name && booking.handyman?.last_name) {
                      onClose()
                      navigate(`/handymen/${slugify(booking.handyman.first_name, booking.handyman.last_name)}`)
                    }
                  }} className="font-bold text-gray-800 hover:text-blue-600 transition text-left text-sm flex items-center gap-1">
                    {handymanName}
                    {hp?.is_verified && <CheckCircle className="w-3.5 h-3.5 text-blue-500"/>}
                    <ExternalLink className="w-3 h-3 text-gray-300"/>
                  </button>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {hp?.rating_avg > 0 && (
                      <div className="flex items-center gap-1">
                        <StarRow rating={hp.rating_avg}/>
                        <span className="text-xs text-gray-500">{Number(hp.rating_avg).toFixed(1)}</span>
                      </div>
                    )}
                    {hp?.total_jobs_completed > 0 && (
                      <span className="text-xs text-gray-400">{hp.total_jobs_completed} lucrări</span>
                    )}
                    {hp?.has_insurance && (
                      <span className="text-xs text-green-600 flex items-center gap-0.5">
                        <Shield className="w-3 h-3"/>Asigurat
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Service description */}
              {booking.service?.description && (
                <p className="text-sm text-gray-600 leading-relaxed">{booking.service.description}</p>
              )}

              {/* Data + ora programate */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <p className="text-xs text-blue-400 font-medium mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5"/>Data
                  </p>
                  <p className="font-bold text-blue-800 text-sm">{fmtDate(booking.scheduled_date)}</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <p className="text-xs text-blue-400 font-medium mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5"/>Ora
                  </p>
                  <p className="font-bold text-blue-800 text-sm">{booking.scheduled_time ?? '—'}</p>
                </div>
              </div>

              {/* Urgenta + durata */}
              <div className="flex items-center gap-3 flex-wrap">
                {booking.urgency && <UrgencyBadge urgency={booking.urgency}/>}
                {booking.service?.estimated_duration && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                    <Clock className="w-3 h-3"/>{booking.service.estimated_duration}
                  </span>
                )}
                {booking.service?.categories?.name && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                    {booking.service.categories.name}
                  </span>
                )}
              </div>

              {/* Adresa + contact */}
              <div className="space-y-2.5 border border-gray-100 rounded-xl p-4 bg-gray-50">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Detalii serviciu</p>
                {booking.service_address && (
                  <div className="flex items-start gap-2 text-sm text-gray-700">
                    <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5"/>
                    <span>{booking.service_address}</span>
                  </div>
                )}
                {booking.contact_name && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <User className="w-4 h-4 text-gray-400 flex-shrink-0"/>
                    <span>{booking.contact_name}</span>
                  </div>
                )}
                {booking.contact_phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Phone className="w-4 h-4 text-gray-400 flex-shrink-0"/>
                    <a href={`tel:${booking.contact_phone}`} className="hover:text-blue-600 transition">{booking.contact_phone}</a>
                  </div>
                )}
                {booking.contact_email && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Mail className="w-4 h-4 text-gray-400 flex-shrink-0"/>
                    <a href={`mailto:${booking.contact_email}`} className="hover:text-blue-600 transition">{booking.contact_email}</a>
                  </div>
                )}
                {booking.handyman_notes && (
                  <div className="flex items-start gap-2 text-sm text-gray-700 pt-1 border-t border-gray-200 mt-1">
                    <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5"/>
                    <span className="text-gray-500 italic">{booking.handyman_notes}</span>
                  </div>
                )}
              </div>

              {/* Pricing breakdown */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Detalii plată</p>
                </div>
                <div className="p-4 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Preț serviciu</span>
                    <span className="font-semibold text-gray-800">{fmtRON(booking.subtotal)}</span>
                  </div>
                  <div className="border-t border-gray-100 pt-2 mt-1 flex justify-between font-black text-base">
                    <span>Total</span>
                    <span className="text-blue-700">{fmtRON(booking.total)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      {booking.payment_method === 'card'
                        ? <CreditCard className="w-3.5 h-3.5"/>
                        : <Banknote className="w-3.5 h-3.5"/>
                      }
                      <span>{booking.payment_method === 'card' ? 'Card la finalizare' : 'Cash la finalizare'}</span>
                    </div>
                    <span className={`font-semibold ${booking.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                      {booking.payment_status === 'paid' ? 'Plătit' : 'În așteptare'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Note handyman */}
              {booking.special_instructions && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5"/>
                  <p className="text-xs text-yellow-800">{booking.special_instructions}</p>
                </div>
              )}

              {/* Reprogramare */}
              {['confirmed','assigned','in_progress','delayed'].includes(booking.status) && (
                <div className="border border-blue-100 rounded-xl overflow-hidden">
                  {reschedDone ? (
                    <div className="p-4 bg-green-50 flex items-center gap-2 text-green-700 text-sm font-medium">
                      <CheckCircle className="w-4 h-4 flex-shrink-0"/>
                      Cererea de reprogramare a fost trimisă handyman-ului.
                    </div>
                  ) : (
                    <>
                      <button onClick={() => setShowReschedForm(v => !v)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 hover:bg-blue-100 transition text-sm font-semibold text-blue-700">
                        <span className="flex items-center gap-2"><CalendarClock className="w-4 h-4"/>Propune reprogramare</span>
                        <span className="text-xs font-normal text-blue-500">{showReschedForm ? 'Anulează' : 'Deschide'}</span>
                      </button>
                      {showReschedForm && (
                        <div className="p-4 space-y-3 bg-white">
                          {reschedError && <p className="text-xs text-red-600">{reschedError}</p>}
                          <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1.5">Dată nouă *</label>
                            <input type="date" value={reschedDate} min={getMinDate()} onChange={e => setReschedDate(e.target.value)}
                              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1.5">Oră nouă *</label>
                            <div className="grid grid-cols-4 gap-1.5">
                              {TIME_SLOTS.map(t => (
                                <button key={t} onClick={() => setReschedTime(t)}
                                  className={`py-2 rounded-lg text-xs font-medium border transition
                                    ${reschedTime === t ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-400'}`}>
                                  {t}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1.5">Mesaj (opțional)</label>
                            <textarea value={reschedMsg} onChange={e => setReschedMsg(e.target.value)} rows={2}
                              placeholder="Motivul reprogramării..." className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                          </div>
                          <button onClick={handleReschedule} disabled={reschedSaving || !reschedDate || !reschedTime}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50">
                            {reschedSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>}
                            Trimite cererea
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {isReviewable && (
                <div className="border border-orange-100 rounded-xl p-4 bg-orange-50/60 space-y-4">
                  <div>
                    <p className="text-sm font-bold text-orange-800">Evaluează lucrarea</p>
                    <p className="text-xs text-orange-700 mt-0.5">Aprobă lucrarea și lasă o recenzie pentru handyman.</p>
                  </div>

                  {reviewError && (
                    <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{reviewError}</p>
                  )}

                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">Rating *</p>
                    <StarRating value={rating} onChange={setRating} />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Recenzie <span className="font-normal text-gray-400">(opțional)</span></label>
                    <textarea
                      value={reviewText}
                      onChange={e => setReviewText(e.target.value)}
                      rows={3}
                      placeholder="Descrie experiența cu handymanul..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                    />
                  </div>

                  {isApproved && bookingReview && (
                    <div className="border-t border-green-200 pt-4 space-y-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <StarRating value={bookingReview.rating ?? rating} readOnly />
                          <span className="text-sm font-bold text-green-700">{bookingReview.rating ?? rating}/5</span>
                        </div>
                        <p className="text-sm text-gray-700 italic bg-white/70 rounded-xl p-3 border border-green-100">
                          {bookingReview.description ? `"${bookingReview.description}"` : 'Ai aprobat lucrarea fără un comentariu scris.'}
                        </p>
                        {completion?.client_responded_at && (
                          <p className="text-xs text-gray-400">
                            Aprobat pe {new Date(completion.client_responded_at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })}
                          </p>
                        )}
                      </div>

                      {bookingReview.owner_reply && (
                        <div className="bg-blue-50 border-l-4 border-blue-400 rounded-xl p-3 space-y-1">
                          <p className="text-xs font-bold text-blue-600 uppercase tracking-wide">Răspuns handyman</p>
                          <p className="text-sm text-gray-700">{bookingReview.owner_reply}</p>
                          {bookingReview.owner_reply_at && (
                            <p className="text-xs text-gray-400">
                              {new Date(bookingReview.owner_reply_at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                          )}
                        </div>
                      )}

                      {bookingReview.owner_reply && (
                        bookingReview.client_reply ? (
                          <div className="bg-gray-50 border-l-4 border-gray-300 rounded-xl p-3 space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Răspunsul tău</p>
                              <button onClick={() => setShowClientReplyForm(true)}
                                className="text-xs text-blue-600 hover:underline">Editează</button>
                            </div>
                            <p className="text-sm text-gray-700">{bookingReview.client_reply}</p>
                          </div>
                        ) : (
                          !showClientReplyForm && (
                            <button onClick={() => setShowClientReplyForm(true)}
                              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition">
                              <MessageSquare className="w-4 h-4" /> Răspunde handymanului
                            </button>
                          )
                        )
                      )}

                      {showClientReplyForm && bookingReview.owner_reply && (
                        <div className="border border-gray-200 rounded-xl p-3 bg-white space-y-2">
                          <p className="text-xs font-bold text-gray-600">
                            {bookingReview.client_reply ? 'Editează răspunsul tău' : 'Răspunde handymanului'}
                          </p>
                          <textarea
                            value={clientReplyText}
                            onChange={e => setClientReplyText(e.target.value)}
                            rows={3}
                            placeholder="Scrie răspunsul tău..."
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => { setShowClientReplyForm(false); setClientReplyText(bookingReview.client_reply ?? '') }}
                              className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                              <X className="w-3.5 h-3.5" /> Anulează
                            </button>
                            <button onClick={submitClientReply} disabled={clientReplySaving || !clientReplyText.trim()}
                              className="flex items-center gap-1 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition">
                              {clientReplySaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                              Trimite
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {!isApproved && (
                    <div className="flex gap-2">
                      <button
                        onClick={handleRejectBooking}
                        disabled={reviewSaving}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-red-300 text-red-600 bg-white rounded-xl text-sm font-medium hover:bg-red-50 transition disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" /> Respinge
                      </button>
                      <button
                        onClick={handleApproveBooking}
                        disabled={reviewSaving || !completion}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50"
                      >
                        {reviewSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Aprobă lucrarea
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Creat la */}
              <p className="text-xs text-gray-400 text-center">Rezervare creată: {fmtDate(booking.created_at)}</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
