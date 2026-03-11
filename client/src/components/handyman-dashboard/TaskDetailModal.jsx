import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import {
  X, Camera, MapPin, Calendar, Clock, DollarSign,
  Tag, Shield, AlertTriangle, Zap, Star, User,
  Briefcase, Loader2, Send, MessageSquare, Info,
  Droplets, Square, Wrench, Paintbrush, Hammer,
  Sparkles, Flower2, Sofa, CircuitBoard, Lightbulb,
  Building2, MoreHorizontal, ChevronLeft, ChevronRight,
  CheckCircle, Plug, Layers, Wind
} from 'lucide-react'

// ─── category icon map (matches your DB icon column) ──────────────────────────
// Valorile din coloana `icon` din tabela categories
const ICON_MAP = {
  bolt:             Plug,         // Electricitate
  Droplets:         Droplets,     // Instalații sanitare
  'paint-roller':   Paintbrush,   // Zugrăvit
  square:           Square,       // Parchet
  wallpaper:        Layers,       // Tapet
  pipe:             Wind,         // Canalizare
  Wrench:           Wrench,       // Reparații generale
  Zap:              Zap,          // Instalații Electrice
  Paintbrush:       Paintbrush,   // Zugrăveli & Vopsitorie
  Hammer:           Hammer,       // Tâmplărie
  Sparkles:         Sparkles,     // Curățenie
  Flower2:          Flower2,      // Grădinărit
  Sofa:             Sofa,         // Montaj Mobilă
  CircuitBoard:     CircuitBoard, // Tablouri Electrice
  Lightbulb:        Lightbulb,    // Iluminat
  Building2:        Building2,    // Construcții
  MoreHorizontal:   MoreHorizontal, // Altele
}

function CategoryIcon({ iconName, className = 'w-4 h-4' }) {
  const Icon = ICON_MAP[iconName] ?? Wrench
  return <Icon className={className} />
}

// ─── urgency badge ─────────────────────────────────────────────────────────────
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

// ─── info row ─────────────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value, children }) {
  if (!value && !children) return null
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-blue-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
        {value && <p className="text-sm text-gray-700 font-semibold mt-0.5">{value}</p>}
        {children}
      </div>
    </div>
  )
}

// ─── avatar initials ──────────────────────────────────────────────────────────
function Avatar({ name, avatarUrl, size = 'md' }) {
  const sizeMap = { sm: 'w-8 h-8 text-xs', md: 'w-12 h-12 text-sm', lg: 'w-14 h-14 text-base' }
  const cls = sizeMap[size] ?? sizeMap.md
  const initials = name
    ? name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('')
    : '?'

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${cls} rounded-full object-cover flex-shrink-0`}
        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '' }}
      />
    )
  }
  return (
    <div className={`${cls} rounded-full bg-blue-600 text-white font-bold flex items-center justify-center flex-shrink-0`}>
      {initials}
    </div>
  )
}

// ─── photo gallery ─────────────────────────────────────────────────────────────
function PhotoGallery({ photos }) {
  const [active, setActive] = useState(0)
  if (!photos?.length) return null

  return (
    <div className="space-y-2">
      {/* main photo */}
      <div className="relative rounded-xl overflow-hidden bg-gray-100 h-48">
        <img
          src={photos[active]}
          alt={`Poza ${active + 1}`}
          className="w-full h-full object-cover"
          onError={(e) => { e.currentTarget.src = '' }}
        />
        {photos.length > 1 && (
          <>
            <button
              onClick={() => setActive(i => Math.max(0, i - 1))}
              disabled={active === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center disabled:opacity-30 hover:bg-black/60 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActive(i => Math.min(photos.length - 1, i + 1))}
              disabled={active === photos.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center disabled:opacity-30 hover:bg-black/60 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
              {active + 1} / {photos.length}
            </div>
          </>
        )}
      </div>
      {/* thumbnails */}
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((url, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition ${
                i === active ? 'border-blue-500' : 'border-transparent'
              }`}
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────

/**
 * TaskDetailModal
 *
 * Props:
 *   taskId      – string | null   uuid-ul task-ului; null = modal închis
 *   onClose     – () => void
 *   onNegotiate – (task) => void  callback când handymanul apasă "Negociază"
 *   onMessage   – (task) => void  callback când apasă "Mesaj" (opțional)
 */
