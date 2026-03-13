import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import DashboardNavbar from '../components/dashboard/DashboardNavbar'
import {
  Search, SlidersHorizontal, LayoutGrid, List, X,
  TrendingUp, Star, MapPin, CheckCircle, Clock,
  MessageSquare, Award, Loader2, ChevronDown, Wrench,
  Shield, Briefcase, Calendar
} from 'lucide-react'

// ─── helpers ──────────────────────────────────────────────────────────────────
function slugify(first, last) {
  return `${first}-${last}`.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

function Initials({ name, size = 'md', url }) {
  const sz = { sm:'w-10 h-10 text-sm', md:'w-12 h-12 text-base', lg:'w-14 h-14 text-lg' }
  return (
    <div className={`${sz[size]} rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {url ? <img src={url} alt="" className="w-full h-full object-cover"/> : name.split(' ').map(n=>n[0]).join('')}
    </div>
  )
}

function StarRow({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i=>(
        <Star key={i} className={`w-3.5 h-3.5 ${i<=Math.round(rating)?'fill-yellow-400 text-yellow-400':'text-gray-200'}`}/>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function FindServices() {
  const navigate = useNavigate()

  // ── state ──────────────────────────────────────────────────────────────────
  const [loading,          setLoading]          = useState(true)
  const [handymen,         setHandymen]         = useState([])   // merged handyman objects
  const [categories,       setCategories]       = useState([])
  const [userCity,         setUserCity]         = useState(null)
  const [userCounty,       setUserCounty]       = useState(null)
  const [viewMode,         setViewMode]         = useState('grid')
  const [showFilters,      setShowFilters]      = useState(false)
  const [searchQuery,      setSearchQuery]      = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy,           setSortBy]           = useState('score')
  const [filters, setFilters] = useState({
    availability: 'all',   // 'all' | 'available'
    minRating:    0,
    maxPrice:     '',
    verifiedOnly: false,
    insuredOnly:  false,
  })

  // ── initial load ───────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true)

      // 1. current user + city
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: myProfile } = await supabase
        .from('profiles')
        .select('city, county')
        .eq('id', user.id)
        .maybeSingle()

      const city   = myProfile?.city   ?? null
      const county = myProfile?.county ?? null
      setUserCity(city)
      setUserCounty(county)

      // 2. categories
      const { data: cats } = await supabase
        .from('categories')
        .select('id, name, slug, icon')
        .eq('is_active', true)
        .order('name')
      setCategories(cats ?? [])

      // 3. handyman_profiles in same city (or all if city unknown)
      let hpQuery = supabase
        .from('handyman_profiles')
        .select('user_id, bio, hourly_rate, rating_avg, total_jobs_completed, is_available, is_verified, has_insurance, specialties, primary_city, primary_county, work_radius_km, cover_url')
      if (city) hpQuery = hpQuery.eq('primary_city', city)

      const { data: hProfiles } = await hpQuery
      if (!hProfiles?.length) { setLoading(false); return }

      const userIds = hProfiles.map(h => h.user_id)

      // 4. profiles (names + avatars) for those user_ids
      const { data: pRows } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .in('id', userIds)

      // 5. handyman_services for those handymen (only available)
      const { data: svcRows } = await supabase
        .from('handyman_services')
        .select('id, handyman_id, title, description, base_price, price_per_hour, estimated_duration, photos, keywords, times_booked, is_popular, is_available, category_id, categories(id, name)')
        .in('handyman_id', userIds)
        .eq('is_available', true)

      // 6. merge everything
      const profileMap  = Object.fromEntries((pRows ?? []).map(p => [p.id, p]))
      const servicesMap = {}
      ;(svcRows ?? []).forEach(s => {
        if (!servicesMap[s.handyman_id]) servicesMap[s.handyman_id] = []
        servicesMap[s.handyman_id].push(s)
      })

      const merged = hProfiles.map(hp => {
        const p = profileMap[hp.user_id] ?? {}
        const firstName = p.first_name ?? ''
        const lastName  = p.last_name  ?? ''
        return {
          ...hp,
          first_name:  firstName,
          last_name:   lastName,
          full_name:   `${firstName} ${lastName}`.trim(),
          avatar_url:  p.avatar_url ?? null,
          slug:        slugify(firstName, lastName),
          services:    servicesMap[hp.user_id] ?? [],
          // computed score: 60% jobs, 40% rating (only for rating >= 4.7)
          score: ((hp.rating_avg ?? 0) * 0.4) + (Math.min(hp.total_jobs_completed ?? 0, 200) / 200 * 0.6),
        }
      }).filter(h => h.full_name.trim() !== '')

      setHandymen(merged)
      setLoading(false)
    }
    load()
  }, [])

  // ── filtered + sorted list ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return handymen.filter(h => {
      // search
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matchName = h.full_name.toLowerCase().includes(q)
        const matchSpec = (h.specialties ?? []).some(s => s.toLowerCase().includes(q))
        const matchSvc  = h.services.some(s => s.title.toLowerCase().includes(q))
        if (!matchName && !matchSpec && !matchSvc) return false
      }
      // category
      if (selectedCategory !== 'all') {
        const catId = Number(selectedCategory)
        if (!h.services.some(s => s.category_id === catId)) return false
      }
      // availability
      if (filters.availability === 'available' && !h.is_available) return false
      // rating
      if (filters.minRating > 0 && (h.rating_avg ?? 0) < filters.minRating) return false
      // max price
      if (filters.maxPrice !== '' && Number(h.hourly_rate) > Number(filters.maxPrice)) return false
      // verified
      if (filters.verifiedOnly && !h.is_verified) return false
      // insured
      if (filters.insuredOnly && !h.has_insurance) return false
      return true
    }).sort((a, b) => {
      if (sortBy === 'score')       return b.score - a.score
      if (sortBy === 'rating')      return (b.rating_avg ?? 0) - (a.rating_avg ?? 0)
      if (sortBy === 'jobs')        return (b.total_jobs_completed ?? 0) - (a.total_jobs_completed ?? 0)
      if (sortBy === 'price_low')   return (a.hourly_rate ?? 0) - (b.hourly_rate ?? 0)
      if (sortBy === 'price_high')  return (b.hourly_rate ?? 0) - (a.hourly_rate ?? 0)
      return 0
    })
  }, [handymen, searchQuery, selectedCategory, filters, sortBy])

  // ── featured: rating >= 4.7, top 3 by score ────────────────────────────────
  const featured = useMemo(() => {
    return handymen
      .filter(h => (h.rating_avg ?? 0) >= 4.7 && h.is_available)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
  }, [handymen])

  // ── popular categories (those that appear most in services) ────────────────
  const popularCats = useMemo(() => {
    const counts = {}
    handymen.forEach(h => h.services.forEach(s => {
      if (s.categories?.name) counts[s.categories.name] = (counts[s.categories.name] ?? 0) + 1
    }))
    return Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0, 4)
  }, [handymen])

  const clearFilters = () => {
    setFilters({ availability:'all', minRating:0, maxPrice:'', verifiedOnly:false, insuredOnly:false })
    setSelectedCategory('all')
    setSearchQuery('')
  }

  const activeFilterCount = [
    filters.availability !== 'all',
    filters.minRating > 0,
    filters.maxPrice !== '',
    filters.verifiedOnly,
    filters.insuredOnly,
    selectedCategory !== 'all',
  ].filter(Boolean).length

  // ── loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavbar/>
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin"/>
        <p className="text-sm text-gray-400">Se caută handymani din zona ta…</p>
      </div>
    </div>
  )

  // ═════════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavbar/>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

        {/* ── HEADER ── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Caută Servicii</h1>
            <p className="text-gray-500 mt-1 text-sm flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-blue-500"/>
              {userCity
                ? <>Handymani din <strong className="text-gray-700">{userCity}{userCounty ? `, ${userCounty}` : ''}</strong></>
                : 'Toți handymanii disponibili'
              }
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={()=>setViewMode('grid')}
              className={`w-9 h-9 rounded-lg border flex items-center justify-center transition ${viewMode==='grid'?'bg-blue-600 text-white border-blue-600':'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
              <LayoutGrid className="w-4 h-4"/>
            </button>
            <button onClick={()=>setViewMode('list')}
              className={`w-9 h-9 rounded-lg border flex items-center justify-center transition ${viewMode==='list'?'bg-blue-600 text-white border-blue-600':'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
              <List className="w-4 h-4"/>
            </button>
          </div>
        </div>

        {/* ── SEARCH + CONTROLS ── */}
        <div className="flex flex-col md:flex-row gap-3">
          {/* search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
            <input type="text" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
              placeholder="Caută după nume, serviciu sau specialitate…"
              className="w-full pl-11 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"/>
            {searchQuery && (
              <button onClick={()=>setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600"/>
              </button>
            )}
          </div>

          {/* category */}
          <select value={selectedCategory} onChange={e=>setSelectedCategory(e.target.value)}
            className="px-3 py-2.5 border border-gray-300 rounded-xl bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[180px]">
            <option value="all">Toate categoriile</option>
            {categories.map(c=>(
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* sort */}
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
            className="px-3 py-2.5 border border-gray-300 rounded-xl bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[180px]">
            <option value="score">Recomandat (experiență + rating)</option>
            <option value="rating">Cel mai bun rating</option>
            <option value="jobs">Cele mai multe lucrări</option>
            <option value="price_low">Preț: mic → mare</option>
            <option value="price_high">Preț: mare → mic</option>
          </select>

          {/* filters toggle */}
          <button onClick={()=>setShowFilters(o=>!o)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition relative ${
              showFilters?'bg-blue-600 text-white':'border border-gray-300 text-gray-700 hover:bg-gray-50 bg-white'
            }`}>
            <SlidersHorizontal className="w-4 h-4"/>
            Filtre
            {activeFilterCount>0&&(
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* ── ADVANCED FILTERS PANEL ── */}
        {showFilters && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 text-sm">Filtre avansate</h3>
              <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition">
                <X className="w-3.5 h-3.5"/> Resetează
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {/* availability */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Disponibilitate</label>
                <select value={filters.availability} onChange={e=>setFilters(p=>({...p,availability:e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="all">Oricare</option>
                  <option value="available">Disponibil acum</option>
                </select>
              </div>

              {/* min rating */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Rating minim</label>
                <select value={filters.minRating} onChange={e=>setFilters(p=>({...p,minRating:Number(e.target.value)}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value={0}>Oricare</option>
                  <option value={4}>4.0+</option>
                  <option value={4.5}>4.5+</option>
                  <option value={4.7}>4.7+</option>
                  <option value={4.9}>4.9+</option>
                </select>
              </div>

              {/* max price */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Preț max (RON/h)</label>
                <input type="number" value={filters.maxPrice} onChange={e=>setFilters(p=>({...p,maxPrice:e.target.value}))}
                  placeholder="Ex: 150"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>

              {/* verified */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Verificare</label>
                <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition">
                  <input type="checkbox" checked={filters.verifiedOnly} onChange={e=>setFilters(p=>({...p,verifiedOnly:e.target.checked}))}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600"/>
                  <span className="text-sm text-gray-700">Doar verificați</span>
                </label>
              </div>

              {/* insured */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Asigurare</label>
                <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition">
                  <input type="checkbox" checked={filters.insuredOnly} onChange={e=>setFilters(p=>({...p,insuredOnly:e.target.checked}))}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600"/>
                  <span className="text-sm text-gray-700">Asigurați</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ── POPULAR CATEGORIES ── */}
        {popularCats.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-800 text-sm mb-3">Servicii populare în zona ta</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {popularCats.map(([name, count]) => (
                <button key={name}
                  onClick={()=>{
                    const cat = categories.find(c=>c.name===name)
                    if (cat) setSelectedCategory(String(cat.id))
                  }}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition text-left">
                  <div>
                    <p className="font-semibold text-sm text-gray-800">{name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{count} handymani</p>
                  </div>
                  <TrendingUp className="w-4 h-4 text-green-500 flex-shrink-0"/>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── FEATURED / RECOMANDAȚI ── */}
        {featured.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-yellow-500"/>
              <h2 className="text-base font-bold text-gray-800">Profesioniști Recomandați</h2>
              <span className="px-2 py-0.5 bg-yellow-50 text-yellow-600 text-xs font-semibold rounded-full border border-yellow-100">
                Rating 4.7+ · Experiență dovedită
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {featured.map(h => (
                <Link key={h.user_id} to={`/handymen/${h.slug}`}
                  className="relative bg-white rounded-2xl border-2 border-blue-100 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all p-5 block">
                  <span className="absolute top-4 right-4 px-2 py-0.5 bg-blue-100 text-blue-600 text-xs font-bold rounded-full">
                    ⭐ Recomandat
                  </span>

                  <div className="flex items-center gap-3 mb-3">
                    <Initials name={h.full_name} url={h.avatar_url} size="md"/>
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="font-bold text-gray-800">{h.full_name}</p>
                        {h.is_verified&&<CheckCircle className="w-4 h-4 text-blue-500"/>}
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3"/>{h.primary_city}{h.primary_county?`, ${h.primary_county}`:''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    {h.hourly_rate&&<span className="font-bold text-blue-600 text-sm">{Number(h.hourly_rate)} RON/h</span>}
                    <div className="flex items-center gap-1">
                      <StarRow rating={h.rating_avg??0}/>
                      <span className="text-xs font-semibold text-gray-700">{Number(h.rating_avg??0).toFixed(1)}</span>
                    </div>
                  </div>

                  {/* specialties or services */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {(h.specialties?.slice(0,3) ?? h.services.slice(0,3).map(s=>s.title)).map(tag=>(
                      <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md font-medium">{tag}</span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                    <span className="flex items-center gap-1">
                      <Wrench className="w-3 h-3"/>{h.total_jobs_completed??0} lucrări
                    </span>
                    <span className={`font-semibold flex items-center gap-1 ${h.is_available?'text-green-600':'text-gray-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${h.is_available?'bg-green-500':'bg-gray-400'}`}/>
                      {h.is_available?'Disponibil':'Indisponibil'}
                    </span>
                    {h.has_insurance&&<span className="flex items-center gap-1 text-green-600"><Shield className="w-3 h-3"/>Asigurat</span>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── RESULTS ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-gray-800">
                {filtered.flatMap(h=>h.services).length}
              </span> servicii găsite de la <span className="font-semibold text-gray-800">{filtered.length}</span> handymani
              {userCity&&<span className="ml-1">în {userCity}</span>}
            </p>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                <X className="w-3 h-3"/> Șterge filtrele
              </button>
            )}
          </div>

            {/* flatten + filter services from all filtered handymen */}
          {(()=>{
            const catId = selectedCategory !== 'all' ? Number(selectedCategory) : null
            const allServices = filtered.flatMap(h =>
              h.services
                .filter(svc => catId === null || svc.category_id === catId)
                .map(svc => ({ ...svc, handyman: h }))
            )

            if (allServices.length === 0) return (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                <Search className="w-12 h-12 text-gray-200 mx-auto mb-4"/>
                <h3 className="text-base font-bold text-gray-700 mb-1">Niciun serviciu găsit</h3>
                <p className="text-sm text-gray-400 mb-4">Încearcă să modifici filtrele sau căutarea</p>
                <button onClick={clearFilters} className="text-blue-600 text-sm font-medium hover:underline">Resetează filtrele</button>
              </div>
            )

            if (viewMode === 'grid') return (
              /* ── GRID: service cards ── */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allServices.map(svc => {
                  const h = svc.handyman
                  return (
                    <div key={svc.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all overflow-hidden group">

                      {/* photo */}
                      {Array.isArray(svc.photos) && svc.photos[0]
                        ? <div className="h-44 overflow-hidden">
                            <img src={svc.photos[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                          </div>
                        : <div className="h-44 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                            <Wrench className="w-12 h-12 text-blue-400 group-hover:scale-110 transition-transform"/>
                          </div>
                      }

                      <div className="p-4">
                        {/* title + category */}
                        <h4 className="font-bold text-gray-800 mb-0.5">{svc.title}</h4>
                        {svc.categories && (
                          <p className="text-xs text-blue-500 font-semibold mb-2">{svc.categories.name}</p>
                        )}
                        <p className="text-sm text-gray-500 line-clamp-2 mb-4">{svc.description}</p>

                        {/* pricing cards */}
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          <div className="bg-blue-50 rounded-xl p-3 text-center">
                            <p className="text-[11px] text-blue-400 font-medium mb-0.5">Preț de bază</p>
                            <p className="text-base font-black text-blue-700">
                              {svc.base_price ? `${Number(svc.base_price).toLocaleString('ro-RO')} RON` : '—'}
                            </p>
                          </div>
                          <div className="bg-purple-50 rounded-xl p-3 text-center">
                            <p className="text-[11px] text-purple-400 font-medium mb-0.5">Pe oră</p>
                            <p className="text-base font-black text-purple-700">
                              {svc.price_per_hour ? `${Number(svc.price_per_hour).toLocaleString('ro-RO')} RON` : '—'}
                            </p>
                          </div>
                        </div>

                        {/* stats */}
                        <div className="flex items-center gap-4 text-xs text-gray-500 pb-3 mb-3 border-b border-gray-100">
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-3.5 h-3.5 text-gray-400"/>
                            <strong className="text-gray-700">{svc.times_booked ?? 0}</strong> rezervări
                          </span>
                          {svc.estimated_duration && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-gray-400"/>
                              {svc.estimated_duration}
                            </span>
                          )}
                          {svc.is_popular && (
                            <span className="ml-auto px-2 py-0.5 bg-yellow-50 text-yellow-600 font-semibold rounded-full border border-yellow-100 text-[10px]">
                              🔥 Popular
                            </span>
                          )}
                        </div>

                        {/* keywords */}
                        {Array.isArray(svc.keywords) && svc.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {svc.keywords.slice(0,4).map(tag=>(
                              <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md font-medium">{tag}</span>
                            ))}
                          </div>
                        )}

                        {/* handyman footer */}
                        <Link to={`/handymen/${h.slug}`}
                          className="flex items-center justify-between pt-3 border-t border-gray-100 hover:opacity-80 transition mb-3"
                          onClick={e=>e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <Initials name={h.full_name} url={h.avatar_url} size="sm"/>
                            <div>
                              <div className="flex items-center gap-1">
                                <p className="text-xs font-bold text-gray-800">{h.full_name}</p>
                                {h.is_verified&&<CheckCircle className="w-3 h-3 text-blue-500"/>}
                              </div>
                              <div className="flex items-center gap-1">
                                <StarRow rating={h.rating_avg??0}/>
                                <span className="text-[10px] text-gray-400">{Number(h.rating_avg??0).toFixed(1)}</span>
                              </div>
                            </div>
                          </div>
                          <span className={`text-[10px] font-semibold flex items-center gap-1 ${h.is_available?'text-green-600':'text-gray-400'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${h.is_available?'bg-green-500':'bg-gray-300'}`}/>
                            {h.is_available?'Disponibil':'Indisponibil'}
                          </span>
                        </Link>

                        {/* action buttons */}
                        <div className="flex gap-2">
                          <Link to={`/book/${h.slug}?service=${svc.id}`}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 text-white py-2 rounded-xl text-xs font-semibold hover:bg-blue-700 transition">
                            <Calendar className="w-3.5 h-3.5"/> Rezervă
                          </Link>
                          <button className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-xl text-gray-400 hover:text-blue-600 hover:border-blue-300 transition flex-shrink-0">
                            <MessageSquare className="w-4 h-4"/>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )

            /* ── LIST: service rows ── */
            return (
              <div className="space-y-3">
                {allServices.map(svc => {
                  const h = svc.handyman
                  return (
                    <div key={svc.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all overflow-hidden flex">
                      {/* photo */}
                      <div className="w-36 flex-shrink-0">
                        {Array.isArray(svc.photos)&&svc.photos[0]
                          ? <img src={svc.photos[0]} alt="" className="w-full h-full object-cover"/>
                          : <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center min-h-[120px]">
                              <Wrench className="w-8 h-8 text-blue-400"/>
                            </div>
                        }
                      </div>

                      <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                        <div>
                          <div className="flex items-start justify-between mb-1">
                            <div>
                              <h4 className="font-bold text-gray-800">{svc.title}</h4>
                              {svc.categories&&<p className="text-xs text-blue-500 font-semibold">{svc.categories.name}</p>}
                            </div>
                            {svc.is_popular&&(
                              <span className="px-2 py-0.5 bg-yellow-50 text-yellow-600 text-[10px] font-bold rounded-full border border-yellow-100 flex-shrink-0 ml-2">🔥 Popular</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-1 mt-1 mb-2">{svc.description}</p>
                          {/* keywords */}
                          {Array.isArray(svc.keywords)&&svc.keywords.length>0&&(
                            <div className="flex flex-wrap gap-1 mb-2">
                              {svc.keywords.slice(0,3).map(tag=>(
                                <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md">{tag}</span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          {/* handyman */}
                          <Link to={`/handymen/${h.slug}`} className="flex items-center gap-2 hover:opacity-80 transition">
                            <Initials name={h.full_name} url={h.avatar_url} size="sm"/>
                            <div>
                              <p className="text-xs font-bold text-gray-700">{h.full_name}</p>
                              <div className="flex items-center gap-1">
                                <StarRow rating={h.rating_avg??0}/>
                                <span className="text-[10px] text-gray-400">{Number(h.rating_avg??0).toFixed(1)}</span>
                              </div>
                            </div>
                          </Link>

                          {/* price + stats */}
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Briefcase className="w-3 h-3"/>{svc.times_booked??0} rezervări
                            </span>
                            {svc.estimated_duration&&<span className="flex items-center gap-1"><Clock className="w-3 h-3"/>{svc.estimated_duration}</span>}
                            <div className="text-right">
                              <p className="font-black text-blue-700 text-sm">{svc.base_price?`${Number(svc.base_price).toLocaleString('ro-RO')} RON`:'—'}</p>
                              {svc.price_per_hour&&<p className="text-[10px] text-purple-500 font-semibold">{Number(svc.price_per_hour).toLocaleString('ro-RO')} RON/h</p>}
                            </div>
                          </div>

                          {/* action buttons */}
                          <div className="flex gap-2 ml-2 flex-shrink-0">
                            <Link to={`/book/${h.slug}?service=${svc.id}`}
                              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition">
                              <Calendar className="w-3.5 h-3.5"/> Rezervă
                            </Link>
                            <button className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-xl text-gray-400 hover:text-blue-600 hover:border-blue-300 transition">
                              <MessageSquare className="w-4 h-4"/>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>

      </div>
    </div>
  )
}