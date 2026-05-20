import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Calendar, CheckCheck, Bell, MessageSquare, XCircle, Star, CreditCard, Clock, AlertTriangle, ThumbsUp, ShieldCheck, Award, Play, CalendarClock, Zap } from 'lucide-react'
import { supabase } from '../supabase'

const redirectMap = {
  new_offer:             '/dashboard?tab=offers',
  offer_counter:         '/handyman/jobs?tab=negotiations',
  task_accepted:         '/handyman/jobs?tab=accepted',
  task_allocated:        '/dashboard?tab=tasks',
  cancellation:          '/handyman/jobs?tab=negotiations',
  task_started:          '/dashboard?tab=tasks',
  service_completed:     '/dashboard?tab=tasks&filter=completed',
  reschedule_request:    '/dashboard?tab=reschedule',
  new_review:            '/handyman/reviews',
  booking_confirmed:     '/dashboard?tab=bookings',
  feedback_request:      '/dashboard?tab=tasks',
  task_proposed:         '/handyman/jobs?tab=proposed',
  // Dispute notifications → always disputes tab
  dispute_created:       '/dashboard?tab=disputes',
  dispute_update:        '/dashboard?tab=disputes',
  rework_proposal:       '/dashboard?tab=disputes',
  task_rejected:         '/handyman/jobs?tab=disputes',
  // Rework scheduling proposals → client tasks/rework tab
  rework_date_proposal:  '/dashboard?tab=tasks&filter=rework',
  // Handyman ← admin decisions
  verification_approved: '/handyman/personal-profile',
  verification_rejected: '/handyman/personal-profile',
  skill_approved:        '/handyman/personal-profile',
  skill_rejected:        '/handyman/personal-profile',
  profile_approved:      '/handyman/personal-profile',
  profile_rejected:      '/handyman/personal-profile',
  support_ticket_response: '/issues?tab=tickets',
  support_ticket_new:      '/admin/dashboard?section=support',
}