export default function TaskDetailModal({ taskId, onClose, onNegotiate, onMessage }) {
  const [task,    setTask]    = useState(null)
  const [client,  setClient]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!taskId) { setTask(null); setClient(null); return }

    let cancelled = false
    setLoading(true)
    setError(null)
    setTask(null)
    setClient(null)

    async function load() {
      // task + category join
      const { data: taskData, error: taskErr } = await supabase
        .from('tasks')
        .select('*, categories(id, name, icon, description)')
        .eq('id', taskId)
        .maybeSingle()

      if (taskErr || !taskData) {
        if (!cancelled) { setError('Nu am putut încărca task-ul.'); setLoading(false) }
        return
      }

      // client profile
      const { data: clientData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, city, county, client_rating, client_total_reviews, created_at')
        .eq('id', taskData.client_id)
        .maybeSingle()

      if (!cancelled) {
        setTask(taskData)
        setClient(clientData ?? null)
        setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [taskId])

  if (!taskId) return null

  // ── derived values ────────────────────────────────────────────────────────
  const photos      = Array.isArray(task?.photos)   ? task.photos   : []
  const keywords    = Array.isArray(task?.keywords) ? task.keywords : []
  const category    = task?.categories ?? null

  // client name: din profil dacă există, altfel din câmpurile task-ului
  const clientName  = client
    ? `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim() || task?.contact_name || 'Client anonim'
    : task?.contact_name || 'Client anonim'

  const postedAt = task?.created_at
    ? new Date(task.created_at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })
    : null

  const scheduledLabel = task?.scheduled_date
    ? new Date(task.scheduled_date).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })
      + (task.scheduled_time ? ` · ${task.scheduled_time}` : '')
    : null

  const memberSince = client?.created_at
    ? new Date(client.created_at).toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })
    : null

  const clientLocation = [client?.city, client?.county].filter(Boolean).join(', ') || null

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:px-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[92dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ── */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex-1 min-w-0 pr-3">
            <h3 className="text-base font-bold text-gray-800 leading-snug line-clamp-2">
              {loading ? 'Se încarcă…' : (task?.title ?? '—')}
            </h3>
            {!loading && category && (
              <div className="flex items-center gap-1.5 mt-1">
                <CategoryIcon iconName={category.icon} className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs text-blue-600 font-medium">{category.name}</span>
              </div>
            )}
          </div>
          {!loading && task?.urgency && <UrgencyBadge urgency={task.urgency} />}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center flex-shrink-0 ml-2"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* ── BODY ── */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-sm text-gray-400">Se încarcă detaliile…</p>
            </div>
          )}

          {/* error */}
          {!loading && error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <Info className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}

          {!loading && task && (
            <>
              {/* ── PHOTOS ── */}
              {photos.length > 0
                ? <PhotoGallery photos={photos} />
                : (
                  <div className="h-28 rounded-xl bg-gray-50 border border-dashed border-gray-200 flex flex-col items-center justify-center gap-1.5">
                    <Camera className="w-6 h-6 text-gray-300" />
                    <p className="text-xs text-gray-400">Fără poze atașate</p>
                  </div>
                )
              }

              {/* ── DESCRIPTION ── */}
              {task.description && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1.5">Descriere</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{task.description}</p>
                </div>
              )}

              {/* ── INFO ROWS ── */}
              <div className="bg-white border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-100">
                <InfoRow icon={Briefcase} label="Categorie" value={category?.name}>
                  {category?.description && (
                    <p className="text-xs text-gray-400 mt-0.5">{category.description}</p>
                  )}
                </InfoRow>

                <InfoRow icon={MapPin}      label="Județ"       value={task.address_county} />
                <InfoRow icon={Calendar}    label="Data dorită" value={scheduledLabel} />
                <InfoRow icon={DollarSign}  label="Buget client" value={
                  task.budget ? `${Number(task.budget).toLocaleString('ro-RO')} RON` : null
                } />
                <InfoRow icon={Star}        label="Postat pe"   value={postedAt} />
              </div>

              {/* ── CLIENT CARD ── */}
              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3">Client</p>
                <div className="flex items-center gap-3">
                  <Avatar name={clientName} avatarUrl={client?.avatar_url} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 text-sm">{clientName}</p>
                    {clientLocation && (
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />{clientLocation}
                      </p>
                    )}
                    {memberSince && (
                      <p className="text-xs text-gray-400 mt-0.5">Membru din {memberSince}</p>
                    )}
                    {client?.client_rating > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                        <span className="text-xs font-semibold text-gray-700">{Number(client.client_rating).toFixed(1)}</span>
                        {client.client_total_reviews > 0 && (
                          <span className="text-xs text-gray-400">· {client.client_total_reviews} recenzii</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* fallback: info din task dacă profilul nu e accesibil */}
                {!client && (task?.contact_name || task?.contact_phone || task?.contact_email) && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5 text-xs text-gray-500">
                    {task.contact_phone && (
                      <p>📞 {task.contact_phone}</p>
                    )}
                    {task.contact_email && (
                      <p>✉️ {task.contact_email}</p>
                    )}
                  </div>
                )}
              </div>

              {/* ── KEYWORDS ── */}
              {keywords.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Cuvinte cheie</p>
                  <div className="flex flex-wrap gap-1.5">
                    {keywords.map((kw, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-full border border-blue-100"
                      >
                        <Tag className="w-2.5 h-2.5" />{kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ── INSURANCE REQUIRED ── */}
              {task.insurance_required && (
                <div className="flex items-center gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
                  <Shield className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Asigurare obligatorie</p>
                    <p className="text-xs text-amber-600 mt-0.5">Clientul solicită dovada asigurării pentru această lucrare.</p>
                  </div>
                </div>
              )}

              {/* ── STATUS PILL ── */}
              {task.status && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Status task:</span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    task.status === 'open'      ? 'bg-green-100 text-green-700' :
                    task.status === 'assigned'  ? 'bg-blue-100 text-blue-700'  :
                    task.status === 'completed' ? 'bg-gray-100 text-gray-600'  :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {task.status === 'open'      ? 'Deschis'   :
                     task.status === 'assigned'  ? 'Atribuit'  :
                     task.status === 'completed' ? 'Finalizat' :
                     task.status}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── FOOTER ACTIONS ── */}
        {!loading && task && (
          <div className="flex items-center gap-3 p-5 border-t border-gray-100 flex-shrink-0">
            {onMessage && (
              <button
                onClick={() => { onMessage(task); onClose() }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                <MessageSquare className="w-4 h-4" /> Mesaj
              </button>
            )}
            <button
              onClick={() => { onNegotiate(task); onClose() }}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition"
            >
              <Send className="w-4 h-4" /> Negociază oferta
            </button>
          </div>
        )}
      </div>
    </div>
  )
}