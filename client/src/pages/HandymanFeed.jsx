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
  Navigation, Settings, User, MessageSquare, Info
} from 'lucide-react'

export default function HandymanFeed() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [handymanProfile, setHandymanProfile] = useState(null)
  const [tasks, setTasks] = useState([])
  const [filteredTasks, setFilteredTasks] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [urgencyFilter, setUrgencyFilter] = useState('all')
  const [zoneFilter, setZoneFilter] = useState('all')
  const [sortBy, setSortBy] = useState('relevance')

  // Detail modal
  const [detailTaskId, setDetailTaskId] = useState(null)
  
  // Offer modal
  const [selectedTask, setSelectedTask] = useState(null)
  const [showOfferModal, setShowOfferModal] = useState(false)
  const [requestMode, setRequestMode] = useState('negotiate')
  const [offerForm, setOfferForm] = useState({
    proposed_price: '',
    estimated_duration: '',
    message: '',
    available_date: '',
    available_time: '',
  })
  const [sendingOffer, setSendingOffer] = useState(false)

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
  }, [tasks, searchQuery, categoryFilter, urgencyFilter, zoneFilter, sortBy])

  // ─── LOAD DATA ───────────────────────────────────────
  async function loadData() {
    setLoading(true)
    const { data: { user: authUser } } = await supabase.auth.getUser()
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

  // ─── LOAD TASKS ──────────────────────────────────────
  async function loadTasks(hp, userId) {
    const uid = userId || user?.id || hp.user_id

    // Taskuri din zonă (via RPC)
    const { data: nearbyTasks } = await supabase.rpc('get_nearby_tasks', {
      handyman_lat: hp.work_latitude,
      handyman_lon: hp.work_longitude,
      handyman_radius: hp.work_radius_km || 10,
      handyman_extended: hp.extended_radius_km || 10,
    })

    // Fallback: taskuri din același oraș/județ (conform coloanelor address_city/address_county)
    const hasCity = !!hp?.primary_city
    const hasCounty = !!hp?.primary_county
    let sameAreaTasks = []

    if (hasCity && hasCounty) {
      const { data: cityTasks } = await supabase
        .from('tasks')
        .select(`
          *,
          category:category_id (name),
          client:client_id (first_name, last_name, avatar_url, latitude, longitude)
        `)
        .eq('status', 'pending')
        .eq('is_public', true)
        .ilike('address_city', hp.primary_city)
        .ilike('address_county', hp.primary_county)

      sameAreaTasks = (cityTasks || []).map(t => ({
        ...t,
        category_name: t.category?.name,
        client_name: `${t.client?.first_name || ''} ${t.client?.last_name || ''}`.trim(),
        client_avatar: t.client?.avatar_url,
        city: t.address_city || t.city,
        distance_km: null,
        is_in_main_zone: true,
        is_proposed: false,
        offer_count: 0,
      }))
    }

    // Taskuri propuse direct
    const { data: proposedTasks } = await supabase
      .from('tasks')
      .select(`
        *,
        category:category_id (name),
        client:client_id (first_name, last_name, avatar_url, latitude, longitude)
      `)
      .contains('proposed_to', [uid])
      .eq('status', 'pending')

    // Combinăm și deduplicăm
    const allTasks = [...(nearbyTasks || [])]
    const nearbyIds = new Set(allTasks.map(t => t.id))

    sameAreaTasks.forEach(t => {
      if (!nearbyIds.has(t.id)) {
        allTasks.push(t)
        nearbyIds.add(t.id)
      }
    })

    if (proposedTasks) {
      proposedTasks.forEach(t => {
        if (!nearbyIds.has(t.id)) {
          allTasks.push({
            ...t,
            category_name: t.category?.name,
            client_name: `${t.client?.first_name || ''} ${t.client?.last_name || ''}`,
            client_avatar: t.client?.avatar_url,
            distance_km: null,
            is_in_main_zone: false,
            is_proposed: true,
            offer_count: 0,
          })
        } else {
          const idx = allTasks.findIndex(at => at.id === t.id)
          if (idx !== -1) allTasks[idx].is_proposed = true
        }
      })
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

  // ─── FILTERS ─────────────────────────────────────────
  function applyFilters() {
    let result = [...tasks]

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(t =>
        t.title?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.category_name?.toLowerCase().includes(q) ||
        t.keywords?.some(k => k.toLowerCase().includes(q))
      )
    }

    if (categoryFilter !== 'all') {
      result = result.filter(t => t.category_name === categoryFilter)
    }

    if (urgencyFilter !== 'all') {
      result = result.filter(t => t.urgency === urgencyFilter)
    }

    if (zoneFilter === 'main') {
      result = result.filter(t => t.is_in_main_zone)
    } else if (zoneFilter === 'extended') {
      result = result.filter(t => !t.is_in_main_zone && !t.is_proposed)
    } else if (zoneFilter === 'proposed') {
      result = result.filter(t => t.is_proposed)
    }

    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    } else if (sortBy === 'closest') {
      result.sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999))
    } else if (sortBy === 'price_high') {
      result.sort((a, b) => (b.budget || 0) - (a.budget || 0))
    } else if (sortBy === 'urgent') {
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
        message: offerForm.message || null,
        available_date: offerForm.available_date || null,
        available_time: offerForm.available_time || null,
      })

    if (error) {
      alert('Eroare: ' + error.message)
    } else {
      setTasks(prev => prev.map(t =>
        t.id === selectedTask.id
          ? { ...t, my_offer_status: 'pending', offer_count: (t.offer_count || 0) + 1 }
          : t
      ))
      setShowOfferModal(false)
      setSelectedTask(null)
      setOfferForm({ proposed_price: '', estimated_duration: '', message: '', available_date: '', available_time: '' })
    }
    setSendingOffer(false)
  }

  // ─── HELPERS ─────────────────────────────────────────
  const getUrgencyBadge = (urgency) => {
    if (urgency === 'emergency') return { label: 'Urgență', class: 'bg-red-100 text-red-700', icon: AlertTriangle }
    if (urgency === 'urgent') return { label: 'Urgent', class: 'bg-yellow-100 text-yellow-700', icon: Zap }
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

  // ─── MAIN RENDER ─────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <HandymanNavbar />

      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* ── Header ──────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Taskuri Disponibile</h1>
            {handymanProfile?.primary_city && (
              <p className="text-gray-500 text-sm mt-0.5">
                {handymanProfile.primary_city}, {handymanProfile.primary_county} — Rază: {handymanProfile.work_radius_km} km
                <span className="text-yellow-600 ml-1">(+{handymanProfile.extended_radius_km} km extins)</span>
              </p>
            )}
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

        {/* ── Filters Bar ─────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Caută taskuri..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">Toate categoriile</option>
              {categories.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>

            <select value={urgencyFilter} onChange={(e) => setUrgencyFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">Orice urgență</option>
              <option value="emergency">Urgență</option>
              <option value="urgent">Urgent</option>
              <option value="normal">Normal</option>
            </select>

            <select value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">Toate zonele</option>
              <option value="main">🟢 Zona principală</option>
              <option value="extended">🟡 Zona extinsă</option>
              <option value="proposed">📩 Propuse direct</option>
            </select>

            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="relevance">Relevanță</option>
              <option value="newest">Cele mai noi</option>
              <option value="closest">Cele mai apropiate</option>
              <option value="price_high">Buget mare</option>
              <option value="urgent">Cele mai urgente</option>
            </select>
          </div>
        </div>

        {/* ── Zone Stats ──────────────────────────────── */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total', value: tasks.length, color: 'text-blue-600', filter: 'all' },
            { label: 'Zona principală', value: tasks.filter(t => t.is_in_main_zone).length, color: 'text-green-600', filter: 'main' },
            { label: 'Zona extinsă', value: tasks.filter(t => !t.is_in_main_zone && !t.is_proposed).length, color: 'text-yellow-600', filter: 'extended' },
            { label: 'Propuse direct', value: tasks.filter(t => t.is_proposed).length, color: 'text-purple-600', filter: 'proposed' },
          ].map((stat) => (
            <button
              key={stat.label}
              onClick={() => setZoneFilter(stat.filter)}
              className={`p-3 rounded-xl border transition text-left
                ${zoneFilter === stat.filter ? 'border-blue-300 bg-blue-50' : 'border-gray-100 bg-white hover:border-gray-200'}
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
                  <div className={`h-1 ${task.is_proposed ? 'bg-purple-500' : task.is_in_main_zone ? 'bg-green-500' : 'bg-yellow-400'}`} />

                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <TaskPhoto photos={task.photos} category={task.category_name} className="w-14 h-14 flex-shrink-0" />
                        <div className="min-w-0">
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
                      {task.offer_count > 0 && (
                        <span className="flex items-center gap-1 text-blue-600">
                          <Send className="w-3 h-3" /> {task.offer_count} oferte
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                      {task.is_proposed && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-lg font-medium">📩 Propus direct</span>
                      )}
                      {task.is_in_main_zone ? (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-lg font-medium">🟢 Zona ta</span>
                      ) : task.distance_km !== null && task.distance_km !== undefined && (
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-lg font-medium">🟡 Zona extinsă</span>
                      )}
                    </div>

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
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setSelectedTask(task)
                                setRequestMode('negotiate')
                                setOfferForm(prev => ({ ...prev, proposed_price: task.budget || '' }))
                                setShowOfferModal(true)
                              }}
                              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                            >
                              <Send className="w-3.5 h-3.5" /> Negociază
                            </button>
                            <button
                              onClick={() => {
                                setSelectedTask(task)
                                setRequestMode('message')
                                setOfferForm(prev => ({
                                  ...prev,
                                  proposed_price: prev.proposed_price || task.budget || '',
                                  message: `Salut! Sunt interesat de taskul „${task.title}". Putem discuta detaliile?`,
                                }))
                                setShowOfferModal(true)
                              }}
                              className="w-9 h-9 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-50 transition"
                            >
                              <MessageSquare className="w-4 h-4 text-gray-400" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
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
              Nu există taskuri în zona ta momentan. Încearcă să extinzi raza de căutare.
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
        onClose={() => setShowOfferModal(false)}
        onSubmit={handleSendOffer}
        form={offerForm}
        setForm={setOfferForm}
        sending={sendingOffer}
      />

    </div>
  )
}