import { Link, useLocation } from 'react-router-dom'
import { Home, Search, AlertCircle, MessageSquare, Settings, Bell } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import logo from '../../assets/Logo_pin.png'

const navLinks = [
  { path: '/dashboard', label: 'Dashboard', icon: Home },
  { path: '/find-services', label: 'Caută Servicii', icon: Search },
  { path: '/issues', label: 'Probleme', icon: AlertCircle },
]

export default function DashboardNavbar() {
  const location = useLocation()
  const [profile, setProfile] = useState(null)

  const isActive = (path) => location.pathname === path

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('first_name, last_name, avatar_url')
          .eq('id', user.id)
          .single()
        setProfile(data)
      }
    }
    loadProfile()
  }, [])

  const initials = profile
    ? `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase()
    : '?'

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo + Nav Links */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <img src={logo} alt="HandyConnect" className="w-8 h-8" />
              <span className="text-lg font-bold text-blue-600">HandyConnect</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${isActive(link.path)
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100'
                    }
                  `}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right side: icons + avatar */}
          <div className="flex items-center gap-2">
            <button className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-blue-600 transition">
              <MessageSquare className="w-5 h-5" />
            </button>
            <button className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-blue-600 transition">
              <Settings className="w-5 h-5" />
            </button>
            <button className="relative w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-blue-600 transition">
              <Bell className="w-5 h-5" />
              {/* Notificare badge */}
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                3
              </span>
            </button>

            {/* Avatar */}
            <Link to="/profile" className="ml-2">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 hover:border-blue-400 transition"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm border-2 border-gray-200 hover:border-blue-400 transition">
                  {initials}
                </div>
              )}
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}