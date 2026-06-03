import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabase'
import HandymanNavbar from '../components/handyman-dashboard/HandymanNavbar'
import ProfileChecklist from '../components/handyman/ProfileChecklist'
import JobRequestModal from '../components/handyman-dashboard/JobRequestModal'
import TaskDetailModal from '../components/handyman-dashboard/TaskDetailModal'
import {
  MessageCircle,
  MapPin,
  Camera,
  Briefcase,
  Star,
  TrendingUp,
  Eye,
  DollarSign,
  Calendar,
  Award,
  Clock,
  Play,
  CalendarClock,
  Loader2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

// Returnează data locală curentă ca string "YYYY-MM-DD" (fără bug de timezone)
const localToday = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function fmtDate(dateStr, timeStr) {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    const label = d.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })
    return timeStr ? `${label} · ${timeStr}` : label
  } catch {
    return dateStr
  }
}

function getMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function getPeriodStart(range) {
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)

  if (range === '7d') {
    start.setDate(start.getDate() - 6)
    return start
  }
  if (range === '30d') {
    start.setDate(start.getDate() - 29)
    return start
  }
  if (range === '28d') {
    start.setDate(start.getDate() - 27)
    return start
  }

  start.setDate(1)
  start.setMonth(start.getMonth() - 2)
  return start
}

function buildRevenueSeries(entries, range) {
  if (!entries.length) return []
  const now = new Date()
  const roWeekday = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm']

  if (range === '3m') {
    const monthStarts = [2, 1, 0].map((offset) => new Date(now.getFullYear(), now.getMonth() - offset, 1))
    return monthStarts.map((monthDate) => {
      const key = getMonthKey(monthDate)
      const monthEntries = entries.filter((e) => getMonthKey(e.date) === key)
      return {
        label: monthDate.toLocaleDateString('ro-RO', { month: 'short' }),
        revenue: monthEntries.reduce((s, e) => s + e.amount, 0),
        jobs: monthEntries.length,
      }
    })
  }

  const days = range === '30d' ? 30 : 7
  const buckets = []
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const dayEntries = entries.filter((e) => e.date.toISOString().slice(0, 10) === key)
    buckets.push({
      label: range === '30d'
        ? d.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit' })
        : roWeekday[d.getDay()],
      revenue: dayEntries.reduce((s, e) => s + e.amount, 0),
      jobs: dayEntries.length,
    })
  }
  return buckets
}

