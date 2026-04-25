import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import {
  LayoutDashboard, BadgeCheck, TicketCheck, Users, LogOut,
  CheckCircle, XCircle, Clock, AlertTriangle, AlertCircle, Shield,
  TrendingUp, TrendingDown, Wrench, ChevronDown, ChevronUp,
  Search, RefreshCw, Menu, X, Star, FileText, ShieldCheck, ExternalLink,
  Award, Send, Bell, MessageSquare, DollarSign, RotateCcw, Package
} from 'lucide-react'
import MessagingUI from '../components/messages/MessagingUI'

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Avatar({ name, size = 'md' }) {
  const initials = (name || '?')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const sz = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
  return (
    <div className={`${sz} rounded-full bg-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {initials}
    </div>
  )
}

const DISPUTE_STATUS_LABEL = {
  open:     'Deschis',
  assigned: 'Alocat',
  resolved: 'Rezolvat',
  closed:   'Închis',
}

const HANDYMAN_STATUS_LABEL = {
  pending:  'În așteptare',
  approved: 'Aprobat',
  rejected: 'Respins',
}

// ─── Notify handyman helper ───────────────────────────────────────────────────
async function notifyHandyman(userId, type, title, body, extra = {}) {
  if (!userId) return
  await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    body,
    data: { redirect: '/handyman/personal-profile', ...extra },
  })
}

// ─── Admin notification panel ─────────────────────────────────────────────────

const ADMIN_NOTIF_CFG = {
  admin_verif_pending: { icon: FileText,      color: 'text-orange-500', bg: 'bg-orange-100' },
  admin_skill_pending: { icon: Award,         color: 'text-purple-500', bg: 'bg-purple-100' },
  admin_dispute_new:   { icon: AlertTriangle, color: 'text-red-500',    bg: 'bg-red-100' },
  new_message:         { icon: MessageSquare, color: 'text-blue-500',   bg: 'bg-blue-100' },
}
const ADMIN_NOTIF_SECTION = {
  admin_verif_pending: 'verifications',
  admin_skill_pending: 'skills',
  admin_dispute_new:   'disputes',
  new_message:         'messages',
}

function AdminNotifPanel({ notifs, onClose, onNavigate, onMarkRead, onClearAll }) {
  const unread = notifs.filter(n => !n.is_read).length

  function handleClick(n) {
    onMarkRead(n.id)
    const section = n.data?.section || ADMIN_NOTIF_SECTION[n.type]
    const filter  = n.data?.filter
    if (section) onNavigate(section, filter)
    onClose()
  }

  function formatTime(d) {
    const diff = Math.floor((Date.now() - new Date(d)) / 1000)
    if (diff < 60) return 'Acum'
    if (diff < 3600) return `${Math.floor(diff / 60)} min`
    if (diff < 86400) return `${Math.floor(diff / 3600)} h`
    return `${Math.floor(diff / 86400)} z`
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white shadow-2xl flex flex-col"
        style={{ animation: 'slideInRight 0.18s ease-out' }}>

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-800">Notificări Admin</h2>
            {unread > 0 && <p className="text-xs text-gray-500">{unread} necitite</p>}
          </div>
          <div className="flex items-center gap-2">
            {unread > 0 && (
              <button onClick={() => onMarkRead(null)} className="text-xs text-blue-600 hover:underline">
                Toate citite
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {notifs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Bell className="w-10 h-10 text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm font-medium">Nicio notificare</p>
              <p className="text-xs text-gray-400 mt-1">Vei fi anunțat când apar cereri noi</p>
            </div>
          ) : notifs.map(n => {
            const cfg = ADMIN_NOTIF_CFG[n.type] || { icon: Bell, color: 'text-blue-500', bg: 'bg-blue-100' }
            const Icon = cfg.icon
            return (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className={`flex items-start gap-3 px-5 py-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition
                  ${!n.is_read ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : ''}`}
              >
                <div className={`w-9 h-9 ${cfg.bg} rounded-full flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!n.is_read ? 'font-bold text-gray-800' : 'font-medium text-gray-700'}`}>
                    {n.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">{formatTime(n.created_at)}</span>
              </div>
            )
          })}
        </div>

        {notifs.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-3">
            <button onClick={onClearAll} className="w-full text-sm text-center text-gray-500 hover:text-red-500 transition">
              Șterge toate
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes slideInRight { from { transform:translateX(100%); opacity:0 } to { transform:translateX(0); opacity:1 } }`}</style>
    </div>
  )
}

// ─── Sidebar nav items ─────────────────────────────────────────────────────────

const NAV = [
  { id: 'overview',       label: 'Prezentare generală',  icon: LayoutDashboard },
  { id: 'certifications', label: 'Verificări Meșteri',   icon: BadgeCheck },
  { id: 'messages',       label: 'Mesaje Dispute',        icon: MessageSquare },
  { id: 'verifications',  label: 'Verificări Documente', icon: ShieldCheck },
  { id: 'skills',         label: 'Certificări Skilluri', icon: Award },
  { id: 'disputes',       label: 'Dispute & Conflicte',  icon: TicketCheck },
  { id: 'financials',     label: 'Costuri Dispute',       icon: DollarSign },
  { id: 'support',        label: 'Tichete Suport',        icon: MessageSquare },
  { id: 'users',          label: 'Utilizatori',           icon: Users },
]

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800">{value ?? '—'}</p>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Section: Overview ────────────────────────────────────────────────────────

