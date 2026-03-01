import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabase'
import HandymanNavbar from '../components/handyman-dashboard/HandymanNavbar'
import JobRequestModal from '../components/handyman-dashboard/JobRequestModal'
import {
  MessageCircle, CheckCircle, XCircle, Clock, MapPin, Camera,
  Briefcase, Star, TrendingUp, Eye, DollarSign, Users,
  ChevronRight, Calendar, Award, BarChart3, Target
} from 'lucide-react'

const mockRequests = [
  {
    title: 'Upgrade Electric Bucătărie',
    client: 'Maria Popescu',
    date: 'Dec 08, 2025 la 10:00AM',
    photos: 3,
    address: 'Str. Victoriei 15, Timișoara',
    price: '850 RON',
    urgency: 'high',
  },
  {
    title: 'Reglare Cablaj Baie',
    client: 'Andrei Vasile',
    date: 'Feb 20, 2026 la 9:00AM',
    photos: 2,
    address: 'Str. Eroilor 45, Timișoara',
    price: '450 RON',
    urgency: 'medium',
  },
  {
    title: 'Instalare Iluminat Living',
    client: 'Elena Dumitrescu',
    date: 'Ian 15, 2026 la 2:30PM',
    photos: 5,
    address: 'Bd. Revoluției 123, Timișoara',
    price: '650 RON',
    urgency: 'normal',
  },
  {
    title: 'Instalare Lumini Securitate Exterior',
    client: 'Bogdan Cristea',
    date: 'Mar 30, 2026 la 11:00AM',
    photos: 4,
    address: 'Str. Dacilor 78, Timișoara',
    price: '520 RON',
    urgency: 'low',
  },
]

const todaySchedule = [
  { time: '9:00AM', title: 'Reparație Circuit Urgentă', client: 'Fatima Ionescu', duration: '1-3 ore', status: 'În progres', statusColor: 'bg-green-100 text-green-700' },
  { time: '5:00PM', title: 'Upgrade Panou Electric', client: 'Mihai Stancu', duration: '3 ore', status: 'Programat', statusColor: 'bg-blue-100 text-blue-700' },
  { time: '7:00PM', title: 'Înlocuire Întrerupător', client: 'Dan Nistor', duration: '1 oră', status: 'Confirmat', statusColor: 'bg-yellow-100 text-yellow-700' },
  { time: '8:00PM', title: 'Instalare Iluminat', client: 'Ana Dragomir', duration: '45 min', status: 'Programat', statusColor: 'bg-blue-100 text-blue-700' },
]

const monthlyData = [
  { month: 'Ian', revenue: 5000, jobs: 8 },
  { month: 'Feb', revenue: 8000, jobs: 12 },
  { month: 'Mar', revenue: 12000, jobs: 15 },
  { month: 'Apr', revenue: 18000, jobs: 20 },
  { month: 'Mai', revenue: 15000, jobs: 18 },
  { month: 'Iun', revenue: 22000, jobs: 25 },
  { month: 'Iul', revenue: 28000, jobs: 30 },
]

const serviceBreakdown = [
  { name: 'Instalații Electrice', percentage: 45, color: 'bg-blue-500' },
  { name: 'Reparații Generale', percentage: 30, color: 'bg-green-500' },
  { name: 'Generator', percentage: 15, color: 'bg-yellow-500' },
  { name: 'Sisteme Securitate', percentage: 10, color: 'bg-purple-500' },
]

const weeklyBookings = [
  { day: 'Lun', count: 4 },
  { day: 'Mar', count: 6 },
  { day: 'Mie', count: 8 },
  { day: 'Joi', count: 5 },
  { day: 'Vin', count: 10 },
  { day: 'Sâm', count: 7 },
  { day: 'Dum', count: 2 },
]

const ratingDistribution = [
  { stars: 5, percentage: 85, count: 85 },
  { stars: 4, percentage: 10, count: 10 },
  { stars: 3, percentage: 3, count: 3 },
  { stars: 2, percentage: 1, count: 1 },
  { stars: 1, percentage: 1, count: 1 },
]

