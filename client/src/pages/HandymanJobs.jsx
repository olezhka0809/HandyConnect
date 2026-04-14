import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import HandymanNavbar from '../components/handyman-dashboard/HandymanNavbar'
import JobRequestModal from '../components/handyman-dashboard/JobRequestModal'
import CompletedJobModal from '../components/handyman-dashboard/CompletedJobModal'
import TaskRequestModal from '../components/handyman-dashboard/TaskRequestModal'
import HandymanDisputeModal from '../components/handyman-dashboard/HandymanDisputeModal'
import {
  Search, Calendar, MapPin, Camera, CheckCircle,
  XCircle, MessageSquare, Play, RefreshCw, Loader2,
  AlertTriangle, Zap, Clock, Briefcase, Tag,
  TrendingDown, DollarSign, CalendarClock, ChevronRight,
  Star, User, ShieldAlert, Wrench, Shield, X as XIcon
} from 'lucide-react'

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtDate(dateStr, timeStr) {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    const label = d.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })
    return timeStr ? `${label} · ${timeStr}` : label
  } catch { return dateStr }
}
function fmtDateLong(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ro-RO', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })
}
function fmtPrice(val) {
  if (!val && val !== 0) return '—'
  return `${Number(val).toLocaleString('ro-RO')} RON`
}

function normaliseBooking(b) {
  const statusMap = { pending: 'new', accepted: 'accepted', in_progress: 'in_progress', delayed: 'delayed', completed: 'completed', cancelled: 'cancelled' }
  return {
    _type: 'booking', _id: b.id, _raw: b,
    title: b.handyman_services?.title ?? `Rezervare #${b.id.slice(0, 6)}`,
    client: b.contact_name || 'Client',
    clientId: b.client_id,
    description: b.handyman_notes ?? '',
    date: fmtDate(b.scheduled_date, b.scheduled_time),
    photos: [],
    address: b.service_address ?? '',
    price: fmtPrice(b.total ?? b.subtotal),
    urgency: b.urgency ?? 'normal',
    approximateDuration: b.handyman_services?.estimated_duration ?? null,
    uiStatus: statusMap[b.status] ?? 'new',
    created_at: b.created_at,
    category: null,
  }
}
function normaliseTask(t) {
  const clientName = t.profiles
    ? `${t.profiles.first_name ?? ''} ${t.profiles.last_name ?? ''}`.trim() || t.contact_name || 'Client'
    : t.contact_name || 'Client'
  const statusMap = {
    open: 'new', assigned: 'accepted', in_progress: 'in_progress',
    delayed: 'delayed', completed: 'completed',
    rework_pending:     'accepted',
    rework_in_progress: 'in_progress',
    rework_completed:   'completed',
    client_approved:    'completed',
    disputed:           'in_progress',
    under_admin_review: 'in_progress',
    // Terminal dispute statuses — task is done from handyman's perspective
    rework_marketplace: 'completed',
    reassign_rework:    'completed',
    refund_full:        'completed',
    refund_partial:     'completed',
    forced_accepted:    'completed',
    cancelled:          'completed',
  }
  // Derive dispute-active from status — more reliable than the DB flag
  // NOTE: rework_in_progress is intentionally excluded — it's normal work, not a dispute
  const DISPUTE_ACTIVE_STATUSES = new Set([
    'disputed', 'under_admin_review',
    'awaiting_client_rework_choice', 'handyman_declined_rework', 'rework_accepted',
  ])
  const isRework = t.status === 'rework_in_progress' || t.status === 'rework_completed' || t.is_rework === true
  const disputeLocked = DISPUTE_ACTIVE_STATUSES.has(t.status) || (t.dispute_locked ?? false)
  return {
    _type: 'task', _id: t.id, _raw: t,
    title: t.title ?? '—',
    client: clientName, clientId: t.client_id,
    description: t.description ?? '',
    date: fmtDate(t.scheduled_date, t.scheduled_time),
    photos: Array.isArray(t.photos) ? t.photos : [],
    address: [t.service_address, t.address_city].filter(Boolean).join(', '),
    price: fmtPrice(t.final_price ?? t.budget),
    urgency: t.urgency ?? 'normal',
    approximateDuration: t.approximate_duration ?? null,
    uiStatus: statusMap[t.status] ?? 'new',
    isRework,
    isReworkCompleted: t.status === 'rework_completed',
    disputeLocked,
    created_at: t.created_at,
    category: t.categories ?? null,
  }
}

// ─── badges ───────────────────────────────────────────────────────────────────

