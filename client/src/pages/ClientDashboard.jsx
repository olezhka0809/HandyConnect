import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { Plus } from 'lucide-react'
import StatsCards from '../components/dashboard/StatsCards'
import QuickActions from '../components/dashboard/QuickActions'
import RecentActivity from '../components/dashboard/RecentActivity'
import BookingsBoard from '../components/dashboard/BookingsBoard'
import DashboardNavbar from '../components/dashboard/DashboardNavbar'

export default function ClientDashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [tab, setTab] = useState('overview')

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }
      setUser(user)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(profileData)
    }
    loadData()
  }, [navigate])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  if (!user || !profile) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
       <DashboardNavbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Bine ai venit, {profile.first_name}! 👋
            </h1>
            <p className="text-gray-500 mt-1">Iată ce se întâmplă cu serviciile tale</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/post-task"
              className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition"
            >
              <Plus className="w-4 h-4" />
              Postează un task
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2.5 border border-gray-200 rounded-lg text-gray-600 font-medium hover:bg-gray-50 transition"
            >
              Deconectare
            </button>
          </div>
        </div>

        {/* Stats */}
        <StatsCards />

        {/* Quick Actions */}
        <div className="mt-6">
          <h3 className="font-bold text-gray-800 mb-3">Acțiuni rapide</h3>
          <QuickActions />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-8 mb-6">
          <button
            onClick={() => setTab('overview')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition
              ${tab === 'overview' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}
            `}
          >
            Prezentare generală
          </button>
          <button
            onClick={() => setTab('bookings')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition
              ${tab === 'bookings' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}
            `}
          >
            Rezervări
          </button>
        </div>

        {/* Tab content */}
        {tab === 'overview' && (
          <div className="grid lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3">
              <BookingsBoard />
            </div>
            <div className="lg:col-span-2">
              <RecentActivity />
            </div>
          </div>
        )}

        {tab === 'bookings' && (
          <BookingsBoard />
        )}
      </div>
    </div>
  )
}