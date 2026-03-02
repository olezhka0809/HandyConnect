import { useState } from 'react'
import HandymanNavbar from '../components/handyman-dashboard/HandymanNavbar'
import JobRequestModal from '../components/handyman-dashboard/JobRequestModal'
import {
  Search, Calendar, AlertTriangle, MapPin, Camera, Clock,
  CheckCircle, XCircle, MessageSquare, Play, Star, Filter
} from 'lucide-react'

const allJobs = [
  // New
  {
    title: 'Reparație Circuit Urgentă',
    client: 'Fatima Ionescu',
    description: 'Întrerupătorul principal sare frecvent în living. Necesită diagnostic urgent și reparație.',
    date: 'Dec 08, 2025 la 9:00AM',
    photos: 2,
    address: 'Str. Victoriei 15, Timișoara',
    price: '275 RON',
    duration: '1-2 ore',
    urgency: 'high',
    status: 'new',
  },
  {
    title: 'Montaj Prize Bucătărie',
    client: 'Andrei Vasile',
    description: 'Necesită montaj 4 prize noi în bucătărie după renovare.',
    date: 'Dec 10, 2025 la 2:00PM',
    photos: 3,
    address: 'Bd. Revoluției 45, Timișoara',
    price: '350 RON',
    duration: '2-3 ore',
    urgency: 'medium',
    status: 'new',
  },
  // Accepted
  {
    title: 'Reparație Panou Electric Urgent',
    client: 'Elena Dumitrescu',
    description: 'Circuitul principal funcționează defectuos, necesită depanare imediată și reparație.',
    date: 'Ian 15, 2026 la 10:30AM',
    photos: 3,
    address: 'Str. Eroilor 22, Timișoara',
    price: '350 RON',
    duration: '2-3 ore',
    urgency: 'high',
    status: 'accepted',
  },
  {
    title: 'Instalare Iluminat Exterior',
    client: 'Bogdan Cristea',
    description: 'Montaj sistem iluminat LED exterior pentru grădină și alee.',
    date: 'Ian 18, 2026 la 9:00AM',
    photos: 2,
    address: 'Str. Dacilor 78, Timișoara',
    price: '520 RON',
    duration: '3-4 ore',
    urgency: 'normal',
    status: 'accepted',
  },
  {
    title: 'Verificare Instalație Electrică',
    client: 'Maria Popescu',
    description: 'Verificare completă instalație electrică apartament 3 camere.',
    date: 'Ian 20, 2026 la 11:00AM',
    photos: 0,
    address: 'Calea Aradului 33, Timișoara',
    price: '200 RON',
    duration: '1-2 ore',
    urgency: 'normal',
    status: 'accepted',
  },
  {
    title: 'Înlocuire Tablou Electric',
    client: 'Dan Nistor',
    description: 'Tabloul electric vechi necesită înlocuire completă cu unul nou, conform normelor.',
    date: 'Ian 22, 2026 la 8:00AM',
    photos: 4,
    address: 'Str. Republicii 12, Timișoara',
    price: '650 RON',
    duration: '4-5 ore',
    urgency: 'medium',
    status: 'accepted',
  },
  // In Progress
  {
    title: 'Reparație Cablaj Baie',
    client: 'Mihai Stancu',
    description: 'Circuitul principal funcționează defectuos, necesită depanare și reparație urgentă.',
    date: 'Ian 15, 2026 la 10:30AM',
    photos: 3,
    address: 'Str. Eroilor 22, Timișoara',
    price: '350 RON',
    duration: '2-3 ore',
    urgency: 'high',
    status: 'in_progress',
    progress: 60,
  },
  {
    title: 'Recablare Living',
    client: 'Ana Dragomir',
    description: 'Recablare completă living cu prize și întrerupătoare noi.',
    date: 'Ian 16, 2026 la 9:00AM',
    photos: 5,
    address: 'Bd. Cetății 55, Timișoara',
    price: '800 RON',
    duration: '1-2 zile',
    urgency: 'medium',
    status: 'in_progress',
    progress: 30,
  },
  {
    title: 'Montaj Sistem Smart Home',
    client: 'Radu Ionescu',
    description: 'Instalare prize și întrerupătoare inteligente în tot apartamentul.',
    date: 'Ian 14, 2026 la 2:00PM',
    photos: 3,
    address: 'Str. Memorandului 8, Timișoara',
    price: '950 RON',
    duration: '5-6 ore',
    urgency: 'normal',
    status: 'in_progress',
    progress: 80,
  },
  {
    title: 'Reparație Priză Defectă',
    client: 'Simona Radu',
    description: 'O priză din dormitor scânteie și nu funcționează corect.',
    date: 'Ian 15, 2026 la 4:00PM',
    photos: 1,
    address: 'Aleea Studenților 10, Timișoara',
    price: '120 RON',
    duration: '30 min',
    urgency: 'high',
    status: 'in_progress',
    progress: 90,
  },
  // Completed
  {
    title: 'Upgrade Panou Electric',
    client: 'Ion Marin',
    description: 'Upgrade panou electric pentru a suporta sarcina suplimentară de la aparatele noi.',
    date: 'Dec 20, 2025 la 1:00PM',
    photos: 3,
    address: 'Str. Independenței 14, Timișoara',
    price: '600 RON',
    duration: '2-3 ore',
    urgency: 'normal',
    status: 'completed',
    rating: 4.8,
    review: 'Upgrade-ul a fost impecabil, iar tehnicienii au fost foarte competenți. Recomand!',
  },
  {
    title: 'Instalare Cablaj Birou',
    client: 'Cristina Dobre',
    description: 'Instalare cablaj rețea pentru birou renovare. Necesită conformitate cu standardele de siguranță.',
    date: 'Dec 15, 2025 la 10:30AM',
    photos: 3,
    address: 'Str. Vasile Alecsandri 22, Timișoara',
    price: '450 RON',
    duration: '3-4 ore',
    urgency: 'normal',
    status: 'completed',
    rating: 4.9,
    review: 'Echipă foarte profesionistă, au terminat la timp și au respectat toate standardele de siguranță.',
  },
  {
    title: 'Montaj Lustră',
    client: 'Adrian Pavel',
    description: 'Montaj lustră mare în living, cu cablu de 3 metri.',
    date: 'Dec 12, 2025 la 3:00PM',
    photos: 2,
    address: 'Str. Pestalozzi 5, Timișoara',
    price: '180 RON',
    duration: '1 oră',
    urgency: 'normal',
    status: 'completed',
    rating: 5.0,
    review: 'Rapid, curat, profesionist. Cu siguranță voi apela din nou.',
  },
  {
    title: 'Reparație Întrerupător',
    client: 'Gabriela Pop',
    description: 'Întrerupătorul din hol nu funcționează, necesită înlocuire.',
    date: 'Dec 10, 2025 la 11:00AM',
    photos: 1,
    address: 'Str. Martir Ioan Stanciu 7, Timișoara',
    price: '100 RON',
    duration: '30 min',
    urgency: 'normal',
    status: 'completed',
    rating: 4.7,
    review: 'Lucrare simplă dar executată impecabil. Foarte mulțumită.',
  },
  {
    title: 'Verificare Periodică Instalație',
    client: 'Florin Munteanu',
    description: 'Verificare periodică instalație electrică casă individuală.',
    date: 'Dec 08, 2025 la 9:00AM',
    photos: 0,
    address: 'Str. Bucovinei 30, Timișoara',
    price: '250 RON',
    duration: '2 ore',
    urgency: 'normal',
    status: 'completed',
    rating: 4.6,
    review: 'Verificare amănunțită, a identificat câteva probleme minore și le-a rezolvat pe loc.',
  },
]

