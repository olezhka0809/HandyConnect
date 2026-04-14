import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../supabase'
import {
  X, Edit3, Save, XCircle, Camera, MapPin, Calendar,
  Clock, DollarSign, Tag, Shield, AlertTriangle, Zap,
  Star, Briefcase, Loader2, MessageSquare, Info,
  CheckCircle, ChevronLeft, ChevronRight, Trash2,
  User, Send, RotateCcw, BadgeCheck, ChevronDown, CalendarClock,
  Layers, Square, Wrench, Paintbrush, Hammer, Sparkles,
  Flower2, Sofa, CircuitBoard, Lightbulb, Building2,
  MoreHorizontal, Droplets, Plug, Heart, ZoomIn, ZoomOut
} from 'lucide-react'

function slugify(first, last) {
  return `${first}-${last}`.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

// ─── category icon map ────────────────────────────────────────────────────────
const ICON_MAP = {
  bolt: Plug, Droplets, 'paint-roller': Paintbrush, square: Square,
  wallpaper: Layers, pipe: Wrench, Wrench, Zap, Paintbrush, Hammer,
  Sparkles, Flower2, Sofa, CircuitBoard, Lightbulb, Building2, MoreHorizontal,
}
function CategoryIcon({ iconName, className = 'w-4 h-4' }) {
  const Icon = ICON_MAP[iconName] ?? Wrench
  return <Icon className={className} />
}

// ─── urgency badge ────────────────────────────────────────────────────────────
function UrgencyBadge({ urgency }) {
  const map = {
    high:   { label: 'Urgent', Icon: AlertTriangle, cls: 'bg-red-100 text-red-700 border-red-200' },
    medium: { label: 'Mediu',  Icon: Zap,           cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    low:    { label: 'Normal', Icon: Clock,          cls: 'bg-green-100 text-green-700 border-green-200' },
    normal: { label: 'Normal', Icon: Clock,          cls: 'bg-green-100 text-green-700 border-green-200' },
  }
  const cfg = map[urgency] ?? map.normal
  const Icon = cfg.Icon
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  )
}

// ─── avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, avatarUrl, size = 'md' }) {
  const sizeMap = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' }
  const cls = sizeMap[size] ?? sizeMap.md
  const initials = name ? name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('') : '?'
  if (avatarUrl) return <img src={avatarUrl} alt={name} className={`${cls} rounded-full object-cover flex-shrink-0`} />
  return (
    <div className={`${cls} rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white font-bold flex items-center justify-center flex-shrink-0`}>
      {initials}
    </div>
  )
}