export default function HandymanDashboard() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [selectedJob, setSelectedJob] = useState(null)
  const [tab, setTab] = useState('overview')

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
    }
    loadData()
  }, [navigate])

  const maxRevenue = Math.max(...monthlyData.map(d => d.revenue))
  const maxWeekly = Math.max(...weeklyBookings.map(d => d.count))

  if (!profile) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <HandymanNavbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Bine ai revenit{profile.first_name ? `, ${profile.first_name}` : ''}! 👋</h1>
            <p className="text-gray-500 mt-1">Iată prezentarea generală a afacerii și pipeline-ul de job-uri</p>
          </div>
          <Link
            to="/handyman/jobs"
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            <Eye className="w-4 h-4" />
            Vezi Job-uri
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Cereri Noi', value: '10', change: '+3 azi', changeColor: 'text-green-600', icon: MessageCircle, color: 'bg-blue-100 text-blue-600' },
            { label: 'Job-uri Active', value: '7', change: '2 în progres', changeColor: 'text-gray-500', icon: Briefcase, color: 'bg-green-100 text-green-600' },
            { label: 'Câștiguri săptămâna aceasta', value: '4.560 RON', change: '+3 azi', changeColor: 'text-green-600', icon: DollarSign, color: 'bg-purple-100 text-purple-600' },
            { label: 'Rating Mediu', value: '4.9', change: '12 recenzii recente', changeColor: 'text-gray-500', icon: Star, color: 'bg-yellow-100 text-yellow-600' },
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

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {['overview', 'earnings'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition
                ${tab === t ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}
              `}
            >
              {t === 'overview' ? 'Prezentare generală' : 'Câștiguri'}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <>
            {/* Job Requests + Today Schedule */}
            <div className="grid lg:grid-cols-5 gap-6 mb-6">
              {/* Recent Job Requests */}
              <div className="lg:col-span-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-800">Cereri de Job Recente</h3>
                  <Link to="/handyman/jobs" className="text-sm text-blue-600 font-medium hover:underline">Vezi toate</Link>
                </div>
                <div className="divide-y divide-gray-50">
                  {mockRequests.map((req, i) => (
                    <div key={i} className="p-5 cursor-pointer hover:bg-gray-50 transition" onClick={() => setSelectedJob(req)}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-gray-800">{req.title}</h4>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                              ${req.urgency === 'high' ? 'bg-red-100 text-red-700' :
                                req.urgency === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-green-100 text-green-700'}
                            `}>
                              {req.urgency === 'high' ? 'Urgent' : req.urgency === 'medium' ? 'Mediu' : 'Normal'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-0.5">{req.client}</p>
                        </div>
                        <span className="font-bold text-blue-600">{req.price}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{req.date}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Camera className="w-3 h-3" />
                          <span>{req.photos} poze</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{req.address}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="flex items-center gap-1 px-4 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition">
                          <CheckCircle className="w-3 h-3" /> Acceptă
                        </button>
                        <button className="flex items-center gap-1 px-4 py-1.5 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition">
                          <XCircle className="w-3 h-3" /> Refuză
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Today's Schedule */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="p-5 border-b border-gray-100">
                  <h3 className="font-bold text-gray-800">Programul de Azi</h3>
                </div>
                <div className="p-5 space-y-4">
                  {todaySchedule.map((item, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="text-right w-16 flex-shrink-0">
                        <p className="text-sm font-bold text-gray-800">{item.time}</p>
                      </div>
                      <div className="flex-1 border-l-2 border-gray-200 pl-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-800 text-sm">{item.title}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.statusColor}`}>
                            {item.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{item.client}</p>
                        <p className="text-xs text-gray-400">{item.duration}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Performance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-gray-800">Performanță Lunară</h4>
                  <Target className="w-5 h-5 text-gray-400" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Rată finalizare</span>
                    <span className="text-sm font-bold text-gray-800">98%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '98%' }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Timp răspuns</span>
                    <span className="text-sm font-bold text-gray-800">&lt; 1 oră</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-gray-800">Creștere Câștiguri</h4>
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Luna aceasta</span><span className="font-bold">5.000 RON</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Luna trecută</span><span className="font-bold">4.200 RON</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Creștere</span><span className="font-bold text-green-600">+5.8%</span></div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-gray-800">Satisfacție Clienți</h4>
                  <Award className="w-5 h-5 text-yellow-500" />
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Rating mediu</span><span className="font-bold">4.9/5.0</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Total recenzii</span><span className="font-bold">127</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Clienți recurenți</span><span className="font-bold text-blue-600">68%</span></div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Charts Section - shown in both tabs */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Revenue Chart */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="font-bold text-gray-800">Venituri și Job-uri Lunare</h4>
                <p className="text-xs text-gray-500 mt-1">Urmărește veniturile și progresul finalizărilor</p>
              </div>
              <span className="text-xs text-gray-400 px-2 py-1 bg-gray-50 rounded-lg">Ultimele 7 luni</span>
            </div>
            <div className="flex items-end gap-2 h-48">
              {monthlyData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col items-center gap-1 flex-1 justify-end">
                    <div
                      className="w-full bg-blue-500 rounded-t-md min-h-[4px] transition-all"
                      style={{ height: `${(d.revenue / maxRevenue) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400">{d.month}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-6 mt-4 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-sm" />
                <span>Venituri (RON)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-200 rounded-sm" />
                <span>Job-uri Finalizate</span>
              </div>
            </div>
          </div>

          {/* Service Breakdown */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="font-bold text-gray-800">Distribuție Servicii</h4>
                <p className="text-xs text-gray-500 mt-1">Urmărește veniturile pe tip de serviciu</p>
              </div>
              <span className="text-xs text-gray-400 px-2 py-1 bg-gray-50 rounded-lg">Tot timpul</span>
            </div>
            <div className="flex items-center gap-8">
              {/* Donut Chart Simplified */}
              <div className="relative w-40 h-40 flex-shrink-0">
                <svg viewBox="0 0 36 36" className="w-40 h-40 -rotate-90">
                  {serviceBreakdown.reduce((acc, item, i) => {
                    const offset = acc.offset
                    acc.elements.push(
                      <circle
                        key={i}
                        r="15.9"
                        cx="18"
                        cy="18"
                        fill="transparent"
                        stroke={i === 0 ? '#3b82f6' : i === 1 ? '#22c55e' : i === 2 ? '#eab308' : '#a855f7'}
                        strokeWidth="3.5"
                        strokeDasharray={`${item.percentage} ${100 - item.percentage}`}
                        strokeDashoffset={-offset}
                      />
                    )
                    acc.offset += item.percentage
                    return acc
                  }, { elements: [], offset: 0 }).elements}
                </svg>
              </div>
              <div className="flex-1 space-y-3">
                {serviceBreakdown.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-sm ${item.color}`} />
                      <span className="text-sm text-gray-600">{item.name}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-800">{item.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Weekly Bookings */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="font-bold text-gray-800">Tipar Rezervări Săptămânale</h4>
                <p className="text-xs text-gray-500 mt-1">Distribuția zilnică a rezervărilor din această săptămână</p>
              </div>
              <span className="text-xs text-gray-400 px-2 py-1 bg-gray-50 rounded-lg">Această săpt.</span>
            </div>
            <div className="flex items-end gap-3 h-40">
              {weeklyBookings.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs font-medium text-gray-600">{d.count}</span>
                  <div
                    className="w-full bg-purple-500 rounded-t-md min-h-[4px] transition-all"
                    style={{ height: `${(d.count / maxWeekly) * 100}%` }}
                  />
                  <span className="text-xs text-gray-400">{d.day}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-4 text-center">Total: {weeklyBookings.reduce((a, b) => a + b.count, 0)} rezervări săptămâna aceasta</p>
          </div>

          {/* Rating Distribution */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="font-bold text-gray-800">Distribuție Rating Clienți</h4>
                <p className="text-xs text-gray-500 mt-1">Defalcarea tuturor ratingurilor primite</p>
              </div>
              <span className="text-xs text-gray-400 px-2 py-1 bg-gray-50 rounded-lg">Tot timpul (100 recenzii)</span>
            </div>
            <div className="space-y-3">
              {ratingDistribution.map((item) => (
                <div key={item.stars} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-12">{item.stars} stele</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                    <div
                      className={`h-6 rounded-full transition-all flex items-center justify-end pr-2
                        ${item.stars >= 4 ? 'bg-yellow-400' : item.stars === 3 ? 'bg-yellow-300' : 'bg-gray-300'}
                      `}
                      style={{ width: `${item.percentage}%` }}
                    >
                      {item.percentage > 10 && (
                        <span className="text-xs font-bold text-gray-800">{item.percentage}%</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 w-8 text-right">{item.count}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-4 text-center">Rating Mediu: 4.9/5.0 ⭐ | 85% sunt recenzii de 5 stele</p>
          </div>
        </div>
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
            }}
          />
        )}
    </div>
  )
}