const statusTabs = [
  { id: 'all', label: 'Toate Job-urile' },
  { id: 'new', label: 'Noi' },
  { id: 'accepted', label: 'Acceptate' },
  { id: 'in_progress', label: 'În Progres' },
  { id: 'completed', label: 'Finalizate' },
]

const urgencyOptions = ['Toate', 'Urgent', 'Mediu', 'Normal']

export default function HandymanJobs() {
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('date')
  const [urgencyFilter, setUrgencyFilter] = useState('Toate')
  const [selectedJob, setSelectedJob] = useState(null)

  const filteredJobs = allJobs.filter(job => {
    if (activeTab !== 'all' && job.status !== activeTab) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (!job.title.toLowerCase().includes(q) && !job.client.toLowerCase().includes(q) && !job.description.toLowerCase().includes(q)) return false
    }
    if (urgencyFilter !== 'Toate') {
      const map = { 'Urgent': 'high', 'Mediu': 'medium', 'Normal': 'normal' }
      if (job.urgency !== map[urgencyFilter]) return false
    }
    return true
  })

  const getStatusCounts = (status) => allJobs.filter(j => j.status === status).length

  const getUrgencyStyle = (urgency) => {
    if (urgency === 'high') return 'bg-red-100 text-red-700'
    if (urgency === 'medium') return 'bg-yellow-100 text-yellow-700'
    return 'bg-green-100 text-green-700'
  }

  const getUrgencyLabel = (urgency) => {
    if (urgency === 'high') return 'Urgent'
    if (urgency === 'medium') return 'Mediu'
    return 'Normal'
  }

  const getStatusBadge = (status) => {
    if (status === 'new') return 'bg-blue-100 text-blue-700'
    if (status === 'accepted') return 'bg-yellow-100 text-yellow-700'
    if (status === 'in_progress') return 'bg-purple-100 text-purple-700'
    return 'bg-green-100 text-green-700'
  }

  const getStatusLabel = (status) => {
    if (status === 'new') return 'Nou'
    if (status === 'accepted') return 'Acceptat'
    if (status === 'in_progress') return 'În Progres'
    return 'Finalizat'
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
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-lg bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="date">Sortare după Dată</option>
              <option value="price">Sortare după Preț</option>
              <option value="urgency">Sortare după Urgență</option>
            </select>
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-lg bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {urgencyOptions.map(u => <option key={u} value={u}>{u === 'Toate' ? 'Toate urgențele' : u}</option>)}
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Caută job-uri după serviciu, client sau descriere..."
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white rounded-xl border border-gray-100 p-1.5">
          {statusTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 flex-1 py-2.5 rounded-lg text-sm font-medium text-center transition-all justify-center
                ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}
              `}
            >
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded text-xs font-bold
                ${activeTab === tab.id ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}
              `}>
                {tab.id === 'all' ? allJobs.length : getStatusCounts(tab.id)}
              </span>
            </button>
          ))}
        </div>

        {/* Jobs Grid */}
        {filteredJobs.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {filteredJobs.map((job, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer"
                onClick={() => setSelectedJob(job)}
              >
                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-gray-800">{job.title}</h3>
                      <p className="text-sm text-gray-500">{job.client}</p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{job.description}</p>

                  {/* Meta */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mb-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{job.date}</span>
                    </div>
                    {job.photos > 0 && (
                      <div className="flex items-center gap-1">
                        <Camera className="w-3 h-3" />
                        <span>{job.photos} Poze</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate max-w-[180px]">{job.address}</span>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getUrgencyStyle(job.urgency)}`}>
                      {getUrgencyLabel(job.urgency)}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(job.status)}`}>
                      {getStatusLabel(job.status)}
                    </span>
                    {job.status === 'in_progress' && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-600">
                        {job.progress}% Finalizat
                      </span>
                    )}
                  </div>

                  {/* Price & Duration */}
                  <div className="flex items-center gap-6 mb-4 pb-4 border-b border-gray-100">
                    <div>
                      <p className="text-xs text-gray-400">{job.status === 'completed' ? 'Preț' : 'Estimare cost'}</p>
                      <p className="font-bold text-blue-600">{job.price}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Durată</p>
                      <p className="font-bold text-gray-800">{job.duration}</p>
                    </div>
                  </div>

                  {/* Progress bar for in_progress */}
                  {job.status === 'in_progress' && (
                    <div className="mb-4">
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="bg-purple-500 h-1.5 rounded-full transition-all" style={{ width: `${job.progress}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Completed review */}
                  {job.status === 'completed' && job.rating && (
                    <div className="mb-4 bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-1 mb-1">
                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-bold text-gray-800">{job.rating}</span>
                        <span className="text-xs text-gray-400 ml-1">"{job.review}"</span>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {job.status === 'new' && (
                      <>
                        <button
                          onClick={() => setSelectedJob(job)}
                          className="flex-1 flex items-center justify-center gap-1 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Acceptă
                        </button>
                        <button className="flex items-center justify-center gap-1 px-4 py-2 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition">
                          <XCircle className="w-3.5 h-3.5" /> Refuză
                        </button>
                        <button className="flex items-center justify-center gap-1 px-4 py-2 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition">
                          <MessageSquare className="w-3.5 h-3.5" /> Mesaj
                        </button>
                      </>
                    )}
                    {job.status === 'accepted' && (
                      <>
                        <button className="flex-1 flex items-center justify-center gap-1 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition">
                          <Play className="w-3.5 h-3.5" /> Începe Job
                        </button>
                        <button className="flex items-center justify-center gap-1 px-4 py-2 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition">
                          <MessageSquare className="w-3.5 h-3.5" /> Mesaj
                        </button>
                      </>
                    )}
                    {job.status === 'in_progress' && (
                      <>
                        <button className="flex-1 flex items-center justify-center gap-1 py-2 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition">
                          <CheckCircle className="w-3.5 h-3.5" /> Marchează Finalizat
                        </button>
                        <button className="flex items-center justify-center gap-1 px-4 py-2 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition">
                          <MessageSquare className="w-3.5 h-3.5" /> Mesaj
                        </button>
                      </>
                    )}
                    {job.status === 'completed' && (
                      <>
                        <button className="flex-1 flex items-center justify-center gap-1 py-2 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 transition">
                          <CheckCircle className="w-3.5 h-3.5" /> Finalizat
                        </button>
                        <button className="flex items-center justify-center gap-1 px-4 py-2 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition">
                          <MessageSquare className="w-3.5 h-3.5" /> Mesaj
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">Niciun job găsit</h3>
            <p className="text-gray-500">Încearcă să modifici filtrele sau caută altceva</p>
          </div>
        )}
      </div>

      {/* Job Request Modal */}
      {selectedJob && (
        <JobRequestModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onAccept={(job, schedule) => {
            console.log('Accepted:', job.title, schedule)
            setSelectedJob(null)
          }}
          onDecline={(job) => {
            console.log('Declined:', job.title)
            setSelectedJob(null)
          }}
        />
      )}
    </div>
  )
}