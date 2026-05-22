import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Home, Search, AlertCircle, MessageSquare, Bell, LogOut, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import logo from '../../assets/Logo_pin.png'
import NotificationPanel from '../NotificationPanel'

const navLinks = [
  { path: '/dashboard', label: 'Dashboard', icon: Home },
  { path: '/find-services', label: 'Caută Servicii', icon: Search },
  { path: '/finances', label: 'Finanțe', icon: Wallet },
  { path: '/issues', label: 'Probleme', icon: AlertCircle },
]

export default function DashboardNavbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const profilePath = location.pathname.startsWith('/handyman') ? '/handyman/personal-profile' : '/profile'

  const isActive = (path) => location.pathname === path

  useEffect(() => {
    let channel
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('first_name, last_name, avatar_url')
          .eq('id', user.id)
          .single()
        setProfile(data)

        const { count } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false)
          .neq('type', 'new_message')
        setUnreadCount(count ?? 0)

        const { count: msgCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('is_read', false)
          .neq('sender_id', user.id)
        setUnreadMessages(msgCount ?? 0)

        channel = supabase
          .channel('dashboard-navbar-notif')
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          }, (payload) => {
            if (payload.new?.type === 'new_message') {
              setUnreadMessages(prev => prev + 1)
            } else {
              setUnreadCount(prev => prev + 1)
            }
          })
          .subscribe()
      }
    }
    loadProfile()
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [])

  const initials = profile
    ? `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase()
    : '?'

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

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
            <Link
              to="/messages"
              onClick={() => setUnreadMessages(0)}
              className="relative w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-blue-600 transition"
            >
              <MessageSquare className="w-5 h-5" />
              {unreadMessages > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </span>
              )}
            </Link>
            <button
              onClick={() => { setShowNotifications(true); setUnreadCount(0) }}
              className="relative w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-blue-600 transition">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={handleLogout}
              className="h-10 px-3 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition inline-flex items-center gap-1.5 text-sm font-semibold"
              aria-label="Deconectare"
              title="Deconectare"
            >
              <LogOut className="w-4 h-4" />
              Deconectare
            </button>

            {/* Avatar */}
            <Link to={profilePath} className="ml-2">
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
      <NotificationPanel
      isOpen={showNotifications}
      onClose={() => setShowNotifications(false)}
/>
    </header>
  )
}