// ─── lightbox ─────────────────────────────────────────────────────────────────
function Lightbox({ photos, startIndex = 0, onClose }) {
  const [current, setCurrent] = useState(startIndex)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    setScale(1)
  }, [current])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setCurrent(i => Math.min(photos.length - 1, i + 1))
      if (e.key === 'ArrowLeft')  setCurrent(i => Math.max(0, i - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [photos.length, onClose])

  return (
    <div className="fixed inset-0 bg-black/90 z-[80] flex flex-col" onClick={onClose}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" onClick={e => e.stopPropagation()}>
        <span className="text-white text-sm font-medium">{current + 1} / {photos.length}</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setScale(s => Math.max(0.5, +(s - 0.25).toFixed(2)))}
            className="w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-white text-xs w-10 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(4, +(s + 0.25).toFixed(2)))}
            className="w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Image area */}
      <div className="flex-1 flex items-center justify-center overflow-hidden relative" onClick={e => e.stopPropagation()}>
        {photos.length > 1 && (
          <button onClick={() => setCurrent(i => Math.max(0, i - 1))} disabled={current === 0}
            className="absolute left-3 z-10 w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center disabled:opacity-20 hover:bg-black/60 transition">
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <div className="max-w-full max-h-full overflow-auto flex items-center justify-center">
          <img
            src={photos[current]}
            alt=""
            style={{ transform: `scale(${scale})`, transformOrigin: 'center', transition: 'transform 0.15s ease' }}
            className="max-w-[90vw] max-h-[80vh] object-contain select-none"
            draggable={false}
          />
        </div>
        {photos.length > 1 && (
          <button onClick={() => setCurrent(i => Math.min(photos.length - 1, i + 1))} disabled={current === photos.length - 1}
            className="absolute right-3 z-10 w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center disabled:opacity-20 hover:bg-black/60 transition">
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Thumbnails */}
      {photos.length > 1 && (
        <div className="flex gap-2 px-4 py-3 overflow-x-auto justify-center flex-shrink-0" onClick={e => e.stopPropagation()}>
          {photos.map((url, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className={`w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border-2 transition ${i === current ? 'border-white' : 'border-white/20'}`}>
              <img src={url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── photo gallery ────────────────────────────────────────────────────────────
function PhotoGallery({ photos }) {
  const [active, setActive] = useState(0)
  const [lightboxIndex, setLightboxIndex] = useState(null)
  if (!photos?.length) return null
  return (
    <div className="space-y-2">
      <div className="relative rounded-xl overflow-hidden bg-gray-100" style={{ minHeight: '11rem' }}>
        <img src={photos[active]} alt="" className="w-full object-contain max-h-64 cursor-pointer"
          onClick={() => setLightboxIndex(active)}
          onError={(e) => { e.currentTarget.src = '' }} />
        {photos.length > 1 && (
          <>
            <button onClick={() => setActive(i => Math.max(0, i - 1))} disabled={active === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center disabled:opacity-30 hover:bg-black/60 transition">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setActive(i => Math.min(photos.length - 1, i + 1))} disabled={active === photos.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center disabled:opacity-30 hover:bg-black/60 transition">
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
              {active + 1} / {photos.length}
            </div>
          </>
        )}
        <button onClick={() => setLightboxIndex(active)}
          className="absolute bottom-2 left-2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition">
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
      </div>
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((url, i) => (
            <button key={i} onClick={() => setActive(i)}
              className={`w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border-2 transition ${i === active ? 'border-blue-500' : 'border-transparent'}`}>
              <img src={url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
      {lightboxIndex !== null && (
        <Lightbox photos={photos} startIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
    </div>
  )
}

// ─── offer card ───────────────────────────────────────────────────────────────
function OfferCard({ offer, onAccept, onNegotiate, onDecline, accepting, readOnly }) {
  const [expanded, setExpanded] = useState(false)
  const handymanName = offer.handyman
    ? `${offer.handyman.first_name ?? ''} ${offer.handyman.last_name ?? ''}`.trim()
    : 'Handyman anonim'

  const statusMap = {
    pending:    { label: 'În așteptare', cls: 'bg-yellow-100 text-yellow-700' },
    accepted:   { label: 'Acceptată',   cls: 'bg-green-100 text-green-700' },
    rejected:   { label: 'Refuzată',    cls: 'bg-red-100 text-red-700' },
    negotiating:{ label: 'Negociere',   cls: 'bg-blue-100 text-blue-700' },
  }
  const statusCfg = statusMap[offer.status] ?? statusMap.pending

  return (
    <div className={`border rounded-xl overflow-hidden transition ${
      offer.status === 'accepted' ? 'border-green-300 bg-green-50' :
      offer.status === 'rejected' ? 'border-gray-200 bg-gray-50 opacity-60' :
      'border-gray-200 bg-white'
    }`}>
      {/* header row */}
      <div className="p-3 flex items-center gap-3">
        <Avatar name={handymanName} avatarUrl={offer.handyman?.avatar_url} size="md" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm truncate">{handymanName}</p>
          {offer.handyman?.city && (
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5" />{offer.handyman.city}
            </p>
          )}
          {offer.handyman?.average_rating > 0 && (
            <div className="flex items-center gap-1 mt-0.5">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              <span className="text-xs text-gray-600">{Number(offer.handyman.average_rating).toFixed(1)}</span>
            </div>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-lg font-bold text-blue-600">
            {Number(offer.proposed_price).toLocaleString('ro-RO')} RON
          </p>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusCfg.cls}`}>
            {statusCfg.label}
          </span>
        </div>
      </div>

      {/* details row */}
      <div className="px-3 pb-2 flex items-center gap-4 text-xs text-gray-500 border-t border-gray-100 pt-2">
        {offer.estimated_duration && (
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{offer.estimated_duration}</span>
        )}
        {offer.available_date && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(offer.available_date).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' })}
            {offer.available_time ? ` · ${offer.available_time}` : ''}
          </span>
        )}
        {offer.message && (
          <button onClick={() => setExpanded(e => !e)}
            className="ml-auto flex items-center gap-1 text-blue-500 hover:text-blue-700">
            <MessageSquare className="w-3 h-3" />
            Mesaj
            <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {/* expandable message */}
      {expanded && offer.message && (
        <div className="px-3 pb-3">
          <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 italic">"{offer.message}"</p>
        </div>
      )}

      {/* actions */}
      {offer.status === 'pending' && !readOnly && (
        <div className="flex gap-2 px-3 pb-3">
          <button onClick={() => onAccept(offer)} disabled={accepting}
            className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 text-white py-2 rounded-lg text-xs font-semibold hover:bg-green-700 transition disabled:opacity-50">
            <CheckCircle className="w-3.5 h-3.5" />
            {accepting ? 'Se procesează…' : 'Acceptă'}
          </button>
          <button onClick={() => onNegotiate(offer)}
            className="flex-1 flex items-center justify-center gap-1.5 border border-blue-300 text-blue-600 py-2 rounded-lg text-xs font-semibold hover:bg-blue-50 transition">
            <Send className="w-3.5 h-3.5" /> Negociază
          </button>
          <button onClick={() => onDecline(offer)}
            className="flex items-center justify-center px-3 py-2 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition">
            <XCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {offer.status === 'pending' && readOnly && (
        <div className="flex items-center gap-2 px-3 pb-3 text-amber-700 text-xs font-semibold">
          <Info className="w-4 h-4" /> Ofertele sunt închise după atribuirea task-ului
        </div>
      )}
      {offer.status === 'accepted' && (
        <div className="flex items-center gap-2 px-3 pb-3 text-green-700 text-xs font-semibold">
          <BadgeCheck className="w-4 h-4" /> Ofertă acceptată — handymanul a fost notificat
        </div>
      )}
    </div>
  )
}

// ─── negotiate modal ──────────────────────────────────────────────────────────
function NegotiateModal({ offer, onClose, onSend }) {
  const [price, setPrice] = useState(offer?.proposed_price ?? '')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  if (!offer) return null

  const handleSend = async () => {
    setSending(true)
    await onSend(offer, { price, message })
    setSending(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-gray-800 mb-1">Contra-ofertă</h3>
        <p className="text-xs text-gray-400 mb-4">
          Handyman a propus <strong>{Number(offer.proposed_price).toLocaleString('ro-RO')} RON</strong>
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Prețul tău (RON)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="number" value={price} onChange={e => setPrice(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Mesaj (opțional)</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)}
              rows={3} placeholder="Explică propunerea ta…"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm" />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
            Anulează
          </button>
          <button onClick={handleSend} disabled={!price || sending}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50">
            {sending ? 'Se trimite…' : 'Trimite contra-oferta'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── star rating ──────────────────────────────────────────────────────────────
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
          className={`w-9 h-9 flex items-center justify-center rounded-lg transition
            ${readOnly ? 'cursor-default' : 'hover:scale-110 cursor-pointer'}`}
        >
          <Star className={`w-7 h-7 transition-colors ${n <= display ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`} />
        </button>
      ))}
    </div>
  )
}

// ─── rework date confirm card (client side) ───────────────────────────────────
function ReworkDateConfirmCard({ dispute, handymanId, onRefresh }) {
  const [mode,         setMode]         = useState('idle')  // idle | propose | saving
  const [proposedDate, setProposedDate] = useState('')
  const [proposedTime, setProposedTime] = useState('')
  const [error,        setError]        = useState(null)

  const timeline = (() => {
    try { return Array.isArray(dispute.timeline) ? dispute.timeline : JSON.parse(dispute.timeline ?? '[]') }
    catch { return [] }
  })()

  const DATE_EVENTS = ['client_proposed_new_rework_date', 'handyman_proposed_new_rework_date', 'handyman_confirmed_client_date']
  const sortedTl    = [...timeline].sort((a, b) => new Date(a.at ?? 0) - new Date(b.at ?? 0))
  const lastDateEvt = [...sortedTl].reverse().find(e => DATE_EVENTS.includes(e.event))
  const clientProposedEvent    = timeline.find(e => e.event === 'client_proposed_new_rework_date')
  const handymanConfirmedEvent = timeline.find(e => e.event === 'handyman_confirmed_client_date')
  // waitingHandyman = last event was from the client side (ball in handyman's court)
  const waitingHandyman = lastDateEvt?.event === 'client_proposed_new_rework_date'
  const confirmedByClient = !!dispute.client_rework_confirmed_at || !!handymanConfirmedEvent

  const fmt = (iso) => {
    if (!iso) return '—'
    const d = new Date(iso)
    const base = d.toLocaleDateString('ro-RO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    const t = d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })
    return t !== '00:00' ? `${base} la ${t}` : base
  }

  const ALL_TIMES  = [
    '07:00','07:30','08:00','08:30','09:00','09:30',
    '10:00','10:30','11:00','11:30','12:00','12:30',
    '13:00','13:30','14:00','14:30','15:00','15:30',
    '16:00','16:30','17:00','17:30','18:00','18:30','19:00',
  ]
  const todayStr   = new Date().toISOString().split('T')[0]
  const nowMins    = new Date().getHours() * 60 + new Date().getMinutes()
  const toMins     = t => { const [h, m] = t.split(':'); return parseInt(h) * 60 + parseInt(m) }
  const availTimes = proposedDate === todayStr
    ? ALL_TIMES.filter(t => toMins(t) > nowMins)
    : ALL_TIMES

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
      // Notify admins that rework is scheduled
      try {
        const { data: roleRow } = await supabase.from('roles').select('id').eq('name','admin').single()
        if (roleRow?.id) {
          const { data: admins } = await supabase.from('user_roles').select('user_id').eq('role_id', roleRow.id)
          for (const { user_id } of (admins ?? [])) {
            await supabase.from('notifications').insert({
              user_id,
              type:  'rework_scheduled',
              title: 'Relucrare programată — confirmare client',
              body:  `Clientul a confirmat data relucrării. Meșterul poate începe lucrarea.`,
              data:  { dispute_id: dispute.id, redirect: '/admin/dashboard?tab=disputes' },
            })
          }
        }
      } catch(e) { console.warn('[ClientModal] admin notify error:', e?.message) }
      onRefresh()
    } catch (e) { setError(e.message); setMode('idle') }
  }

  const handleProposeDate = async () => {
    if (!proposedDate) return
    setMode('saving')
    setError(null)
    try {
      const { data, error: err } = await supabase.rpc('client_confirm_rework_date', {
        p_dispute_id:    dispute.id,
        p_action:        'propose',
        p_proposed_date: proposedDate,
        p_proposed_time: proposedTime || null,
      })
      if (err) throw err
      if (data?.error) throw new Error(data.error)
      if (handymanId) {
        const dateLabel = new Date(`${proposedDate}T${proposedTime || '09:00'}:00`)
          .toLocaleDateString('ro-RO', { weekday: 'short', day: '2-digit', month: 'short' })
        await supabase.from('notifications').insert({
          user_id: handymanId,
          type:    'rework_date_proposal',
          title:   'Clientul a propus o dată pentru relucrare',
          body:    `O dată alternativă a fost propusă: ${dateLabel}. Confirmă în secțiunea Reprogramate.`,
          data:    { dispute_id: dispute.id, redirect: '/handyman/jobs?tab=reschedule' },
        })
      }
      onRefresh()
    } catch (e) { setError(e.message); setMode('idle') }
  }

  if (confirmedByClient) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-3 space-y-1">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
          <p className="text-sm font-bold text-green-800">Data confirmată</p>
        </div>
        <p className="text-xs text-green-700">Relucrarea va fi efectuată pe <strong>{fmt(dispute.rework_deadline)}</strong>.</p>
        <p className="text-xs text-green-400">Meșterul a fost notificat.</p>
      </div>
    )
  }

  if (waitingHandyman) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-1">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <p className="text-sm font-bold text-blue-800">Aștepți confirmarea meșterului</p>
        </div>
        <p className="text-xs text-blue-700">
          Ai propus data: <strong>{fmt(clientProposedEvent.extra?.new_deadline)}</strong>.
        </p>
        <p className="text-xs text-blue-400">Meșterul trebuie să confirme noua dată.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2 py-1">{error}</p>}

      {dispute.rework_deadline ? (
        <div>
          <p className="text-xs font-bold text-orange-700 mb-1">
            {lastDateEvt?.event === 'handyman_proposed_new_rework_date' ? 'Meșterul a propus o nouă dată:' : 'Data propusă de meșter:'}
          </p>
          <div className="flex items-center gap-2 bg-white border border-orange-200 rounded-lg px-3 py-2.5">
            <CalendarClock className="w-4 h-4 text-orange-500 flex-shrink-0" />
            <p className="text-sm font-semibold text-gray-800">{fmt(dispute.rework_deadline)}</p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2.5">
          <CalendarClock className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-800">Meșterul nu a propus încă o dată. Poți propune tu o dată mai jos.</p>
        </div>
      )}

      {mode === 'propose' ? (
        <div className="space-y-2">
          <p className="text-xs font-bold text-orange-700">Propune o altă dată:</p>
          <div>
            <label className="text-[10px] font-semibold text-orange-600 mb-0.5 block">Data *</label>
            <input type="date" value={proposedDate} min={new Date().toISOString().split('T')[0]}
              onChange={e => {
                const d = e.target.value
                setProposedDate(d)
                if (d === todayStr && proposedTime && toMins(proposedTime) <= nowMins) setProposedTime('')
              }}
              className="w-full px-2.5 py-2.5 border border-orange-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-orange-600 mb-0.5 block">Ora</label>
            {availTimes.length === 0 && proposedDate ? (
              <p className="text-xs text-orange-600 italic">Nu mai sunt ore disponibile azi — alege altă zi.</p>
            ) : (
              <div className="grid grid-cols-4 gap-1.5">
                {availTimes.map(t => (
                  <button key={t} type="button" onClick={() => setProposedTime(t === proposedTime ? '' : t)}
                    className={`py-2 rounded-xl text-xs font-medium border transition-all
                      ${proposedTime === t
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-white border-orange-200 text-orange-700 hover:bg-orange-50'}`}>
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setMode('idle')} className="flex-1 py-2 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50 transition">
              Înapoi
            </button>
            <button onClick={handleProposeDate} disabled={mode === 'saving' || !proposedDate}
              className="flex-1 py-2 bg-orange-600 text-white rounded-lg text-xs font-bold hover:bg-orange-700 disabled:opacity-50 transition"
            >
              {mode === 'saving' ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : 'Trimite propunerea'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          {dispute.rework_deadline && (
            <button onClick={handleConfirm} disabled={mode === 'saving'}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
            >
              {mode === 'saving' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><CheckCircle className="w-3.5 h-3.5" /> Confirmă data</>}
            </button>
          )}
          <button onClick={() => setMode('propose')} disabled={mode === 'saving'}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-orange-300 text-orange-700 bg-white text-xs font-bold rounded-lg hover:bg-orange-50 transition`}
          >
            <CalendarClock className="w-3.5 h-3.5" /> {dispute.rework_deadline ? 'Propune altă dată' : 'Propune o dată'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── dispute journey section ──────────────────────────────────────────────────
function DisputeJourneySection({ dispute, reworkHandyman, task: taskObj, taskId, taskTitle, handymanId, clientId, onRefresh, onMsg }) {
  const [ratingVal,       setRatingVal]       = useState(5)
  const [reviewTxt,       setReviewTxt]       = useState('')
  const [saving,          setSaving]          = useState(false)
  const [error,           setError]           = useState(null)

  // Rework form state — used when client wants to post rework to marketplace
  const [reworkFormMode,      setReworkFormMode]      = useState(null) // null | 'choice' | 'resolution'
  const [reworkDesc,          setReworkDesc]          = useState('')
  const [reworkPhotoFiles,    setReworkPhotoFiles]    = useState([])
  const [reworkPhotoPreviews, setReworkPhotoPreviews] = useState([])
  const [reworkUploading,     setReworkUploading]     = useState(false)
  const [choiceLoading,   setChoiceLoading]   = useState(null)
  const [refundStep,      setRefundStep]      = useState(null)   // null | 'partial_input' | 'partial_confirm' | 'full_confirm'
  const [partialEstimate, setPartialEstimate] = useState('')

  // Extra evidence state (evidence_requested_client flow)
  const [extraEvidenceText,  setExtraEvidenceText]  = useState('')
  const [extraEvidenceFiles, setExtraEvidenceFiles] = useState([])
  const [extraEvPreviews,    setExtraEvPreviews]    = useState([])
  const [extraEvSubmitting,  setExtraEvSubmitting]  = useState(false)

  const parseJson    = (val) => { if (Array.isArray(val)) return val; try { return JSON.parse(val ?? '[]') } catch { return [] } }
  const timeline     = parseJson(dispute.timeline)
  const clientPhotos = parseJson(dispute.photos)
  const handymanEvid = parseJson(dispute.handyman_evidence)

  const fmt = (iso) => {
    if (!iso) return '—'
    const d = new Date(iso)
    const base = d.toLocaleDateString('ro-RO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    const h = d.getHours(), m = d.getMinutes()
    return (h || m) ? `${base} la ${d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}` : base
  }

  const toSlug = (first, last) =>
    `${first ?? ''}-${last ?? ''}`
      .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')

  const adminDecision = (() => {
    try { return typeof dispute.admin_decision === 'string' ? JSON.parse(dispute.admin_decision) : dispute.admin_decision }
    catch { return null }
  })()

  const handleApproveRework = async () => {
    setSaving(true); setError(null)
    try {
      const now = new Date().toISOString()
      let cId = clientId
      if (!cId) {
        const { data: { user } } = await supabase.auth.getUser()
        cId = user?.id
      }
      // Try original task first; fall back to rework_task_id for older records
      let compId = null
      const { data: comps } = await supabase.from('job_completions')
        .select('id').eq('job_id', taskId).eq('job_type', 'task')
        .order('created_at', { ascending: false }).limit(1)
      compId = comps?.[0]?.id
      if (!compId && dispute.rework_task_id) {
        const { data: comps2 } = await supabase.from('job_completions')
          .select('id').eq('job_id', dispute.rework_task_id).eq('job_type', 'task')
          .order('created_at', { ascending: false }).limit(1)
        compId = comps2?.[0]?.id
      }
      if (!compId) throw new Error('Nu s-a găsit finalizarea lucrării.')

      await supabase.from('job_completions').update({
        client_accepted: true, client_rating: ratingVal,
        client_review: reviewTxt || null,
        client_responded_at: now, payment_released: true, payment_released_at: now,
      }).eq('id', compId)

      await supabase.from('tasks').update({ status: 'client_approved', updated_at: now }).eq('id', taskId)

      if (cId && handymanId) {
        await supabase.from('reviews').insert({
          task_id: taskId, rating: ratingVal, title: taskTitle || null,
          description: reviewTxt || null, review_type: 'for_handyman',
          reviewer_id: cId, reviewed_id: handymanId, created_at: now,
        })
      }
      await supabase.from('task_disputes').update({ status: 'resolved' }).eq('id', dispute.id)

      onMsg?.('Relucrarea a fost aprobată și recenzia salvată!')
      onRefresh()
    } catch (e) { setError(e.message); setSaving(false) }
  }

  // If the task is already rework_completed but dispute got stuck in an earlier state, show correct section
  const REWORK_STUCK = ['rework_accepted', 'rework_scheduled', 'rework_in_progress']
  const STATUS = REWORK_STUCK.includes(dispute.status) && taskObj?.status === 'rework_completed'
    ? 'rework_completed'
    : dispute.status

  const openReworkForm = (mode) => {
    setReworkFormMode(mode)
    setReworkDesc(taskObj?.description ?? '')
    setReworkPhotoFiles([])
    setReworkPhotoPreviews([])
  }

  const handleReworkPhotoSelect = (files) => {
    const arr = Array.from(files ?? [])
    setReworkPhotoFiles(arr)
    setReworkPhotoPreviews(arr.map(f => URL.createObjectURL(f)))
  }

  const handleSubmitRework = async () => {
    setReworkUploading(true); setError(null)
    try {
      let uploadedUrls = []
      if (reworkPhotoFiles.length > 0) {
        uploadedUrls = await Promise.all(reworkPhotoFiles.map(async file => {
          const ext  = file.name.split('.').pop()
          const path = `rework/${taskId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
          const { error: upErr } = await supabase.storage.from('dispute-photos').upload(path, file)
          if (upErr) throw upErr
          return supabase.storage.from('dispute-photos').getPublicUrl(path).data.publicUrl
        }))
      }
      const rpcName = reworkFormMode === 'choice' ? 'client_respond_rework_choice' : 'client_request_resolution'
      const params  = reworkFormMode === 'choice'
        ? { p_dispute_id: dispute.id, p_choice: 'reassign',
            p_new_description: reworkDesc || null,
            p_new_photos: uploadedUrls.length ? uploadedUrls : null }
        : { p_dispute_id: dispute.id, p_request: 'reassign',
            p_new_description: reworkDesc || null,
            p_new_photos: uploadedUrls.length ? uploadedUrls : null }
      const { error: e } = await supabase.rpc(rpcName, params)
      if (e) throw e
      setReworkFormMode(null)
      onMsg?.('Taskul de relucrare a fost postat în marketplace!')
      onRefresh()
    } catch (e) {
      setError('Eroare la postarea relucrării: ' + e.message)
    } finally {
      setReworkUploading(false)
    }
  }

  const handleReworkChoice = async (choice) => {
    if (choice === 'reassign') { openReworkForm('choice'); return }
    setChoiceLoading(choice); setError(null)
    const { error: e } = await supabase.rpc('client_respond_rework_choice', {
      p_dispute_id: dispute.id,
      p_choice: choice,
      p_new_description: null,
      p_new_photos: null,
    })
    setChoiceLoading(null)
    if (e) { setError(e.message); return }
    onMsg?.(
      choice === 'accept_current' ? 'Relucrarea va continua cu meșterul actual!' :
                                    'Lucrarea a fost anulată.'
    )
    onRefresh()
  }

  const handleResolutionRequest = async (request) => {
    if (request === 'reassign') { openReworkForm('resolution'); return }
    setChoiceLoading(request); setError(null)
    const { error: e } = await supabase.rpc('client_request_resolution', {
      p_dispute_id: dispute.id, p_request: request,
    })
    if (!e && request === 'partial_refund' && partialEstimate) {
      await supabase.from('task_disputes')
        .update({ client_refund_estimate: Number(partialEstimate) })
        .eq('id', dispute.id)
    }
    setChoiceLoading(null)
    setRefundStep(null)
    setPartialEstimate('')
    if (e) { setError(e.message); return }
    onMsg?.('Preferința ta a fost transmisă administratorului.')
    onRefresh()
  }

  const ADMIN_ID = 'e7c2a8fa-c2ef-4486-8937-97807b6b04f5'

  const handleSubmitClientEvidence = async () => {
    setExtraEvSubmitting(true); setError(null)
    try {
      let uploadedUrls = []
      if (extraEvidenceFiles.length > 0) {
        uploadedUrls = await Promise.all(extraEvidenceFiles.map(async file => {
          const ext  = file.name.split('.').pop()
          const path = `evidence/${dispute.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
          const { error: upErr } = await supabase.storage.from('dispute-photos').upload(path, file)
          if (upErr) throw upErr
          return supabase.storage.from('dispute-photos').getPublicUrl(path).data.publicUrl
        }))
      }
      const now = new Date().toISOString()
      const newTimeline = [...timeline, {
        event: 'evidence_submitted_by_client',
        at: now,
        ...(extraEvidenceText ? { text: extraEvidenceText } : {}),
        ...(uploadedUrls.length ? { photos: uploadedUrls } : {}),
      }]
      await supabase.from('task_disputes').update({ status: 'admin_review', timeline: newTimeline }).eq('id', dispute.id)
      await supabase.from('notifications').insert({
        user_id: ADMIN_ID,
        type: 'dispute_update',
        title: 'Dovezi suplimentare primite',
        body: `Clientul a trimis dovezi pentru disputa #${dispute.id.slice(0, 8)}`,
        data: { disputeId: dispute.id, section: 'disputes', filter: 'admin_review', redirect: '/admin/dashboard?section=disputes' },
      })
      setExtraEvidenceText(''); setExtraEvidenceFiles([]); setExtraEvPreviews([])
      onMsg?.('Dovezile au fost trimise adminului!')
      onRefresh()
    } catch (e) {
      setError('Eroare la trimiterea dovezilor: ' + e.message)
    } finally {
      setExtraEvSubmitting(false)
    }
  }

  const handleRefuseClientEvidence = async () => {
    setExtraEvSubmitting(true); setError(null)
    try {
      const now = new Date().toISOString()
      const newTimeline = [...timeline, { event: 'evidence_refused_by_client', at: now }]
      await supabase.from('task_disputes').update({ status: 'admin_review', timeline: newTimeline }).eq('id', dispute.id)
      await supabase.from('notifications').insert({
        user_id: ADMIN_ID,
        type: 'dispute_update',
        title: 'Clientul a refuzat cererea de dovezi',
        body: `Disputa #${dispute.id.slice(0, 8)} — clientul nu poate trimite dovezi`,
        data: { disputeId: dispute.id, section: 'disputes', filter: 'admin_review', redirect: '/admin/dashboard?section=disputes' },
      })
      onMsg?.('Adminul a fost notificat că ai refuzat cererea.')
      onRefresh()
    } catch (e) {
      setError('Eroare: ' + e.message)
    } finally {
      setExtraEvSubmitting(false)
    }
  }

  const eventLabel = {
    dispute_opened:                   'Dispută deschisă',
    dispute_contested:                'Meșterul a contestat disputa',
    rework_accepted:                  'Meșterul a acceptat relucrarea',
    client_accepted_rework:           'Ai acceptat relucrarea',
    rework_rejected:                  'Meșterul a contestat disputa',
    rework_date_confirmed_by_client:  'Data relucrării confirmată de tine',
    client_proposed_new_rework_date:      'Ai propus o altă dată',
    handyman_confirmed_client_date:       'Meșterul a confirmat noua dată',
    handyman_proposed_new_rework_date:    'Meșterul a propus o nouă dată',
    auto_escalated_to_admin:          'Escalat automat la administrator',
    admin_decision:                   'Decizie administrator',
    admin_proposed_rework:            'Administratorul a propus relucrarea amiabilă',
    admin_resolved:                   'Decizie finală administrator',
    handyman_accepted_admin_proposal: 'Meșterul a acceptat propunerea de relucrare',
    handyman_declined_rework_proposal:'Meșterul a refuzat propunerea de relucrare',
    awaiting_client_rework_choice:    'Se așteaptă alegerea ta',
    handyman_declined_rework:         'Meșterul a refuzat relucrarea',
    client_chose_accept_current:      'Ai ales să continui cu meșterul actual',
    client_chose_reassign:            'Ai ales relucrare cu alt meșter',
    client_chose_cancel_no_refund:    'Ai anulat fără rambursare',
    client_requested_reassign:        'Ai solicitat relucrare cu alt meșter',
    client_requested_partial_refund:  'Ai solicitat rambursare parțială',
    client_requested_full_refund:     'Ai solicitat rambursare totală',
    client_requested_resolution:      'Ai trimis preferința ta',
    admin_requested_evidence_from_client:   'Adminul a solicitat dovezi de la tine',
    admin_requested_evidence_from_handyman: 'Adminul a solicitat dovezi de la meșter',
    evidence_submitted_by_client:           'Ai trimis dovezi suplimentare',
    evidence_refused_by_client:             'Ai refuzat cererea de dovezi',
    evidence_submitted:                     'Meșterul a trimis dovezi suplimentare',
    evidence_refused:                       'Meșterul a refuzat cererea de dovezi',
    handyman_responded:                     'Meșterul a răspuns la dispută',
  }

  const sortedEvents = [...timeline].sort((a, b) => new Date(a.at ?? 0) - new Date(b.at ?? 0))

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">{error}</div>
      )}

      {/* ── Rework form: shown when client wants to post reassign rework ── */}
      {reworkFormMode && (
        <div className="border border-sky-300 rounded-xl overflow-hidden">
          <div className="bg-sky-50 px-4 py-2.5 border-b border-sky-200 flex items-center gap-2">
            <RotateCcw className="w-3.5 h-3.5 text-sky-600" />
            <p className="text-xs font-bold text-sky-700 uppercase tracking-wide">Personalizează taskul de relucrare</p>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-xs text-gray-600">Taskul va fi postat public în marketplace. Poți actualiza descrierea sau adăuga poze noi cu problema actuală. Adresa și detaliile rămân neschimbate.</p>

            {/* Address readonly info */}
            {(taskObj?.address_city || taskObj?.service_address) && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{[taskObj.service_address, taskObj.address_city, taskObj.address_county].filter(Boolean).join(', ')}</span>
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Descriere problemă</label>
              <textarea
                value={reworkDesc}
                onChange={e => setReworkDesc(e.target.value)}
                rows={3}
                placeholder="Descrie ce nu a fost efectuat corect sau ce trebuie refăcut..."
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>

            {/* Photo upload */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Poze cu problema (opțional)</label>
              <label className="flex items-center gap-2 px-3 py-2.5 border border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-sky-400 hover:bg-sky-50 transition text-sm text-gray-500">
                <Camera className="w-4 h-4" />
                <span>{reworkPhotoFiles.length > 0 ? `${reworkPhotoFiles.length} ${reworkPhotoFiles.length === 1 ? 'poză selectată' : 'poze selectate'}` : 'Adaugă poze'}</span>
                <input type="file" accept="image/*" multiple className="hidden"
                  onChange={e => handleReworkPhotoSelect(e.target.files)} />
              </label>
              {reworkPhotoPreviews.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {reworkPhotoPreviews.map((url, i) => (
                    <img key={i} src={url} alt="" className="w-16 h-16 rounded-lg object-cover border border-sky-200" />
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setReworkFormMode(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition"
              >
                Înapoi
              </button>
              <button
                onClick={handleSubmitRework}
                disabled={reworkUploading}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-sky-600 text-white rounded-xl text-sm font-bold hover:bg-sky-700 disabled:opacity-50 transition"
              >
                {reworkUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RotateCcw className="w-4 h-4" /> Publică relucrarea</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── open: waiting for handyman ── */}
      {STATUS === 'open' && (
        <div className="flex items-start gap-2.5 bg-orange-100 border border-orange-200 rounded-xl p-3">
          <Clock className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-800">Se așteaptă răspunsul meșterului</p>
            <p className="text-xs text-orange-700 mt-0.5">
              Meșterul are <strong>24 de ore</strong> să accepte sau să conteste relucrarea. Dacă nu răspunde, cazul merge automat la administrator.
            </p>
          </div>
        </div>
      )}

      {/* ── awaiting_client_rework_choice: client picks how to proceed ── */}
      {!reworkFormMode && STATUS === 'awaiting_client_rework_choice' && (
        <div className="space-y-3">
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <CheckCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Meșterul a acceptat relucrarea</p>
              <p className="text-xs text-amber-700 mt-0.5">Alege cum dorești să continui relucrarea lucrării tale.</p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-0.5">Alege cum continui</p>
            <button
              onClick={() => handleReworkChoice('accept_current')}
              disabled={!!choiceLoading}
              className="w-full flex items-center justify-between px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition disabled:opacity-50"
            >
              <div className="flex items-center gap-2">
                {choiceLoading === 'accept_current' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                <span>Continuă cu meșterul actual</span>
              </div>
              <span className="text-xs font-normal text-green-200">Meșterul face relucrarea</span>
            </button>
            {!taskObj?.is_rework && (
              <button
                onClick={() => handleReworkChoice('reassign')}
                disabled={!!choiceLoading}
                className="w-full flex items-center justify-between px-4 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-bold transition disabled:opacity-50"
              >
                <div className="flex items-center gap-2">
                  {choiceLoading === 'reassign' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                  <span>Alt meșter din marketplace</span>
                </div>
                <span className="text-xs font-normal text-sky-200">Platforma plătește 100%</span>
              </button>
            )}
            <button
              onClick={() => handleReworkChoice('cancel_no_refund')}
              disabled={!!choiceLoading}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl text-sm font-bold transition disabled:opacity-50"
            >
              <div className="flex items-center gap-2">
                {choiceLoading === 'cancel_no_refund' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                <span>Anulare fără rambursare</span>
              </div>
              <span className="text-xs font-normal text-gray-300">Plata rămâne la meșter</span>
            </button>
          </div>
        </div>
      )}

      {/* ── handyman_declined_rework: client expresses resolution preference ── */}
      {!reworkFormMode && STATUS === 'handyman_declined_rework' && (
        <div className="space-y-3">
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl p-3">
            <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">Meșterul a refuzat relucrarea</p>
              <p className="text-xs text-red-700 mt-0.5">
                {dispute.client_resolution_request
                  ? 'Cererea ta a fost transmisă. Administratorul analizează situația și va lua o decizie finală.'
                  : 'Meșterul nu vrea să relucreze. Alege varianta care ți se potrivește — un administrator va decide.'}
              </p>
            </div>
          </div>

          {!dispute.client_resolution_request && !refundStep && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-0.5">Ce preferi?</p>
              {!taskObj?.is_rework && (
                <button
                  onClick={() => handleResolutionRequest('reassign')}
                  disabled={!!choiceLoading}
                  className="w-full flex items-center justify-between px-4 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-bold transition disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    {choiceLoading === 'reassign' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                    <span>Relucrare cu alt meșter</span>
                  </div>
                  <span className="text-xs font-normal text-sky-200">Platforma plătește 100%</span>
                </button>
              )}
              <button
                onClick={() => setRefundStep('partial_input')}
                disabled={!!choiceLoading}
                className="w-full flex items-center justify-between px-4 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold transition disabled:opacity-50"
              >
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  <span>Rambursare parțială</span>
                </div>
                <span className="text-xs font-normal text-teal-200">Admin decide suma finală</span>
              </button>
              <button
                onClick={() => setRefundStep('full_confirm')}
                disabled={!!choiceLoading}
                className="w-full flex items-center justify-between px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition disabled:opacity-50"
              >
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  <span>Rambursare totală</span>
                </div>
                <span className="text-xs font-normal text-red-200">Admin decide suma finală</span>
              </button>
            </div>
          )}

          {/* ── Partial: input sumă estimată ── */}
          {!dispute.client_resolution_request && refundStep === 'partial_input' && (
            <div className="border border-teal-200 rounded-xl overflow-hidden">
              <div className="bg-teal-50 px-4 py-2.5 border-b border-teal-100">
                <p className="text-xs font-bold text-teal-700 uppercase tracking-wide">Rambursare parțială</p>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-sm text-gray-700">Cât consideri că ar trebui să primești înapoi? Administratorul va analiza și va stabili suma finală.</p>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">Suma estimată de tine (RON)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      min="1"
                      value={partialEstimate}
                      onChange={e => setPartialEstimate(e.target.value)}
                      placeholder="ex: 200"
                      className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Aceasta este doar o propunere. Suma finală o stabilește administratorul.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setRefundStep(null); setPartialEstimate('') }}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition"
                  >
                    Înapoi
                  </button>
                  <button
                    onClick={() => setRefundStep('partial_confirm')}
                    disabled={!partialEstimate || Number(partialEstimate) <= 0}
                    className="flex-1 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-bold hover:bg-teal-700 disabled:opacity-50 transition"
                  >
                    Continuă
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Modals de confirmare ── */}
          {!dispute.client_resolution_request && (refundStep === 'partial_confirm' || refundStep === 'full_confirm') && (
            <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" onClick={() => setRefundStep(refundStep === 'partial_confirm' ? 'partial_input' : null)}>
              <div className="absolute inset-0 bg-black/40" />
              <div
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4"
                onClick={e => e.stopPropagation()}
              >
                {/* Icon */}
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto ${refundStep === 'full_confirm' ? 'bg-red-100' : 'bg-teal-100'}`}>
                  <DollarSign className={`w-7 h-7 ${refundStep === 'full_confirm' ? 'text-red-600' : 'text-teal-600'}`} />
                </div>

                {/* Title */}
                <div className="text-center space-y-1">
                  <h3 className="text-base font-bold text-gray-800">
                    {refundStep === 'full_confirm' ? 'Confirmi rambursarea totală?' : 'Confirmi cererea de rambursare?'}
                  </h3>
                  {refundStep === 'partial_confirm' && (
                    <p className="text-sm text-gray-500">
                      Suma propusă de tine: <span className="font-bold text-teal-700">{Number(partialEstimate).toLocaleString('ro-RO')} RON</span>
                    </p>
                  )}
                </div>

                {/* Body */}
                <div className={`rounded-xl p-3 text-sm text-center ${refundStep === 'full_confirm' ? 'bg-red-50 text-red-700' : 'bg-teal-50 text-teal-700'}`}>
                  {refundStep === 'full_confirm'
                    ? 'Suma finală va fi hotărâtă de administrator. Acesta poate aproba rambursarea totală sau poate decide o sumă parțială în funcție de analiza situației.'
                    : 'Suma finală va fi stabilită de administrator, care poate aproba suma propusă sau poate decide altfel în funcție de analiza situației.'}
                </div>

                {/* Buttons */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setRefundStep(refundStep === 'partial_confirm' ? 'partial_input' : null)}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 font-medium hover:bg-gray-50 transition"
                  >
                    Înapoi
                  </button>
                  <button
                    onClick={() => handleResolutionRequest(refundStep === 'full_confirm' ? 'full_refund' : 'partial_refund')}
                    disabled={!!choiceLoading}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-50 ${refundStep === 'full_confirm' ? 'bg-red-500 hover:bg-red-600' : 'bg-teal-600 hover:bg-teal-700'}`}
                  >
                    {choiceLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : refundStep === 'full_confirm' ? 'Solicită rambursarea' : 'Trimite cererea'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {dispute.client_resolution_request && (
            <div className="flex items-center gap-2.5 bg-purple-50 border border-purple-200 rounded-xl p-3">
              <Shield className="w-4 h-4 text-purple-600 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-purple-800">
                  Preferința ta: {
                    dispute.client_resolution_request === 'reassign'       ? 'Relucrare cu alt meșter' :
                    dispute.client_resolution_request === 'partial_refund' ? 'Rambursare parțială' :
                                                                              'Rambursare totală'
                  }
                </p>
                {dispute.client_refund_estimate && dispute.client_resolution_request === 'partial_refund' && (
                  <p className="text-xs text-purple-600 mt-0.5">Suma propusă de tine: <strong>{Number(dispute.client_refund_estimate).toLocaleString('ro-RO')} RON</strong></p>
                )}
                <p className="text-xs text-purple-500 mt-0.5">Administratorul analizează și va decide în curând.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── rework_accepted: confirm date ── */}
      {STATUS === 'rework_accepted' && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-orange-700 uppercase tracking-wide">Meșterul a acceptat — confirmă data relucrării</p>
          <ReworkDateConfirmCard dispute={dispute} handymanId={handymanId} onRefresh={onRefresh} />
        </div>
      )}

      {/* ── rework_in_progress ── */}
      {STATUS === 'rework_in_progress' && (
        <div className="flex items-start gap-2.5 bg-blue-100 border border-blue-200 rounded-xl p-3">
          <Wrench className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-800">Relucrare în desfășurare</p>
            {dispute.rework_deadline && (
              <p className="text-xs text-blue-700 mt-0.5">Data programată: <strong>{fmt(dispute.rework_deadline)}</strong></p>
            )}
            <p className="text-xs text-blue-600 mt-1">Meșterul lucrează la corectarea problemelor. Vei fi notificat când termină.</p>
          </div>
        </div>
      )}

      {/* ── rework_completed: rate + approve ── */}
      {STATUS === 'rework_completed' && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 bg-green-100 border border-green-200 rounded-xl p-3">
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-800">Relucrarea a fost finalizată!</p>
              <p className="text-xs text-green-700 mt-0.5">Meșterul a trimis dovezile de mai sus. Evaluează și aprobă lucrarea.</p>
            </div>
          </div>
          <div className="border border-green-200 rounded-xl p-3 bg-white space-y-3">
            <p className="text-sm font-bold text-gray-700">Evaluează relucrarea</p>
            <div>
              <p className="text-xs text-gray-500 mb-1.5">Rating *</p>
              <StarRating value={ratingVal} onChange={setRatingVal} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Recenzie <span className="font-normal text-gray-400">(opțional)</span></label>
              <textarea value={reviewTxt} onChange={e => setReviewTxt(e.target.value)} rows={3}
                placeholder="Descrie experiența cu relucrarea..."
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none" />
            </div>
            <button onClick={handleApproveRework} disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-4 h-4" />}
              Aprobă relucrarea
            </button>
          </div>
        </div>
      )}

      {/* ── dispute_contested: handyman contested, waiting for admin ── */}
      {STATUS === 'dispute_contested' && (
        <div className="flex items-start gap-2.5 bg-purple-50 border border-purple-200 rounded-xl p-3">
          <Shield className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-purple-800">Meșterul a contestat disputa</p>
            <p className="text-xs text-purple-700 mt-0.5">Un administrator analizează situația și va decide cum se procedează.</p>
          </div>
        </div>
      )}

      {/* ── evidence_requested_client: client must submit evidence ── */}
      {STATUS === 'evidence_requested_client' && (
        <div className="space-y-3">
          <div className="border border-amber-400 bg-amber-50 rounded-xl overflow-hidden">
            <div className="bg-amber-100 px-4 py-2.5 border-b border-amber-300 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Adminul solicită dovezi de la tine</p>
            </div>
            <div className="p-4 space-y-3">
              {(() => {
                const req = [...timeline].reverse().find(e => e.event === 'admin_requested_evidence_from_client')
                return req?.note ? (
                  <div className="bg-white border border-amber-200 rounded-lg px-3 py-2">
                    <p className="text-xs font-semibold text-gray-600 mb-0.5">Mesaj de la admin:</p>
                    <p className="text-xs text-gray-700 italic">"{req.note}"</p>
                  </div>
                ) : null
              })()}

              <textarea
                value={extraEvidenceText}
                onChange={e => setExtraEvidenceText(e.target.value)}
                rows={3}
                placeholder="Descrie situația sau adaugă clarificări..."
                className="w-full px-3 py-2.5 border border-amber-300 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
              />

              <div>
                <label className="flex items-center gap-2 px-3 py-2.5 border border-dashed border-amber-300 rounded-xl cursor-pointer hover:border-amber-400 hover:bg-amber-100/50 transition text-sm text-gray-500">
                  <Camera className="w-4 h-4" />
                  <span>Adaugă poze (opțional)</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={e => {
                      const arr = Array.from(e.target.files ?? [])
                      setExtraEvidenceFiles(prev => [...prev, ...arr])
                      setExtraEvPreviews(prev => [...prev, ...arr.map(f => URL.createObjectURL(f))])
                    }}
                  />
                </label>
                {extraEvPreviews.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
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
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleRefuseClientEvidence}
                  disabled={extraEvSubmitting}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-red-300 text-red-700 bg-white rounded-xl text-sm font-bold hover:bg-red-50 transition disabled:opacity-50"
                >
                  {extraEvSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refuz cererea'}
                </button>
                <button
                  onClick={handleSubmitClientEvidence}
                  disabled={extraEvSubmitting}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-bold hover:bg-amber-700 transition disabled:opacity-50"
                >
                  {extraEvSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Trimit dovezi'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── admin review / escalated ── */}
      {['admin_review', 'under_admin_review', 'admin_escalated', 'admin_review_required'].includes(STATUS) && (
        <div className="flex items-start gap-2.5 bg-purple-100 border border-purple-200 rounded-xl p-3">
          <Shield className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-purple-800">
              {STATUS === 'admin_escalated' ? 'Cazul a fost escalat la administrator' : 'Cazul e la administrator'}
            </p>
            <p className="text-xs text-purple-700 mt-0.5">
              {STATUS === 'admin_escalated'
                ? 'Meșterul nu a răspuns în 24h. Un administrator analizează situația și va lua o decizie.'
                : 'Un administrator analizează situația și va lua o decizie în curând.'}
            </p>
          </div>
        </div>
      )}

      {/* ── refund ── */}
      {(STATUS === 'refund_partial' || STATUS === 'refund_full') && (
        <div className="flex items-start gap-2.5 bg-teal-100 border border-teal-200 rounded-xl p-3">
          <CheckCircle className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-teal-800">
              {STATUS === 'refund_full' ? 'Rambursare integrală aprobată' : 'Rambursare parțială aprobată'}
            </p>
            {(dispute.refund_amount ?? adminDecision?.refund_amount) && (
              <p className="text-sm font-bold text-teal-900 mt-1">
                Suma: {Number(dispute.refund_amount ?? adminDecision?.refund_amount ?? 0).toLocaleString('ro-RO')} RON
              </p>
            )}
            {adminDecision?.notes && (
              <p className="text-xs text-teal-700 mt-1 italic">"{adminDecision.notes}"</p>
            )}
          </div>
        </div>
      )}

      {/* ── forced_accepted ── */}
      {STATUS === 'forced_accepted' && (
        <div className="flex items-start gap-2.5 bg-gray-100 border border-gray-200 rounded-xl p-3">
          <BadgeCheck className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-gray-800">Plata eliberată de administrator</p>
            <p className="text-xs text-gray-600 mt-0.5">Administratorul a analizat situația și a decis eliberarea plății.</p>
            {adminDecision?.notes && (
              <p className="text-xs text-gray-500 mt-1 italic">"{adminDecision.notes}"</p>
            )}
          </div>
        </div>
      )}

      {/* ── resolved (admin final decision) ── */}
      {STATUS === 'resolved' && (() => {
        const raw = dispute.admin_decision
        const parsed = (() => { try { return typeof raw === 'string' ? JSON.parse(raw) : raw } catch { return null } })()
        const dec = (typeof parsed === 'string' ? parsed : null) ?? parsed?.decision ?? parsed?.type ?? (typeof raw === 'string' ? raw : null) ?? null
        const note = dispute.resolution_note || parsed?.notes || parsed?.note || null
        const clientWon  = dec === 'full_refund' || dec === 'partial_refund'
        const clientLost = dec === 'approve_handyman' || dec === 'forced_accepted'
        return (
          <div className={`rounded-xl border p-4 space-y-2.5 ${clientWon ? 'bg-teal-50 border-teal-300' : clientLost ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
            <div className="flex items-center gap-2.5">
              {clientWon
                ? <CheckCircle className="w-5 h-5 text-teal-600 flex-shrink-0" />
                : clientLost
                ? <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                : <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />}
              <div>
                <p className={`text-sm font-bold ${clientWon ? 'text-teal-800' : clientLost ? 'text-red-700' : 'text-emerald-800'}`}>
                  {clientWon ? 'Ai câștigat disputa!' : clientLost ? 'Ai pierdut disputa.' : 'Dispută rezolvată de administrator'}
                </p>
                <p className={`text-xs mt-0.5 ${clientWon ? 'text-teal-600' : clientLost ? 'text-red-500' : 'text-emerald-600'}`}>
                  {dec === 'full_refund'      ? 'Vei primi înapoi suma integrală plătită pentru această lucrare.' :
                   dec === 'partial_refund'   ? 'Vei primi o rambursare parțială pentru această lucrare.' :
                   dec === 'approve_handyman' ? 'Adminul a luat partea meșterului — lucrarea a fost considerată conformă.' :
                   dec === 'forced_accepted'  ? 'Adminul a decis eliberarea plății către meșter.' :
                                               'Adminul a luat o decizie finală asupra disputei.'}
                </p>
              </div>
            </div>
            {clientWon && dispute.refund_amount && (
              <div className="bg-white border border-teal-200 rounded-lg px-3 py-2">
                <p className="text-xs text-teal-600">Suma rambursată:</p>
                <p className="text-base font-bold text-teal-900">{Number(dispute.refund_amount).toLocaleString('ro-RO')} RON</p>
              </div>
            )}
            {note && (
              <div className={`text-xs rounded-lg px-3 py-2 ${clientWon ? 'bg-teal-100 text-teal-800' : clientLost ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'}`}>
                <span className="font-semibold">Motivul adminului: </span>„{note}"
              </div>
            )}
          </div>
        )
      })()}

      {/* ── rework_marketplace ── */}
      {STATUS === 'rework_marketplace' && (
        <div className="space-y-2">
          <div className="flex items-start gap-2.5 bg-sky-100 border border-sky-200 rounded-xl p-3">
            <RotateCcw className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-sky-800">Relucrare preluată din marketplace</p>
              <p className="text-xs text-sky-700 mt-0.5">Administratorul a decis că relucrarea va fi efectuată de un alt meșter disponibil.</p>
            </div>
          </div>
          {reworkHandyman && (
            <a
              href={`/handymen/${toSlug(reworkHandyman.first_name, reworkHandyman.last_name)}`}
              className="flex items-center gap-3 p-3 bg-white border border-sky-200 rounded-xl hover:bg-sky-50 transition group"
            >
              <Avatar
                name={`${reworkHandyman.first_name ?? ''} ${reworkHandyman.last_name ?? ''}`.trim()}
                avatarUrl={reworkHandyman.avatar_url}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 group-hover:text-sky-700 transition">
                  {reworkHandyman.first_name} {reworkHandyman.last_name}
                </p>
                <p className="text-xs text-sky-600">Meșter rework — Vezi profilul</p>
              </div>
              <ChevronRight className="w-4 h-4 text-sky-400 flex-shrink-0" />
            </a>
          )}
        </div>
      )}

      {/* ── Evidence photos ── */}
      {(clientPhotos.length > 0 || handymanEvid.length > 0) && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide px-3 py-2 bg-gray-50 border-b border-gray-100">Dovezi</p>
          <div className="p-3 space-y-3">
            {clientPhotos.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1.5">Dovezile tale:</p>
                <div className="flex gap-1.5 flex-wrap">
                  {clientPhotos.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      <img src={url} alt={`dovada-client-${i}`} className="w-14 h-14 rounded-lg object-cover border border-red-200 hover:opacity-80 transition" />
                    </a>
                  ))}
                </div>
              </div>
            )}
            {handymanEvid.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1.5">Dovezi meșter:</p>
                <div className="flex gap-1.5 flex-wrap">
                  {handymanEvid.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      <img src={url} alt={`dovada-mester-${i}`} className="w-14 h-14 rounded-lg object-cover border border-blue-200 hover:opacity-80 transition" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Timeline ── */}
      {sortedEvents.length > 0 && (
        <div className="border-t border-gray-100 pt-3 space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Istoricul disputei</p>
          <div className="space-y-2">
            {sortedEvents.map((ev, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0 mt-1.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-700">
                    {ev.event === 'client_requested_resolution'
                      ? ev.extra?.request === 'reassign'       ? 'Ai ales relucrare cu alt meșter'
                        : ev.extra?.request === 'partial_refund' ? 'Ai solicitat rambursare parțială'
                        : ev.extra?.request === 'full_refund'    ? 'Ai solicitat rambursare totală'
                        : 'Ai trimis preferința ta'
                      : (eventLabel[ev.event] ?? ev.event)}
                  </p>
                  {ev.at && (
                    <p className="text-xs text-gray-400">
                      {new Date(ev.at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {' '}{new Date(ev.at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                  {ev.extra?.new_deadline && (
                    <p className="text-xs text-gray-500">Data propusă: {fmt(ev.extra.new_deadline)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── completion approval section ──────────────────────────────────────────────
function CompletionApprovalSection({ completion, task: taskObj, taskId, taskTitle, handymanId, clientId, onUpdated, onMsg }) {
  const photos = Array.isArray(completion?.completion_photos) ? completion.completion_photos : []

  const [localData,         setLocalData]         = useState(completion)
  const [rating,            setRating]            = useState(5)
  const [reviewText,        setReviewText]        = useState('')
  const [saving,            setSaving]            = useState(false)
  const [error,             setError]             = useState(null)
  const [activePhoto,       setActivePhoto]       = useState(0)
  const [lightboxIndex,     setLightboxIndex]     = useState(null)
  const [isFav,             setIsFav]             = useState(false)
  const [favLoading,        setFavLoading]        = useState(false)
  const [showRejectModal,      setShowRejectModal]      = useState(false)
  const [rejectionReasons,     setRejectionReasons]     = useState([])
  const [selectedReasonId,     setSelectedReasonId]     = useState('')
  const [rejectionDetails,     setRejectionDetails]     = useState('')
  const [rejectionPhotoPreviews, setRejectionPhotoPreviews] = useState([])
  const [rejectionPhotoFiles,  setRejectionPhotoFiles]  = useState([])
  const [activeDispute,        setActiveDispute]        = useState(null)

  // review reply state
  const [reviewData,           setReviewData]           = useState(null)
  const [clientReplyText,      setClientReplyText]      = useState('')
  const [clientReplySaving,    setClientReplySaving]    = useState(false)
  const [showClientReplyForm,  setShowClientReplyForm]  = useState(false)

  useEffect(() => {
    supabase.from('rejection_reasons').select('id, name').eq('is_active', true)
      .then(({ data }) => setRejectionReasons(data ?? []))
  }, [])

  const [reworkHandyman,   setReworkHandyman]   = useState(null)

  // Încarcă disputa activă pentru acest task (dacă există)
  useEffect(() => {
    if (!taskId) return
    supabase.from('task_disputes')
      .select('id, status, handyman_response, handyman_response_at, admin_decision, created_at, timeline, rework_deadline, client_rework_confirmed_at, refund_amount, rework_task_id, photos, handyman_evidence, client_resolution_request, client_refund_estimate, resolution_note')
      .eq('task_id', taskId)
      .not('status', 'in', '("closed","rejected")')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setActiveDispute(data ?? null))
  }, [taskId, localData?.client_accepted])

  const refreshDispute = () => {
    if (!taskId) return
    supabase.from('task_disputes')
      .select('id, status, handyman_response, handyman_response_at, admin_decision, created_at, timeline, rework_deadline, client_rework_confirmed_at, refund_amount, rework_task_id, photos, handyman_evidence, client_resolution_request, client_refund_estimate, resolution_note')
      .eq('task_id', taskId)
      .not('status', 'in', '("closed","rejected")')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setActiveDispute(data ?? null))
  }

  useEffect(() => {
    if (!activeDispute?.rework_task_id) { setReworkHandyman(null); return }
    supabase.from('tasks')
      .select('handyman_id')
      .eq('id', activeDispute.rework_task_id)
      .maybeSingle()
      .then(async ({ data: t }) => {
        if (!t?.handyman_id) return
        const { data: profile } = await supabase.from('profiles')
          .select('first_name, last_name, avatar_url')
          .eq('id', t.handyman_id)
          .maybeSingle()
        if (profile) setReworkHandyman(profile)
      })
  }, [activeDispute?.rework_task_id])

  // Fall-back: if completion was stored with job_id = rework_task_id (old records), fetch it by that ID
  useEffect(() => {
    if (!activeDispute?.rework_task_id || completion) return
    supabase.from('job_completions')
      .select('*')
      .eq('job_id', activeDispute.rework_task_id)
      .eq('job_type', 'task')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => { if (data) setCompletion(data) })
  }, [activeDispute?.rework_task_id])

  useEffect(() => {
    if (!handymanId || !clientId) return
    supabase.from('favorite_handymen')
      .select('id').eq('client_id', clientId).eq('handyman_id', handymanId).maybeSingle()
      .then(({ data }) => setIsFav(!!data))
  }, [handymanId, clientId])

  // load review (to show handyman reply + client reply)
  useEffect(() => {
    if (!taskId || !localData?.client_accepted) return
    supabase.from('reviews')
      .select('id, owner_reply, owner_reply_at, client_reply, client_reply_at')
      .eq('task_id', taskId)
      .eq('review_type', 'for_handyman')
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setReviewData(data)
          setClientReplyText(data.client_reply ?? '')
        }
      })
  }, [taskId, localData?.client_accepted])

  const submitClientReply = async () => {
    if (!reviewData?.id || !clientReplyText.trim()) return
    setClientReplySaving(true)
    const now = new Date().toISOString()
    const { error } = await supabase.from('reviews').update({
      client_reply: clientReplyText.trim(),
      client_reply_at: now,
    }).eq('id', reviewData.id)
    if (!error) {
      setReviewData(prev => ({ ...prev, client_reply: clientReplyText.trim(), client_reply_at: now }))
      setShowClientReplyForm(false)
    }
    setClientReplySaving(false)
  }

  const toggleFavorite = async () => {
    if (!handymanId || favLoading) return
    setFavLoading(true)
    try {
      let cId = clientId
      if (!cId) {
        const { data: { user } } = await supabase.auth.getUser()
        cId = user?.id
      }
      if (!cId) return
      if (isFav) {
        await supabase.from('favorite_handymen').delete().eq('client_id', cId).eq('handyman_id', handymanId)
        setIsFav(false)
      } else {
        await supabase.from('favorite_handymen').insert({ client_id: cId, handyman_id: handymanId })
        setIsFav(true)
      }
    } finally {
      setFavLoading(false)
    }
  }

  // If completion is null — handyman hasn't submitted the completion form yet
  if (!localData) {
    return (
      <div className="rounded-2xl border-2 border-yellow-300 bg-yellow-50 overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-2 bg-yellow-100 border-b border-yellow-200">
          <div className="w-8 h-8 bg-yellow-200 rounded-lg flex items-center justify-center flex-shrink-0">
            <Clock className="w-4 h-4 text-yellow-700" />
          </div>
          <div>
            <p className="text-sm font-bold text-yellow-800">Așteptăm dovezile de la handyman</p>
            <p className="text-xs text-yellow-600 mt-0.5">
              Handymanul nu a trimis încă pozele și descrierea lucrării finalizate.
            </p>
          </div>
        </div>
        <div className="p-4">
          <p className="text-sm text-yellow-700">
            Vei putea aproba lucrarea și lăsa o recenzie după ce handymanul trimite dovezile din aplicația sa.
          </p>
        </div>
      </div>
    )
  }

  const isPending  = localData.client_accepted === null || localData.client_accepted === undefined
  const isApproved = localData.client_accepted === true
  const isRejected = localData.client_accepted === false

  const handleApprove = async () => {
    setSaving(true); setError(null)
    try {
      const now = new Date().toISOString()

      // Resolve clientId if not passed
      let cId = clientId
      if (!cId) {
        const { data: { user } } = await supabase.auth.getUser()
        cId = user?.id
      }

      // 1. Update job_completions
      const { error: compErr } = await supabase.from('job_completions').update({
        client_accepted:      true,
        client_rating:        rating,
        client_review:        reviewText || null,
        client_responded_at:  now,
        payment_released:     true,
        payment_released_at:  now,
      }).eq('id', localData.id)
      if (compErr) throw compErr

      // 2. Update task status to client_approved
      await supabase.from('tasks').update({ status: 'client_approved', updated_at: now }).eq('id', taskId)

      // 3. Increment handyman's completed jobs counter (also covered by DB trigger)
      if (handymanId) {
        const { data: hp } = await supabase.from('handyman_profiles').select('total_jobs_completed').eq('user_id', handymanId).maybeSingle()
        if (hp) {
          await supabase.from('handyman_profiles')
            .update({ total_jobs_completed: (hp.total_jobs_completed ?? 0) + 1 })
            .eq('user_id', handymanId)
        }
      }

      // 4. Insert review
      if (cId && handymanId) {
        const { error: reviewErr } = await supabase.from('reviews').insert({
          task_id:      taskId,
          rating:       rating,
          title:        taskTitle || null,
          description:  reviewText || null,
          review_type:  'for_handyman',
          reviewer_id:  cId,
          reviewed_id:  handymanId,
          created_at:   now,
        })
        if (reviewErr) throw reviewErr

        const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating)
        await supabase.from('notifications').insert({
          user_id: handymanId,
          type: 'new_review',
          title: 'Recenzie nouă primită',
          body: `Ai primit o recenzie de ${stars} pentru „${taskTitle || 'un job finalizat'}"`,
          data: { task_id: taskId, rating, redirect: '/handyman/reviews' },
        })
      }

      // 5. Închide conversația aferentă task-ului
      await supabase.from('conversations').update({ is_closed: true }).eq('task_id', taskId)

      setLocalData(prev => ({ ...prev, client_accepted: true, client_rating: rating, client_review: reviewText || null }))
      onMsg?.('Lucrarea a fost aprobată și recenzia a fost salvată!')
      onUpdated?.()
    } catch (e) {
      setError('Eroare: ' + (e.message ?? ''))
    } finally {
      setSaving(false)
    }
  }

  const handleRejectionPhotoAdd = (e) => {
    const files = Array.from(e.target.files)
    if (rejectionPhotoFiles.length + files.length > 4) {
      setError('Poți adăuga maximum 4 poze.'); return
    }
    setRejectionPhotoFiles(prev => [...prev, ...files])
    setRejectionPhotoPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))])
  }

  const removeRejectionPhoto = (i) => {
    setRejectionPhotoFiles(prev => prev.filter((_, idx) => idx !== i))
    setRejectionPhotoPreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  const handleOpenDispute = async () => {
    if (!selectedReasonId) { setError('Selectează un motiv.'); return }
    if (!rejectionDetails.trim()) { setError('Descrie problema în detaliu (câmp obligatoriu).'); return }
    if (rejectionPhotoFiles.length === 0) { setError('Adaugă cel puțin o poză ca dovadă.'); return }
    setSaving(true); setError(null)
    try {
      const now = new Date().toISOString()

      // 1. Upload poze dovezi
      const uploadedUrls = []
      for (const file of rejectionPhotoFiles) {
        const ext = file.name.split('.').pop()
        const path = `${taskId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage.from('dispute-photos').upload(path, file, { contentType: file.type })
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('dispute-photos').getPublicUrl(path)
          uploadedUrls.push(urlData.publicUrl)
        }
      }

      // 2. Actualizează job_completions
      await supabase.from('job_completions').update({
        client_accepted:     false,
        client_responded_at: now,
        rejection_reason_id: Number(selectedReasonId),
        rejection_details:   rejectionDetails || null,
        dispute_status:      'open',
      }).eq('id', localData.id)

      // 3. Apel RPC open_dispute — gestionează statusul taskului, notificările și timeline-ul
      const { data: result, error: rpcErr } = await supabase.rpc('open_dispute', {
        p_task_id:   taskId,
        p_reason_id: Number(selectedReasonId),
        p_details:   rejectionDetails,
        p_photos:    uploadedUrls,
      })
      if (rpcErr) throw rpcErr
      if (!result?.success) throw new Error(result?.error ?? 'Eroare la deschiderea disputei.')

      setLocalData(prev => ({
        ...prev,
        client_accepted:     false,
        rejection_reason_id: Number(selectedReasonId),
        rejection_details:   rejectionDetails || null,
      }))
      setShowRejectModal(false)
      onMsg?.('Disputa a fost deschisă. Meșterul are 48h să răspundă, după care cazul merge la admin.')
      onUpdated?.()
    } catch (e) {
      setError('Eroare: ' + (e.message ?? ''))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`rounded-2xl border-2 overflow-hidden ${
      activeDispute  ? 'border-orange-300 bg-orange-50'  :
      isPending      ? 'border-orange-300 bg-orange-50'  :
      isApproved     ? 'border-green-300 bg-green-50'    :
                       'border-red-300 bg-red-50'
    }`}>
      {/* Section header */}
      <div className={`px-4 py-3 flex items-center gap-2 ${
        activeDispute  ? 'bg-orange-100 border-b border-orange-200'  :
        isPending      ? 'bg-orange-100 border-b border-orange-200'  :
        isApproved     ? 'bg-green-100 border-b border-green-200'    :
                         'bg-red-100 border-b border-red-200'
      }`}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          activeDispute  ? 'bg-orange-200'  :
          isPending      ? 'bg-orange-200'  :
          isApproved     ? 'bg-green-200'   :
                           'bg-red-200'
        }`}>
          {activeDispute                     && <AlertTriangle className="w-4 h-4 text-orange-700" />}
          {!activeDispute && isPending       && <Briefcase     className="w-4 h-4 text-orange-700" />}
          {!activeDispute && isApproved      && <BadgeCheck    className="w-4 h-4 text-green-700" />}
          {!activeDispute && isRejected      && <XCircle       className="w-4 h-4 text-red-700" />}
        </div>
        <div>
          <p className={`text-sm font-bold ${
            activeDispute  ? 'text-orange-800'  :
            isPending      ? 'text-orange-800'  :
            isApproved     ? 'text-green-800'   :
                             'text-red-800'
          }`}>
            {activeDispute                && 'Dispută activă pe această lucrare'}
            {!activeDispute && isPending  && 'Handymanul a marcat lucrarea ca finalizată'}
            {!activeDispute && isApproved && 'Lucrare aprobată de tine'}
            {!activeDispute && isRejected && 'Lucrare respinsă — handymanul va reface'}
          </p>
          {localData.created_at && (
            <p className="text-xs text-gray-500 mt-0.5">
              Finalizat pe {new Date(localData.created_at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {error && (
          <div className="p-3 bg-red-100 border border-red-300 rounded-xl text-sm text-red-700">{error}</div>
        )}

        {/* Completion photos */}
        {photos.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Poze lucrare finalizată</p>
            <div className="relative rounded-xl overflow-hidden bg-gray-100">
              <img src={photos[activePhoto]} alt="" className="w-full object-contain max-h-72 cursor-pointer"
                onClick={() => setLightboxIndex(activePhoto)}
                onError={e => { e.currentTarget.style.display = 'none' }} />
              {photos.length > 1 && (
                <>
                  <button onClick={() => setActivePhoto(i => Math.max(0, i - 1))} disabled={activePhoto === 0}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center disabled:opacity-30 hover:bg-black/60 transition">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => setActivePhoto(i => Math.min(photos.length - 1, i + 1))} disabled={activePhoto === photos.length - 1}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center disabled:opacity-30 hover:bg-black/60 transition">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                    {activePhoto + 1} / {photos.length}
                  </div>
                </>
              )}
              <button onClick={() => setLightboxIndex(activePhoto)}
                className="absolute bottom-2 left-2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition">
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
            {photos.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {photos.map((url, i) => (
                  <button key={i} onClick={() => setActivePhoto(i)}
                    className={`w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border-2 transition ${i === activePhoto ? 'border-orange-400' : 'border-transparent'}`}>
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {lightboxIndex !== null && (
          <Lightbox photos={photos} startIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
        )}

        {/* Completion description */}
        {localData.completion_description && (
          <div className="bg-white/70 rounded-xl p-3 border border-white">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Nota handymanului</p>
            <p className="text-sm text-gray-700 leading-relaxed italic">"{localData.completion_description}"</p>
          </div>
        )}

        {/* ── ACTIVE DISPUTE: show journey view ── */}
        {activeDispute && (
          <DisputeJourneySection
            dispute={activeDispute}
            reworkHandyman={reworkHandyman}
            task={taskObj}
            taskId={taskId}
            taskTitle={taskTitle}
            handymanId={handymanId}
            clientId={clientId}
            onRefresh={refreshDispute}
            onMsg={onMsg}
          />
        )}

        {/* ── PENDING: approval form (only when no active dispute) ── */}
        {!activeDispute && isPending && (
          <>
            <div className="border-t border-orange-200 pt-4">
              <p className="text-sm font-bold text-gray-700 mb-3">Evaluează lucrarea</p>

              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-1.5">Rating *</p>
                <StarRating value={rating} onChange={setRating} />
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-600 mb-1">Recenzie <span className="font-normal text-gray-400">(opțional)</span></label>
                <textarea
                  value={reviewText}
                  onChange={e => setReviewText(e.target.value)}
                  rows={3}
                  placeholder="Descrie experiența cu handymanul..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                />
              </div>

              <div className="flex gap-2">
                <button onClick={() => { setError(null); setShowRejectModal(true) }} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-red-300 text-red-600 bg-white rounded-xl text-sm font-medium hover:bg-red-50 transition disabled:opacity-50">
                  <XCircle className="w-4 h-4" /> Deschide dispută
                </button>
                <button onClick={handleApprove} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-4 h-4" />}
                  Aprobă lucrarea
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── APPROVED: show submitted review + handyman reply + client reply ── */}
        {isApproved && (
          <div className="border-t border-green-200 pt-4 space-y-3">
            {/* Client review */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <StarRating value={localData.client_rating ?? 0} readOnly />
                <span className="text-sm font-bold text-green-700">{localData.client_rating}/5</span>
              </div>
              {localData.client_review && (
                <p className="text-sm text-gray-700 italic bg-white/70 rounded-xl p-3 border border-green-100">
                  "{localData.client_review}"
                </p>
              )}
              {localData.client_responded_at && (
                <p className="text-xs text-gray-400">
                  Aprobat pe {new Date(localData.client_responded_at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>

            {/* Handyman reply */}
            {reviewData?.owner_reply && (
              <div className="bg-blue-50 border-l-4 border-blue-400 rounded-xl p-3 space-y-1">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wide">Răspuns handyman</p>
                <p className="text-sm text-gray-700">{reviewData.owner_reply}</p>
                {reviewData.owner_reply_at && (
                  <p className="text-xs text-gray-400">
                    {new Date(reviewData.owner_reply_at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                )}
              </div>
            )}

            {/* Client reply to handyman */}
            {reviewData?.owner_reply && (
              reviewData.client_reply ? (
                <div className="bg-gray-50 border-l-4 border-gray-300 rounded-xl p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Răspunsul tău</p>
                    <button onClick={() => setShowClientReplyForm(true)}
                      className="text-xs text-blue-600 hover:underline">Editează</button>
                  </div>
                  <p className="text-sm text-gray-700">{reviewData.client_reply}</p>
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

            {/* Client reply form */}
            {showClientReplyForm && reviewData?.owner_reply && (
              <div className="border border-gray-200 rounded-xl p-3 bg-white space-y-2">
                <p className="text-xs font-bold text-gray-600">
                  {reviewData.client_reply ? 'Editează răspunsul tău' : 'Răspunde handymanului'}
                </p>
                <textarea
                  value={clientReplyText}
                  onChange={e => setClientReplyText(e.target.value)}
                  rows={3}
                  placeholder="Scrie răspunsul tău..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
                <div className="flex gap-2">
                  <button onClick={() => { setShowClientReplyForm(false); setClientReplyText(reviewData.client_reply ?? '') }}
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

        {/* ── MOTIV RESPINGERE (doar când nu e dispută activă) ── */}
        {!activeDispute && isRejected && localData.rejection_reason_id && (
          <div className="border-t border-red-200 pt-3">
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-xs font-bold text-red-700 mb-0.5">Motiv corectare:</p>
              <p className="text-sm text-red-800">
                {rejectionReasons.find(r => r.id === localData.rejection_reason_id)?.name ?? '—'}
              </p>
              {localData.rejection_details && (
                <p className="text-xs text-red-600 mt-1 italic">"{localData.rejection_details}"</p>
              )}
            </div>
          </div>
        )}

        {/* ── FAVORITE HANDYMAN ── shown only when no active dispute, or when rework is done and awaiting approval ── */}
        {handymanId && (!activeDispute || activeDispute.status === 'rework_completed') && (
          <div className="border-t border-gray-100 pt-4">
            <button
              onClick={toggleFavorite}
              disabled={favLoading}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition w-full justify-center ${
                isFav
                  ? 'bg-red-50 border-red-300 text-red-600 hover:bg-red-100'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-500'
              }`}
            >
              {favLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Heart className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : ''}`} />
              }
              {isFav ? 'Handyman salvat la favorite' : 'Adaugă handymanul la favorite'}
            </button>
          </div>
        )}
      </div>

      {/* ── REJECT MODAL ── */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center px-4" onClick={() => setShowRejectModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90dvh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center gap-3 p-5 border-b border-gray-100">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Deschide dispută</h3>
                <p className="text-xs text-gray-400 mt-0.5">Descrie problema, adaugă dovezi foto — meșterul are 24h să răspundă</p>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {error && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">{error}</div>
              )}

              {/* Motive — grid butoane */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Motiv *</label>
                <div className="grid grid-cols-2 gap-2">
                  {rejectionReasons.map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedReasonId(String(r.id))}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left text-sm transition-all ${
                        selectedReasonId === String(r.id)
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 text-gray-700 hover:border-red-300'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                        selectedReasonId === String(r.id) ? 'border-red-500' : 'border-gray-300'
                      }`}>
                        {selectedReasonId === String(r.id) && (
                          <div className="w-2 h-2 bg-red-500 rounded-full" />
                        )}
                      </div>
                      <span className="leading-tight">{r.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Detalii suplimentare */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Detalii suplimentare <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectionDetails}
                  onChange={e => setRejectionDetails(e.target.value)}
                  rows={3}
                  placeholder="Descrie problema în detaliu…"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 resize-none text-sm"
                />
              </div>

              {/* Upload poze */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Poze dovezi <span className="text-red-500">*</span> <span className="font-normal text-gray-400">(min. 1, max. 4)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {rejectionPhotoPreviews.map((url, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeRejectionPhoto(i)}
                        className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {rejectionPhotoFiles.length < 4 && (
                    <label className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-red-400 hover:bg-red-50 transition flex-shrink-0">
                      <Camera className="w-5 h-5 text-gray-400" />
                      <span className="text-xs text-gray-400 mt-1">Adaugă</span>
                      <input type="file" accept="image/*" multiple onChange={handleRejectionPhotoAdd} className="hidden" />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 p-5 border-t border-gray-100">
              <button onClick={() => setShowRejectModal(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                Anulează
              </button>
              <button onClick={handleOpenDispute} disabled={saving || !selectedReasonId || !rejectionDetails.trim() || rejectionPhotoFiles.length === 0}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Deschide disputa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── cancel confirm modal ──────────────────────────────────────────────────────
function CancelConfirmModal({ taskTitle, onClose, onConfirm, saving }) {
  const [inputVal, setInputVal] = useState('')
  const CONFIRM_PHRASE = 'ANULARE'
  const isMatch = inputVal.trim().toUpperCase() === CONFIRM_PHRASE

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-800">Anulezi task-ul?</h3>
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{taskTitle}</p>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
          <p className="text-sm text-red-700">
            Această acțiune nu poate fi anulată. Task-ul va fi marcat ca <strong>anulat de client</strong> și handymanul va fi notificat.
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-bold text-gray-700 mb-1.5">
            Scrie <span className="text-red-600 font-mono">ANULARE</span> pentru a confirma
          </label>
          <input
            type="text"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            placeholder="ANULARE"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 text-sm font-mono uppercase"
          />
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
            Renunță
          </button>
          <button onClick={onConfirm} disabled={!isMatch || saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition disabled:opacity-40">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            Confirmă anularea
          </button>
        </div>
      </div>
    </div>
  )
}

function TaskRescheduleRequestModal({ task, onClose, onSubmit, sending }) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState(null)

  const minDate = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  const handleSubmit = async () => {
    if (!date || !time) {
      setError('Selectează data și ora.')
      return
    }
    setError(null)
    await onSubmit({ date, time, message })
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-gray-800 mb-1">Reprogramează Task-ul</h3>
        <p className="text-xs text-gray-400 mb-4 line-clamp-2">{task?.title ?? 'Task'}</p>

        {error && <div className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">{error}</div>}

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Data nouă *</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              min={minDate}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Ora nouă *</label>
            <select
              value={time}
              onChange={e => setTime(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">Selectează ora</option>
              {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Mesaj (opțional)</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              placeholder="Ex: Putem muta pe altă zi?"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
            Anulează
          </button>
          <button onClick={handleSubmit} disabled={sending}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50">
            {sending ? 'Se trimite…' : 'Trimite cererea'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── archive confirm modal ────────────────────────────────────────────────────
function ArchiveConfirmModal({ taskTitle, onClose, onConfirm, saving }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-5 h-5 text-gray-500" />
          </div>
          <div>
            <h3 className="font-bold text-gray-800">Arhivezi task-ul?</h3>
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{taskTitle}</p>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-5">
          <p className="text-xs text-gray-600">
            Task-ul va dispărea din dashboard-ul tău, dar datele rămân salvate în siguranță. Istoricul și ofertele sunt păstrate.
          </p>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
            Renunță
          </button>
          <button onClick={onConfirm} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-700 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Arhivează
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────

const URGENCY_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'medium', label: 'Mediu' },
  { value: 'high',   label: 'Urgent' },
]

const TIME_SLOTS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00']

/**
 * ClientTaskDetailModal
 *
 * Props:
 *   taskId    – string | null
 *   onClose   – () => void
 *   onUpdated – () => void   (refresh parent list after edit/delete)
 */
// ─── rework proposals section ─────────────────────────────────────────────────
function ReworkProposalsSection({ taskId, taskStatus, onRefresh }) {
  const navigate = useNavigate()
  const [proposals,      setProposals]      = useState([])
  const [loading,        setLoading]        = useState(true)
  const [counterForm,    setCounterForm]    = useState({}) // proposalId → {date,time,note}
  const [acting,         setActing]         = useState(null) // proposalId

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('rework_proposals')
      .select(`
        id, status, round_count, proposed_date, proposed_time, proposed_by,
        handyman_note, client_note, timeline, created_at, updated_at,
        handyman:handyman_id (id, first_name, last_name, avatar_url)
      `)
      .eq('task_id', taskId)
      .in('status', ['pending', 'counter_proposed'])
      .order('created_at', { ascending: false })
    setProposals(data ?? [])
    setLoading(false)
  }

  useEffect(() => { if (taskId) load() }, [taskId])

  const respond = async (proposalId, action, counterDate, counterTime, note) => {
    setActing(proposalId)
    const params = { p_proposal_id: proposalId, p_action: action }
    if (action === 'counter') { params.p_date = counterDate; params.p_time = counterTime; params.p_note = note || null }
    const { data, error } = await supabase.rpc('respond_rework_proposal', params)
    setActing(null)
    if (error || data?.success === false) { alert(data?.error || error?.message); return }
    setCounterForm(prev => { const n = { ...prev }; delete n[proposalId]; return n })
    load()
    onRefresh?.()
  }

  if (taskStatus !== 'open') return null
  if (loading) return <div className="py-4 text-center text-xs text-gray-400">Se încarcă propunerile...</div>

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
        Propuneri de relucrare ({proposals.length})
      </p>

      {proposals.length === 0 ? (
        <div className="flex items-center gap-2.5 bg-sky-50 border border-sky-200 rounded-xl p-3">
          <Clock className="w-4 h-4 text-sky-500 flex-shrink-0" />
          <p className="text-sm text-sky-700">Niciun meșter nu a trimis încă o propunere. Vei fi notificat când primești una.</p>
        </div>
      ) : proposals.map(prop => {
        const hm   = prop.handyman
        const name = hm ? `${hm.first_name ?? ''} ${hm.last_name ?? ''}`.trim() : 'Meșter'
        const isCounter = prop.status === 'counter_proposed'
        const waitingOnClient = prop.proposed_by === 'handyman'
        const fmt  = (d, t) => d ? `${d.split('-').reverse().join('.')} ${t?.slice(0, 5) ?? ''}` : '—'

        return (
          <div key={prop.id} className={`border rounded-xl overflow-hidden ${isCounter ? 'border-amber-300' : 'border-gray-200'}`}>
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-2.5 ${isCounter ? 'bg-amber-50' : 'bg-gray-50'} border-b ${isCounter ? 'border-amber-200' : 'border-gray-100'}`}>
              <button
                onClick={() => navigate(`/handyman/${hm?.id}`)}
                className="flex items-center gap-2 hover:underline text-sm font-semibold text-gray-800"
              >
                {hm?.avatar_url
                  ? <img src={hm.avatar_url} className="w-6 h-6 rounded-full object-cover" alt="" />
                  : <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">{name[0] ?? '?'}</div>
                }
                {name}
                <User className="w-3 h-3 text-gray-400" />
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Runda {prop.round_count}/4</span>
                {isCounter && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">Contra-propunere</span>}
              </div>
            </div>

            {/* Proposed date */}
            <div className="px-4 py-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="font-medium text-gray-700">{fmt(prop.proposed_date, prop.proposed_time)}</span>
                <span className="text-xs text-gray-400">propus de {prop.proposed_by === 'handyman' ? 'meșter' : 'tine'}</span>
              </div>
              {prop.handyman_note && (
                <p className="text-xs text-gray-500 italic">"{prop.handyman_note}"</p>
              )}

              {/* Actions — only when it's the client's turn */}
              {waitingOnClient && !counterForm[prop.id] && (
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => respond(prop.id, 'accept')}
                    disabled={acting === prop.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 disabled:opacity-50 transition"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Acceptă
                  </button>
                  {prop.round_count < 4 && (
                    <button
                      onClick={() => setCounterForm(prev => ({ ...prev, [prop.id]: { date: '', time: '', note: '' } }))}
                      disabled={acting === prop.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 disabled:opacity-50 transition"
                    >
                      <CalendarClock className="w-3.5 h-3.5" /> Altă dată
                    </button>
                  )}
                  <button
                    onClick={() => respond(prop.id, 'decline')}
                    disabled={acting === prop.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-500 rounded-lg text-xs font-medium hover:bg-red-50 disabled:opacity-50 transition"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Refuză
                  </button>
                </div>
              )}
              {!waitingOnClient && (
                <p className="text-xs text-amber-600 font-medium">Aștepți răspunsul meșterului...</p>
              )}

              {/* Counter form */}
              {counterForm[prop.id] && (
                <div className="border border-amber-200 rounded-lg bg-amber-50 p-3 space-y-2 mt-1">
                  <p className="text-xs font-bold text-amber-700">Propune o altă dată</p>
                  <div className="flex gap-2">
                    <input type="date" min={new Date().toISOString().split('T')[0]}
                      value={counterForm[prop.id].date}
                      onChange={e => setCounterForm(prev => ({ ...prev, [prop.id]: { ...prev[prop.id], date: e.target.value } }))}
                      className="flex-1 px-2 py-1.5 border border-amber-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <input type="time"
                      value={counterForm[prop.id].time}
                      onChange={e => setCounterForm(prev => ({ ...prev, [prop.id]: { ...prev[prop.id], time: e.target.value } }))}
                      className="w-28 px-2 py-1.5 border border-amber-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <input type="text" placeholder="Notă opțională..."
                    value={counterForm[prop.id].note}
                    onChange={e => setCounterForm(prev => ({ ...prev, [prop.id]: { ...prev[prop.id], note: e.target.value } }))}
                    className="w-full px-2 py-1.5 border border-amber-200 rounded-lg text-sm bg-white focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setCounterForm(prev => { const n = { ...prev }; delete n[prop.id]; return n })}
                      className="flex-1 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50">Anulează</button>
                    <button
                      onClick={() => respond(prop.id, 'counter', counterForm[prop.id].date, counterForm[prop.id].time, counterForm[prop.id].note)}
                      disabled={!counterForm[prop.id].date || !counterForm[prop.id].time || acting === prop.id}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 disabled:opacity-50"
                    >
                      {acting === prop.id ? <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : 'Trimite contra-propunere'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function ClientTaskDetailModal({ taskId, onClose, onUpdated }) {
  const [task,       setTask]       = useState(null)
  const [offers,     setOffers]     = useState([])
  const [categories, setCategories] = useState([])
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)
  const [tab,        setTab]        = useState('details') // 'details' | 'offers' | 'edit'
  const [editForm,   setEditForm]   = useState({})
  const [saving,     setSaving]     = useState(false)
  const [accepting,  setAccepting]  = useState(false)
  const [deleting,   setDeleting]   = useState(false)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [rescheduleSaving, setRescheduleSaving] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showArchiveModal, setShowArchiveModal] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [negotiateOffer, setNegotiateOffer] = useState(null)
  const [saveMsg,         setSaveMsg]         = useState(null)
  const [completion,      setCompletion]      = useState(null)
  const [assignedHandyman, setAssignedHandyman] = useState(null)
  const navigate = useNavigate()

  // ── load ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!taskId) { setTask(null); setOffers([]); return }
    let cancelled = false
    setLoading(true); setError(null); setTab('details')

    async function load() {
      const [{ data: taskData, error: tErr }, { data: catsData }, { data: offersData }, { data: completionData }] = await Promise.all([
        supabase.from('tasks').select('*, categories(id, name, icon)').eq('id', taskId).maybeSingle(),
        supabase.from('categories').select('id, name, icon').eq('is_active', true).order('name'),
        supabase.from('task_offers')
          .select(`
            *,
            handyman:handyman_id (
              first_name, last_name, avatar_url, city, average_rating
            )
          `)
          .eq('task_id', taskId)
          .order('created_at', { ascending: false }),
        supabase.from('job_completions')
          .select('*')
          .eq('job_id', taskId)
          .eq('job_type', 'task')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

      if (!cancelled) {
        if (tErr || !taskData) { setError('Nu am putut încărca task-ul.'); setLoading(false); return }

        // Keep task.final_price aligned with the latest accepted offer if data got out of sync.
        const latestAccepted = (offersData ?? []).find(o => o.status === 'accepted')
        const acceptedPrice = latestAccepted?.proposed_price != null ? Number(latestAccepted.proposed_price) : null
        const currentFinalPrice = taskData.final_price != null ? Number(taskData.final_price) : null

        if (acceptedPrice != null && acceptedPrice !== currentFinalPrice) {
          const { error: syncErr } = await supabase
            .from('tasks')
            .update({
              final_price: acceptedPrice,
              handyman_id: latestAccepted?.handyman_id ?? taskData.handyman_id,
              status: taskData.status === 'pending' || taskData.status === 'open' ? 'assigned' : taskData.status,
              updated_at: new Date().toISOString(),
            })
            .eq('id', taskId)

          if (!syncErr) {
            taskData.final_price = acceptedPrice
            taskData.handyman_id = latestAccepted?.handyman_id ?? taskData.handyman_id
            if (taskData.status === 'pending' || taskData.status === 'open') {
              taskData.status = 'assigned'
            }
          }
        }

        setTask(taskData)
        setEditForm({
          title:          taskData.title ?? '',
          description:    taskData.description ?? '',
          category_id:    taskData.category_id ?? '',
          urgency:        taskData.urgency ?? 'normal',
          budget:         taskData.budget ?? '',
          approximate_duration: taskData.approximate_duration ?? '',
          address_county: taskData.address_county ?? '',
          scheduled_date: taskData.scheduled_date ?? '',
          scheduled_time: taskData.scheduled_time ?? '',
          keywords:       (taskData.keywords ?? []).join(', '),
        })
        setCategories(catsData ?? [])
        setOffers(offersData ?? [])
        setCompletion(completionData ?? null)
        // Fetch assigned handyman profile if task has one
        if (taskData?.handyman_id) {
          Promise.all([
            supabase.from('profiles').select('id, first_name, last_name, avatar_url, city').eq('id', taskData.handyman_id).maybeSingle(),
            supabase.from('handyman_profiles').select('total_jobs_completed, rating_avg').eq('user_id', taskData.handyman_id).maybeSingle(),
          ]).then(([pr, hp]) => {
            if (!cancelled) setAssignedHandyman(pr.data ? { ...pr.data, ...hp.data } : null)
          })
        }
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [taskId])

  if (!taskId) return null

  // ── derived ─────────────────────────────────────────────────────────────────
  const photos    = Array.isArray(task?.photos)   ? task.photos   : []
  const keywords  = Array.isArray(task?.keywords) ? task.keywords : []
  const category  = task?.categories ?? null
  const pendingOffers = offers.filter(o => o.status === 'pending').length
  const acceptedOffer = offers.find(o => o.status === 'accepted')
  const effectiveFinalPrice = task?.final_price ?? acceptedOffer?.proposed_price ?? null
  const isAssigned          = task?.status === 'assigned'
  const isDelayed           = task?.status === 'delayed'
  const isInProgress        = task?.status === 'in_progress'
  const isCompleted         = task?.status === 'completed'
  const isClientApproved    = task?.status === 'client_approved'
  const isCancelled         = task?.status === 'cancelled'
  const isDisputed          = task?.status === 'disputed'
  const isReworkInProgress  = task?.status === 'rework_in_progress'
  const isReworkCompleted   = task?.status === 'rework_completed'
  const isUnderAdminReview  = task?.status === 'under_admin_review'
  const isForcedAccepted    = task?.status === 'forced_accepted'
  const isRefundPartial     = task?.status === 'refund_partial'
  const isRefundFull        = task?.status === 'refund_full'
  const isReworkMarketplace = task?.status === 'rework_marketplace'
  const isAwaitingClientReworkChoice = task?.status === 'awaiting_client_rework_choice'
  const isHandymanDeclinedRework     = task?.status === 'handyman_declined_rework'
  // Stări post-finalizare unde se afișează secțiunea de aprobare/dispută
  const isPostCompletion = isCompleted || isClientApproved || isDisputed || isReworkInProgress || isReworkCompleted
    || isUnderAdminReview || isForcedAccepted || isRefundPartial || isRefundFull || isReworkMarketplace
    || isAwaitingClientReworkChoice || isHandymanDeclinedRework
  // Task-ul nu mai poate fi editat odată ce a primit un handyman sau a început/finalizat
  const isReadOnly = isAssigned || isDelayed || isInProgress || isPostCompletion
  const canRescheduleTask = (isAssigned || isDelayed) && !isInProgress && !isPostCompletion && !isCancelled
  const canCancelTask = !isInProgress && !isPostCompletion && !isCancelled
  const postedAt  = task?.created_at
    ? new Date(task.created_at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })
    : null

  const statusColor = {
    pending:               'bg-yellow-100 text-yellow-700',
    open:                  'bg-green-100 text-green-700',
    assigned:              'bg-blue-100 text-blue-700',
    delayed:               'bg-orange-100 text-orange-700',
    in_progress:           'bg-blue-100 text-blue-700',
    completed:             'bg-gray-100 text-gray-600',
    client_approved:       'bg-emerald-100 text-emerald-700',
    client_rejected:       'bg-rose-100 text-rose-700',
    cancelled:             'bg-red-100 text-red-700',
    disputed:              'bg-red-100 text-red-700',
    rework_in_progress:    'bg-orange-100 text-orange-700',
    rework_completed:      'bg-yellow-100 text-yellow-700',
    under_admin_review:    'bg-purple-100 text-purple-700',
    admin_review:          'bg-purple-100 text-purple-700',
    admin_review_required: 'bg-purple-100 text-purple-700',
    admin_proposed_rework: 'bg-yellow-100 text-yellow-700',
    forced_accepted:       'bg-gray-100 text-gray-600',
    refund_partial:        'bg-teal-100 text-teal-700',
    refund_full:           'bg-teal-200 text-teal-800',
    rework_marketplace:    'bg-indigo-100 text-indigo-700',
    resolved:              'bg-emerald-100 text-emerald-700',
    closed:                'bg-gray-100 text-gray-500',
  }

  const statusLabel = {
    pending:               'În așteptare',
    open:                  'Deschis',
    assigned:              'Meșter atribuit',
    in_progress:           'Lucrare în progres',
    delayed:               'Întârziat',
    completed:             'Finalizat de meșter',
    client_approved:       'Lucrare aprobată',
    client_rejected:       'Lucrare contestată',
    cancelled:             'Anulat',
    disputed:              'Dispută activă',
    rework_in_progress:    'Relucrare în progres',
    rework_completed:      'Relucrare finalizată',
    under_admin_review:    'La administrator',
    admin_review:          'La administrator',
    admin_review_required: 'La administrator',
    admin_proposed_rework: 'Admin propune relucrare',
    forced_accepted:       'Aprobat de administrator',
    refund_partial:        'Rambursare parțială aprobată',
    refund_full:           'Rambursare totală aprobată',
    rework_marketplace:             'Relucrare prin alt meșter',
    awaiting_client_rework_choice:  'Alege cum continui',
    handyman_declined_rework:       'Meșterul a refuzat relucrarea',
    resolved:                       'Dispută rezolvată',
    closed:                         'Închis',
  }

  // ── save edit ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (isReadOnly) {
      setSaveMsg('Eroare: task-ul nu mai poate fi editat în starea actuală.')
      setTab('details')
      return
    }

    setSaving(true)
    const keywordsArr = editForm.keywords
      ? editForm.keywords.split(',').map(k => k.trim()).filter(Boolean)
      : []

    const { data: savedRows, error: saveErr } = await supabase.from('tasks').update({
      title:          editForm.title,
      description:    editForm.description,
      category_id:    editForm.category_id || null,
      urgency:        editForm.urgency,
      budget:         editForm.budget ? Number(editForm.budget) : null,
      approximate_duration: editForm.approximate_duration || null,
      address_county: editForm.address_county,
      scheduled_date: editForm.scheduled_date || null,
      scheduled_time: editForm.scheduled_time || null,
      keywords:       keywordsArr,
      updated_at:     new Date().toISOString(),
    }).eq('id', taskId).in('status', ['pending', 'open']).select('id')

    setSaving(false)
    if (!saveErr && savedRows?.length) {
      setSaveMsg('Modificările au fost salvate!')
      setTimeout(() => setSaveMsg(null), 3000)
      const { data } = await supabase.from('tasks').select('*, categories(id, name, icon)').eq('id', taskId).maybeSingle()
      if (data) setTask(data)
      setTab('details')
      if (onUpdated) onUpdated()
    } else {
      setSaveMsg('Eroare: task-ul nu mai poate fi editat în starea actuală.')
      const { data } = await supabase.from('tasks').select('*, categories(id, name, icon)').eq('id', taskId).maybeSingle()
      if (data) {
        setTask(data)
        if (isReadOnly) setTab('details')
      }
    }
  }

  // ── cancel task (allowed until work starts) ────────────────────────────────
  const handleCancelTask = async () => {
    if (!canCancelTask) return
    setDeleting(true)
    setSaveMsg(null)
    try {
      const nextSpecialInstructions = [task?.special_instructions, '[ANULARE CLIENT]']
        .filter(Boolean)
        .join('\n')

      const { error: cancelErr } = await supabase.from('tasks').update({
        status: 'cancelled',
        special_instructions: nextSpecialInstructions,
        updated_at: new Date().toISOString(),
      }).eq('id', taskId)

      if (cancelErr) throw cancelErr

      const { data: newTask } = await supabase.from('tasks').select('*, categories(id, name, icon)').eq('id', taskId).maybeSingle()
      if (newTask) setTask(newTask)
      setShowCancelModal(false)
      setTab('details')
      setSaveMsg('Task-ul a fost anulat.')
      if (onUpdated) onUpdated()
    } catch (e) {
      setSaveMsg(`Eroare la anulare: ${e.message ?? ''}`)
    } finally {
      setDeleting(false)
    }
  }

  // ── archive task (soft hide, data stays in DB) ────────────────────────────
  const handleArchiveTask = async () => {
    setArchiving(true)
    try {
      const { error: archErr } = await supabase
        .from('tasks')
        .update({ is_archived: true, updated_at: new Date().toISOString() })
        .eq('id', taskId)
      if (archErr) throw archErr
      setShowArchiveModal(false)
      if (onUpdated) onUpdated()
      onClose()
    } catch (e) {
      setSaveMsg(`Eroare la arhivare: ${e.message ?? ''}`)
      setShowArchiveModal(false)
    } finally {
      setArchiving(false)
    }
  }

  const handleCreateRescheduleRequest = async ({ date, time, message }) => {
    if (!task?.handyman_id) {
      setSaveMsg('Eroare: task-ul nu este alocat unui handyman.')
      return
    }

    setRescheduleSaving(true)
    setSaveMsg(null)
    try {
      const now = new Date().toISOString()

      // Get client_id from auth if task.client_id is missing
      let clientId = task.client_id
      if (!clientId) {
        const { data: { user } } = await supabase.auth.getUser()
        clientId = user?.id
      }
      if (!clientId) {
        setSaveMsg('Eroare: nu s-a putut identifica clientul.')
        return
      }

      await supabase.from('reschedule_requests')
        .update({ status: 'rejected', responded_at: now })
        .eq('job_id', taskId)
        .eq('job_type', 'task')
        .in('status', ['pending', 'pending_client', 'pending_handyman'])

      const { error: insertErr } = await supabase.from('reschedule_requests').insert({
        job_id: taskId,
        job_type: 'task',
        handyman_id: task.handyman_id,
        client_id: clientId,
        proposed_date: date,
        proposed_time: time,
        message: message || null,
        status: 'pending_handyman',
        created_at: now,
      })

      if (insertErr) throw insertErr

      setShowRescheduleModal(false)
      setSaveMsg('Cererea de reprogramare a fost trimisă către handyman.')
      if (onUpdated) onUpdated()
    } catch (e) {
      setSaveMsg(`Eroare la trimiterea reprogramării: ${e.message ?? ''}`)
    } finally {
      setRescheduleSaving(false)
    }
  }

  // ── accept offer ───────────────────────────────────────────────────────────
  const handleAcceptOffer = async (offer) => {
    if (isReadOnly) {
      setSaveMsg('Eroare: task-ul este deja atribuit. Nu mai poți accepta alte oferte.')
      setTab('details')
      return
    }

    setAccepting(true)
    setSaveMsg(null)
    try {
      // Accept selected offer, reject all others, then set final task price.
      const { error: acceptErr } = await supabase.from('task_offers').update({ status: 'accepted' }).eq('id', offer.id)
      if (acceptErr) throw acceptErr

      const { error: rejectErr } = await supabase.from('task_offers').update({ status: 'rejected' })
        .eq('task_id', taskId)
        .neq('id', offer.id)
      if (rejectErr) throw rejectErr

      const { error: taskErr } = await supabase.from('tasks').update({
        status: 'assigned',
        handyman_id: offer.handyman_id,
        final_price: offer.proposed_price,
        updated_at: new Date().toISOString(),
      }).eq('id', taskId)
      if (taskErr) throw taskErr

      // refresh
      const { data: newOffers } = await supabase.from('task_offers')
        .select('*, handyman:handyman_id(first_name, last_name, avatar_url, city, average_rating)')
        .eq('task_id', taskId).order('created_at', { ascending: false })
      setOffers(newOffers ?? [])
      const { data: newTask } = await supabase.from('tasks').select('*, categories(id, name, icon)').eq('id', taskId).maybeSingle()
      if (newTask) setTask(newTask)
      if (onUpdated) onUpdated()
    } catch (e) {
      setSaveMsg(`Eroare la acceptarea ofertei: ${e.message ?? ''}`)
    } finally {
      setAccepting(false)
    }
  }

  // ── decline offer ──────────────────────────────────────────────────────────
  const handleDeclineOffer = async (offer) => {
    await supabase.from('task_offers').update({ status: 'rejected' }).eq('id', offer.id)
    setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, status: 'rejected' } : o))
  }

  // ── negotiate offer ────────────────────────────────────────────────────────
  const handleNegotiateOffer = async (offer, { price, message }) => {
      if (isReadOnly) {
        setSaveMsg('Eroare: task-ul este deja atribuit. Nu mai poți negocia oferte.')
        setTab('details')
        return
      }

      if (!price) return
    
      // 1. Marchează oferta curentă a handyman-ului ca 'negotiating'
      await supabase.from('task_offers')
        .update({ status: 'negotiating' })
        .eq('id', offer.id)
    
      // 2. Inserează contra-oferta clientului cu sent_by: 'client'
      await supabase.from('task_offers').insert({
        task_id:            offer.task_id,
        handyman_id:        offer.handyman_id,
        proposed_price:     Number(price),
        message:            message || null,
        status:             'pending',
        sent_by:            'client',            // ← CHEIE: știm că e de la client
        estimated_duration: offer.estimated_duration ?? null,
        available_date:     offer.available_date ?? null,
        available_time:     offer.available_time ?? null,
        created_at:         new Date().toISOString(),
        updated_at:         new Date().toISOString(),
      })
    
      // 3. Reîncarcă ofertele
      const { data: newOffers } = await supabase
        .from('task_offers')
        .select('*, handyman:handyman_id(first_name, last_name, avatar_url, city, average_rating)')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })
      setOffers(newOffers ?? [])
  }
 
  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:px-4" onClick={onClose}>
        <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[92dvh]"
          onClick={e => e.stopPropagation()}>

          {/* ── HEADER ── */}
          <div className="flex items-start justify-between p-5 border-b border-gray-100 flex-shrink-0">
            <div className="flex-1 min-w-0 pr-2">
              <h3 className="text-base font-bold text-gray-800 leading-snug line-clamp-1">
                {loading ? 'Se încarcă…' : (task?.title ?? '—')}
              </h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {!loading && category && (
                  <div className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                    <CategoryIcon iconName={category.icon} className="w-3.5 h-3.5" />
                    {category.name}
                  </div>
                )}
                {!loading && task?.status && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[task.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {statusLabel[task.status] ?? task.status}
                  </span>
                )}
                {!loading && task?.urgency && <UrgencyBadge urgency={task.urgency} />}
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center flex-shrink-0">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* ── TABS ── */}
          {!loading && task && (
            <div className="flex border-b border-gray-100 flex-shrink-0">
              {[
                { id: 'details', label: 'Detalii' },
                { id: 'offers',  label: `Oferte${pendingOffers > 0 ? ` (${pendingOffers})` : ''}` },
                { id: 'edit',    label: isReadOnly ? 'Editează (blocat)' : 'Editează' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => {
                    if (t.id === 'edit' && isReadOnly) {
                      setSaveMsg('Eroare: task-ul nu mai poate fi editat în starea actuală.')
                      setTab('details')
                      return
                    }
                    setTab(t.id)
                  }}
                  disabled={t.id === 'edit' && isReadOnly}
                  className={`flex-1 py-3 text-sm font-medium transition border-b-2 ${
                    tab === t.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  } ${t.id === 'offers' && pendingOffers > 0 ? 'relative' : ''} ${t.id === 'edit' && isReadOnly ? 'opacity-50 cursor-not-allowed hover:text-gray-500' : ''}`}>
                  {t.label}
                  {t.id === 'offers' && pendingOffers > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full">
                      {pendingOffers}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* ── BODY ── */}
          <div className="overflow-y-auto flex-1 p-5 space-y-4">

            {loading && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-sm text-gray-400">Se încarcă…</p>
              </div>
            )}

            {!loading && error && (
              <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <Info className="w-4 h-4 flex-shrink-0" />{error}
              </div>
            )}

            {/* ════ DETAILS TAB ════ */}
            {!loading && task && tab === 'details' && (
              <>

                {/* Completion approval — shown for completed + all post-completion dispute states */}
                {isPostCompletion && (
                  <CompletionApprovalSection
                    completion={completion}
                    task={task}
                    taskId={taskId}
                    taskTitle={task.title}
                    handymanId={task.handyman_id}
                    clientId={task.client_id}
                    onUpdated={onUpdated}
                    onMsg={setSaveMsg}
                  />
                )}

                <PhotoGallery photos={photos} />

                {!photos.length && (
                  <div className="h-24 rounded-xl bg-gray-50 border border-dashed border-gray-200 flex flex-col items-center justify-center gap-1">
                    <Camera className="w-5 h-5 text-gray-300" />
                    <p className="text-xs text-gray-400">Fără poze</p>
                  </div>
                )}

                {task.description && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1.5">Descriere</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{task.description}</p>
                  </div>
                )}

                <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-100 overflow-hidden">
                  {task.address_county && (
                    <div className="flex items-center gap-3 p-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-4 h-4 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Județ</p>
                        <p className="text-sm text-gray-700 font-semibold">{task.address_county}</p>
                      </div>
                    </div>
                  )}
                  {(task.scheduled_date || task.scheduled_time) && (
                    <div className="flex items-center gap-3 p-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-4 h-4 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Data dorită</p>
                        <p className="text-sm text-gray-700 font-semibold">
                          {task.scheduled_date ? new Date(task.scheduled_date).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
                          {task.scheduled_time ? ` · ${task.scheduled_time}` : ''}
                        </p>
                      </div>
                    </div>
                  )}
                  {task.budget && (
                    <div className="flex items-center gap-3 p-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <DollarSign className="w-4 h-4 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Bugetul tău</p>
                        <p className="text-sm text-gray-700 font-semibold">{Number(task.budget).toLocaleString('ro-RO')} RON</p>
                      </div>
                    </div>
                  )}
                  {task.approximate_duration && (
                    <div className="flex items-center gap-3 p-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-4 h-4 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Durată estimată</p>
                        <p className="text-sm text-gray-700 font-semibold">{task.approximate_duration}</p>
                      </div>
                    </div>
                  )}
                  {effectiveFinalPrice && (
                    <div className="flex items-center gap-3 p-3">
                      <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                        <BadgeCheck className="w-4 h-4 text-green-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Preț final acceptat</p>
                        <p className="text-sm text-green-700 font-bold">{Number(effectiveFinalPrice).toLocaleString('ro-RO')} RON</p>
                      </div>
                    </div>
                  )}
                  {postedAt && (
                    <div className="flex items-center gap-3 p-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Star className="w-4 h-4 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Postat pe</p>
                        <p className="text-sm text-gray-700 font-semibold">{postedAt}</p>
                      </div>
                    </div>
                  )}
                </div>

                {keywords.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Cuvinte cheie</p>
                    <div className="flex flex-wrap gap-1.5">
                      {keywords.map((kw, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-full border border-blue-100">
                          <Tag className="w-2.5 h-2.5" />{kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {task.insurance_required && (
                  <div className="flex items-center gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
                    <Shield className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800">Asigurare obligatorie</p>
                      <p className="text-xs text-amber-600 mt-0.5">Ai solicitat dovada asigurării pentru această lucrare.</p>
                    </div>
                  </div>
                )}

                {isDelayed && (
                  <div className="flex items-start gap-3 p-3.5 bg-orange-50 border border-orange-200 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-orange-800">Task marcat ca întârziat</p>
                      <p className="text-xs text-orange-700 mt-0.5">
                        {task.delay_reason || 'Handymanul a anunțat că ajunge cu întârziere.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* ── MEȘTER ALOCAT — shown for assigned/in-progress/delayed, not post-completion (handled there) ── */}
                {assignedHandyman && (() => {
                  const hmSlug = slugify(assignedHandyman.first_name ?? '', assignedHandyman.last_name ?? '')
                  const hmName = `${assignedHandyman.first_name ?? ''} ${assignedHandyman.last_name ?? ''}`.trim()
                  const initials = `${assignedHandyman.first_name?.[0] ?? ''}${assignedHandyman.last_name?.[0] ?? ''}`.toUpperCase()
                  return (
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Meșter alocat</p>
                      <button
                        onClick={() => navigate(`/handymen/${hmSlug}`)}
                        className="w-full flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition text-left"
                      >
                        <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-blue-100 flex items-center justify-center">
                          {assignedHandyman.avatar_url
                            ? <img src={assignedHandyman.avatar_url} alt={hmName} className="w-full h-full object-cover" />
                            : <span className="text-blue-700 font-bold text-sm">{initials}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-800 leading-tight">{hmName}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            {assignedHandyman.city && (
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <MapPin className="w-3 h-3" />{assignedHandyman.city}
                              </span>
                            )}
                            {assignedHandyman.rating_avg > 0 && (
                              <span className="flex items-center gap-1 text-xs text-yellow-600 font-semibold">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                {Number(assignedHandyman.rating_avg).toFixed(1)}
                              </span>
                            )}
                            {assignedHandyman.total_jobs_completed > 0 && (
                              <span className="text-xs text-gray-400">{assignedHandyman.total_jobs_completed} job-uri</span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      </button>
                    </div>
                  )
                })()}

                {(canRescheduleTask || canCancelTask) && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowRescheduleModal(true)}
                      disabled={!canRescheduleTask}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-blue-200 text-blue-600 rounded-xl text-sm font-medium hover:bg-blue-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <CalendarClock className="w-4 h-4" /> Reprogramează
                    </button>
                    <button
                      onClick={() => setShowCancelModal(true)}
                      disabled={!canCancelTask || deleting}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-red-200 text-red-500 rounded-xl text-sm font-medium hover:bg-red-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <XCircle className="w-4 h-4" /> {deleting ? 'Se anulează…' : 'Anulează task-ul'}
                    </button>
                  </div>
                )}

                {isReadOnly && (
                  <p className="text-xs text-gray-400">
                    Task-ul nu mai poate fi editat după atribuire. Poți folosi reprogramarea dacă e alocat sau întârziat.
                  </p>
                )}

                {/* archive button — visible for cancelled or completed tasks */}
                {(isCancelled || isCompleted) && (
                  <button
                    onClick={() => setShowArchiveModal(true)}
                    disabled={archiving}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-50 border border-gray-300 text-gray-500 rounded-xl text-sm font-medium hover:bg-gray-100 transition disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    {archiving ? 'Se arhivează…' : 'Arhivează task-ul'}
                  </button>
                )}
              </>
            )}

            {/* ════ OFFERS TAB ════ */}
            {!loading && task && tab === 'offers' && (
              <>
                {offers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                      <MessageSquare className="w-6 h-6 text-gray-300" />
                    </div>
                    <p className="text-sm font-semibold text-gray-600">Nicio ofertă primită încă</p>
                    <p className="text-xs text-gray-400 text-center">Handymanii din zona ta vor vedea task-ul și vor trimite oferte</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* pending first */}
                    {offers.filter(o => o.status === 'pending').map(offer => (
                      <OfferCard key={offer.id} offer={offer}
                        onAccept={handleAcceptOffer}
                        onNegotiate={o => setNegotiateOffer(o)}
                        onDecline={handleDeclineOffer}
                        accepting={accepting}
                        readOnly={isReadOnly}
                      />
                    ))}
                    {/* accepted */}
                    {offers.filter(o => o.status === 'accepted').map(offer => (
                      <OfferCard key={offer.id} offer={offer}
                        onAccept={handleAcceptOffer} onNegotiate={o => setNegotiateOffer(o)}
                        onDecline={handleDeclineOffer} accepting={accepting} readOnly={isReadOnly}
                      />
                    ))}
                    {/* negotiating */}
                    {offers.filter(o => o.status === 'negotiating').map(offer => (
                      <OfferCard key={offer.id} offer={offer}
                        onAccept={handleAcceptOffer} onNegotiate={o => setNegotiateOffer(o)}
                        onDecline={handleDeclineOffer} accepting={accepting} readOnly={isReadOnly}
                      />
                    ))}
                    {/* rejected - collapsed */}
                    {offers.filter(o => o.status === 'rejected').length > 0 && (
                      <details className="group">
                        <summary className="text-xs text-gray-400 cursor-pointer select-none list-none flex items-center gap-1 py-1">
                          <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                          {offers.filter(o => o.status === 'rejected').length} ofertă/oferte refuzate
                        </summary>
                        <div className="space-y-2 mt-2">
                          {offers.filter(o => o.status === 'rejected').map(offer => (
                            <OfferCard key={offer.id} offer={offer}
                              onAccept={handleAcceptOffer} onNegotiate={o => setNegotiateOffer(o)}
                              onDecline={handleDeclineOffer} accepting={accepting} readOnly={isReadOnly}
                            />
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ════ EDIT TAB ════ */}
            {!loading && task && tab === 'edit' && (
              <div className="space-y-4">
                {isReadOnly && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
                    <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {isCompleted ? 'Task-ul este finalizat. Editarea nu este posibilă.' :
                     isInProgress ? 'Lucrarea este în desfășurare. Editarea este blocată.' :
                     'Task-ul este atribuit. Editarea este blocată după atribuire.'}
                  </div>
                )}

                {saveMsg && (
                  <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium ${
                    saveMsg.includes('Eroare') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                  }`}>
                    {saveMsg.includes('Eroare') ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                    {saveMsg}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Titlu *</label>
                  <input type="text" value={editForm.title}
                    onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
                    disabled={isReadOnly}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Descriere</label>
                  <textarea value={editForm.description}
                    onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                    disabled={isReadOnly}
                    rows={3} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Categorie</label>
                    <select value={editForm.category_id}
                      onChange={e => setEditForm(p => ({ ...p, category_id: e.target.value }))}
                      disabled={isReadOnly}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                      <option value="">Selectează</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Urgență</label>
                    <select value={editForm.urgency}
                      onChange={e => setEditForm(p => ({ ...p, urgency: e.target.value }))}
                      disabled={isReadOnly}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                      {URGENCY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Buget (RON)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="number" value={editForm.budget}
                        onChange={e => setEditForm(p => ({ ...p, budget: e.target.value }))}
                        disabled={isReadOnly}
                        placeholder="Ex: 300"
                        className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Durată estimată</label>
                    <input type="text" value={editForm.approximate_duration}
                      onChange={e => setEditForm(p => ({ ...p, approximate_duration: e.target.value }))}
                      disabled={isReadOnly}
                      placeholder="Ex: 2-3 ore"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Județ</label>
                    <input type="text" value={editForm.address_county}
                      onChange={e => setEditForm(p => ({ ...p, address_county: e.target.value }))}
                      disabled={isReadOnly}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  </div>
                  <div />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Data dorită</label>
                    <input type="date" value={editForm.scheduled_date}
                      onChange={e => setEditForm(p => ({ ...p, scheduled_date: e.target.value }))}
                      disabled={isReadOnly}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Ora dorită</label>
                    <select value={editForm.scheduled_time}
                      onChange={e => setEditForm(p => ({ ...p, scheduled_time: e.target.value }))}
                      disabled={isReadOnly}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                      <option value="">—</option>
                      {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Cuvinte cheie</label>
                  <input type="text" value={editForm.keywords}
                    onChange={e => setEditForm(p => ({ ...p, keywords: e.target.value }))}
                    disabled={isReadOnly}
                    placeholder="Ex: curățenie, urgență, montaj"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  <p className="text-xs text-gray-400 mt-1">Separate prin virgulă</p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setTab('details')}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
                    <RotateCcw className="w-4 h-4" /> Anulează
                  </button>
                  <button onClick={handleSave} disabled={!editForm.title || saving || isReadOnly}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50">
                    <Save className="w-4 h-4" />
                    {saving ? 'Se salvează…' : 'Salvează'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* negotiate sub-modal */}
      {negotiateOffer && (
        <NegotiateModal
          offer={negotiateOffer}
          onClose={() => setNegotiateOffer(null)}
          onSend={handleNegotiateOffer}
        />
      )}
      {showRescheduleModal && (
        <TaskRescheduleRequestModal
          task={task}
          onClose={() => setShowRescheduleModal(false)}
          onSubmit={handleCreateRescheduleRequest}
          sending={rescheduleSaving}
        />
      )}
      {showCancelModal && (
        <CancelConfirmModal
          taskTitle={task?.title ?? 'Task'}
          onClose={() => setShowCancelModal(false)}
          onConfirm={handleCancelTask}
          saving={deleting}
        />
      )}
      {showArchiveModal && (
        <ArchiveConfirmModal
          taskTitle={task?.title ?? 'Task'}
          onClose={() => setShowArchiveModal(false)}
          onConfirm={handleArchiveTask}
          saving={archiving}
        />
      )}
    </>
  )
}