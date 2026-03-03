import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabase'
import DashboardNavbar from '../components/dashboard/DashboardNavbar'
import {
  Plus, LogOut, Calendar, CheckCircle, Clock, DollarSign,
  Star, MessageSquare, Heart, Briefcase, Search, Bell,
  ArrowRight, MapPin, TrendingUp
} from 'lucide-react'

export default function ClientDashboard() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [bookings, setBookings] = useState([])
  const [tasks, setTasks] = useState([])
  const [favorites, setFavorites] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [tab, setTab] = useState('overview')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/login'); return }

    // Profil
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    setProfile(profileData)

    // Stats din view
    const { data: statsData } = await supabase
      .from('client_dashboard_stats')
      .select('*')
      .eq('client_id', user.id)
      .single()
    setStats(statsData)

    // Bookings cu handyman info
    const { data: bookingsData } = await supabase
      .from('bookings')
      .select(`
        *,
        handyman:handyman_id (first_name, last_name, avatar_url),
        service:service_id (title, base_price)
      `)
      .eq('client_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
    setBookings(bookingsData || [])

    // Tasks
    const { data: tasksData } = await supabase
      .from('tasks')
      .select(`
        *,
        handyman:handyman_id (first_name, last_name, avatar_url),
        category:category_id (name)
      `)
      .eq('client_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
    setTasks(tasksData || [])

    // Favoriți
    const { data: favData } = await supabase
      .from('favorite_handymen')
      .select(`
        *,
        handyman:handyman_id (
          first_name, last_name, avatar_url, city,
          handyman_profiles!inner (rating_avg, total_jobs_completed, specialties)
        )
      `)
      .eq('client_id', user.id)
    setFavorites(favData || [])

    // Activitate recentă (combinăm bookings + tasks recente)
    const activity = []
    if (bookingsData) {
      bookingsData.slice(0, 3).forEach(b => {
        activity.push({
          type: 'booking',
          title: b.service?.title || 'Rezervare',
          status: b.status,
          date: b.created_at,
          handyman: b.handyman ? `${b.handyman.first_name} ${b.handyman.last_name}` : null,
          total: b.total,
        })
      })
    }
    if (tasksData) {
      tasksData.slice(0, 3).forEach(t => {
        activity.push({
          type: 'task',
          title: t.title,
          status: t.status,
          date: t.created_at,
          handyman: t.handyman ? `${t.handyman.first_name} ${t.handyman.last_name}` : null,
          category: t.category?.name,
        })
      })
    }
    activity.sort((a, b) => new Date(b.date) - new Date(a.date))
    setRecentActivity(activity.slice(0, 5))

    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const removeFavorite = async (handymanId) => {
    await supabase
      .from('favorite_handymen')
      .delete()
      .eq('client_id', profile.id)
      .eq('handyman_id', handymanId)
    setFavorites(prev => prev.filter(f => f.handyman_id !== handymanId))
    setStats(prev => prev ? { ...prev, favorite_count: prev.favorite_count - 1 } : prev)
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-purple-100 text-purple-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'În așteptare',
      confirmed: 'Confirmat',
      in_progress: 'În progres',
      completed: 'Finalizat',
      cancelled: 'Anulat',
    }
    return labels[status] || status
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('ro-RO', {
      day: 'numeric', month: 'short', year: 'numeric'
    })
  }

  const formatPrice = (price) => {
    if (!price) return '0 RON'
    return `${Number(price).toLocaleString('ro-RO')} RON`
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!profile) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Bine ai revenit{profile.first_name ? `, ${profile.first_name}` : ''}! 👋
            </h1>
            <p className="text-gray-500 mt-1">Iată un rezumat al activității tale pe HandyConnect</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/post-task"
              className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition"
            >
              <Plus className="w-4 h-4" /> Postează Task
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-gray-600 font-medium hover:bg-gray-50 transition"
            >
              <LogOut className="w-4 h-4" /> Deconectare
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: 'Rezervări Active',
              value: stats?.active_bookings || 0,
              icon: Calendar,
              color: 'bg-blue-100 text-blue-600',
            },
            {
              label: 'Finalizate',
              value: (stats?.completed_bookings || 0) + (stats?.completed_tasks || 0),
              icon: CheckCircle,
              color: 'bg-green-100 text-green-600',
            },
            {
              label: 'Total Cheltuit',
              value: formatPrice(stats?.total_spent),
              icon: DollarSign,
              color: 'bg-purple-100 text-purple-600',
            },
            {
              label: 'Favoriți',
              value: stats?.favorite_count || 0,
              icon: Heart,
              color: 'bg-red-100 text-red-600',
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
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'overview', label: 'Prezentare generală' },
            { id: 'bookings', label: 'Rezervări' },
            { id: 'tasks', label: 'Taskuri' },
            { id: 'favorites', label: 'Favoriți' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition
                ${tab === t.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}
              `}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {tab === 'overview' && (
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Bookings Board */}
            <div className="lg:col-span-3 space-y-4">
              {/* Active Bookings */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-800">Rezervări Recente</h3>
                  <button onClick={() => setTab('bookings')} className="text-sm text-blue-600 font-medium hover:underline">
                    Vezi toate
                  </button>
                </div>
                {bookings.length > 0 ? (
                  <div className="divide-y divide-gray-50">
                    {bookings.slice(0, 4).map((booking) => (
                      <div key={booking.id} className="p-4 hover:bg-gray-50 transition">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                              {booking.handyman
                                ? `${booking.handyman.first_name?.[0] || ''}${booking.handyman.last_name?.[0] || ''}`
                                : '?'}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{booking.service?.title || 'Rezervare'}</p>
                              <p className="text-xs text-gray-500">
                                {booking.handyman ? `${booking.handyman.first_name} ${booking.handyman.last_name}` : 'Nealocat'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                              {getStatusLabel(booking.status)}
                            </span>
                            <p className="text-sm font-bold text-gray-800 mt-1">{formatPrice(booking.total)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          {booking.scheduled_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{formatDate(booking.scheduled_date)}</span>
                            </div>
                          )}
                          {booking.service_address && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate max-w-[200px]">{booking.service_address}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">Nicio rezervare încă</p>
                    <Link to="/find-services" className="text-sm text-blue-600 font-medium hover:underline mt-2 inline-block">
                      Caută servicii
                    </Link>
                  </div>
                )}
              </div>

              {/* Active Tasks */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-800">Taskurile Tale</h3>
                  <button onClick={() => setTab('tasks')} className="text-sm text-blue-600 font-medium hover:underline">
                    Vezi toate
                  </button>
                </div>
                {tasks.length > 0 ? (
                  <div className="divide-y divide-gray-50">
                    {tasks.slice(0, 4).map((task) => (
                      <div key={task.id} className="p-4 hover:bg-gray-50 transition">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-medium text-gray-800">{task.title}</p>
                            <p className="text-xs text-gray-500">{task.category?.name || 'Necategorizat'}</p>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                              {getStatusLabel(task.status)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatDate(task.created_at)}</span>
                          </div>
                          {task.urgency !== 'normal' && (
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium
                              ${task.urgency === 'emergency' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}
                            `}>
                              {task.urgency === 'emergency' ? 'Urgență' : 'Urgent'}
                            </span>
                          )}
                          {task.handyman && (
                            <span className="text-blue-600">
                              Acceptat de {task.handyman.first_name}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <Briefcase className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">Niciun task postat</p>
                    <Link to="/post-task" className="text-sm text-blue-600 font-medium hover:underline mt-2 inline-block">
                      Postează un task
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="p-5 border-b border-gray-100">
                  <h3 className="font-bold text-gray-800">Activitate Recentă</h3>
                </div>
                <div className="p-5 space-y-4">
                  {recentActivity.length > 0 ? recentActivity.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                        ${item.type === 'booking' ? 'bg-blue-100' : 'bg-purple-100'}
                      `}>
                        {item.type === 'booking'
                          ? <Calendar className="w-4 h-4 text-blue-600" />
                          : <Briefcase className="w-4 h-4 text-purple-600" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{item.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getStatusColor(item.status)}`}>
                            {getStatusLabel(item.status)}
                          </span>
                          {item.handyman && (
                            <span className="text-xs text-gray-400">{item.handyman}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{formatDate(item.date)}</p>
                      </div>
                      {item.total && (
                        <span className="text-sm font-bold text-gray-800 flex-shrink-0">{formatPrice(item.total)}</span>
                      )}
                    </div>
                  )) : (
                    <div className="text-center py-6">
                      <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Nicio activitate încă</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm mt-4 p-5">
                <h3 className="font-bold text-gray-800 mb-3">Acțiuni Rapide</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Caută Handymani', icon: Search, path: '/find-services', color: 'text-blue-600 bg-blue-50' },
                    { label: 'Postează Task', icon: Plus, path: '/post-task', color: 'text-green-600 bg-green-50' },
                    { label: 'Mesaje', icon: MessageSquare, path: '#', color: 'text-purple-600 bg-purple-50' },
                    { label: 'Scrie o Recenzie', icon: Star, path: '#', color: 'text-yellow-600 bg-yellow-50' },
                  ].map((action) => (
                    <Link
                      key={action.label}
                      to={action.path}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 ${action.color} rounded-lg flex items-center justify-center`}>
                          <action.icon className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">{action.label}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-600 transition" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bookings Tab */}
        {tab === 'bookings' && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">Toate Rezervările ({bookings.length})</h3>
            </div>
            {bookings.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {bookings.map((booking) => (
                  <div key={booking.id} className="p-5 hover:bg-gray-50 transition">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                          {booking.handyman
                            ? `${booking.handyman.first_name?.[0] || ''}${booking.handyman.last_name?.[0] || ''}`
                            : '?'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{booking.service?.title || 'Rezervare'}</p>
                          <p className="text-sm text-gray-500">
                            {booking.handyman ? `${booking.handyman.first_name} ${booking.handyman.last_name}` : 'Nealocat'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                          {getStatusLabel(booking.status)}
                        </span>
                        <p className="text-lg font-bold text-blue-600 mt-1">{formatPrice(booking.total)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Creat: {formatDate(booking.created_at)}</span>
                      </div>
                      {booking.scheduled_date && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Programat: {formatDate(booking.scheduled_date)} {booking.scheduled_time || ''}</span>
                        </div>
                      )}
                      {booking.service_address && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{booking.service_address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-bold text-gray-800 mb-2">Nicio rezervare încă</h3>
                <p className="text-sm text-gray-500 mb-4">Caută handymani și fă prima ta rezervare</p>
                <Link to="/find-services" className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition">
                  Caută Servicii
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Tasks Tab */}
        {tab === 'tasks' && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Taskurile Tale ({tasks.length})</h3>
              <Link to="/post-task" className="flex items-center gap-1 text-sm text-blue-600 font-medium hover:underline">
                <Plus className="w-4 h-4" /> Postează Task Nou
              </Link>
            </div>
            {tasks.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {tasks.map((task) => (
                  <div key={task.id} className="p-5 hover:bg-gray-50 transition">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-800">{task.title}</p>
                          {task.urgency !== 'normal' && (
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium
                              ${task.urgency === 'emergency' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}
                            `}>
                              {task.urgency === 'emergency' ? 'Urgență' : 'Urgent'}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">{task.category?.name || 'Necategorizat'}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                        {getStatusLabel(task.status)}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{task.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(task.created_at)}</span>
                      </div>
                      {task.service_address && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{task.service_address}</span>
                        </div>
                      )}
                      {task.handyman ? (
                        <span className="text-blue-600 font-medium">
                          Acceptat de {task.handyman.first_name} {task.handyman.last_name}
                        </span>
                      ) : (
                        <span className="text-yellow-600">În așteptarea unui handyman</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-bold text-gray-800 mb-2">Niciun task postat</h3>
                <p className="text-sm text-gray-500 mb-4">Postează un task și handymanii te vor contacta</p>
                <Link to="/post-task" className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition">
                  Postează Task
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Favorites Tab */}
        {tab === 'favorites' && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">Handymani Favoriți ({favorites.length})</h3>
            </div>
            {favorites.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4 p-5">
                {favorites.map((fav) => {
                  const h = fav.handyman
                  const hp = h?.handyman_profiles?.[0]
                  return (
                    <div key={fav.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition">
                      <div className="flex items-center gap-3 mb-3">
                        {h?.avatar_url ? (
                          <img src={h.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                        ) : (
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                            {h?.first_name?.[0]}{h?.last_name?.[0]}
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-bold text-gray-800">{h?.first_name} {h?.last_name}</p>
                          {h?.city && (
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {h.city}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => removeFavorite(fav.handyman_id)}
                          className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center hover:bg-red-100 transition"
                        >
                          <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                        </button>
                      </div>
                      <div className="flex items-center gap-3 text-sm mb-2">
                        {hp?.rating_avg > 0 && (
                          <div className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium">{hp.rating_avg}</span>
                          </div>
                        )}
                        {hp?.total_jobs_completed > 0 && (
                          <span className="text-gray-500">{hp.total_jobs_completed} lucrări</span>
                        )}
                      </div>
                      {hp?.specialties && (
                        <div className="flex flex-wrap gap-1">
                          {hp.specialties.slice(0, 3).map((s, i) => (
                            <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-lg">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-12 text-center">
                <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-bold text-gray-800 mb-2">Niciun favorit încă</h3>
                <p className="text-sm text-gray-500 mb-4">Caută handymani și adaugă-i la favoriți</p>
                <Link to="/find-services" className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition">
                  Caută Handymani
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}