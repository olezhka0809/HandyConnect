import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link, useLocation as useRouterLocation } from 'react-router-dom'
import { supabase } from '../supabase'
import DashboardNavbar from '../components/dashboard/DashboardNavbar'
import useLocation from '../hooks/useLocation'
import LocationBanner from '../components/LocationBanner'
import ClientTaskDetailModal from '../components/dashboard/client-dashboard/ClientTaskDetailModal'
import ClientRescheduleModal from '../components/dashboard/client-dashboard/ClientRescheduleModal'
import ClientBookingDetailModal from '../components/dashboard/client-dashboard/ClientBookingDetailModal'
import ReworkConfirmModal from '../components/dashboard/client-dashboard/ReworkConfirmModal'
import {
  Plus, Calendar, CheckCircle, Clock, DollarSign,
  Star, MessageSquare, Heart, Briefcase, Search, Bell,
  ArrowRight, MapPin, CalendarClock, TrendingDown,
  AlertCircle, ChevronRight, Loader2, XCircle, RefreshCw,
  DollarSign as MoneyIcon, ShieldAlert, Wrench, Scale, User,
  RotateCcw, Send, ChevronDown
} from 'lucide-react'

const TIME_SLOTS = [
  '07:00','07:30','08:00','08:30','09:00','09:30',
  '10:00','10:30','11:00','11:30','12:00','12:30',
  '13:00','13:30','14:00','14:30','15:00','15:30',
  '16:00','16:30','17:00','17:30','18:00','18:30','19:00',
]
const CD_TODAY_STR  = new Date().toISOString().split('T')[0]
const cdToMins      = t => { const [h, m] = t.split(':'); return parseInt(h) * 60 + parseInt(m) }
const cdAvailSlots  = (date) => {
  if (date !== CD_TODAY_STR) return TIME_SLOTS
  const nowMins = new Date().getHours() * 60 + new Date().getMinutes()
  return TIME_SLOTS.filter(t => cdToMins(t) > nowMins)
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLOR = {
  pending:     'bg-yellow-100 text-yellow-700',
  accepted:    'bg-blue-100 text-blue-700',
  confirmed:   'bg-blue-100 text-blue-700',
  in_progress: 'bg-purple-100 text-purple-700',
  delayed:     'bg-orange-100 text-orange-700',
  completed:        'bg-green-100 text-green-700',
  client_approved:  'bg-emerald-100 text-emerald-700',
  client_rejected:  'bg-rose-100 text-rose-700',
  cancelled:        'bg-red-100 text-red-700',
  open:        'bg-gray-100 text-gray-600',
  assigned:    'bg-blue-100 text-blue-700',
  // Dispute / rework statuses
  under_admin_review:  'bg-purple-100 text-purple-700',
  rework_in_progress:  'bg-orange-100 text-orange-700',
  rework_completed:    'bg-green-100 text-green-700',
  rework_marketplace:  'bg-sky-100 text-sky-700',
  reassign_rework:     'bg-sky-100 text-sky-700',
  refund_full:         'bg-teal-100 text-teal-700',
  refund_partial:      'bg-teal-100 text-teal-700',
  forced_accepted:     'bg-gray-100 text-gray-600',
}
const STATUS_LABEL = {
  pending:     'În așteptare',
  accepted:    'Acceptat',
  confirmed:   'Confirmat',
  in_progress: 'În progres',
  delayed:     'Întârziat',
  completed:        'Finalizat',
  client_approved:  'Acceptat de client',
  client_rejected:  'Respins de client',
  cancelled:        'Anulat',
  open:        'Deschis',
  assigned:    'Alocat',
  // Dispute / rework statuses
  under_admin_review:  'La administrator',
  rework_in_progress:  'Relucrare în desfășurare',
  rework_completed:    'Relucrare finalizată',
  rework_marketplace:  'Relucrare în așteptare',
  reassign_rework:     'Relucrare postată',
  refund_full:         'Rambursare integrală',
  refund_partial:      'Rambursare parțială',
  forced_accepted:     'Acceptat de admin',
}

function fmtDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtDateLong(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ro-RO', { weekday: 'short', day: '2-digit', month: 'long' })
}
function fmtPrice(p) {
  if (!p) return '0 RON'
  return `${Number(p).toLocaleString('ro-RO')} RON`
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

// ─── RescheduleBadge — red indicator ─────────────────────────────────────────

function RescheduleBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200 animate-pulse">
      <CalendarClock className="w-3 h-3" /> Reprogramare
    </span>
  )
}

