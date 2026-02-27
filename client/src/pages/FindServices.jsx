import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import DashboardNavbar from '../components/dashboard/DashboardNavbar'
import { 
  Search, SlidersHorizontal, LayoutGrid, List, X,
  TrendingUp, Star, MapPin, CheckCircle, Clock,
  MessageSquare, Phone, Award
} from 'lucide-react'


const popularServices = [
  { name: 'Instalații sanitare', searches: 350 },
  { name: 'Zugrăveli & Vopsitorie', searches: 600 },
  { name: 'Instalații Electrice', searches: 200 },
  { name: 'Curățenie', searches: 150 },
]

const mockHandymen = [
  { name: 'Ion Marin', rating: 4.9, reviews: 127, specialties: ['Instalații sanitare', 'Reparații generale'], rate: '80 RON/h', jobs: 5, verified: true, available: true },
  { name: 'Mihai Stancu', rating: 4.7, reviews: 98, specialties: ['Zugrăveli & Vopsitorie', 'Tapet'], rate: '65 RON/h', jobs: 3, verified: true, available: true },
  { name: 'Andrei Lungu', rating: 4.8, reviews: 85, specialties: ['Tâmplărie', 'Montaj mobilă'], rate: '90 RON/h', jobs: 2, verified: true, available: false },
  { name: 'Dan Nistor', rating: 4.6, reviews: 64, specialties: ['Instalații Electrice', 'Reparații generale'], rate: '75 RON/h', jobs: 4, verified: false, available: true },
  { name: 'Ana Dragomir', rating: 4.9, reviews: 112, specialties: ['Curățenie', 'Organizare'], rate: '55 RON/h', jobs: 8, verified: true, available: true },
  { name: 'Radu Ionescu', rating: 4.5, reviews: 43, specialties: ['Grădinărit', 'Peisagistică'], rate: '70 RON/h', jobs: 1, verified: true, available: true },
]

const featuredHandymen = [
  { 
    name: 'Ion Marin', 
    address: 'Str. Victoriei 15, Timișoara · 2.3km',
    rate: '90 RON/h', 
    rating: 4.9, 
    reviews: 127, 
    badges: ['Top Rating', 'Răspuns Rapid', 'Expert Local'],
    availability: 'Disponibil azi',
    availColor: 'text-green-600',
    verified: true,
  },
  { 
    name: 'Ana Dragomir', 
    address: 'Bd. Revoluției 45, Timișoara · 1.5km',
    rate: '75 RON/h', 
    rating: 4.8, 
    reviews: 85, 
    badges: ['Specialist', 'Asigurat', 'Licențiat'],
    availability: 'Disponibil mâine',
    availColor: 'text-yellow-600',
    verified: true,
  },
  { 
    name: 'Mihai Stancu', 
    address: 'Str. Republicii 78, Timișoara · 3.1km',
    rate: '80 RON/h', 
    rating: 4.7, 
    reviews: 90, 
    badges: ['Alegere Populară', 'Experimentat', 'Calitate'],
    availability: 'Disponibil săptămâna aceasta',
    availColor: 'text-blue-600',
    verified: true,
  },
]

const allProfessionals = [
  { name: 'Ion Marin', address: 'Str. Victoriei 15, Timișoara', rating: 4.9, reviews: 127, service: 'Instalații Electrice', availability: 'Disponibil azi', availColor: 'text-green-600', rate: '90 RON/h', responseTime: 'Răspunde < 1 oră' },
  { name: 'Ana Dragomir', address: 'Bd. Revoluției 45, Timișoara', rating: 4.8, reviews: 150, service: 'Design Interior', availability: 'Disponibil săpt. viitoare', availColor: 'text-blue-600', rate: '75 RON/h', responseTime: 'Răspunde < 3 ore' },
  { name: 'Mihai Stancu', address: 'Str. Republicii 78, Timișoara', rating: 4.7, reviews: 98, service: 'Instalații Sanitare', availability: 'Disponibil mâine', availColor: 'text-yellow-600', rate: '65 RON/h', responseTime: 'Răspunde < 2 ore' },
  { name: 'Dan Nistor', address: 'Str. Eroilor 3, Timișoara', rating: 4.6, reviews: 110, service: 'Tâmplărie', availability: 'Disponibil azi', availColor: 'text-green-600', rate: '85 RON/h', responseTime: 'Răspunde < 1 oră' },
  { name: 'Radu Ionescu', address: 'Calea Aradului 18, Timișoara', rating: 4.9, reviews: 200, service: 'Zugrăveli & Vopsitorie', availability: 'Disponibil weekend', availColor: 'text-purple-600', rate: '95 RON/h', responseTime: 'Răspunde < 30 min' },
  { name: 'Andrei Lungu', address: 'Str. Dacilor 45, Timișoara', rating: 4.5, reviews: 65, service: 'Montaj mobilă', availability: 'Disponibil azi', availColor: 'text-green-600', rate: '70 RON/h', responseTime: 'Răspunde < 1 oră' },
]