function TypeBadge({ type }) {
  if (type === 'task')
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200"><Briefcase className="w-2.5 h-2.5" />Task</span>
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-700 border border-teal-200"><Tag className="w-2.5 h-2.5" />Rezervare</span>
}
function UrgencyBadge({ urgency }) {
  const map = {
    high:   { label: 'Urgent', cls: 'bg-red-100 text-red-700', Icon: AlertTriangle },
    medium: { label: 'Mediu',  cls: 'bg-yellow-100 text-yellow-700', Icon: Zap },
    normal: { label: 'Normal', cls: 'bg-green-100 text-green-700', Icon: Clock },
    low:    { label: 'Normal', cls: 'bg-green-100 text-green-700', Icon: Clock },
  }
  const { label, cls, Icon } = map[urgency] ?? map.normal
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}><Icon className="w-2.5 h-2.5" />{label}</span>
}
function StatusBadge({ status, isRework, hasActiveRework, isReworkCompleted }) {
  const map = {
    new:         { label: 'Nou',        cls: 'bg-blue-100 text-blue-700' },
    accepted:    { label: isRework ? 'Relucrare acceptată' : 'Acceptat', cls: isRework ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700' },
    in_progress: { label: isRework ? 'Relucrare în desfășurare' : 'În Progres', cls: isRework ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-700' },
    delayed:     { label: 'Întârziat',  cls: 'bg-orange-100 text-orange-700' },
    completed:   isReworkCompleted
      ? { label: 'Așteptare client', cls: 'bg-yellow-100 text-yellow-700' }
      : (isRework && hasActiveRework)
        ? { label: 'Relucrare',      cls: 'bg-blue-100 text-blue-700' }
        : { label: 'Finalizat',      cls: 'bg-green-100 text-green-700' },
  }
  const { label, cls } = map[status] ?? map.new
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{label}</span>
}

// ─── constants ────────────────────────────────────────────────────────────────

// Rând 1: statusuri de workflow
const STATUS_TABS_ROW1 = [
  { id: 'all',         label: 'Toate' },
  { id: 'new',         label: 'Noi' },
  { id: 'accepted',    label: 'Acceptate' },
  { id: 'in_progress', label: 'În Progres' },
  { id: 'delayed',     label: 'Întârziate' },
  { id: 'completed',   label: 'Finalizate' },
]
// Rând 2: cozi speciale
const STATUS_TABS_ROW2 = [
  { id: 'proposed',     label: 'Propuse' },
  { id: 'negotiations', label: 'Negocieri' },
  { id: 'reschedule',   label: 'Reprogramate' },
  { id: 'disputes',     label: 'Dispute' },
]
const STATUS_TABS = [...STATUS_TABS_ROW1, ...STATUS_TABS_ROW2]
const URGENCY_OPTIONS = ['Toate', 'Urgent', 'Mediu', 'Normal']
const URGENCY_MAP     = { Urgent: 'high', Mediu: 'medium', Normal: 'normal' }
const DAY_MS          = 86_400_000

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function HandymanJobs() {
  const [userId,        setUserId]        = useState(null)
  const [jobs,          setJobs]          = useState([])
  const [proposedJobs,  setProposedJobs]  = useState([])   // tasks proposed directly to this handyman
  const [negotiations,  setNegotiations]  = useState([])   // task_offers by this handyman
  const [reworkProposals, setReworkProposals] = useState([]) // rework_proposals by this handyman
  const [reschedules,   setReschedules]   = useState([])   // reschedule_requests by this handyman
  const [disputes,      setDisputes]      = useState([])   // task_disputes where handyman must respond
  const [loading,       setLoading]       = useState(true)
  const [refreshing,    setRefreshing]    = useState(false)
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [activeTab,     setActiveTab]     = useState(location.state?.tab || 'all')
  const [searchQuery,   setSearchQuery]   = useState('')
  const [urgencyFilter, setUrgencyFilter] = useState('Toate')
  const [selectedJob,           setSelectedJob]           = useState(null)
  const [completedJob,          setCompletedJob]          = useState(null)
  const [startingId,            setStartingId]            = useState(null)
  const [pendingRescheduleId,   setPendingRescheduleId]   = useState(null)
  const [negotiateTask,         setNegotiateTask]         = useState(null)
  const [offerForm,             setOfferForm]             = useState({ proposed_price: '', estimated_duration: '', message: '', available_date: '', available_time: '' })
  const [sendingOffer,          setSendingOffer]          = useState(false)

  useEffect(() => {
    if (location.state?.tab) setActiveTab(location.state.tab)
  }, [location.state])

  const [handymanName,   setHandymanName]   = useState('')
  const [reworkStartJob, setReworkStartJob] = useState(null)   // job waiting for anti-bot before start

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUserId(data.user.id)
    })
  }, [])

  useEffect(() => {
    if (!userId) return
    supabase.from('profiles').select('first_name, last_name').eq('id', userId).maybeSingle()
      .then(({ data }) => {
        if (data) setHandymanName(`${data.first_name ?? ''} ${data.last_name ?? ''}`.trim())
      })
  }, [userId])

  const fetchJobs = useCallback(async (quiet = false) => {
    if (!userId) return
    quiet ? setRefreshing(true) : setLoading(true)
    try {
      const [bRes, aRes, pRes, negRes, reschedRes, dispRes, rwpRes] = await Promise.all([
        // Bookings assigned to this handyman
        supabase.from('bookings')
          .select('*, handyman_services(title)')
          .eq('handyman_id', userId)
          .neq('status', 'cancelled'),

        // Tasks assigned to this handyman
        supabase.from('tasks')
          .select('*, profiles!tasks_client_id_fkey(first_name,last_name,avatar_url), categories(id,name,icon)')
          .eq('handyman_id', userId),

        // Tasks proposed to this handyman (not yet assigned)
        supabase.from('tasks')
          .select('*, profiles!tasks_client_id_fkey(first_name,last_name,avatar_url), categories(id,name,icon)')
          .contains('proposed_to', [userId])
          .in('status', ['open', 'pending']),

        // task_offers: ALL offers sent by this handyman (all statuses for full history)
        supabase.from('task_offers')
          .select(`
            *,
            task:task_id (
              id, title, budget, status, contact_name, scheduled_date, scheduled_time, client_id,
              profiles!tasks_client_id_fkey(first_name, last_name, avatar_url)
            )
          `)
          .eq('handyman_id', userId)
          .eq('sent_by', 'handyman')
          .order('created_at', { ascending: false }),

        // Reschedule requests sent by this handyman (all statuses to show history)
        supabase.from('reschedule_requests')
          .select('*')
          .eq('handyman_id', userId)
          .order('created_at', { ascending: false })
          .limit(30),

        // Disputes where this handyman must respond (open, no response yet)
        supabase.from('task_disputes')
          .select(`
            id, task_id, status, details, photos, reason_id, created_at,
            rework_deadline, client_rework_confirmed_at, handyman_response, handyman_response_at, timeline, handyman_evidence,
            refund_amount, handyman_payout, admin_decision, resolution_note,
            task:task_id (id, title, status, final_price, client_id, is_rework, rework_level, profiles!tasks_client_id_fkey(first_name, last_name)),
            rejection_reasons!reason_id(name)
          `)
          .eq('handyman_id', userId)
          .not('status', 'in', '("closed","rejected")')
          .order('created_at', { ascending: false }),

        // Rework scheduling proposals submitted by this handyman
        supabase.from('rework_proposals')
          .select(`*, task:task_id(id, title, budget, is_rework, client_id,
            profiles!tasks_client_id_fkey(first_name, last_name, avatar_url))`)
          .eq('handyman_id', userId)
          .in('status', ['pending', 'accepted', 'declined'])
          .order('updated_at', { ascending: false })
          .limit(20),
      ])

      if (bRes.error) console.error('[HandymanJobs] bookings:', bRes.error)
      if (aRes.error) console.error('[HandymanJobs] assigned tasks:', aRes.error)
      if (pRes.error) console.error('[HandymanJobs] proposed tasks:', pRes.error)
      if (negRes.error) console.error('[HandymanJobs] task_offers:', negRes.error)
      if (reschedRes.error) console.error('[HandymanJobs] reschedule_requests:', reschedRes.error)
      if (dispRes.error) console.error('[HandymanJobs] disputes:', dispRes.error)

      const bookings = (bRes.data ?? []).map(normaliseBooking)
      // Proposed tasks (open, not yet assigned) — kept separate
      const proposedIds = new Set((pRes.data ?? []).map(t => t.id))
      const assignedTasks = (aRes.data ?? []).filter(t => !proposedIds.has(t.id)).map(normaliseTask)

      // Deduplicate negotiations first so we know which task IDs are already being negotiated
      const DISPUTE_STATUSES = new Set([
        'disputed','under_admin_review','rework_in_progress','rework_completed',
        'rework_marketplace','reassign_rework','refund_full','refund_partial',
        'forced_accepted','awaiting_client_rework_choice','handyman_declined_rework',
        'admin_proposed_rework','rework_accepted',
      ])
      const negMapTemp = new Map()
      ;(negRes.data ?? []).forEach(row => {
        // Hide negotiations whose task is in an active dispute status
        if (row.task && DISPUTE_STATUSES.has(row.task.status)) return
        if (!negMapTemp.has(row.task_id)) negMapTemp.set(row.task_id, row)
      })
      const negotiatedTaskIds = new Set(negMapTemp.keys())

      // Exclude proposed tasks that already have an active offer from this handyman
      const proposed = (pRes.data ?? [])
        .filter(t => !negotiatedTaskIds.has(t.id))
        .map(normaliseTask)
      setProposedJobs(proposed)

      const all = [...bookings, ...assignedTasks].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      )
      setJobs(all)
      const negMap = negMapTemp
      setNegotiations([...negMap.values()])
      setReschedules(reschedRes.data ?? [])
      setDisputes(dispRes.data ?? [])
      setReworkProposals(rwpRes.data ?? [])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [userId])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  const handleStartJob = async (job, e) => {
    e.stopPropagation()
    if (job.isRework) { setReworkStartJob(job); return }   // anti-bot gate for rework
    setStartingId(job._id)
    await doStartJob(job)
    setStartingId(null)
  }

  const doStartJob = async (job) => {
    const table = job._type === 'booking' ? 'bookings' : 'tasks'
    const newStatus = job._type === 'task' && job.isRework ? 'rework_in_progress' : 'in_progress'
    await supabase.from(table).update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', job._id)
    if (job.clientId) {
      await supabase.from('notifications').insert({
        user_id: job.clientId,
        type:    job.isRework ? 'rework_started' : 'task_started',
        title:   job.isRework ? 'Meșterul a început relucrarea' : 'Meșterul a început lucrarea',
        body:    job.isRework
          ? `„${job.title}" — relucrarea a început. Vei fi notificat când se termină.`
          : `„${job.title}" — meșterul a pornit lucrul. Poți urmări progresul din dashboard.`,
        data: {
          job_id: job._id, job_type: job._type, is_rework: job.isRework,
          redirect: job._type === 'booking' ? '/dashboard?tab=bookings' : '/dashboard?tab=tasks',
        },
      })
    }
    await fetchJobs(true)
  }

  const handleSendOffer = async () => {
    if (!offerForm.proposed_price || !negotiateTask) return
    setSendingOffer(true)
    const { error } = await supabase.from('task_offers').insert({
      task_id: negotiateTask._id,
      handyman_id: userId,
      proposed_price: parseFloat(offerForm.proposed_price),
      estimated_duration: offerForm.estimated_duration || null,
      message: offerForm.message || null,
      available_date: offerForm.available_date || null,
      available_time: offerForm.available_time || null,
    })
    if (!error) {
      await supabase.from('notifications').insert({
        user_id: negotiateTask.clientId,
        type: 'new_offer',
        title: 'Ofertă nouă primită',
        body: `Un meșter a trimis o ofertă de ${offerForm.proposed_price} RON pentru „${negotiateTask.title}"`,
        data: { task_id: negotiateTask._id, redirect: '/dashboard' },
      })
      // Remove from proposed list immediately (offer sent, no longer "proposed")
      setProposedJobs(prev => prev.filter(j => j._id !== negotiateTask._id))
      setNegotiateTask(null)
      setOfferForm({ proposed_price: '', estimated_duration: '', message: '', available_date: '', available_time: '' })
      setActiveTab('negotiations')
      fetchJobs(true)
    }
    setSendingOffer(false)
  }

  const yesterday = Date.now() - DAY_MS

  // Tasks with active disputes belong only in the Dispute tab, not in regular status tabs
  const nonDisputeJobs = jobs.filter(j => !j.disputeLocked)

  const filteredJobs = jobs.filter(job => {
    // Dispute-locked tasks are excluded from all regular status tabs
    if (job.disputeLocked) return false
    if (activeTab === 'new') {
      if (job.uiStatus !== 'new') return false
      if (new Date(job.created_at).getTime() < yesterday) return false
    } else if (activeTab === 'negotiations' || activeTab === 'reschedule' || activeTab === 'proposed' || activeTab === 'disputes') {
      return false
    } else if (activeTab !== 'all') {
      if (job.uiStatus !== activeTab) return false
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (!job.title.toLowerCase().includes(q) && !job.client.toLowerCase().includes(q) && !job.description.toLowerCase().includes(q)) return false
    }
    if (urgencyFilter !== 'Toate' && job.urgency !== URGENCY_MAP[urgencyFilter]) return false
    return true
  })

  const tabCount = id => {
    if (id === 'negotiations') return negotiations.length + reworkProposals.filter(p => p.status === 'pending').length
    if (id === 'reschedule') {
      const parseJson = (v) => { if (Array.isArray(v)) return v; try { return JSON.parse(v ?? '[]') } catch { return [] } }
      const pendingReworkDates = disputes.filter(d => {
        const tl = parseJson(d.timeline)
        return tl.some(e => e.event === 'client_proposed_new_rework_date') && !tl.some(e => e.event === 'handyman_confirmed_client_date')
      }).length
      return reschedules.length + pendingReworkDates
    }
    if (id === 'proposed')     return proposedJobs.length
    if (id === 'disputes')     return disputes.length
    if (id === 'all') return nonDisputeJobs.length
    if (id === 'new') return nonDisputeJobs.filter(j => j.uiStatus === 'new' && new Date(j.created_at).getTime() >= yesterday).length
    return nonDisputeJobs.filter(j => j.uiStatus === id).length
  }

  const pendingReworkTaskIds  = new Set(reworkProposals.filter(p => p.status === 'pending').map(p => p.task_id))
  const scheduledReworkTaskIds = new Set(reworkProposals.filter(p => p.status === 'accepted').map(p => p.task_id))
  const activeReworkTaskIds   = new Set([...pendingReworkTaskIds, ...scheduledReworkTaskIds])

  // map task_id → accepted proposal (for date display in banner)
  const acceptedReworkByTask = Object.fromEntries(
    reworkProposals.filter(p => p.status === 'accepted').map(p => [p.task_id, p])
  )

  const handleCardClick = (job) => {
    if (job.uiStatus === 'completed') {
      setCompletedJob(job)
    } else {
      setSelectedJob({ job, mode: job.uiStatus === 'in_progress' ? 'complete' : 'details' })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <HandymanNavbar />
      <div className="max-w-7xl mx-auto px-4 py-8">


                {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Job Pipeline</h1>
            <p className="text-gray-500 mt-1">Gestionează toate cererile și rezervările tale</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => fetchJobs(true)} disabled={refreshing}
              className="p-2.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition" title="Reîncarcă">
              <RefreshCw className={`w-4 h-4 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <select value={urgencyFilter} onChange={e => setUrgencyFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-lg bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {URGENCY_OPTIONS.map(u => <option key={u} value={u}>{u === 'Toate' ? 'Toate urgențele' : u}</option>)}
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Caută după titlu, client sau descriere..."
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>

        {/* Tabs — două rânduri */}
        <div className="mb-6 bg-white rounded-xl border border-gray-100 p-1.5 space-y-1">
          {/* Rând 1: workflow statuses */}
          <div className="flex gap-1">
            {STATUS_TABS_ROW1.map(tab => <TabButton key={tab.id} tab={tab} activeTab={activeTab} setActiveTab={setActiveTab} tabCount={tabCount} proposedJobs={proposedJobs} disputes={disputes} />)}
          </div>
          {/* Rând 2: cozi speciale */}
          <div className="flex gap-1 pt-0.5 border-t border-gray-100">
            {STATUS_TABS_ROW2.map(tab => <TabButton key={tab.id} tab={tab} activeTab={activeTab} setActiveTab={setActiveTab} tabCount={tabCount} proposedJobs={proposedJobs} disputes={disputes} />)}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            <p className="text-gray-400 text-sm">Se încarcă job-urile...</p>
          </div>

        ) : activeTab === 'proposed' ? (
          /* ══ PROPUSE ══ */
          proposedJobs.length === 0 ? (
            <div className="text-center py-16">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-800 mb-2">Niciun task propus</h3>
              <p className="text-gray-500">Taskurile propuse direct ție de clienți vor apărea aici.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {proposedJobs.map(job => (
                <ProposedJobCard
                  key={job._id}
                  job={job}
                  userId={userId}
                  handymanName={handymanName}
                  onAccepted={() => { fetchJobs(true); setActiveTab('accepted') }}
                  onNegotiate={() => {
                    setNegotiateTask(job)
                    setOfferForm({ proposed_price: job._raw?.budget ?? '', estimated_duration: '', message: '', available_date: '', available_time: '' })
                  }}
                />
              ))}
            </div>
          )

        ) : activeTab === 'negotiations' ? (
          /* ══ NEGOTIATIONS ══ */
          <NegotiationsView
            negotiations={negotiations}
            reworkProposals={reworkProposals}
            onRefresh={() => fetchJobs(true)}
          />

        ) : activeTab === 'reschedule' ? (
          /* ══ RESCHEDULE ══ */
          <RescheduleView
            reschedules={reschedules}
            disputes={disputes}
            jobs={jobs}
            onRefresh={() => fetchJobs(true)}
            onOpenModal={(job, rescheduleId) => {
              setPendingRescheduleId(rescheduleId)
              setSelectedJob({ job, mode: 'details' })
            }}
          />

        ) : activeTab === 'disputes' ? (
          /* ══ DISPUTES ══ */
          <DisputesView
            disputes={disputes}
            onRefresh={() => fetchJobs(true)}
          />

        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-16">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">Niciun job găsit</h3>
            <p className="text-gray-500">
              {activeTab === 'new' ? 'Nu există cereri noi în ultimele 24 de ore.' : 'Încearcă să modifici filtrele.'}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filteredJobs.map(job => (
              <JobCard key={`${job._type}-${job._id}`} job={job} startingId={startingId}
                onOpen={handleCardClick}
                onOpenModal={(j, mode) => setSelectedJob({ job: j, mode })}
                onStartJob={handleStartJob}
                onMessage={(j) => navigate(`/handyman/messages?${j._type}_id=${j._id}`)}
                activeReworkTaskIds={activeReworkTaskIds}
                scheduledReworkTaskIds={scheduledReworkTaskIds}
                acceptedReworkByTask={acceptedReworkByTask} />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedJob && (
        <JobRequestModal
          job={selectedJob.job}
          initialMode={selectedJob.mode}
          userId={userId}
          handymanName={handymanName}
          onClose={() => { setSelectedJob(null); setPendingRescheduleId(null) }}
          onUpdate={async () => {
            if (pendingRescheduleId) {
              await supabase.from('reschedule_requests')
                .update({ status: 'accepted', responded_at: new Date().toISOString() })
                .eq('id', pendingRescheduleId)
              setPendingRescheduleId(null)
            }
            setSelectedJob(null)
            fetchJobs(true)
          }}
        />
      )}
      {completedJob && (
        <CompletedJobModal
          job={completedJob}
          onClose={() => setCompletedJob(null)}
        />
      )}
      <TaskRequestModal
        isOpen={!!negotiateTask}
        task={negotiateTask?._raw}
        mode="negotiate"
        form={offerForm}
        setForm={setOfferForm}
        onSubmit={handleSendOffer}
        onClose={() => setNegotiateTask(null)}
        sending={sendingOffer}
      />
      {reworkStartJob && (
        <ReworkStartModal
          job={reworkStartJob}
          onConfirm={async () => {
            setReworkStartJob(null)
            setStartingId(reworkStartJob._id)
            await doStartJob(reworkStartJob)
            setStartingId(null)
          }}
          onCancel={() => setReworkStartJob(null)}
        />
      )}
    </div>
  )
}

// ─── REWORK START ANTI-BOT MODAL ─────────────────────────────────────────────

const REWORK_WORDS = ['ROȘU','RAPID','VERDE','ALBASTRU','MUNTE','STEJAR','FULGER','FLUTURE','PIATRA','DRUM']
function randomReworkPhrase() {
  const w = REWORK_WORDS[Math.floor(Math.random() * REWORK_WORDS.length)]
  const n = Array.from({ length: 3 }, () => Math.floor(Math.random() * 10)).join('')
  return `REWORK-${w}-${n}`
}

function ReworkStartModal({ job, onConfirm, onCancel }) {
  const [botDone,     setBotDone]     = useState(false)
  const [botSpinning, setBotSpinning] = useState(false)
  const [phrase]                      = useState(() => randomReworkPhrase())
  const [phraseInput, setPhraseInput] = useState('')
  const [confirming,  setConfirming]  = useState(false)
  const phraseOk = phraseInput.trim().toUpperCase() === phrase

  const handleBotClick = () => {
    if (botDone || botSpinning) return
    setBotSpinning(true)
    setTimeout(() => { setBotSpinning(false); setBotDone(true) }, 1400)
  }
  const handleConfirm = async () => {
    if (!botDone || !phraseOk) return
    setConfirming(true)
    await onConfirm()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center sm:px-4" onClick={onCancel}>
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl p-6 space-y-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-gray-800 text-base">Confirmă începerea relucrării</h3>
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{job.title}</p>
          </div>
          <button onClick={onCancel} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center flex-shrink-0">
            <XIcon className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs text-orange-800">
          <p className="font-bold mb-1">Atenție — această acțiune va notifica clientul că relucrarea a început.</p>
          <p>Asigură-te că ești la locul lucrării și ești pregătit să efectuezi relucrarea.</p>
        </div>

        {/* Robot checkbox */}
        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div onClick={handleBotClick}
              className={`w-6 h-6 rounded border-2 flex items-center justify-center cursor-pointer transition-all
                ${!botDone && !botSpinning ? 'border-gray-400 bg-white hover:border-blue-500' : ''}
                ${botSpinning ? 'border-blue-500 bg-white' : ''}
                ${botDone ? 'border-green-500 bg-green-500' : ''}`}>
              {botSpinning && <svg className="w-4 h-4 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeLinecap="round"/></svg>}
              {botDone && <CheckCircle className="w-4 h-4 text-white" />}
            </div>
            <span className="text-sm text-gray-700 font-medium">Nu sunt robot</span>
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 text-xs text-gray-400"><Shield className="w-3 h-3" />reCAPTCHA</div>
          </div>
        </div>

        {/* Phrase confirmation */}
        <div className="space-y-2">
          <p className="text-xs text-gray-600">Scrie exact codul de mai jos pentru a confirma:</p>
          <div className="bg-gray-100 rounded-xl px-4 py-2.5 text-center font-mono font-bold text-gray-800 tracking-widest text-sm select-none">
            {phrase}
          </div>
          <input
            value={phraseInput}
            onChange={e => setPhraseInput(e.target.value)}
            placeholder="Scrie codul aici..."
            className={`w-full px-4 py-2.5 border-2 rounded-xl text-sm font-mono text-center focus:outline-none transition ${phraseOk ? 'border-green-400 bg-green-50' : phraseInput ? 'border-red-300' : 'border-gray-300'}`}
          />
        </div>

        <button
          onClick={handleConfirm}
          disabled={!botDone || !phraseOk || confirming}
          className="w-full flex items-center justify-center gap-2 py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 disabled:opacity-50 transition">
          {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Play className="w-4 h-4" /> Începe Relucrarea</>}
        </button>
      </div>
    </div>
  )
}

// ─── TAB BUTTON ───────────────────────────────────────────────────────────────

function TabButton({ tab, activeTab, setActiveTab, tabCount, proposedJobs, disputes }) {
  const count     = tabCount(tab.id)
  const hasAlert  = tab.id === 'proposed' && proposedJobs.length > 0
  const hasUrgent = tab.id === 'disputes'  && disputes.some(d => d.status === 'open' && !d.handyman_response_at)
  const isActive  = activeTab === tab.id

  return (
    <button
      onClick={() => setActiveTab(tab.id)}
      className={`relative flex items-center gap-1 flex-1 py-2 px-1.5 rounded-lg text-xs font-medium justify-center transition-all
        ${isActive
          ? 'bg-blue-600 text-white shadow-sm'
          : hasUrgent
            ? 'text-red-700 hover:bg-red-50'
            : hasAlert
              ? 'text-purple-700 hover:bg-purple-50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
        }`}
    >
      {tab.id === 'negotiations' && <TrendingDown className="w-3 h-3 flex-shrink-0" />}
      {tab.id === 'reschedule'   && <CalendarClock className="w-3 h-3 flex-shrink-0" />}
      {tab.id === 'proposed'     && <User className="w-3 h-3 flex-shrink-0" />}
      {tab.id === 'disputes'     && <ShieldAlert className="w-3 h-3 flex-shrink-0" />}
      <span className="truncate">{tab.label}</span>
      {count > 0 && (
        <span className={`min-w-[18px] px-1 py-0.5 rounded text-[10px] font-bold flex-shrink-0 text-center
          ${isActive
            ? 'bg-blue-500 text-white'
            : hasUrgent
              ? 'bg-red-100 text-red-600'
              : hasAlert
                ? 'bg-orange-100 text-orange-600'
                : 'bg-gray-100 text-gray-500'
          }`}>
          {count}
        </span>
      )}
    </button>
  )
}

// ─── JOB CARD ─────────────────────────────────────────────────────────────────

function JobCard({ job, startingId, onOpen, onOpenModal, onStartJob, onMessage, activeReworkTaskIds, scheduledReworkTaskIds, acceptedReworkByTask }) {
  const isStarting      = startingId === job._id
  const hasActiveRework = job.isRework && (activeReworkTaskIds?.has(job._id) ?? false)
  const isScheduled     = job.isRework && (scheduledReworkTaskIds?.has(job._id) ?? false)
  const scheduledProp   = isScheduled ? acceptedReworkByTask?.[job._id] : null
  const showReworkAcceptedBanner  = job.isRework && !hasActiveRework && !isScheduled && job.uiStatus === 'accepted'
  const showReworkInProgressBanner = job.isRework && !hasActiveRework && !isScheduled && job.uiStatus === 'in_progress'
  const showReworkNecessaryBanner  = job.isRework && !hasActiveRework && !isScheduled && job.uiStatus !== 'accepted' && job.uiStatus !== 'in_progress' && job.uiStatus !== 'completed' && job.uiStatus !== 'client_approved'
  return (
    <div className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer border ${
      isScheduled              ? 'border-blue-300' :
      hasActiveRework          ? 'border-orange-300' :
      showReworkInProgressBanner ? 'border-red-300' :
      showReworkAcceptedBanner ? 'border-orange-300' :
      showReworkNecessaryBanner ? 'border-red-300' : 'border-gray-100'
    }`}
      onClick={() => onOpen(job)}>
      {isScheduled && job.uiStatus !== 'completed' && (
        <div className="bg-blue-600 text-white text-xs font-bold px-4 py-1.5 flex items-center gap-1.5 rounded-t-xl">
          <CalendarClock className="w-3.5 h-3.5" />
          RELUCRARE PROGRAMATĂ{scheduledProp?.proposed_date ? ` — ${new Date(scheduledProp.proposed_date).toLocaleDateString('ro-RO',{day:'numeric',month:'short'})}${scheduledProp.proposed_time ? ` la ${scheduledProp.proposed_time}` : ''}` : ''}
        </div>
      )}
      {!isScheduled && hasActiveRework && job.uiStatus !== 'completed' && (
        <div className="bg-orange-500 text-white text-xs font-bold px-4 py-1.5 flex items-center gap-1.5 rounded-t-xl">
          <CalendarClock className="w-3.5 h-3.5" /> PROPUNERE PROGRAMARE ACTIVĂ
        </div>
      )}
      {showReworkAcceptedBanner && (
        <div className="bg-orange-500 text-white text-xs font-bold px-4 py-1.5 flex items-center gap-1.5 rounded-t-xl">
          <Wrench className="w-3.5 h-3.5" /> RELUCRARE ACCEPTATĂ — PREGĂTIT DE START
        </div>
      )}
      {showReworkInProgressBanner && (
        <div className="bg-red-600 text-white text-xs font-bold px-4 py-1.5 flex items-center gap-1.5 rounded-t-xl">
          <Wrench className="w-3.5 h-3.5" /> RELUCRARE ÎN DESFĂȘURARE
        </div>
      )}
      {showReworkNecessaryBanner && (
        <div className="bg-red-600 text-white text-xs font-bold px-4 py-1.5 flex items-center gap-1.5 rounded-t-xl">
          <Wrench className="w-3.5 h-3.5" /> RELUCRARE NECESARĂ
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0 pr-3">
            <h3 className="font-bold text-gray-800 leading-snug">{job.title}</h3>
            <p className="text-sm text-gray-500 mt-0.5">{job.client}</p>
          </div>
          <TypeBadge type={job._type} />
        </div>
        {job.description && <p className="text-sm text-gray-600 mb-3 line-clamp-2">{job.description}</p>}
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mb-3">
          <div className="flex items-center gap-1"><Calendar className="w-3 h-3" /><span>{job.date}</span></div>
          {job.approximateDuration && <div className="flex items-center gap-1"><Clock className="w-3 h-3" /><span>{job.approximateDuration}</span></div>}
          {job.photos.length > 0 && <div className="flex items-center gap-1"><Camera className="w-3 h-3" /><span>{job.photos.length} {job.photos.length === 1 ? 'Poză' : 'Poze'}</span></div>}
          {job.address && <div className="flex items-center gap-1"><MapPin className="w-3 h-3" /><span className="truncate max-w-[180px]">{job.address}</span></div>}
        </div>
        <div className="flex items-center gap-2 mb-4">
          <UrgencyBadge urgency={job.urgency} />
          <StatusBadge status={job.uiStatus} isRework={job.isRework} hasActiveRework={hasActiveRework} isReworkCompleted={job.isReworkCompleted} />
          {job.category && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{job.category.name}</span>}
        </div>
        <div className="flex items-center gap-6 mb-4 pb-4 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-400">{job.uiStatus === 'completed' ? 'Preț final' : 'Estimare'}</p>
            <p className="font-bold text-blue-600">{job.price}</p>
          </div>
        </div>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          {job.uiStatus === 'new' && <>
            <button onClick={() => onOpenModal(job, 'details')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition">
              <CheckCircle className="w-3.5 h-3.5" /> Acceptă
            </button>
            <button onClick={() => onOpenModal(job, 'decline')}
              className="flex items-center justify-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition">
              <XCircle className="w-3.5 h-3.5" /> Refuză
            </button>
            <button onClick={() => onOpenModal(job, 'reschedule')}
              className="flex items-center justify-center gap-1 px-3 py-2 border border-gray-200 text-gray-400 text-xs font-medium rounded-lg hover:bg-gray-50 hover:text-blue-600 hover:border-blue-300 transition" title="Reprogramează">
              <CalendarClock className="w-3.5 h-3.5" />
            </button>
          </>}
          {job.uiStatus === 'accepted' && <>
            <button onClick={e => onStartJob(job, e)} disabled={isStarting}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-60">
              {isStarting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {job.isRework ? 'Începe Relucrarea' : 'Începe Job'}
            </button>
            <button onClick={() => onOpenModal(job, 'reschedule')}
              className="flex items-center justify-center gap-1 px-3 py-2 border border-gray-200 text-gray-400 text-xs font-medium rounded-lg hover:bg-gray-50 hover:text-blue-600 hover:border-blue-300 transition" title="Reprogramează">
              <CalendarClock className="w-3.5 h-3.5" />
            </button>
          </>}
          {job.uiStatus === 'in_progress' && !job.disputeLocked && <>
            <button onClick={() => onOpenModal(job, 'complete')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition">
              <CheckCircle className="w-3.5 h-3.5" /> {job.isRework ? 'Marchează Relucrare Finalizată' : 'Marchează Finalizat'}
            </button>
            <button onClick={() => onMessage?.(job)} className="flex items-center justify-center gap-1 px-3 py-2 border border-blue-200 text-blue-600 text-xs font-medium rounded-lg hover:bg-blue-50 transition">
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
          </>}
          {job.uiStatus === 'in_progress' && job.disputeLocked && (
            <div className="flex-1 flex items-center gap-1.5 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-700 font-medium">
              <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" /> Dispută activă — în analiză
            </div>
          )}
          {job.uiStatus === 'delayed' && <>
            <button onClick={() => onOpenModal(job, 'details')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-orange-600 text-white text-xs font-medium rounded-lg hover:bg-orange-700 transition">
              <AlertTriangle className="w-3.5 h-3.5" /> Gestionează Întârzierea
            </button>
            <button onClick={() => onOpenModal(job, 'complete')}
              className="flex items-center justify-center gap-1 px-3 py-2 border border-green-200 text-green-700 text-xs font-medium rounded-lg hover:bg-green-50 transition">
              <CheckCircle className="w-3.5 h-3.5" />
            </button>
          </>}
          {job.uiStatus === 'completed' && job.isReworkCompleted && (
            <button onClick={() => onOpen(job)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs font-medium rounded-lg hover:bg-yellow-100 transition">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" /> Așteptare aprobare client — Vezi dovezi
            </button>
          )}
          {job.uiStatus === 'completed' && !job.isReworkCompleted && job.isRework && (
            <button onClick={() => onOpen(job)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-50 border border-green-200 text-green-700 text-xs font-medium rounded-lg hover:bg-green-100 transition">
              <CheckCircle className="w-3.5 h-3.5" /> Relucrare aprobată — Vezi detalii
            </button>
          )}
          {job.uiStatus === 'completed' && !job.isRework && (
            <button onClick={() => onOpen(job)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gray-100 text-gray-500 text-xs font-medium rounded-lg hover:bg-gray-200 transition">
              <CheckCircle className="w-3.5 h-3.5 text-green-500" /> Vezi Detalii Finalizare
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── PROPOSED JOB CARD ───────────────────────────────────────────────────────

function ProposedJobCard({ job, userId, handymanName, onAccepted, onNegotiate }) {
  const [accepting, setAccepting] = useState(false)

  const handleAccept = async (e) => {
    e.stopPropagation()
    setAccepting(true)
    try {
      const { data: updated, error: updateError } = await supabase.from('tasks').update({
        status: 'assigned',
        handyman_id: userId,
        updated_at: new Date().toISOString(),
      }).eq('id', job._id).select('id')

      if (updateError || !updated?.length) {
        console.error('[ProposedJobCard] task update failed:', updateError ?? 'RLS blocked (0 rows updated)')
        alert(`Acceptarea a eșuat: ${updateError?.message ?? 'permisiuni insuficiente (RLS)'}`)
        return
      }

      await supabase.from('notifications').insert({
        user_id: job.clientId,
        type: 'task_allocated',
        title: 'Task alocat meșterului',
        body: `Taskul „${job.title}" a fost alocat lui ${handymanName || 'un meșter'}.`,
        data: { task_id: job._id, redirect: '/dashboard?tab=tasks' },
      })

      // Creare conversație — doar dacă nu există deja
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('client_id', job.clientId)
        .eq('handyman_id', userId)
        .eq('task_id', job._id)
        .maybeSingle()
      if (!existingConv) {
        await supabase.from('conversations').insert({
          client_id: job.clientId,
          handyman_id: userId,
          task_id: job._id,
        })
      }

      onAccepted?.()
    } finally {
      setAccepting(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border-2 border-purple-200 shadow-sm p-5">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0 pr-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">📩 Propus de client</span>
          </div>
          <h3 className="font-bold text-gray-800 leading-snug">{job.title}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{job.client}</p>
        </div>
        <UrgencyBadge urgency={job.urgency} />
      </div>

      {job.description && <p className="text-sm text-gray-600 mb-3 line-clamp-2">{job.description}</p>}

      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mb-3">
        <div className="flex items-center gap-1"><Calendar className="w-3 h-3" /><span>{job.date}</span></div>
        {job.photos.length > 0 && <div className="flex items-center gap-1"><Camera className="w-3 h-3" /><span>{job.photos.length} poze</span></div>}
        {job.address && <div className="flex items-center gap-1"><MapPin className="w-3 h-3" /><span className="truncate max-w-[180px]">{job.address}</span></div>}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div>
          <p className="text-xs text-gray-400">Buget client</p>
          <p className="font-bold text-lg text-gray-800">{job.price}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition disabled:opacity-60"
          >
            {accepting
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <CheckCircle className="w-3.5 h-3.5" />}
            Acceptă ({job.price})
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onNegotiate?.() }}
            className="flex items-center gap-1.5 px-4 py-2 border border-blue-200 bg-blue-50 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-100 transition"
          >
            <MessageSquare className="w-3.5 h-3.5" /> Negociază
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── NEGOTIATIONS VIEW ────────────────────────────────────────────────────────

function NegotiationsView({ negotiations, reworkProposals = [], onRefresh }) {
  const isEmpty = negotiations.length === 0 && reworkProposals.length === 0
  if (isEmpty) return (
    <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
      <TrendingDown className="w-12 h-12 text-gray-200 mx-auto mb-4" />
      <h3 className="text-lg font-bold text-gray-800 mb-2">Nicio negociere activă</h3>
      <p className="text-gray-500 text-sm">Ofertele de preț și propunerile de programare relucrare vor apărea aici.</p>
    </div>
  )

  return (
    <div className="space-y-8">
      {/* ── Price offer negotiations ── */}
      {negotiations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-bold text-gray-800">Ofertele Tale de Preț</h2>
            <span className="px-2.5 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">{negotiations.length} oferte</span>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {negotiations.map(neg => (
              <NegotiationCard key={neg.id} neg={neg} onRefresh={onRefresh} />
            ))}
          </div>
        </div>
      )}

      {/* ── Rework scheduling proposals ── */}
      {reworkProposals.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-bold text-gray-800">Propuneri Programare Relucrare</h2>
            <span className="px-2.5 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">
              {reworkProposals.filter(p => p.status === 'pending').length} active
            </span>
          </div>
          <div className="space-y-4">
            {reworkProposals.map(prop => (
              <ReworkProposalCard key={prop.id} proposal={prop} onRefresh={onRefresh} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── NEGOTIATION CARD ─────────────────────────────────────────────────────────
// task_offers: id, task_id, handyman_id, proposed_price,
// estimated_duration, message, available_date, available_time, status, created_at
// Limită: max 3 runde de negociere per ofertă

const MAX_ROUNDS = 5

function NegotiationCard({ neg, onRefresh }) {
  const [withdrawing,  setWithdrawing]  = useState(false)
  const [accepting,    setAccepting]    = useState(false)
  const [showCounter,    setShowCounter]    = useState(false)
  const [counterPrice,   setCounterPrice]   = useState('')
  const [counterMsg,     setCounterMsg]     = useState('')
  const [showReschedule, setShowReschedule] = useState(false)
  const [reschedDate,    setReschedDate]    = useState('')
  const [reschedTime,    setReschedTime]    = useState('')
  const [reschedMsg,     setReschedMsg]     = useState('')
  const [sending,        setSending]        = useState(false)

  const HJ_TODAY = new Date().toISOString().split('T')[0]
  const HJ_SLOTS = ['07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00']
  const hjToMins = t => { const [h,m] = t.split(':'); return parseInt(h)*60+parseInt(m) }
  const hjSlots  = d => d === HJ_TODAY ? HJ_SLOTS.filter(t => hjToMins(t) > new Date().getHours()*60+new Date().getMinutes()) : HJ_SLOTS

  // task_offers.task joined → title, budget, profiles
  const task         = neg.task
  const taskTitle    = task?.title ?? `Task #${neg.task_id?.slice(0,6).toUpperCase()}`
  const clientName   = task?.profiles
    ? `${task.profiles.first_name ?? ''} ${task.profiles.last_name ?? ''}`.trim() || 'Client'
    : 'Client'
  const originalBudget = task?.budget
  const isCountered    = neg.status === 'negotiating'

  // All offers for this task ordered chronologically
  // Row index 0,2,4 = handyman offers  |  Row index 1,3,5 = client counters
  const [allOffers,      setAllOffers]      = useState([])
  const [handymanRounds, setHandymanRounds] = useState(0)
  const [clientRounds,   setClientRounds]   = useState(0)
  const [counterOffer,   setCounterOffer]   = useState(null)

  useEffect(() => {
    supabase.from('task_offers')
      .select('id, proposed_price, message, status, created_at, handyman_id, sent_by, estimated_duration, available_date, available_time')
      .eq('task_id', neg.task_id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        const rows = data ?? []
        setAllOffers(rows)
        // Use sent_by to count rounds accurately
        const hRounds = rows.filter(r => (r.sent_by ?? 'handyman') === 'handyman').length
        const cRounds = rows.filter(r => r.sent_by === 'client').length
        setHandymanRounds(hRounds)
        setClientRounds(cRounds)
        // Client's latest counter = most recent row with sent_by='client' and status='pending'
        if (isCountered) {
          const clientCounter = [...rows]
            .reverse()
            .find(r => r.sent_by === 'client' && r.status === 'pending')
          setCounterOffer(clientCounter ?? null)
        }
      })
  }, [neg.task_id, neg.id, isCountered])

  // Status flags — declared here so canCounter/roundsExhausted can use them
  const isRejected = neg.status === 'rejected'
  const isAccepted = neg.status === 'accepted'

  const canCounter      = !isRejected && !isAccepted && isCountered && counterOffer != null && handymanRounds < MAX_ROUNDS
  const roundsExhausted = !isRejected && !isAccepted && handymanRounds >= MAX_ROUNDS

  const handleWithdraw = async () => {
    setWithdrawing(true)
    await supabase.from('task_offers').update({ status: 'rejected' }).eq('id', neg.id)
    onRefresh()
  }

  const handleAcceptCounter = async () => {
    if (!counterOffer) return
    setAccepting(true)
    // Accept both the client's counter and the handyman's own offer (so the card shows "Acceptat")
    await supabase.from('task_offers').update({ status: 'accepted' })
      .eq('task_id', neg.task_id).in('id', [counterOffer.id, neg.id])
    // Reject any remaining unrelated offers on this task
    await supabase.from('task_offers').update({ status: 'rejected' })
      .eq('task_id', neg.task_id)
      .neq('id', counterOffer.id)
      .neq('id', neg.id)
    // Assign task at the agreed price
    const { data: updatedTask, error: taskErr } = await supabase.from('tasks').update({
      handyman_id: neg.handyman_id,
      status:      'assigned',
      final_price: counterOffer.proposed_price,
      updated_at:  new Date().toISOString(),
    }).eq('id', neg.task_id).select('id')
    if (taskErr || !updatedTask?.length) {
      console.error('[handleAcceptCounter] task update failed:', taskErr ?? 'RLS blocked (0 rows)')
    }

    // Create conversation if not already present
    const clientId = task?.client_id
    if (clientId && neg.handyman_id) {
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('client_id', clientId)
        .eq('handyman_id', neg.handyman_id)
        .eq('task_id', neg.task_id)
        .maybeSingle()
      if (!existingConv) {
        const { error: convErr } = await supabase.from('conversations').insert({
          client_id:   clientId,
          handyman_id: neg.handyman_id,
          task_id:     neg.task_id,
        })
        if (convErr) console.error('[handleAcceptCounter] conversation insert failed:', convErr)
      }
    } else {
      console.warn('[handleAcceptCounter] missing clientId or handyman_id', { clientId, handyman_id: neg.handyman_id, task })
    }

    onRefresh()
  }

  const handleSendCounter = async () => {
    if (!counterPrice || !counterOffer) return
    setSending(true)
    // Mark client's counter as 'negotiating' (client's turn is done)
    await supabase.from('task_offers').update({ status: 'negotiating' }).eq('id', counterOffer.id)
    // Insert handyman's new counter-offer with sent_by: 'handyman'
    await supabase.from('task_offers').insert({
      task_id:            neg.task_id,
      handyman_id:        neg.handyman_id,
      proposed_price:     Number(counterPrice),
      message:            counterMsg || null,
      status:             'pending',
      sent_by:            'handyman',
      estimated_duration: neg.estimated_duration || null,
      available_date:     neg.available_date || null,
      available_time:     neg.available_time || null,
      created_at:         new Date().toISOString(),
      updated_at:         new Date().toISOString(),
    })
    if (task?.client_id) {
      await supabase.from('notifications').insert({
        user_id: task.client_id,
        type: 'new_offer',
        title: 'Contra-ofertă primită',
        body: `Meșteșugarul a propus ${counterPrice} RON pentru „${taskTitle}"`,
        data: { task_id: neg.task_id },
      })
    }
    setSending(false)
    setShowCounter(false)
    setCounterPrice('')
    setCounterMsg('')
    onRefresh()
  }

  const handleSendReschedule = async () => {
    if (!reschedDate || !counterOffer) return
    setSending(true)
    await supabase.from('task_offers').update({ status: 'negotiating' }).eq('id', counterOffer.id)
    await supabase.from('task_offers').insert({
      task_id:            neg.task_id,
      handyman_id:        neg.handyman_id,
      proposed_price:     neg.proposed_price,
      message:            reschedMsg || null,
      status:             'pending',
      sent_by:            'handyman',
      estimated_duration: neg.estimated_duration || null,
      available_date:     reschedDate,
      available_time:     reschedTime || null,
      created_at:         new Date().toISOString(),
      updated_at:         new Date().toISOString(),
    })
    if (task?.client_id) {
      await supabase.from('notifications').insert({
        user_id: task.client_id,
        type: 'new_offer',
        title: 'Contra-ofertă primită',
        body: `Meșteșugarul a propus o nouă dată pentru „${taskTitle}"`,
        data: { task_id: neg.task_id },
      })
    }
    setSending(false)
    setShowReschedule(false)
    setReschedDate('')
    setReschedTime('')
    setReschedMsg('')
    onRefresh()
  }

  const stripeColor = isRejected ? 'bg-red-300' : isAccepted ? 'bg-green-400' : isCountered ? 'bg-orange-400' : 'bg-blue-400'
  const statusLabel = isRejected ? 'Refuzat' : isAccepted ? 'Acceptat' : isCountered ? 'Contra-ofertă' : 'În așteptare'
  const statusCls   = isRejected ? 'bg-red-100 text-red-700' : isAccepted ? 'bg-green-100 text-green-700' : isCountered ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${isRejected ? 'border-red-200 opacity-70' : isAccepted ? 'border-green-200' : 'border-gray-200'}`}>
      {/* Top color stripe */}
      <div className={`h-1 w-full ${stripeColor}`} />

      <div className="p-4">
        {/* Header: title + client + status badge */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 pr-2">
            <p className="font-bold text-gray-800 text-sm line-clamp-1">{taskTitle}</p>
            <p className="text-xs text-gray-400 mt-0.5">{clientName}</p>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${statusCls}`}>
            {statusLabel}
          </span>
        </div>

        {/* Rejected notice */}
        {isRejected && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-3 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-500 flex-shrink-0"/>
            <div>
              <p className="text-xs font-bold text-red-600">Oferta a fost refuzată</p>
              <p className="text-xs text-red-400">Clientul a decis să nu accepte oferta ta de {fmtPrice(neg.proposed_price)}</p>
            </div>
          </div>
        )}

        {/* Accepted notice */}
        {isAccepted && (
          <div className="bg-green-50 border border-green-100 rounded-xl p-3 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0"/>
            <div>
              <p className="text-xs font-bold text-green-600">Oferta a fost acceptată!</p>
              <p className="text-xs text-green-500">Taskul apare acum în tab-ul Acceptate</p>
            </div>
          </div>
        )}

        {/* Prices row — clean horizontal layout */}
        <div className="flex items-center gap-2 mb-3">
          {originalBudget && <>
            <div className="flex-1 bg-gray-50 rounded-lg p-2.5 text-center">
              <p className="text-[10px] text-gray-400 mb-0.5">Buget</p>
              <p className="text-sm font-bold text-gray-600">{fmtPrice(originalBudget)}</p>
            </div>
            <span className="text-gray-300 text-lg">→</span>
          </>}
          <div className={`flex-1 rounded-lg p-2.5 text-center ${isCountered ? 'bg-gray-50' : 'bg-blue-50'}`}>
            <p className="text-[10px] text-blue-500 mb-0.5">Oferta ta</p>
            <p className="text-sm font-bold text-blue-700">{fmtPrice(neg.proposed_price)}</p>
          </div>
          {isCountered && counterOffer && <>
            <span className="text-gray-300 text-lg">⇄</span>
            <div className="flex-1 bg-orange-50 rounded-lg p-2.5 text-center border border-orange-200">
              <p className="text-[10px] text-orange-500 mb-0.5">Client propune</p>
              <p className="text-sm font-bold text-orange-700">{fmtPrice(counterOffer.proposed_price)}</p>
            </div>
          </>}
          {isCountered && !counterOffer && <>
            <span className="text-gray-300 text-lg">→</span>
            <div className="flex-1 bg-gray-50 rounded-lg p-2.5 text-center border border-dashed border-gray-200">
              <p className="text-[10px] text-gray-400 mb-0.5">Client</p>
              <Loader2 className="w-3 h-3 text-gray-300 animate-spin mx-auto" />
            </div>
          </>}
        </div>

        {/* Rounds indicator: separate for handyman and client */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-400 font-medium">Tu:</span>
            {[1,2,3,4,5].map(i => (
              <span key={i} className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border
                ${i <= handymanRounds
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-300 border-gray-200'}`}>
                {i}
              </span>
            ))}
          </div>
          <div className="w-px h-4 bg-gray-200" />
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-400 font-medium">Client:</span>
            {[1,2,3,4,5].map(i => (
              <span key={i} className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border
                ${i <= clientRounds
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-gray-300 border-gray-200'}`}>
                {i}
              </span>
            ))}
          </div>
          {roundsExhausted && (
            <span className="text-xs text-red-500 font-medium">· Limita ta atinsă</span>
          )}
        </div>

        {/* Messages */}
        {neg.message && (
          <p className="text-xs text-gray-500 italic bg-gray-50 rounded-lg px-3 py-2 mb-2">
            Tu: "{neg.message}"
          </p>
        )}
        {isCountered && counterOffer?.message && (
          <p className="text-xs text-orange-700 italic bg-orange-50 rounded-lg px-3 py-2 mb-2">
            Client: "{counterOffer.message}"
          </p>
        )}

        {/* Diff chips — what client changed vs handyman's last offer */}
        {isCountered && counterOffer && (() => {
          const prevH = [...allOffers].reverse().find(r => (r.sent_by ?? 'handyman') === 'handyman')
          if (!prevH) return null
          const priceChanged = Number(counterOffer.proposed_price) !== Number(prevH.proposed_price)
          const dateChanged  = counterOffer.available_date !== prevH.available_date || counterOffer.available_time !== prevH.available_time
          if (!priceChanged && !dateChanged) return null
          const fmtD = (d, t) => d ? `${new Date(d).toLocaleDateString('ro-RO',{weekday:'short',day:'2-digit',month:'short'})}${t ? ` · ${t}` : ''}` : '—'
          return (
            <div className="flex flex-wrap gap-2 mb-2">
              {priceChanged && (
                <span className="flex items-center gap-1 text-xs bg-orange-50 border border-orange-200 text-orange-700 rounded-lg px-2.5 py-1">
                  <DollarSign className="w-3 h-3 flex-shrink-0"/>
                  Preț schimbat: <strong>{fmtPrice(prevH.proposed_price)}</strong> → <strong>{fmtPrice(counterOffer.proposed_price)}</strong>
                </span>
              )}
              {dateChanged && (
                <span className="flex items-center gap-1 text-xs bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg px-2.5 py-1">
                  <Calendar className="w-3 h-3 flex-shrink-0"/>
                  Dată nouă: <strong>{fmtD(counterOffer.available_date, counterOffer.available_time)}</strong>
                </span>
              )}
            </div>
          )
        })()}

        {/* Meta: date, duration, availability */}
        <div className="flex items-center gap-3 text-xs text-gray-400 mb-3 flex-wrap">
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/>{fmtDate(neg.created_at)}</span>
          {neg.estimated_duration && <span className="flex items-center gap-1"><Clock className="w-3 h-3"/>{neg.estimated_duration}</span>}
          {neg.available_date && (
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3"/>
              {new Date(neg.available_date).toLocaleDateString('ro-RO',{day:'2-digit',month:'short'})}
              {neg.available_time ? ` · ${neg.available_time}` : ''}
            </span>
          )}
        </div>

        {/* Waiting for client indicator */}
        {!isCountered && !isRejected && !isAccepted && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-3">
            <p className="text-xs font-bold text-blue-600">Ai trimis o ofertă</p>
            <p className="text-xs text-blue-500">Aștepți răspunsul clientului...</p>
          </div>
        )}

        {/* Reschedule form */}
        {showReschedule && (
          <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-3 mb-3 space-y-2">
            <p className="text-xs font-bold text-yellow-800">Schimbă data/ora</p>
            <p className="text-xs text-yellow-600">Prețul rămâne <strong>{fmtPrice(neg.proposed_price)}</strong></p>
            <div>
              <label className="text-[10px] text-gray-500 font-medium mb-0.5 block">Data *</label>
              <input type="date" value={reschedDate} min={HJ_TODAY}
                onChange={e => {
                  const d = e.target.value
                  setReschedDate(d)
                  if (d === HJ_TODAY && reschedTime && hjToMins(reschedTime) <= new Date().getHours()*60+new Date().getMinutes()) setReschedTime('')
                }}
                className="w-full px-3 py-2 border border-yellow-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white"/>
            </div>
            {reschedDate && (
              <div>
                <label className="text-[10px] text-gray-500 font-medium mb-1 block">
                  Ora <span className="text-gray-400">(opțional)</span>
                </label>
                {hjSlots(reschedDate).length === 0 ? (
                  <p className="text-xs text-orange-600 italic">Nu mai sunt ore azi — alege altă zi.</p>
                ) : (
                  <div className="grid grid-cols-5 gap-1">
                    {hjSlots(reschedDate).map(t => (
                      <button key={t} type="button"
                        onClick={() => setReschedTime(t === reschedTime ? '' : t)}
                        className={`py-1.5 rounded-lg text-[11px] font-semibold border transition-all
                          ${reschedTime === t ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-white border-yellow-300 text-yellow-700 hover:bg-yellow-100'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <textarea value={reschedMsg} onChange={e => setReschedMsg(e.target.value)} rows={2}
              placeholder="Mesaj opțional..."
              className="w-full px-3 py-2 border border-yellow-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white"/>
            <div className="flex gap-2">
              <button onClick={() => { setShowReschedule(false); setReschedMsg('') }}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 transition">
                Anulează
              </button>
              <button onClick={handleSendReschedule} disabled={!reschedDate || sending}
                className="flex-1 py-2 bg-yellow-500 text-white rounded-lg text-xs font-bold hover:bg-yellow-600 transition disabled:opacity-50">
                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin inline"/> : 'Trimite schimbarea'}
              </button>
            </div>
          </div>
        )}

        {/* Counter form */}
        {showCounter && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-3 space-y-2">
            <p className="text-xs font-bold text-gray-600">Contra-ofertă ({MAX_ROUNDS - handymanRounds} {MAX_ROUNDS - handymanRounds === 1 ? 'rundă rămasă' : 'runde rămase'})</p>
            <input type="number" value={counterPrice} onChange={e => setCounterPrice(e.target.value)}
              placeholder="Prețul tău (RON)"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            <textarea value={counterMsg} onChange={e => setCounterMsg(e.target.value)} rows={2}
              placeholder="Mesaj opțional..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            <div className="flex gap-2">
              <button onClick={() => setShowCounter(false)}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 transition">
                Anulează
              </button>
              <button onClick={handleSendCounter} disabled={!counterPrice || sending}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition disabled:opacity-50">
                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin inline"/> : 'Trimite'}
              </button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!showCounter && !showReschedule && (
          <div className="flex gap-2">
            {isCountered && counterOffer && (
              <button onClick={handleAcceptCounter} disabled={accepting}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition disabled:opacity-60">
                {accepting ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <CheckCircle className="w-3.5 h-3.5"/>}
                Acceptă {fmtPrice(counterOffer.proposed_price)}
              </button>
            )}
            {canCounter && (
              <button onClick={() => { setShowReschedule(true); setShowCounter(false) }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-yellow-300 text-yellow-700 bg-yellow-50 text-xs font-bold rounded-lg hover:bg-yellow-100 transition">
                <Calendar className="w-3.5 h-3.5"/> Schimbă data
              </button>
            )}
            {canCounter && (
              <button onClick={() => { setShowCounter(true); setShowReschedule(false) }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-blue-200 text-blue-600 text-xs font-medium rounded-lg hover:bg-blue-50 transition">
                <DollarSign className="w-3.5 h-3.5"/> Contra-ofertă
              </button>
            )}
            {roundsExhausted && isCountered && !accepting && (
              <div className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gray-100 text-gray-400 text-xs rounded-lg">
                Limita de negocieri atinsă
              </div>
            )}
            <button onClick={handleWithdraw} disabled={withdrawing}
              className="px-3 py-2 border border-gray-200 text-gray-400 text-xs rounded-lg hover:bg-gray-50 hover:text-red-500 hover:border-red-200 transition disabled:opacity-60"
              title="Retrage oferta">
              {withdrawing ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <XCircle className="w-3.5 h-3.5"/>}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── REWORK PROPOSAL CARD (handyman side) ────────────────────────────────────

const RWP_SLOTS = ['07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00']
const rwpToMins = t => { const [h,m] = t.split(':'); return parseInt(h)*60+parseInt(m) }

function ReworkProposalCard({ proposal, onRefresh }) {
  const [responding,  setResponding]  = useState(false)
  const [showCounter, setShowCounter] = useState(false)
  const [counterDate, setCounterDate] = useState('')
  const [counterTime, setCounterTime] = useState('')
  const [counterNote, setCounterNote] = useState('')

  const RWP_TODAY = new Date().toISOString().split('T')[0]
  const nowMins   = new Date().getHours()*60+new Date().getMinutes()
  const slots     = counterDate === RWP_TODAY ? RWP_SLOTS.filter(t => rwpToMins(t) > nowMins) : RWP_SLOTS

  const task        = proposal.task
  const client      = task?.profiles
  const clientName  = client ? `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim() || 'Client' : 'Client'
  const isPending   = proposal.status === 'pending'
  const isAccepted  = proposal.status === 'accepted'
  const isDeclined  = proposal.status === 'declined'
  const needsMyResponse  = isPending && proposal.proposed_by === 'client'
  const waitingForClient = isPending && proposal.proposed_by === 'handyman'
  const canCounter  = needsMyResponse && proposal.round_count < 4

  const respond = async (action) => {
    setResponding(true)
    const { data, error } = await supabase.rpc('respond_rework_proposal', {
      p_proposal_id: proposal.id,
      p_action:      action,
      p_date:        action === 'counter' ? counterDate : null,
      p_time:        action === 'counter' ? (counterTime || null) : null,
      p_note:        action === 'counter' ? (counterNote || null) : null,
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
            {client?.avatar_url
              ? <img src={client.avatar_url} className="w-full h-full object-cover" alt=""/>
              : <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white text-base font-bold">{clientName[0]}</div>}
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-gray-900 text-base">{clientName}</p>
              {needsMyResponse  && <span className="px-2.5 py-0.5 bg-orange-500 text-white text-xs font-bold rounded-full animate-pulse">Răspunde</span>}
              {waitingForClient && <span className="px-2.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">Aștept client</span>}
              {isAccepted  && <span className="px-2.5 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">Confirmată ✓</span>}
              {isDeclined  && <span className="px-2.5 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">Refuzată</span>}
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
          <span>Runda {proposal.round_count}/4</span>
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
                <span className={entry.by === 'handyman' ? 'text-blue-600 font-medium' : 'text-purple-600 font-medium'}>
                  {entry.by === 'handyman' ? 'Tu' : clientName.split(' ')[0]}:
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
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0"/>
            <div>
              <p className="text-sm font-bold text-green-700">Programare confirmată</p>
              <p className="text-xs text-green-600">
                {proposal.proposed_date
                  ? new Date(proposal.proposed_date).toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                  : '—'}
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
            Propune altă dată (Runda {proposal.round_count + 1}/4)
          </p>
          <input
            type="date" min={RWP_TODAY}
            value={counterDate}
            onChange={e => { setCounterDate(e.target.value); setCounterTime('') }}
            className="w-full px-3 py-2 border border-orange-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          {counterDate && (
            <div>
              <p className="text-xs text-orange-600 mb-1.5">Ora <span className="text-orange-400">(opțional)</span></p>
              {slots.length === 0
                ? <p className="text-xs text-orange-600 italic">Nu mai sunt ore disponibile azi.</p>
                : (
                  <div className="grid grid-cols-5 gap-1.5">
                    {slots.map(t => (
                      <button key={t} type="button"
                        onClick={() => setCounterTime(prev => prev === t ? '' : t)}
                        className={`py-2 rounded-xl text-xs font-semibold border transition-all
                          ${counterTime === t ? 'bg-orange-500 text-white border-orange-500' : 'bg-white border-orange-200 text-gray-700 hover:border-orange-400'}`}
                      >{t}</button>
                    ))}
                  </div>
                )}
            </div>
          )}
          <input type="text" placeholder="Notă opțională..." value={counterNote}
            onChange={e => setCounterNote(e.target.value)}
            className="w-full px-3 py-2 border border-orange-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <div className="flex gap-2">
            <button onClick={() => { setShowCounter(false); setCounterDate(''); setCounterTime(''); setCounterNote('') }}
              className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-white transition font-medium">
              Anulează
            </button>
            <button onClick={() => respond('counter')} disabled={!counterDate || responding}
              className="flex-[2] flex items-center justify-center gap-1.5 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 disabled:opacity-50 transition">
              {responding
                ? <Loader2 className="w-4 h-4 animate-spin"/>
                : 'Trimite contra-propunerea'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── RESCHEDULE VIEW ──────────────────────────────────────────────────────────

function RescheduleView({ reschedules, disputes = [], jobs, onRefresh, onOpenModal }) {
  const [selectedDispute, setSelectedDispute] = useState(null)

  const parseJson = (v) => { if (Array.isArray(v)) return v; try { return JSON.parse(v ?? '[]') } catch { return [] } }
  const pendingReworkDates = disputes.filter(d => {
    const tl = parseJson(d.timeline)
    return tl.some(e => e.event === 'client_proposed_new_rework_date') && !tl.some(e => e.event === 'handyman_confirmed_client_date')
  })

  if (reschedules.length === 0 && pendingReworkDates.length === 0) return (
    <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
      <CalendarClock className="w-12 h-12 text-gray-200 mx-auto mb-4" />
      <h3 className="text-lg font-bold text-gray-800 mb-2">Nicio cerere de reprogramare</h3>
      <p className="text-gray-500 text-sm">Cererile de reprogramare și datele propuse de clienți vor apărea aici.</p>
    </div>
  )

  const incoming = reschedules.filter(r => r.status === 'pending_handyman' || r.status === 'pending')
  const outgoing = reschedules.filter(r => r.status === 'pending_client')
  const responded = reschedules.filter(r => r.status === 'accepted' || r.status === 'rejected')

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <CalendarClock className="w-5 h-5 text-blue-500" />
        <h2 className="text-lg font-bold text-gray-800">Reprogramări</h2>
      </div>

      {/* Pending rework date proposals from clients */}
      {pendingReworkDates.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Wrench className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-bold text-gray-700">Date propuse de client pentru relucrare ({pendingReworkDates.length})</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {pendingReworkDates.map(d => {
              const tl = parseJson(d.timeline)
              const evt = [...tl].reverse().find(e => e.event === 'client_proposed_new_rework_date')
              const proposedDeadline = evt?.extra?.new_deadline
              const taskTitle = d.task?.title ?? `Task #${d.task_id?.slice(0, 6).toUpperCase()}`
              const clientName = d.task?.profiles
                ? `${d.task.profiles.first_name ?? ''} ${d.task.profiles.last_name ?? ''}`.trim() || 'Client'
                : 'Client'
              const fmtDate = (iso) => {
                if (!iso) return '—'
                const dt = new Date(iso)
                return dt.toLocaleDateString('ro-RO', { weekday: 'short', day: '2-digit', month: 'short' }) +
                  ' la ' + dt.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })
              }
              return (
                <button key={d.id} onClick={() => setSelectedDispute(d)}
                  className="w-full text-left bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-orange-200 border-t-4 border-t-orange-400 overflow-hidden">
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 text-sm line-clamp-1">{taskTitle}</p>
                        <p className="text-xs text-gray-400">{clientName}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 flex-shrink-0">Propunere dată</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                      <CalendarClock className="w-3.5 h-3.5 flex-shrink-0" />
                      Dată propusă: {fmtDate(proposedDeadline)}
                    </div>
                    <p className="text-xs text-gray-500">Confirmă sau propune altă dată în detaliile disputei.</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Incoming — waiting handyman */}
      {incoming.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-bold text-gray-700">Cereri primite de la client ({incoming.length})</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {incoming.map(r => (
              <RescheduleCard key={r.id} r={r} jobs={jobs} onRefresh={onRefresh} mode="incoming" onOpenModal={onOpenModal} />
            ))}
          </div>
        </div>
      )}

      {/* Outgoing — waiting client */}
      {outgoing.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-yellow-500" />
            <h3 className="text-sm font-bold text-gray-700">În așteptarea confirmării clientului ({outgoing.length})</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {outgoing.map(r => (
              <RescheduleCard key={r.id} r={r} jobs={jobs} onRefresh={onRefresh} mode="outgoing" />
            ))}
          </div>
        </div>
      )}

      {/* Responded */}
      {responded.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <h3 className="text-sm font-bold text-gray-700">Răspunsuri primite ({responded.length})</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {responded.map(r => (
              <RescheduleCard key={r.id} r={r} jobs={jobs} onRefresh={onRefresh} mode="responded" />
            ))}
          </div>
        </div>
      )}
    </div>

    <HandymanDisputeModal
      isOpen={!!selectedDispute}
      dispute={selectedDispute}
      onClose={() => setSelectedDispute(null)}
      onRefresh={() => { onRefresh(); setSelectedDispute(null) }}
    />
    </>
  )
}

// ─── RESCHEDULE CARD ──────────────────────────────────────────────────────────

function RescheduleCard({ r, jobs, onRefresh, mode = 'outgoing', onOpenModal }) {
  const [cancelling, setCancelling] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showCounter, setShowCounter] = useState(false)
  const [counterDate, setCounterDate] = useState('')
  const [counterTime, setCounterTime] = useState('')
  const [counterMsg, setCounterMsg] = useState('')

  // Find job title from jobs list (bookings + tasks)
  const job = jobs.find(j => j._id === r.job_id)
  const jobTitle = job?.title ?? `${r.job_type === 'task' ? 'Task' : 'Rezervare'} #${r.job_id?.slice(0,6).toUpperCase()}`

  const handleCancel = async () => {
    setCancelling(true)
    await supabase.from('reschedule_requests').update({ status: 'rejected' }).eq('id', r.id)
    onRefresh()
  }

  const handleAcceptIncoming = () => {
    if (job && onOpenModal) {
      onOpenModal(job, r.id)
    }
  }

  const handleCounterIncoming = async () => {
    if (!counterDate || !counterTime) return
    setSaving(true)
    try {
      const now = new Date().toISOString()
      await supabase.from('reschedule_requests')
        .update({ status: 'rejected', responded_at: now })
        .eq('id', r.id)

      await supabase.from('reschedule_requests').insert({
        job_id: r.job_id,
        job_type: r.job_type,
        handyman_id: r.handyman_id,
        client_id: r.client_id,
        proposed_date: counterDate,
        proposed_time: counterTime,
        message: counterMsg || null,
        status: 'pending_client',
        created_at: now,
      })

      if (r.client_id) {
        await supabase.from('notifications').insert({
          user_id: r.client_id,
          type: 'new_offer',
          title: 'Contra-propunere de reprogramare',
          body: `Meșteșugarul propune o dată alternativă: ${counterDate} la ${counterTime}.`,
          data: { job_id: r.job_id, job_type: r.job_type, redirect: '/dashboard?tab=reschedule' },
        })
      }

      onRefresh()
    } finally {
      setSaving(false)
    }
  }

  const handleCancelTaskAfterFailedReschedule = async () => {
    const reason = window.prompt('Motiv anulare (ex: reprogramare eșuată):', 'reprogramare eșuată')
    if (reason == null) return
    setSaving(true)
    try {
      const now = new Date().toISOString()
      await supabase.from('reschedule_requests')
        .update({ status: 'rejected', responded_at: now })
        .eq('id', r.id)

      if (r.job_type === 'task') {
        const { data: row } = await supabase.from('tasks').select('special_instructions').eq('id', r.job_id).maybeSingle()
        const special = [row?.special_instructions, `[ANULARE HANDYMAN] ${reason}`].filter(Boolean).join('\n')
        await supabase.from('tasks').update({
          status: 'cancelled',
          special_instructions: special,
          updated_at: now,
        }).eq('id', r.job_id)
      } else {
        await supabase.from('bookings').update({
          status: 'cancelled',
          handyman_notes: `[ANULARE HANDYMAN] ${reason}`,
          updated_at: now,
        }).eq('id', r.job_id)
      }

      onRefresh()
    } finally {
      setSaving(false)
    }
  }

  const statusConfig = {
    pending:  { label: 'Așteptare', cls: 'bg-yellow-100 text-yellow-700 border-yellow-200', border: 'border-yellow-200', bg: 'bg-yellow-50' },
    accepted: { label: 'Acceptat',  cls: 'bg-green-100 text-green-700 border-green-200',   border: 'border-green-200',  bg: 'bg-green-50' },
    rejected: { label: 'Refuzat',   cls: 'bg-red-100 text-red-700 border-red-200',          border: 'border-red-200',    bg: 'bg-red-50' },
  }
  const cfg = statusConfig[r.status] ?? statusConfig.pending

  return (
    <div className={`rounded-xl border-2 ${cfg.border} ${cfg.bg} p-5`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-1.5 mb-1">
            <CalendarClock className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">
              {r.job_type === 'task' ? 'Task' : 'Rezervare'}
            </span>
          </div>
          <p className="text-sm font-bold text-gray-800 line-clamp-1">{jobTitle}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold border flex-shrink-0 ${cfg.cls}`}>
          {cfg.label}
        </span>
      </div>

      {/* Proposed date/time */}
      <div className="bg-white rounded-xl p-3 mb-3 border border-white/80">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1.5">
          {mode === 'incoming' ? 'Data propusă de client' : 'Data propusă de tine'}
        </p>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-gray-800">{fmtDateLong(r.proposed_date)}</p>
            <p className="text-xs text-blue-600 font-medium">Ora {r.proposed_time}</p>
          </div>
        </div>
        {r.message && (
          <p className="text-xs text-gray-500 italic mt-2 pt-2 border-t border-gray-100">"{r.message}"</p>
        )}
      </div>

      {/* Status messages */}
      {(r.status === 'pending' || r.status === 'pending_handyman') && mode === 'incoming' && (
        <div className="flex items-center gap-2 text-xs text-blue-700 mb-3 bg-blue-100 rounded-lg px-3 py-2">
          <CalendarClock className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Clientul a cerut reprogramare. Poți accepta, propune altă oră sau anula taskul.</span>
        </div>
      )}
      {(r.status === 'pending' || r.status === 'pending_client') && mode !== 'incoming' && (
        <div className="flex items-center gap-2 text-xs text-yellow-700 mb-3 bg-yellow-100 rounded-lg px-3 py-2">
          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Clientul nu a răspuns încă — trimiți: {fmtDate(r.created_at)}</span>
        </div>
      )}
      {r.status === 'accepted' && (
        <div className="flex items-center gap-2 text-xs text-green-700 mb-3 bg-green-100 rounded-lg px-3 py-2">
          <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Clientul a acceptat! Job-ul a fost reprogramat.</span>
        </div>
      )}
      {r.status === 'rejected' && (
        <div className="flex items-center gap-2 text-xs text-red-700 mb-3 bg-red-100 rounded-lg px-3 py-2">
          <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Clientul a refuzat reprogramarea sau a propus o altă dată.</span>
        </div>
      )}

      {/* Responded at */}
      {r.responded_at && (
        <p className="text-xs text-gray-400 mb-3">Răspuns primit: {fmtDate(r.responded_at)}</p>
      )}

      {showCounter && mode === 'incoming' && (
        <div className="space-y-2 mb-3">
          <input
            type="date"
            value={counterDate}
            min={new Date().toISOString().split('T')[0]}
            onChange={e => setCounterDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <input
            type="time"
            value={counterTime}
            onChange={e => setCounterTime(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <textarea
            rows={2}
            value={counterMsg}
            onChange={e => setCounterMsg(e.target.value)}
            placeholder="Mesaj opțional"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
          />
          <div className="flex gap-2">
            <button onClick={() => setShowCounter(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-xs">Înapoi</button>
            <button onClick={handleCounterIncoming} disabled={saving || !counterDate || !counterTime} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs disabled:opacity-50">Trimite</button>
          </div>
        </div>
      )}

      {/* Actions */}
      {(r.status === 'pending' || r.status === 'pending_client' || r.status === 'pending_handyman') && mode === 'outgoing' && (
        <button onClick={handleCancel} disabled={cancelling}
          className="w-full flex items-center justify-center gap-1.5 py-2 border border-gray-200 bg-white text-gray-500 text-xs font-medium rounded-lg hover:bg-gray-50 transition disabled:opacity-60">
          {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
          Anulează cererea
        </button>
      )}

      {(r.status === 'pending_handyman' || r.status === 'pending') && mode === 'incoming' && !showCounter && (
        <div className="flex gap-2">
          <button onClick={handleAcceptIncoming}
            className="flex-1 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition">
            Acceptă
          </button>
          <button onClick={() => setShowCounter(true)}
            className="flex-1 py-2 border border-blue-200 text-blue-600 text-xs font-semibold rounded-lg hover:bg-blue-50 transition">
            Propune altă oră
          </button>
          <button onClick={handleCancelTaskAfterFailedReschedule} disabled={saving}
            className="px-3 py-2 border border-red-200 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50 transition">
            Anulează task
          </button>
        </div>
      )}
    </div>
  )
}

// ─── DISPUTES VIEW ────────────────────────────────────────────────────────────

const DISPUTE_GROUPS = [
  {
    id: 'atentie',
    label: 'Necesită atenție',
    shortLabel: 'Atenție',
    statuses: new Set(['open', 'evidence_requested_handyman', 'admin_proposed_rework']),
    customFilter: d => d.status === 'open' ? !d.handyman_response_at : true,
    color: 'red',
    dot: 'bg-red-500',
    tabActive: 'bg-red-600 text-white shadow',
    tabInactive: 'text-red-600 hover:bg-red-50',
    badgeCls: 'bg-red-100 text-red-700',
    emptyMsg: 'Nicio dispută care necesită atenție.',
  },
  {
    id: 'admin',
    label: 'La admin',
    shortLabel: 'La admin',
    statuses: new Set(['dispute_contested', 'admin_review', 'admin_review_required', 'admin_escalated', 'evidence_requested_client', 'handyman_declined_rework']),
    color: 'purple',
    dot: 'bg-purple-500',
    tabActive: 'bg-purple-600 text-white shadow',
    tabInactive: 'text-purple-600 hover:bg-purple-50',
    badgeCls: 'bg-purple-100 text-purple-700',
    emptyMsg: 'Nicio dispută în analiză la admin.',
  },
  {
    id: 'lucru',
    label: 'În lucru',
    shortLabel: 'În lucru',
    statuses: new Set(['rework_accepted', 'rework_in_progress', 'rework_completed', 'awaiting_client_rework_choice', 'rework_marketplace']),
    color: 'blue',
    dot: 'bg-blue-500',
    tabActive: 'bg-blue-600 text-white shadow',
    tabInactive: 'text-blue-600 hover:bg-blue-50',
    badgeCls: 'bg-blue-100 text-blue-700',
    emptyMsg: 'Nicio dispută în curs de relucrare.',
  },
  {
    id: 'finalizate',
    label: 'Finalizate',
    shortLabel: 'Finalizate',
    statuses: new Set(['resolved', 'forced_accepted', 'refund_full', 'refund_partial']),
    color: 'green',
    dot: 'bg-green-500',
    tabActive: 'bg-green-600 text-white shadow',
    tabInactive: 'text-green-600 hover:bg-green-50',
    badgeCls: 'bg-green-100 text-green-700',
    emptyMsg: 'Nicio dispută finalizată.',
  },
]

function groupDisputes(disputes) {
  const result = {}
  DISPUTE_GROUPS.forEach(g => {
    result[g.id] = disputes.filter(d =>
      g.statuses.has(d.status) && (g.customFilter ? g.customFilter(d) : true)
    )
  })
  // "Toate" gets the full array
  result['toate'] = disputes
  return result
}

function DisputesView({ disputes, onRefresh }) {
  const [selectedDispute, setSelectedDispute] = useState(null)
  const [activeTab, setActiveTab] = useState('toate')

  const grouped = groupDisputes(disputes)
  const attentionCount = grouped['atentie']?.length ?? 0

  const visibleDisputes = grouped[activeTab] ?? disputes

  if (disputes.length === 0) return (
    <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
      <ShieldAlert className="w-12 h-12 text-gray-200 mx-auto mb-4" />
      <h3 className="text-lg font-bold text-gray-800 mb-2">Nicio dispută</h3>
      <p className="text-gray-500 text-sm">Disputele deschise de clienți vor apărea aici.</p>
    </div>
  )

  const activeGroup = DISPUTE_GROUPS.find(g => g.id === activeTab)

  return (
    <>
      <div className="space-y-4">

        {/* Header */}
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-500" />
          <h2 className="text-lg font-bold text-gray-800">Dispute</h2>
          {attentionCount > 0 && (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full animate-pulse">
              {attentionCount} necesită răspuns
            </span>
          )}
        </div>

        {/* Filter tabs */}
        <div className="bg-gray-100 rounded-xl p-1 flex gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('toate')}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'toate'
                ? 'bg-white text-gray-800 shadow'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Toate
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === 'toate' ? 'bg-gray-100 text-gray-600' : 'bg-gray-200 text-gray-500'}`}>
              {disputes.length}
            </span>
          </button>

          {DISPUTE_GROUPS.map(g => {
            const count = grouped[g.id]?.length ?? 0
            const isActive = activeTab === g.id
            return (
              <button
                key={g.id}
                onClick={() => setActiveTab(g.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  isActive ? g.tabActive : g.tabInactive + ' text-gray-500'
                }`}
              >
                {g.id === 'atentie' && count > 0 && !isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                )}
                {g.shortLabel}
                {count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-white/20 text-white' : g.badgeCls}`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Content */}
        {visibleDisputes.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-gray-100">
            <p className="text-sm text-gray-400">{activeGroup?.emptyMsg ?? 'Nicio dispută în această categorie.'}</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {visibleDisputes.map(d => (
              <DisputeResponseCard key={d.id} dispute={d} onOpen={() => setSelectedDispute(d)} />
            ))}
          </div>
        )}
      </div>

      <HandymanDisputeModal
        isOpen={!!selectedDispute}
        dispute={selectedDispute}
        onClose={() => setSelectedDispute(null)}
        onRefresh={() => { onRefresh(); setSelectedDispute(null) }}
      />
    </>
  )
}

// ─── DISPUTE RESPONSE CARD (compact summary — opens HandymanDisputeModal) ─────

function DisputeResponseCard({ dispute, onOpen }) {
  const parseJson = (val) => { if (Array.isArray(val)) return val; try { return JSON.parse(val ?? '[]') } catch { return [] } }
  const timeline      = parseJson(dispute.timeline)
  const clientPhotos  = parseJson(dispute.photos)
  const clientProposedEvent   = timeline.find(e => e.event === 'client_proposed_new_rework_date')
  const handymanConfirmedEvt  = timeline.find(e => e.event === 'handyman_confirmed_client_date')
  const clientHasProposedDate = !!clientProposedEvent && !handymanConfirmedEvt

  const task        = dispute.task
  const taskTitle   = task?.title ?? `Task #${dispute.task_id?.slice(0, 6).toUpperCase()}`
  const clientName  = task?.profiles
    ? `${task.profiles.first_name ?? ''} ${task.profiles.last_name ?? ''}`.trim() || 'Client'
    : 'Client'
  const reasonLabel = dispute.rejection_reasons?.name ?? 'Reclamație'

  const createdAt  = new Date(dispute.created_at)
  const deadlineMs = createdAt.getTime() + 24 * 60 * 60 * 1000
  const hoursLeft  = Math.max(0, Math.floor((deadlineMs - Date.now()) / 3_600_000))
  const urgent     = hoursLeft < 12
  const needsResponse = (dispute.status === 'open' && !dispute.handyman_response_at) || dispute.status === 'evidence_requested_handyman'

  const statusMap = {
    open:                          { label: 'Deschis',                  cls: 'bg-red-100 text-red-700' },
    dispute_contested:             { label: 'Contestat',                cls: 'bg-orange-100 text-orange-700' },
    rework_accepted:               { label: 'Relucrare acceptată',      cls: 'bg-orange-100 text-orange-700' },
    rework_in_progress:            { label: 'În lucru',                 cls: 'bg-blue-100 text-blue-700' },
    admin_review:                  { label: 'La admin',                 cls: 'bg-purple-100 text-purple-700' },
    admin_review_required:         { label: 'La admin',                 cls: 'bg-purple-100 text-purple-700' },
    admin_escalated:               { label: 'Escalat',                  cls: 'bg-purple-200 text-purple-800' },
    admin_proposed_rework:         { label: 'Propunere relucrare',      cls: 'bg-yellow-100 text-yellow-700' },
    evidence_requested_handyman:   { label: 'Dovezi solicitate',        cls: 'bg-amber-100 text-amber-800 ring-1 ring-amber-400' },
    evidence_requested_client:     { label: 'Dovezi la client',         cls: 'bg-amber-50 text-amber-700' },
    handyman_declined_rework:           { label: 'Ai refuzat relucrarea',    cls: 'bg-red-200 text-red-800' },
    awaiting_client_rework_choice:      { label: 'Așteptare client',         cls: 'bg-amber-100 text-amber-700' },
    rework_marketplace:                 { label: 'Alt meșter',               cls: 'bg-sky-100 text-sky-700' },
    resolved:                           { label: 'Rezolvat',                 cls: 'bg-green-100 text-green-700' },
    forced_accepted:               { label: 'Acceptat de admin',        cls: 'bg-gray-100 text-gray-600' },
    refund_partial:                { label: 'Rambursare parțială',      cls: 'bg-teal-100 text-teal-700' },
    refund_full:                   { label: 'Rambursare totală',        cls: 'bg-teal-200 text-teal-800' },
  }
  const isLv2 = task?.is_rework === true && (task?.rework_level ?? 1) >= 2
  const { label: statusLabel, cls: statusCls } = statusMap[dispute.status] ?? { label: dispute.status, cls: 'bg-gray-100 text-gray-600' }

  const isProposal = dispute.status === 'admin_proposed_rework'
  const clientPhotosCount = clientPhotos.length

  return (
    <button
      onClick={onOpen}
      className={`w-full text-left bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow border border-gray-200 border-t-4 ${
        isProposal ? 'border-t-yellow-400 ring-1 ring-yellow-300' :
        urgent && needsResponse ? 'border-t-red-400' :
        dispute.status === 'open' ? 'border-t-orange-400' :
        (dispute.status === 'rework_accepted' || dispute.status === 'rework_in_progress') ? 'border-t-green-400' :
        dispute.status === 'awaiting_client_rework_choice' ? 'border-t-amber-400' :
        'border-t-gray-300'
      }`}
    >
      <div className="p-4 space-y-3">

        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-bold text-gray-800 text-sm line-clamp-1">{taskTitle}</p>
              {isLv2 && (
                <span className="flex-shrink-0 px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded border border-orange-200">Niv.2</span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{clientName}</p>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${statusCls}`}>{statusLabel}</span>
        </div>

        {/* Reason + details preview */}
        <div className="bg-red-50 border border-red-100 rounded-lg p-3">
          <p className="text-xs font-bold text-red-700 mb-1">{reasonLabel}</p>
          {dispute.details && <p className="text-xs text-red-600 line-clamp-2">{dispute.details}</p>}
          {clientPhotosCount > 0 && (
            <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
              <Camera className="w-3 h-3" /> {clientPhotosCount} {clientPhotosCount === 1 ? 'dovadă foto' : 'dovezi foto'} de la client
            </p>
          )}
        </div>

        {/* Evidence request alert */}
        {dispute.status === 'evidence_requested_handyman' && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-amber-600" />
            Adminul solicită dovezi suplimentare — răspunde
          </div>
        )}

        {/* Urgent new-date alert */}
        {clientHasProposedDate && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
            <CalendarClock className="w-3.5 h-3.5 flex-shrink-0" />
            Clientul a propus o dată nouă — confirmă
          </div>
        )}

        {/* Countdown */}
        {needsResponse && (
          <div className={`flex items-center gap-1 text-xs font-semibold ${urgent ? 'text-red-600' : 'text-orange-600'}`}>
            <Clock className="w-3 h-3" />
            {hoursLeft > 0 ? `${hoursLeft}h rămase pentru răspuns` : 'Termenul a expirat'}
          </div>
        )}

        {/* CTA */}
        <div className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition ${needsResponse ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          <ShieldAlert className="w-3.5 h-3.5" />
          {needsResponse ? 'Răspunde la dispută' : 'Vezi detalii dispută'}
        </div>
      </div>
    </button>
  )
}