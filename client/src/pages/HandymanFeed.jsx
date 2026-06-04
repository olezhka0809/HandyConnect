import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import HandymanNavbar from '../components/handyman-dashboard/HandymanNavbar'
import TaskDetailModal from '../components/handyman-dashboard/TaskDetailModal'
import TaskRequestModal from '../components/handyman-dashboard/TaskRequestModal'
import TaskPhoto from '../components/TaskPhoto'
import CityAutocomplete from '../components/CityAutocomplete'
import { updateHandymanWorkZone } from '../utils/cityLookup'
import {
  MapPin, Clock, AlertTriangle, Zap, Search,
  Send, X, CheckCircle, DollarSign,
  Navigation, Settings, User, MessageSquare, Info,
  ShieldCheck, Lock, Award, RotateCcw, Calendar, Sparkles, Loader2
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL ?? ''

const DURATION_SLOTS_FEED = (() => {
  const slots = []
  for (let m = 15; m <= 480; m += 15) {
    const h = Math.floor(m / 60), min = m % 60
    slots.push({ value: m, label: h > 0 ? (min > 0 ? `${h}h ${min}min` : `${h}h`) : `${min}min` })
  }
  return slots
})()

const REWORK_SLOTS = [
  '07:00','07:30','08:00','08:30','09:00','09:30',
  '10:00','10:30','11:00','11:30','12:00','12:30',
  '13:00','13:30','14:00','14:30','15:00','15:30',
  '16:00','16:30','17:00','17:30','18:00','18:30','19:00',
]
const toSlotMins = t => { const [h, m] = t.split(':'); return parseInt(h) * 60 + parseInt(m) }

export default function HandymanFeed() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [handymanProfile, setHandymanProfile] = useState(null)
  const [handymanSchedule, setHandymanSchedule] = useState(null) // {schedule:{mon:[{from,to}],...}, travel_buffer_min}
  const [busySlots, setBusySlots] = useState([]) // [{date, start, end}] — taskuri deja acceptate
  const [tasks, setTasks] = useState([])
  const [filteredTasks, setFilteredTasks] = useState([])
  const [visibleTasks, setVisibleTasks] = useState([]) // tasks after level/skill/mode filters, before zone filter
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  // Pending filters (ce a selectat userul, dar nu a apăsat încă "Caută")
  const [pending, setPending] = useState({
    search: '', category: 'all', urgency: 'all', zone: 'all', sort: 'relevance'
  })
  // Applied filters (ce filtrează efectiv lista)
  const [applied, setApplied] = useState({
    search: '', category: 'all', urgency: 'all', zone: 'all', sort: 'relevance'
  })

  // Detail modal
  const [detailTaskId, setDetailTaskId] = useState(null)
  
  // Offer modal
  const [selectedTask, setSelectedTask] = useState(null)
  const [showOfferModal, setShowOfferModal] = useState(false)
  const [requestMode, setRequestMode] = useState('negotiate')
  const [offerForm, setOfferForm] = useState({
    proposed_price: '',
    estimated_duration: '',
    estimated_duration_minutes: '',
    message: '',
    available_date: '',
    available_time: '',
  })
  const [sendingOffer, setSendingOffer] = useState(false)
  const [offerRequiresDateTime, setOfferRequiresDateTime] = useState(false)
  const [acceptingId,      setAcceptingId]      = useState(null)
  // Mini modal durată pentru "Acceptă direct"
  const [durationPickTask, setDurationPickTask] = useState(null) // task care așteaptă durată
  const [durationPickMins, setDurationPickMins] = useState(60)
  const [durationAiLoading, setDurationAiLoading] = useState(false)
  const [durationAiReason,  setDurationAiReason]  = useState(null)
  // Rework proposal form: taskId → { date, time, note } | null = closed
  const [reworkProposalForm, setReworkProposalForm] = useState({}) // taskId → {date,time,note}
  const [submittingProposal, setSubmittingProposal] = useState(null) // taskId

  // Approved skills (for required_skill_id gating + category filter)
  const [approvedSkills, setApprovedSkills] = useState([]) // [{skill_id, skill_score, skills:{category_id}}]
  const [categoryMode,   setCategoryMode]   = useState('mine') // 'mine' | 'all'

  // Identity + cazier approval state (gates feed access)
  const [docsApproved, setDocsApproved] = useState({ identity: false, cazier: false })

  // Travel fee gate modal
  const [showTravelFeeModal, setShowTravelFeeModal] = useState(false)
  const [travelFeeInput,     setTravelFeeInput]     = useState('')
  const [savingTravelFee,    setSavingTravelFee]    = useState(false)

  // Work zone popups
  const [showZonePopup, setShowZonePopup] = useState(false)
  const [showZoneChange, setShowZoneChange] = useState(false)
  const [showConfirmChange, setShowConfirmChange] = useState(false)
  const [zoneForm, setZoneForm] = useState({
    city: '',
    county: '',
    radius: 10,
    extended: 10,
  })

  // ─── EFFECTS ─────────────────────────────────────────
  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [tasks, applied, handymanProfile, approvedSkills, categoryMode, docsApproved])

  // ─── LOAD DATA ───────────────────────────────────────
  async function loadData() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const authUser = session?.user
    if (!authUser) { navigate('/login'); return }
    setUser(authUser)

    // Profil handyman
    const { data: hp } = await supabase
      .from('handyman_profiles')
      .select('*')
      .eq('user_id', authUser.id)
      .single()

    // Profil general (pentru oraș/județ din onboarding)
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single()

    setHandymanProfile(hp)

    // Program handyman
    const { data: sched } = await supabase
      .from('handyman_schedule')
      .select('schedule, travel_buffer_min')
      .eq('handyman_id', authUser.id)
      .maybeSingle()
    setHandymanSchedule(sched)

    // Taskuri și bookings deja acceptate (pentru conflict check vizual pe carduri)
    const buffer = sched?.travel_buffer_min ?? 15
    const [busyTasksRes, busyBookingsRes] = await Promise.all([
      supabase.from('tasks').select('scheduled_date, scheduled_time, estimated_duration_minutes, scheduled_end_time')
        .eq('handyman_id', authUser.id).in('status', ['assigned', 'accepted', 'in_progress', 'delayed']),
      supabase.from('bookings').select('scheduled_date, scheduled_time, handyman_services(estimated_duration)')
        .eq('handyman_id', authUser.id).in('status', ['upcoming', 'confirmed', 'accepted']),
    ])
    const toM = t => { if (!t) return null; const [h, m] = t.split(':').map(Number); return h * 60 + m }
    const busy = []
    // Interval real [scheduled_time, scheduled_end_time) — fără buffer, conform spec
    ;(busyTasksRes.data ?? []).forEach(t => {
      if (!t.scheduled_date || !t.scheduled_time) return
      const start = toM(t.scheduled_time)
      const end = t.scheduled_end_time
        ? toM(t.scheduled_end_time)
        : start + (t.estimated_duration_minutes || 60)
      busy.push({ date: t.scheduled_date, start, end })
    })
    ;(busyBookingsRes.data ?? []).forEach(b => {
      if (!b.scheduled_date || !b.scheduled_time) return
      const start = toM(b.scheduled_time)
      const dur = parseInt(b.handyman_services?.estimated_duration ?? '') || 60
      busy.push({ date: b.scheduled_date, start, end: start + dur })
    })
    setBusySlots(busy)

    // Skilluri aprobate: pentru filtrare required_skill_id + category filter
    const { data: skills } = await supabase
      .from('user_skills')
      .select('skill_id, skill_score, skills(category_id, name)')
      .eq('user_id', authUser.id)
      .eq('status', 'approved')
    setApprovedSkills(skills || [])

    // Verificări identitate + cazier — condiție obligatorie pentru acces feed
    const { data: verifs } = await supabase
      .from('verifications')
      .select('type, status')
      .eq('user_id', authUser.id)
    setDocsApproved({
      identity: verifs?.some(v => v.type === 'identity' && v.status === 'approved') ?? false,
      cazier:   verifs?.some(v => (v.type === 'legal' || v.type === 'criminal_record') && v.status === 'approved') ?? false,
    })

    // Dacă nu are zona setată → arată popup
    if (!hp?.feed_setup_completed) {
      setZoneForm({
        city: hp?.primary_city || profile?.city || '',
        county: hp?.primary_county || profile?.county || '',
        radius: hp?.work_radius_km || 10,
        extended: hp?.extended_radius_km || 10,
      })
      setShowZonePopup(true)
      setLoading(false)
      return
    }

    // Categorii
    const { data: cats } = await supabase
      .from('categories')
      .select('id, name')
      .eq('is_active', true)
    setCategories(cats || [])

    await loadTasks(hp, authUser.id)
    setLoading(false)
  }

  // ─── HAVERSINE UTIL ──────────────────────────────────
  function haversineKm(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat/2)**2 +
      Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2)**2
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * 10) / 10
  }

  // ─── LOAD TASKS ──────────────────────────────────────
  async function loadTasks(hp, userId) {
    const uid = userId || user?.id || hp.user_id
    if (!hp?.primary_county) { setTasks([]); return }

    // Fetch toate localitățile din DB pentru calcul distanță (cache local)
    const { data: citiesData } = await supabase
      .from('romanian_cities')
      .select('name, county, latitude, longitude')
    const cityCoordMap = {}
    ;(citiesData || []).forEach(c => {
      cityCoordMap[`${c.name.toLowerCase()}|${c.county.toLowerCase()}`] = { lat: parseFloat(c.latitude), lon: parseFloat(c.longitude) }
      // Index și după județ (capitala de județ) pentru fallback
      if (!cityCoordMap[`|${c.county.toLowerCase()}`]) {
        cityCoordMap[`|${c.county.toLowerCase()}`] = { lat: parseFloat(c.latitude), lon: parseFloat(c.longitude) }
      }
    })

    // Coordonatele meșterului (center)
    const hLat = hp.work_latitude ? parseFloat(hp.work_latitude) : null
    const hLon = hp.work_longitude ? parseFloat(hp.work_longitude) : null

    function getTaskDistance(task) {
      // 1. Task are coordonate proprii
      if (task.latitude && task.longitude) {
        return { km: haversineKm(hLat, hLon, parseFloat(task.latitude), parseFloat(task.longitude)), approx: false }
      }
      // 2. Lookup în romanian_cities după city+county
      const key = `${(task.address_city||'').toLowerCase()}|${(task.address_county||'').toLowerCase()}`
      const coords = cityCoordMap[key] || cityCoordMap[`|${(task.address_county||'').toLowerCase()}`]
      if (coords) {
        return { km: haversineKm(hLat, hLon, coords.lat, coords.lon), approx: true }
      }
      return { km: null, approx: true }
    }

    // Taskuri din același județ — Zona Principală (same city) + Zona Extinsă (same county, alt oraș)
    const { data: countyTasks } = await supabase
      .from('tasks')
      .select(`
        *,
        category:category_id (name),
        client:client_id (first_name, last_name, avatar_url)
      `)
      .eq('status', 'pending')
      .eq('is_public', true)
      .ilike('address_county', hp.primary_county)

    const allTasks = (countyTasks || []).map(t => {
      const { km, approx } = getTaskDistance(t)
      const isMainZone = (t.address_city || '').toLowerCase().trim() === (hp.primary_city || '').toLowerCase().trim()
      return {
        ...t,
        category_name: t.category?.name,
        client_name:   `${t.client?.first_name || ''} ${t.client?.last_name || ''}`.trim(),
        client_avatar:  t.client?.avatar_url,
        city:           t.address_city,
        distance_km:    km,
        location_approx: approx,
        is_in_main_zone: isMainZone,
        is_proposed:    false,
        is_rework:      false,
        offer_count:    0,
      }
    })
    const allIds = new Set(allTasks.map(t => t.id))

    // Taskuri propuse direct
    const { data: proposedTasks } = await supabase
      .from('tasks')
      .select(`
        *,
        category:category_id (name),
        client:client_id (first_name, last_name, avatar_url)
      `)
      .contains('proposed_to', [uid])
      .eq('status', 'pending')

    if (proposedTasks) {
      proposedTasks.forEach(t => {
        if (!allIds.has(t.id)) {
          const { km, approx } = getTaskDistance(t)
          allTasks.push({
            ...t,
            category_name: t.category?.name,
            client_name: `${t.client?.first_name || ''} ${t.client?.last_name || ''}`,
            client_avatar: t.client?.avatar_url,
            distance_km: km,
            location_approx: approx,
            is_in_main_zone: false,
            is_proposed: true,
            is_rework: false,
            offer_count: 0,
          })
        } else {
          const idx = allTasks.findIndex(at => at.id === t.id)
          if (idx !== -1) allTasks[idx].is_proposed = true
        }
      })
    }

    // Taskuri de relucrare — vizibile doar meșterilor cu nivel verificare >= 2, rating >= 4.0 și reliability >= 70
    const verLevel     = hp?.verification_level ?? 0
    const hpRating     = hp?.rating_avg ?? 0
    const hpReliability = hp?.reliability_score ?? 100
    if (verLevel >= 2 && hpRating >= 4.0 && hpReliability >= 70) {
      const { data: reworkTasks } = await supabase
        .from('tasks')
        .select(`
          *,
          category:category_id (name),
          client:client_id (first_name, last_name, avatar_url)
        `)
        .eq('status', 'open')
        .eq('is_rework', true)
        .eq('is_public', true)

      if (reworkTasks) {
        reworkTasks.forEach(t => {
          if (!nearbyIds.has(t.id)) {
            allTasks.push({
              ...t,
              category_name: t.category?.name,
              client_name: `${t.client?.first_name || ''} ${t.client?.last_name || ''}`.trim(),
              client_avatar: t.client?.avatar_url,
              distance_km: null,
              is_in_main_zone: false,
              is_proposed: false,
              is_rework: true,
              offer_count: 0,
            })
            nearbyIds.add(t.id)
          }
        })
      }
    }

    // Verifică ofertele existente ale handymanului
    const { data: myOffers } = await supabase
      .from('task_offers')
      .select('task_id, status')
      .eq('handyman_id', uid)

    const offerMap = {}
    if (myOffers) myOffers.forEach(o => { offerMap[o.task_id] = o.status })
    allTasks.forEach(t => { t.my_offer_status = offerMap[t.id] || null })

    setTasks(allTasks)
  }

  // Derived set of category IDs from the handyman's approved skills
  const approvedCatIds = new Set(
    approvedSkills.map(s => s.skills?.category_id).filter(Boolean)
  )

  // Returns true if the handyman is allowed to act on a task (accept/negotiate)
  function canActOnTask(task) {
    if (!task.category_id) return true            // uncategorized tasks are open to all
    if (approvedCatIds.size === 0) return false   // no approved skills → can't act on categorized tasks
    return approvedCatIds.has(task.category_id)
  }

  // DAY_KEY_MAP: JS getDay() (0=Sun) → schedule key
  const DAY_IDX_TO_KEY = ['sun','mon','tue','wed','thu','fri','sat']

  // Returns true if task's scheduled_date+time falls within handyman's declared schedule
  // Returns null if no schedule set (assume OK) or task has no date
  function isTaskInSchedule(task) {
    if (!task.scheduled_date || !task.scheduled_time) return null // no constraint
    if (!handymanSchedule?.schedule) return null // no schedule set — assume OK

    const dayKey = DAY_IDX_TO_KEY[new Date(task.scheduled_date + 'T00:00:00').getDay()]
    const slots = handymanSchedule.schedule[dayKey]
    if (!slots || slots.length === 0) return false // not a working day

    const [th, tm] = task.scheduled_time.split(':').map(Number)
    const taskMins = th * 60 + tm

    return slots.some(slot => {
      const [fh, fm] = slot.from.split(':').map(Number)
      const [toh, tom] = slot.to.split(':').map(Number)
      return taskMins >= fh * 60 + fm && taskMins < toh * 60 + tom
    })
  }

  // Verifică dacă un task se suprapune cu un job deja acceptat
  function hasTimeConflict(task) {
    if (!task.scheduled_date || !task.scheduled_time) return false
    const toM = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
    const taskStart = toM(task.scheduled_time)
    return busySlots.some(b =>
      b.date === task.scheduled_date &&
      taskStart >= b.start && taskStart < b.end
    )
  }

  // ─── FILTERS ─────────────────────────────────────────
  function applyFilters() {
    let result = [...tasks]
    result = result.filter(t => !t.my_offer_status)

    // Gate 1: CI + cazier obligatorii pentru orice acces la feed
    if (!docsApproved.identity || !docsApproved.cazier) {
      setFilteredTasks([])
      return
    }

    // Gate 2: meșterul vede doar taskuri din categoriile cu skill aprobat
    // Accesul la risc ridicat/mediu/scăzut este determinat de skill-urile aprobate, nu de nivel
    result = result.filter(t => !t.category_id || approvedCatIds.has(t.category_id))

    // Rework marketplace gate: needs level >= 3, reliability_score >= 70, rating_avg >= 4.0
    const level            = handymanProfile?.verification_level ?? 1
    const reliabilityScore = handymanProfile?.reliability_score ?? 60
    const ratingAvg        = handymanProfile?.rating_avg ?? 0
    result = result.filter(t => {
      if (!t.is_rework) return true
      return level >= 3 && reliabilityScore >= 70 && ratingAvg >= 4.0
    })

    // Skill-based gate: if a task requires a specific skill, only show it to
    // handymen who have that skill approved with sufficient skill_score
    const skillMap = {}
    approvedSkills.forEach(s => { skillMap[s.skill_id] = s.skill_score ?? 0 })
    result = result.filter(t => {
      if (!t.required_skill_id) return true
      const score = skillMap[t.required_skill_id]
      if (score === undefined) return false
      return score >= (t.minimum_skill_score ?? 0)
    })

    // categoryMode 'mine'/'all' rămâne pentru sortare/display viitor

    if (applied.search) {
      const q = applied.search.toLowerCase()
      result = result.filter(t =>
        t.title?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.category_name?.toLowerCase().includes(q) ||
        t.keywords?.some(k => k.toLowerCase().includes(q))
      )
    }

    if (applied.category !== 'all') {
      result = result.filter(t => t.category_name === applied.category)
    }

    if (applied.urgency !== 'all') {
      result = result.filter(t => t.urgency === applied.urgency)
    }

    setVisibleTasks([...result]) // snapshot before zone filter — used for stats counts

    if (applied.zone === 'main') {
      result = result.filter(t => t.is_in_main_zone)
    } else if (applied.zone === 'extended') {
      result = result.filter(t => !t.is_in_main_zone && !t.is_proposed && !t.is_rework)
    } else if (applied.zone === 'proposed') {
      result = result.filter(t => t.is_proposed)
    } else if (applied.zone === 'rework') {
      result = result.filter(t => t.is_rework)
    }

    if (applied.sort === 'newest') {
      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    } else if (applied.sort === 'closest') {
      result.sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999))
    } else if (applied.sort === 'price_high') {
      result.sort((a, b) => (b.budget || 0) - (a.budget || 0))
    } else if (applied.sort === 'urgent') {
      const urgencyOrder = { emergency: 0, urgent: 1, normal: 2 }
      result.sort((a, b) => (urgencyOrder[a.urgency] || 2) - (urgencyOrder[b.urgency] || 2))
    }

    setFilteredTasks(result)
  }

  // ─── ZONE HANDLERS ───────────────────────────────────

  // "Da, lucrez aici" — setează zona din orașul din profil
  async function handleUseProfileCity() {
    if (!zoneForm.city || !zoneForm.county) {
      alert('Nu s-a putut determina orașul. Alege manual zona de lucru.')
      setShowZonePopup(false)
      setShowZoneChange(true)
      return
    }

    // Încearcă lookup exact
    let coords = await updateHandymanWorkZone(
      user.id, zoneForm.city, zoneForm.county, zoneForm.radius, zoneForm.extended
    )

    // Dacă nu găsește, încearcă doar după nume (fără județ)
    if (!coords) {
      const { data: cityData } = await supabase
        .from('romanian_cities')
        .select('name, county, latitude, longitude')
        .ilike('name', zoneForm.city)
        .limit(1)
        .single()

      if (cityData) {
        coords = await updateHandymanWorkZone(
          user.id, cityData.name, cityData.county, zoneForm.radius, zoneForm.extended
        )
        // Actualizăm și zoneForm cu datele corecte
        setZoneForm(prev => ({ ...prev, city: cityData.name, county: cityData.county }))
      }
    }

    if (!coords) {
      alert(`Orașul "${zoneForm.city}" nu a fost găsit în baza de date. Alege manual zona de lucru.`)
      setShowZonePopup(false)
      setShowZoneChange(true)
      return
    }

    // Marchează setup-ul ca finalizat
    await supabase
      .from('handyman_profiles')
      .update({ feed_setup_completed: true })
      .eq('user_id', user.id)

    const updatedProfile = {
      ...handymanProfile,
      primary_city: zoneForm.city,
      primary_county: zoneForm.county,
      work_latitude: coords.latitude,
      work_longitude: coords.longitude,
      work_radius_km: zoneForm.radius,
      extended_radius_km: zoneForm.extended,
      feed_setup_completed: true,
    }
    setHandymanProfile(updatedProfile)
    setShowZonePopup(false)

    const { data: cats } = await supabase
      .from('categories')
      .select('id, name')
      .eq('is_active', true)
    setCategories(cats || [])

    await loadTasks(updatedProfile, user.id)
  }

  // Confirmă schimbarea zonei (din popup 3)
  async function handleConfirmZoneChange() {
    if (!zoneForm.city || !zoneForm.county) return

    // Încearcă lookup exact
    let coords = await updateHandymanWorkZone(
      user.id, zoneForm.city, zoneForm.county, zoneForm.radius, zoneForm.extended
    )

    // Fallback: caută doar după nume
    if (!coords) {
      const { data: cityData } = await supabase
        .from('romanian_cities')
        .select('name, county, latitude, longitude')
        .ilike('name', zoneForm.city)
        .limit(1)
        .single()

      if (cityData) {
        coords = await updateHandymanWorkZone(
          user.id, cityData.name, cityData.county, zoneForm.radius, zoneForm.extended
        )
        setZoneForm(prev => ({ ...prev, city: cityData.name, county: cityData.county }))
      }
    }

    if (!coords) {
      alert(`Orașul "${zoneForm.city}" nu a fost găsit. Încearcă din nou.`)
      return
    }

    // Marchează setup-ul ca finalizat
    await supabase
      .from('handyman_profiles')
      .update({ feed_setup_completed: true })
      .eq('user_id', user.id)

    const updatedProfile = {
      ...handymanProfile,
      primary_city: zoneForm.city,
      primary_county: zoneForm.county,
      work_latitude: coords.latitude,
      work_longitude: coords.longitude,
      work_radius_km: zoneForm.radius,
      extended_radius_km: zoneForm.extended,
      feed_setup_completed: true,
    }
    setHandymanProfile(updatedProfile)
    setShowConfirmChange(false)
    setShowZoneChange(false)

    const { data: cats } = await supabase
      .from('categories')
      .select('id, name')
      .eq('is_active', true)
    setCategories(cats || [])

    await loadTasks(updatedProfile, user.id)
  }

  // ─── ESTIMARE AI PENTRU MINI MODAL DURATĂ ────────────────
  async function estimateDurationForTask(task) {
    setDurationAiLoading(true)
    setDurationAiReason(null)
    try {
      const body = new FormData()
      body.append('title', task.title || '')
      body.append('description', task.description || '')
      body.append('category', task.category_name || '')
      const res = await fetch(`${API_URL}/api/ai/estimate-duration`, { method: 'POST', body })
      const json = await res.json()
      if (json.ok) {
        setDurationPickMins(json.data.duration_minutes)
        setDurationAiReason(json.data.reason)
      }
    } catch { /* ignore */ } finally {
      setDurationAiLoading(false)
    }
  }

  // ─── ACCEPT CU PREȚUL CLIENTULUI → ofertă de negociere ──
  async function handleAcceptDirect(task, durationMinutes = 60) {
    if (!task.budget) return
    setAcceptingId(task.id)

    // Verifică conflict de program dacă task-ul are dată preferată
    if (task.scheduled_date && task.scheduled_time) {
      const [{ data: taskConflicts }, { data: bookingConflicts }] = await Promise.all([
        supabase.from('tasks')
          .select('id, title, scheduled_time, scheduled_end_time, estimated_duration_minutes')
          .eq('handyman_id', user.id)
          .eq('scheduled_date', task.scheduled_date)
          .in('status', ['assigned', 'accepted', 'in_progress', 'delayed'])  // statusuri reale din DB pentru tasks
          .limit(5),
        supabase.from('bookings')
          .select('id, contact_name, scheduled_time')
          .eq('handyman_id', user.id)
          .eq('scheduled_date', task.scheduled_date)
          .in('status', ['upcoming', 'confirmed', 'accepted'])
          .limit(5),
      ])

      const toM = t => { if (!t) return null; const [h, m] = t.split(':').map(Number); return h * 60 + m }
      const newStart = toM(task.scheduled_time)

      const hasTaskOverlap = (taskConflicts || []).some(t => {
        const start = toM(t.scheduled_time)
        if (start === null) return false
        const end = t.scheduled_end_time ? toM(t.scheduled_end_time) : start + (t.estimated_duration_minutes || 60)
        return newStart >= start && newStart < end
      })
      const hasBookingOverlap = (bookingConflicts || []).some(b => {
        const start = toM(b.scheduled_time)
        return start !== null && Math.abs(newStart - start) < 60
      })

      if (hasTaskOverlap || hasBookingOverlap) {
        const existing = (taskConflicts || []).find(t => {
          const start = toM(t.scheduled_time)
          const end = t.scheduled_end_time ? toM(t.scheduled_end_time) : start + (t.estimated_duration_minutes || 60)
          return newStart >= start && newStart < end
        }) || bookingConflicts?.[0]
        const dateLabel = new Date(task.scheduled_date + 'T00:00:00').toLocaleDateString('ro-RO', { day: '2-digit', month: 'long' })
        alert(`Ești deja ocupat pe ${dateLabel} la ${task.scheduled_time}${existing?.scheduled_time ? ` (ai deja un job la ${existing.scheduled_time})` : ''}.\n\nFolosește butonul "Negociază" pentru a propune o altă dată când ești disponibil.`)
        setAcceptingId(null)
        return
      }
    }

    const { error } = await supabase.from('task_offers').insert({
      task_id: task.id,
      handyman_id: user.id,
      proposed_price: parseFloat(task.budget),
      estimated_duration_minutes: durationMinutes,
      // Păstrăm data și ora preferată a clientului în ofertă
      available_date: task.scheduled_date || null,
      available_time: task.scheduled_time || null,
    })

    if (error) {
      console.error('[handleAcceptDirect] offer insert failed:', error)
      alert(`Eroare la trimiterea ofertei: ${error.message}`)
      setAcceptingId(null)
      return
    }

    const handymanName = `${handymanProfile?.first_name || ''} ${handymanProfile?.last_name || ''}`.trim() || 'Un meșter'
    await supabase.from('notifications').insert({
      user_id: task.client_id,
      type: 'new_offer',
      title: 'Ofertă la prețul tău!',
      body: `${handymanName} a acceptat prețul tău de ${Number(task.budget).toLocaleString('ro-RO')} RON pentru „${task.title}". Confirmă pentru a continua.`,
      data: { task_id: task.id, handyman_id: user.id, redirect: '/dashboard' },
    })

    setTasks(prev => prev.map(t =>
      t.id === task.id ? { ...t, my_offer_status: 'pending', offer_count: (t.offer_count || 0) + 1 } : t
    ))
    setAcceptingId(null)
  }

  // ─── REWORK PROPOSAL HANDLER ─────────────────────────
  async function handleSubmitReworkProposal(task) {
    const form = reworkProposalForm[task.id]
    if (!form?.date) return
    setSubmittingProposal(task.id)
    const { data, error } = await supabase.rpc('submit_rework_proposal', {
      p_task_id: task.id,
      p_date:    form.date,
      p_time:    form.time || null,
      p_note:    form.note || null,
    })
    setSubmittingProposal(null)
    if (error || data?.success === false) {
      alert(data?.error || error?.message || 'Eroare la trimiterea propunerii.')
      return
    }
    setTasks(prev => prev.map(t =>
      t.id === task.id ? { ...t, my_offer_status: 'pending' } : t
    ))
    setReworkProposalForm(prev => { const n = { ...prev }; delete n[task.id]; return n })
  }

  // ─── OFFER HANDLER ───────────────────────────────────
  async function handleSendOffer() {
    if (!offerForm.proposed_price || !selectedTask) return
    setSendingOffer(true)

    const { error } = await supabase
      .from('task_offers')
      .insert({
        task_id: selectedTask.id,
        handyman_id: user.id,
        proposed_price: parseFloat(offerForm.proposed_price),
        estimated_duration: offerForm.estimated_duration || null,
        estimated_duration_minutes: offerForm.estimated_duration_minutes || null,
        message: offerForm.message || null,
        available_date: offerForm.available_date || null,
        available_time: offerForm.available_time || null,
      })

    if (error) {
      alert('Eroare: ' + error.message)
    } else {
      const handymanName = `${handymanProfile?.first_name || ''} ${handymanProfile?.last_name || ''}`.trim() || 'Un meșteșugar'
      await supabase.from('notifications').insert({
        user_id: selectedTask.client_id,
        type: 'new_offer',
        title: 'Ofertă nouă primită',
        body: `${handymanName} a trimis o ofertă de ${offerForm.proposed_price} RON pentru „${selectedTask.title}"`,
        data: { task_id: selectedTask.id, handyman_id: user.id, redirect: '/dashboard' },
      })

      setTasks(prev => prev.map(t =>
        t.id === selectedTask.id
          ? { ...t, my_offer_status: 'pending', offer_count: (t.offer_count || 0) + 1 }
          : t
      ))
      setShowOfferModal(false)
      setSelectedTask(null)
      setOfferForm({ proposed_price: '', estimated_duration: '', estimated_duration_minutes: '', message: '', available_date: '', available_time: '' })
    }
    setSendingOffer(false)
  }

  // ─── HELPERS ─────────────────────────────────────────
  const getUrgencyBadge = (urgency) => {
    if (urgency === 'emergency') return { label: 'Urgență critică', class: 'bg-red-100 text-red-700', icon: AlertTriangle }
    if (urgency === 'urgent') return { label: 'Urgență medie', class: 'bg-yellow-100 text-yellow-700', icon: Zap }
    return { label: 'Normal', class: 'bg-green-100 text-green-700', icon: Clock }
  }

  const formatTimeAgo = (d) => {
    if (!d) return ''
    const diff = Date.now() - new Date(d).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `Acum ${mins} min`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `Acum ${hours}h`
    const days = Math.floor(hours / 24)
    return `Acum ${days}z`
  }

  // ─── LOADING STATE ───────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HandymanNavbar />
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  // ─── DOCS NOT APPROVED BLOCK ─────────────────────────
  if (!loading && handymanProfile?.feed_setup_completed && (!docsApproved.identity || !docsApproved.cazier)) {
    const missingIdentity = !docsApproved.identity
    const missingCazier   = !docsApproved.cazier
    return (
      <div className="min-h-screen bg-gray-50">
        <HandymanNavbar />
        <div className="max-w-xl mx-auto px-4 py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Documente de identitate necesare</h2>
          <p className="text-gray-500 mb-6 leading-relaxed">
            Pentru a accesa feed-ul de taskuri trebuie să ai identitatea și cazierul aprobate.
            Fără aceste documente nu poți lucra cu clienții platformei.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 mb-8 text-left space-y-2 text-sm text-yellow-800">
            <p className="font-semibold flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Ce lipsește:</p>
            {missingIdentity && <p>• Carte de identitate (față + selfie) — neaprobată</p>}
            {missingCazier   && <p>• Cazier judiciar — neaprobat</p>}
            <p className="text-yellow-700 pt-1">După aprobare poți prelua taskuri din categoriile skill-urilor tale verificate.</p>
          </div>
          <button
            onClick={() => navigate('/handyman/personal-profile', { state: { section: 'verification' } })}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
          >
            Mergi la Verificare & Acces
          </button>
        </div>
      </div>
    )
  }

  // ─── MAIN RENDER ─────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <HandymanNavbar />

      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* ── Header ──────────────────────────────────── */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Taskuri Disponibile</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {handymanProfile?.primary_city && (
                <span className="text-sm text-gray-500">
                  <MapPin className="w-3.5 h-3.5 inline mr-0.5" />
                  {handymanProfile.primary_city} · {handymanProfile.work_radius_km} km
                  <span className="text-yellow-600"> +{handymanProfile.extended_radius_km} km</span>
                </span>
              )}
              {docsApproved.identity && docsApproved.cazier ? (
                <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full border border-green-200">
                  <ShieldCheck className="w-3 h-3" /> Identitate verificată
                </span>
              ) : (
                <button
                  onClick={() => navigate('/handyman/personal-profile', { state: { section: 'verification' } })}
                  className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full border border-yellow-200 hover:bg-yellow-200 transition"
                >
                  <ShieldCheck className="w-3 h-3" /> Documente lipsă · Verifică-te →
                </button>
              )}
              {approvedSkills.length === 0 && (
                <button
                  onClick={() => navigate('/handyman/personal-profile')}
                  className="flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full border border-orange-200 hover:bg-orange-200 transition"
                >
                  <Award className="w-3 h-3" /> Niciun skill aprobat · Adaugă →
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 font-medium">{filteredTasks.length} taskuri</span>
            <button
              onClick={() => {
                setZoneForm({
                  city: handymanProfile?.primary_city || '',
                  county: handymanProfile?.primary_county || '',
                  radius: handymanProfile?.work_radius_km || 10,
                  extended: handymanProfile?.extended_radius_km || 10,
                })
                setShowZoneChange(true)
              }}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 font-medium hover:bg-white transition"
            >
              <Settings className="w-4 h-4" /> Zonă
            </button>
            <button
              onClick={() => loadTasks(handymanProfile, user?.id)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              Actualizează
            </button>
          </div>
        </div>

        {/* ── Category Mode Toggle ────────────────────── */}
        {approvedSkills.length > 0 && (
          <div className="flex items-center mb-4">
            <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white text-sm">
              <button
                onClick={() => {
                  setCategoryMode('mine')
                  const updated = { ...pending, zone: 'all' }
                  setPending(updated); setApplied(updated)
                }}
                className={`flex items-center gap-2 px-4 py-2.5 font-medium transition
                  ${categoryMode === 'mine' && applied.zone !== 'rework' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <Award className="w-4 h-4" />
                Categoriile mele
              </button>
              <button
                onClick={() => {
                  setCategoryMode('all')
                  const updated = { ...pending, zone: 'all' }
                  setPending(updated); setApplied(updated)
                }}
                className={`flex items-center gap-2 px-4 py-2.5 font-medium transition border-l border-gray-200
                  ${categoryMode === 'all' && applied.zone !== 'rework' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <Search className="w-4 h-4" />
                Toate taskurile
              </button>

              {/* Rework tab — visible only for eligible handymen */}
              {(handymanProfile?.verification_level ?? 0) >= 2 && (handymanProfile?.rating_avg ?? 0) >= 4.0 && (
                <button
                  onClick={() => {
                    const isRework = applied.zone === 'rework'
                    const updated = { ...pending, zone: isRework ? 'all' : 'rework' }
                    setPending(updated); setApplied(updated)
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 font-medium transition border-l border-gray-200
                    ${applied.zone === 'rework' ? 'bg-orange-500 text-white' : 'text-orange-600 hover:bg-orange-50'}`}
                >
                  <RotateCcw className="w-4 h-4" />
                  Relucrări
                  {visibleTasks.filter(t => t.is_rework).length > 0 && (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${applied.zone === 'rework' ? 'bg-orange-400 text-white' : 'bg-orange-100 text-orange-600'}`}>
                      {visibleTasks.filter(t => t.is_rework).length}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Filters Bar ─────────────────────────────── */}
        {(() => {
          const visibleCategories = categoryMode === 'mine' && approvedCatIds.size > 0
            ? categories.filter(c => approvedCatIds.has(c.id))
            : categories
          const filtersChanged =
            pending.search !== applied.search ||
            pending.category !== applied.category ||
            pending.urgency !== applied.urgency ||
            pending.zone !== applied.zone ||
            pending.sort !== applied.sort

          return (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[180px]">
                  <input
                    type="text"
                    value={pending.search}
                    onChange={(e) => setPending(p => ({ ...p, search: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && setApplied({ ...pending })}
                    placeholder="Caută taskuri..."
                    className="w-full pl-4 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <select
                  value={pending.category}
                  onChange={(e) => setPending(p => ({ ...p, category: e.target.value }))}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">{categoryMode === 'mine' ? 'Toate categoriile mele' : 'Toate categoriile'}</option>
                  {visibleCategories.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>

                <select
                  value={pending.urgency}
                  onChange={(e) => setPending(p => ({ ...p, urgency: e.target.value }))}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Orice urgență</option>
                  <option value="emergency">Urgență critică</option>
                  <option value="urgent">Urgență medie</option>
                  <option value="normal">Normal</option>
                </select>

                <select
                  value={pending.zone}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === 'extended' && handymanProfile?.travel_fee_per_km == null) {
                      // Tariful nu e setat → deschide modal
                      setTravelFeeInput('')
                      setShowTravelFeeModal(true)
                      return
                    }
                    setPending(p => ({ ...p, zone: val }))
                  }}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Toate zonele</option>
                  <option value="main">🟢 Zona principală</option>
                  <option value="extended">
                    🟡 Zona extinsă{handymanProfile?.travel_fee_per_km == null ? ' 🔒' : ''}
                  </option>
                  <option value="proposed">📩 Propuse direct</option>
                </select>

                <select
                  value={pending.sort}
                  onChange={(e) => setPending(p => ({ ...p, sort: e.target.value }))}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="relevance">Relevanță</option>
                  <option value="newest">Cele mai noi</option>
                  <option value="closest">Cele mai apropiate</option>
                  <option value="price_high">Buget mare</option>
                  <option value="urgent">Cele mai urgente</option>
                </select>

                <button
                  onClick={() => setApplied({ ...pending })}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition
                    ${filtersChanged
                      ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                >
                  <Search className="w-4 h-4" />
                  Caută
                </button>

                {filtersChanged && (
                  <button
                    onClick={() => {
                      const reset = { search: '', category: 'all', urgency: 'all', zone: 'all', sort: 'relevance' }
                      setPending(reset)
                      setApplied(reset)
                    }}
                    className="text-xs text-gray-400 hover:text-gray-600 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )
        })()}

        {/* ── Zone Stats ──────────────────────────────── */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Total', value: visibleTasks.length, color: 'text-blue-600', filter: 'all' },
            { label: 'Zona principală', value: visibleTasks.filter(t => t.is_in_main_zone).length, color: 'text-green-600', filter: 'main' },
            { label: 'Zona extinsă', value: visibleTasks.filter(t => !t.is_in_main_zone && !t.is_proposed && !t.is_rework).length, color: 'text-yellow-600', filter: 'extended' },
            { label: 'Propuse direct', value: visibleTasks.filter(t => t.is_proposed).length, color: 'text-purple-600', filter: 'proposed' },
            { label: 'Relucrări', value: visibleTasks.filter(t => t.is_rework).length, color: 'text-orange-600', filter: 'rework', accent: true },
          ].map((stat) => (
            <button
              key={stat.label}
              onClick={() => {
                const updated = { ...pending, zone: stat.filter }
                setPending(updated)
                setApplied(updated)
              }}
              className={`p-3 rounded-xl border transition text-left
                ${applied.zone === stat.filter
                  ? stat.accent ? 'border-orange-300 bg-orange-50' : 'border-blue-300 bg-blue-50'
                  : 'border-gray-100 bg-white hover:border-gray-200'}
              `}
            >
              <p className="text-xs text-gray-500">{stat.label}</p>
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            </button>
          ))}
        </div>

        {/* ── Task Cards ──────────────────────────────── */}
        {filteredTasks.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {filteredTasks.map((task) => {
              const urgency = getUrgencyBadge(task.urgency)
              const UrgencyIcon = urgency.icon

              return (
                <div
                  key={task.id}
                  onClick={() => setDetailTaskId(task.id)}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition overflow-hidden cursor-pointer"
                >
                  <div className={`h-1 ${task.is_rework ? 'bg-orange-500' : task.is_proposed ? 'bg-purple-500' : task.is_in_main_zone ? 'bg-green-500' : 'bg-yellow-400'}`} />

                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <TaskPhoto photos={task.photos} category={task.category_name} className="w-14 h-14 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            {task.id && (
                              <span className="text-[10px] font-mono font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">#{task.id.replace(/-/g,'').slice(0,7).toUpperCase()}</span>
                            )}
                          </div>
                          <h3 className="font-bold text-gray-800 line-clamp-1">{task.title}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            {task.category_name && (
                              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">{task.category_name}</span>
                            )}
                            <span className={`text-xs px-2 py-0.5 rounded-lg flex items-center gap-1 ${urgency.class}`}>
                              <UrgencyIcon className="w-3 h-3" /> {urgency.label}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">{formatTimeAgo(task.created_at)}</span>
                    </div>

                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">{task.description}</p>

                    {task.keywords?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {task.keywords.slice(0, 4).map((kw, i) => (
                          <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-lg">{kw}</span>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-4">
                      {task.distance_km !== null && task.distance_km !== undefined && (
                        <span className="flex items-center gap-1">
                          <Navigation className="w-3 h-3" /> {task.distance_km} km
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {task.city || task.service_address || 'Nedefinit'}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" /> {task.client_name}
                      </span>
                      {task.scheduled_date && (
                        <span className="flex items-center gap-1 text-blue-600 font-medium">
                          <Calendar className="w-3 h-3" />
                          {new Date(task.scheduled_date + 'T00:00:00').toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })}
                          {task.scheduled_time && ` · ${task.scheduled_time}`}
                        </span>
                      )}
                      {task.offer_count > 0 && (
                        <span className="flex items-center gap-1 text-blue-600">
                          <Send className="w-3 h-3" /> {task.offer_count} oferte
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      {task.is_rework && (
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-lg font-bold border border-orange-200">🔧 Relucrare</span>
                      )}
                      {task.is_proposed && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-lg font-medium">📩 Propus direct</span>
                      )}
                      {!task.is_rework && (task.is_in_main_zone ? (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-lg font-medium">🟢 Zona principală</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-lg font-medium">🟡 Zona extinsă</span>
                      ))}
                      {task.location_approx && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-lg">📍 Locație aprox.</span>
                      )}
                      {!task.is_in_main_zone && handymanProfile?.travel_fee_per_km > 0 && task.distance_km != null && (
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-lg font-medium border border-orange-200">
                          ~{Math.round(task.distance_km * handymanProfile.travel_fee_per_km)} RON deplasare
                        </span>
                      )}
                    </div>

                    {/* ── Bottom section ── */}
                    {task.is_rework && canActOnTask(task) && !task.my_offer_status && reworkProposalForm[task.id] ? (
                      /* Full-width rework form */
                      <div onClick={e => e.stopPropagation()} className="pt-3 border-t border-gray-100">
                        <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-orange-700 uppercase tracking-wide flex items-center gap-1.5">
                              <RotateCcw className="w-3.5 h-3.5" /> Propune dată și oră
                            </p>
                            {task.budget && (
                              <span className="text-sm font-bold text-orange-700">{Number(task.budget).toLocaleString('ro-RO')} RON</span>
                            )}
                          </div>

                          {/* Date picker */}
                          <input
                            type="date"
                            min={new Date().toISOString().split('T')[0]}
                            value={reworkProposalForm[task.id]?.date || ''}
                            onChange={e => {
                              const d = e.target.value
                              const todayStr = new Date().toISOString().split('T')[0]
                              const nowMins = new Date().getHours() * 60 + new Date().getMinutes()
                              const curTime = reworkProposalForm[task.id]?.time
                              setReworkProposalForm(prev => ({
                                ...prev,
                                [task.id]: {
                                  ...prev[task.id],
                                  date: d,
                                  time: d === todayStr && curTime && toSlotMins(curTime) <= nowMins ? '' : (curTime || ''),
                                }
                              }))
                            }}
                            className="w-full px-3 py-2 border border-orange-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                          />

                          {/* Time slot grid */}
                          {reworkProposalForm[task.id]?.date && (() => {
                            const todayStr = new Date().toISOString().split('T')[0]
                            const nowMins = new Date().getHours() * 60 + new Date().getMinutes()
                            const slots = reworkProposalForm[task.id].date === todayStr
                              ? REWORK_SLOTS.filter(t => toSlotMins(t) > nowMins)
                              : REWORK_SLOTS
                            if (slots.length === 0) return (
                              <p className="text-xs text-orange-600 italic">Nu mai sunt ore disponibile azi — alege altă zi.</p>
                            )
                            return (
                              <div>
                                <p className="text-xs font-medium text-orange-600 mb-2">
                                  Ora <span className="font-normal text-orange-400">(opțional)</span>
                                </p>
                                <div className="grid grid-cols-5 gap-1.5">
                                  {slots.map(t => (
                                    <button
                                      key={t}
                                      type="button"
                                      onClick={() => setReworkProposalForm(prev => ({
                                        ...prev,
                                        [task.id]: { ...prev[task.id], time: t === prev[task.id]?.time ? '' : t }
                                      }))}
                                      className={`py-2 rounded-xl text-xs font-semibold border transition-all
                                        ${reworkProposalForm[task.id]?.time === t
                                          ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                                          : 'bg-white border-orange-200 text-gray-700 hover:border-orange-400 hover:text-orange-600'
                                        }`}
                                    >
                                      {t}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )
                          })()}

                          {/* Note */}
                          <input
                            type="text"
                            placeholder="Notă opțională..."
                            value={reworkProposalForm[task.id]?.note || ''}
                            onChange={e => setReworkProposalForm(prev => ({ ...prev, [task.id]: { ...prev[task.id], note: e.target.value } }))}
                            className="w-full px-3 py-2 border border-orange-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                          />

                          {/* Actions */}
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => setReworkProposalForm(prev => { const n = { ...prev }; delete n[task.id]; return n })}
                              className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-white transition font-medium"
                            >Anulează</button>
                            <button
                              onClick={() => handleSubmitReworkProposal(task)}
                              disabled={!reworkProposalForm[task.id]?.date || submittingProposal === task.id}
                              className="flex-[2] flex items-center justify-center gap-1.5 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 disabled:opacity-50 transition shadow-sm"
                            >
                              {submittingProposal === task.id
                                ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                : <><Send className="w-3.5 h-3.5" /> Trimite propunerea</>}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Normal footer row: budget + action buttons */
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div>
                          {task.budget ? (
                            <p className="text-lg font-bold text-gray-800">{Number(task.budget).toLocaleString('ro-RO')} RON</p>
                          ) : (
                            <p className="text-sm text-gray-400">Buget nespecificat</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {task.my_offer_status === 'pending' ? (
                            <span className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium">Ofertă trimisă</span>
                          ) : task.my_offer_status === 'accepted' ? (
                            <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">Ofertă acceptată!</span>
                          ) : task.my_offer_status === 'rejected' ? (
                            <span className="px-4 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-medium">Ofertă refuzată</span>
                          ) : !canActOnTask(task) ? (
                            <span className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed" title="Nu ai un skill aprobat pentru această categorie">
                              <Lock className="w-3.5 h-3.5" /> Skill necesar
                            </span>
                          ) : task.is_rework ? (
                            /* Rework collapsed: open form or message */
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setReworkProposalForm(prev => ({ ...prev, [task.id]: { date: '', time: '', note: '' } }))}
                                className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                {task.budget ? `Propune dată (${Number(task.budget).toLocaleString('ro-RO')} RON)` : 'Propune dată'}
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedTask(task); setRequestMode('message'); setOfferForm(prev => ({ ...prev, proposed_price: prev.proposed_price || task.budget || '', message: `Salut! Sunt interesat de relucrarea „${task.title}". Putem discuta detaliile?` })); setShowOfferModal(true) }}
                                className="w-9 h-9 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-50 transition"
                              >
                                <MessageSquare className="w-4 h-4 text-gray-400" />
                              </button>
                            </div>
                          ) : (() => {
                            const inSchedule = isTaskInSchedule(task)
                            const timeConflict = hasTimeConflict(task)
                            const blocked = inSchedule === false || timeConflict
                            const blockReason = timeConflict ? 'Ocupat la această oră' : 'În afara programului'
                            return blocked ? (
                              /* BLOCKED — schedule conflict or time overlap */
                              <div className="flex items-center gap-2 w-full">
                                <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium flex-shrink-0 ${timeConflict ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-orange-50 border border-orange-200 text-orange-700'}`}>
                                  <Clock className="w-3 h-3" /> {timeConflict ? '⚠ Ocupat la această oră' : 'În afara programului'}
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedTask(task)
                                    setRequestMode('negotiate')
                                    setOfferForm(prev => ({ ...prev, proposed_price: task.budget || '', available_date: '', available_time: '', estimated_duration_minutes: '' }))
                                    setOfferRequiresDateTime(true)
                                    setShowOfferModal(true)
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition"
                                >
                                  <Send className="w-3 h-3" /> Slot ocupat — Propune altă oră
                                </button>
                              </div>
                            ) : (
                              /* Regular task — in schedule */
                              <>
                                {!!task.budget && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setDurationPickTask(task); setDurationPickMins(60); setDurationAiReason(null) }}
                                    disabled={acceptingId === task.id}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-60"
                                  >
                                    {acceptingId === task.id
                                      ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                      : <CheckCircle className="w-3.5 h-3.5" />}
                                    Acceptă ({Number(task.budget).toLocaleString('ro-RO')} RON)
                                  </button>
                                )}
                                <button
                                  onClick={(e) => { e.stopPropagation(); setSelectedTask(task); setRequestMode('negotiate'); setOfferForm(prev => ({ ...prev, proposed_price: task.budget || '' })); setShowOfferModal(true) }}
                                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                                >
                                  <Send className="w-3.5 h-3.5" /> {task.budget ? 'Negociază' : 'Propune preț'}
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setSelectedTask(task); setRequestMode('message'); setOfferForm(prev => ({ ...prev, proposed_price: prev.proposed_price || task.budget || '', message: `Salut! Sunt interesat de taskul „${task.title}". Putem discuta detaliile?` })); setShowOfferModal(true) }}
                                  className="w-9 h-9 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-50 transition"
                                >
                                  <MessageSquare className="w-4 h-4 text-gray-400" />
                                </button>
                              </>
                            )
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-bold text-gray-800 mb-2">Niciun task disponibil</h3>
            <p className="text-sm text-gray-500 mb-4">
              {approvedSkills.length === 0
                ? 'Nu ai skilluri aprobate. Adaugă skilluri și trimite dovezi pentru a accesa task-urile din categoriile tale.'
                : 'Nu există task-uri disponibile în categoriile tale din zona setată. Extinde raza de căutare sau revino mai târziu.'}
            </p>
            <button
              onClick={() => {
                setZoneForm({
                  city: handymanProfile?.primary_city || '',
                  county: handymanProfile?.primary_county || '',
                  radius: handymanProfile?.work_radius_km || 15,
                  extended: (handymanProfile?.extended_radius_km || 30) + 20,
                })
                setShowZoneChange(true)
              }}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              Extinde Zona
            </button>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════
          MODAL: Setare tarif deplasare (gate pentru Zona Extinsă)
          ═══════════════════════════════════════════════════ */}
      {showTravelFeeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <DollarSign className="w-6 h-6 text-yellow-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Setează tariful de deplasare</h3>
              <p className="text-sm text-gray-500 mt-1">
                Pentru a vedea taskuri din <strong>Zona Extinsă</strong> (același județ, alt oraș),
                trebuie să setezi tariful de deplasare. Poți pune <strong>0</strong> dacă nu percepi cost.
              </p>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Tarif deplasare (RON/km)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={travelFeeInput}
                  onChange={e => setTravelFeeInput(e.target.value)}
                  placeholder="Ex: 2 · sau 0 dacă nu percepi cost"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Exemplu: cu 2 RON/km, un task la 50 km → ~100 RON cost deplasare afișat pe card.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowTravelFeeModal(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                Anulează
              </button>
              <button
                disabled={travelFeeInput === '' || savingTravelFee}
                onClick={async () => {
                  setSavingTravelFee(true)
                  const fee = Math.max(0, parseFloat(travelFeeInput) || 0)
                  await supabase.from('handyman_profiles')
                    .update({ travel_fee_per_km: fee })
                    .eq('user_id', user.id)
                  setHandymanProfile(prev => ({ ...prev, travel_fee_per_km: fee }))
                  setSavingTravelFee(false)
                  setShowTravelFeeModal(false)
                  setPending(p => ({ ...p, zone: 'extended' }))
                }}
                className="flex-1 py-2.5 bg-yellow-500 text-white rounded-xl text-sm font-semibold hover:bg-yellow-600 transition disabled:opacity-50"
              >
                {savingTravelFee ? 'Se salvează…' : 'Salvează și aplică filtrul'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          POPUP 1: Prima setare zonă (la prima intrare)
          ═══════════════════════════════════════════════════ */}
      {showZonePopup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Navigation className="w-7 h-7 text-blue-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">Setează Zona de Lucru</h2>

              {zoneForm.city ? (
                <>
                  <p className="text-sm text-gray-500 mb-6">
                    Orașul tău este <strong>{zoneForm.city}, {zoneForm.county}</strong>. Vrei să lucrezi aici sau preferi altă zonă?
                  </p>
                  <div className="space-y-3 mb-6">
                    <button
                      onClick={handleUseProfileCity}
                      className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-blue-200 bg-blue-50 text-left hover:border-blue-400 transition"
                    >
                      <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-blue-700">Da, lucrez în {zoneForm.city}</p>
                        <p className="text-xs text-blue-500">Zona principală: {zoneForm.radius} km, extinsă: {zoneForm.extended} km</p>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setShowZonePopup(false)
                        setShowZoneChange(true)
                      }}
                      className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 text-left hover:border-gray-300 transition"
                    >
                      <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-700">Vreau altă zonă de lucru</p>
                        <p className="text-xs text-gray-500">Setează un alt oraș și raza de acoperire</p>
                      </div>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-500 mb-4">
                    Alege orașul în care vrei să lucrezi pentru a vedea taskuri din zona ta.
                  </p>
                  <div className="mb-4">
                    <CityAutocomplete
                      value=""
                      onChange={(city) => setZoneForm(prev => ({
                        ...prev, city: city.name, county: city.county,
                      }))}
                      placeholder="Caută orașul tău..."
                    />
                  </div>
                </>
              )}

              {/* Slider-uri rază */}
              <div className="text-left space-y-3 pt-4 border-t border-gray-100">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    Raza principală: <span className="text-blue-600">{zoneForm.radius} km</span>
                  </label>
                  <input
                    type="range" min="5" max="50" value={zoneForm.radius}
                    onChange={(e) => setZoneForm(prev => ({ ...prev, radius: parseInt(e.target.value) }))}
                    className="w-full accent-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    Raza extinsă: <span className="text-yellow-600">{zoneForm.extended} km</span>
                  </label>
                  <input
                    type="range" min={zoneForm.radius} max="100" value={zoneForm.extended}
                    onChange={(e) => setZoneForm(prev => ({ ...prev, extended: parseInt(e.target.value) }))}
                    className="w-full accent-yellow-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          POPUP 2: Schimbă zona (alt oraș)
          ═══════════════════════════════════════════════════ */}
      {showZoneChange && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => setShowZoneChange(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">Schimbă Zona de Lucru</h3>
              <button onClick={() => setShowZoneChange(false)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">Oraș nou *</label>
                <CityAutocomplete
                  value={zoneForm.city ? `${zoneForm.city}, ${zoneForm.county}` : ''}
                  onChange={(city) => setZoneForm(prev => ({
                    ...prev, city: city.name, county: city.county,
                  }))}
                  placeholder="Caută orașul..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Raza principală: <span className="text-blue-600">{zoneForm.radius} km</span>
                </label>
                <input
                  type="range" min="5" max="50" value={zoneForm.radius}
                  onChange={(e) => setZoneForm(prev => ({ ...prev, radius: parseInt(e.target.value) }))}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>5 km</span><span>25 km</span><span>50 km</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Raza extinsă: <span className="text-yellow-600">{zoneForm.extended} km</span>
                </label>
                <input
                  type="range" min={zoneForm.radius} max="100" value={zoneForm.extended}
                  onChange={(e) => setZoneForm(prev => ({ ...prev, extended: parseInt(e.target.value) }))}
                  className="w-full accent-yellow-500"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{zoneForm.radius} km</span><span>50 km</span><span>100 km</span>
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-blue-700">
                    <p><span className="font-medium text-green-600">🟢 Zona principală</span> — taskuri prioritare</p>
                    <p className="mt-1"><span className="font-medium text-yellow-600">🟡 Zona extinsă</span> — taskuri cu deplasare</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowZoneChange(false)
                  // Dacă e prima configurare, întoarce-te la popup 1
                  if (!handymanProfile?.feed_setup_completed) {
                    setShowZonePopup(true)
                  }
                }}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                {!handymanProfile?.feed_setup_completed ? '← Înapoi' : 'Anulează'}
              </button>
              <button
                onClick={() => setShowConfirmChange(true)}
                disabled={!zoneForm.city}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                Salvează
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          POPUP 3: Confirmare schimbare zonă
          ═══════════════════════════════════════════════════ */}
      {showConfirmChange && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm text-center p-6">
            <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-yellow-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Schimbi zona de lucru?</h3>
            <p className="text-sm text-gray-500 mb-1">Zona ta se va schimba de la</p>
            <p className="text-sm mb-1">
              <strong>{handymanProfile?.primary_city || 'Nedefinit'}</strong> → <strong>{zoneForm.city}, {zoneForm.county}</strong>
            </p>
            <p className="text-xs text-gray-400 mb-6">
              Rază: {zoneForm.radius} km principală, {zoneForm.extended} km extinsă
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmChange(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                Nu, anulează
              </button>
              <button
                onClick={handleConfirmZoneChange}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition"
              >
                Da, schimbă
              </button>
            </div>
          </div>
        </div>
      )}

      <TaskDetailModal
        taskId={detailTaskId}
        onClose={() => setDetailTaskId(null)}
        onNegotiate={(task) => {
          setSelectedTask(task)
          setRequestMode('negotiate')
          setOfferForm(prev => ({ ...prev, proposed_price: task.budget || '' }))
          setShowOfferModal(true)
        }}
        onMessage={(task) => {
          setSelectedTask(task)
          setRequestMode('message')
          setOfferForm(prev => ({
            ...prev,
            proposed_price: prev.proposed_price || task.budget || '',
            message: `Salut! Sunt interesat de taskul „${task.title}". Putem discuta detaliile?`,
          }))
          setShowOfferModal(true)
        }}
      />

      <TaskRequestModal
        isOpen={showOfferModal}
        task={selectedTask}
        mode={requestMode}
        onClose={() => { setShowOfferModal(false); setOfferRequiresDateTime(false) }}
        onSubmit={handleSendOffer}
        form={offerForm}
        setForm={setOfferForm}
        sending={sendingOffer}
        requireDateTime={offerRequiresDateTime}
      />

      {/* ── Mini modal: durată obligatorie la Acceptă ── */}
      {durationPickTask && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => setDurationPickTask(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Înainte să accepți</h3>
            <p className="text-sm text-gray-500 mb-4">
              Cât timp îți va lua <strong>{durationPickTask.title}</strong>? Această durată blochează calendarul tău.
            </p>

            <div className="flex gap-2 mb-3">
              <select
                value={durationPickMins}
                onChange={e => setDurationPickMins(parseInt(e.target.value))}
                className="flex-1 px-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-sm"
              >
                {DURATION_SLOTS_FEED.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <button
                onClick={() => estimateDurationForTask(durationPickTask)}
                disabled={durationAiLoading}
                className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 border border-purple-200 text-purple-700 rounded-xl text-xs font-semibold hover:bg-purple-100 transition disabled:opacity-60"
              >
                {durationAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                AI
              </button>
            </div>

            {durationAiReason && (
              <p className="text-xs text-purple-600 italic mb-3">{durationAiReason}</p>
            )}

            {durationPickTask.scheduled_date && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs text-blue-700 mb-4">
                <strong>Data clientului:</strong> {new Date(durationPickTask.scheduled_date + 'T00:00:00').toLocaleDateString('ro-RO', { day: '2-digit', month: 'long' })}
                {durationPickTask.scheduled_time && ` la ${durationPickTask.scheduled_time}`} — se va bloca intervalul <strong>{durationPickTask.scheduled_time}</strong> + {DURATION_SLOTS_FEED.find(s => s.value === durationPickMins)?.label}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setDurationPickTask(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition">
                Anulează
              </button>
              <button
                onClick={() => {
                  const t = durationPickTask
                  setDurationPickTask(null)
                  handleAcceptDirect(t, durationPickMins)
                }}
                disabled={acceptingId === durationPickTask?.id}
                className="flex-[2] flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition disabled:opacity-60"
              >
                <CheckCircle className="w-4 h-4" />
                Confirmă și trimite oferta
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}