export default function FindServices() {
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState('top_rated')
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('all')

  const [filters, setFilters] = useState({
    minPrice: 0,
    maxPrice: 200,
    availability: 'all',
    maxDistance: 'any',
    verifiedOnly: false,
  })

  useEffect(() => {
    async function loadCategories() {
      const { data } = await supabase.from('categories').select('*').eq('is_active', true)
      if (data) setCategories(data)
    }
    loadCategories()
  }, [])

  const filteredHandymen = mockHandymen.filter(h => {
    if (searchQuery && !h.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !h.specialties.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))) return false
    if (filters.verifiedOnly && !h.verified) return false
    if (selectedCategory !== 'all' && !h.specialties.includes(selectedCategory)) return false
    return true
  }).sort((a, b) => {
    if (sortBy === 'top_rated') return b.rating - a.rating
    if (sortBy === 'most_reviews') return b.reviews - a.reviews
    if (sortBy === 'price_low') return parseInt(a.rate) - parseInt(b.rate)
    if (sortBy === 'price_high') return parseInt(b.rate) - parseInt(a.rate)
    return 0
  })

  const clearFilters = () => {
    setFilters({ minPrice: 0, maxPrice: 200, availability: 'all', maxDistance: 'any', verifiedOnly: false })
    setSelectedCategory('all')
    setSearchQuery('')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Caută Servicii</h1>
            <p className="text-gray-500 mt-1">Găsește handymanul perfect pentru lucrarea ta</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`w-10 h-10 rounded-lg border flex items-center justify-center transition
                ${viewMode === 'grid' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}
              `}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`w-10 h-10 rounded-lg border flex items-center justify-center transition
                ${viewMode === 'list' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}
              `}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search bar + Sort + Filter toggle */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Caută servicii, handymani sau cuvinte cheie..."
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-xl bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Toate serviciile ({mockHandymen.length})</option>
              {(categories.length > 0 ? categories.map(c => c.name) : ['Instalații sanitare', 'Instalații Electrice', 'Zugrăveli & Vopsitorie', 'Tâmplărie', 'Curățenie', 'Grădinărit']).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-xl bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="top_rated">Top Rating</option>
              <option value="most_reviews">Cele mai multe recenzii</option>
              <option value="price_low">Preț: mic → mare</option>
              <option value="price_high">Preț: mare → mic</option>
            </select>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition
                ${showFilters ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}
              `}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filtre
            </button>
          </div>
        </div>

        {/* Popular Services */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
          <h3 className="font-bold text-gray-800 mb-3">Servicii populare săptămâna aceasta</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {popularServices.map((service) => (
              <button
                key={service.name}
                onClick={() => setSearchQuery(service.name)}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition text-left"
              >
                <div>
                  <p className="font-medium text-sm">{service.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{service.searches} căutări</p>
                </div>
                <TrendingUp className="w-4 h-4 text-green-500 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">Filtre avansate</h3>
              <button onClick={clearFilters} className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 transition">
                Resetează tot <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Price Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preț (RON/oră)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={filters.minPrice}
                    onChange={(e) => setFilters({ ...filters, minPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Min"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="number"
                    value={filters.maxPrice}
                    onChange={(e) => setFilters({ ...filters, maxPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Max"
                  />
                </div>
              </div>

              {/* Availability */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Disponibilitate</label>
                <select
                  value={filters.availability}
                  onChange={(e) => setFilters({ ...filters, availability: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Oricare</option>
                  <option value="today">Disponibil azi</option>
                  <option value="week">Săptămâna aceasta</option>
                  <option value="month">Luna aceasta</option>
                </select>
              </div>

              {/* Distance */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Distanță maximă</label>
                <select
                  value={filters.maxDistance}
                  onChange={(e) => setFilters({ ...filters, maxDistance: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="any">Oricare</option>
                  <option value="5">Sub 5 km</option>
                  <option value="10">Sub 10 km</option>
                  <option value="25">Sub 25 km</option>
                  <option value="50">Sub 50 km</option>
                </select>
              </div>

              {/* Verified */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Verificare</label>
                <label className="flex items-center gap-3 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                  <input
                    type="checkbox"
                    checked={filters.verifiedOnly}
                    onChange={(e) => setFilters({ ...filters, verifiedOnly: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Doar verificați</span>
                </label>
              </div>
            </div>
          </div>
        )}
        {/* Featured Professionals */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Award className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg font-bold text-gray-800">Profesioniști Recomandați</h2>
            <span className="px-2.5 py-0.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">Top alegeri</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {featuredHandymen.map((h, i) => (
              <div key={i} className="relative bg-white rounded-xl border-2 border-blue-100 shadow-sm hover:shadow-lg transition-all p-5">
                <span className="absolute top-4 right-4 px-2.5 py-0.5 bg-blue-100 text-blue-600 text-xs font-semibold rounded-full">
                  Recomandat
                </span>

                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                    {h.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-gray-800">{h.name}</p>
                      {h.verified && <CheckCircle className="w-4 h-4 text-blue-600" />}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      <span>{h.address}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <span className="font-bold text-blue-600">{h.rate}</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">{h.rating}</span>
                    <span className="text-xs text-gray-400">({h.reviews} recenzii)</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {h.badges.map((badge) => (
                    <span key={badge} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md font-medium">
                      {badge}
                    </span>
                  ))}
                </div>

                <p className={`text-sm font-medium ${h.availColor} mb-4`}>{h.availability}</p>

                <div className="flex items-center gap-2">
                  <button className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700 transition">
                    Rezervă acum
                  </button>
                  <button className="w-10 h-10 border border-gray-200 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-300 transition">
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <button className="w-10 h-10 border border-gray-200 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-300 transition">
                    <Phone className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Results count */}
        <p className="text-sm text-gray-500 mb-4">
          {filteredHandymen.length} handymani găsiți
        </p>

        {/* Results Grid */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredHandymen.map((h, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                      {h.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-800">{h.name}</p>
                        {h.verified && <CheckCircle className="w-4 h-4 text-blue-600" />}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium text-gray-800">{h.rating}</span>
                        <span className="text-xs text-gray-400">({h.reviews} recenzii)</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-blue-600">{h.rate}</span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {h.specialties.map((s) => (
                    <span key={s} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg font-medium">
                      {s}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{h.jobs} lucrări cu tine</span>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span className={h.available ? 'text-green-600' : 'text-gray-400'}>
                        {h.available ? 'Disponibil' : 'Indisponibil'}
                      </span>
                    </div>
                  </div>
                  <button className="px-4 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition">
                    Rezervă
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHandymen.map((h, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5 flex items-center gap-5">
                <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg flex-shrink-0">
                  {h.name.split(' ').map(n => n[0]).join('')}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-800">{h.name}</p>
                    {h.verified && <CheckCircle className="w-4 h-4 text-blue-600" />}
                    <div className="flex items-center gap-1 ml-2">
                      <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium text-gray-800">{h.rating}</span>
                      <span className="text-xs text-gray-400">({h.reviews})</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {h.specialties.map((s) => (
                      <span key={s} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg font-medium">{s}</span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <p className="font-bold text-blue-600">{h.rate}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" />
                      <span className={`text-xs ${h.available ? 'text-green-600' : 'text-gray-400'}`}>
                        {h.available ? 'Disponibil' : 'Indisponibil'}
                      </span>
                    </div>
                  </div>
                  <button className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
                    Rezervă
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredHandymen.length === 0 && (
          <div className="text-center py-16">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">Niciun rezultat găsit</h3>
            <p className="text-gray-500">Încearcă să modifici filtrele sau caută altceva</p>
            <button onClick={clearFilters} className="mt-4 text-blue-600 font-medium hover:underline">
              Resetează filtrele
            </button>
          </div>
        )}

        {/* All Professionals */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">Toți Profesioniștii</h2>
            <span className="text-sm text-gray-500">{allProfessionals.length} rezultate</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {allProfessionals.map((h, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-bold text-sm">
                    {h.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{h.name}</p>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <MapPin className="w-3 h-3" />
                      <span>{h.address}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 mb-3">
                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">{h.rating}</span>
                  <span className="text-xs text-gray-400">({h.reviews} recenzii)</span>
                </div>

                <div className="mb-3">
                  <p className="text-xs text-gray-400 mb-1">Servicii oferite:</p>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-lg font-medium">
                    {h.service}
                  </span>
                </div>

                <p className={`text-sm font-medium ${h.availColor} mb-4`}>{h.availability}</p>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div>
                    <p className="font-bold text-gray-800">{h.rate}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-400">{h.responseTime}</span>
                    </div>
                  </div>
                  <button className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
                    Rezervă
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}