function OverviewSection({ stats }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-1">Prezentare Generală</h2>
        <p className="text-sm text-gray-500">Statistici platformă HandyConnect</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard label="Clienți înregistrați"    value={stats.clients}       icon={Users}       color="bg-blue-50 text-blue-600"    sub="Total conturi active" />
        <StatCard label="Meșteri înregistrați"    value={stats.handymen}      icon={Wrench}      color="bg-purple-50 text-purple-600" sub="Total conturi active" />
        <StatCard label="Dispute deschise"        value={stats.openDisputes}  icon={TicketCheck} color="bg-red-50 text-red-500"      sub="Necesită intervenție" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Profiluri în așteptare"  value={stats.pending}       icon={Clock}       color="bg-yellow-50 text-yellow-600" sub="Aprobare profil meșter" />
        <StatCard label="Documente în așteptare"  value={stats.pendingVerifs} icon={ShieldCheck} color="bg-orange-50 text-orange-500" sub="Identitate / juridic" />
        <StatCard label="Skilluri în așteptare"   value={stats.pendingSkills} icon={Award}       color="bg-purple-50 text-purple-600" sub="Certificări de verificat" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-600" /> Meșteri recenți neaprobați
        </h3>
        {stats.recentPending?.length > 0 ? (
          <div className="space-y-3">
            {stats.recentPending.map((item, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" />
                <p className="text-sm text-gray-600 flex-1">
                  <strong>{item.profiles?.first_name} {item.profiles?.last_name}</strong> — profil meșter în așteptare
                </p>
                <span className="text-xs text-gray-400">{fmtDate(item.created_at)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">Nu există meșteri în așteptare de aprobare.</p>
        )}
      </div>
    </div>
  )
}

// ─── Section: Certifications (handyman profile approval) ──────────────────────

function CertificationsSection() {
  const [handymen, setHandymen] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('handyman_profiles')
      .select(`
        user_id, bio, status, is_verified, specialties,
        experience_years, hourly_rate, primary_city,
        profiles!inner(first_name, last_name, email)
      `)
      .order('user_id')

    if (!error) setHandymen(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const matchesFilter = (h) => {
    if (filter === 'all') return true
    if (filter === 'approved') return h.is_verified === true || h.status === 'approved'
    if (filter === 'rejected') return h.status === 'rejected'
    // 'pending': is_verified false/null și status nu e 'approved' sau 'rejected'
    return !h.is_verified && h.status !== 'approved' && h.status !== 'rejected'
  }

  const filtered = handymen.filter(h => {
    const name = `${h.profiles?.first_name ?? ''} ${h.profiles?.last_name ?? ''}`.toLowerCase()
    const matchSearch = name.includes(search.toLowerCase()) || h.profiles?.email?.toLowerCase().includes(search.toLowerCase())
    return matchesFilter(h) && matchSearch
  })

  async function handleDecision(userId, approve) {
    const key = userId + (approve ? 'approve' : 'reject')
    setActionLoading(key)
    const { error } = await supabase
      .from('handyman_profiles')
      .update({
        status: approve ? 'approved' : 'rejected',
        is_verified: approve,
      })
      .eq('user_id', userId)
    if (!error) {
      showToast(approve ? 'Profil aprobat!' : 'Profil respins.', approve ? 'success' : 'error')
      await notifyHandyman(
        userId,
        approve ? 'profile_approved' : 'profile_rejected',
        approve ? 'Profil verificat!' : 'Profil respins',
        approve
          ? 'Profilul tău de meșter a fost aprobat. Ești acum vizibil pe platformă cu badge-ul Verificat.'
          : 'Profilul tău de meșter a fost respins. Completează informațiile lipsă și încearcă din nou.'
      )
      load()
    }
    setActionLoading(null)
  }

  const statusBadge = (status, isVerified) => {
    if (status === 'approved' || isVerified) {
      return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Aprobat</span>
    }
    if (status === 'rejected') {
      return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Respins</span>
    }
    return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">În așteptare</span>
  }

  return (
    <div className="space-y-5">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition
          ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Verificări Meșteri</h2>
          <p className="text-sm text-gray-500">Aprobă sau respinge profilurile meșterilor înregistrați</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition">
          <RefreshCw className="w-4 h-4" /> Actualizează
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        <strong>Cum funcționează:</strong> Meșterii se înregistrează și completează profilul (specialități, experiență, zonă).
        Adminul aprobă profilul → meșterul devine vizibil pe platformă cu badge-ul <strong>Verificat</strong>.
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Caută după nume sau email..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
          {['pending', 'approved', 'rejected', 'all'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2.5 font-medium transition ${filter === f ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            >
              {f === 'all' ? 'Toți' : HANDYMAN_STATUS_LABEL[f]}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <BadgeCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Niciun meșter găsit</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map(h => {
              const fullName = `${h.profiles?.first_name ?? ''} ${h.profiles?.last_name ?? ''}`.trim() || 'Necunoscut'
              const isOpen = expanded === h.user_id
              const isPending = !h.is_verified && h.status !== 'rejected'

              return (
                <div key={h.user_id} className="p-4">
                  <div
                    className="flex items-center gap-4 cursor-pointer"
                    onClick={() => setExpanded(isOpen ? null : h.user_id)}
                  >
                    <Avatar name={fullName} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm">{fullName}</p>
                      <p className="text-xs text-gray-500 truncate">{h.profiles?.email}</p>
                    </div>
                    <div className="hidden sm:flex flex-col items-end gap-1 text-xs text-gray-400">
                      <span>{h.primary_city ?? '—'}</span>
                      <span>{h.experience_years ? `${h.experience_years} ani exp.` : '—'}</span>
                    </div>
                    {statusBadge(h.status, h.is_verified)}
                    {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>

                  {isOpen && (
                    <div className="mt-4 pl-14 space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-gray-400 text-xs mb-0.5">Email</p>
                          <p className="font-medium text-gray-700 truncate">{h.profiles?.email ?? '—'}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs mb-0.5">Tarif orar</p>
                          <p className="font-medium text-gray-700">{h.hourly_rate ? `${h.hourly_rate} RON/h` : '—'}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs mb-0.5">Experiență</p>
                          <p className="font-medium text-gray-700">{h.experience_years ? `${h.experience_years} ani` : '—'}</p>
                        </div>
                      </div>

                      {h.specialties?.length > 0 && (
                        <div>
                          <p className="text-gray-400 text-xs mb-1.5">Specialități declarate</p>
                          <div className="flex flex-wrap gap-1.5">
                            {h.specialties.map((s, i) => (
                              <span key={i} className="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">{s}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {h.bio && (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-400 mb-1">Bio</p>
                          <p className="text-sm text-gray-700">{h.bio}</p>
                        </div>
                      )}

                      {isPending && (
                        <div className="flex gap-3 pt-1">
                          <button
                            onClick={() => handleDecision(h.user_id, true)}
                            disabled={!!actionLoading}
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                          >
                            {actionLoading === h.user_id + 'approve'
                              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              : <CheckCircle className="w-4 h-4" />}
                            Aprobă profil
                          </button>
                          <button
                            onClick={() => handleDecision(h.user_id, false)}
                            disabled={!!actionLoading}
                            className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                          >
                            {actionLoading === h.user_id + 'reject'
                              ? <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                              : <XCircle className="w-4 h-4" />}
                            Respinge
                          </button>
                        </div>
                      )}

                      {h.is_verified && (
                        <div className="flex gap-3 pt-1">
                          <button
                            onClick={() => handleDecision(h.user_id, false)}
                            disabled={!!actionLoading}
                            className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                          >
                            <XCircle className="w-4 h-4" /> Revocă aprobare
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Section: Disputes (task_disputes) ────────────────────────────────────────

// Filter tabs → which DB statuses they cover
const DISPUTE_FILTER_GROUPS = {
  open:           ['open'],
  admin_review:   ['admin_review', 'admin_review_required', 'under_admin_review', 'admin_proposed_rework', 'handyman_declined_rework', 'dispute_contested', 'evidence_requested_handyman', 'evidence_requested_client'],
  admin_escalated:['admin_escalated'],
  rework_accepted:['rework_accepted', 'awaiting_client_rework_choice', 'rework_in_progress', 'rework_completed'],
  resolved:       ['resolved', 'closed', 'forced_accepted', 'refund_partial', 'refund_full', 'rework_marketplace'],
}
const ADMIN_DISPUTE_STATUSES = ['open', 'admin_review', 'admin_escalated', 'rework_accepted', 'resolved', 'all']
const ADMIN_DISPUTE_STATUS_LABELS = {
  open:                     'Deschis',
  admin_review:             'La admin',
  admin_review_required:    'La admin',
  under_admin_review:       'La admin',
  admin_escalated:          'Escaladat',
  admin_proposed_rework:    'Propunere relucrare',
  dispute_contested:              'Contestat',
  evidence_requested_handyman:    'Dovezi meșter',
  evidence_requested_client:      'Dovezi client',
  handyman_declined_rework:       'Meșter a refuzat',
  awaiting_client_rework_choice:  'Alege client',
  rework_accepted:                'Relucrare',
  rework_in_progress:       'Relucrare',
  rework_completed:         'Relucrare finalizată',
  resolved:                 'Rezolvat',
  closed:                   'Închis',
  forced_accepted:          'Acceptat forțat',
  refund_partial:           'Rambursare parțială',
  refund_full:              'Rambursare totală',
  all:                      'Toate',
}
const ADMIN_DISPUTE_STATUS_CLS = {
  open:                     'bg-red-100 text-red-700',
  admin_review:             'bg-purple-100 text-purple-700',
  admin_review_required:    'bg-purple-100 text-purple-700',
  under_admin_review:       'bg-purple-100 text-purple-700',
  admin_escalated:          'bg-purple-200 text-purple-800',
  admin_proposed_rework:    'bg-yellow-100 text-yellow-700',
  dispute_contested:              'bg-orange-100 text-orange-700',
  evidence_requested_handyman:    'bg-amber-100 text-amber-800',
  evidence_requested_client:      'bg-amber-50 text-amber-700',
  handyman_declined_rework:       'bg-red-200 text-red-800',
  awaiting_client_rework_choice:  'bg-amber-100 text-amber-700',
  rework_accepted:                'bg-orange-100 text-orange-700',
  rework_in_progress:       'bg-blue-100 text-blue-700',
  rework_completed:         'bg-green-100 text-green-700',
  resolved:                 'bg-green-100 text-green-700',
  closed:                   'bg-gray-100 text-gray-600',
  forced_accepted:          'bg-gray-100 text-gray-600',
  refund_partial:           'bg-teal-100 text-teal-700',
  refund_full:              'bg-teal-200 text-teal-800',
}

const ADMIN_NEEDS_DECISION = ['admin_review', 'admin_review_required', 'under_admin_review', 'admin_escalated', 'handyman_declined_rework', 'dispute_contested', 'evidence_requested_handyman', 'evidence_requested_client']

function DisputesSection({ initialFilter = 'open' }) {
  const [disputes,    setDisputes]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [filter,      setFilter]      = useState(initialFilter)
  const [search,      setSearch]      = useState('')
  const [expanded,    setExpanded]    = useState(null)
  const [adminNote,   setAdminNote]   = useState({})
  const [refundAmt,   setRefundAmt]   = useState({})
  const [actionKey,   setActionKey]   = useState(null)
  const [toast,       setToast]       = useState(null)
  const [completions, setCompletions] = useState({})
  const [showLegend,  setShowLegend]  = useState(false)

  const parseJson = (val) => {
    if (Array.isArray(val)) return val
    if (!val) return []
    try { return JSON.parse(val) } catch { return [] }
  }

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('task_disputes')
      .select(`
        id, task_id, status, details, photos, created_at, rework_deadline, priority,
        handyman_id, client_id,
        handyman_response, handyman_response_at, handyman_evidence,
        admin_decision, admin_decided_at, refund_amount, timeline,
        client_resolution_request, client_refund_estimate, platform_cost, handyman_payout,
        rejection_reasons!reason_id(name),
        task:task_id (
          id, title, description, final_price, budget, status,
          address_city, address_county, scheduled_date, completed_at,
          is_rework, rework_level,
          profiles!tasks_client_id_fkey(first_name, last_name, email)
        ),
        client:client_id (first_name, last_name, email, dispute_count, false_claims),
        handyman:handyman_id (
          first_name, last_name, email,
          handyman_profiles(reliability_score, disputes_lost, disputes_won, rework_count)
        )
      `)
      .order('created_at', { ascending: false })

    if (error) { console.error('[DisputesSection] load:', error); setLoading(false); return }
    const rows = data ?? []
    setDisputes(rows)

    const taskIds = [...new Set(rows.map(d => d.task_id).filter(Boolean))]
    if (taskIds.length > 0) {
      const { data: comps } = await supabase
        .from('job_completions')
        .select('id, job_id, task_id, handyman_id, completion_photos, completion_description, created_at, client_accepted, client_rating')
        .in('job_id', taskIds)
      const byTask = {}
      ;(comps ?? []).forEach(c => { byTask[c.job_id ?? c.task_id] = c })
      setCompletions(byTask)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = disputes.filter(d => {
    const matchStatus = filter === 'all' || (DISPUTE_FILTER_GROUPS[filter] ?? [filter]).includes(d.status)
    const title  = d.task?.title?.toLowerCase() ?? ''
    const client = `${d.client?.first_name ?? ''} ${d.client?.last_name ?? ''}`.toLowerCase()
    const matchSearch = title.includes(search.toLowerCase()) || client.includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  async function handleDecision(disputeId, decision) {
    const key = `${disputeId}_${decision}`
    setActionKey(key)
    try {
      const { data, error } = await supabase.rpc('admin_resolve_dispute', {
        p_dispute_id:    disputeId,
        p_decision:      decision,
        p_note:          adminNote[disputeId] ?? '',
        p_refund_amount: decision === 'partial_refund' ? Number(refundAmt[disputeId] ?? 0) : null,
      })
      if (error) throw error
      if (!data?.success) throw new Error(data?.error ?? 'Eroare RPC')
      const labels = {
        approve_handyman: 'Handyman aprobat — task finalizat.',
        propose_rework:   'Propunere de relucrare trimisă meșterului.',
        forced_rework:    'Relucrare forțată de admin.',
        reassign_rework:  'Meșter refuzat — client va fi compensat.',
        partial_refund:   'Rambursare parțială trimisă.',
        full_refund:      'Rambursare completă aprobată.',
      }
      showToast(labels[decision] ?? 'Decizie înregistrată.')
      setExpanded(null)
      load()
    } catch (err) {
      showToast(`Eroare: ${err.message}`, 'error')
    } finally {
      setActionKey(null)
    }
  }

  async function handleRequestEvidence(disputeId, from) {
    const key = `${disputeId}_req_evidence_${from}`
    setActionKey(key)
    try {
      const dispute = disputes.find(d => d.id === disputeId)
      if (!dispute) throw new Error('Disputa negăsită')
      const newStatus = from === 'handyman' ? 'evidence_requested_handyman' : 'evidence_requested_client'
      const tl = parseJson(dispute.timeline ?? '[]')
      const newEvent = {
        event: `admin_requested_evidence_from_${from}`,
        by: 'admin', at: new Date().toISOString(),
        extra: { note: adminNote[disputeId] || null },
      }
      const { error } = await supabase.from('task_disputes').update({
        status: newStatus,
        timeline: [...tl, newEvent],
      }).eq('id', disputeId)
      if (error) throw error
      const recipientId = from === 'handyman' ? dispute.handyman_id : dispute.client_id
      await supabase.from('notifications').insert({
        user_id: recipientId,
        type: 'dispute_update',
        title: 'Adminul solicită dovezi suplimentare',
        body: adminNote[disputeId]
          ? `Mesaj admin: ${adminNote[disputeId]}`
          : 'Te rugăm să încarci dovezi sau să refuzi cererea în 24 h.',
        data: {
          for_handyman: from === 'handyman',
          redirect: from === 'handyman' ? '/handyman/jobs?tab=disputes' : '/dashboard?tab=disputes',
        },
      })
      showToast(`Cerere de dovezi trimisă ${from === 'handyman' ? 'meșterului' : 'clientului'}.`)
      setExpanded(null)
      load()
    } catch (err) {
      showToast(`Eroare: ${err.message}`, 'error')
    } finally {
      setActionKey(null)
    }
  }

  const needsAdmin = filtered.filter(d => ADMIN_NEEDS_DECISION.includes(d.status))

  return (
    <div className="space-y-5">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Dispute & Conflicte</h2>
          <p className="text-sm text-gray-500">Gestionează conflictele dintre clienți și meșteri</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowLegend(v => !v)} className="flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800 transition">
            <Shield className="w-4 h-4" /> Legendă statusuri
          </button>
          <button onClick={load} className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition">
            <RefreshCw className="w-4 h-4" /> Actualizează
          </button>
        </div>
      </div>

      {showLegend && (
        <div className="bg-white border border-purple-200 rounded-xl p-4 space-y-2 text-sm">
          <p className="font-bold text-purple-700 mb-3">Explicația statusurilor dispute</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {[
              { status: 'open',                  desc: 'Disputa a fost deschisă de client, meșterul nu a răspuns încă.' },
              { status: 'admin_review_required', desc: 'Meșterul a contestat — a trimis contraargumente. Necesită decizia adminului.' },
              { status: 'admin_review',          desc: 'Disputa a fost escaladată la admin (manual sau după expirare răspuns).' },
              { status: 'admin_escalated',       desc: 'Admin a marcat explicit ca prioritar / necesită intervenție urgentă.' },
              { status: 'rework_accepted',             desc: 'Meșterul a acceptat să relucreze. Taskul va fi refăcut.' },
              { status: 'awaiting_client_rework_choice', desc: 'Meșterul a acceptat. Clientul alege: continuă cu același meșter, alt meșter sau anulare.' },
              { status: 'rework_in_progress',          desc: 'Relucrarea este în desfășurare.' },
              { status: 'rework_completed',      desc: 'Relucrarea a fost finalizată de meșter.' },
              { status: 'resolved',              desc: 'Disputa a fost rezolvată (clientul a acceptat sau admin a decis).' },
              { status: 'forced_accepted',       desc: 'Adminul a aprobat munca meșterului — taskul forțat acceptat.' },
              { status: 'refund_partial',        desc: 'Adminul a aprobat rambursare parțială către client.' },
              { status: 'refund_full',           desc: 'Adminul a aprobat rambursare completă — client câștigat disputa.' },
              { status: 'handyman_declined_rework', desc: 'Meșterul a refuzat relucrarea. Clientul și-a ales preferința. Adminul decide.' },
              { status: 'rework_marketplace',      desc: 'Relucrarea va fi efectuată de alt meșter. Platforma plătește 100%.' },
              { status: 'closed',                  desc: 'Disputa a fost închisă fără acțiune ulterioară.' },
            ].map(({ status, desc }) => (
              <div key={status} className="flex gap-2 items-start">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 mt-0.5 ${ADMIN_DISPUTE_STATUS_CLS[status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {ADMIN_DISPUTE_STATUS_LABELS[status] ?? status}
                </span>
                <p className="text-xs text-gray-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {needsAdmin.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-purple-600 flex-shrink-0" />
          <p className="text-sm text-purple-700 font-semibold">{needsAdmin.length} {needsAdmin.length === 1 ? 'dispută necesită' : 'dispute necesită'} decizia adminului</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Caută după titlu task sau client..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm flex-wrap">
          {ADMIN_DISPUTE_STATUSES.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2.5 font-medium transition ${filter === f ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            >
              {ADMIN_DISPUTE_STATUS_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Nicio dispută găsită</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map(d => {
              const title       = d.task?.title ?? 'Task necunoscut'
              const clientName  = `${d.client?.first_name ?? ''} ${d.client?.last_name ?? ''}`.trim() || 'Client'
              const handyName   = `${d.handyman?.first_name ?? ''} ${d.handyman?.last_name ?? ''}`.trim() || 'Meșter'
              const hProfile    = d.handyman?.handyman_profiles?.[0]
              const isExpanded  = expanded === d.id
              const needsDecision = ADMIN_NEEDS_DECISION.includes(d.status)
              const statusCls   = ADMIN_DISPUTE_STATUS_CLS[d.status] ?? 'bg-gray-100 text-gray-600'
              const statusLabel = ADMIN_DISPUTE_STATUS_LABELS[d.status] ?? d.status
              const cityCode    = (d.task?.address_city ?? '').slice(0, 3).toUpperCase() || 'N/A'
              const disputeId   = `#${d.id.replace(/-/g, '').slice(0, 4).toUpperCase()}-${cityCode}`
              const completion  = completions[d.task_id]

              return (
                <div key={d.id} className={`p-4 ${needsDecision ? 'bg-purple-50/30' : ''}`}>
                  <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => setExpanded(isExpanded ? null : d.id)}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${needsDecision ? 'bg-purple-100' : 'bg-red-50'}`}>
                      <AlertTriangle className={`w-5 h-5 ${needsDecision ? 'text-purple-500' : 'text-red-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-purple-600 font-bold flex-shrink-0">{disputeId}</span>
                        <p className="font-semibold text-gray-800 text-sm truncate">{title}</p>
                      </div>
                      <p className="text-xs text-gray-500">{clientName} vs {handyName}{d.task?.address_city ? ` · ${d.task.address_city}` : ''}</p>
                    </div>
                    {d.task?.is_rework === true && (d.task?.rework_level ?? 1) >= 2 && (
                      <span className="hidden sm:inline text-xs font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full border border-orange-200 flex-shrink-0">
                        Niv.2
                      </span>
                    )}
                    {d.priority === 'high' && (
                      <span className="hidden sm:inline text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                        Prioritar
                      </span>
                    )}
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${statusCls}`}>
                      {statusLabel}
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                  </div>

                  {isExpanded && (
                    <div className="mt-4 ml-13 space-y-4">

                      {/* Reason + Details */}
                      <div className="grid sm:grid-cols-2 gap-3 text-sm">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-400 mb-0.5">Motiv dispută</p>
                          <p className="font-medium text-gray-700">{d.rejection_reasons?.name ?? '—'}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-400 mb-0.5">Data deschiderii</p>
                          <p className="font-medium text-gray-700">{new Date(d.created_at).toLocaleDateString('ro-RO', { day:'2-digit', month:'short', year:'numeric' })}</p>
                        </div>
                      </div>

                      {d.details && (
                        <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                          <p className="text-xs text-red-500 font-semibold mb-1">Detalii client</p>
                          <p className="text-sm text-gray-700">{d.details}</p>
                        </div>
                      )}

                      {/* Client dispute photos */}
                      {parseJson(d.photos).length > 0 && (
                        <div className="rounded-xl border border-rose-200 overflow-hidden">
                          <div className="bg-rose-50 px-3 py-2 flex items-center gap-2 border-b border-rose-100">
                            <div className="w-2 h-2 rounded-full bg-rose-400 flex-shrink-0" />
                            <p className="text-xs font-bold text-rose-600 uppercase tracking-wide">Dovezi client</p>
                          </div>
                          <div className="p-3 flex gap-2 flex-wrap">
                            {parseJson(d.photos).map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                <img src={url} alt={`dovada-client-${i}`} className="w-16 h-16 rounded-lg object-cover border border-rose-100 hover:opacity-80 transition" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Handyman response + evidence */}
                      {d.handyman_response_at ? (
                        <div className="rounded-xl border border-blue-200 overflow-hidden">
                          <div className="bg-blue-50 px-3 py-2 flex items-center justify-between border-b border-blue-100">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                              <p className="text-xs font-bold text-blue-600 uppercase tracking-wide">Răspuns & dovezi meșter</p>
                            </div>
                            <span className="text-[10px] text-gray-400">{fmtDate(d.handyman_response_at)}</span>
                          </div>
                          <div className="p-3 space-y-2">
                            {(() => {
                              const tl = parseJson(d.timeline)
                              const contestEv = tl.find(e => e.event === 'dispute_contested')
                              const responseText = contestEv?.extra?.response_text ?? d.handyman_response
                              return responseText ? <p className="text-sm text-gray-700">{responseText}</p> : null
                            })()}
                            {parseJson(d.handyman_evidence).length > 0 && (
                              <div className="flex gap-2 flex-wrap">
                                {parseJson(d.handyman_evidence).map((url, i) => (
                                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                    <img src={url} alt={`dovada-meser-${i}`} className="w-14 h-14 rounded-lg object-cover border border-blue-100 hover:opacity-80 transition" />
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-2.5 flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
                          <p className="text-xs text-yellow-700 font-semibold">Meșterul nu a răspuns încă</p>
                        </div>
                      )}

                      {/* Client resolution preference */}
                      {d.client_resolution_request && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <p className="text-xs text-amber-600 font-semibold mb-1">Preferința clientului</p>
                          <p className="text-sm font-bold text-amber-800">
                            {d.client_resolution_request === 'reassign'       ? 'Relucrare cu alt meșter' :
                             d.client_resolution_request === 'partial_refund' ? 'Rambursare parțială' :
                             d.client_resolution_request === 'full_refund'    ? 'Rambursare totală' :
                             d.client_resolution_request}
                          </p>
                          {d.client_refund_estimate && d.client_resolution_request === 'partial_refund' && (
                            <p className="text-xs text-amber-700 mt-0.5 font-semibold">
                              Suma estimată de client: {Number(d.client_refund_estimate).toLocaleString('ro-RO')} RON
                            </p>
                          )}
                          <p className="text-xs text-amber-600 mt-0.5">Clientul și-a exprimat preferința. Decizia finală revine administratorului.</p>
                        </div>
                      )}

                      {/* Handyman reliability metrics */}
                      {hProfile && (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-400 font-semibold mb-2">Metrici meșter</p>
                          <div className="grid grid-cols-4 gap-2 text-center text-xs">
                            <div>
                              <p className="font-bold text-gray-700">{hProfile.reliability_score ?? '—'}</p>
                              <p className="text-gray-400">Scor</p>
                            </div>
                            <div>
                              <p className="font-bold text-green-600">{hProfile.disputes_won ?? 0}</p>
                              <p className="text-gray-400">Câștigate</p>
                            </div>
                            <div>
                              <p className="font-bold text-red-600">{hProfile.disputes_lost ?? 0}</p>
                              <p className="text-gray-400">Pierdute</p>
                            </div>
                            <div>
                              <p className="font-bold text-orange-600">{hProfile.rework_count ?? 0}</p>
                              <p className="text-gray-400">Relucrări</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Task completion info */}
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                        <p className="text-xs text-gray-400 font-semibold">Informații task</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-gray-400">Programat</p>
                            <p className="font-medium text-gray-700">{fmtDate(d.task?.scheduled_date)}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Finalizat (task)</p>
                            <p className="font-medium text-gray-700">{fmtDate(d.task?.completed_at)}</p>
                          </div>
                          {completion && (
                            <>
                              <div>
                                <p className="text-gray-400">Confirmare meșter</p>
                                <p className="font-medium text-gray-700">{fmtDate(completion.created_at)}</p>
                              </div>
                              <div>
                                <p className="text-gray-400">Acceptat de client</p>
                                <p className="font-medium text-gray-700">{completion.client_accepted ? 'Da' : 'Nu'}</p>
                              </div>
                            </>
                          )}
                        </div>
                        {completion?.completion_description && (
                          <div className="mt-1">
                            <p className="text-xs text-gray-400 mb-0.5">Descriere finalizare</p>
                            <p className="text-xs text-gray-700">{completion.completion_description}</p>
                          </div>
                        )}
                        {completion?.completion_photos?.length > 0 && (
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Poze finalizare meșter</p>
                            <div className="flex gap-2 flex-wrap">
                              {completion.completion_photos.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                  <img src={url} alt={`fin-${i}`} className="w-14 h-14 rounded-lg object-cover border border-gray-200 hover:opacity-80 transition" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Timeline */}
                      {parseJson(d.timeline).length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Istoricul disputei</p>
                          <div className="relative">
                            <div className="absolute left-3 top-3 bottom-3 w-0.5 bg-gradient-to-b from-gray-300 via-gray-200 to-transparent" />
                            <div className="space-y-3">
                              {(() => {
                                const evLabels = {
                                  dispute_opened:                           'Dispută deschisă de client',
                                  dispute_contested:                        'Meșterul a contestat',
                                  rework_accepted:                          'Meșterul a acceptat relucrarea',
                                  admin_decision:                           'Decizie admin',
                                  admin_resolved:                           'Rezolvat de admin',
                                  admin_proposed_rework:                    'Admin a propus relucrare',
                                  handyman_accepted_admin_proposal:         'Meșterul a acceptat propunerea',
                                  handyman_declined_rework_proposal:        'Meșterul a refuzat propunerea',
                                  handyman_declined_rework:                 'Meșterul a refuzat relucrarea',
                                  auto_escalated_to_admin:                  'Escalat automat la admin',
                                  awaiting_client_rework_choice:            'Se așteaptă alegerea clientului',
                                  client_chose_accept_current:              'Clientul continuă cu meșterul',
                                  client_chose_reassign:                    'Clientul vrea alt meșter',
                                  client_chose_cancel_no_refund:            'Clientul a anulat',
                                  client_requested_partial_refund:          'Clientul solicită rambursare parțială',
                                  client_requested_full_refund:             'Clientul solicită rambursare totală',
                                  client_requested_reassign:                'Clientul solicită alt meșter',
                                  admin_requested_evidence_from_handyman:   'Admin solicită dovezi meșter',
                                  admin_requested_evidence_from_client:     'Admin solicită dovezi client',
                                  evidence_submitted:                       'Meșterul a trimis dovezi suplimentare',
                                  evidence_refused:                         'Meșterul a refuzat cererea de dovezi',
                                  evidence_submitted_by_client:             'Clientul a trimis dovezi suplimentare',
                                  evidence_refused_by_client:               'Clientul a refuzat cererea de dovezi',
                                  handyman_confirmed_client_date:           'Meșterul a confirmat data',
                                  client_proposed_new_rework_date:          'Clientul a propus altă dată',
                                  handyman_proposed_new_rework_date:        'Meșterul a propus altă dată',
                                  rework_date_confirmed_by_client:          'Data relucrării confirmată',
                                }
                                const EV_CFG = {
                                  dispute_opened:                         { dot: 'bg-rose-400',   ring: 'ring-rose-100',   lbl: 'text-rose-700',   actor: 'bg-rose-50 text-rose-600 border-rose-200' },
                                  dispute_contested:                      { dot: 'bg-blue-400',   ring: 'ring-blue-100',   lbl: 'text-blue-700',   actor: 'bg-blue-50 text-blue-600 border-blue-200' },
                                  rework_accepted:                        { dot: 'bg-teal-400',   ring: 'ring-teal-100',   lbl: 'text-teal-700',   actor: 'bg-blue-50 text-blue-600 border-blue-200' },
                                  admin_proposed_rework:                  { dot: 'bg-purple-400', ring: 'ring-purple-100', lbl: 'text-purple-700', actor: 'bg-purple-50 text-purple-600 border-purple-200' },
                                  admin_decision:                         { dot: 'bg-purple-500', ring: 'ring-purple-200', lbl: 'text-purple-800', actor: 'bg-purple-50 text-purple-600 border-purple-200' },
                                  admin_resolved:                         { dot: 'bg-green-500',  ring: 'ring-green-200',  lbl: 'text-green-800',  actor: 'bg-purple-50 text-purple-600 border-purple-200' },
                                  admin_requested_evidence_from_handyman: { dot: 'bg-purple-400', ring: 'ring-purple-100', lbl: 'text-purple-700', actor: 'bg-purple-50 text-purple-600 border-purple-200' },
                                  admin_requested_evidence_from_client:   { dot: 'bg-purple-400', ring: 'ring-purple-100', lbl: 'text-purple-700', actor: 'bg-purple-50 text-purple-600 border-purple-200' },
                                  evidence_submitted:                     { dot: 'bg-blue-400',   ring: 'ring-blue-100',   lbl: 'text-blue-700',   actor: 'bg-blue-50 text-blue-600 border-blue-200' },
                                  evidence_refused:                       { dot: 'bg-gray-400',   ring: 'ring-gray-100',   lbl: 'text-gray-600',   actor: 'bg-gray-50 text-gray-500 border-gray-200' },
                                  evidence_submitted_by_client:           { dot: 'bg-rose-400',   ring: 'ring-rose-100',   lbl: 'text-rose-700',   actor: 'bg-rose-50 text-rose-600 border-rose-200' },
                                  evidence_refused_by_client:             { dot: 'bg-gray-400',   ring: 'ring-gray-100',   lbl: 'text-gray-600',   actor: 'bg-gray-50 text-gray-500 border-gray-200' },
                                  auto_escalated_to_admin:                { dot: 'bg-orange-400', ring: 'ring-orange-100', lbl: 'text-orange-700', actor: 'bg-orange-50 text-orange-600 border-orange-200' },
                                  handyman_declined_rework:               { dot: 'bg-red-400',    ring: 'ring-red-100',    lbl: 'text-red-700',    actor: 'bg-blue-50 text-blue-600 border-blue-200' },
                                  handyman_accepted_admin_proposal:       { dot: 'bg-teal-400',   ring: 'ring-teal-100',   lbl: 'text-teal-700',   actor: 'bg-blue-50 text-blue-600 border-blue-200' },
                                  handyman_declined_rework_proposal:      { dot: 'bg-red-400',    ring: 'ring-red-100',    lbl: 'text-red-700',    actor: 'bg-blue-50 text-blue-600 border-blue-200' },
                                  client_chose_accept_current:            { dot: 'bg-green-400',  ring: 'ring-green-100',  lbl: 'text-green-700',  actor: 'bg-rose-50 text-rose-600 border-rose-200' },
                                  client_chose_reassign:                  { dot: 'bg-sky-400',    ring: 'ring-sky-100',    lbl: 'text-sky-700',    actor: 'bg-rose-50 text-rose-600 border-rose-200' },
                                  awaiting_client_rework_choice:          { dot: 'bg-amber-400',  ring: 'ring-amber-100',  lbl: 'text-amber-700',  actor: 'bg-gray-50 text-gray-500 border-gray-200' },
                                  client_requested_partial_refund:        { dot: 'bg-rose-400',   ring: 'ring-rose-100',   lbl: 'text-rose-700',   actor: 'bg-rose-50 text-rose-600 border-rose-200' },
                                  client_requested_full_refund:           { dot: 'bg-rose-500',   ring: 'ring-rose-200',   lbl: 'text-rose-800',   actor: 'bg-rose-50 text-rose-600 border-rose-200' },
                                }
                                const dflt = { dot: 'bg-gray-300', ring: 'ring-gray-100', lbl: 'text-gray-600', actor: 'bg-gray-50 text-gray-500 border-gray-200' }

                                return parseJson(d.timeline)
                                  .slice().sort((a,b) => new Date(a.at??0) - new Date(b.at??0))
                                  .map((ev, i) => {
                                    const cfg    = EV_CFG[ev.event] ?? dflt
                                    const actor  = ev.by ?? 'sistem'
                                    const photos = ev.photos?.length ? ev.photos : (ev.extra?.photos?.length ? ev.extra.photos : [])
                                    const text   = ev.extra?.text || ev.text
                                    const note   = ev.extra?.note || ev.note
                                    const hasBody = note || text || photos.length > 0
                                    return (
                                      <div key={i} className="flex items-start gap-3">
                                        {/* Dot */}
                                        <div className={`flex-shrink-0 w-6 h-6 rounded-full ${cfg.dot} ring-4 ${cfg.ring} flex items-center justify-center z-10 mt-0.5`}>
                                          <div className="w-2 h-2 bg-white rounded-full" />
                                        </div>
                                        {/* Card */}
                                        <div className={`flex-1 bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-sm ${hasBody ? 'space-y-2' : ''}`}>
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-xs font-bold ${cfg.lbl}`}>{evLabels[ev.event] ?? ev.event}</span>
                                            <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${cfg.actor}`}>{actor}</span>
                                            <span className="text-[10px] text-gray-400 ml-auto whitespace-nowrap">
                                              {new Date(ev.at).toLocaleDateString('ro-RO', { day:'2-digit', month:'short' })} · {new Date(ev.at).toLocaleTimeString('ro-RO', { hour:'2-digit', minute:'2-digit' })}
                                            </span>
                                          </div>
                                          {note && <p className="text-xs text-gray-500 italic">„{note}"</p>}
                                          {text && <p className="text-xs text-gray-700 bg-gray-50 rounded-lg px-2 py-1.5">{text}</p>}
                                          {photos.length > 0 && (
                                            <div className="flex gap-1.5 flex-wrap">
                                              {photos.map((url, pi) => (
                                                <a key={pi} href={url} target="_blank" rel="noopener noreferrer">
                                                  <img src={url} alt="" className="w-12 h-12 rounded-lg object-cover border border-gray-200 hover:opacity-80 transition" />
                                                </a>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )
                                  })
                              })()}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Admin decision panel */}
                      {!d.admin_decision && (ADMIN_NEEDS_DECISION.includes(d.status) || d.status === 'open') && d.status !== 'admin_proposed_rework' && (
                        <div className="space-y-3">

                          {/* ── Handyman refused rework → context-aware panels ── */}
                          {d.status === 'handyman_declined_rework' && (
                            <div className="space-y-3">

                              {/* Always: refusal notification */}
                              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-sm font-bold text-red-700">Meșterul a refuzat relucrarea</p>
                                  <p className="text-xs text-red-600 mt-0.5">Meșterul nu a acceptat să corecteze lucrarea. Acțiunile disponibile depind de preferința clientului.</p>
                                </div>
                              </div>

                              {/* Waiting for client to choose */}
                              {!d.client_resolution_request && (
                                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                                  <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                  <p className="text-sm text-amber-700">Se așteaptă alegerea clientului: alt meșter, rambursare parțială sau totală.</p>
                                </div>
                              )}

                              {/* Client chose reassign → auto-published, admin monitors */}
                              {d.client_resolution_request === 'reassign' && (
                                <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <RotateCcw className="w-4 h-4 text-sky-600 flex-shrink-0" />
                                    <p className="text-sm font-bold text-sky-800">Clientul a ales relucrare cu alt meșter</p>
                                  </div>
                                  <div className="flex items-start gap-2 bg-white border border-sky-100 rounded-lg p-2.5">
                                    <CheckCircle className="w-3.5 h-3.5 text-sky-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-sky-700">Taskul de relucrare a fost publicat automat în marketplace. Este vizibil meșterilor verificați cu rating ridicat. Disputa se va închide când relucrarea va fi finalizată și acceptată de client.</p>
                                  </div>
                                  <p className="text-xs text-gray-400 px-0.5">Nu este necesară nicio acțiune din partea ta. Monitorizează progresul în secțiunea de taskuri.</p>
                                </div>
                              )}

                              {/* Client chose partial refund → admin sets amount + reason */}
                              {d.client_resolution_request === 'partial_refund' && (
                                <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 space-y-3">
                                  <div className="flex items-start gap-2">
                                    <DollarSign className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="text-sm font-bold text-teal-800">Clientul solicită rambursare parțială</p>
                                      {d.client_refund_estimate && (
                                        <p className="text-xs text-teal-700 mt-0.5">
                                          Suma propusă de client: <strong>{Number(d.client_refund_estimate).toLocaleString('ro-RO')} RON</strong>
                                          {d.task?.final_price && <> · Total task: <strong>{Number(d.task.final_price).toLocaleString('ro-RO')} RON</strong></>}
                                        </p>
                                      )}
                                      <p className="text-xs text-teal-600 mt-1">Analizează dovezile și discută prin chat dacă e necesar. Suma stabilită de tine este finală și nu se mai discută.</p>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1.5">Suma rambursată clientului (RON) *</label>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="number" min="1"
                                        value={refundAmt[d.id] ?? ''}
                                        onChange={e => setRefundAmt(prev => ({ ...prev, [d.id]: e.target.value }))}
                                        placeholder="ex: 150"
                                        className="flex-1 px-3 py-2 border border-teal-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                                      />
                                      {d.task?.final_price && (
                                        <span className="text-xs text-gray-400 flex-shrink-0">/ {Number(d.task.final_price).toLocaleString('ro-RO')} RON</span>
                                      )}
                                    </div>
                                    {refundAmt[d.id] && d.task?.final_price && (
                                      <p className="text-xs text-gray-500 mt-1">
                                        Suma virată meșterului: <strong className="text-teal-700">{Math.max(0, Number(d.task.final_price) - Number(refundAmt[d.id])).toLocaleString('ro-RO')} RON</strong>
                                      </p>
                                    )}
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1.5">Motivarea deciziei *</label>
                                    <textarea
                                      value={adminNote[d.id] ?? ''}
                                      onChange={e => setAdminNote(prev => ({ ...prev, [d.id]: e.target.value }))}
                                      placeholder="Descrie motivul sumei stabilite..."
                                      rows={2}
                                      className="w-full px-3 py-2 border border-teal-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
                                    />
                                  </div>
                                  <button
                                    onClick={() => handleDecision(d.id, 'partial_refund')}
                                    disabled={!!actionKey || !refundAmt[d.id] || !adminNote[d.id]?.trim()}
                                    className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold transition disabled:opacity-50"
                                  >
                                    {actionKey === `${d.id}_partial_refund`
                                      ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                      : <><DollarSign className="w-4 h-4" /> Aplică rambursarea parțială</>}
                                  </button>
                                </div>
                              )}

                              {/* Client chose full refund → admin can give full or less (with mandatory reason) */}
                              {d.client_resolution_request === 'full_refund' && (() => {
                                const finalPrice  = d.task?.final_price ? Number(d.task.final_price) : 0
                                const enteredAmt  = refundAmt[d.id] !== undefined ? Number(refundAmt[d.id]) : finalPrice
                                const isLessFull  = refundAmt[d.id] !== undefined && enteredAmt < finalPrice
                                const needsReason = !adminNote[d.id]?.trim()
                                return (
                                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                                    <div className="flex items-start gap-2">
                                      <DollarSign className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="text-sm font-bold text-red-800">Clientul solicită rambursare totală</p>
                                        <p className="text-xs text-red-600 mt-0.5">
                                          Suma totală: <strong>{finalPrice.toLocaleString('ro-RO')} RON</strong>. Poți acorda integral sau mai puțin — în cazul din urmă motivarea este obligatorie și decizia este definitivă.
                                        </p>
                                      </div>
                                    </div>
                                    <div>
                                      <label className="block text-xs font-bold text-gray-500 mb-1.5">Suma rambursată (RON)</label>
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="number" min="1"
                                          value={refundAmt[d.id] ?? finalPrice}
                                          onChange={e => setRefundAmt(prev => ({ ...prev, [d.id]: e.target.value }))}
                                          className="flex-1 px-3 py-2 border border-red-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                                        />
                                        <span className="text-xs text-gray-400 flex-shrink-0">/ {finalPrice.toLocaleString('ro-RO')} RON</span>
                                      </div>
                                      {isLessFull && (
                                        <p className="text-xs text-orange-600 mt-1">
                                          Acorzi mai puțin decât totalul. Meșterul primește: <strong>{Math.max(0, finalPrice - enteredAmt).toLocaleString('ro-RO')} RON</strong>. <span className="font-bold">Motivarea este obligatorie.</span>
                                        </p>
                                      )}
                                    </div>
                                    <div>
                                      <label className="block text-xs font-bold mb-1.5 text-red-600">
                                        Motivarea deciziei * (obligatoriu)
                                      </label>
                                      <textarea
                                        value={adminNote[d.id] ?? ''}
                                        onChange={e => setAdminNote(prev => ({ ...prev, [d.id]: e.target.value }))}
                                        placeholder="Explică decizia luată. Mesajul va fi transmis ambelor părți."
                                        rows={2}
                                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 resize-none ${isLessFull ? 'border-red-300 focus:ring-red-400' : 'border-red-200 focus:ring-red-300'}`}
                                      />
                                    </div>
                                    <button
                                      onClick={() => handleDecision(d.id, isLessFull ? 'partial_refund' : 'full_refund')}
                                      disabled={!!actionKey || needsReason}
                                      className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition disabled:opacity-50"
                                    >
                                      {actionKey
                                        ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        : <><DollarSign className="w-4 h-4" /> {isLessFull ? `Aplică rambursare de ${enteredAmt.toLocaleString('ro-RO')} RON` : 'Aplică rambursarea totală'}</>}
                                    </button>
                                  </div>
                                )
                              })()}
                            </div>
                          )}

                          {/* ── Waiting for evidence panels ── */}
                          {d.status === 'evidence_requested_handyman' && (
                            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3">
                              <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-bold text-amber-800">Se așteaptă dovezi de la meșter</p>
                                <p className="text-xs text-amber-600 mt-0.5">Meșterul poate trimite dovezi sau refuza cererea. Vei fi notificat când răspunde.</p>
                              </div>
                            </div>
                          )}
                          {d.status === 'evidence_requested_client' && (
                            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3">
                              <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-bold text-amber-800">Se așteaptă dovezi de la client</p>
                                <p className="text-xs text-amber-600 mt-0.5">Clientul poate trimite dovezi sau refuza cererea. Vei fi notificat când răspunde.</p>
                              </div>
                            </div>
                          )}

                          {/* ── Standard decision panel ── */}
                          {d.status !== 'handyman_declined_rework' && !['evidence_requested_handyman', 'evidence_requested_client'].includes(d.status) && (
                            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-bold text-purple-700">Decizia adminului</p>
                                {!adminNote[d.id]?.trim() && (
                                  <span className="text-[10px] font-bold text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">Notă obligatorie *</span>
                                )}
                              </div>
                              <textarea
                                value={adminNote[d.id] ?? ''}
                                onChange={e => setAdminNote(prev => ({ ...prev, [d.id]: e.target.value }))}
                                placeholder="Notă obligatorie — explică decizia finală luată..."
                                rows={2}
                                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 resize-none ${!adminNote[d.id]?.trim() ? 'border-red-300 focus:ring-red-400' : 'border-purple-200 focus:ring-purple-400'}`}
                              />
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={refundAmt[d.id] ?? ''}
                                  onChange={e => setRefundAmt(prev => ({ ...prev, [d.id]: e.target.value }))}
                                  placeholder="Sumă rambursare parțială (RON)"
                                  className="flex-1 px-3 py-2 border border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                                />
                                {d.task?.final_price && (
                                  <span className="text-xs text-gray-400">/ {Number(d.task.final_price).toLocaleString('ro-RO')} RON</span>
                                )}
                              </div>
                              <div className="space-y-2.5">

                                {/* Cere dovezi suplimentare */}
                                <p className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider px-0.5">Investigare</p>
                                <div className="grid grid-cols-2 gap-2">
                                  {[
                                    { from: 'handyman', label: 'Cere dovezi meșter', cls: 'bg-blue-500 hover:bg-blue-600' },
                                    { from: 'client',   label: 'Cere dovezi client', cls: 'bg-indigo-500 hover:bg-indigo-600' },
                                  ].map(({ from, label, cls }) => {
                                    const key = `${d.id}_req_evidence_${from}`
                                    return (
                                      <button key={from}
                                        onClick={() => handleRequestEvidence(d.id, from)}
                                        disabled={!!actionKey}
                                        className={`flex flex-col items-center justify-center gap-0.5 py-2.5 px-3 ${cls} text-white rounded-xl text-xs font-bold transition disabled:opacity-50`}>
                                        {actionKey === key
                                          ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                          : <Search className="w-3.5 h-3.5 mb-0.5" />}
                                        <span>{label}</span>
                                        <span className="font-normal text-white/70 text-[10px]">Notifică · 24h termen</span>
                                      </button>
                                    )
                                  })}
                                </div>

                                {/* Aprobă meșter */}
                                {(() => { const key = `${d.id}_approve_handyman`; return (
                                  <button
                                    onClick={() => handleDecision(d.id, 'approve_handyman')}
                                    disabled={!!actionKey || !adminNote[d.id]?.trim()}
                                    title={!adminNote[d.id]?.trim() ? 'Notă obligatorie înainte de decizie' : 'Lucrarea e conformă. Clientul pierde disputa.'}
                                    className="w-full flex items-center justify-between px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition disabled:opacity-50"
                                  >
                                    <div className="flex items-center gap-2">
                                      {actionKey === key ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                      <span>Aprobă meșter</span>
                                    </div>
                                    <span className="text-xs font-normal text-green-200">Lucrarea e conformă · client pierde</span>
                                  </button>
                                )})()}

                                {/* Relucrare */}
                                {(() => {
                                  const isReworkTask = d.task?.is_rework === true
                                  const reworkLvl    = d.task?.rework_level ?? 1
                                  const canRework    = !isReworkTask || reworkLvl < 2

                                  if (!canRework) return (
                                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                      <p className="text-xs text-amber-700">Aceasta este o <strong>relucrare de nivel {reworkLvl}</strong>. Singurele opțiuni disponibile sunt rambursarea parțială sau totală.</p>
                                    </div>
                                  )

                                  const reworkOptions = isReworkTask
                                    ? [{ decision: 'propose_rework', label: 'Propune relucrare', sub: 'Pe cheltuiala meșterului', cls: 'bg-yellow-500 hover:bg-yellow-600', title: 'Propune meșterului să refacă pe cheltuiala sa. Poate accepta sau refuza.' }]
                                    : [
                                        { decision: 'propose_rework', label: 'Propune relucrare', sub: 'Amiabil, fără penalizare', cls: 'bg-yellow-500 hover:bg-yellow-600', title: 'Cere amiabil meșterului să refacă. Meșterul poate accepta sau refuza.' },
                                        { decision: 'forced_rework',  label: 'Forțează relucrare', sub: 'Obligatoriu · penalizare', cls: 'bg-orange-500 hover:bg-orange-600', title: 'Obligă meșterul să refacă. Penalizare automată.' },
                                      ]

                                  return (
                                    <>
                                      <p className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider px-0.5">Soluții de relucrare</p>
                                      <div className={`grid gap-2 ${reworkOptions.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                        {reworkOptions.map(({ decision, label, sub, cls, title }) => {
                                          const key = `${d.id}_${decision}`
                                          return (
                                            <button key={decision} onClick={() => handleDecision(d.id, decision)} disabled={!!actionKey} title={title}
                                              className={`flex flex-col items-center justify-center gap-0.5 py-2.5 px-3 ${cls} text-white rounded-xl text-xs font-bold transition disabled:opacity-50`}>
                                              {actionKey === key
                                                ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                : <Wrench className="w-3.5 h-3.5 mb-0.5" />}
                                              <span>{label}</span>
                                              <span className="font-normal text-white/70 text-[10px] leading-tight text-center">{sub}</span>
                                            </button>
                                          )
                                        })}
                                      </div>
                                    </>
                                  )
                                })()}

                                {/* Compensație */}
                                <p className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider px-0.5">Compensație financiară</p>
                                <div className="grid grid-cols-2 gap-2">
                                  {[
                                    { decision: 'partial_refund', label: 'Rambursare parțială', sub: `${refundAmt[d.id] ? `${refundAmt[d.id]} RON` : 'Introdu suma mai sus'}`, cls: 'bg-teal-600 hover:bg-teal-700', title: 'Completează suma de rambursat mai sus.' },
                                    { decision: 'full_refund',    label: 'Rambursare totală',   sub: d.task?.final_price ? `${Number(d.task.final_price).toLocaleString('ro-RO')} RON` : 'Client câștigă',  cls: 'bg-red-600 hover:bg-red-700',  title: 'Clientul câștigă. Rambursare 100%.' },
                                  ].map(({ decision, label, sub, cls, title }) => {
                                    const key = `${d.id}_${decision}`
                                    return (
                                      <button key={decision} onClick={() => handleDecision(d.id, decision)}
                                        disabled={!!actionKey || !adminNote[d.id]?.trim() || (decision === 'partial_refund' && !refundAmt[d.id])} title={!adminNote[d.id]?.trim() ? 'Notă obligatorie înainte de decizie' : title}
                                        className={`flex flex-col items-center justify-center gap-0.5 py-2.5 px-3 ${cls} text-white rounded-xl text-xs font-bold transition disabled:opacity-50`}>
                                        {actionKey === key
                                          ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                          : <Send className="w-3.5 h-3.5 mb-0.5" />}
                                        <span>{label}</span>
                                        <span className="font-normal text-white/70 text-[10px] leading-tight text-center">{sub}</span>
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Waiting for client to choose rework path */}
                      {d.status === 'awaiting_client_rework_choice' && (
                        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-600" />
                            <p className="text-sm font-bold text-amber-800">Se așteaptă decizia clientului</p>
                          </div>
                          <p className="text-xs text-amber-600 mt-1">Meșterul a acceptat relucrarea. Clientul alege dacă continuă cu meșterul actual, dorește alt meșter sau anulare.</p>
                        </div>
                      )}

                      {/* Waiting for handyman response to proposal */}
                      {d.status === 'admin_proposed_rework' && (
                        <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-yellow-600" />
                            <p className="text-sm font-bold text-yellow-800">Propunere trimisă — așteptare răspuns meșter</p>
                          </div>
                          <p className="text-xs text-yellow-600 mt-1">Meșterul va accepta sau refuza propunerea de relucrare amiabilă.</p>
                        </div>
                      )}

                      {/* Already decided */}
                      {d.admin_decision && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-xs text-green-600 font-semibold mb-1">Decizie admin: {d.admin_decision}</p>
                          <p className="text-xs text-green-700">{d.resolution_note ?? '—'}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Section: Dispute Financials ─────────────────────────────────────────────

function DisputeFinancialsSection() {
  const [disputes, setDisputes] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('task_disputes')
        .select(`
          id, status, refund_amount, platform_cost, handyman_payout, created_at, admin_decided_at,
          task:task_id (title, final_price),
          client:client_id (first_name, last_name),
          handyman:handyman_id (first_name, last_name)
        `)
        .in('status', ['refund_partial', 'refund_full', 'rework_marketplace', 'forced_accepted', 'resolved'])
        .order('admin_decided_at', { ascending: false })
      setDisputes(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const totalRefunds   = disputes.reduce((s, d) => s + Number(d.refund_amount ?? 0), 0)
  const totalPlatform  = disputes.reduce((s, d) => s + Number(d.platform_cost ?? 0), 0)
  const countRefunds   = disputes.filter(d => ['refund_partial', 'refund_full'].includes(d.status)).length
  const countReworks   = disputes.filter(d => d.status === 'rework_marketplace').length
  const totalCost      = totalRefunds + totalPlatform

  const rowCls = (status) => {
    if (status === 'rework_marketplace') return 'text-sky-700'
    if (status === 'refund_full')        return 'text-red-700'
    if (status === 'refund_partial')     return 'text-teal-700'
    return 'text-gray-600'
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Costuri Dispute</h2>
        <p className="text-sm text-gray-500">Cheltuielile platformei generate de dispute rezolvate</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                </div>
                <p className="text-xs text-gray-500 font-medium">Cost total</p>
              </div>
              <p className="text-2xl font-bold text-red-700">{totalCost.toLocaleString('ro-RO')} RON</p>
              <p className="text-xs text-gray-400 mt-0.5">Rambursări + relucrări</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-teal-600" />
                </div>
                <p className="text-xs text-gray-500 font-medium">Total rambursări</p>
              </div>
              <p className="text-2xl font-bold text-teal-700">{totalRefunds.toLocaleString('ro-RO')} RON</p>
              <p className="text-xs text-gray-400 mt-0.5">{countRefunds} dispute</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
                  <RotateCcw className="w-4 h-4 text-sky-600" />
                </div>
                <p className="text-xs text-gray-500 font-medium">Relucrări platite</p>
              </div>
              <p className="text-2xl font-bold text-sky-700">{totalPlatform.toLocaleString('ro-RO')} RON</p>
              <p className="text-xs text-gray-400 mt-0.5">{countReworks} relucrări</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Package className="w-4 h-4 text-gray-600" />
                </div>
                <p className="text-xs text-gray-500 font-medium">Dispute incluse</p>
              </div>
              <p className="text-2xl font-bold text-gray-700">{disputes.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">dispute cu cost financiar</p>
            </div>
          </div>

          {/* Breakdown table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-bold text-gray-700">Detalii pe dispute</p>
            </div>
            {disputes.length === 0 ? (
              <div className="text-center py-10">
                <DollarSign className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">Niciun cost înregistrat încă</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {disputes.map(d => {
                  const clientName  = `${d.client?.first_name ?? ''} ${d.client?.last_name ?? ''}`.trim() || '—'
                  const handyName   = `${d.handyman?.first_name ?? ''} ${d.handyman?.last_name ?? ''}`.trim() || '—'
                  const cost        = Number(d.refund_amount ?? 0) + Number(d.platform_cost ?? 0)
                  return (
                    <div key={d.id} className="px-4 py-3 flex items-center gap-3 text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{d.task?.title ?? '—'}</p>
                        <p className="text-xs text-gray-400">{clientName} vs {handyName}</p>
                      </div>
                      <div className="text-xs text-gray-400 flex-shrink-0">
                        {d.admin_decided_at ? new Date(d.admin_decided_at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' }) : '—'}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${ADMIN_DISPUTE_STATUS_CLS[d.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {ADMIN_DISPUTE_STATUS_LABELS[d.status] ?? d.status}
                      </span>
                      {cost > 0 ? (
                        <p className={`font-bold flex-shrink-0 w-24 text-right ${rowCls(d.status)}`}>
                          {cost.toLocaleString('ro-RO')} RON
                        </p>
                      ) : (
                        <p className="text-xs text-gray-300 flex-shrink-0 w-24 text-right">—</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Section: Users ───────────────────────────────────────────────────────────

function UsersSection() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id, first_name, last_name, email, is_active, created_at, onboarding_completed,
        user_roles(roles(name))
      `)
      .order('created_at', { ascending: false })

    if (!error) setUsers(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = users.filter(u => {
    const fullName = `${u.first_name ?? ''} ${u.last_name ?? ''}`.toLowerCase()
    const matchSearch = fullName.includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
    const roles = u.user_roles?.map(r => r.roles?.name).filter(Boolean) || []
    const matchRole = roleFilter === 'all' || roles.includes(roleFilter)
    return matchSearch && matchRole
  })

  const roleTag = (u) => {
    const roles = u.user_roles?.map(r => r.roles?.name).filter(Boolean) || []
    const map = {
      client:   'bg-blue-100 text-blue-700',
      handyman: 'bg-purple-100 text-purple-700',
      admin:    'bg-gray-800 text-white',
    }
    const label = { client: 'Client', handyman: 'Meșter', admin: 'Admin' }
    return roles.map(r => (
      <span key={r} className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[r] ?? 'bg-gray-100 text-gray-600'}`}>
        {label[r] ?? r}
      </span>
    ))
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Utilizatori</h2>
          <p className="text-sm text-gray-500">Toți utilizatorii înregistrați pe platformă</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition">
          <RefreshCw className="w-4 h-4" /> Actualizează
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Caută după nume sau email..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
          {['all', 'client', 'handyman'].map(f => (
            <button
              key={f}
              onClick={() => setRoleFilter(f)}
              className={`px-4 py-2.5 font-medium transition ${roleFilter === f ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            >
              {f === 'all' ? 'Toți' : f === 'client' ? 'Clienți' : 'Meșteri'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Niciun utilizator găsit</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map(u => {
              const fullName = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || 'Necunoscut'
              return (
                <div key={u.id} className="flex items-center gap-4 px-4 py-3">
                  <Avatar name={fullName} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">{fullName}</p>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {roleTag(u)}
                  </div>
                  <div className="hidden sm:flex flex-col items-end text-xs text-gray-400">
                    <span>{fmtDate(u.created_at)}</span>
                    {u.onboarding_completed ? (
                      <span className="text-green-600 font-medium">Profil complet</span>
                    ) : (
                      <span className="text-yellow-600 font-medium">Onboarding</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Section: Document Verifications (verifications table) ────────────────────

function VerificationsSection() {
  const [verifs, setVerifs] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [typeFilter, setTypeFilter] = useState('all')
  const [expanded, setExpanded] = useState(null)
  const [signedUrls, setSignedUrls] = useState({})
  const [rejectNote, setRejectNote] = useState({})
  const [actionLoading, setActionLoading] = useState(null)
  const [adminId, setAdminId] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setAdminId(user.id)
    })
    load()
  }, [])

  function extractBucketPath(url) {
    if (!url) return null
    // getPublicUrl() produces /object/public/bucket/path
    // authenticated URLs produce /object/bucket/path
    for (const marker of ['/object/public/verification-docs/', '/object/verification-docs/']) {
      const idx = url.indexOf(marker)
      if (idx !== -1) return url.slice(idx + marker.length)
    }
    return null
  }

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('verifications')
      .select(`
        id, type, status, document_url, document_url_2,
        rejection_reason, verified_at, created_at,
        profiles!verifications_user_id_fkey(id, first_name, last_name, email)
      `)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setVerifs(data)

      // Pre-generate all signed URLs in parallel while the list renders
      const entries = await Promise.all(
        data.map(async (v) => {
          const urls = {}
          await Promise.all(
            [['url1', v.document_url], ['url2', v.document_url_2]].map(async ([key, rawUrl]) => {
              const path = extractBucketPath(rawUrl)
              if (path) {
                const { data: s } = await supabase.storage
                  .from('verification-docs')
                  .createSignedUrl(path, 86400) // 24h so re-loads don't re-fetch
                urls[key] = s?.signedUrl || null
              }
            })
          )
          return [v.id, urls]
        })
      )
      setSignedUrls(Object.fromEntries(entries))
    }
    setLoading(false)
  }

  const filtered = verifs.filter(v => {
    const matchStatus = statusFilter === 'all' || v.status === statusFilter
    const matchType = typeFilter === 'all' || v.type === typeFilter
    return matchStatus && matchType
  })

  function expandRow(v) {
    setExpanded(prev => prev === v.id ? null : v.id)
  }

  async function handleDecision(id, approve, note = '') {
    setActionLoading(id + (approve ? 'approve' : 'reject'))
    const updates = approve
      ? { status: 'approved', verified_at: new Date().toISOString(), admin_id: adminId, rejection_reason: null }
      : { status: 'rejected', rejection_reason: note, admin_id: adminId, verified_at: null }

    const { error } = await supabase.from('verifications').update(updates).eq('id', id)
    if (!error) {
      showToast(approve ? 'Verificare aprobată!' : 'Verificare respinsă.', approve ? 'success' : 'error')
      const verif = verifs.find(v => v.id === id)
      const handymanUserId = verif?.profiles?.id
      const docLabel = verif?.type === 'identity' ? 'identitate (buletin)' : 'dosar juridic (cazier)'
      await notifyHandyman(
        handymanUserId,
        approve ? 'verification_approved' : 'verification_rejected',
        approve ? `Document aprobat: ${docLabel}` : `Document respins: ${docLabel}`,
        approve
          ? `Documentul tău de ${docLabel} a fost aprobat. Nivelul tău de verificare a crescut.`
          : `Documentul tău de ${docLabel} a fost respins${note ? ': ' + note : '. Verifică detaliile și reîncarcă.'}`
      )
      load()
    }
    setActionLoading(null)
  }

  const statusBadge = (s) => {
    const map = {
      pending:  'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
    }
    const label = { pending: 'În așteptare', approved: 'Aprobat', rejected: 'Respins' }
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[s] ?? 'bg-gray-100 text-gray-600'}`}>
        {label[s] ?? s}
      </span>
    )
  }

  return (
    <div className="space-y-5">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition
          ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Verificări Documente</h2>
          <p className="text-sm text-gray-500">Aprobă sau respinge documentele de identitate și juridice ale meșterilor</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition">
          <RefreshCw className="w-4 h-4" /> Actualizează
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        <strong>Flux verificare:</strong> Meșterii încarcă buletin + selfie (identitate) și cazier judiciar (juridic).
        Aprobarea identității deblochează <strong>Nivelul 2</strong>; aprobarea ambelor deblochează <strong>Nivelul 3</strong> și accesul la task-uri de risc ridicat.
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
          {['pending', 'approved', 'rejected', 'all'].map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-2.5 font-medium transition ${statusFilter === f ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            >
              {f === 'all' ? 'Toate' : f === 'pending' ? 'În așteptare' : f === 'approved' ? 'Aprobate' : 'Respinse'}
            </button>
          ))}
        </div>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
          {['all', 'identity', 'legal'].map(f => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={`px-3 py-2.5 font-medium transition ${typeFilter === f ? 'bg-purple-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            >
              {f === 'all' ? 'Toate tipurile' : f === 'identity' ? 'Identitate' : 'Juridic'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Nicio verificare găsită</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map(v => {
              const fullName = `${v.profiles?.first_name ?? ''} ${v.profiles?.last_name ?? ''}`.trim() || 'Necunoscut'
              const isOpen = expanded === v.id
              const isPending = v.status === 'pending'
              const isIdentity = v.type === 'identity'

              return (
                <div key={v.id} className="p-4">
                  <div
                    className="flex items-center gap-4 cursor-pointer"
                    onClick={() => expandRow(v)}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                      ${isIdentity ? 'bg-blue-50' : 'bg-purple-50'}`}>
                      {isIdentity
                        ? <FileText className="w-5 h-5 text-blue-500" />
                        : <ShieldCheck className="w-5 h-5 text-purple-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm">{fullName}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {v.profiles?.email} •{' '}
                        <span className={`font-semibold ${isIdentity ? 'text-blue-600' : 'text-purple-600'}`}>
                          {isIdentity ? 'Identitate' : 'Dosar juridic'}
                        </span>
                      </p>
                    </div>
                    <span className="hidden sm:inline text-xs text-gray-400">{fmtDate(v.created_at)}</span>
                    {statusBadge(v.status)}
                    {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>

                  {isOpen && (
                    <div className="mt-4 pl-14 space-y-4">
                      <div className="space-y-3">
                        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Documente încărcate</p>
                        {(v.document_url || v.document_url_2) ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {[['url1', v.document_url], ['url2', v.document_url_2]]
                              .filter(([, raw]) => !!raw)
                              .map(([key, rawUrl]) => {
                                const src = signedUrls[v.id]?.[key]
                                const label = isIdentity
                                  ? (key === 'url1' ? 'Buletin / CI' : 'Selfie cu buletin')
                                  : 'Cazier judiciar'
                                const isPdf = rawUrl?.toLowerCase().endsWith('.pdf')

                                return (
                                  <div key={key} className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                                    <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                                      <span className="text-xs font-semibold text-gray-600">{label}</span>
                                      {src && (
                                        <a href={src} target="_blank" rel="noopener noreferrer"
                                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                                          <ExternalLink className="w-3 h-3" /> Deschide
                                        </a>
                                      )}
                                    </div>

                                    {src ? (
                                      isPdf ? (
                                        <div className="flex flex-col items-center justify-center py-8 gap-2">
                                          <FileText className="w-10 h-10 text-gray-400" />
                                          <a href={src} target="_blank" rel="noopener noreferrer"
                                            className="text-sm text-blue-600 hover:underline font-medium">
                                            Deschide PDF
                                          </a>
                                        </div>
                                      ) : (
                                        <a href={src} target="_blank" rel="noopener noreferrer">
                                          <img
                                            src={src}
                                            alt={label}
                                            className="w-full object-cover max-h-56 hover:opacity-90 transition cursor-zoom-in"
                                          />
                                        </a>
                                      )
                                    ) : (
                                      <div className="flex items-center justify-center py-10">
                                        <span className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400 italic">Niciun document disponibil</p>
                        )}
                      </div>

                      {v.rejection_reason && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <p className="text-xs text-red-600 font-semibold mb-1">Motiv respingere</p>
                          <p className="text-sm text-red-800">{v.rejection_reason}</p>
                        </div>
                      )}

                      {v.status === 'approved' && v.verified_at && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 flex-shrink-0" />
                          Aprobat la {fmtDate(v.verified_at)}
                        </div>
                      )}

                      {isPending && (
                        <div className="space-y-3">
                          <textarea
                            value={rejectNote[v.id] ?? ''}
                            onChange={e => setRejectNote(prev => ({ ...prev, [v.id]: e.target.value }))}
                            placeholder="Motiv respingere (obligatoriu dacă respecți documentul)..."
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          />
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleDecision(v.id, true)}
                              disabled={!!actionLoading}
                              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                            >
                              {actionLoading === v.id + 'approve'
                                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                : <CheckCircle className="w-4 h-4" />}
                              Aprobă
                            </button>
                            <button
                              onClick={() => {
                                const note = (rejectNote[v.id] ?? '').trim()
                                if (!note) { showToast('Adaugă un motiv de respingere.', 'error'); return }
                                handleDecision(v.id, false, note)
                              }}
                              disabled={!!actionLoading}
                              className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                            >
                              {actionLoading === v.id + 'reject'
                                ? <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                : <XCircle className="w-4 h-4" />}
                              Respinge
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Risk level helpers ───────────────────────────────────────────────────────

const RISK_LABEL = { low: 'Scăzut', medium: 'Mediu', high: 'Ridicat' }
const RISK_COLOR = {
  low:    'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high:   'bg-red-100 text-red-700',
}

// ─── Section: Skill Certifications ────────────────────────────────────────────

function SkillCertificationsSection() {
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [expanded, setExpanded] = useState(null)
  const [rejectNote, setRejectNote] = useState({})
  const [actionLoading, setActionLoading] = useState(null)
  const [adminId, setAdminId] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setAdminId(user.id)
    })
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('user_skills')
      .select(`
        id, status, rejection_reason, verified_at, created_at,
        skills(id, name, category, risk_level, requires_certificate),
        profiles!user_skills_user_id_fkey(id, first_name, last_name, email),
        skill_evidences(id, type, file_url, description)
      `)
      .order('created_at', { ascending: false })

    if (!error) setSkills(data || [])
    setLoading(false)
  }

  const filtered = skills.filter(s =>
    filter === 'all' || s.status === filter
  )

  async function handleDecision(id, approve, note = '') {
    setActionLoading(id + (approve ? 'a' : 'r'))
    const updates = approve
      ? { status: 'approved', verified_at: new Date().toISOString(), admin_id: adminId, rejection_reason: null }
      : { status: 'rejected', rejection_reason: note, admin_id: adminId, verified_at: null }

    const { error } = await supabase.from('user_skills').update(updates).eq('id', id)
    if (error) {
      showToast('Eroare la salvare: ' + error.message, 'error')
    } else {
      showToast(approve ? 'Skill aprobat!' : 'Skill respins.', approve ? 'success' : 'error')
      const skillRow = skills.find(s => s.id === id)
      const handymanUserId = skillRow?.profiles?.id
      const skillName = skillRow?.skills?.name || 'skill'
      await notifyHandyman(
        handymanUserId,
        approve ? 'skill_approved' : 'skill_rejected',
        approve ? `Skill aprobat: ${skillName}` : `Skill respins: ${skillName}`,
        approve
          ? `Skillul „${skillName}" a fost aprobat. Acum apare ca verificat în profilul tău.`
          : `Skillul „${skillName}" a fost respins${note ? ': ' + note : '. Adaugă dovezi suplimentare și reîncearcă.'}`,
        approve ? {} : { rejection_reason: note }
      )
      load()
    }
    setActionLoading(null)
  }

  const statusBadge = (s) => {
    const map = {
      draft:    'bg-gray-100 text-gray-600',
      pending:  'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
    }
    const label = { draft: 'Draft', pending: 'În așteptare', approved: 'Aprobat', rejected: 'Respins' }
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[s] ?? 'bg-gray-100 text-gray-600'}`}>
        {label[s] ?? s}
      </span>
    )
  }

  return (
    <div className="space-y-5">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition
          ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Certificări Skilluri</h2>
          <p className="text-sm text-gray-500">Revizuiește dovezile trimise de meșteri și aprobă sau respinge skillurile</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition">
          <RefreshCw className="w-4 h-4" /> Actualizează
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        <strong>Flux:</strong> Meșterul adaugă un skill → încarcă dovezi (certificate, poze, referințe) →
        trimite la verificare → adminul aprobă sau respinge cu motiv.
        Skillurile aprobate contribuie la <strong>Trust Score</strong> și accesul la task-uri.
      </div>

      <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
        {[
          { id: 'pending',  label: 'În așteptare' },
          { id: 'approved', label: 'Aprobate' },
          { id: 'rejected', label: 'Respinse' },
          { id: 'all',      label: 'Toate' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2.5 font-medium transition ${filter === f.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Niciun skill găsit</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map(us => {
              const fullName = `${us.profiles?.first_name ?? ''} ${us.profiles?.last_name ?? ''}`.trim() || 'Necunoscut'
              const isOpen = expanded === us.id
              const isPending = us.status === 'pending'
              const risk = us.skills?.risk_level

              return (
                <div key={us.id} className="p-4">
                  <div
                    className="flex items-center gap-4 cursor-pointer"
                    onClick={() => setExpanded(isOpen ? null : us.id)}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${RISK_COLOR[risk]?.replace('text-', 'bg-').replace('700','100') ?? 'bg-gray-100'}`}>
                      <Award className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm">{us.skills?.name ?? '—'}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {fullName} · {us.profiles?.email}
                      </p>
                    </div>
                    <div className="hidden sm:flex items-center gap-2">
                      {risk && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${RISK_COLOR[risk]}`}>
                          {RISK_LABEL[risk]}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {us.skill_evidences?.length ?? 0} dovezi
                      </span>
                    </div>
                    {statusBadge(us.status)}
                    {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>

                  {isOpen && (
                    <div className="mt-4 pl-14 space-y-4">
                      {/* Skill info */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Categorie</p>
                          <p className="font-medium text-gray-700">{us.skills?.category ?? '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Risc</p>
                          <p className="font-medium text-gray-700">{RISK_LABEL[risk] ?? '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Certificat obligatoriu</p>
                          <p className="font-medium text-gray-700">{us.skills?.requires_certificate ? 'Da' : 'Nu'}</p>
                        </div>
                      </div>

                      {/* Evidences */}
                      {us.skill_evidences?.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Dovezi încărcate</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {us.skill_evidences.map(ev => {
                              const isImg = /\.(jpg|jpeg|png|webp|gif)$/i.test(ev.file_url ?? '')
                              const typeLabel = { certificate: 'Certificat', photo: 'Fotografie', video: 'Video', employer: 'Referință angajator' }
                              return (
                                <div key={ev.id} className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                                  <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                                    <span className="text-xs font-semibold text-gray-600">{typeLabel[ev.type] ?? ev.type}</span>
                                    <a href={ev.file_url} target="_blank" rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                                      <ExternalLink className="w-3 h-3" /> Deschide
                                    </a>
                                  </div>
                                  {isImg ? (
                                    <a href={ev.file_url} target="_blank" rel="noopener noreferrer">
                                      <img src={ev.file_url} alt={ev.type} className="w-full max-h-48 object-cover hover:opacity-90 transition cursor-zoom-in" />
                                    </a>
                                  ) : (
                                    <div className="flex items-center justify-center py-6">
                                      <FileText className="w-8 h-8 text-gray-400" />
                                    </div>
                                  )}
                                  {ev.description && (
                                    <p className="text-xs text-gray-500 px-3 py-2">{ev.description}</p>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                          <p className="text-xs text-yellow-700">Nicio dovadă încărcată de meșter.</p>
                        </div>
                      )}

                      {/* Rejection reason */}
                      {us.rejection_reason && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <p className="text-xs text-red-600 font-semibold mb-1">Motiv respingere anterior</p>
                          <p className="text-sm text-red-800">{us.rejection_reason}</p>
                        </div>
                      )}

                      {/* Actions */}
                      {isPending && (
                        <div className="space-y-3">
                          <textarea
                            value={rejectNote[us.id] ?? ''}
                            onChange={e => setRejectNote(prev => ({ ...prev, [us.id]: e.target.value }))}
                            placeholder="Motiv respingere (obligatoriu dacă respecți)..."
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          />
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleDecision(us.id, true)}
                              disabled={!!actionLoading}
                              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                            >
                              {actionLoading === us.id + 'a'
                                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                : <CheckCircle className="w-4 h-4" />}
                              Aprobă skill
                            </button>
                            <button
                              onClick={() => {
                                const note = (rejectNote[us.id] ?? '').trim()
                                if (!note) { showToast('Adaugă un motiv de respingere.', 'error'); return }
                                handleDecision(us.id, false, note)
                              }}
                              disabled={!!actionLoading}
                              className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                            >
                              {actionLoading === us.id + 'r'
                                ? <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                : <XCircle className="w-4 h-4" />}
                              Respinge
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── SupportTicketsSection ────────────────────────────────────────────────────

function SupportTicketsSection() {
  const [tickets,      setTickets]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterSev,    setFilterSev]    = useState('all')
  const [search,       setSearch]       = useState('')
  const [openId,       setOpenId]       = useState(null)
  const [response,     setResponse]     = useState({}) // ticketId → text
  const [newStatus,    setNewStatus]    = useState({}) // ticketId → status
  const [saving,       setSaving]       = useState(null)

  const SEVERITY_LABELS = { low: 'Scăzut', medium: 'Mediu', high: 'Ridicat', critical: 'Critic' }
  const SEVERITY_COLORS = { low: 'bg-gray-100 text-gray-600', medium: 'bg-yellow-100 text-yellow-700', high: 'bg-orange-100 text-orange-700', critical: 'bg-red-100 text-red-700' }
  const STATUS_LABELS   = { open: 'Deschis', in_progress: 'În lucru', resolved: 'Rezolvat', closed: 'Închis' }
  const STATUS_COLORS   = { open: 'bg-blue-100 text-blue-700', in_progress: 'bg-yellow-100 text-yellow-700', resolved: 'bg-green-100 text-green-700', closed: 'bg-gray-100 text-gray-500' }

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('support_tickets')
      .select('*, profiles!support_tickets_client_id_fkey(first_name, last_name, avatar_url)')
      .order('created_at', { ascending: false })
    setTickets(data ?? [])
    setLoading(false)
  }

  async function saveResponse(t) {
    setSaving(t.id)
    const resp = response[t.id] ?? ''
    const status = newStatus[t.id] ?? t.status
    const { error } = await supabase
      .from('support_tickets')
      .update({ admin_response: resp || null, status })
      .eq('id', t.id)
    setSaving(null)
    if (!error) {
      setTickets(prev => prev.map(x => x.id === t.id ? { ...x, admin_response: resp || null, status } : x))
      setOpenId(null)
    }
  }

  const filtered = tickets.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    if (filterSev    !== 'all' && t.severity !== filterSev)  return false
    if (search) {
      const q = search.toLowerCase()
      const name = `${t.profiles?.first_name ?? ''} ${t.profiles?.last_name ?? ''}`.toLowerCase()
      if (!t.title.toLowerCase().includes(q) && !name.includes(q) && !t.category.toLowerCase().includes(q)) return false
    }
    return true
  })

  const openCount     = tickets.filter(t => t.status === 'open').length
  const criticalCount = tickets.filter(t => t.severity === 'critical' && t.status === 'open').length

  return (
    <div className="p-6 space-y-6">
      {/* Header stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total tichete',  value: tickets.length,  color: 'text-gray-700' },
          { label: 'Deschise',       value: openCount,       color: 'text-blue-600' },
          { label: 'Critice deschise', value: criticalCount, color: 'text-red-600'  },
          { label: 'Rezolvate',      value: tickets.filter(t => t.status === 'resolved').length, color: 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Caută după titlu, client, categorie…"
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">Toate statusurile</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select value={filterSev} onChange={e => setFilterSev(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">Toate severitățile</option>
            {Object.entries(SEVERITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
            <RefreshCw className="w-4 h-4" /> Actualizează
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Niciun tichet găsit</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(t => {
            const clientName = `${t.profiles?.first_name ?? ''} ${t.profiles?.last_name ?? ''}`.trim() || 'Client necunoscut'
            const isOpen = openId === t.id
            return (
              <div key={t.id} className={`bg-white rounded-xl border overflow-hidden transition-all ${t.severity === 'critical' && t.status === 'open' ? 'border-red-200' : 'border-gray-100'}`}>
                {/* Row */}
                <button
                  onClick={() => {
                    setOpenId(isOpen ? null : t.id)
                    if (!isOpen) {
                      setResponse(p => ({ ...p, [t.id]: t.admin_response ?? '' }))
                      setNewStatus(p => ({ ...p, [t.id]: t.status }))
                    }
                  }}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition"
                >
                  {t.severity === 'critical' && t.status === 'open' && (
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-gray-800 text-sm">{t.title}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[t.status]}`}>{STATUS_LABELS[t.status]}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SEVERITY_COLORS[t.severity]}`}>{SEVERITY_LABELS[t.severity]}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="font-medium text-gray-600">{clientName}</span>
                      <span>{t.category}</span>
                      <span>{fmtDate(t.created_at)}</span>
                    </div>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                </button>

                {/* Expanded */}
                {isOpen && (
                  <div className="px-4 pb-5 border-t border-gray-100 pt-4 space-y-4">
                    <div>
                      <p className="text-xs font-bold text-gray-500 mb-1">Descriere client</p>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{t.description}</p>
                    </div>
                    {(t.booking_id || t.task_id) && (
                      <div className="flex gap-4 text-xs text-gray-500">
                        {t.booking_id && <span>Rezervare: <code className="bg-gray-100 px-1 rounded">{t.booking_id}</code></span>}
                        {t.task_id    && <span>Task: <code className="bg-gray-100 px-1 rounded">{t.task_id}</code></span>}
                      </div>
                    )}

                    {/* Admin response area */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Răspuns admin</label>
                      <textarea
                        value={response[t.id] ?? ''}
                        onChange={e => setResponse(p => ({ ...p, [t.id]: e.target.value }))}
                        placeholder="Scrie răspunsul pentru client…"
                        rows={4}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <select
                        value={newStatus[t.id] ?? t.status}
                        onChange={e => setNewStatus(p => ({ ...p, [t.id]: e.target.value }))}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                      <button
                        onClick={() => saveResponse(t)}
                        disabled={saving === t.id}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60"
                      >
                        {saving === t.id
                          ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          : <Send className="w-4 h-4" />}
                        Salvează & Trimite
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main AdminDashboard ───────────────────────────────────────────────────────

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState(
    () => new URLSearchParams(window.location.search).get('section') ?? 'overview'
  )
  const [disputeInitFilter, setDisputeInitFilter] = useState('open')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [adminName, setAdminName] = useState('')
  const [stats, setStats] = useState({
    clients: 0, handymen: 0, pending: 0, openDisputes: 0, pendingVerifs: 0, pendingSkills: 0, recentPending: []
  })
  const [adminId, setAdminId] = useState(null)
  const [adminNotifs, setAdminNotifs] = useState([])
  const [showAdminNotifs, setShowAdminNotifs] = useState(false)

  const adminUnread = adminNotifs.filter(n => !n.is_read).length

  const markAdminNotifRead = async (id) => {
    if (id === null) {
      setAdminNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
      if (adminId) await supabase.from('notifications').update({ is_read: true }).eq('user_id', adminId)
    } else {
      setAdminNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    }
  }

  const clearAdminNotifs = async () => {
    setAdminNotifs([])
    if (adminId) await supabase.from('notifications').delete().eq('user_id', adminId)
  }

  useEffect(() => {
    let channel
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setAdminId(user.id)
        const { data } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single()
        if (data) setAdminName(`${data.first_name ?? ''} ${data.last_name ?? ''}`.trim())

        // Load admin notifications
        const { data: notifData } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50)
        setAdminNotifs(notifData || [])

        // Realtime: new notifications for this admin
        channel = supabase
          .channel('admin-notifs-realtime')
          .on('postgres_changes', {
            event: 'INSERT', schema: 'public', table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          }, (payload) => {
            setAdminNotifs(prev => [payload.new, ...prev])
          })
          .subscribe()
      }

      // Get role IDs
      const { data: rolesData } = await supabase
        .from('roles')
        .select('id, name')
      const clientRoleId = rolesData?.find(r => r.name === 'client')?.id
      const handymanRoleId = rolesData?.find(r => r.name === 'handyman')?.id

      const [clientsRes, handymenRes, pendingRes, disputesRes, verifsRes, skillsRes, recentRes] = await Promise.all([
        clientRoleId
          ? supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role_id', clientRoleId)
          : Promise.resolve({ count: 0 }),
        handymanRoleId
          ? supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role_id', handymanRoleId)
          : Promise.resolve({ count: 0 }),
        supabase.from('handyman_profiles').select('*', { count: 'exact', head: true }).eq('is_verified', false).neq('status', 'rejected'),
        supabase.from('task_disputes').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('verifications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('user_skills').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('handyman_profiles')
          .select('user_id, profiles!inner(first_name, last_name)')
          .eq('is_verified', false)
          .neq('status', 'rejected')
          .limit(5),
      ])

      setStats({
        clients:       clientsRes.count ?? 0,
        handymen:      handymenRes.count ?? 0,
        pending:       pendingRes.count ?? 0,
        openDisputes:  disputesRes.count ?? 0,
        pendingVerifs: verifsRes.count ?? 0,
        pendingSkills: skillsRes.count ?? 0,
        recentPending: recentRes.data ?? [],
      })
    }
    init()
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/hc-portal')
  }

  const ActiveSection = () => {
    if (activeSection === 'overview')       return <OverviewSection stats={stats} />
    if (activeSection === 'certifications') return <CertificationsSection />
    if (activeSection === 'verifications')  return <VerificationsSection />
    if (activeSection === 'skills')         return <SkillCertificationsSection />
    if (activeSection === 'disputes')       return <DisputesSection key={disputeInitFilter} initialFilter={disputeInitFilter} />
    if (activeSection === 'financials')     return <DisputeFinancialsSection />
    if (activeSection === 'support')        return <SupportTicketsSection />
    if (activeSection === 'users')          return <UsersSection />
    if (activeSection === 'messages' && adminId) return (
      <div className="h-[calc(100vh-8rem)]">
        <MessagingUI
          userId={adminId}
          userRole="admin"
          backPath="/admin/dashboard"
          onTaskClick={() => setActiveSection('disputes')}
          onDisputeClick={() => setActiveSection('disputes')}
        />
      </div>
    )
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-64 bg-gray-950 flex flex-col
        transform transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="px-6 py-5 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">HandyConnect</p>
              <p className="text-gray-500 text-xs">Admin Panel</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveSection(item.id); setSidebarOpen(false) }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${activeSection === item.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Admin info + logout */}
        <div className="px-3 py-4 border-t border-gray-800">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {adminName ? adminName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{adminName || 'Administrator'}</p>
              <p className="text-gray-500 text-xs">Admin</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-gray-800 transition"
          >
            <LogOut className="w-4 h-4" /> Deconectare
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 h-16 flex items-center gap-4 sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-semibold text-gray-800">
              {NAV.find(n => n.id === activeSection)?.label}
            </h1>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            {stats.pending > 0 && activeSection !== 'certifications' && (
              <button
                onClick={() => setActiveSection('certifications')}
                className="flex items-center gap-1.5 bg-yellow-50 border border-yellow-200 text-yellow-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-yellow-100 transition"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                {stats.pending} profiluri
              </button>
            )}
            {stats.pendingVerifs > 0 && activeSection !== 'verifications' && (
              <button
                onClick={() => setActiveSection('verifications')}
                className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-orange-100 transition"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                {stats.pendingVerifs} documente
              </button>
            )}
            {stats.pendingSkills > 0 && activeSection !== 'skills' && (
              <button
                onClick={() => setActiveSection('skills')}
                className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-purple-100 transition"
              >
                <Award className="w-3.5 h-3.5" />
                {stats.pendingSkills} skilluri
              </button>
            )}
          </div>

          {/* Notification bell */}
          <button
            onClick={() => setShowAdminNotifs(true)}
            className="relative p-2 rounded-lg hover:bg-gray-100 transition"
            title="Notificări admin"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            {adminUnread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold px-1">
                {adminUnread > 9 ? '9+' : adminUnread}
              </span>
            )}
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 sm:px-6 py-6 max-w-6xl w-full mx-auto">
          <ActiveSection />
        </main>
      </div>

      {showAdminNotifs && (
        <AdminNotifPanel
          notifs={adminNotifs}
          onClose={() => setShowAdminNotifs(false)}
          onNavigate={(section, filter) => { setActiveSection(section); if (filter) setDisputeInitFilter(filter) }}
          onMarkRead={markAdminNotifRead}
          onClearAll={clearAdminNotifs}
        />
      )}
    </div>
  )
}
