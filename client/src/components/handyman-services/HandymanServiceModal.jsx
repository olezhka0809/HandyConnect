import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import {
  X, Edit3, Save, Star, Briefcase, DollarSign, Clock,
  Tag, Camera, Loader2, Info, CheckCircle, XCircle,
  RotateCcw, ToggleLeft, ToggleRight, Flame, Calendar,
  ChevronLeft, ChevronRight, Trash2, AlertTriangle,
  Layers, Square, Wrench, Paintbrush, Hammer, Sparkles,
  Flower2, Sofa, CircuitBoard, Lightbulb, Building2,
  MoreHorizontal, Droplets, Plug, Zap, ImagePlus, Upload
} from 'lucide-react'

// ─── category icon map ────────────────────────────────────────────────────────
const ICON_MAP = {
  bolt: Plug, Droplets, 'paint-roller': Paintbrush, square: Square,
  wallpaper: Layers, pipe: Wrench, Wrench, Zap, Paintbrush, Hammer,
  Sparkles, Flower2, Sofa, CircuitBoard, Lightbulb, Building2,
  MoreHorizontal, Droplets, Plug,
}
function CatIcon({ iconName, className = 'w-4 h-4' }) {
  const Icon = ICON_MAP[iconName] ?? Wrench
  return <Icon className={className} />
}

