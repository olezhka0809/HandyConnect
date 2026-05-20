import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Home, Briefcase, Star, Settings, MessageSquare, Bell,
  Wrench, Navigation, LogOut, HelpCircle, MoreHorizontal,
  User, ChevronDown
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../supabase'
import logo from '../../assets/Logo_pin.png'
import NotificationPanel from '../NotificationPanel'

// Link-uri principale — vizibile mereu cu text
const PRIMARY_LINKS = [
  { path: '/handyman/dashboard', label: 'Dashboard',    icon: Home },
  { path: '/handyman/jobs',      label: 'Job Pipeline', icon: Briefcase },
  { path: '/handyman/feed',      label: 'Feed Taskuri', icon: Navigation },
]

// Link-uri secundare — în dropdown „Mai mult"
const MORE_LINKS = [
  { path: '/handyman/reviews',  label: 'Recenzii',           icon: Star },
  { path: '/handyman/services', label: 'Gestionare Servicii', icon: Wrench },
  { path: '/handyman/support',  label: 'Suport',              icon: HelpCircle },
]

export default function HandymanNavbar() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const moreRef   = useRef(null)
  const avatarRef = useRef(null)

  const [profile,           setProfile]           = useState(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showMore,          setShowMore]          = useState(false)
  const [showAvatarMenu,    setShowAvatarMenu]    = useState(false)
  const [unreadCount,       setUnreadCount]       = useState(0)
  const [unreadMessages,    setUnreadMessages]    = useState(0)

  const isActive = (path) => location.pathname === path
  const anyMoreActive = MORE_LINKS.some(l => isActive(l.path))

  // Închide dropdown-urile la click în afară
  useEffect(() => {
    function handleClick(e) {
      if (moreRef.current && !moreRef.current.contains(e.target))   setShowMore(false)
      if (avatarRef.current && !avatarRef.current.contains(e.target)) setShowAvatarMenu(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    let channel
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
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
        .channel('handyman-navbar-notif')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          (payload) => {
            if (payload.new?.type === 'new_message') setUnreadMessages(p => p + 1)
            else setUnreadCount(p => p + 1)
          })
        .subscribe()
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

          {/* ── LEFT: Logo + Nav ── */}
          <div className="flex items-center gap-5">
            <Link to="/" className="flex items-center gap-2 flex-shrink-0">
              <img src={logo} alt="HandyConnect" className="w-7 h-7" />
              <span className="text-base font-bold text-blue-600">HandyConnect</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {/* Link-uri primare */}
              {PRIMARY_LINKS.map(link => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                    ${isActive(link.path) ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Link>
              ))}

              {/* Dropdown „Mai mult" */}
              <div ref={moreRef} className="relative">
                <button
                  onClick={() => setShowMore(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all
                    ${anyMoreActive ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <MoreHorizontal className="w-4 h-4" />
                  Mai mult
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showMore ? 'rotate-180' : ''}`} />
                </button>

                {showMore && (
                  <div className="absolute left-0 top-full mt-1.5 w-52 bg-white rounded-xl border border-gray-200 shadow-lg py-1.5 z-50">
                    {MORE_LINKS.map(link => (
                      <Link
                        key={link.path}
                        to={link.path}
                        onClick={() => setShowMore(false)}
                        className={`flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-all
                          ${isActive(link.path) ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        <link.icon className="w-4 h-4 flex-shrink-0" />
                        {link.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </nav>
          </div>

          {/* ── RIGHT: Iconițe + Avatar ── */}
          <div className="flex items-center gap-1.5">

            {/* Mesaje */}
            <Link
              to="/handyman/messages"
              onClick={() => setUnreadMessages(0)}
              className="relative w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-blue-600 transition"
              title="Mesaje"
            >
              <MessageSquare className="w-4.5 h-4.5" />
              {unreadMessages > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </span>
              )}
            </Link>

            {/* Notificări */}
            <button
              onClick={() => { setShowNotifications(true); setUnreadCount(0) }}
              className="relative w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-blue-600 transition"
              title="Notificări"
            >
              <Bell className="w-4.5 h-4.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Avatar cu dropdown */}
            <div ref={avatarRef} className="relative ml-1">
              <button
                onClick={() => setShowAvatarMenu(v => !v)}
                className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-lg hover:bg-gray-50 transition"
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full object-cover border-2 border-gray-200" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs border-2 border-gray-200">
                    {initials}
                  </div>
                )}
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showAvatarMenu ? 'rotate-180' : ''}`} />
              </button>

              {showAvatarMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl border border-gray-200 shadow-lg py-1.5 z-50">
                  {profile && (
                    <div className="px-4 py-2 border-b border-gray-100 mb-1">
                      <p className="text-xs font-bold text-gray-800 truncate">
                        {profile.first_name} {profile.last_name}
                      </p>
                      <p className="text-xs text-gray-400">Meșter verificat</p>
                    </div>
                  )}
                  <Link
                    to="/handyman/my-profile"
                    onClick={() => setShowAvatarMenu(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                  >
                    <User className="w-4 h-4 text-gray-400" /> Profilul meu public
                  </Link>
                  <Link
                    to="/handyman/personal-profile"
                    onClick={() => setShowAvatarMenu(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                  >
                    <Settings className="w-4 h-4 text-gray-400" /> Setări cont
                  </Link>
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                    >
                      <LogOut className="w-4 h-4" /> Deconectare
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <NotificationPanel isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
    </header>
  )
}