// ─── RescheduleCard ───────────────────────────────────────────────────────────
function RescheduleCard({ req, jobTitle, onUpdated }) {
  const isOutgoing = req.status === 'pending_handyman'
  const [mode,        setMode]        = useState('review') // 'review' | 'counter'
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState(null)
  const [counterDate, setCounterDate] = useState('')
  const [counterTime, setCounterTime] = useState('')
  const [counterMsg,  setCounterMsg]  = useState('')

  const fmtLong = (d) => d ? new Date(d).toLocaleDateString('ro-RO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : '—'

  const handleAccept = async () => {
    setSaving(true); setError(null)
    try {
      await supabase.from('reschedule_requests')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .eq('id', req.id)
      const table = req.job_type === 'booking' ? 'bookings' : 'tasks'
      await supabase.from(table).update({
        scheduled_date: req.proposed_date,
        scheduled_time: req.proposed_time,
        updated_at: new Date().toISOString(),
      }).eq('id', req.job_id)
      if (req.handyman_id) {
        await supabase.from('notifications').insert({
          user_id: req.handyman_id,
          type: 'task_accepted',
          title: 'Reprogramare acceptată!',
          body: `Clientul a acceptat reprogramarea pentru ${fmtLong(req.proposed_date)} la ${req.proposed_time}.`,
          data: { job_id: req.job_id, job_type: req.job_type, redirect: '/handyman/jobs?tab=reschedule' },
        })
      }
      onUpdated?.()
    } catch (e) { setError('Eroare: ' + (e.message ?? '')) }
    finally { setSaving(false) }
  }

  const handleReject = async () => {
    setSaving(true); setError(null)
    try {
      await supabase.from('reschedule_requests')
        .update({ status: 'rejected', responded_at: new Date().toISOString() })
        .eq('id', req.id)
      if (req.handyman_id) {
        await supabase.from('notifications').insert({
          user_id: req.handyman_id,
          type: 'new_offer',
          title: 'Reprogramare refuzată',
          body: `Clientul a refuzat reprogramarea propusă pentru ${fmtLong(req.proposed_date)}.`,
          data: { job_id: req.job_id, job_type: req.job_type, redirect: '/handyman/jobs' },
        })
      }
      onUpdated?.()
    } catch (e) { setError('Eroare: ' + (e.message ?? '')) }
    finally { setSaving(false) }
  }

  const handleCounter = async () => {
    if (!counterDate || !counterTime) { setError('Selectează data și ora.'); return }
    setSaving(true); setError(null)
    try {
      await supabase.from('reschedule_requests')
        .update({ status: 'rejected', responded_at: new Date().toISOString() })
        .eq('id', req.id)
      await supabase.from('reschedule_requests').insert({
        job_id: req.job_id, job_type: req.job_type,
        handyman_id: req.handyman_id, client_id: req.client_id,
        proposed_date: counterDate, proposed_time: counterTime,
        message: counterMsg || null,
        status: 'pending_handyman',
        created_at: new Date().toISOString(),
      })
      if (req.handyman_id) {
        await supabase.from('notifications').insert({
          user_id: req.handyman_id,
          type: 'new_offer',
          title: 'Contra-propunere de reprogramare',
          body: `Clientul propune o dată alternativă: ${counterDate} la ${counterTime}.`,
          data: { job_id: req.job_id, job_type: req.job_type, redirect: '/handyman/jobs' },
        })
      }
      onUpdated?.()
    } catch (e) { setError('Eroare: ' + (e.message ?? '')) }
    finally { setSaving(false) }
  }

  const handleCancel = async () => {
    setSaving(true)
    try {
      await supabase.from('reschedule_requests')
        .update({ status: 'rejected', responded_at: new Date().toISOString() })
        .eq('id', req.id)
      onUpdated?.()
    } catch (e) { setError('Eroare: ' + (e.message ?? '')) }
    finally { setSaving(false) }
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-red-200 shadow-sm p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CalendarClock className="w-4 h-4 text-red-600"/>
            <span className="text-xs font-bold text-red-600 uppercase tracking-wide">
              {isOutgoing ? 'Cererea ta de reprogramare' : 'Reprogramare propusă'}
            </span>
          </div>
          <p className="font-bold text-gray-800">{jobTitle}</p>
          <p className="text-xs text-gray-400 mt-0.5">Cerere trimisă: {fmtDate(req.created_at)}</p>
        </div>
        <RescheduleBadge/>
      </div>

      {/* Data propusă */}
      <div className="bg-red-50 border border-red-100 rounded-xl p-4">
        <p className="text-xs font-bold text-red-500 uppercase tracking-wide mb-2">
          {isOutgoing ? 'Propunerea trimisă de tine' : 'Propunerea handymanului'}
        </p>
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-red-500 flex-shrink-0"/>
          <div>
            <p className="font-bold text-gray-800">{fmtLong(req.proposed_date)}</p>
            <p className="text-sm text-red-700 font-medium">Ora {req.proposed_time}</p>
          </div>
        </div>
        {req.message && (
          <div className="mt-3 pt-3 border-t border-red-200">
            <p className="text-xs text-red-500 mb-1">Motiv:</p>
            <p className="text-sm text-gray-700 italic">"{req.message}"</p>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      {/* Contra-propunere expandabilă */}
      {!isOutgoing && mode === 'counter' && (
        <div className="space-y-3 border border-blue-100 rounded-xl p-4 bg-blue-50">
          <p className="text-sm font-bold text-blue-700">Propune o altă dată</p>
          <input type="date" value={counterDate}
            onChange={e => {
              const d = e.target.value
              setCounterDate(d)
              if (d === CD_TODAY_STR && counterTime && cdToMins(counterTime) <= new Date().getHours() * 60 + new Date().getMinutes()) setCounterTime('')
            }}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"/>
          <div className="grid grid-cols-4 gap-2">
            {cdAvailSlots(counterDate).map(t => (
              <button key={t} type="button" onClick={() => setCounterTime(t)}
                className={`py-2 rounded-xl text-xs font-medium border transition-all
                  ${counterTime === t ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 bg-white text-gray-600 hover:border-blue-400'}`}>
                {t}
              </button>
            ))}
          </div>
          <textarea value={counterMsg} onChange={e => setCounterMsg(e.target.value)} rows={2}
            placeholder="Mesaj opțional..."
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm bg-white"/>
          <div className="flex gap-2">
            <button onClick={() => setMode('review')}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-white transition">
              Înapoi
            </button>
            <button onClick={handleCounter} disabled={saving || !counterDate || !counterTime}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <CalendarClock className="w-4 h-4"/>}
              Trimite contra-propunerea
            </button>
          </div>
        </div>
      )}

      {/* Butoane acțiuni */}
      {isOutgoing ? (
        <div className="flex gap-2">
          <div className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-100 text-gray-500 rounded-xl text-sm font-medium">
            <Clock className="w-4 h-4"/> În așteptarea handyman-ului
          </div>
          <button onClick={handleCancel} disabled={saving}
            className="px-4 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Anulează'}
          </button>
        </div>
      ) : mode === 'review' ? (
        <div className="space-y-2">
          <button onClick={handleAccept} disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle className="w-4 h-4"/>}
            Acceptă — {fmtLong(req.proposed_date)}, {req.proposed_time}
          </button>
          <div className="flex gap-2">
            <button onClick={() => { setMode('counter'); setError(null) }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-blue-300 text-blue-600 bg-blue-50 rounded-xl text-sm font-medium hover:bg-blue-100 transition">
              <RefreshCw className="w-4 h-4"/> Propune altă dată
            </button>
            <button onClick={handleReject} disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition disabled:opacity-60">
              <XCircle className="w-4 h-4"/> Refuză
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

// ─── OffersBadge ─────────────────────────────────────────────────────────────

function OffersBadge({ count }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200">
      <TrendingDown className="w-3 h-3" /> {count} {count === 1 ? 'ofertă' : 'oferte'}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function ClientDashboard() {
  const navigate = useNavigate()
  const [currentUserId, setCurrentUserId]   = useState(null)
  const [profile,       setProfile]         = useState(null)
  const [stats,         setStats]           = useState(null)
  const [bookings,      setBookings]        = useState([])
  const [tasks,         setTasks]           = useState([])
  const [favorites,     setFavorites]       = useState([])
  const [recentActivity,setRecentActivity]  = useState([])
  const routerLocation = useRouterLocation()
  const _initSearch = new URLSearchParams(routerLocation.search)
  const [tab,           setTab]             = useState(_initSearch.get('tab') || routerLocation.state?.tab || 'overview')
  const [offersSubtab,  setOffersSubtab]    = useState(routerLocation.state?.offersSubtab || 'price')
  const [loading,       setLoading]         = useState(true)

  useEffect(() => {
    const sp = new URLSearchParams(routerLocation.search)
    const tabFromUrl = sp.get('tab')
    if (tabFromUrl)                          setTab(tabFromUrl)
    else if (routerLocation.state?.tab)      setTab(routerLocation.state.tab)
    if (routerLocation.state?.offersSubtab)  setOffersSubtab(routerLocation.state.offersSubtab)
    if (routerLocation.state?.filter)        setTaskStatusFilter(routerLocation.state.filter)
    if (routerLocation.state?.bookingFilter) setBookingStatusFilter(routerLocation.state.bookingFilter)
  }, [routerLocation.search, routerLocation.state])

  const [detailTaskId,    setDetailTaskId]    = useState(null)
  const [detailBookingId, setDetailBookingId] = useState(null)

  // Booking tab filters
  const [bookingStatusFilter, setBookingStatusFilter] = useState(routerLocation.state?.bookingFilter || 'all')
  const [bookingCategoryFilter, setBookingCategoryFilter] = useState('all')
  const [bookingUrgencyFilter, setBookingUrgencyFilter] = useState('all')
  const [bookingSortBy, setBookingSortBy] = useState('newest')
  const [allCategoryNames, setAllCategoryNames] = useState([])

  // Task tab filters
  const [taskStatusFilter, setTaskStatusFilter] = useState(routerLocation.state?.filter || 'all')
  const [taskCategoryFilter, setTaskCategoryFilter] = useState('all')
  const [taskUrgencyFilter, setTaskUrgencyFilter] = useState('all')
  const [taskOffersFilter, setTaskOffersFilter] = useState('all')
  const [taskSortBy, setTaskSortBy] = useState('newest')

  // Reschedule requests pending for this client
  const [rescheduleRequests, setRescheduleRequests] = useState([])
  const [rescheduleModal,    setRescheduleModal]    = useState(null) // { request, jobTitle }

  // Disputes for this client
  const [disputes,            setDisputes]            = useState([])
  const [disputeStatusFilter, setDisputeStatusFilter] = useState('all')
  const [reworkConfirmDispute, setReworkConfirmDispute] = useState(null) // dispute obj pentru mini-modal

  // Negotiations (price offers from handymen on client's tasks/bookings)
  const [negotiations, setNegotiations] = useState([])
  const [negLoading,   setNegLoading]   = useState(false)
  const [acceptedOffer, setAcceptedOffer] = useState(null) // { handymanName, price, taskTitle }
  // Rework scheduling proposals (from handymen, date/time negotiation)
  const [reworkProposals, setReworkProposals] = useState([])

  // Track which offer IDs have been seen (persisted per-user in localStorage)
  const [seenOfferIds, setSeenOfferIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('seen_offer_ids') || '[]') } catch { return [] }
  })

  // Mark all current offers as seen when the offers tab is viewed
  useEffect(() => {
    if (tab === 'offers' && negotiations.length > 0) {
      const ids = negotiations.map(n => n.id)
      setSeenOfferIds(prev => {
        const merged = [...new Set([...prev, ...ids])]
        localStorage.setItem('seen_offer_ids', JSON.stringify(merged))
        return merged
      })
    }
  }, [tab, negotiations])

  const { location, error: locationError } = useLocation(currentUserId)

  // ── load ────────────────────────────────────────────────────────────────────
  const loadDashboardData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/login'); return }
    setCurrentUserId(user.id)

    const [
      profileRes, statsRes, bookingsRes, tasksRes, favsRes, reschedRes, categoriesRes, disputesRes
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('client_dashboard_stats').select('*').eq('client_id', user.id).single(),
      supabase.from('bookings').select('*, handyman:handyman_id(first_name,last_name,avatar_url), service:service_id(title,base_price,categories(name))')
        .eq('client_id', user.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('tasks').select('*, handyman:handyman_id(first_name,last_name,avatar_url), category:category_id(name)')
        .eq('client_id', user.id).eq('is_archived', false).order('created_at', { ascending: false }).limit(100),
      supabase.from('favorite_handymen').select('*, handyman:handyman_id(first_name,last_name,avatar_url,city,handyman_profiles!inner(rating_avg,total_jobs_completed,specialties))')
        .eq('client_id', user.id),
      // Reschedule requests pending for this client (both directions)
      supabase.from('reschedule_requests').select('*').eq('client_id', user.id).in('status', ['pending', 'pending_client', 'pending_handyman']),
      supabase.from('categories').select('name').eq('is_active', true).order('name'),
      // All disputes opened by this client (all statuses, filtered client-side)
      supabase.from('task_disputes')
        .select(`id, status, created_at, details, rework_deadline, client_rework_confirmed_at,
          handyman_response, handyman_response_at, admin_decision, timeline,
          task:task_id(id, title, status, final_price, is_rework, rework_level),
          handyman:handyman_id(first_name, last_name, avatar_url),
          rejection_reasons!reason_id(name)`)
        .eq('client_id', user.id)
        .order('created_at', { ascending: false }),
    ])

    const tksData = tasksRes.data ?? []
    const taskIds = tksData.map(t => t.id)

    // task_offers: offers from handymen on client tasks (pending or negotiating)
    let taskOffersData = []
    let reworkProposalsData = []
    if (taskIds.length > 0) {
      const [toRes, rwpRes] = await Promise.all([
        supabase.from('task_offers')
          .select('*, handyman:handyman_id(first_name,last_name,avatar_url,city,average_rating)')
          .in('task_id', taskIds)
          .in('status', ['pending', 'negotiating'])
          .order('created_at', { ascending: false }),
        supabase.from('rework_proposals')
          .select('*, handyman:handyman_id(id,first_name,last_name,avatar_url,city), task:task_id(id,title,budget,is_rework)')
          .in('task_id', taskIds)
          .in('status', ['pending', 'accepted', 'declined'])
          .order('updated_at', { ascending: false }),
      ])
      // Deduplicate task_offers: one row per (task_id + handyman_id) — keep the LATEST
      const seen = new Set()
      taskOffersData = (toRes.data ?? []).filter(row => {
        const key = `${row.task_id}:${row.handyman_id}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      reworkProposalsData = rwpRes.data ?? []
    }

    setProfile(profileRes.data)
    setStats(statsRes.data)
    setBookings(bookingsRes.data ?? [])
    setTasks(tksData)
    setFavorites(favsRes.data ?? [])
    setRescheduleRequests(reschedRes.data ?? [])
    setDisputes(disputesRes.data ?? [])
    setNegotiations(taskOffersData)
    setReworkProposals(reworkProposalsData)
    setAllCategoryNames((categoriesRes.data ?? []).map(c => c.name).filter(Boolean))

    // Activity feed
    const bks = bookingsRes.data ?? []
    const tks = tasksRes.data ?? []
    const activity = [
      ...bks.slice(0,3).map(b => ({ type:'booking', title:b.service?.title||'Rezervare', status:b.status, date:b.created_at, handyman:b.handyman?`${b.handyman.first_name} ${b.handyman.last_name}`:null, total:b.total })),
      ...tks.slice(0,3).map(t => ({ type:'task',    title:t.title,                       status:t.status, date:t.created_at, handyman:t.handyman?`${t.handyman.first_name} ${t.handyman.last_name}`:null, category:t.category?.name, price:t.final_price })),
    ].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0,5)
    setRecentActivity(activity)

    setLoading(false)
  }, [navigate])

  useEffect(() => { loadDashboardData() }, [loadDashboardData])

  // ── helpers ─────────────────────────────────────────────────────────────────

  // Check if a booking/task has a pending reschedule request
  const getRescheduleForJob = (jobId) =>
    rescheduleRequests.find(r => r.job_id === jobId) ?? null

  // Count offers for a given task
  const getOffersForTask = (taskId) =>
    negotiations.filter(n => n.task_id === taskId)

  // Build job title from task id for reschedule modal
  const getJobTitle = (request) => {
    if (request.job_type === 'task') {
      const t = tasks.find(t => t.id === request.job_id)
      return t?.title ?? `Task #${request.job_id.slice(0,6)}`
    }
    const b = bookings.find(b => b.id === request.job_id)
    return b?.service?.title ?? `Rezervare #${request.job_id.slice(0,6)}`
  }

  const removeFavorite = async (handymanId) => {
    await supabase.from('favorite_handymen').delete().eq('client_id', profile.id).eq('handyman_id', handymanId)
    setFavorites(prev => prev.filter(f => f.handyman_id !== handymanId))
    setStats(prev => prev ? { ...prev, favorite_count: prev.favorite_count - 1 } : prev)
  }

  // ── negotiate actions ────────────────────────────────────────────────────────

  const handleAcceptOffer = async (neg) => {
    setNegLoading(true)
    try {
      await supabase.from('task_offers').update({ status: 'accepted' }).eq('id', neg.id)
      // Reject ALL other offers on this task regardless of status
      await supabase.from('task_offers').update({ status: 'rejected' })
        .eq('task_id', neg.task_id).neq('id', neg.id)
      await supabase.from('tasks').update({
        handyman_id: neg.handyman_id,
        status: 'assigned',
        final_price: neg.proposed_price,
        scheduled_date: neg.available_date ?? null,
        scheduled_time: neg.available_time ?? null,
        updated_at: new Date().toISOString(),
      }).eq('id', neg.task_id)
      // Show success modal before reloading
      const handymanName = neg.handyman
        ? `${neg.handyman.first_name ?? ''} ${neg.handyman.last_name ?? ''}`.trim()
        : 'Handyman'
      const taskTitle = tasks.find(t => t.id === neg.task_id)?.title ?? 'Task'
      setAcceptedOffer({ handymanName, price: neg.proposed_price, taskTitle })

      await supabase.from('notifications').insert({
        user_id: neg.handyman_id,
        type: 'task_accepted',
        title: 'Oferta ta a fost acceptată!',
        body: `Clientul a acceptat oferta ta de ${neg.proposed_price} RON pentru „${taskTitle}"`,
        data: { task_id: neg.task_id },
      })

      // Creare conversație automată dacă nu există deja
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('client_id', currentUserId)
        .eq('handyman_id', neg.handyman_id)
        .eq('task_id', neg.task_id)
        .maybeSingle()
      if (!existingConv) {
        await supabase.from('conversations').insert({
          client_id:   currentUserId,
          handyman_id: neg.handyman_id,
          task_id:     neg.task_id,
        })
      }

      await loadDashboardData()
    } finally { setNegLoading(false) }
  }

  const handleRejectOffer = async (neg) => {
    await supabase.from('task_offers').update({ status: 'rejected' }).eq('id', neg.id)
    setNegotiations(prev => prev.filter(n => n.id !== neg.id))

    const taskTitle = tasks.find(t => t.id === neg.task_id)?.title ?? 'Task'
    await supabase.from('notifications').insert({
      user_id: neg.handyman_id,
      type: 'cancellation',
      title: 'Oferta ta a fost refuzată',
      body: `Clientul a refuzat oferta ta pentru „${taskTitle}"`,
      data: { task_id: neg.task_id },
    })
  }

  const handleApproveTask = async (task) => {
    // Optimistic update — task disappears from 'completed' filter immediately
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'client_approved' } : t))
    await supabase.from('tasks').update({ status: 'client_approved', updated_at: new Date().toISOString() }).eq('id', task.id)
    await supabase.from('conversations').update({ is_closed: true }).eq('task_id', task.id)
    if (task.handyman_id) {
      // Increment completed jobs counter (also handled by DB trigger as primary source)
      const { data: hp } = await supabase.from('handyman_profiles').select('total_jobs_completed').eq('user_id', task.handyman_id).maybeSingle()
      if (hp) {
        await supabase.from('handyman_profiles')
          .update({ total_jobs_completed: (hp.total_jobs_completed ?? 0) + 1 })
          .eq('user_id', task.handyman_id)
      }
      await supabase.from('notifications').insert({
        user_id: task.handyman_id,
        type: 'task_accepted',
        title: 'Lucrare acceptată!',
        body: `Clientul a confirmat finalizarea lucrării „${task.title}". Bravo!`,
        data: { task_id: task.id, redirect: '/handyman/jobs' },
      })
    }
    await loadDashboardData()
  }

  const handleRejectTask = async (task) => {
    // Optimistic update — task disappears from 'completed' filter immediately
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'client_rejected' } : t))
    await supabase.from('tasks').update({ status: 'client_rejected', updated_at: new Date().toISOString() }).eq('id', task.id)
    await supabase.from('conversations').update({ is_closed: true }).eq('task_id', task.id)
    if (task.handyman_id) {
      await supabase.from('notifications').insert({
        user_id: task.handyman_id,
        type: 'cancellation',
        title: 'Lucrare contestată',
        body: `Clientul nu a acceptat finalizarea lucrării „${task.title}". Te rugăm să îl contactezi.`,
        data: { task_id: task.id, redirect: '/handyman/jobs' },
      })
    }
    await loadDashboardData()
  }

  const handleCounterOffer = async (neg, counterPrice, msg, date, time) => {
    // Mark current handyman offer as negotiating
    await supabase.from('task_offers').update({ status: 'negotiating' }).eq('id', neg.id)
    // Insert client's counter-offer with sent_by: 'client'
    // Inherit estimated_duration, available_date, available_time from original offer if not changed
    await supabase.from('task_offers').insert({
      task_id:            neg.task_id,
      handyman_id:        neg.handyman_id,
      proposed_price:     Number(counterPrice),
      message:            msg || null,
      status:             'pending',
      sent_by:            'client',
      estimated_duration: neg.estimated_duration || null,
      available_date:     date || neg.available_date || null,
      available_time:     time || neg.available_time || null,
      created_at:         new Date().toISOString(),
      updated_at:         new Date().toISOString(),
    })
    const taskTitle = tasks.find(t => t.id === neg.task_id)?.title ?? 'Task'
    await supabase.from('notifications').insert({
      user_id: neg.handyman_id,
      type: 'offer_counter',
      title: 'Contra-ofertă primită',
      body: `Clientul a propus ${counterPrice} RON pentru „${taskTitle}"`,
      data: { task_id: neg.task_id },
    })
    await loadDashboardData()
  }

  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!profile) return null

  // Group task_offers by task_id — one entry per handyman (already deduped at fetch level)
  const negsByJob = negotiations.reduce((acc, n) => {
    const key = n.task_id
    if (!acc[key]) acc[key] = []
    // Guard: skip if same handyman already in list for this task
    if (!acc[key].some(x => x.handyman_id === n.handyman_id)) {
      acc[key].push(n)
    }
    return acc
  }, {})

  const pendingRescheduleCount = rescheduleRequests.length
  const pendingOffersCount     = negotiations.filter(n => !seenOfferIds.includes(n.id)).length
  const pendingDisputesCount   = disputes.filter(d => d.task?.status === 'awaiting_client_rework_choice').length

  const totalSpent =
    bookings.filter(b => ['completed','client_approved'].includes(b.status)).reduce((sum, b) => sum + (Number(b.total) || 0), 0) +
    tasks.filter(t => ['completed','client_approved'].includes(t.status)).reduce((sum, t) => sum + (Number(t.final_price) || 0), 0)

  const taskCategoryOptions = [...new Set(tasks.map(t => t.category?.name).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ro'))
  const bookingCategoryOptions = [...new Set([
    ...allCategoryNames,
    ...bookings.map(b => b.service?.categories?.name).filter(Boolean),
  ])].sort((a, b) => a.localeCompare(b, 'ro'))

  const filteredBookings = bookings
    .filter(b => {
      const isAwaiting = ['pending'].includes(b.status)
      const isActive = ['accepted', 'confirmed', 'assigned', 'in_progress', 'delayed'].includes(b.status)

      if (bookingStatusFilter === 'awaiting'        && !isAwaiting) return false
      if (bookingStatusFilter === 'active'          && !isActive) return false
      if (bookingStatusFilter === 'completed'       && b.status !== 'completed') return false
      if (bookingStatusFilter === 'client_approved' && b.status !== 'client_approved') return false
      if (bookingStatusFilter === 'client_rejected' && b.status !== 'client_rejected') return false
      if (bookingStatusFilter === 'cancelled'       && b.status !== 'cancelled') return false
      if (bookingStatusFilter === 'all' && ['client_approved', 'client_rejected'].includes(b.status)) return false

      if (bookingCategoryFilter !== 'all' && (b.service?.categories?.name ?? '') !== bookingCategoryFilter) return false
      if (bookingUrgencyFilter !== 'all' && (b.urgency ?? 'normal') !== bookingUrgencyFilter) return false

      return true
    })
    .sort((a, b) => {
      if (bookingSortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at)
      if (bookingSortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at)
      if (bookingSortBy === 'budget_high') return (Number(b.total) || 0) - (Number(a.total) || 0)
      if (bookingSortBy === 'budget_low') return (Number(a.total) || 0) - (Number(b.total) || 0)

      const rank = {
        delayed: 0,
        in_progress: 1,
        assigned: 2,
        confirmed: 2,
        accepted: 2,
        pending: 3,
        completed: 4,
        client_approved: 5,
        client_rejected: 6,
        cancelled: 7,
      }
      return (rank[a.status] ?? 9) - (rank[b.status] ?? 9)
    })

  const filteredTasks = tasks
    .filter(t => {
      const offersCount = getOffersForTask(t.id).length
      const isAwaiting = t.status === 'open' || t.status === 'pending'
      const isActive = ['assigned', 'accepted', 'confirmed', 'in_progress', 'delayed'].includes(t.status)
      const REWORK_STATUSES = ['rework_pending','rework_accepted','rework_in_progress','rework_completed','rework_scheduled']
      const isRework = t.is_rework === true || REWORK_STATUSES.includes(t.status)

      if (taskStatusFilter === 'awaiting' && !isAwaiting) return false
      if (taskStatusFilter === 'active' && !isActive) return false
      if (taskStatusFilter === 'completed' && t.status !== 'completed') return false
      if (taskStatusFilter === 'client_approved' && t.status !== 'client_approved') return false
      if (taskStatusFilter === 'client_rejected' && t.status !== 'client_rejected') return false
      if (taskStatusFilter === 'cancelled' && t.status !== 'cancelled') return false
      if (taskStatusFilter === 'rework' && !isRework) return false
      // Hide approved/rejected from "all" default view to avoid clutter — they have their own filters
      if (taskStatusFilter === 'all' && (t.status === 'client_approved' || t.status === 'client_rejected')) return false

      if (taskCategoryFilter !== 'all' && (t.category?.name ?? '') !== taskCategoryFilter) return false
      if (taskUrgencyFilter !== 'all' && (t.urgency ?? 'normal') !== taskUrgencyFilter) return false
      if (taskOffersFilter === 'with_offers' && offersCount === 0) return false
      if (taskOffersFilter === 'without_offers' && offersCount > 0) return false

      return true
    })
    .sort((a, b) => {
      if (taskSortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at)
      if (taskSortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at)
      if (taskSortBy === 'budget_high') return (Number(b.budget) || 0) - (Number(a.budget) || 0)
      if (taskSortBy === 'budget_low') return (Number(a.budget) || 0) - (Number(b.budget) || 0)

      // status priority
      const rank = { delayed: 0, in_progress: 1, assigned: 2, open: 3, pending: 3, completed: 4, cancelled: 5 }
      return (rank[a.status] ?? 9) - (rank[b.status] ?? 9)
    })

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavbar />
      <LocationBanner location={location} error={locationError} onRetry={() => window.location.reload()} />

      <div className="max-w-7xl mx-auto px-4 py-8">


                {/* ── HEADER ── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Bine ai revenit{profile.first_name ? `, ${profile.first_name}` : ''}! 👋
            </h1>
            <p className="text-gray-500 mt-1">Iată un rezumat al activității tale pe HandyConnect</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/post-task" className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition">
              <Plus className="w-4 h-4" /> Postează Task
            </Link>
          </div>
        </div>

        {/* ── STATS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label:'Rezervări Active', value:stats?.active_bookings||0,                                    Icon:Calendar,  color:'bg-blue-100 text-blue-600' },
            { label:'Finalizate',       value:(stats?.completed_bookings||0)+(stats?.completed_tasks||0),  Icon:CheckCircle,color:'bg-green-100 text-green-600' },
            { label:'Total Cheltuit',   value:fmtPrice(totalSpent),                                         Icon:DollarSign,color:'bg-purple-100 text-purple-600' },
            { label:'Favoriți',         value:stats?.favorite_count||0,                                     Icon:Heart,     color:'bg-red-100 text-red-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-500">{s.label}</p>
                <div className={`w-10 h-10 ${s.color} rounded-lg flex items-center justify-center`}>
                  <s.Icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-800">{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── TABS ── */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { id:'overview',   label:'Prezentare generală' },
            { id:'bookings',   label:'Rezervări' },
            { id:'tasks',      label:'Taskuri' },
            { id:'favorites',  label:'Favoriți' },
            { id:'offers',     label:'Oferte',       badge: pendingOffersCount },
            { id:'reschedule', label:'Reprogramări',  badge: pendingRescheduleCount, badgeColor:'red' },
            { id:'disputes',   label:'Dispute',       badge: pendingDisputesCount,   badgeColor:'red' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`relative px-4 py-2 rounded-lg text-sm font-medium transition
                ${tab===t.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
              {t.label}
              {t.badge > 0 && (
                <span className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-white text-[10px] font-black flex items-center justify-center
                  ${t.badgeColor === 'red' ? 'bg-red-500' : 'bg-orange-500'}`}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════
            TAB: OVERVIEW
        ══════════════════════════════════════════════════════ */}
        {tab === 'overview' && (
          <div className="grid lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 space-y-4">

              {/* Bookings */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-800">Rezervări Recente</h3>
                  <button onClick={() => setTab('bookings')} className="text-sm text-blue-600 font-medium hover:underline">Vezi toate</button>
                </div>
                {bookings.length > 0 ? (
                  <div className="divide-y divide-gray-50">
                    {bookings.slice(0,4).map(b => {
                      const resched = getRescheduleForJob(b.id)
                      return (
                        <div key={b.id} className="p-4 hover:bg-gray-50 transition cursor-pointer" onClick={() => setDetailBookingId(b.id)}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
                                {b.handyman ? `${b.handyman.first_name?.[0]||''}${b.handyman.last_name?.[0]||''}` : '?'}
                              </div>
                              <div>
                                <p className="font-medium text-gray-800 text-sm">{b.service?.title||'Rezervare'}</p>
                                <p className="text-xs text-gray-500">{b.handyman?`${b.handyman.first_name} ${b.handyman.last_name}`:'Nealocat'}</p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <StatusBadge status={b.status}/>
                              <p className="text-sm font-bold text-gray-800">{fmtPrice(b.total)}</p>
                            </div>
                          </div>
                          {resched && (
                            <button onClick={() => setRescheduleModal({ request: resched, jobTitle: b.service?.title||'Rezervare' })}
                              className="mt-2 flex items-center gap-1.5">
                              <RescheduleBadge/>
                              <span className="text-xs text-red-600">→ {fmtDateLong(resched.proposed_date)} {resched.proposed_time}</span>
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3"/>
                    <p className="text-gray-500 text-sm">Nicio rezervare încă</p>
                    <Link to="/find-services" className="text-sm text-blue-600 font-medium hover:underline mt-2 inline-block">Caută servicii</Link>
                  </div>
                )}
              </div>

              {/* Tasks */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-800">Taskurile Tale</h3>
                  <button onClick={() => setTab('tasks')} className="text-sm text-blue-600 font-medium hover:underline">Vezi toate</button>
                </div>
                {tasks.length > 0 ? (
                  <div className="divide-y divide-gray-50">
                    {tasks.slice(0,4).map(t => {
                      const offers  = getOffersForTask(t.id)
                      const resched = getRescheduleForJob(t.id)
                      return (
                        <div key={t.id} className="p-4 hover:bg-gray-50 transition cursor-pointer" onClick={() => setDetailTaskId(t.id)}>
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-gray-800 text-sm">{t.title}</p>
                            <div className="flex items-center gap-2">
                              {t.final_price && !['open','pending'].includes(t.status) && (
                                <span className="text-sm font-bold text-green-700">{fmtPrice(t.final_price)}</span>
                              )}
                              <StatusBadge status={t.status}/>
                            </div>
                          </div>
                          <p className="text-xs text-gray-400 mb-2">{t.category?.name||'Necategorizat'} · {fmtDate(t.created_at)}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {offers.length > 0 && (
                              <button onClick={e => { e.stopPropagation(); setTab('offers') }}>
                                <OffersBadge count={offers.length}/>
                              </button>
                            )}
                            {resched && (
                              <button onClick={e => { e.stopPropagation(); setRescheduleModal({ request: resched, jobTitle: t.title }) }}>
                                <RescheduleBadge/>
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <Briefcase className="w-10 h-10 text-gray-300 mx-auto mb-3"/>
                    <p className="text-gray-500 text-sm">Niciun task postat</p>
                    <Link to="/post-task" className="text-sm text-blue-600 font-medium hover:underline mt-2 inline-block">Postează un task</Link>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-2 space-y-4">
              {/* Activity */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="p-5 border-b border-gray-100"><h3 className="font-bold text-gray-800">Activitate Recentă</h3></div>
                <div className="p-5 space-y-4">
                  {recentActivity.length > 0 ? recentActivity.map((item,i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${item.type==='booking'?'bg-blue-100':'bg-purple-100'}`}>
                        {item.type==='booking' ? <Calendar className="w-4 h-4 text-blue-600"/> : <Briefcase className="w-4 h-4 text-purple-600"/>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{item.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <StatusBadge status={item.status}/>
                          {item.handyman && <span className="text-xs text-gray-400">{item.handyman}</span>}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{fmtDate(item.date)}</p>
                      </div>
                      {(() => {
                        const priceVal = item.total ?? item.price
                        const showPrice = priceVal && !['open','pending'].includes(item.status)
                        return showPrice ? <span className="text-sm font-bold text-green-700 flex-shrink-0">{fmtPrice(priceVal)}</span> : null
                      })()}
                    </div>
                  )) : (
                    <div className="text-center py-6"><Bell className="w-8 h-8 text-gray-300 mx-auto mb-2"/><p className="text-sm text-gray-500">Nicio activitate</p></div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-bold text-gray-800 mb-3">Acțiuni Rapide</h3>
                <div className="space-y-2">
                  {[
                    { label:'Caută Handymani', Icon:Search,       path:'/find-services', color:'text-blue-600 bg-blue-50' },
                    { label:'Postează Task',   Icon:Plus,          path:'/post-task',     color:'text-green-600 bg-green-50' },
                    { label:'Mesaje',          Icon:MessageSquare, path:'/messages',      color:'text-purple-600 bg-purple-50' },
                    { label:'Scrie Recenzie',  Icon:Star,          path:'#',              color:'text-yellow-600 bg-yellow-50' },
                  ].map(a => (
                    <Link key={a.label} to={a.path} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition group">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 ${a.color} rounded-lg flex items-center justify-center`}><a.Icon className="w-4 h-4"/></div>
                        <span className="text-sm font-medium text-gray-700">{a.label}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-600 transition"/>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB: BOOKINGS
        ══════════════════════════════════════════════════════ */}
        {tab === 'bookings' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="p-5 border-b border-gray-100">
                <h3 className="font-bold text-gray-800">Rezervările Tale ({filteredBookings.length}/{bookings.length})</h3>
              </div>

              {/* Booking filters */}
              <div className="p-4 border-b border-gray-100 bg-gray-50/60 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'all',             label: 'Toate' },
                    { id: 'awaiting',        label: 'În așteptare' },
                    { id: 'active',          label: 'Active' },
                    { id: 'completed',       label: 'Finalizate' },
                    { id: 'client_approved', label: 'Acceptate' },
                    { id: 'client_rejected', label: 'Respinse' },
                    { id: 'cancelled',       label: 'Anulate' },
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setBookingStatusFilter(f.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                        bookingStatusFilter === f.id
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="grid md:grid-cols-3 gap-2">
                  <select
                    value={bookingCategoryFilter}
                    onChange={e => setBookingCategoryFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Toate categoriile</option>
                    {bookingCategoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>

                  <select
                    value={bookingUrgencyFilter}
                    onChange={e => setBookingUrgencyFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Toate urgențele</option>
                    <option value="high">Urgent</option>
                    <option value="medium">Mediu</option>
                    <option value="normal">Normal</option>
                    <option value="low">Fără grabă</option>
                  </select>

                  <select
                    value={bookingSortBy}
                    onChange={e => setBookingSortBy(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="newest">Cele mai noi</option>
                    <option value="oldest">Cele mai vechi</option>
                    <option value="budget_high">Buget descrescător</option>
                    <option value="budget_low">Buget crescător</option>
                    <option value="status">După status</option>
                  </select>
                </div>
              </div>

              {filteredBookings.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {filteredBookings.map(b => {
                    const resched = getRescheduleForJob(b.id)
                    const isActionable = ['confirmed','assigned','in_progress','delayed'].includes(b.status)
                    const handymanName = b.handyman ? `${b.handyman.first_name} ${b.handyman.last_name}` : null
                    const bookingStatusInfo =
                      b.status === 'client_approved' ? 'Rezervare acceptată de tine' :
                      b.status === 'client_rejected' ? 'Rezervare respinsă de tine' :
                      b.status === 'completed'   ? `Lucrarea este finalizată — în așteptarea confirmării tale` :
                      b.status === 'delayed'     ? `Handymanul a marcat întârziere${handymanName ? ` (${handymanName})` : ''}` :
                      b.status === 'in_progress' ? `Handymanul a început lucrarea${handymanName ? ` (${handymanName})` : ''}` :
                      b.status === 'assigned' || b.status === 'confirmed' ? `Rezervare alocată${handymanName ? ` către ${handymanName}` : ''}` :
                      b.status === 'accepted'    ? `Rezervare acceptată${handymanName ? ` de ${handymanName}` : ''}` :
                      b.status === 'cancelled'   ? 'Rezervare anulată' :
                      'Rezervare în așteptarea confirmării'
                    const statusInfoColor =
                      b.status === 'client_approved' ? 'text-emerald-600' :
                      b.status === 'client_rejected' ? 'text-rose-600' :
                      b.status === 'completed'   ? 'text-green-600' :
                      b.status === 'delayed'     ? 'text-orange-600' :
                      b.status === 'in_progress' ? 'text-purple-600' :
                      b.status === 'assigned' || b.status === 'confirmed' ? 'text-blue-600' :
                      b.status === 'accepted'    ? 'text-green-600' :
                      b.status === 'cancelled'   ? 'text-red-500' : 'text-yellow-600'
                    return (
                      <div key={b.id} className={`p-5 hover:bg-gray-50 transition cursor-pointer ${resched ? 'border-l-4 border-orange-400' : ''}`}
                        onClick={() => setDetailBookingId(b.id)}>
                        {/* Row 1: title + price + status */}
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-medium text-gray-800">{b.service?.title || 'Rezervare'}</p>
                            <p className="text-sm text-gray-500">{b.service?.categories?.name || 'Serviciu'}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {b.total && !['pending'].includes(b.status) && (
                              <span className="text-sm font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                                {fmtPrice(b.total)}
                              </span>
                            )}
                            <StatusBadge status={b.status}/>
                          </div>
                        </div>

                        {/* Row 2: date + status info */}
                        <div className="flex items-center gap-4 text-xs text-gray-400 mb-2">
                          <div className="flex items-center gap-1"><Clock className="w-3 h-3"/><span>{fmtDate(b.created_at)}</span></div>
                          <span className={`${statusInfoColor} font-medium`}>{bookingStatusInfo}</span>
                        </div>

                        {/* Row 3: badges */}
                        <div className="flex flex-wrap gap-2 mb-2">
                          {b.scheduled_date && !['pending','cancelled'].includes(b.status) && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-semibold">
                              <Calendar className="w-3.5 h-3.5"/>
                              Programat: {fmtDate(b.scheduled_date)}{b.scheduled_time ? ` la ${b.scheduled_time}` : ''}
                            </div>
                          )}
                          {b.service_address && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 text-gray-500 text-xs font-medium">
                              <MapPin className="w-3.5 h-3.5"/>
                              {b.service_address}
                            </div>
                          )}
                        </div>

                        {/* Row 4: action buttons */}
                        {isActionable && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            <button onClick={e => { e.stopPropagation(); setDetailBookingId(b.id) }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition">
                              <CalendarClock className="w-3.5 h-3.5"/> Reprogramează
                            </button>
                            <button onClick={e => { e.stopPropagation(); setDetailBookingId(b.id) }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 transition">
                              <XCircle className="w-3.5 h-3.5"/> Anulează
                            </button>
                          </div>
                        )}

                        {/* Verify & confirm button for completed bookings */}
                        {b.status === 'completed' && (
                          <div className="mt-3 pt-3 border-t border-gray-100" onClick={e => e.stopPropagation()}>
                            <button onClick={() => setDetailBookingId(b.id)}
                              className="w-full flex items-center justify-center gap-1.5 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition">
                              <CheckCircle className="w-3.5 h-3.5"/> Verifică și confirmă rezervarea
                            </button>
                          </div>
                        )}

                        {/* Reschedule request from handyman */}
                        {resched && (
                          <div className="mt-1 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CalendarClock className="w-4 h-4 text-red-600 flex-shrink-0"/>
                              <div>
                                <p className="text-xs font-bold text-red-700">Cerere reprogramare de la handyman</p>
                                <p className="text-xs text-red-600">Propune: <strong>{fmtDateLong(resched.proposed_date)}</strong> · {resched.proposed_time}</p>
                                {resched.message && <p className="text-xs text-red-500 italic mt-0.5">"{resched.message}"</p>}
                              </div>
                            </div>
                            <button onClick={e => { e.stopPropagation(); setRescheduleModal({ request: resched, jobTitle: b.service?.title||'Rezervare' }) }}
                              className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition flex-shrink-0">
                              Răspunde
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4"/>
                  <h3 className="font-bold text-gray-800 mb-2">
                    {bookingStatusFilter === 'all' ? 'Nicio rezervare încă' : 'Nicio rezervare pentru filtrul selectat'}
                  </h3>
                  {bookingStatusFilter === 'all' && bookingCategoryFilter === 'all' && bookingUrgencyFilter === 'all' ? (
                    <Link to="/find-services" className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition">Caută Servicii</Link>
                  ) : (
                    <button
                      onClick={() => {
                        setBookingStatusFilter('all')
                        setBookingCategoryFilter('all')
                        setBookingUrgencyFilter('all')
                        setBookingSortBy('newest')
                      }}
                      className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition"
                    >
                      Resetează filtrele
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB: TASKS
        ══════════════════════════════════════════════════════ */}
        {tab === 'tasks' && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Taskurile Tale ({filteredTasks.length}/{tasks.length})</h3>
              <Link to="/post-task" className="flex items-center gap-1 text-sm text-blue-600 font-medium hover:underline"><Plus className="w-4 h-4"/>Postează Task Nou</Link>
            </div>

            {/* Task filters */}
            <div className="p-4 border-b border-gray-100 bg-gray-50/60 space-y-3">
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'all', label: 'Toate' },
                  { id: 'awaiting', label: 'În așteptare' },
                  { id: 'active', label: 'Active' },
                  { id: 'completed', label: 'Finalizate' },
                  { id: 'rework', label: 'Relucrări', count: tasks.filter(t => {
                      const reworkSt = ['rework_pending','rework_accepted','rework_in_progress','rework_completed','rework_scheduled']
                      return (t.is_rework || reworkSt.includes(t.status)) && !['client_approved','forced_accepted','cancelled','refund_full','refund_partial'].includes(t.status)
                    }).length },
                  { id: 'client_approved', label: 'Acceptate' },
                  { id: 'client_rejected', label: 'Respinse' },
                  { id: 'cancelled', label: 'Anulate' },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setTaskStatusFilter(f.id)}
                    className={`relative px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                      taskStatusFilter === f.id
                        ? 'bg-blue-600 text-white border-blue-600'
                        : f.id === 'rework' && f.count > 0
                          ? 'bg-sky-50 text-sky-700 border-sky-300 hover:border-sky-500'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    {f.label}
                    {f.count > 0 && taskStatusFilter !== f.id && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-sky-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                        {f.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="grid md:grid-cols-4 gap-2">
                <select
                  value={taskCategoryFilter}
                  onChange={e => setTaskCategoryFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Toate categoriile</option>
                  {taskCategoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <select
                  value={taskUrgencyFilter}
                  onChange={e => setTaskUrgencyFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Toate urgențele</option>
                  <option value="high">Urgent</option>
                  <option value="medium">Mediu</option>
                  <option value="normal">Normal</option>
                  <option value="low">Fără grabă</option>
                </select>

                <select
                  value={taskOffersFilter}
                  onChange={e => setTaskOffersFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Toate (oferte)</option>
                  <option value="with_offers">Doar cu oferte</option>
                  <option value="without_offers">Fără oferte</option>
                </select>

                <select
                  value={taskSortBy}
                  onChange={e => setTaskSortBy(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="newest">Cele mai noi</option>
                  <option value="oldest">Cele mai vechi</option>
                  <option value="budget_high">Buget descrescător</option>
                  <option value="budget_low">Buget crescător</option>
                  <option value="status">După status</option>
                </select>
              </div>
            </div>

            {filteredTasks.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {filteredTasks.map(t => {
                  const offers  = getOffersForTask(t.id)
                  const resched = getRescheduleForJob(t.id)
                  const hasBorder = offers.length > 0 || resched
                  const isAssignedTask = t.status === 'assigned'
                  const cancelledByClient   = t.special_instructions?.includes('[ANULARE CLIENT]')
                  const cancelledByHandyman = t.special_instructions?.includes('[ANULARE HANDYMAN]')
                  const statusInfo =
                    t.status === 'delayed'
                      ? `Handymanul a anunțat întârziere${t.handyman ? ` (${t.handyman.first_name} ${t.handyman.last_name})` : ''}`
                      : t.status === 'in_progress'
                      ? `Handymanul a început lucrarea${t.handyman ? ` (${t.handyman.first_name} ${t.handyman.last_name})` : ''}`
                      : t.status === 'client_approved'
                      ? 'Lucrare acceptată de tine'
                      : t.status === 'client_rejected'
                      ? 'Lucrare contestată de tine'
                      : t.status === 'completed'
                        ? 'Lucrarea este finalizată — în așteptarea confirmării tale'
                        : t.status === 'assigned'
                          ? `Task alocat${t.handyman ? ` către ${t.handyman.first_name} ${t.handyman.last_name}` : ''}`
                          : t.status === 'cancelled'
                            ? cancelledByHandyman
                              ? 'Anulat de handyman'
                              : cancelledByClient
                                ? 'Anulat de client'
                                : 'Task anulat'
                            : 'Task în așteptarea unui handyman'
                  const REWORK_ST = ['rework_pending','rework_accepted','rework_in_progress','rework_completed','rework_scheduled']
                  const cardIsRework = t.is_rework === true || REWORK_ST.includes(t.status)
                  const reworkLabel = t.status === 'open' ? 'Task repostat — în așteptarea unui meșter'
                    : ['assigned','in_progress','rework_in_progress','rework_pending','rework_accepted','rework_scheduled'].includes(t.status) ? 'Relucrare în desfășurare'
                    : ['rework_completed','completed'].includes(t.status) ? 'Relucrare finalizată'
                    : 'Task de relucrare'
                  return (
                    <div key={t.id} className={`p-5 hover:bg-gray-50 transition cursor-pointer ${
                      cardIsRework ? 'border-l-4 border-sky-400' : hasBorder ? 'border-l-4 border-orange-400' : ''
                    }`}
                      onClick={() => setDetailTaskId(t.id)}>
                      {cardIsRework && (
                        <div className="flex items-center gap-1.5 mb-2 px-2.5 py-1.5 bg-sky-50 border border-sky-200 rounded-lg">
                          <RefreshCw className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
                          <p className="text-xs font-semibold text-sky-700">{reworkLabel}</p>
                        </div>
                      )}
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-gray-800">{t.title}</p>
                          <p className="text-sm text-gray-500">{t.category?.name||'Necategorizat'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {t.final_price && !['open','pending'].includes(t.status) && (
                            <span className="text-sm font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                              {fmtPrice(t.final_price)}
                            </span>
                          )}
                          <StatusBadge status={t.status}/>
                        </div>
                      </div>
                      {t.description && <p className="text-sm text-gray-600 mb-2 line-clamp-2">{t.description}</p>}
                      <div className="flex items-center gap-4 text-xs text-gray-400 mb-2">
                        <div className="flex items-center gap-1"><Clock className="w-3 h-3"/><span>{fmtDate(t.created_at)}</span></div>
                        <span className={`${t.status === 'completed' ? 'text-green-600' : t.status === 'delayed' ? 'text-orange-600' : t.status === 'in_progress' ? 'text-purple-600' : t.status === 'assigned' ? 'text-blue-600' : 'text-yellow-600'} font-medium`}>
                          {statusInfo}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {['assigned','delayed'].includes(t.status) && t.scheduled_date && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-semibold">
                            <Calendar className="w-3.5 h-3.5"/>
                            Programat: {fmtDate(t.scheduled_date)}{t.scheduled_time ? ` la ${t.scheduled_time}` : ''}
                          </div>
                        )}
                        {t.approximate_duration && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
                            <Clock className="w-3.5 h-3.5"/>
                            Durată estimată: {t.approximate_duration}
                          </div>
                        )}
                        {t.service_address && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 text-gray-500 text-xs font-medium">
                            <MapPin className="w-3.5 h-3.5"/>
                            {t.service_address}
                          </div>
                        )}
                      </div>

                      {(isAssignedTask || t.status === 'delayed') && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              setDetailTaskId(t.id)
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition"
                          >
                            <CalendarClock className="w-3.5 h-3.5" />
                            Reprogramează
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              setDetailTaskId(t.id)
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 transition"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Anulează
                          </button>
                        </div>
                      )}

                      {/* Open modal for completed tasks — actions are inside the modal */}
                      {t.status === 'completed' && (
                        <div className="mt-3 pt-3 border-t border-gray-100" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setDetailTaskId(t.id)}
                            className="w-full flex items-center justify-center gap-1.5 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Verifică și confirmă lucrarea
                          </button>
                        </div>
                      )}

                      {/* Dispute banner — task entered a dispute state */}
                      {['disputed','rework_in_progress','rework_completed','under_admin_review','forced_accepted','refund_partial','refund_full'].includes(t.status) && (
                        <div className="mt-3 pt-3 border-t border-red-100" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setTab('disputes')}
                            className="w-full flex items-center justify-center gap-1.5 py-2 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg hover:bg-red-100 transition"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            {{
                              disputed:           'Dispută deschisă — Vezi detalii',
                              rework_in_progress: 'Relucrare în curs — Confirmă data',
                              rework_completed:   'Relucrare finalizată — Confirmă',
                              under_admin_review: 'Caz la admin — Urmărește decizia',
                              forced_accepted:    'Acceptare forțată de admin',
                              refund_partial:     'Rambursare parțială acordată',
                              refund_full:        'Rambursare integrală acordată',
                            }[t.status] ?? 'Dispută activă — Vezi în tab Dispute'}
                          </button>
                        </div>
                      )}

                      {/* Badges */}
                      {(offers.length > 0 || resched) && (
                        <div className="flex flex-wrap gap-2">
                          {offers.length > 0 && (
                            <button onClick={e => { e.stopPropagation(); setTab('offers') }}>
                              <OffersBadge count={offers.length}/>
                            </button>
                          )}
                          {resched && (
                            <button onClick={e => { e.stopPropagation(); setRescheduleModal({ request: resched, jobTitle: t.title }) }}>
                              <RescheduleBadge/>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-12 text-center">
                <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4"/>
                <h3 className="font-bold text-gray-800 mb-2">Nu există taskuri pentru filtrele selectate</h3>
                <button
                  onClick={() => {
                    setTaskStatusFilter('all')
                    setTaskCategoryFilter('all')
                    setTaskUrgencyFilter('all')
                    setTaskOffersFilter('all')
                    setTaskSortBy('newest')
                  }}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition"
                >
                  Resetează filtrele
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB: OFFERS (Oferte de preț + Propuneri relucrare)
        ══════════════════════════════════════════════════════ */}
        {tab === 'offers' && (
          <div className="space-y-6">
            {/* Subtab switcher */}
            <div className="flex gap-2 bg-gray-100 p-1 rounded-2xl w-fit">
              <button
                onClick={() => setOffersSubtab('price')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  offersSubtab === 'price'
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <TrendingDown className="w-4 h-4"/>
                Oferte de Preț
                {negotiations.length > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    offersSubtab === 'price' ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-600'
                  }`}>{negotiations.length}</span>
                )}
                {pendingOffersCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-orange-500 text-white rounded-full text-[10px] font-bold animate-pulse">{pendingOffersCount} noi</span>
                )}
              </button>
              <button
                onClick={() => setOffersSubtab('rework')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  offersSubtab === 'rework'
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <CalendarClock className="w-4 h-4"/>
                Propuneri Relucrare
                {reworkProposals.length > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    offersSubtab === 'rework' ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-600'
                  }`}>{reworkProposals.filter(p => p.status === 'pending').length}</span>
                )}
              </button>
            </div>

            {/* ── Subtab: Oferte de Preț ── */}
            {offersSubtab === 'price' && (
              <>
                {negotiations.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
                    <TrendingDown className="w-12 h-12 text-gray-200 mx-auto mb-4"/>
                    <h3 className="font-bold text-gray-700 mb-1">Nicio ofertă activă</h3>
                    <p className="text-sm text-gray-400">Ofertele de preț de la handymani vor apărea aici.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(negsByJob).map(([taskId, negs]) => {
                      const task = tasks.find(t => t.id === taskId)
                      const booking = bookings.find(b => b.id === taskId)
                      const jobTitle = task?.title ?? booking?.service?.title ?? `Job #${taskId?.slice(0,6)}`
                      const originalPrice = task?.budget ?? booking?.total
                      return (
                        <div key={taskId} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                            <h4 className="font-semibold text-gray-800 text-sm">{jobTitle}</h4>
                            <span className="text-xs text-gray-400">{negs.length} ofertă{negs.length !== 1 ? 'e' : ''}</span>
                          </div>
                          <div className="divide-y divide-gray-50">
                            {negs.map(neg => (
                              <OfferRow
                                key={neg.id}
                                neg={neg}
                                taskTitle={jobTitle}
                                originalPrice={originalPrice}
                                loading={negLoading}
                                isUnseen={!seenOfferIds.includes(neg.id)}
                                onAccept={() => handleAcceptOffer(neg)}
                                onReject={() => handleRejectOffer(neg)}
                                onCounter={(price, msg, date, time) => handleCounterOffer(neg, price, msg, date, time)}
                              />
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}

            {/* ── Subtab: Propuneri Relucrare ── */}
            {offersSubtab === 'rework' && (
              <>
                {reworkProposals.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
                    <CalendarClock className="w-12 h-12 text-gray-200 mx-auto mb-4"/>
                    <h3 className="font-bold text-gray-700 mb-1">Nicio propunere de relucrare</h3>
                    <p className="text-sm text-gray-400">Propunerile de programare pentru relucrări vor apărea aici.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reworkProposals.map(prop => (
                      <ClientReworkProposalCard
                        key={prop.id}
                        proposal={prop}
                        onRefresh={loadDashboardData}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB: RESCHEDULE (Cereri de reprogramare)
        ══════════════════════════════════════════════════════ */}
        {tab === 'reschedule' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <CalendarClock className="w-5 h-5 text-red-500"/>
              <h2 className="text-lg font-bold text-gray-800">Cereri de Reprogramare</h2>
              {pendingRescheduleCount > 0 && (
                <span className="px-2.5 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                  {pendingRescheduleCount} în așteptare
                </span>
              )}
            </div>

            {rescheduleRequests.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
                <CalendarClock className="w-12 h-12 text-gray-200 mx-auto mb-4"/>
                <h3 className="font-bold text-gray-700 mb-1">Nicio cerere în așteptare</h3>
                <p className="text-sm text-gray-400">Cererile de reprogramare de la handymani vor apărea aici.</p>
              </div>
            ) : (
              rescheduleRequests.map(req => {
                const task     = tasks.find(t => t.id === req.job_id)
                const booking  = bookings.find(b => b.id === req.job_id)
                const jobTitle = task?.title ?? booking?.service?.title ?? `Job #${req.job_id.slice(0,6)}`
                return (
                  <RescheduleCard key={req.id} req={req} jobTitle={jobTitle} onUpdated={loadDashboardData}/>
                )
              })
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB: DISPUTES
        ══════════════════════════════════════════════════════ */}
        {tab === 'disputes' && (() => {
          // ── Status config ──────────────────────────────────────────────────
          const DISPUTE_STATUS_CFG = {
            open:                          { label: 'Deschis',                  cls: 'bg-red-100 text-red-700',       Icon: AlertCircle  },
            dispute_contested:             { label: 'Contestat',                cls: 'bg-orange-100 text-orange-700', Icon: Scale        },
            rework_accepted:               { label: 'Relucrare acceptată',      cls: 'bg-orange-100 text-orange-700', Icon: Wrench       },
            rework_in_progress:            { label: 'Relucrare în curs',        cls: 'bg-blue-100 text-blue-700',     Icon: Wrench       },
            rework_completed:              { label: 'Relucrare finalizată',      cls: 'bg-green-100 text-green-700',   Icon: CheckCircle  },
            admin_review:                  { label: 'La administrator',          cls: 'bg-purple-100 text-purple-700', Icon: Scale        },
            admin_review_required:         { label: 'La administrator',          cls: 'bg-purple-100 text-purple-700', Icon: Scale        },
            under_admin_review:            { label: 'Analiză admin',             cls: 'bg-purple-100 text-purple-700', Icon: Scale        },
            admin_escalated:               { label: 'Escaladat',                 cls: 'bg-purple-200 text-purple-800', Icon: Scale        },
            admin_proposed_rework:         { label: 'Propunere relucrare',       cls: 'bg-yellow-100 text-yellow-700', Icon: Wrench       },
            evidence_requested_client:     { label: 'Dovezi solicitate',         cls: 'bg-amber-100 text-amber-800 ring-1 ring-amber-400', Icon: AlertCircle },
            evidence_requested_handyman:   { label: 'Dovezi la meșter',          cls: 'bg-amber-50 text-amber-700',    Icon: Scale        },
            awaiting_client_rework_choice: { label: 'Alege cum continui',        cls: 'bg-amber-100 text-amber-700',   Icon: AlertCircle  },
            handyman_declined_rework:      { label: 'Meșterul a refuzat',        cls: 'bg-red-200 text-red-800',       Icon: AlertCircle  },
            resolved:                      { label: 'Rezolvat',                  cls: 'bg-green-100 text-green-700',   Icon: CheckCircle  },
            closed:                        { label: 'Închis',                    cls: 'bg-gray-100 text-gray-500',     Icon: CheckCircle  },
            forced_accepted:               { label: 'Plată eliberată',           cls: 'bg-gray-100 text-gray-600',     Icon: CheckCircle  },
            refund_partial:                { label: 'Rambursare parțială',       cls: 'bg-teal-100 text-teal-700',     Icon: CheckCircle  },
            refund_full:                   { label: 'Rambursare totală',         cls: 'bg-teal-100 text-teal-700',     Icon: CheckCircle  },
            rework_marketplace:            { label: 'Alt meșter',                cls: 'bg-sky-100 text-sky-700',       Icon: Wrench       },
            rejected:                      { label: 'Respins',                   cls: 'bg-gray-100 text-gray-500',     Icon: AlertCircle  },
          }

          // ── Filter groups ──────────────────────────────────────────────────
          const FILTER_GROUPS = [
            { id: 'all',      label: 'Toate',       statuses: null,
              color: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
              activeColor: 'bg-gray-800 text-white' },
            { id: 'open',     label: 'Deschise',    statuses: ['open'],
              color: 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200',
              activeColor: 'bg-red-600 text-white border-transparent' },
            { id: 'rework',   label: 'Relucrare',   statuses: ['rework_accepted','rework_in_progress'],
              color: 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200',
              activeColor: 'bg-orange-500 text-white border-transparent' },
            { id: 'admin',    label: 'La Admin',    statuses: ['admin_review','under_admin_review','dispute_contested','evidence_requested_client','evidence_requested_handyman','admin_escalated','admin_proposed_rework','handyman_declined_rework'],
              color: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200',
              activeColor: 'bg-purple-600 text-white border-transparent' },
            { id: 'resolved', label: 'Rezolvate',   statuses: ['resolved','closed','forced_accepted','refund_partial','refund_full','rework_marketplace'],
              color: 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200',
              activeColor: 'bg-green-600 text-white border-transparent' },
            { id: 'rejected', label: 'Respinse',    statuses: ['rejected'],
              color: 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200',
              activeColor: 'bg-gray-500 text-white border-transparent' },
          ]

          // ── Filtered list ──────────────────────────────────────────────────
          const activeGroup = FILTER_GROUPS.find(g => g.id === disputeStatusFilter)
          const filteredDisputes = activeGroup?.statuses
            ? disputes.filter(d => activeGroup.statuses.includes(d.status))
            : disputes

          // Count per group (only show badge if > 0)
          const countFor = (g) => g.statuses ? disputes.filter(d => g.statuses.includes(d.status)).length : disputes.length

          return (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center gap-3 mb-1">
                <ShieldAlert className="w-5 h-5 text-red-500"/>
                <h2 className="text-lg font-bold text-gray-800">Disputele Mele</h2>
                {pendingDisputesCount > 0 && (
                  <span className="px-2.5 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                    {pendingDisputesCount} {pendingDisputesCount === 1 ? 'necesită decizia ta' : 'necesită decizia ta'}
                  </span>
                )}
                <span className="ml-auto text-xs text-gray-400">{disputes.length} total</span>
              </div>

              {/* Filter chips */}
              <div className="flex flex-wrap gap-2">
                {FILTER_GROUPS.map(g => {
                  const cnt = countFor(g)
                  if (g.id !== 'all' && cnt === 0) return null
                  const isActive = disputeStatusFilter === g.id
                  return (
                    <button
                      key={g.id}
                      onClick={() => setDisputeStatusFilter(g.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all
                        ${isActive ? g.activeColor : g.color}`}
                    >
                      {g.label}
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold
                        ${isActive ? 'bg-white/25 text-white' : 'bg-white/70 text-gray-600'}`}>
                        {cnt}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Cards */}
              {filteredDisputes.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                  <ShieldAlert className="w-10 h-10 text-gray-200 mx-auto mb-3"/>
                  <p className="text-sm font-medium text-gray-500">
                    {disputes.length === 0 ? 'Nicio dispută deschisă' : 'Nicio dispută în această categorie'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredDisputes.map(d => {
                    const handymanName = d.handyman
                      ? `${d.handyman.first_name ?? ''} ${d.handyman.last_name ?? ''}`.trim() || 'Handyman'
                      : 'Handyman'
                    const taskTitle = d.task?.title ?? `Task #${d.task?.id?.slice(0,6) ?? '—'}`

                    const tl = (() => { try { return Array.isArray(d.timeline) ? d.timeline : JSON.parse(d.timeline ?? '[]') } catch { return [] } })()
                    const clientProposed    = tl.find(e => e.event === 'client_proposed_new_rework_date')
                    const handymanConfirmed = tl.find(e => e.event === 'handyman_confirmed_client_date')

                    const hoursLeft = Math.max(0, Math.floor((new Date(d.created_at).getTime() + 24 * 3600_000 - Date.now()) / 3_600_000))
                    const urgent    = d.status === 'open' && hoursLeft < 12
                    const isResolved = ['resolved','closed','forced_accepted','refund_partial','refund_full','rework_marketplace'].includes(d.status)

                    const { label: sLabel, cls: sCls, Icon: SIcon } = DISPUTE_STATUS_CFG[d.status]
                      ?? { label: d.status, cls: 'bg-gray-100 text-gray-600', Icon: ShieldAlert }

                    // stripe color
                    const isLv2 = d.task?.is_rework === true && (d.task?.rework_level ?? 1) >= 2
                    const needsClientAction = d.status === 'evidence_requested_client'

                    const stripeColor = urgent ? 'bg-red-500'
                      : needsClientAction ? 'bg-amber-400'
                      : d.status === 'rework_accepted' || d.status === 'rework_in_progress' ? 'bg-orange-400'
                      : ['admin_review','under_admin_review','dispute_contested','evidence_requested_handyman','admin_escalated'].includes(d.status) ? 'bg-purple-400'
                      : isResolved ? 'bg-green-400'
                      : 'bg-gray-300'

                    return (
                      <div key={d.id}
                        onClick={() => setDetailTaskId(d.task?.id)}
                        className={`bg-white rounded-2xl border shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow
                          ${urgent ? 'border-red-300' : needsClientAction ? 'border-amber-300' : isResolved ? 'border-green-200' : 'border-gray-200'}`}>
                        <div className={`h-1 w-full ${stripeColor}`} />

                        <div className="p-4 space-y-3">
                          {/* Title + badge */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                              <p className="font-bold text-gray-800 text-sm leading-tight">{taskTitle}</p>
                              {isLv2 && (
                                <span className="flex-shrink-0 px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded border border-orange-200">Niv.2</span>
                              )}
                            </div>
                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0 ${sCls}`}>
                              <SIcon className="w-3 h-3"/> {sLabel}
                            </span>
                          </div>

                          {/* Handyman */}
                          <div className="flex items-center gap-2">
                            {d.handyman?.avatar_url
                              ? <img src={d.handyman.avatar_url} className="w-7 h-7 rounded-full object-cover flex-shrink-0"/>
                              : <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0"><User className="w-3.5 h-3.5 text-blue-500"/></div>
                            }
                            <span className="text-xs text-gray-600">{handymanName}</span>
                            {d.task?.final_price && (
                              <span className="ml-auto text-xs font-bold text-gray-700">
                                {Number(d.task.final_price).toLocaleString('ro-RO')} RON
                              </span>
                            )}
                          </div>

                          {/* Reason */}
                          {d.rejection_reasons?.name && (
                            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-2.5 py-1.5">
                              Motiv: <span className="font-medium text-gray-700">{d.rejection_reasons.name}</span>
                            </p>
                          )}

                          {/* Status-specific context */}
                          {d.status === 'open' && (
                            <div className={`flex items-center gap-2 rounded-lg px-2.5 py-2 ${urgent ? 'bg-red-50 border border-red-200' : 'bg-orange-50 border border-orange-100'}`}>
                              <Clock className={`w-3.5 h-3.5 flex-shrink-0 ${urgent ? 'text-red-500' : 'text-orange-500'}`}/>
                              <p className={`text-xs font-medium ${urgent ? 'text-red-700' : 'text-orange-700'}`}>
                                {hoursLeft > 0 ? `Meșterul are ${hoursLeft}h să răspundă` : 'Termenul a expirat — caz escaladat'}
                              </p>
                            </div>
                          )}

                          {d.status === 'rework_accepted' && !d.client_rework_confirmed_at && !clientProposed && (
                            <button
                              onClick={e => { e.stopPropagation(); setReworkConfirmDispute(d) }}
                              className="w-full flex items-center gap-2 bg-orange-50 border border-orange-300 rounded-lg px-2.5 py-2 hover:bg-orange-100 transition text-left group"
                            >
                              <CalendarClock className="w-3.5 h-3.5 text-orange-500 flex-shrink-0"/>
                              <p className="text-xs font-semibold text-orange-700">
                                Confirmă data relucrării{d.rework_deadline ? ` — ${new Date(d.rework_deadline).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' })}` : ''}
                              </p>
                              <span className="ml-auto text-xs text-orange-600 font-bold group-hover:translate-x-0.5 transition-transform">→</span>
                            </button>
                          )}

                          {d.status === 'rework_accepted' && clientProposed && !handymanConfirmed && (
                            <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-2">
                              <Clock className="w-3.5 h-3.5 text-blue-500 flex-shrink-0"/>
                              <p className="text-xs text-blue-700">Aștepți confirmarea meșterului pentru noua dată</p>
                            </div>
                          )}

                          {d.status === 'rework_accepted' && d.client_rework_confirmed_at && (
                            <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-lg px-2.5 py-2">
                              <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0"/>
                              <p className="text-xs text-green-700 font-medium">Dată confirmată — relucrare programată</p>
                            </div>
                          )}

                          {d.status === 'rework_in_progress' && (
                            <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-2">
                              <Wrench className="w-3.5 h-3.5 text-blue-500 flex-shrink-0"/>
                              <p className="text-xs text-blue-700 font-medium">Meșterul lucrează la relucrare</p>
                            </div>
                          )}

                          {(d.status === 'admin_review' || d.status === 'under_admin_review') && (
                            <div className="flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-lg px-2.5 py-2">
                              <Scale className="w-3.5 h-3.5 text-purple-500 flex-shrink-0"/>
                              <p className="text-xs text-purple-700">Un admin analizează cazul și va lua o decizie</p>
                            </div>
                          )}

                          {d.status === 'evidence_requested_client' && (
                            <div className="flex items-center gap-2 bg-amber-50 border border-amber-300 rounded-lg px-2.5 py-2">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0"/>
                              <p className="text-xs font-semibold text-amber-700">Adminul solicită dovezi — deschide pentru a răspunde</p>
                              <span className="ml-auto text-xs text-amber-600 font-bold">→</span>
                            </div>
                          )}

                          {(d.status === 'dispute_contested' || d.status === 'evidence_requested_handyman') && (
                            <div className="flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-lg px-2.5 py-2">
                              <Scale className="w-3.5 h-3.5 text-purple-500 flex-shrink-0"/>
                              <p className="text-xs text-purple-700">
                                {d.status === 'dispute_contested' ? 'Meșterul a contestat disputa — caz la admin' : 'Adminul a cerut dovezi de la meșter'}
                              </p>
                            </div>
                          )}

                          {(d.status === 'refund_partial' || d.status === 'refund_full') && (
                            <div className="flex items-center gap-2 bg-teal-50 border border-teal-100 rounded-lg px-2.5 py-2">
                              <CheckCircle className="w-3.5 h-3.5 text-teal-500 flex-shrink-0"/>
                              <p className="text-xs text-teal-700 font-medium">
                                {d.status === 'refund_full' ? 'Rambursare integrală aprobată' : 'Rambursare parțială aprobată'}
                              </p>
                            </div>
                          )}

                          {d.status === 'forced_accepted' && (
                            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2">
                              <CheckCircle className="w-3.5 h-3.5 text-gray-400 flex-shrink-0"/>
                              <p className="text-xs text-gray-600">Plata a fost eliberată de admin</p>
                            </div>
                          )}

                          {d.status === 'rework_marketplace' && (
                            <div className="flex items-center gap-2 bg-sky-50 border border-sky-100 rounded-lg px-2.5 py-2">
                              <Wrench className="w-3.5 h-3.5 text-sky-500 flex-shrink-0"/>
                              <p className="text-xs text-sky-700 font-medium">Taskul a fost retrimis în marketplace</p>
                            </div>
                          )}

                          {/* Admin decision (if any) */}
                          {d.admin_decision && isResolved && (
                            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-2.5 py-1.5 line-clamp-2">
                              Admin: <span className="text-gray-700">{d.admin_decision}</span>
                            </p>
                          )}

                          <p className="text-[10px] text-gray-400">
                            Deschis {new Date(d.created_at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })()}

        {/* ══════════════════════════════════════════════════════
            TAB: FAVORITES
        ══════════════════════════════════════════════════════ */}
        {tab === 'favorites' && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">Handymani Favoriți ({favorites.length})</h3>
            </div>
            {favorites.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4 p-5">
                {favorites.map(fav => {
                  const h = fav.handyman
                  const hp = h?.handyman_profiles?.[0]
                  const favSlug = h?.first_name && h?.last_name
                    ? `${h.first_name}-${h.last_name}`.toLowerCase()
                        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                        .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                    : null
                  return (
                    <div key={fav.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition">
                      <div className="flex items-center gap-3 mb-3">
                        <button onClick={() => favSlug && navigate(`/handymen/${favSlug}`)} className="flex-shrink-0">
                          {h?.avatar_url
                            ? <img src={h.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover hover:ring-2 hover:ring-blue-400 transition"/>
                            : <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold hover:bg-blue-200 transition">{h?.first_name?.[0]}{h?.last_name?.[0]}</div>
                          }
                        </button>
                        <div className="flex-1">
                          <button onClick={() => favSlug && navigate(`/handymen/${favSlug}`)}
                            className="font-bold text-gray-800 hover:text-blue-600 transition text-left">
                            {h?.first_name} {h?.last_name}
                          </button>
                          {h?.city && <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3"/>{h.city}</p>}
                        </div>
                        <button onClick={() => removeFavorite(fav.handyman_id)} className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center hover:bg-red-100 transition">
                          <Heart className="w-4 h-4 fill-red-500 text-red-500"/>
                        </button>
                      </div>
                      <div className="flex items-center gap-3 text-sm mb-2">
                        {hp?.rating_avg > 0 && <div className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400"/><span className="font-medium">{hp.rating_avg}</span></div>}
                        {hp?.total_jobs_completed > 0 && <span className="text-gray-500">{hp.total_jobs_completed} lucrări</span>}
                      </div>
                      {hp?.specialties && (
                        <div className="flex flex-wrap gap-1">
                          {hp.specialties.slice(0,3).map((s,i) => <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-lg">{s}</span>)}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-12 text-center">
                <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4"/>
                <h3 className="font-bold text-gray-800 mb-2">Niciun favorit încă</h3>
                <Link to="/find-services" className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition">Caută Handymani</Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════ MINI-MODAL: Confirmare / Reprogramare Dată Relucrare ══════ */}
      {reworkConfirmDispute && (() => {
        const rd = reworkConfirmDispute
        const fmtDeadline = (iso) => {
          if (!iso) return '—'
          const d = new Date(iso)
          return d.toLocaleDateString('ro-RO', { weekday: 'long', day: '2-digit', month: 'long' })
            + (d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }) !== '00:00'
              ? ' la ' + d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })
              : '')
        }
        return (
          <ReworkConfirmModal
            dispute={rd}
            fmtDeadline={fmtDeadline}
            availSlots={cdAvailSlots}
            todayStr={CD_TODAY_STR}
            onClose={() => setReworkConfirmDispute(null)}
            onSuccess={async () => {
              setReworkConfirmDispute(null)
              // Reîncarcă disputele folosind currentUserId din state
              const { data } = await supabase.from('task_disputes')
                .select(`id, status, created_at, details, rework_deadline, client_rework_confirmed_at,
                  handyman_response, handyman_response_at, admin_decision, timeline,
                  task:task_id(id, title, status, final_price),
                  handyman:handyman_id(first_name, last_name, avatar_url),
                  rejection_reasons!reason_id(name)`)
                .eq('client_id', currentUserId)
                .order('created_at', { ascending: false })
              setDisputes(data ?? [])
            }}
          />
        )
      })()}

      {/* Accept success modal */}
      {acceptedOffer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4"
          onClick={() => setAcceptedOffer(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center"
            onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-9 h-9 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Ofertă Acceptată!</h2>
            <p className="text-sm text-gray-500 mb-4">
              Ai acceptat oferta lui <strong className="text-gray-700">{acceptedOffer.handymanName}</strong> pentru{' '}
              <strong className="text-gray-700">{acceptedOffer.taskTitle}</strong> la prețul de{' '}
              <strong className="text-blue-700">{Number(acceptedOffer.price).toLocaleString('ro-RO')} RON</strong>.
            </p>
            <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-left space-y-1.5 text-sm text-green-800 mb-5">
              <p>✓ Handymanul a fost notificat</p>
              <p>✓ Taskul apare acum în secțiunea Taskuri ca "Alocat"</p>
              <p>✓ Handymanul va lua legătura cu tine pentru detalii</p>
            </div>
            <button onClick={() => setAcceptedOffer(null)}
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition">
              Super, mulțumesc!
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <ClientTaskDetailModal
        taskId={detailTaskId}
        onClose={() => setDetailTaskId(null)}
        onUpdated={() => {
          // Reload data; optimistic removal handled by status update in modal
          loadDashboardData()
        }}
      />
      <ClientBookingDetailModal bookingId={detailBookingId} onClose={() => setDetailBookingId(null)} onUpdated={loadDashboardData}/>
      {rescheduleModal && (
        <ClientRescheduleModal
          request={rescheduleModal.request}
          jobTitle={rescheduleModal.jobTitle}
          onClose={() => setRescheduleModal(null)}
          onUpdated={() => { setRescheduleModal(null); loadDashboardData() }}
        />
      )}
    </div>
  )
}

// ─── OFFER ROW ────────────────────────────────────────────────────────────────

function OfferRow({ neg, taskTitle, originalPrice, loading, isUnseen, onAccept, onReject, onCounter }) {
  const [showCounter,    setShowCounter]    = useState(false)
  const [showReschedule, setShowReschedule] = useState(false)
  const [counterPrice,   setCounterPrice]   = useState('')
  const [counterMsg,     setCounterMsg]     = useState('')
  const safeDateInit = (d) => d && d >= CD_TODAY_STR ? d : ''
  const safeTimeInit = (d, t) => safeDateInit(d) ? (t ?? '') : ''
  const [counterDate,    setCounterDate]    = useState(safeDateInit(neg.available_date))
  const [counterTime,    setCounterTime]    = useState(safeTimeInit(neg.available_date, neg.available_time))
  const [reschedDate,    setReschedDate]    = useState(safeDateInit(neg.available_date))
  const [reschedTime,    setReschedTime]    = useState(safeTimeInit(neg.available_date, neg.available_time))
  const [reschedMsg,     setReschedMsg]     = useState('')
  const [handymanRounds, setHandymanRounds] = useState(0)
  const [clientRounds,   setClientRounds]   = useState(0)
  const [allOffers,      setAllOffers]      = useState([])

  const MAX_ROUNDS = 5

  // Load all offers for this task to count rounds + diff detection
  useEffect(() => {
    supabase.from('task_offers')
      .select('id, sent_by, status, proposed_price, available_date, available_time')
      .eq('task_id', neg.task_id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        const rows = data ?? []
        setAllOffers(rows)
        setHandymanRounds(rows.filter(r => (r.sent_by ?? 'handyman') === 'handyman').length)
        setClientRounds(rows.filter(r => r.sent_by === 'client').length)
      })
  }, [neg.task_id, neg.id])

  const needsMyResponse  = neg.sent_by !== 'client'
  const waitingForHandyman = neg.sent_by === 'client'
  const canCounter       = needsMyResponse && clientRounds < MAX_ROUNDS
  const roundsExhausted  = clientRounds >= MAX_ROUNDS

  const savings = originalPrice && neg.proposed_price
    ? Number(originalPrice) - Number(neg.proposed_price)
    : null

  const navigate = useNavigate()
  const handymanName = neg.handyman
    ? `${neg.handyman.first_name ?? ''} ${neg.handyman.last_name ?? ''}`.trim() || 'Handyman'
    : `Handyman #${neg.handyman_id?.slice(0,8)}`
  const initials = handymanName.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()
  const handymanSlug = neg.handyman?.first_name && neg.handyman?.last_name
    ? `${neg.handyman.first_name}-${neg.handyman.last_name}`.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    : null

  const prevClientOffer = needsMyResponse ? [...allOffers].reverse().find(r => r.sent_by === 'client') : null
  const priceChanged = prevClientOffer && Number(neg.proposed_price) !== Number(prevClientOffer.proposed_price)
  const dateChanged  = prevClientOffer && (neg.available_date !== prevClientOffer.available_date || neg.available_time !== prevClientOffer.available_time)

  return (
    <div className={`p-5 transition-colors ${isUnseen ? 'bg-orange-50/40' : ''}`}>
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <button
          onClick={() => handymanSlug && navigate(`/handymen/${handymanSlug}`)}
          className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden hover:opacity-80 transition mt-0.5">
          {neg.handyman?.avatar_url
            ? <img src={neg.handyman.avatar_url} alt={handymanName} className="w-full h-full object-cover"/>
            : <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white text-base font-bold">{initials}</div>}
        </button>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handymanSlug && navigate(`/handymen/${handymanSlug}`)}
              className="font-bold text-gray-900 text-base hover:text-blue-600 transition">{handymanName}</button>
            {neg.handyman?.city && <span className="text-sm text-gray-400">· {neg.handyman.city}</span>}
            {neg.handyman?.average_rating > 0 && (
              <span className="text-sm text-yellow-600 font-medium">★ {Number(neg.handyman.average_rating).toFixed(1)}</span>
            )}
            {needsMyResponse    && <span className="px-2.5 py-0.5 bg-blue-500 text-white text-xs font-bold rounded-full animate-pulse">Răspunde</span>}
            {waitingForHandyman && <span className="px-2.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">Aștept meșter</span>}
          </div>
          {neg.available_date && (
            <p className="text-sm text-gray-500 mt-0.5">
              {new Date(neg.available_date).toLocaleDateString('ro-RO', {weekday:'short',day:'numeric',month:'short',year:'numeric'})}
              {neg.available_time && <span className="text-blue-600"> la {neg.available_time}</span>}
            </p>
          )}
          {neg.message && <p className="text-sm text-gray-500 mt-1 italic">"{neg.message}"</p>}
        </div>
        {/* Price */}
        <div className="flex-shrink-0 text-right">
          <p className="text-2xl font-black text-blue-700">{fmtPrice(neg.proposed_price)}</p>
          {savings !== null && savings > 0 && <p className="text-xs text-green-600 font-semibold">-{fmtPrice(savings)} față de buget</p>}
          {savings !== null && savings < 0 && <p className="text-xs text-red-500 font-semibold">+{fmtPrice(Math.abs(savings))} peste buget</p>}
        </div>
      </div>

      {/* Diff chips */}
      {(priceChanged || dateChanged) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {priceChanged && (
            <span className="flex items-center gap-1 text-xs bg-blue-50 border border-blue-200 text-blue-700 rounded-lg px-2.5 py-1">
              <DollarSign className="w-3 h-3 flex-shrink-0"/>
              {fmtPrice(prevClientOffer.proposed_price)} → <strong>{fmtPrice(neg.proposed_price)}</strong>
            </span>
          )}
          {dateChanged && (
            <span className="flex items-center gap-1 text-xs bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg px-2.5 py-1">
              <Calendar className="w-3 h-3 flex-shrink-0"/>
              Dată nouă: <strong>{neg.available_date ? new Date(neg.available_date).toLocaleDateString('ro-RO',{day:'2-digit',month:'short'})+(neg.available_time ? ` · ${neg.available_time}` : '') : '—'}</strong>
            </span>
          )}
        </div>
      )}

      {/* Round counter */}
      <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
        <span>Handyman:</span>
        <div className="flex gap-1">
          {[1,2,3,4,5].map(i => (
            <div key={i} className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
              ${i <= handymanRounds ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-400'}`}>{i}</div>
          ))}
        </div>
        <span>Tu:</span>
        <div className="flex gap-1">
          {[1,2,3,4,5].map(i => (
            <div key={i} className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
              ${i <= clientRounds ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400'}`}>{i}</div>
          ))}
        </div>
        {roundsExhausted && <span className="text-red-500 font-medium ml-1">Limită atinsă</span>}
      </div>

      {/* Actions */}
      {needsMyResponse && !showCounter && !showReschedule && (
        <div className="mt-4 space-y-2">
          <div className="flex gap-2">
            <button onClick={onAccept} disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 disabled:opacity-50 transition">
              {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle className="w-4 h-4"/>}
              Acceptă
            </button>
            {canCounter && (
              <button onClick={() => { setShowReschedule(true); setShowCounter(false) }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-yellow-500 text-white rounded-xl text-sm font-bold hover:bg-yellow-600 transition">
                <Calendar className="w-4 h-4"/> Schimbă data
              </button>
            )}
            {canCounter && (
              <button onClick={() => { setShowCounter(true); setShowReschedule(false) }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition">
                <DollarSign className="w-4 h-4"/> Negociază
              </button>
            )}
            <button onClick={onReject} disabled={loading}
              className="px-4 py-2.5 border border-gray-200 text-gray-400 rounded-xl text-sm hover:bg-gray-50 hover:text-red-500 transition disabled:opacity-50">
              <XCircle className="w-4 h-4"/>
            </button>
          </div>
          {!canCounter && <p className="text-xs text-center text-gray-400">Runde epuizate — poți accepta sau refuza.</p>}
        </div>
      )}

      {/* Waiting — only show decline button */}
      {waitingForHandyman && !showCounter && !showReschedule && (
        <div className="mt-4">
          <button onClick={onReject} disabled={loading}
            className="px-4 py-2.5 border border-gray-200 text-gray-400 rounded-xl text-sm hover:bg-gray-50 hover:text-red-500 transition disabled:opacity-50">
            <XCircle className="w-4 h-4"/>
          </button>
        </div>
      )}

      {/* Negociază prețul form */}
      {showCounter && (
        <div className="mt-4 pt-4 border-t border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 -mx-5 -mb-5 px-5 pb-5 space-y-3">
          <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">
            Negociază prețul (Runda {clientRounds + 1}/{MAX_ROUNDS})
          </p>
          <input type="number" value={counterPrice} onChange={e => setCounterPrice(e.target.value)}
            placeholder="Prețul tău (RON) *"
            className="w-full px-3 py-2 border border-blue-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          <input type="date" value={counterDate} min={CD_TODAY_STR}
            onChange={e => { const d = e.target.value; setCounterDate(d); if (d === CD_TODAY_STR && counterTime && cdToMins(counterTime) <= (new Date().getHours()*60+new Date().getMinutes())) setCounterTime('') }}
            className="w-full px-3 py-2 border border-blue-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          {counterDate && (
            <div>
              <p className="text-xs text-blue-600 mb-1.5">Ora <span className="text-blue-400">(opțional)</span></p>
              {cdAvailSlots(counterDate).length === 0
                ? <p className="text-xs text-orange-600 italic">Nu mai sunt ore disponibile azi.</p>
                : <div className="grid grid-cols-5 gap-1.5">
                    {cdAvailSlots(counterDate).map(t => (
                      <button key={t} type="button" onClick={() => setCounterTime(t === counterTime ? '' : t)}
                        className={`py-2 rounded-xl text-xs font-semibold border transition-all
                          ${counterTime === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-blue-200 text-gray-700 hover:border-blue-400'}`}>
                        {t}
                      </button>
                    ))}
                  </div>}
            </div>
          )}
          <input type="text" placeholder="Mesaj opțional..." value={counterMsg} onChange={e => setCounterMsg(e.target.value)}
            className="w-full px-3 py-2 border border-blue-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          <div className="flex gap-2">
            <button onClick={() => { setShowCounter(false); setCounterMsg('') }}
              className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-white transition font-medium">
              Anulează
            </button>
            <button onClick={() => { onCounter(counterPrice, counterMsg, counterDate, counterTime); setShowCounter(false); setCounterPrice(''); setCounterMsg('') }}
              disabled={!counterPrice || loading}
              className="flex-[2] flex items-center justify-center gap-1.5 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition">
              {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Trimite oferta'}
            </button>
          </div>
        </div>
      )}

      {/* Schimbă data form */}
      {showReschedule && (
        <div className="mt-4 pt-4 border-t border-yellow-100 bg-gradient-to-br from-yellow-50 to-amber-50 -mx-5 -mb-5 px-5 pb-5 space-y-3">
          <p className="text-xs font-bold text-yellow-700 uppercase tracking-wide">
            Schimbă data (Runda {clientRounds + 1}/{MAX_ROUNDS})
          </p>
          <p className="text-xs text-yellow-600">Prețul rămâne <strong>{fmtPrice(neg.proposed_price)}</strong></p>
          <input type="date" value={reschedDate} min={CD_TODAY_STR}
            onChange={e => { const d = e.target.value; setReschedDate(d); if (d === CD_TODAY_STR && reschedTime && cdToMins(reschedTime) <= (new Date().getHours()*60+new Date().getMinutes())) setReschedTime('') }}
            className="w-full px-3 py-2 border border-yellow-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400"/>
          {reschedDate && (
            <div>
              <p className="text-xs text-yellow-600 mb-1.5">Ora <span className="text-yellow-400">(opțional)</span></p>
              {cdAvailSlots(reschedDate).length === 0
                ? <p className="text-xs text-orange-600 italic">Nu mai sunt ore disponibile azi.</p>
                : <div className="grid grid-cols-5 gap-1.5">
                    {cdAvailSlots(reschedDate).map(t => (
                      <button key={t} type="button" onClick={() => setReschedTime(t === reschedTime ? '' : t)}
                        className={`py-2 rounded-xl text-xs font-semibold border transition-all
                          ${reschedTime === t ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-white border-yellow-300 text-gray-700 hover:border-yellow-400'}`}>
                        {t}
                      </button>
                    ))}
                  </div>}
            </div>
          )}
          <input type="text" placeholder="Mesaj opțional..." value={reschedMsg} onChange={e => setReschedMsg(e.target.value)}
            className="w-full px-3 py-2 border border-yellow-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400"/>
          <div className="flex gap-2">
            <button onClick={() => { setShowReschedule(false); setReschedMsg('') }}
              className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-white transition font-medium">
              Anulează
            </button>
            <button onClick={() => { onCounter(neg.proposed_price, reschedMsg, reschedDate, reschedTime); setShowReschedule(false); setReschedMsg('') }}
              disabled={!reschedDate || loading}
              className="flex-[2] flex items-center justify-center gap-1.5 py-2 bg-yellow-500 text-white rounded-xl text-sm font-bold hover:bg-yellow-600 disabled:opacity-50 transition">
              {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Trimite schimbarea'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── CLIENT REWORK PROPOSAL CARD ──────────────────────────────────────────────

const MAX_REWORK_ROUNDS = 4
const CD_RWP_SLOTS = TIME_SLOTS

function ClientReworkProposalCard({ proposal, onRefresh }) {
  const [responding,  setResponding]  = useState(false)
  const [showCounter, setShowCounter] = useState(false)
  const [cDate,       setCDate]       = useState('')
  const [cTime,       setCTime]       = useState('')
  const [cNote,       setCNote]       = useState('')

  const nowMins   = new Date().getHours()*60+new Date().getMinutes()
  const slots     = cDate === CD_TODAY_STR
    ? CD_RWP_SLOTS.filter(t => cdToMins(t) > nowMins)
    : CD_RWP_SLOTS

  const h         = proposal.handyman
  const handyName = h ? `${h.first_name ?? ''} ${h.last_name ?? ''}`.trim() || 'Meșter' : 'Meșter'
  const task      = proposal.task

  const isPending       = proposal.status === 'pending'
  const isAccepted      = proposal.status === 'accepted'
  const isDeclined      = proposal.status === 'declined'
  const needsMyResponse = isPending && proposal.proposed_by === 'handyman'
  const waitingForHandy = isPending && proposal.proposed_by === 'client'
  const canCounter      = needsMyResponse && proposal.round_count < MAX_REWORK_ROUNDS

  const respond = async (action) => {
    setResponding(true)
    const { data, error } = await supabase.rpc('respond_rework_proposal', {
      p_proposal_id: proposal.id,
      p_action:      action,
      p_date:        action === 'counter' ? cDate  : null,
      p_time:        action === 'counter' ? (cTime || null) : null,
      p_note:        action === 'counter' ? (cNote || null) : null,
    })
    setResponding(false)
    if (error || data?.success === false) {
      alert(data?.error || error?.message || 'Eroare la răspuns.')
      return
    }
    setShowCounter(false)
    onRefresh()
  }

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-shadow hover:shadow-md
      ${isDeclined ? 'opacity-70 border-gray-100' : needsMyResponse ? 'border-orange-200' : 'border-gray-100'}`}>
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden mt-0.5">
            {h?.avatar_url
              ? <img src={h.avatar_url} className="w-full h-full object-cover"/>
              : <div className="w-full h-full bg-orange-500 flex items-center justify-center text-white text-base font-bold">{handyName[0]}</div>}
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-gray-900 text-base">{handyName}</p>
              {h?.city && <span className="text-sm text-gray-400">· {h.city}</span>}
              {needsMyResponse && <span className="px-2.5 py-0.5 bg-orange-500 text-white text-xs font-bold rounded-full animate-pulse">Răspunde</span>}
              {waitingForHandy && <span className="px-2.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">Aștept meșter</span>}
              {isAccepted && <span className="px-2.5 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">Confirmată ✓</span>}
              {isDeclined && <span className="px-2.5 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">Refuzată</span>}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{task?.title ?? 'Relucrare'}</p>
            {(proposal.proposed_by === 'handyman' ? proposal.handyman_note : proposal.client_note) && (
              <p className="text-sm text-gray-500 mt-1 italic">
                "{proposal.proposed_by === 'handyman' ? proposal.handyman_note : proposal.client_note}"
              </p>
            )}
          </div>
          {/* Date */}
          <div className="flex-shrink-0 text-right">
            <p className="text-2xl font-black text-orange-600">
              {proposal.proposed_date
                ? new Date(proposal.proposed_date).toLocaleDateString('ro-RO', {day:'2-digit',month:'short'})
                : '—'}
            </p>
            {proposal.proposed_time && <p className="text-sm text-gray-500">la {proposal.proposed_time}</p>}
            {proposal.proposed_date && (
              <p className="text-xs text-gray-400">
                {new Date(proposal.proposed_date).toLocaleDateString('ro-RO', {year:'numeric'})}
              </p>
            )}
          </div>
        </div>

        {/* Round counter */}
        <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
          <span>Runda {proposal.round_count}/{MAX_REWORK_ROUNDS}</span>
          <div className="flex gap-1">
            {[1,2,3,4].map(i => (
              <div key={i} className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
                ${i <= proposal.round_count ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-400'}`}>{i}</div>
            ))}
          </div>
        </div>

        {/* Timeline history */}
        {proposal.timeline?.length > 1 && (
          <div className="mt-3 space-y-1.5 border-t border-gray-50 pt-3">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Istoric</p>
            {proposal.timeline.map((entry, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0
                  ${entry.action === 'accept' ? 'bg-green-400' : entry.action === 'decline' ? 'bg-red-400' : 'bg-orange-400'}`} />
                <span className={entry.by === 'client' ? 'text-blue-600 font-medium' : 'text-purple-600 font-medium'}>
                  {entry.by === 'client' ? 'Tu' : handyName.split(' ')[0]}:
                </span>
                <span>
                  {entry.action === 'accept' ? 'Acceptat' :
                   entry.action === 'decline' ? 'Refuzat' :
                   (entry.date ? new Date(entry.date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' }) + (entry.time ? ` la ${entry.time}` : '') : '—')}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {needsMyResponse && !showCounter && (
          <div className="mt-4 space-y-2">
            <div className="flex gap-2">
              <button onClick={() => respond('accept')} disabled={responding}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 disabled:opacity-50 transition">
                {responding ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle className="w-4 h-4"/>}
                Acceptă
              </button>
              {canCounter && (
                <button onClick={() => setShowCounter(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition">
                  <CalendarClock className="w-4 h-4"/> Altă dată
                </button>
              )}
              <button onClick={() => respond('decline')} disabled={responding}
                className="px-4 py-2.5 border border-gray-200 text-gray-400 rounded-xl text-sm hover:bg-gray-50 hover:text-red-500 transition disabled:opacity-50">
                <XCircle className="w-4 h-4"/>
              </button>
            </div>
            {!canCounter && isPending && (
              <p className="text-xs text-center text-gray-400">Runde epuizate — poți accepta sau refuza.</p>
            )}
          </div>
        )}

        {/* Accepted state */}
        {isAccepted && (
          <div className="mt-4 pt-4 border-t border-green-100 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0"/>
            <div>
              <p className="text-sm font-bold text-green-800">Dată confirmată</p>
              <p className="text-xs text-green-600">
                {new Date(proposal.proposed_date).toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                {proposal.proposed_time && ` la ${proposal.proposed_time}`}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Counter form */}
      {showCounter && (
        <div className="border-t border-orange-100 bg-gradient-to-br from-orange-50 to-amber-50 px-5 py-4 space-y-3">
          <p className="text-xs font-bold text-orange-700 uppercase tracking-wide">
            Propune altă dată (Runda {proposal.round_count + 1}/{MAX_REWORK_ROUNDS})
          </p>
          <input
            type="date" min={CD_TODAY_STR}
            value={cDate}
            onChange={e => { setCDate(e.target.value); setCTime('') }}
            className="w-full px-3 py-2 border border-orange-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          {cDate && (
            <div>
              <p className="text-xs text-orange-600 mb-1.5">Ora <span className="text-orange-400">(opțional)</span></p>
              {slots.length === 0
                ? <p className="text-xs text-orange-600 italic">Nu mai sunt ore disponibile azi.</p>
                : (
                  <div className="grid grid-cols-5 gap-1.5">
                    {slots.map(t => (
                      <button key={t} type="button"
                        onClick={() => setCTime(prev => prev === t ? '' : t)}
                        className={`py-2 rounded-xl text-xs font-semibold border transition-all
                          ${cTime === t ? 'bg-orange-500 text-white border-orange-500' : 'bg-white border-orange-200 text-gray-700 hover:border-orange-400'}`}
                      >{t}</button>
                    ))}
                  </div>
                )}
            </div>
          )}
          <input type="text" placeholder="Notă opțională..." value={cNote}
            onChange={e => setCNote(e.target.value)}
            className="w-full px-3 py-2 border border-orange-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <div className="flex gap-2">
            <button onClick={() => { setShowCounter(false); setCDate(''); setCTime(''); setCNote('') }}
              className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-white transition font-medium">
              Anulează
            </button>
            <button onClick={() => respond('counter')} disabled={!cDate || responding}
              className="flex-[2] flex items-center justify-center gap-1.5 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 disabled:opacity-50 transition">
              {responding
                ? <Loader2 className="w-4 h-4 animate-spin"/>
                : <><Send className="w-3.5 h-3.5"/> Trimite contra-propunerea</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}