// ─── star rating display ──────────────────────────────────────────────────────
function StarRating({ rating, count }) {
  if (!rating || count === 0) return (
    <span className="text-xs text-gray-400 italic">Fără recenzii încă</span>
  )
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex">
        {[1,2,3,4,5].map(i => (
          <Star key={i} className={`w-4 h-4 ${i <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
        ))}
      </div>
      <span className="text-sm font-bold text-gray-700">{Number(rating).toFixed(1)}</span>
      <span className="text-xs text-gray-400">({count} {count === 1 ? 'recenzie' : 'recenzii'})</span>
    </div>
  )
}

// ─── photo gallery ────────────────────────────────────────────────────────────
function PhotoGallery({ photos }) {
  const [active, setActive] = useState(0)
  if (!photos?.length) return (
    <div className="h-32 rounded-xl bg-gray-50 border border-dashed border-gray-200 flex flex-col items-center justify-center gap-1.5">
      <Camera className="w-6 h-6 text-gray-300" />
      <p className="text-xs text-gray-400">Fără poze atașate</p>
    </div>
  )
  return (
    <div className="space-y-2">
      <div className="relative rounded-xl overflow-hidden bg-gray-100 h-auto max-h-[420px] flex items-center justify-center">
        <img src={photos[active]} alt="" className="w-full h-auto max-h-[420px] object-contain"
          onError={e => { e.currentTarget.src = '' }} />
        {photos.length > 1 && (
          <>
            <button onClick={() => setActive(i => Math.max(0, i - 1))} disabled={active === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setActive(i => Math.min(photos.length - 1, i + 1))} disabled={active === photos.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center disabled:opacity-30">
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

// ─── review card ──────────────────────────────────────────────────────────────
function ReviewCard({ review }) {
  const reviewer = review.reviewer
  const name = reviewer ? `${reviewer.first_name ?? ''} ${reviewer.last_name ?? ''}`.trim() || 'Client anonim' : 'Client anonim'
  const date = review.created_at
    ? new Date(review.created_at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })
    : null

  return (
    <div className="p-3 bg-gray-50 rounded-xl space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold flex-shrink-0">
            {name.split(' ').filter(Boolean).slice(0,2).map(n => n[0]).join('')}
          </div>
          <span className="text-sm font-semibold text-gray-700">{name}</span>
        </div>
        <div className="flex items-center gap-1">
          {[1,2,3,4,5].map(i => (
            <Star key={i} className={`w-3 h-3 ${i <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
          ))}
        </div>
      </div>
      {review.title && <p className="text-xs font-semibold text-gray-700">{review.title}</p>}
      {review.description && <p className="text-xs text-gray-500 leading-relaxed">{review.description}</p>}
      {date && <p className="text-[11px] text-gray-400">{date}</p>}
    </div>
  )
}

// ─── TIME SLOTS & DURATION OPTIONS ───────────────────────────────────────────
const DURATION_OPTIONS = [
  'Sub 1 oră', '1-2 ore', '2-3 ore', '3-4 ore', '4-6 ore', '6-8 ore', '1-2 zile', 'Peste 2 zile'
]

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * HandymanServiceModal
 *
 * Props:
 *   serviceId  – string | null
 *   onClose    – () => void
 *   onUpdated  – () => void
 */
export default function HandymanServiceModal({ serviceId, onClose, onUpdated }) {
  const [service,    setService]    = useState(null)
  const [categories, setCategories] = useState([])
  const [reviews,    setReviews]    = useState([])
  const [lastBooking,setLastBooking]= useState(null)
  const [ratingStats,setRatingStats]= useState({ avg: 0, count: 0 })
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)
  const [tab,        setTab]        = useState('details')
  const [editForm,   setEditForm]   = useState({})
  const [saving,     setSaving]     = useState(false)
  const [saveMsg,    setSaveMsg]    = useState(null)
  const [deleting,   setDeleting]   = useState(false)
  const [toggling,   setToggling]   = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  // ── load ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!serviceId) { setService(null); setReviews([]); return }
    let cancelled = false
    setLoading(true); setError(null); setTab('details')

    async function load() {
      // 1. service + category join
      const [{ data: svc, error: svcErr }, { data: cats }] = await Promise.all([
        supabase.from('handyman_services')
          .select('*, categories(id, name, icon)')
          .eq('id', serviceId)
          .maybeSingle(),
        supabase.from('categories').select('id, name, icon').eq('is_active', true).order('name'),
      ])

      if (svcErr || !svc) {
        if (!cancelled) { setError('Nu am putut încărca serviciul.'); setLoading(false) }
        return
      }

      // 2. last booking for this service
      const { data: lastBook } = await supabase
        .from('bookings')
        .select('id, created_at, status')
        .eq('service_id', serviceId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // 3. reviews via bookings.service_id
      //    get all booking ids for this service first
      const { data: bookingIds } = await supabase
        .from('bookings')
        .select('id')
        .eq('service_id', serviceId)

      let reviewsData = []
      if (bookingIds?.length) {
        const ids = bookingIds.map(b => b.id)
        const { data: revs } = await supabase
          .from('reviews')
          .select(`
            id, rating, title, description, created_at,
            reviewer:reviewer_id (first_name, last_name, avatar_url)
          `)
          .in('booking_id', ids)
          .order('created_at', { ascending: false })
          .limit(10)
        reviewsData = revs ?? []
      }

      if (!cancelled) {
        setService(svc)
        setCategories(cats ?? [])
        setLastBooking(lastBook ?? null)
        setReviews(reviewsData)

        // rating stats
        if (reviewsData.length) {
          const avg = reviewsData.reduce((acc, r) => acc + r.rating, 0) / reviewsData.length
          setRatingStats({ avg, count: reviewsData.length })
        } else {
          setRatingStats({ avg: 0, count: 0 })
        }

        setEditForm({
          title:              svc.title ?? '',
          description:        svc.description ?? '',
          category_id:        svc.category_id ?? '',
          base_price:         svc.base_price ?? '',
          price_per_hour:     svc.price_per_hour ?? '',
          estimated_duration: svc.estimated_duration ?? '',
          keywords:           (svc.keywords ?? []).join(', '),
          is_available:       svc.is_available ?? true,
        })
        setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [serviceId])

  if (!serviceId) return null

  // ── derived ─────────────────────────────────────────────────────────────────
  const photos   = Array.isArray(service?.photos) ? service.photos : []
  const keywords = Array.isArray(service?.keywords) ? service.keywords : []
  const category = service?.categories ?? null
  const lastBookingLabel = lastBooking?.created_at
    ? new Date(lastBooking.created_at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })
    : null

  // ── toggle availability ─────────────────────────────────────────────────────
  const handleToggleAvailable = async () => {
    setToggling(true)
    const newVal = !service.is_available
    await supabase.from('handyman_services').update({ is_available: newVal }).eq('id', serviceId)
    setService(prev => ({ ...prev, is_available: newVal }))
    setToggling(false)
  }

  // ── save edit ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true)
    const kw = editForm.keywords
      ? editForm.keywords.split(',').map(k => k.trim()).filter(Boolean)
      : []
    const { error: saveErr } = await supabase.from('handyman_services').update({
      title:              editForm.title,
      description:        editForm.description,
      category_id:        editForm.category_id || null,
      base_price:         editForm.base_price ? Number(editForm.base_price) : null,
      price_per_hour:     editForm.price_per_hour ? Number(editForm.price_per_hour) : null,
      estimated_duration: editForm.estimated_duration || null,
      keywords:           kw,
      updated_at:         new Date().toISOString(),
    }).eq('id', serviceId)

    setSaving(false)
    if (!saveErr) {
      setSaveMsg('Modificările au fost salvate!')
      setTimeout(() => setSaveMsg(null), 3000)
      const { data } = await supabase.from('handyman_services')
        .select('*, categories(id, name, icon)').eq('id', serviceId).maybeSingle()
      if (data) setService(data)
      setTab('details')
      if (onUpdated) onUpdated()
    } else {
      setSaveMsg('Eroare la salvare. Încearcă din nou.')
    }
  }

  // ── delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!window.confirm('Ești sigur că vrei să ștergi acest serviciu?')) return
    setDeleting(true)
    await supabase.from('handyman_services').delete().eq('id', serviceId)
    setDeleting(false)
    onClose()
    if (onUpdated) onUpdated()
  }

  // ── upload photo ────────────────────────────────────────────────────────────
  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploadingPhoto(true)

    const newUrls = []
    for (const file of files) {
      // max 5 photos total
      const currentCount = Array.isArray(service?.photos) ? service.photos.length : 0
      if (currentCount + newUrls.length >= 5) break

      const ext  = file.name.split('.').pop()
      const path = `${service.handyman_id}/${serviceId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: upErr } = await supabase.storage
        .from('service-photos')
        .upload(path, file, { upsert: false })

      if (!upErr) {
        const { data: urlData } = supabase.storage.from('service-photos').getPublicUrl(path)
        if (urlData?.publicUrl) newUrls.push(urlData.publicUrl)
      }
    }

    if (newUrls.length) {
      const updated = [...(service?.photos ?? []), ...newUrls]
      await supabase.from('handyman_services')
        .update({ photos: updated }).eq('id', serviceId)
      setService(prev => ({ ...prev, photos: updated }))
    }

    setUploadingPhoto(false)
    // reset input so same file can be re-selected
    e.target.value = ''
  }

  // ── remove photo ─────────────────────────────────────────────────────────────
  const handleRemovePhoto = async (url) => {
    const updated = (service?.photos ?? []).filter(p => p !== url)
    await supabase.from('handyman_services')
      .update({ photos: updated }).eq('id', serviceId)
    setService(prev => ({ ...prev, photos: updated }))

    // try to delete from storage (best-effort)
    try {
      const path = new URL(url).pathname.split('/service-photos/')[1]
      if (path) await supabase.storage.from('service-photos').remove([path])
    } catch (_) {}
  }

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:px-4"
      onClick={onClose}>
      <div className="bg-white w-full sm:max-w-[620px] sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[92dvh]"
        onClick={e => e.stopPropagation()}>

        {/* ── HEADER ── */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-gray-800 line-clamp-1">
                {loading ? 'Se încarcă…' : (service?.title ?? '—')}
              </h3>
              {!loading && service?.is_popular && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-600 text-xs font-semibold rounded-full border border-orange-200">
                  <Flame className="w-2.5 h-2.5" /> Popular
                </span>
              )}
            </div>
            {!loading && category && (
              <div className="flex items-center gap-1.5 mt-1">
                <CatIcon iconName={category.icon} className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs text-blue-600 font-medium">{category.name}</span>
              </div>
            )}
          </div>

          {/* availability quick toggle */}
          {!loading && service && (
            <button onClick={handleToggleAvailable} disabled={toggling}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition mr-2 flex-shrink-0 ${
                service.is_available
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}>
              {service.is_available
                ? <><ToggleRight className="w-4 h-4" /> Activ</>
                : <><ToggleLeft className="w-4 h-4" /> Inactiv</>
              }
            </button>
          )}

          <button onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center flex-shrink-0">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* ── TABS ── */}
        {!loading && service && (
          <div className="flex border-b border-gray-100 flex-shrink-0">
            {[
              { id: 'details', label: 'Detalii' },
              { id: 'reviews', label: `Recenzii${ratingStats.count > 0 ? ` (${ratingStats.count})` : ''}` },
              { id: 'edit',    label: 'Editează' },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 py-3 text-sm font-medium transition border-b-2 ${
                  tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                {t.label}
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
          {!loading && service && tab === 'details' && (
            <>
              <PhotoGallery photos={photos} />

              {/* description */}
              {service.description && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1.5">Descriere</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{service.description}</p>
                </div>
              )}

              {/* pricing cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <p className="text-xs text-blue-500 font-medium uppercase tracking-wide mb-1">Preț bază</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {service.base_price ? `${Number(service.base_price).toLocaleString('ro-RO')} RON` : '—'}
                  </p>
                </div>
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                  <p className="text-xs text-purple-500 font-medium uppercase tracking-wide mb-1">Pe oră</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {service.price_per_hour ? `${Number(service.price_per_hour).toLocaleString('ro-RO')} RON` : '—'}
                  </p>
                </div>
              </div>

              {/* stats row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white border border-gray-100 rounded-xl p-3 text-center">
                  <Briefcase className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-gray-800">{service.times_booked ?? 0}</p>
                  <p className="text-xs text-gray-400">Rezervări</p>
                </div>
                <div className="bg-white border border-gray-100 rounded-xl p-3 text-center">
                  <Clock className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                  <p className="text-sm font-bold text-gray-800 leading-tight">{service.estimated_duration ?? '—'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Durată</p>
                </div>
                <div className="bg-white border border-gray-100 rounded-xl p-3 text-center">
                  <Calendar className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                  <p className="text-xs font-bold text-gray-800 leading-tight">
                    {lastBookingLabel ?? 'Niciuna'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Ultima rezervare</p>
                </div>
              </div>

              {/* rating summary */}
              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Rating serviciu</p>
                <StarRating rating={ratingStats.avg} count={ratingStats.count} />
                {ratingStats.count === 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    Rating-ul va apărea după primele rezervări finalizate.
                  </p>
                )}
              </div>

              {/* keywords */}
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

              {/* delete */}
              <button onClick={handleDelete} disabled={deleting}
                className="w-full flex items-center justify-center gap-2 py-2.5 border border-red-200 text-red-500 rounded-xl text-sm font-medium hover:bg-red-50 transition disabled:opacity-50">
                <Trash2 className="w-4 h-4" />
                {deleting ? 'Se șterge…' : 'Șterge serviciul'}
              </button>
            </>
          )}

          {/* ════ REVIEWS TAB ════ */}
          {!loading && service && tab === 'reviews' && (
            <>
              {/* summary */}
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-100 rounded-xl p-4 flex items-center gap-4">
                <div className="text-center flex-shrink-0">
                  <p className="text-4xl font-black text-gray-800">
                    {ratingStats.count > 0 ? Number(ratingStats.avg).toFixed(1) : '—'}
                  </p>
                  <div className="flex justify-center mt-1">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} className={`w-3.5 h-3.5 ${
                        ratingStats.count > 0 && i <= Math.round(ratingStats.avg)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-200'
                      }`} />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">
                    {ratingStats.count > 0
                      ? `Bazat pe ${ratingStats.count} ${ratingStats.count === 1 ? 'recenzie' : 'recenzii'}`
                      : 'Nicio recenzie încă'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {ratingStats.count === 0
                      ? 'Finalizează rezervări pentru a primi recenzii.'
                      : 'Rating calculat din rezervările finalizate.'}
                  </p>
                </div>
              </div>

              {reviews.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="w-14 h-14 bg-yellow-50 rounded-full flex items-center justify-center">
                    <Star className="w-6 h-6 text-yellow-300" />
                  </div>
                  <p className="text-sm font-semibold text-gray-600">Nicio recenzie primită</p>
                  <p className="text-xs text-gray-400 text-center max-w-xs">
                    Clienții pot lăsa recenzii după finalizarea rezervărilor.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.map(rev => <ReviewCard key={rev.id} review={rev} />)}
                </div>
              )}
            </>
          )}

          {/* ════ EDIT TAB ════ */}
          {!loading && service && tab === 'edit' && (
            <div className="space-y-4">
              {saveMsg && (
                <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium ${
                  saveMsg.includes('Eroare') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                }`}>
                  {saveMsg.includes('Eroare')
                    ? <XCircle className="w-4 h-4 flex-shrink-0" />
                    : <CheckCircle className="w-4 h-4 flex-shrink-0" />}
                  {saveMsg}
                </div>
              )}

              {/* ── PHOTO MANAGEMENT ── */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Poze serviciu
                  <span className="ml-1.5 text-xs font-normal text-gray-400">
                    ({(service?.photos?.length ?? 0)}/5 poze)
                  </span>
                </label>

                {/* existing photos grid */}
                {photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {photos.map((url, i) => (
                      <div key={i} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => handleRemovePhoto(url)}
                          className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        {i === 0 && (
                          <span className="absolute bottom-1.5 left-1.5 text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded-full font-medium">
                            Principală
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* upload area */}
                {(service?.photos?.length ?? 0) < 5 && (
                  <label className={`flex flex-col items-center justify-center gap-2 w-full py-5 border-2 border-dashed rounded-xl cursor-pointer transition
                    ${uploadingPhoto
                      ? 'border-blue-300 bg-blue-50 cursor-not-allowed'
                      : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                    }`}>
                    {uploadingPhoto ? (
                      <>
                        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                        <span className="text-sm text-blue-500 font-medium">Se încarcă…</span>
                      </>
                    ) : (
                      <>
                        <ImagePlus className="w-6 h-6 text-gray-400" />
                        <div className="text-center">
                          <p className="text-sm text-gray-600 font-medium">Adaugă poze</p>
                          <p className="text-xs text-gray-400 mt-0.5">PNG, JPG, WEBP · max 5 poze · 5MB/poză</p>
                        </div>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      multiple
                      disabled={uploadingPhoto}
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                )}
                {(service?.photos?.length ?? 0) >= 5 && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Ai atins limita de 5 poze. Șterge o poză pentru a adăuga alta.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Titlu serviciu *</label>
                <input type="text" value={editForm.title}
                  onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="Ex: Instalare Iluminat"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Descriere</label>
                <textarea value={editForm.description}
                  onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                  rows={3} placeholder="Descrie serviciul oferit..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm" />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Categorie</label>
                <select value={editForm.category_id}
                  onChange={e => setEditForm(p => ({ ...p, category_id: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                  <option value="">Selectează categoria</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Preț bază (RON)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="number" value={editForm.base_price}
                      onChange={e => setEditForm(p => ({ ...p, base_price: e.target.value }))}
                      placeholder="250"
                      className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Pe oră (RON)</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="number" value={editForm.price_per_hour}
                      onChange={e => setEditForm(p => ({ ...p, price_per_hour: e.target.value }))}
                      placeholder="150"
                      className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Durată estimată</label>
                <select value={editForm.estimated_duration}
                  onChange={e => setEditForm(p => ({ ...p, estimated_duration: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                  <option value="">Selectează durata</option>
                  {DURATION_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Cuvinte cheie</label>
                <input type="text" value={editForm.keywords}
                  onChange={e => setEditForm(p => ({ ...p, keywords: e.target.value }))}
                  placeholder="Ex: prize, cablaj, urgență"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                <p className="text-xs text-gray-400 mt-1">Separate prin virgulă</p>
              </div>

              {/* availability toggle in edit */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                  <p className="text-sm font-bold text-gray-700">Disponibil pentru rezervări</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {editForm.is_available ? 'Serviciul apare în feed pentru clienți' : 'Serviciul este ascuns din feed'}
                  </p>
                </div>
                <button onClick={() => setEditForm(p => ({ ...p, is_available: !p.is_available }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${editForm.is_available ? 'bg-blue-600' : 'bg-gray-300'}`}>
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${editForm.is_available ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>

              <div className="flex gap-3 pt-1">
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
  )
}