const iconMap = {
  booking_confirmed:     { icon: CheckCheck,   color: 'text-green-500',   bg: 'bg-green-100' },
  booking_reminder:      { icon: Bell,         color: 'text-blue-500',    bg: 'bg-blue-100' },
  booking_rescheduled:   { icon: Clock,        color: 'text-yellow-600',  bg: 'bg-yellow-100' },
  reschedule_request:    { icon: Clock,        color: 'text-blue-500',    bg: 'bg-blue-100' },
  task_started:          { icon: Play,          color: 'text-purple-600',  bg: 'bg-purple-100' },
  service_completed:     { icon: CheckCheck,   color: 'text-green-500',   bg: 'bg-green-100' },
  new_message:           { icon: MessageSquare,color: 'text-purple-500',  bg: 'bg-purple-100' },
  cancellation:          { icon: XCircle,      color: 'text-red-500',     bg: 'bg-red-100' },
  feedback_request:      { icon: Star,         color: 'text-red-500',     bg: 'bg-red-100' },
  payment_processed:     { icon: CreditCard,   color: 'text-blue-600',    bg: 'bg-blue-100' },
  new_offer:             { icon: AlertTriangle,color: 'text-yellow-500',  bg: 'bg-yellow-100' },
  offer_counter:         { icon: AlertTriangle,color: 'text-orange-500',  bg: 'bg-orange-100' },
  task_accepted:         { icon: CheckCheck,   color: 'text-green-500',   bg: 'bg-green-100' },
  task_allocated:        { icon: CheckCheck,   color: 'text-blue-600',    bg: 'bg-blue-100' },
  new_task:              { icon: Bell,         color: 'text-blue-500',    bg: 'bg-blue-100' },
  new_review:            { icon: Star,         color: 'text-yellow-500',  bg: 'bg-yellow-100' },
  task_rejected:         { icon: AlertTriangle,color: 'text-red-500',     bg: 'bg-red-100' },
  // Dispute notifications
  dispute_created:       { icon: AlertTriangle,color: 'text-red-500',     bg: 'bg-red-100' },
  dispute_update:        { icon: AlertTriangle,color: 'text-orange-500',  bg: 'bg-orange-100' },
  rework_proposal:       { icon: AlertTriangle,color: 'text-yellow-600',  bg: 'bg-yellow-100' },
  // Rework scheduling
  rework_date_proposal:  { icon: CalendarClock, color: 'text-orange-500', bg: 'bg-orange-100' },
  delay_impact:          { icon: Zap,           color: 'text-red-600',    bg: 'bg-red-100' },
  task_delayed:          { icon: AlertTriangle,  color: 'text-orange-600', bg: 'bg-orange-100' },
  booking_delayed:       { icon: AlertTriangle,  color: 'text-orange-600', bg: 'bg-orange-100' },
  // Handyman ← admin decisions
  verification_approved: { icon: ShieldCheck,  color: 'text-green-600',   bg: 'bg-green-100' },
  verification_rejected: { icon: XCircle,      color: 'text-red-500',     bg: 'bg-red-100' },
  skill_approved:        { icon: Award,        color: 'text-blue-600',    bg: 'bg-blue-100' },
  skill_rejected:        { icon: XCircle,      color: 'text-red-500',     bg: 'bg-red-100' },
  profile_approved:         { icon: ShieldCheck,  color: 'text-green-600',  bg: 'bg-green-100' },
  profile_rejected:         { icon: XCircle,      color: 'text-red-500',    bg: 'bg-red-100' },
  support_ticket_response:  { icon: MessageSquare, color: 'text-blue-500',  bg: 'bg-blue-100' },
  support_ticket_new:       { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-100' },
}

const formatDateLabel = (dateStr) => {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return 'Azi'
  if (date.toDateString() === yesterday.toDateString()) return 'Ieri'
  return date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function NotificationPanel({ isOpen, onClose }) {
  const [notifications, setNotifications] = useState([])
  const panelRef = useRef(null)
  const navigate = useNavigate()

  const resolveNavigationTarget = (notif) => {
    // Handyman: accepted reschedule notifications should always open Job Pipeline → Reprogramate.
    if (notif.type === 'task_accepted' && (notif.title || '').toLowerCase().includes('reprogramare accept')) {
      return { path: '/handyman/jobs', state: { tab: 'reschedule' } }
    }

    // rework_date_proposal sent to handyman → reschedule tab; to client → tasks/rework
    if (notif.type === 'rework_date_proposal') {
      if (notif.data?.redirect?.includes('/handyman/jobs')) {
        return { path: '/handyman/jobs', state: { tab: 'reschedule' } }
      }
      return { path: '/dashboard', state: { tab: 'tasks', filter: 'rework' } }
    }

    // Dispute notifications → disputes tab (client/admin → dashboard). For
    // handymen prefer the Handyman Jobs disputes tab so clicking a dispute
    // notification opens the pipeline directly.
    if (['dispute_created', 'dispute_update', 'rework_proposal'].includes(notif.type)) {
      if (notif.data?.for_handyman === true || notif.data?.redirect === '/handyman/jobs?tab=disputes') {
        return { path: '/handyman/jobs', state: { tab: 'disputes' } }
      }
      return { path: '/dashboard', state: { tab: 'disputes' } }
    }

    // New offer → client sees it in offers/price subtab
    if (notif.type === 'new_offer') {
      return { path: '/dashboard', state: { tab: 'offers', offersSubtab: 'price' } }
    }

    // service_completed: rework completions → tasks/rework, others → bookings or tasks/completed
    if (notif.type === 'service_completed') {
      if (notif.data?.is_rework) {
        return { path: '/dashboard', state: { tab: 'tasks', filter: 'rework' } }
      }
      const isBookingCompletion = notif.data?.job_type === 'booking' || !!notif.data?.booking_id
      if (isBookingCompletion) {
        return { path: '/dashboard', state: { tab: 'bookings', bookingFilter: 'completed' } }
      }
      return { path: '/dashboard', state: { tab: 'tasks', filter: 'completed' } }
    }

    // Delay notifications should land directly in delayed sections.
    if (notif.type === 'task_delayed' || notif.type === 'booking_delayed' || notif.type === 'delay_impact') {
      const jobType = notif.data?.job_type || (notif.type === 'booking_delayed' ? 'booking' : 'task')
      if (jobType === 'booking') {
        return { path: '/dashboard', state: { tab: 'bookings', bookingFilter: 'delayed' } }
      }
      return { path: '/dashboard', state: { tab: 'tasks', filter: 'delayed' } }
    }

    const rawPath = notif.data?.redirect || redirectMap[notif.type]
    if (!rawPath) return null

    const [, query] = rawPath.split('?')
    const params = new URLSearchParams(query || '')
    const state = {
      tab: params.get('tab') || undefined,
      filter: params.get('filter') || undefined,
      bookingFilter: params.get('bookingFilter') || undefined,
    }

    // Pass the full URL (including query string) so the tab is encoded in the
    // URL itself — this is reliable even when navigating to the same page.
    return { path: rawPath, state }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  // Fetch notificari + realtime
  useEffect(() => {
    let channel

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .neq('type', 'new_message')
        .order('created_at', { ascending: false })
        .limit(50)

      if (data) setNotifications(data)

      channel = supabase
        .channel('notifications-realtime')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          if (payload.new?.type === 'new_message') return
          setNotifications(prev => [payload.new, ...prev])
        })
        .subscribe()
    }

    load()
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [])

  // Închide la click în afara panelului
  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose()
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  const markAsRead = async (id) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    )
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
  }

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    await supabase.from('notifications').update({ is_read: true })
      .eq('user_id', user.id).neq('type', 'new_message')
  }

  const clearAll = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setNotifications([])
    await supabase.from('notifications').delete()
      .eq('user_id', user.id).neq('type', 'new_message')
  }

  const formatTime = (createdAt) => {
    const diff = Math.floor((Date.now() - new Date(createdAt)) / 1000)
    if (diff < 60) return 'Tocmai acum'
    if (diff < 3600) return `Acum ${Math.floor(diff / 60)} min`
    if (diff < 86400) return `Acum ${Math.floor(diff / 3600)} h`
    return `Acum ${Math.floor(diff / 86400)} zile`
  }

  // Grupează pe zile
  const grouped = notifications.reduce((acc, notif) => {
    const label = formatDateLabel(notif.created_at)
    if (!acc[label]) acc[label] = []
    acc[label].push(notif)
    return acc
  }, {})

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative w-full max-w-md bg-white shadow-2xl flex flex-col animate-slide-in-right"
        style={{ animation: 'slideInRight 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Notificări</h2>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-500">{unreadCount} notificări necitite</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-blue-600 font-medium hover:underline"
              >
                Marchează toate citite
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length > 0 ? (
            Object.entries(grouped).map(([dateLabel, items]) => (
              <div key={dateLabel}>
                {/* Date separator */}
                <div className="px-6 py-2 bg-gray-50">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    <span className="font-medium">{dateLabel}</span>
                  </div>
                </div>

                {/* Items */}
                {items.map((notif) => {
                  const config = iconMap[notif.type] || iconMap.new_message
                  const IconComponent = config.icon

                  if (notif.type === 'delay_impact') {
                    return <DelayImpactNotif key={notif.id} notif={notif} onClose={onClose} onRead={() => markAsRead(notif.id)} navigate={navigate} />
                  }

                  return (
                    <div
                      key={notif.id}
                      onClick={() => {
                        markAsRead(notif.id)
                        const target = resolveNavigationTarget(notif)
                        if (target) {
                          onClose()
                          navigate(target.path, { state: target.state })
                        }
                      }}
                      className={`flex items-start gap-3 px-6 py-4 border-b border-gray-50 cursor-pointer transition-all hover:bg-gray-50
                        ${!notif.is_read ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : ''}
                      `}
                    >
                      <div className={`w-10 h-10 ${config.bg} rounded-full flex items-center justify-center flex-shrink-0`}>
                        <IconComponent className={`w-5 h-5 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notif.is_read ? 'font-bold text-gray-800' : 'font-medium text-gray-700'}`}>
                          {notif.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.body}</p>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">{formatTime(notif.created_at)}</span>
                    </div>
                  )
                })}
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <Bell className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">Nicio notificare</p>
              <p className="text-xs text-gray-400 mt-1">Vei primi notificări despre activitatea ta</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-gray-100 px-6 py-3">
            <button
              onClick={clearAll}
              className="w-full text-center text-sm text-gray-500 font-medium hover:text-red-500 transition"
            >
              Șterge toate
            </button>
          </div>
        )}
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ─── COMPONENTA SPECIALĂ: notificare impact întârziere (simplificată) ─────
function DelayImpactNotif({ notif, onClose, onRead, navigate }) {
  const openDelayedSection = () => {
    const jobType = notif.data?.job_type || 'task'
    onRead()
    onClose()
    if (jobType === 'booking') {
      navigate('/dashboard', { state: { tab: 'bookings', bookingFilter: 'delayed' } })
      return
    }
    navigate('/dashboard', { state: { tab: 'tasks', filter: 'delayed' } })
  }

  return (
    <div
      onClick={openDelayedSection}
      className={`px-6 py-4 border-b border-gray-50 border-l-4 border-l-red-500 bg-red-50/60 cursor-pointer`}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
          <Zap className="w-5 h-5 text-red-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-800">{notif.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{notif.body}</p>
        </div>
      </div>
      <div className="text-xs text-gray-500">Deschide secțiunea „Întârziate” pentru a gestiona reprogramarea sau anularea.</div>
    </div>
  )
}