function buildServiceBreakdown(entries, range) {
  const start = getPeriodStart(range)
  const filtered = entries.filter((e) => e.date >= start)
  const totals = filtered.reduce((acc, e) => {
    const key = e.domain || 'Altele'
    acc[key] = (acc[key] ?? 0) + e.amount
    return acc
  }, {})

  const sum = Object.values(totals).reduce((s, v) => s + v, 0)
  if (!sum) return []

  return Object.entries(totals)
    .map(([name, revenue]) => ({
      name,
      revenue,
      percentage: Math.round((revenue / sum) * 100),
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6)
}

function buildGrowth(completedEntries) {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const prevDate = new Date(currentYear, currentMonth - 1, 1)
  const prevMonth = prevDate.getMonth()
  const prevYear = prevDate.getFullYear()

  const current = completedEntries
    .filter((e) => e.date.getMonth() === currentMonth && e.date.getFullYear() === currentYear)
    .reduce((s, e) => s + e.amount, 0)

  const previous = completedEntries
    .filter((e) => e.date.getMonth() === prevMonth && e.date.getFullYear() === prevYear)
    .reduce((s, e) => s + e.amount, 0)

  const pct = previous > 0 ? ((current - previous) / previous) * 100 : (current > 0 ? 100 : 0)
  return { current, previous, pct }
}

export default function HandymanDashboard() {
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [verificationLevel, setVerificationLevel] = useState(1)
  const [incompleteOnboarding, setIncompleteOnboarding] = useState(false)
  const [tab, setTab] = useState('overview')
  const [reloadKey, setReloadKey] = useState(0)

  const [selectedTaskId, setSelectedTaskId] = useState(null)
  const [selectedJob, setSelectedJob] = useState(null)
  const [selectedEarning, setSelectedEarning] = useState(null) // modal detalii câștig
  const [billingData, setBillingData] = useState(null) // date facturare meșter
  const [chartMetric, setChartMetric] = useState('revenue')
  const [hoveredChartIdx, setHoveredChartIdx] = useState(null)
  const [earningsRange, setEarningsRange] = useState('7d')
  const [serviceRange, setServiceRange] = useState('3m')

  const [recentJobs, setRecentJobs] = useState(null)
  const [todayItems, setTodayItems] = useState(null)
  const [startingJobId, setStartingJobId] = useState(null)
  const [scheduleDate, setScheduleDate] = useState(localToday())
  const [scheduleLoading, setScheduleLoading] = useState(false)

  const [insightRange, setInsightRange] = useState('3m')
  const [stats, setStats] = useState({
    newRequests: null,
    activeJobs: null,
    monthlyEarnings: null,
    previousMonth: null,
    ratingAvg: null,
    totalReviews: null,
  })

  const [insights, setInsights] = useState({
    completedEntries: [],
    growth: { current: 0, previous: 0, pct: 0 },
    satisfaction: {
      avgRating: 0,
      totalReviews: 0,
      reviewCoverage: 0,
      reviewedClients: 0,
      completedClients: 0,
    },
    ratingTop: [],
  })

  const normaliseBookingForModal = (booking) => {
    const statusMap = {
      pending: 'new',
      accepted: 'accepted',
      confirmed: 'accepted',
      upcoming: 'accepted',
      in_progress: 'in_progress',
      delayed: 'delayed',
      completed: 'completed',
      cancelled: 'cancelled',
    }

    return {
      _type: 'booking',
      _id: booking.id,
      _raw: booking,
      title: booking.handyman_services?.title ?? `Rezervare #${booking.id.slice(0, 6)}`,
      client: booking.contact_name || 'Client',
      clientId: booking.client_id,
      description: booking.handyman_notes ?? '',
      date: fmtDate(booking.scheduled_date, booking.scheduled_time),
      photos: [],
      address: booking.service_address ?? '',
      price: booking.total ? `${Number(booking.total).toLocaleString('ro-RO')} RON` : '—',
      urgency: booking.urgency ?? 'normal',
      approximateDuration: booking.handyman_services?.estimated_duration ?? null,
      uiStatus: statusMap[booking.status] ?? 'new',
    }
  }

  const openBookingDetails = async (bookingId) => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, handyman_services(title, estimated_duration)')
      .eq('id', bookingId)
      .maybeSingle()

    if (error || !data) {
      console.error('Nu am putut încărca rezervarea:', error)
      return
    }

    setSelectedJob(normaliseBookingForModal(data))
  }

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }

      const [profileRes, hpRes, newRequestsRes, activeRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('handyman_profiles').select('rating_avg, billing_company, billing_cui, billing_address, billing_iban, billing_bank, onboarding_step, verification_level').eq('user_id', user.id).maybeSingle(),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).contains('proposed_to', [user.id]).eq('status', 'open'),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('handyman_id', user.id).in('status', ['in_progress', 'accepted', 'assigned']),
      ])

      const profileData = profileRes.data
      const onboardingStep = hpRes.data?.onboarding_step ?? 0

      if (!profileData?.onboarding_completed && onboardingStep < 2) {
        navigate('/handyman-onboarding')
        return
      }
      if (!profileData?.onboarding_completed) {
        setIncompleteOnboarding(true)
      }
      setVerificationLevel(hpRes.data?.verification_level ?? 1)

      setProfile(profileData)
      if (hpRes.data) {
        setBillingData({
          company_name: hpRes.data.billing_company || '',
          cui:          hpRes.data.billing_cui     || '',
          address:      hpRes.data.billing_address || '',
          iban:         hpRes.data.billing_iban    || '',
          bank:         hpRes.data.billing_bank    || '',
        })
      }

      const [completedTasksRes, completedBookingsRes, reviewsRes] = await Promise.all([
        supabase.from('tasks')
          .select('id, title, budget, final_price, client_id, completed_at, updated_at, created_at, service_address, address_city, categories(name), profiles!tasks_client_id_fkey(first_name, last_name)')
          .eq('handyman_id', user.id)
          .eq('status', 'completed'),
        supabase.from('bookings')
          .select('id, total, subtotal, service_fee, client_id, contact_name, service_address, completed_at, updated_at, created_at, handyman_services(title, categories(name))')
          .eq('handyman_id', user.id)
          .eq('status', 'completed'),
        supabase.from('reviews')
          .select('rating, reviewer_id')
          .eq('reviewed_id', user.id)
          .eq('review_type', 'for_handyman'),
      ])

      const taskEntries = (completedTasksRes.data ?? []).map((t) => ({
        id: t.id,
        type: 'task',
        typeLabel: 'Task',
        title: t.title ?? t.categories?.name ?? 'Task finalizat',
        amount: Number(t.final_price ?? t.budget) || 0,
        date: new Date(t.completed_at ?? t.updated_at ?? t.created_at),
        domain: t.categories?.name ?? 'Taskuri diverse',
        clientName: `${t.profiles?.first_name ?? ''} ${t.profiles?.last_name ?? ''}`.trim() || 'Client',
        address: [t.service_address, t.address_city].filter(Boolean).join(', ') || '—',
        clientId: t.client_id ?? null,
      }))

      const bookingEntries = (completedBookingsRes.data ?? []).map((b) => ({
        id: b.id,
        type: 'booking',
        typeLabel: 'Rezervare',
        title: b.handyman_services?.title ?? 'Rezervare finalizată',
        amount: Number(b.total ?? ((Number(b.subtotal) || 0) + (Number(b.service_fee) || 0))) || 0,
        date: new Date(b.completed_at ?? b.updated_at ?? b.created_at),
        domain: b.handyman_services?.categories?.name ?? b.handyman_services?.title ?? 'Rezervări',
        clientName: b.contact_name ?? 'Client',
        address: b.service_address ?? '—',
        clientId: b.client_id ?? null,
      }))

      const completedEntries = [...taskEntries, ...bookingEntries].filter((e) => !Number.isNaN(e.date.getTime()))
      const growth = buildGrowth(completedEntries)

      const ratings = (reviewsRes.data ?? [])
        .map((r) => Number(r.rating))
        .filter((r) => Number.isFinite(r) && r >= 1 && r <= 5)

      const totalReviews = ratings.length
      const avgRating = totalReviews ? ratings.reduce((s, r) => s + r, 0) / totalReviews : 0
      const ratingTop = [5, 4, 3, 2, 1]
        .map((stars) => ({ stars, count: ratings.filter((r) => r === stars).length }))
        .sort((a, b) => b.count - a.count)

      const completedClients = new Set(completedEntries.map((e) => e.clientId).filter(Boolean)).size
      const reviewedClients = new Set((reviewsRes.data ?? []).map((r) => r.reviewer_id).filter(Boolean)).size
      const reviewCoverage = completedClients > 0 ? (reviewedClients / completedClients) * 100 : 0

      setStats({
        newRequests: newRequestsRes.count ?? 0,
        activeJobs: activeRes.count ?? 0,
        monthlyEarnings: growth.current,
        previousMonth: growth.previous,
        ratingAvg: hpRes.data?.rating_avg ?? avgRating,
        totalReviews,
      })

      setInsights({
        completedEntries,
        growth,
        satisfaction: {
          avgRating,
          totalReviews,
          reviewCoverage,
          reviewedClients,
          completedClients,
        },
        ratingTop,
      })

      const [proposedRes, activeJobsRes, bookingsRes] = await Promise.all([
        supabase.from('tasks')
          .select('id, title, urgency, budget, scheduled_date, scheduled_time, address_city, photos, status, created_at, profiles!tasks_client_id_fkey(first_name, last_name)')
          .contains('proposed_to', [user.id])
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(4),

        supabase.from('tasks')
          .select('id, title, urgency, budget, scheduled_date, scheduled_time, address_city, photos, status, created_at, profiles!tasks_client_id_fkey(first_name, last_name)')
          .eq('handyman_id', user.id)
          .in('status', ['in_progress', 'accepted', 'assigned'])
          .order('created_at', { ascending: false })
          .limit(4),

        supabase.from('bookings')
          .select('id, client_id, contact_name, scheduled_date, scheduled_time, service_address, status, total, created_at, handyman_notes, handyman_services(title, estimated_duration)')
          .eq('handyman_id', user.id)
          .in('status', ['upcoming', 'confirmed', 'accepted', 'pending'])
          .order('created_at', { ascending: false })
          .limit(3),
      ])

      const proposed = (proposedRes.data ?? []).map((t) => ({ ...t, _type: 'task', _isNew: true, urgency_level: t.urgency, address_county: t.address_city }))
      const activeJobs = (activeJobsRes.data ?? []).map((t) => ({ ...t, _type: 'task', _isNew: false, urgency_level: t.urgency, address_county: t.address_city }))
      const bookings = (bookingsRes.data ?? []).map((b) => ({
        ...b,
        _type: 'booking',
        _isNew: false,
        title: b.handyman_services?.title ?? `Rezervare #${b.id.slice(0, 6)}`,
        urgency_level: 'normal',
        budget: b.total,
        address_county: b.service_address,
        profiles: { first_name: b.contact_name ?? 'Client', last_name: '' },
      }))

      const combined = [...proposed, ...activeJobs, ...bookings]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 6)

      setRecentJobs(combined)

      setTodayItems(await fetchScheduleForDate(user.id, localToday()))
    }

    async function fetchScheduleForDate(uid, dateISO) {
      const [tasksRes, bookingsRes] = await Promise.all([
        supabase.from('tasks')
          .select('id, title, scheduled_time, scheduled_end_time, estimated_duration_minutes, status, urgency, address_city, service_address, profiles!tasks_client_id_fkey(first_name, last_name)')
          .eq('handyman_id', uid)
          .eq('scheduled_date', dateISO)
          .in('status', ['accepted', 'assigned', 'in_progress', 'delayed'])
          .order('scheduled_time', { ascending: true }),
        supabase.from('bookings')
          .select('id, contact_name, scheduled_time, status, service_address, handyman_services(title, estimated_duration)')
          .eq('handyman_id', uid)
          .eq('scheduled_date', dateISO)
          .in('status', ['confirmed', 'upcoming', 'accepted', 'pending'])
          .order('scheduled_time', { ascending: true }),
      ])

      const toMins = t => { if (!t) return null; const [h, m] = t.split(':').map(Number); return h * 60 + m }

      const tasks = (tasksRes.data ?? []).map(t => {
        const startMins = toMins(t.scheduled_time)
        const dur = t.estimated_duration_minutes || null
        const endMins = t.scheduled_end_time ? toMins(t.scheduled_end_time) : (startMins && dur ? startMins + dur : null)
        return {
          id: t.id, _type: 'task', title: t.title,
          time: t.scheduled_time ?? '—',
          endTime: t.scheduled_end_time ?? (endMins ? `${String(Math.floor(endMins/60)).padStart(2,'0')}:${String(endMins%60).padStart(2,'0')}` : null),
          durationMin: dur, startMins, endMins,
          status: t.status, urgency: t.urgency ?? 'normal',
          location: t.address_city || t.service_address || null,
          client: t.profiles ? `${t.profiles.first_name ?? ''} ${t.profiles.last_name ?? ''}`.trim() || 'Client' : 'Client',
        }
      })

      const bookings = (bookingsRes.data ?? []).map(b => {
        const startMins = toMins(b.scheduled_time)
        const dur = parseInt(b.handyman_services?.estimated_duration ?? '') || null
        const endMins = startMins && dur ? startMins + dur : null
        return {
          id: b.id, _type: 'booking',
          title: b.handyman_services?.title ?? `Rezervare #${b.id.slice(0, 6)}`,
          time: b.scheduled_time ?? '—',
          endTime: endMins ? `${String(Math.floor(endMins/60)).padStart(2,'0')}:${String(endMins%60).padStart(2,'0')}` : null,
          durationMin: dur, startMins, endMins,
          status: b.status, urgency: 'normal',
          location: b.service_address || null,
          client: b.contact_name ?? 'Client',
        }
      })

      return [...tasks, ...bookings]
        .filter(item => item.time && item.time !== '—') // exclude fără oră programată
        .sort((a, b) => a.time.localeCompare(b.time))
    }

    loadData()
  }, [navigate, reloadKey])

  const handleStartJob = async (item) => {
    setStartingJobId(item.id)
    const table = item._type === 'booking' ? 'bookings' : 'tasks'
    await supabase.from(table).update({ status: 'in_progress', updated_at: new Date().toISOString() }).eq('id', item.id)
    setTodayItems((prev) => (prev ?? []).map((i) => (i.id === item.id ? { ...i, status: 'in_progress' } : i)))
    setStartingJobId(null)
  }

  const handleScheduleDateChange = async (newDate) => {
    if (!profile) return
    setScheduleDate(newDate)
    setScheduleLoading(true)
    setTodayItems(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [tasksRes, bookingsRes] = await Promise.all([
      supabase.from('tasks')
        .select('id, title, scheduled_time, scheduled_end_time, estimated_duration_minutes, status, urgency, address_city, service_address, profiles!tasks_client_id_fkey(first_name, last_name)')
        .eq('handyman_id', user.id)
        .eq('scheduled_date', newDate)
        .in('status', ['accepted', 'assigned', 'in_progress', 'delayed'])
        .order('scheduled_time', { ascending: true }),
      supabase.from('bookings')
        .select('id, contact_name, scheduled_time, status, service_address, handyman_services(title, estimated_duration)')
        .eq('handyman_id', user.id)
        .eq('scheduled_date', newDate)
        .in('status', ['confirmed', 'upcoming', 'accepted', 'pending'])
        .order('scheduled_time', { ascending: true }),
    ])

    const toMins = t => { if (!t) return null; const [h, m] = t.split(':').map(Number); return h * 60 + m }

    const tasks = (tasksRes.data ?? []).map(t => {
      const startMins = toMins(t.scheduled_time)
      const dur = t.estimated_duration_minutes || null
      const endMins = t.scheduled_end_time ? toMins(t.scheduled_end_time) : (startMins && dur ? startMins + dur : null)
      return {
        id: t.id, _type: 'task', title: t.title,
        time: t.scheduled_time ?? '—',
        endTime: t.scheduled_end_time ?? (endMins ? `${String(Math.floor(endMins/60)).padStart(2,'0')}:${String(endMins%60).padStart(2,'0')}` : null),
        durationMin: dur, startMins, endMins,
        status: t.status, urgency: t.urgency ?? 'normal',
        location: t.address_city || t.service_address || null,
        client: t.profiles ? `${t.profiles.first_name ?? ''} ${t.profiles.last_name ?? ''}`.trim() || 'Client' : 'Client',
      }
    })

    const bookings = (bookingsRes.data ?? []).map(b => {
      const startMins = toMins(b.scheduled_time)
      const dur = parseInt(b.handyman_services?.estimated_duration ?? '') || null
      const endMins = startMins && dur ? startMins + dur : null
      return {
        id: b.id, _type: 'booking',
        title: b.handyman_services?.title ?? `Rezervare #${b.id.slice(0, 6)}`,
        time: b.scheduled_time ?? '—',
        endTime: endMins ? `${String(Math.floor(endMins/60)).padStart(2,'0')}:${String(endMins%60).padStart(2,'0')}` : null,
        durationMin: dur, startMins, endMins,
        status: b.status, urgency: 'normal',
        location: b.service_address || null,
        client: b.contact_name ?? 'Client',
      }
    })

    setTodayItems([...tasks, ...bookings]
      .filter(item => item.time && item.time !== '—')
      .sort((a, b) => a.time.localeCompare(b.time))
    )
    setScheduleLoading(false)
  }

  const chartData = buildRevenueSeries(insights.completedEntries, insightRange)
  const maxRevenue = Math.max(...chartData.map((d) => d.revenue), 1)
  const maxJobs = Math.max(...chartData.map((d) => d.jobs), 1)
  const maxChartValue = chartMetric === 'revenue' ? maxRevenue : maxJobs
  const barColor = chartMetric === 'revenue' ? 'bg-blue-500' : 'bg-emerald-500'
  const chartMetricLabel = chartMetric === 'revenue' ? 'Venituri' : 'Joburi finalizate'
  const chartValues = chartData.map((d) => ({
    label: d.label,
    value: chartMetric === 'revenue' ? d.revenue : d.jobs,
    revenue: d.revenue,
    jobs: d.jobs,
  }))
  const chartWidth = Math.max(insightRange === '30d' ? 1120 : 760, chartValues.length * (insightRange === '30d' ? 36 : 130))
  const chartHeight = 320
  const chartPadding = { top: 30, right: 24, bottom: 46, left: 60 }
  const chartUsableWidth = chartWidth - chartPadding.left - chartPadding.right
  const chartUsableHeight = chartHeight - chartPadding.top - chartPadding.bottom
  const chartMaxValue = Math.max(...chartValues.map((v) => v.value), 1)
  const chartStep = chartValues.length > 1 ? chartUsableWidth / (chartValues.length - 1) : 0
  const chartSlot = chartValues.length > 0 ? chartUsableWidth / chartValues.length : chartUsableWidth
  const chartPoints = chartValues.map((v, i) => {
    const x = chartPadding.left + chartStep * i
    const y = chartPadding.top + chartUsableHeight - ((v.value / chartMaxValue) * chartUsableHeight)
    return { ...v, x, y }
  })
  const chartLinePath = chartPoints.length
    ? chartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    : ''
  const chartAreaPath = chartPoints.length
    ? `${chartLinePath} L ${chartPoints[chartPoints.length - 1].x} ${chartPadding.top + chartUsableHeight} L ${chartPoints[0].x} ${chartPadding.top + chartUsableHeight} Z`
    : ''
  const chartBars = chartValues.map((v, i) => {
    const height = (v.value / chartMaxValue) * chartUsableHeight
    const width = Math.min(insightRange === '30d' ? 22 : 40, chartSlot * 0.62)
    const x = chartPadding.left + chartSlot * i + (chartSlot - width) / 2
    const y = chartPadding.top + chartUsableHeight - height
    return { ...v, x, y, width, height }
  })
  const serviceBreakdown = buildServiceBreakdown(insights.completedEntries, serviceRange)
  const topRatingTotal = insights.ratingTop.reduce((s, r) => s + r.count, 0)
  const earningsRows = [...insights.completedEntries]
    .filter((entry) => entry.date >= getPeriodStart(earningsRange))
    .sort((a, b) => b.date - a.date)
  const earningsTotal = earningsRows.reduce((sum, entry) => sum + entry.amount, 0)

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const LOGO_URL = 'https://rfsombznaebjvfufxffc.supabase.co/storage/v1/object/public/assets/logo.svg'

  function generateInvoiceForEarning(row) {
    const b = billingData || {}
    if (!b.company_name?.trim() || !b.cui?.trim() || !b.iban?.trim()) {
      alert('Completează mai întâi datele de facturare (Nume/Firmă, CUI/CNP, IBAN) în secțiunea Profil → Date Facturare.')
      return
    }
    const now       = new Date().toLocaleDateString('ro-RO')
    const invoiceNo = `HC-${Date.now().toString().slice(-6)}`
    const html = `<!DOCTYPE html><html lang="ro"><head><meta charset="UTF-8"/>
      <title>Factură ${invoiceNo}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; font-family: Arial, sans-serif; }
        body { padding: 40px; color: #1a1a1a; }
        .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:36px; border-bottom:3px solid #2563EB; padding-bottom:20px; }
        .site { font-size:11px; color:#9CA3AF; margin-top:3px; }
        .invoice-title { font-size:30px; font-weight:800; color:#111; letter-spacing:-1px; }
        .invoice-meta { color:#6B7280; font-size:13px; margin-top:4px; line-height:1.8; }
        .parties { display:grid; grid-template-columns:1fr 1fr; gap:40px; margin-bottom:32px; }
        .party { background:#F9FAFB; border-radius:8px; padding:16px 20px; }
        .party h3 { font-size:10px; text-transform:uppercase; letter-spacing:.1em; color:#9CA3AF; margin-bottom:10px; }
        .party p { font-size:13px; line-height:1.75; color:#374151; }
        .party strong { color:#111; font-size:14px; }
        table { width:100%; border-collapse:collapse; }
        thead tr { background:#EFF6FF; }
        th { padding:10px 14px; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:#2563EB; font-weight:700; }
        td { padding:11px 14px; font-size:13px; border-bottom:1px solid #F3F4F6; }
        .total-section { border-top:2px solid #2563EB; padding:16px 14px; text-align:right; }
        .total-amount { font-size:22px; font-weight:800; color:#111; margin-top:2px; }
        .footer { margin-top:36px; padding-top:14px; border-top:1px solid #E5E7EB; font-size:11px; color:#9CA3AF; text-align:center; }
        @media print { body { padding: 24px; } }
      </style></head>
      <body>
        <div class="header">
          <div>
            <img src="${LOGO_URL}" alt="HandyConnect" height="44" style="height:44px" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"/>
            <div style="display:none;font-size:22px;font-weight:800;color:#2563EB">HandyConnect</div>
            <div class="site">handyconnect.ro</div>
          </div>
          <div style="text-align:right">
            <div class="invoice-title">FACTURĂ</div>
            <div class="invoice-meta">Nr. <strong>${invoiceNo}</strong><br/>Data: ${now}</div>
          </div>
        </div>
        <div class="parties">
          <div class="party">
            <h3>Prestator (Meșter)</h3>
            <p><strong>${b.company_name}</strong></p>
            <p>CUI/CNP: ${b.cui}</p>
            ${b.address ? `<p>${b.address}</p>` : ''}
            ${b.iban ? `<p>IBAN: ${b.iban}</p>` : ''}
            ${b.bank ? `<p>Bancă: ${b.bank}</p>` : ''}
          </div>
          <div class="party">
            <h3>Beneficiar (Client)</h3>
            <p><strong>${row.clientName}</strong></p>
            ${row.address ? `<p style="font-size:12px;color:#6B7280">${row.address}</p>` : ''}
          </div>
        </div>
        <table>
          <thead><tr><th>#</th><th>Data</th><th>Descriere serviciu</th><th>Tip</th><th style="text-align:right">Preț fără TVA</th><th style="text-align:right">TVA 21%</th><th style="text-align:right">Total</th></tr></thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>${fmtDate(row.date.toISOString())}</td>
              <td>${row.title}</td>
              <td>${row.typeLabel}</td>
              <td style="text-align:right">${(row.amount / 1.21).toFixed(2)} RON</td>
              <td style="text-align:right">${(row.amount * 0.21 / 1.21).toFixed(2)} RON</td>
              <td style="text-align:right;font-weight:600">${row.amount.toLocaleString('ro-RO')} RON</td>
            </tr>
          </tbody>
        </table>
        <div class="total-section">
          <div style="font-size:13px;color:#6B7280">Subtotal fără TVA: ${(row.amount / 1.21).toFixed(2)} RON · TVA 21%: ${(row.amount * 0.21 / 1.21).toFixed(2)} RON</div>
          <div class="total-amount">${row.amount.toLocaleString('ro-RO')} RON</div>
        </div>
        <div class="footer">Factură generată automat prin HandyConnect · ${now}</div>
      </body></html>`
    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 600)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <HandymanNavbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Bine ai revenit{profile.first_name ? `, ${profile.first_name}` : ''}! 👋</h1>
            <p className="text-gray-500 mt-1">Iată prezentarea generală a afacerii și pipeline-ul de job-uri</p>
          </div>
          <Link to="/handyman/jobs" className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition">
            <Eye className="w-4 h-4" />
            Vezi Job-uri
          </Link>
        </div>

        {verificationLevel < 2 && profile?.id && (
          <div className="mb-6">
            <ProfileChecklist userId={profile.id} compact />
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: 'Cereri Noi',
              value: stats.newRequests === null ? '—' : String(stats.newRequests),
              change: stats.newRequests === null ? 'Se încarcă…' : stats.newRequests === 0 ? 'Nicio cerere nouă' : `${stats.newRequests} task${stats.newRequests !== 1 ? '-uri' : ''} propuse ție`,
              changeColor: stats.newRequests > 0 ? 'text-green-600' : 'text-gray-400',
              icon: MessageCircle,
              color: 'bg-blue-100 text-blue-600',
            },
            {
              label: 'Job-uri Active',
              value: stats.activeJobs === null ? '—' : String(stats.activeJobs),
              change: stats.activeJobs === null ? 'Se încarcă…' : stats.activeJobs === 0 ? 'Niciun job activ' : `${stats.activeJobs} în desfășurare`,
              changeColor: 'text-gray-500',
              icon: Briefcase,
              color: 'bg-green-100 text-green-600',
            },
            {
              label: 'Venit luna curentă',
              value: stats.monthlyEarnings === null ? '—' : `${stats.monthlyEarnings.toLocaleString('ro-RO')} RON`,
              change: stats.previousMonth === null ? 'Se încarcă…' : `Luna trecută: ${stats.previousMonth.toLocaleString('ro-RO')} RON`,
              changeColor: 'text-gray-500',
              icon: DollarSign,
              color: 'bg-purple-100 text-purple-600',
            },
            {
              label: 'Rating Mediu',
              value: stats.ratingAvg === null ? '—' : Number(stats.ratingAvg).toFixed(1),
              change: stats.totalReviews === null ? 'Se încarcă…' : `${stats.totalReviews} recenzii`,
              changeColor: 'text-gray-500',
              icon: Star,
              color: 'bg-yellow-100 text-yellow-600',
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-500">{stat.label}</p>
                <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
              <p className={`text-sm mt-1 ${stat.changeColor}`}>{stat.change}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-6">
          {['overview', 'earnings'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            >
              {t === 'overview' ? 'Prezentare generală' : 'Câștiguri'}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="grid lg:grid-cols-5 gap-6 mb-6">
            <div className="lg:col-span-3 bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-800">Cereri de Job Recente</h3>
                <Link to="/handyman/jobs" className="text-sm text-blue-600 font-medium hover:underline">Vezi toate</Link>
              </div>

              <div className="divide-y divide-gray-50">
                {recentJobs === null ? (
                  <div className="p-8 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : recentJobs.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-400">Nicio cerere sau job activ momentan.</div>
                ) : (
                  recentJobs.map((job) => {
                    const clientName = job.profiles
                      ? `${job.profiles.first_name ?? ''} ${job.profiles.last_name ?? ''}`.trim() || 'Client'
                      : 'Client'
                    const urgency = job.urgency_level ?? 'normal'
                    const urgencyLabel = urgency === 'high' ? 'Urgent' : urgency === 'medium' ? 'Mediu' : 'Normal'
                    const urgencyCls = urgency === 'high' ? 'bg-red-100 text-red-700' : urgency === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                    const statusLabel = job._isNew ? 'Cerere nouă' : job._type === 'booking' ? 'Rezervare' : job.status === 'in_progress' ? 'În progres' : 'Acceptat'
                    const statusCls = job._isNew ? 'bg-blue-100 text-blue-700' : job.status === 'in_progress' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                    const dateStr = job.scheduled_date
                      ? new Date(job.scheduled_date).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' }) + (job.scheduled_time ? ` · ${job.scheduled_time}` : '')
                      : '—'
                    const photosCount = Array.isArray(job.photos) ? job.photos.length : 0
                    const isTask = job._type === 'task'

                    return (
                      <div key={job.id} className="p-5 transition cursor-pointer hover:bg-blue-50" onClick={() => (isTask ? setSelectedTaskId(job.id) : openBookingDetails(job.id))}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-gray-800 text-sm truncate">{job.title}</h4>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 border ${isTask ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-purple-50 text-purple-600 border-purple-200'}`}>
                                <Briefcase className="w-2.5 h-2.5" />
                                {isTask ? 'Task' : 'Rezervare'}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${urgencyCls}`}>{urgencyLabel}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${statusCls}`}>{statusLabel}</span>
                            </div>
                            <p className="text-sm text-gray-500 mt-0.5">{clientName}</p>
                          </div>
                          {job.budget && <span className="font-bold text-blue-600 text-sm ml-3 flex-shrink-0">{job.budget} RON</span>}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <div className="flex items-center gap-1"><Calendar className="w-3 h-3" /><span>{dateStr}</span></div>
                          {photosCount > 0 && <div className="flex items-center gap-1"><Camera className="w-3 h-3" /><span>{photosCount} poze</span></div>}
                          {job.address_county && <div className="flex items-center gap-1"><MapPin className="w-3 h-3" /><span>{job.address_county}</span></div>}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-800">
                      {scheduleDate === localToday() ? 'Programul de Azi' : 'Program'}
                    </h3>
                    {todayItems && todayItems.length > 0 && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                        {todayItems.length} job{todayItems.length !== 1 ? '-uri' : ''}
                      </span>
                    )}
                    {scheduleLoading && <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />}
                  </div>
                  {scheduleDate !== localToday() && (
                    <button
                      onClick={() => handleScheduleDateChange(localToday())}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold transition"
                    >
                      Înapoi la azi
                    </button>
                  )}
                </div>
                {/* Navigare dată */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const [y, m, d] = scheduleDate.split('-').map(Number)
                      const prev = new Date(y, m - 1, d - 1)
                      handleScheduleDateChange(`${prev.getFullYear()}-${String(prev.getMonth()+1).padStart(2,'0')}-${String(prev.getDate()).padStart(2,'0')}`)
                    }}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-500" />
                  </button>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={e => e.target.value && handleScheduleDateChange(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
                  />
                  <button
                    onClick={() => {
                      const [y, m, d] = scheduleDate.split('-').map(Number)
                      const next = new Date(y, m - 1, d + 1)
                      handleScheduleDateChange(`${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}-${String(next.getDate()).padStart(2,'0')}`)
                    }}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>

              {todayItems === null ? (
                <div className="flex-1 flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                </div>
              ) : todayItems.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-10 text-center px-6">
                  <CalendarClock className="w-10 h-10 text-gray-200 mb-3" />
                  <p className="text-sm font-medium text-gray-500">Niciun job programat azi</p>
                  <p className="text-xs text-gray-400 mt-1">Job-urile acceptate cu data de azi vor apărea aici</p>
                </div>
              ) : (() => {
                // Timeline 07:00–21:00
                const HOUR_START = 7, HOUR_END = 21
                const TOTAL_MINS = (HOUR_END - HOUR_START) * 60
                const toMins = t => { if (!t || t === '—') return null; const [h, m] = t.split(':').map(Number); return h * 60 + m }
                const isToday = scheduleDate === localToday()
                const nowMins = new Date().getHours() * 60 + new Date().getMinutes()
                const nowPct = Math.min(100, Math.max(0, (nowMins - HOUR_START * 60) / TOTAL_MINS * 100))
                const showNowLine = isToday && nowMins >= HOUR_START * 60 && nowMins <= HOUR_END * 60

                const hours = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i)

                return (
                  <div className="flex-1 overflow-y-auto p-4">
                    {/* Timeline grid */}
                    <div className="relative" style={{ minHeight: `${(HOUR_END - HOUR_START) * 52}px` }}>
                      {/* Ore pe axa stângă + linii orizontale */}
                      {hours.map(h => {
                        const topPct = (h - HOUR_START) / (HOUR_END - HOUR_START) * 100
                        return (
                          <div key={h} className="absolute w-full flex items-center gap-2" style={{ top: `${topPct}%` }}>
                            <span className="text-xs text-gray-300 font-mono w-10 flex-shrink-0 text-right leading-none">{String(h).padStart(2,'0')}:00</span>
                            <div className="flex-1 border-t border-dashed border-gray-100" />
                          </div>
                        )
                      })}

                      {/* Linia "acum" */}
                      {showNowLine && (
                        <div className="absolute w-full flex items-center gap-2 z-10" style={{ top: `${nowPct}%` }}>
                          <span className="text-xs font-bold text-red-500 font-mono w-10 flex-shrink-0 text-right leading-none">
                            {String(new Date().getHours()).padStart(2,'0')}:{String(new Date().getMinutes()).padStart(2,'0')}
                          </span>
                          <div className="flex-1 border-t-2 border-red-400 relative">
                            <div className="absolute -left-1 -top-1 w-2 h-2 bg-red-500 rounded-full" />
                          </div>
                        </div>
                      )}

                      {/* Blocuri de job-uri — cu algoritm de coloane pentru overlap */}
                      <div className="absolute left-12 right-0 top-0 bottom-0">
                        {(() => {
                          // Calculează coloanele pentru task-uri suprapuse
                          const itemsWithLayout = todayItems
                            .filter(item => toMins(item.time))
                            .map(item => {
                              const start = toMins(item.time)
                              const end = start + (item.durationMin || 60)
                              return { ...item, _start: start, _end: end, _col: 0, _totalCols: 1 }
                            })

                          // Grupează item-uri care se suprapun
                          const groups = []
                          itemsWithLayout.forEach(item => {
                            const group = groups.find(g => g.some(gi => gi._start < item._end && gi._end > item._start))
                            if (group) group.push(item)
                            else groups.push([item])
                          })

                          // Asignează coloane în fiecare grup
                          groups.forEach(group => {
                            const cols = [] // cols[i] = end time of last item in column i
                            group.forEach(item => {
                              let placed = false
                              for (let c = 0; c < cols.length; c++) {
                                if (cols[c] <= item._start) {
                                  item._col = c
                                  cols[c] = item._end
                                  placed = true
                                  break
                                }
                              }
                              if (!placed) {
                                item._col = cols.length
                                cols.push(item._end)
                              }
                              item._totalCols = cols.length
                            })
                            // Al doilea pass: totalCols = max col+1 din grup
                            const maxCols = Math.max(...group.map(i => i._col + 1))
                            group.forEach(i => { i._totalCols = maxCols })
                          })

                          return itemsWithLayout.map((item) => {
                            const start = item._start
                            const dur = item.durationMin || 60
                            const topPct = (start - HOUR_START * 60) / TOTAL_MINS * 100
                            const heightPct = Math.max(dur / TOTAL_MINS * 100, 3.5)
                            const colW = 100 / item._totalCols
                            const leftPct = item._col * colW
                            const gapPx = item._totalCols > 1 ? 2 : 1

                            const isInProgress = item.status === 'in_progress'
                            const isDelayed = item.status === 'delayed'
                            const isTask = item._type === 'task'
                            const isStarting = startingJobId === item.id

                            const blockColor = isInProgress ? 'bg-purple-500 border-purple-600'
                              : isDelayed ? 'bg-orange-500 border-orange-600'
                              : item.urgency === 'emergency' ? 'bg-red-500 border-red-600'
                              : item.urgency === 'urgent' ? 'bg-yellow-500 border-yellow-600'
                              : isTask ? 'bg-blue-500 border-blue-600'
                              : 'bg-teal-500 border-teal-600'

                            const endLabel = item.endTime || `${String(Math.floor((start+dur)/60)).padStart(2,'0')}:${String((start+dur)%60).padStart(2,'0')}`

                            return (
                              <div
                                key={item.id}
                                className={`absolute rounded-lg border-l-4 px-2 py-1.5 cursor-pointer hover:brightness-95 transition shadow-sm ${blockColor} text-white overflow-hidden`}
                                style={{
                                  top: `${topPct}%`,
                                  height: `${heightPct}%`,
                                  minHeight: '44px',
                                  left: `calc(${leftPct}% + ${gapPx}px)`,
                                  width: `calc(${colW}% - ${gapPx * 2}px)`,
                                }}
                                onClick={() => isTask ? setSelectedTaskId(item.id) : openBookingDetails(item.id)}
                              >
                                <div className="flex items-start justify-between gap-1 h-full">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold leading-tight truncate">{item.title}</p>
                                    <p className="text-xs opacity-80 truncate">{item.client}</p>
                                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                      <span className="text-xs font-mono opacity-90">
                                        {item.time.slice(0,5)} → {endLabel.slice(0,5)}
                                      </span>
                                      {item.durationMin && (
                                        <span className="text-xs opacity-70">
                                          ({item.durationMin >= 60
                                            ? `${Math.floor(item.durationMin/60)}h${item.durationMin%60 > 0 ? ` ${item.durationMin%60}min` : ''}`
                                            : `${item.durationMin}min`})
                                        </span>
                                      )}
                                    </div>
                                    {item.location && item._totalCols === 1 && (
                                      <span className="text-xs opacity-70 truncate block">📍 {item.location}</span>
                                    )}
                                  </div>
                                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                    <span className="text-xs px-1.5 py-0.5 rounded font-semibold bg-white/20">
                                      {isInProgress ? 'Progres' : isDelayed ? 'Întârziat' : isTask ? 'Task' : 'Rez.'}
                                    </span>
                                    {!isInProgress && !isDelayed && (
                                      <button
                                        onClick={e => { e.stopPropagation(); handleStartJob(item) }}
                                        disabled={isStarting}
                                        className="text-xs px-1.5 py-0.5 bg-white/20 hover:bg-white/30 rounded font-semibold transition disabled:opacity-60"
                                      >
                                        {isStarting ? '...' : '▶'}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })
                        })()}
                      </div>
                    </div>

                    {/* Legendă */}
                    <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500 inline-block" /> Task normal</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-teal-500 inline-block" /> Rezervare</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-500 inline-block" /> În progres</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500 inline-block" /> Întârziat</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500 inline-block" /> Urgență critică</span>
                      <span className="flex items-center gap-1 ml-auto text-red-400 font-medium">— linia roșie = ora curentă</span>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-gray-800">Creștere Câștiguri</h4>
              <TrendingUp className={`w-5 h-5 ${insights.growth.pct >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Luna aceasta</span><span className="font-bold">{insights.growth.current.toLocaleString('ro-RO')} RON</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Luna trecută</span><span className="font-bold">{insights.growth.previous.toLocaleString('ro-RO')} RON</span></div>
              <div className="flex justify-between">
                <span className="text-gray-500">Variație</span>
                <span className={`font-bold ${insights.growth.pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {insights.growth.pct >= 0 ? '+' : ''}{insights.growth.pct.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-gray-800">Satisfacție Clienți</h4>
              <Award className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Rating mediu</span><span className="font-bold">{insights.satisfaction.avgRating ? `${insights.satisfaction.avgRating.toFixed(1)}/5.0` : '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Total recenzii</span><span className="font-bold">{insights.satisfaction.totalReviews}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Clienți care au lăsat rating</span><span className="font-bold text-blue-600">{insights.satisfaction.reviewCoverage.toFixed(1)}%</span></div>
            </div>
          </div>
        </div>

        <div className="space-y-6 mb-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex flex-col gap-3 mb-6">
              <div>
                <h4 className="font-bold text-gray-800 text-lg">{chartMetricLabel}</h4>
                <p className="text-xs text-gray-500 mt-1">Finalizate: task-uri + rezervări</p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
                  {[
                    { id: 'revenue', label: 'Venituri' },
                    { id: 'jobs', label: 'Joburi finalizate' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setChartMetric(opt.id)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium ${chartMetric === opt.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
                  {[
                    { id: '3m', label: '3 luni' },
                    { id: '30d', label: '30 zile' },
                    { id: '7d', label: '7 zile' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setInsightRange(opt.id)}
                      className={`px-2 py-1 rounded-md text-xs font-medium ${insightRange === opt.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {chartData.length === 0 ? (
              <p className="text-sm text-gray-400">Nu există date suficiente pentru perioada selectată.</p>
            ) : (
                <div className="overflow-x-auto pb-2">
                <div className="min-w-[760px]">
                  <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible">
                    {Array.from({ length: 5 }).map((_, i) => {
                      const ratio = i / 4
                      const y = chartPadding.top + chartUsableHeight - ratio * chartUsableHeight
                      const tickValue = chartMaxValue * ratio
                      return (
                        <g key={i}>
                          <line x1={chartPadding.left} x2={chartWidth - chartPadding.right} y1={y} y2={y} stroke="#e5e7eb" strokeDasharray="4 4" />
                          <text x={chartPadding.left - 10} y={y + 4} textAnchor="end" className="fill-gray-400" fontSize="11">
                            {chartMetric === 'revenue' ? `${Math.round(tickValue).toLocaleString('ro-RO')}` : Math.round(tickValue)}
                          </text>
                        </g>
                      )
                    })}

                    {chartMetric === 'revenue' ? (
                      <>
                        <defs>
                          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.36" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.06" />
                          </linearGradient>
                        </defs>
                        {chartPoints.length > 1 && <path d={chartAreaPath} fill="url(#revenueFill)" />}
                        <path d={chartLinePath} fill="none" stroke="#1d4ed8" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                        {hoveredChartIdx !== null && chartPoints[hoveredChartIdx] && (
                          <line
                            x1={chartPoints[hoveredChartIdx].x}
                            x2={chartPoints[hoveredChartIdx].x}
                            y1={chartPadding.top}
                            y2={chartPadding.top + chartUsableHeight}
                            stroke="#93c5fd"
                            strokeDasharray="4 4"
                          />
                        )}
                        {chartPoints.map((p, idx) => {
                          const tooltipW = 84
                          const tooltipX = Math.max(
                            chartPadding.left,
                            Math.min(p.x - tooltipW / 2, chartWidth - chartPadding.right - tooltipW),
                          )
                          return (
                          <g key={`${p.label}-${p.x}`}>
                            <circle cx={p.x} cy={p.y} r="5" fill="#fff" stroke="#1d4ed8" strokeWidth="3" />
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r="12"
                              fill="transparent"
                              onMouseEnter={() => setHoveredChartIdx(idx)}
                              onMouseLeave={() => setHoveredChartIdx(null)}
                            />
                            {hoveredChartIdx === idx && p.value > 0 && (
                              <>
                                <rect
                                  x={tooltipX}
                                  y={p.y - 33}
                                  width={tooltipW}
                                  height="18"
                                  rx="5"
                                  fill="#eff6ff"
                                  stroke="#bfdbfe"
                                />
                                <text x={tooltipX + tooltipW / 2} y={p.y - 20} textAnchor="middle" className="fill-blue-800" fontSize="10" fontWeight="700">
                                  {`${Math.round(p.value).toLocaleString('ro-RO')} RON`}
                                </text>
                              </>
                            )}
                            <text x={p.x} y={chartHeight - 12} textAnchor="middle" className="fill-gray-400" fontSize="10">
                              {p.label}
                            </text>
                          </g>
                        )})}
                      </>
                    ) : (
                      <>
                        {chartBars.map((bar, idx) => {
                          const isHovered = hoveredChartIdx === idx
                          const barFill = isHovered ? '#14b8a6' : '#e5e7eb'
                          const tooltipW = 36
                          const tooltipX = Math.max(
                            chartPadding.left,
                            Math.min(bar.x + (bar.width / 2) - (tooltipW / 2), chartWidth - chartPadding.right - tooltipW),
                          )
                          return (
                            <g key={`${bar.label}-${idx}`} onMouseEnter={() => setHoveredChartIdx(idx)} onMouseLeave={() => setHoveredChartIdx(null)}>
                              <rect x={bar.x} y={bar.y} width={bar.width} height={bar.height} rx="8" fill={barFill} />
                              {isHovered && bar.value > 0 && (
                                <>
                                  <rect
                                    x={tooltipX}
                                    y={bar.y - 24}
                                    width={tooltipW}
                                    height="16"
                                    rx="4"
                                    fill="#ccfbf1"
                                    stroke="#5eead4"
                                  />
                                  <text
                                    x={tooltipX + tooltipW / 2}
                                    y={bar.y - 13}
                                    textAnchor="middle"
                                    className="fill-teal-700"
                                    fontSize="10"
                                    fontWeight="700"
                                  >
                                    {bar.value}
                                  </text>
                                </>
                              )}
                              <text x={bar.x + bar.width / 2} y={chartHeight - 12} textAnchor="middle" className="fill-gray-400" fontSize="10">
                                {bar.label}
                              </text>
                            </g>
                          )
                        })}
                      </>
                    )}
                  </svg>
                </div>
                <div className="flex items-center gap-6 mt-4 text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-sm ${chartMetric === 'revenue' ? 'bg-blue-500' : 'bg-teal-500'}`} />
                    <span>{chartMetric === 'revenue' ? 'Venituri (RON)' : 'Joburi finalizate'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {tab === 'earnings' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex flex-col gap-3 mb-5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h4 className="font-bold text-gray-800 text-lg">Ultimele câștiguri</h4>
                    <p className="text-xs text-gray-500 mt-1">Job-uri finalizate în perioada selectată</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                    <DollarSign className="w-4 h-4 text-green-500" />
                    Total: {earningsTotal.toLocaleString('ro-RO')} RON
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 w-fit">
                  {[
                    { id: '7d', label: 'Ultimele 7 zile' },
                    { id: '28d', label: 'Ultimele 28 de zile' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setEarningsRange(opt.id)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${earningsRange === opt.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-600 font-medium">Task</span>
                  <span className="px-2 py-1 rounded-full bg-purple-50 text-purple-600 font-medium">Rezervare</span>
                </div>
              </div>

              {earningsRows.length === 0 ? (
                <p className="text-sm text-gray-400">Nu există câștiguri în perioada selectată.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="min-w-[1100px] w-full text-left">
                    <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
                      <tr>
                        <th className="px-4 py-3 font-semibold w-16">Sl No</th>
                        <th className="px-4 py-3 font-semibold">Tip</th>
                        <th className="px-4 py-3 font-semibold">Nume și prenume</th>
                        <th className="px-4 py-3 font-semibold">Anunț / Job</th>
                        <th className="px-4 py-3 font-semibold">Adresă</th>
                        <th className="px-4 py-3 font-semibold">Data</th>
                        <th className="px-4 py-3 font-semibold text-right">Sumă achitată</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {earningsRows.map((row, index) => (
                        <tr key={`${row.type}-${row.id}-${index}`}
                          onClick={() => setSelectedEarning(row)}
                          className="hover:bg-blue-50/60 transition-colors cursor-pointer">
                          <td className="px-4 py-3 text-sm text-gray-700">{String(index + 1).padStart(2, '0')}.</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${row.type === 'task' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                              <Briefcase className="w-3 h-3" />
                              {row.typeLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-800">{row.clientName}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 max-w-[300px] truncate">{row.title}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 max-w-[360px] truncate">{row.address}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{fmtDate(row.date.toISOString())}</td>
                          <td className="px-4 py-3 text-sm font-bold text-right text-gray-800 whitespace-nowrap">{row.amount.toLocaleString('ro-RO')} RON</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t border-gray-100">
                      <tr>
                        <td colSpan="6" className="px-4 py-3 text-sm font-semibold text-gray-700">Total</td>
                        <td className="px-4 py-3 text-sm font-bold text-right text-green-600 whitespace-nowrap">{earningsTotal.toLocaleString('ro-RO')} RON</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="font-bold text-gray-800">Distribuție Servicii</h4>
                  <p className="text-xs text-gray-500 mt-1">Procent din profit pe domenii</p>
                </div>
                <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
                  {[
                    { id: '7d', label: '7 zile' },
                    { id: '28d', label: '28 zile' },
                    { id: '3m', label: '3 luni' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setServiceRange(opt.id)}
                      className={`px-2 py-1 rounded-md text-xs font-medium ${serviceRange === opt.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                {serviceBreakdown.length === 0 && <p className="text-sm text-gray-400">Nu există suficiente date în perioada selectată.</p>}
                {serviceBreakdown.map((item, idx) => (
                  <div key={`${item.name}-${idx}`} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 font-medium truncate pr-3">{item.name}</span>
                      <span className="text-gray-800 font-bold">{item.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className="h-2 rounded-full bg-blue-500" style={{ width: `${item.percentage}%` }} />
                    </div>
                    <p className="text-xs text-gray-400">{item.revenue.toLocaleString('ro-RO')} RON</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="font-bold text-gray-800">Distribuție Rating Clienți</h4>
                  <p className="text-xs text-gray-500 mt-1">Top rating-uri după frecvență</p>
                </div>
                <span className="text-xs text-gray-400 px-2 py-1 bg-gray-50 rounded-lg">Total {insights.satisfaction.totalReviews} recenzii</span>
              </div>
              <div className="space-y-3">
                {insights.ratingTop.map((item) => (
                  <div key={item.stars} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-12">{item.stars} stele</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                      <div
                        className={`h-6 rounded-full transition-all flex items-center justify-end pr-2 ${item.stars >= 4 ? 'bg-yellow-400' : item.stars === 3 ? 'bg-yellow-300' : 'bg-gray-300'}`}
                        style={{ width: `${topRatingTotal > 0 ? (item.count / topRatingTotal) * 100 : 0}%` }}
                      >
                        {topRatingTotal > 0 && (item.count / topRatingTotal) * 100 > 10 && (
                          <span className="text-xs font-bold text-gray-800">{Math.round((item.count / topRatingTotal) * 100)}%</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 w-8 text-right">{item.count}</span>
                  </div>
                ))}
                {insights.ratingTop.length === 0 && <p className="text-sm text-gray-400">Nu există recenzii încă.</p>}
              </div>
              <p className="text-xs text-gray-400 mt-4 text-center">Rating mediu: {insights.satisfaction.avgRating ? insights.satisfaction.avgRating.toFixed(1) : '—'}/5.0</p>
            </div>
          </div>
        </div>
      </div>

      <TaskDetailModal taskId={selectedTaskId} userId={profile?.id} onClose={() => setSelectedTaskId(null)} onNegotiate={() => setSelectedTaskId(null)} />

      {selectedJob && (
        <JobRequestModal
          job={selectedJob}
          initialMode="details"
          userId={profile?.id}
          onClose={() => setSelectedJob(null)}
          onUpdate={() => {
            setSelectedJob(null)
            setReloadKey((k) => k + 1)
          }}
        />
      )}

      {/* ── Modal detalii câștig ── */}
      {selectedEarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
                  ${selectedEarning.type === 'task' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                  <Briefcase className="w-3 h-3"/>
                  {selectedEarning.typeLabel}
                </span>
                <h3 className="font-bold text-gray-800 text-base">Detalii câștig</h3>
              </div>
              <button onClick={() => setSelectedEarning(null)} className="text-gray-400 hover:text-gray-600">
                <span className="text-xl leading-none">×</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-3">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-xl">
                <span className="text-sm text-gray-600">Sumă achitată</span>
                <span className="text-xl font-black text-green-700">{selectedEarning.amount.toLocaleString('ro-RO')} RON</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-500">Anunț / Job</span>
                  <span className="font-medium text-gray-800 text-right max-w-[60%]">{selectedEarning.title}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-500">Client</span>
                  <span className="font-medium text-gray-800">{selectedEarning.clientName}</span>
                </div>
                {selectedEarning.address && (
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <span className="text-gray-500">Adresă</span>
                    <span className="font-medium text-gray-800 text-right max-w-[60%]">{selectedEarning.address}</span>
                  </div>
                )}
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">Data finalizării</span>
                  <span className="font-medium text-gray-800">{fmtDate(selectedEarning.date.toISOString())}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-5 pt-0">
              <button onClick={() => setSelectedEarning(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
                Închide
              </button>
              <button onClick={() => { generateInvoiceForEarning(selectedEarning); setSelectedEarning(null) }}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2">
                <Calendar className="w-4 h-4"/> Generează factură
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
