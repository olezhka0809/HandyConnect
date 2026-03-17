import { useState, useEffect } from 'react'
import { supabase } from '../../../supabase'
import {
  X, Edit3, Save, XCircle, Camera, MapPin, Calendar,
  Clock, DollarSign, Tag, Shield, AlertTriangle, Zap,
  Star, Briefcase, Loader2, MessageSquare, Info,
  CheckCircle, ChevronLeft, ChevronRight, Trash2,
  User, Send, RotateCcw, BadgeCheck, ChevronDown,
  Layers, Square, Wrench, Paintbrush, Hammer, Sparkles,
  Flower2, Sofa, CircuitBoard, Lightbulb, Building2,
  MoreHorizontal, Droplets, Plug
} from 'lucide-react'

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

// ─── photo gallery ────────────────────────────────────────────────────────────
function PhotoGallery({ photos }) {
  const [active, setActive] = useState(0)
  if (!photos?.length) return null
  return (
    <div className="space-y-2">
      <div className="relative rounded-xl overflow-hidden bg-gray-100 h-44">
        <img src={photos[active]} alt="" className="w-full h-full object-cover"
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
    </div>
  )
}

// ─── offer card ───────────────────────────────────────────────────────────────
function OfferCard({ offer, onAccept, onNegotiate, onDecline, accepting }) {
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
      {offer.status === 'pending' && (
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
  const [negotiateOffer, setNegotiateOffer] = useState(null)
  const [saveMsg,    setSaveMsg]    = useState(null)

  // ── load ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!taskId) { setTask(null); setOffers([]); return }
    let cancelled = false
    setLoading(true); setError(null); setTab('details')

    async function load() {
      const [{ data: taskData, error: tErr }, { data: catsData }, { data: offersData }] = await Promise.all([
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
      ])

      if (!cancelled) {
        if (tErr || !taskData) { setError('Nu am putut încărca task-ul.'); setLoading(false); return }
        setTask(taskData)
        setEditForm({
          title:          taskData.title ?? '',
          description:    taskData.description ?? '',
          category_id:    taskData.category_id ?? '',
          urgency:        taskData.urgency ?? 'normal',
          budget:         taskData.budget ?? '',
          address_county: taskData.address_county ?? '',
          scheduled_date: taskData.scheduled_date ?? '',
          scheduled_time: taskData.scheduled_time ?? '',
          keywords:       (taskData.keywords ?? []).join(', '),
        })
        setCategories(catsData ?? [])
        setOffers(offersData ?? [])
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
  const postedAt  = task?.created_at
    ? new Date(task.created_at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })
    : null

  const statusColor = {
    pending:   'bg-yellow-100 text-yellow-700',
    open:      'bg-green-100 text-green-700',
    assigned:  'bg-blue-100 text-blue-700',
    completed: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-red-100 text-red-700',
  }

  // ── save edit ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true)
    const keywordsArr = editForm.keywords
      ? editForm.keywords.split(',').map(k => k.trim()).filter(Boolean)
      : []

    const { error: saveErr } = await supabase.from('tasks').update({
      title:          editForm.title,
      description:    editForm.description,
      category_id:    editForm.category_id || null,
      urgency:        editForm.urgency,
      budget:         editForm.budget ? Number(editForm.budget) : null,
      address_county: editForm.address_county,
      scheduled_date: editForm.scheduled_date || null,
      scheduled_time: editForm.scheduled_time || null,
      keywords:       keywordsArr,
      updated_at:     new Date().toISOString(),
    }).eq('id', taskId)

    setSaving(false)
    if (!saveErr) {
      setSaveMsg('Modificările au fost salvate!')
      setTimeout(() => setSaveMsg(null), 3000)
      // refresh task
      const { data } = await supabase.from('tasks').select('*, categories(id, name, icon)').eq('id', taskId).maybeSingle()
      if (data) setTask(data)
      setTab('details')
      if (onUpdated) onUpdated()
    } else {
      setSaveMsg('Eroare la salvare. Încearcă din nou.')
    }
  }

  // ── delete task ────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!window.confirm('Ești sigur că vrei să ștergi acest task?')) return
    setDeleting(true)
    await supabase.from('tasks').delete().eq('id', taskId)
    setDeleting(false)
    onClose()
    if (onUpdated) onUpdated()
  }

  // ── accept offer ───────────────────────────────────────────────────────────
  const handleAcceptOffer = async (offer) => {
    setAccepting(true)
    // accept this offer
    await supabase.from('task_offers').update({ status: 'accepted' }).eq('id', offer.id)
    // reject all others
    const others = offers.filter(o => o.id !== offer.id && o.status === 'pending')
    if (others.length) {
      await supabase.from('task_offers')
        .update({ status: 'rejected' })
        .in('id', others.map(o => o.id))
    }
    // update task status to assigned + set handyman
    await supabase.from('tasks').update({
      status: 'assigned',
      handyman_id: offer.handyman_id,
      final_price: offer.proposed_price,
    }).eq('id', taskId)

    // refresh
    const { data: newOffers } = await supabase.from('task_offers')
      .select('*, handyman:handyman_id(first_name, last_name, avatar_url, city, average_rating)')
      .eq('task_id', taskId).order('created_at', { ascending: false })
    setOffers(newOffers ?? [])
    const { data: newTask } = await supabase.from('tasks').select('*, categories(id, name, icon)').eq('id', taskId).maybeSingle()
    if (newTask) setTask(newTask)
    setAccepting(false)
    if (onUpdated) onUpdated()
  }

  // ── decline offer ──────────────────────────────────────────────────────────
  const handleDeclineOffer = async (offer) => {
    await supabase.from('task_offers').update({ status: 'rejected' }).eq('id', offer.id)
    setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, status: 'rejected' } : o))
  }

  // ── negotiate offer ────────────────────────────────────────────────────────
  const handleNegotiateOffer = async (offer, { price, message }) => {
    // insert a counter-offer back as a new offer (from client side)
    await supabase.from('task_offers').update({ status: 'negotiating' }).eq('id', offer.id)
    // You could also store the counter-proposal in a messages table
    // For now, update the offer status and refresh
    const { data: newOffers } = await supabase.from('task_offers')
      .select('*, handyman:handyman_id(first_name, last_name, avatar_url, city, average_rating)')
      .eq('task_id', taskId).order('created_at', { ascending: false })
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
                    {task.status === 'pending'   ? 'În așteptare' :
                     task.status === 'open'      ? 'Deschis' :
                     task.status === 'assigned'  ? 'Atribuit' :
                     task.status === 'completed' ? 'Finalizat' :
                     task.status === 'cancelled' ? 'Anulat' : task.status}
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
                { id: 'edit',    label: 'Editează' },
              ].map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex-1 py-3 text-sm font-medium transition border-b-2 ${
                    tab === t.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  } ${t.id === 'offers' && pendingOffers > 0 ? 'relative' : ''}`}>
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
                  {task.final_price && (
                    <div className="flex items-center gap-3 p-3">
                      <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                        <BadgeCheck className="w-4 h-4 text-green-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Preț final acceptat</p>
                        <p className="text-sm text-green-700 font-bold">{Number(task.final_price).toLocaleString('ro-RO')} RON</p>
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

                {/* delete button */}
                {task.status !== 'completed' && task.status !== 'assigned' && (
                  <button onClick={handleDelete} disabled={deleting}
                    className="w-full flex items-center justify-center gap-2 py-2.5 border border-red-200 text-red-500 rounded-xl text-sm font-medium hover:bg-red-50 transition disabled:opacity-50">
                    <Trash2 className="w-4 h-4" />
                    {deleting ? 'Se șterge…' : 'Șterge task-ul'}
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
                      />
                    ))}
                    {/* accepted */}
                    {offers.filter(o => o.status === 'accepted').map(offer => (
                      <OfferCard key={offer.id} offer={offer}
                        onAccept={handleAcceptOffer} onNegotiate={o => setNegotiateOffer(o)}
                        onDecline={handleDeclineOffer} accepting={accepting}
                      />
                    ))}
                    {/* negotiating */}
                    {offers.filter(o => o.status === 'negotiating').map(offer => (
                      <OfferCard key={offer.id} offer={offer}
                        onAccept={handleAcceptOffer} onNegotiate={o => setNegotiateOffer(o)}
                        onDecline={handleDeclineOffer} accepting={accepting}
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
                              onDecline={handleDeclineOffer} accepting={accepting}
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
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Descriere</label>
                  <textarea value={editForm.description}
                    onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                    rows={3} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Categorie</label>
                    <select value={editForm.category_id}
                      onChange={e => setEditForm(p => ({ ...p, category_id: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                      <option value="">Selectează</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Urgență</label>
                    <select value={editForm.urgency}
                      onChange={e => setEditForm(p => ({ ...p, urgency: e.target.value }))}
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
                        placeholder="Ex: 300"
                        className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Județ</label>
                    <input type="text" value={editForm.address_county}
                      onChange={e => setEditForm(p => ({ ...p, address_county: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Data dorită</label>
                    <input type="date" value={editForm.scheduled_date}
                      onChange={e => setEditForm(p => ({ ...p, scheduled_date: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Ora dorită</label>
                    <select value={editForm.scheduled_time}
                      onChange={e => setEditForm(p => ({ ...p, scheduled_time: e.target.value }))}
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
                    placeholder="Ex: curățenie, urgență, montaj"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  <p className="text-xs text-gray-400 mt-1">Separate prin virgulă</p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setTab('details')}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
                    <RotateCcw className="w-4 h-4" /> Anulează
                  </button>
                  <button onClick={handleSave} disabled={!editForm.title || saving}
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
    </>
  )
}