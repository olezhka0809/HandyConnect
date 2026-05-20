import { useState, useEffect, useRef, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase'
import { Send, MessageSquare, Search, Check, CheckCheck, Smile, Paperclip, X, Play, Briefcase, Calendar, ChevronRight, Trash2, CheckCircle, Lock, AlertTriangle, ShieldAlert, Pin, Users, Wrench, User } from 'lucide-react'

// Admin's fixed user ID — used to identify admin-side of dispute conversations
const ADMIN_ID = 'e7c2a8fa-c2ef-4486-8937-97807b6b04f5'

const EMOJIS = [
  '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😉','😊','😇',
  '🥰','😍','🤩','😘','😋','😛','😜','🤪','🤔','🤗','🤭','🤫',
  '😐','😑','😶','😏','😒','🙄','😬','😔','😪','😴','😷','🤢',
  '🥵','🥶','😵','🤯','🥳','😎','🤓','😕','😢','😭','😱','😤',
  '😡','😠','🤬','😈','💀','💩','👍','👎','👌','✌️','🤞','🤝',
  '👋','✋','👏','🙌','🙏','💪','❤️','🧡','💛','💚','💙','💜',
  '🖤','💔','💕','💯','🔥','✨','🎉','🎊','🎁','🎶','🌟','⭐',
  '🌈','🚀','💡','🏆','🎯','🍕','🍔','🍰','☕','🌸','🌙','🌞',
]

function JobPinCard({ conv, onTaskClick, onBookingClick, onDisputeClick }) {
  // Dispute conversations take priority — show dispute card, not task card
  if (conv?.conversation_type === 'dispute_admin' && conv?.dispute_id) {
    const taskTitle = conv.task?.title ?? 'Dispută activă'
    const isLv2 = conv.task?.is_rework === true && (conv.task?.rework_level ?? 1) >= 2
    return (
      <button
        onClick={() => onDisputeClick?.({ disputeId: conv.dispute_id, taskId: conv.task_id })}
        className={`flex items-center gap-3 px-5 py-2.5 border-b transition-colors w-full text-left group
          ${isLv2
            ? 'bg-orange-50 border-orange-100 hover:bg-orange-100'
            : 'bg-red-50 border-red-100 hover:bg-red-100'}`}
      >
        <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${isLv2 ? 'bg-orange-100' : 'bg-red-100'}`}>
          <ShieldAlert className={`w-5 h-5 ${isLv2 ? 'text-orange-500' : 'text-red-500'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{taskTitle}</p>
          <p className="text-xs mt-0.5 flex items-center gap-1.5">
            <span className={`font-bold ${isLv2 ? 'text-orange-600' : 'text-red-600'}`}>
              {isLv2 ? 'Dispută Nivel 2' : 'Dispută activă'}
            </span>
            {isLv2 && (
              <span className="px-1.5 py-0.5 bg-orange-200 text-orange-800 text-[10px] font-bold rounded">
                Relucrare
              </span>
            )}
          </p>
        </div>
        <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-colors text-gray-400 ${isLv2 ? 'group-hover:text-orange-500' : 'group-hover:text-red-500'}`} />
      </button>
    )
  }
  if (conv?.task) {
    const photo = Array.isArray(conv.task.photos) && conv.task.photos.length > 0 ? conv.task.photos[0] : null
    const priceVal = conv.task.final_price ?? conv.task.budget
    const budget = priceVal ? `${Number(priceVal).toLocaleString('ro-RO')} RON` : null
    return (
      <button
        onClick={() => onTaskClick?.(conv.task_id)}
        className="flex items-center gap-3 px-5 py-2.5 bg-gray-50 border-b border-gray-200 hover:bg-blue-50 transition-colors w-full text-left group"
      >
        {photo ? (
          <img src={photo} alt="" className="w-11 h-11 rounded-lg object-cover flex-shrink-0 border border-gray-200" />
        ) : (
          <div className="w-11 h-11 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Briefcase className="w-5 h-5 text-blue-500" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{conv.task.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            <span className="text-blue-600 font-medium">Task</span>
            {budget && <> · {budget}</>}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 group-hover:text-blue-500 transition-colors" />
      </button>
    )
  }
  if (conv?.booking) {
    const title = conv.booking.handyman_services?.title ?? 'Rezervare'
    const date = conv.booking.scheduled_date
      ? new Date(conv.booking.scheduled_date).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })
      : null
    const total = conv.booking.total ? `${Number(conv.booking.total).toLocaleString('ro-RO')} RON` : null
    return (
      <button
        onClick={() => onBookingClick?.(conv.booking_id)}
        className="flex items-center gap-3 px-5 py-2.5 bg-gray-50 border-b border-gray-200 hover:bg-purple-50 transition-colors w-full text-left group"
      >
        <div className="w-11 h-11 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
          <Calendar className="w-5 h-5 text-purple-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{title}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            <span className="text-purple-600 font-medium">Rezervare</span>
            {date && <> · {date}</>}
            {total && <> · {total}</>}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 group-hover:text-purple-500 transition-colors" />
      </button>
    )
  }
  return null
}

function DateSeparator({ dateIso }) {
  const now = new Date()
  const d = new Date(dateIso)
  const isToday = d.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()
  const label = isToday
    ? 'Azi'
    : isYesterday
    ? 'Ieri'
    : d.toLocaleDateString('ro-RO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  return (
    <div className="flex items-center gap-3 my-4 select-none">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-xs text-gray-500 font-medium px-3 py-1 bg-gray-100 rounded-full whitespace-nowrap">{label}</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  )
}

function MessageTicks({ msg, userId }) {
  if (msg.sender_id !== userId) return null
  if (msg._pending) {
    return <Check className="w-3.5 h-3.5 flex-shrink-0 text-white/40" />
  }
  if (msg.is_read) {
    return <CheckCheck className="w-3.5 h-3.5 flex-shrink-0 text-cyan-300" />
  }
  return <CheckCheck className="w-3.5 h-3.5 flex-shrink-0 text-white/50" />
}

export default function MessagingUI({ userId, userRole, initialBookingId, initialTaskId, initialWithUserId, backPath, onTaskClick, onBookingClick, onDisputeClick }) {
  const navigate = useNavigate()
  const [conversations, setConversations] = useState([])
  const [activeConvId, setActiveConvId] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showEmojis, setShowEmojis] = useState(false)
  const [attachmentFile, setAttachmentFile] = useState(null)
  const [attachmentPreview, setAttachmentPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [adminPartyFilter, setAdminPartyFilter] = useState('all') // 'all' | 'clients' | 'handymen'
  const [typeFilter, setTypeFilter] = useState('all') // 'all' | 'task' | 'booking' | 'dispute'
  const [pinnedIds, setPinnedIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(`pinned_convs_${userId}`) || '[]')) }
    catch { return new Set() }
  })
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [contextMenu, setContextMenu] = useState(null) // { convId, x, y }
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const autoSelectedRef = useRef(false)
  const channelRef = useRef(null)

  const activeConv = conversations.find(c => c.id === activeConvId)

  useEffect(() => {
    if (userId) loadConversations()
  }, [userId])

  useEffect(() => {
    if (autoSelectedRef.current) return
    if (!conversations.length) return
    if (!initialBookingId && !initialTaskId && !initialWithUserId) return

    // Direct conversation via ?with=handymanId
    if (initialWithUserId) {
      const existing = conversations.find(c =>
        c.conversation_type === 'direct' &&
        ((c.client_id === userId && c.handyman_id === initialWithUserId) ||
         (c.handyman_id === userId && c.client_id === initialWithUserId))
      )
      if (existing) {
        autoSelectedRef.current = true
        handleSelectConversation(existing.id)
      } else {
        // Create direct conversation — unique index prevents duplicates
        supabase.from('conversations')
          .upsert(
            { client_id: userId, handyman_id: initialWithUserId, conversation_type: 'direct' },
            { onConflict: 'idx_conversations_direct_unique', ignoreDuplicates: false }
          )
          .select().single()
          .then(({ data }) => {
            if (data) {
              autoSelectedRef.current = true
              setConversations(prev => {
                if (prev.find(c => c.id === data.id)) return prev
                return [data, ...prev]
              })
              handleSelectConversation(data.id)
            }
          })
      }
      return
    }

    const target = conversations.find(c =>
      (initialBookingId && c.booking_id === initialBookingId) ||
      (initialTaskId && c.task_id === initialTaskId)
    )
    if (target) {
      autoSelectedRef.current = true
      handleSelectConversation(target.id)
    }
  }, [conversations, initialBookingId, initialTaskId, initialWithUserId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Închide emoji picker la click în afară
  useEffect(() => {
    const handle = (e) => {
      if (!e.target.closest('[data-emoji-picker]')) setShowEmojis(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // Închide context menu la orice click sau scroll
  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    document.addEventListener('mousedown', close)
    document.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('scroll', close, true)
    }
  }, [contextMenu])

  const loadConversations = async () => {
    const { data: convs } = await supabase
      .from('conversations')
      .select(`
        id, client_id, handyman_id, last_message_at, created_at,
        booking_id, task_id, is_closed, dispute_id, conversation_type,
        client:profiles!conversations_client_id_fkey(id, first_name, last_name, avatar_url),
        handyman:profiles!conversations_handyman_id_fkey(id, first_name, last_name, avatar_url),
        booking:bookings!conversations_booking_id_fkey(id, status, scheduled_date, total, handyman_services(title)),
        task:tasks!conversations_task_id_fkey(id, title, photos, budget, final_price, status, urgency, is_rework, rework_level)
      `)
      .or(`client_id.eq.${userId},handyman_id.eq.${userId}`)
      .order('last_message_at', { ascending: false, nullsFirst: false })

    if (!convs?.length) {
      setConversations([])
      setLoading(false)
      return
    }

    // Deduplicate: keep only the most recent conversation per task/booking
    // dispute_admin convs are never deduplicated — multiple per task is intentional
    const seen = new Set()
    const deduped = convs.filter(c => {
      if (c.conversation_type === 'dispute_admin') return true
      const key = c.task_id ? `t-${c.task_id}` : c.booking_id ? `b-${c.booking_id}` : `d-${c.id}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    const convIds = deduped.map(c => c.id)
    const { data: allMsgs } = await supabase
      .from('messages')
      .select('conversation_id, content, attachment_type, sender_id, is_read, created_at')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false })

    const lastMsgMap = {}
    const unreadMap = {}
    allMsgs?.forEach(msg => {
      if (!lastMsgMap[msg.conversation_id]) lastMsgMap[msg.conversation_id] = msg
      if (!msg.is_read && msg.sender_id !== userId) {
        unreadMap[msg.conversation_id] = (unreadMap[msg.conversation_id] || 0) + 1
      }
    })

    setConversations(deduped.map(c => ({
      ...c,
      lastMessage: lastMsgMap[c.id] || null,
      unreadCount: unreadMap[c.id] || 0,
    })))
    setLoading(false)
  }

  const loadMessages = async (convId) => {
    const { data } = await supabase
      .from('messages')
      .select('id, content, sender_id, is_read, created_at, attachment_url, attachment_type, is_system')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
    setMessages(data || [])
  }

  const markAsRead = async (convId) => {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', convId)
      .neq('sender_id', userId)
      .eq('is_read', false)
    setConversations(prev =>
      prev.map(c => c.id === convId ? { ...c, unreadCount: 0 } : c)
    )
    channelRef.current?.send({
      type: 'broadcast',
      event: 'messages_read',
      payload: { reader_id: userId, conversation_id: convId },
    })
  }

  const handleSelectConversation = (convId) => {
    setActiveConvId(convId)
    loadMessages(convId)
    markAsRead(convId)
    setShowEmojis(false)
  }

  // Ref pentru a accesa activeConvId în callback-uri fără a recrea channel-ul
  const activeConvIdRef = useRef(activeConvId)
  useEffect(() => { activeConvIdRef.current = activeConvId }, [activeConvId])

  useEffect(() => {
    if (!activeConvId) return

    const channel = supabase
      .channel(`conv-${activeConvId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${activeConvId}`,
      }, (payload) => {
        if (payload.new.sender_id === userId) {
          setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...payload.new, _pending: false } : m))
          return
        }
        setMessages(prev => {
          if (prev.some(m => m.id === payload.new.id)) return prev
          return [...prev, payload.new]
        })
        supabase.from('messages').update({ is_read: true }).eq('id', payload.new.id)
        channel.send({ type: 'broadcast', event: 'messages_read', payload: { reader_id: userId } })
      })
      .on('broadcast', { event: 'messages_read' }, ({ payload }) => {
        if (payload?.reader_id !== userId) {
          setMessages(prev => prev.map(m => m.sender_id === userId ? { ...m, is_read: true } : m))
        }
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          loadMessages(activeConvId)
        }
      })

    channelRef.current = channel
    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [activeConvId, userId])

  // Fallback garantat: notificările funcționează deja în real-time.
  // Când vine o notificare new_message, fetch direct mesajul nou și adaugă-l în UI
  // fără să reîncarce toată lista — acoperă cazul în care REPLICA IDENTITY
  // nu e setat și postgres_changes pe messages nu trimite events.
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`msg-notif-fallback-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, async (payload) => {
        if (payload.new?.type !== 'new_message') return

        const convId = activeConvIdRef.current
        const notifConvId = payload.new?.data?.conversation_id

        // Actualizează lista de conversații (last message, unread count)
        loadConversations()

        // Dacă userul e în conversația din notificare, adaugă mesajul direct
        if (convId && notifConvId && convId === notifConvId) {
          const { data: newMsgs } = await supabase
            .from('messages')
            .select('id, content, sender_id, is_read, created_at, attachment_url, attachment_type, is_system')
            .eq('conversation_id', convId)
            .order('created_at', { ascending: false })
            .limit(5)

          if (newMsgs?.length) {
            setMessages(prev => {
              const existingIds = new Set(prev.map(m => m.id))
              const toAdd = newMsgs.filter(m => !existingIds.has(m.id))
              if (!toAdd.length) return prev
              return [...prev, ...toAdd.reverse()]
            })
            markAsRead(convId)
          }
        }
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'conversations',
        filter: `client_id=eq.${userId}`,
      }, () => { loadConversations() })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'conversations',
        filter: `handyman_id=eq.${userId}`,
      }, () => { loadConversations() })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'conversations',
      }, () => {
        loadConversations()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [userId])

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAttachmentFile(file)
    setAttachmentPreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  const cancelAttachment = () => {
    if (attachmentPreview) URL.revokeObjectURL(attachmentPreview)
    setAttachmentFile(null)
    setAttachmentPreview(null)
  }

  const sendMessage = async () => {
    if ((!newMessage.trim() && !attachmentFile) || !activeConvId) return
    const content = newMessage.trim()
    setNewMessage('')
    setShowEmojis(false)

    const fileToUpload = attachmentFile
    const previewUrl = attachmentPreview
    const isVideo = fileToUpload?.type.startsWith('video')
    cancelAttachment()

    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...prev, {
      id: tempId,
      conversation_id: activeConvId,
      sender_id: userId,
      content,
      attachment_url: previewUrl || null,
      attachment_type: fileToUpload ? (isVideo ? 'video' : 'image') : null,
      is_read: false,
      created_at: new Date().toISOString(),
      _pending: true,
    }])

    let attachment_url = null
    let attachment_type = null

    if (fileToUpload) {
      setUploading(true)
      const ext = fileToUpload.name.split('.').pop()
      const path = `${userId}/${activeConvId}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('message-attachments')
        .upload(path, fileToUpload, { contentType: fileToUpload.type })
      setUploading(false)
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('message-attachments').getPublicUrl(path)
        attachment_url = urlData.publicUrl
        attachment_type = isVideo ? 'video' : 'image'
      }
    }

    const { data: inserted } = await supabase
      .from('messages')
      .insert({ conversation_id: activeConvId, sender_id: userId, content: content || '', attachment_url, attachment_type })
      .select()
      .single()

    if (inserted) {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...inserted, _pending: false } : m))
    }

    await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', activeConvId)

    const conv = conversations.find(c => c.id === activeConvId)
    if (conv) {
      const recipientId = userId === conv.client_id ? conv.handyman_id : conv.client_id
      const notifBody = attachment_url
        ? (isVideo ? '🎥 Video' : '📷 Imagine')
        : (content.length > 60 ? content.substring(0, 60) + '...' : content)
      let redirect = '/messages'
      if (conv.conversation_type === 'dispute_admin') {
        if (recipientId === ADMIN_ID) redirect = '/admin/dashboard?section=messages'
        else if (recipientId === conv.handyman_id) redirect = '/handyman/messages'
        else redirect = '/messages'
      } else {
        redirect = userId === conv.handyman_id ? '/messages' : '/handyman/messages'
      }
      await supabase.from('notifications').insert({
        user_id: recipientId,
        type: 'new_message',
        title: conv.conversation_type === 'dispute_admin' ? 'Mesaj dispută' : 'Mesaj nou',
        body: notifBody,
        data: { conversation_id: activeConvId, redirect },
      })
    }
  }

  const handleDeleteConversation = async (convId) => {
    if (!window.confirm('Ștergi definitiv această conversație?')) return
    await supabase.from('conversations').delete().eq('id', convId)
    setActiveConvId(null)
    setMessages([])
    setConversations(prev => prev.filter(c => c.id !== convId))
  }

  const handlePinToggle = (convId) => {
    setPinnedIds(prev => {
      const next = new Set(prev)
      next.has(convId) ? next.delete(convId) : next.add(convId)
      localStorage.setItem(`pinned_convs_${userId}`, JSON.stringify([...next]))
      return next
    })
  }

  const handleDeleteConv = async (convId) => {
    setConfirmDeleteId(null)
    if (activeConvId === convId) setActiveConvId(null)
    setConversations(prev => prev.filter(c => c.id !== convId))
    setPinnedIds(prev => { const next = new Set(prev); next.delete(convId); return next })
    await supabase.from('conversations').delete().eq('id', convId)
  }

  const getOtherParty = (conv) => {
    let party
    if (userRole === 'admin') {
      party = userId === conv.client_id ? conv.handyman : conv.client
    } else {
      party = conv.client_id === userId ? conv.handyman : conv.client
    }
    // Admin profile has empty name — override for display
    if (party?.id === ADMIN_ID) {
      return { ...party, first_name: 'Admin', last_name: 'HandyConnect' }
    }
    return party
  }

  const getContextMeta = (conv) => {
    if (conv.conversation_type === 'dispute_admin') {
      const isLv2 = conv.task?.is_rework === true && (conv.task?.rework_level ?? 1) >= 2
      return isLv2
        ? { type: 'Dispută Niv.2', label: conv.task?.title ?? 'Dispută activă', badgeCls: 'bg-orange-100 text-orange-700', isDispute: true, disputeLevel: 2 }
        : { type: 'Dispută',       label: conv.task?.title ?? 'Dispută activă', badgeCls: 'bg-red-100 text-red-700',    isDispute: true, disputeLevel: 1 }
    }
    if (conv.task?.title) return { type: 'Task', label: conv.task.title, badgeCls: 'bg-blue-100 text-blue-700' }
    if (conv.booking) {
      const title = conv.booking.scheduled_date
        ? new Date(conv.booking.scheduled_date).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'Rezervare'
      return { type: 'Rezervare', label: title, badgeCls: 'bg-purple-100 text-purple-700' }
    }
    return { type: null, label: 'Conversație directă', badgeCls: 'bg-gray-100 text-gray-500' }
  }

  const formatTime = (isoString) => {
    if (!isoString) return ''
    const d = new Date(isoString)
    const now = new Date()
    if (d.toDateString() === now.toDateString())
      return d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' })
  }

  const ACTIVE_TASK_STATUSES    = ['assigned', 'in_progress', 'completed', 'client_approved', 'client_rejected']
  const ACTIVE_BOOKING_STATUSES = ['accepted', 'confirmed', 'in_progress', 'completed']

  const matchesSearch = (conv) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    const other = getOtherParty(conv)
    const name  = `${other?.first_name || ''} ${other?.last_name || ''}`.toLowerCase()
    const taskTitle    = (conv.task?.title || '').toLowerCase()
    const bookingTitle = (conv.booking?.handyman_services?.title || '').toLowerCase()
    return name.includes(q) || taskTitle.includes(q) || bookingTitle.includes(q)
  }

  const filteredConversations = conversations.filter(conv => {
    // Admin sees only dispute_admin conversations
    if (userRole === 'admin') {
      if (conv.conversation_type !== 'dispute_admin') return false
      // Party filter: clients are in conv.client when handyman_id===ADMIN_ID
      if (adminPartyFilter === 'clients'  && conv.handyman_id !== ADMIN_ID) return false
      if (adminPartyFilter === 'handymen' && conv.client_id   !== ADMIN_ID) return false
      return matchesSearch(conv)
    }
    // Type filter for clients/handymen
    if (typeFilter === 'dispute'  && conv.conversation_type !== 'dispute_admin') return false
    if (typeFilter === 'task'     && (conv.conversation_type === 'dispute_admin' || !conv.task_id || conv.booking_id)) return false
    if (typeFilter === 'booking'  && !conv.booking_id) return false
    // Dispute admin convs always visible (linked to active dispute)
    if (conv.conversation_type === 'dispute_admin') return matchesSearch(conv)
    // Closed chats always visible (archived completed work)
    if (!conv.is_closed) {
      if (conv.task_id    && conv.task    && !ACTIVE_TASK_STATUSES.includes(conv.task.status))    return false
      if (conv.booking_id && conv.booking && !ACTIVE_BOOKING_STATUSES.includes(conv.booking.status)) return false
    }
    return matchesSearch(conv)
  }).sort((a, b) => {
    const pa = pinnedIds.has(a.id) ? 1 : 0
    const pb = pinnedIds.has(b.id) ? 1 : 0
    if (pb !== pa) return pb - pa
    return 0 // original last_message_at order preserved
  })

  const getLastMsgPreview = (conv) => {
    if (!conv.lastMessage) return null
    if (conv.lastMessage.attachment_type === 'image') return '📷 Imagine'
    if (conv.lastMessage.attachment_type === 'video') return '🎥 Video'
    return conv.lastMessage.content
  }

  return (
    <>
    <div className="flex flex-col overflow-hidden bg-gray-50 h-full border border-gray-300 rounded-xl shadow-sm">

      {/* ── Header complet ── */}
      <div className="px-6 py-4 bg-white border-b border-gray-200 flex items-center justify-between shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">Mesaje</h2>
        <button
          onClick={() => navigate(backPath || -1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition flex-shrink-0"
          title="Închide mesageria"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Main content (left + right panels) ── */}
      <div className="flex flex-1 overflow-hidden">

      {/* ── Coloana stânga ── */}
      <div className="w-80 flex-shrink-0 border-r border-gray-200 flex flex-col bg-white">
        <div className="p-3 border-b border-gray-100 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Caută după nume, task, rezervare..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {userRole === 'admin' ? (
            <div className="flex gap-1">
              {[
                { id: 'all',      label: 'Toți',    Icon: Users   },
                { id: 'clients',  label: 'Clienți', Icon: User    },
                { id: 'handymen', label: 'Meșteri', Icon: Wrench  },
              ].map(({ id, label, Icon }) => (
                <button key={id} onClick={() => setAdminPartyFilter(id)}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition
                    ${adminPartyFilter === id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  <Icon className="w-3 h-3" /> {label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex gap-1">
              {[
                { id: 'all',     label: 'Toate'     },
                { id: 'task',    label: 'Taskuri'   },
                { id: 'booking', label: 'Rezervări' },
                { id: 'dispute', label: 'Dispute'   },
              ].map(({ id, label }) => (
                <button key={id} onClick={() => setTypeFilter(id)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition
                    ${typeFilter === id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center text-gray-400 text-sm">Se încarcă...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">Nicio conversație</p>
              <p className="text-xs text-gray-400 mt-1">Conversațiile apar automat după acceptarea unui job.</p>
            </div>
          ) : (
            filteredConversations.map(conv => {
              const other    = getOtherParty(conv)
              const initials = other ? `${other.first_name?.[0] || ''}${other.last_name?.[0] || ''}`.toUpperCase() : '?'
              const isActive = conv.id === activeConvId
              const isPinned = pinnedIds.has(conv.id)
              const preview  = getLastMsgPreview(conv)
              const ctx      = getContextMeta(conv)

              return (
                <div key={conv.id} className="relative border-b border-gray-50"
                  onContextMenu={e => {
                    e.preventDefault()
                    setContextMenu({ convId: conv.id, x: e.clientX, y: e.clientY })
                  }}>

                  {isPinned && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-400 z-10" />}

                  <button onClick={() => handleSelectConversation(conv.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${isActive ? 'bg-blue-50 border-l-[3px] border-l-blue-600' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        {other?.avatar_url
                          ? <img src={other.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover" />
                          : <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">{initials}</div>
                        }
                        {isPinned && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
                            <Pin className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}>
                            {other?.first_name} {other?.last_name}
                          </span>
                          <span className="text-[11px] text-gray-400 flex-shrink-0">{formatTime(conv.last_message_at)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 min-w-0">
                          {ctx.type && (
                            <span className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${ctx.badgeCls}`}>
                              {ctx.type}
                            </span>
                          )}
                          <span className="text-xs text-gray-600 font-medium truncate">{ctx.label}</span>
                          {conv.unreadCount > 0 && (
                            <span className="ml-auto flex-shrink-0 w-5 h-5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                              {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                            </span>
                          )}
                        </div>
                        {preview && (
                          <p className={`text-xs truncate mt-0.5 ${conv.unreadCount > 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                            {conv.lastMessage?.sender_id === userId ? 'Tu: ' : ''}{preview}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── Coloana dreapta ── */}
      {activeConvId ? (
      <div className="flex-1 flex flex-col">
        {!activeConvId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-10 h-10 text-blue-400" />
              </div>
              <p className="text-gray-600 font-semibold text-lg">Selectează o conversație</p>
              <p className="text-sm text-gray-400 mt-2 max-w-xs">Alege din lista din stânga pentru a vedea mesajele</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            {activeConv && (() => {
              const other = getOtherParty(activeConv)
              const initials = other ? `${other.first_name?.[0] || ''}${other.last_name?.[0] || ''}`.toUpperCase() : '?'
              const ctx = getContextMeta(activeConv)
              return (
                <div className="px-6 py-4 bg-white border-b border-gray-200 flex items-center gap-3 shadow-sm">
                  {other?.avatar_url
                    ? <img src={other.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                    : <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">{initials}</div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{other?.first_name} {other?.last_name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {ctx.type && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${ctx.badgeCls}`}>
                          {ctx.type}
                        </span>
                      )}
                      <span className="text-xs text-gray-600 truncate">{ctx.label}</span>
                    </div>
                  </div>
                </div>
              )
            })()}

            <JobPinCard conv={activeConv} onTaskClick={onTaskClick} onBookingClick={onBookingClick} onDisputeClick={onDisputeClick} />

            {/* Banner conversație închisă */}
            {activeConv?.is_closed && activeConv?.dispute_id ? (
              <div className="mx-4 mt-3 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-300 rounded-xl text-sm text-red-800 font-medium flex-shrink-0">
                <ShieldAlert className="w-4 h-4 flex-shrink-0 text-red-600 mt-0.5" />
                <span>Disputa a fost deschisă — conversația cu meșterul este înghețată pe durata procedurii. Continuați discuțiile în chat-ul cu adminul.</span>
              </div>
            ) : activeConv?.is_closed ? (
              <div className="mx-4 mt-3 flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 font-medium flex-shrink-0">
                <CheckCircle className="w-4 h-4 flex-shrink-0 text-green-600" />
                {activeConv.task?.status === 'client_rejected'
                  ? 'Lucrarea a fost contestată. Această conversație este arhivată.'
                  : 'Lucrarea a fost finalizată cu succes! Această conversație este arhivată.'}
              </div>
            ) : null}

            {/* Mesaje */}
            <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-2">
              {messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-gray-400">Niciun mesaj încă. Începe conversația!</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isOwn = msg.sender_id === userId
                  const prevMsg = idx > 0 ? messages[idx - 1] : null
                  const showSeparator = !prevMsg ||
                    new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString()

                  // System messages render as centered banners
                  if (msg.is_system) {
                    const isDisputeBanner = msg.content?.startsWith('Disputa a fost deschisă')
                    return (
                      <Fragment key={msg.id}>
                        {showSeparator && <DateSeparator dateIso={msg.created_at} />}
                        <div className="flex justify-center my-2">
                          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium max-w-[85%] text-center ${
                            isDisputeBanner
                              ? 'bg-red-50 border border-red-200 text-red-700'
                              : 'bg-blue-50 border border-blue-200 text-blue-700'
                          }`}>
                            {isDisputeBanner
                              ? <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                              : <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />}
                            <span>{msg.content}</span>
                          </div>
                        </div>
                      </Fragment>
                    )
                  }

                  return (
                    <Fragment key={msg.id}>
                      {showSeparator && <DateSeparator dateIso={msg.created_at} />}
                      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[65%] text-sm leading-relaxed overflow-hidden ${
                          isOwn
                            ? 'bg-slate-800 text-white rounded-2xl rounded-br-none'
                            : 'bg-white text-gray-900 rounded-2xl rounded-bl-none shadow-sm border border-gray-100'
                        }`}>
                          {msg.attachment_url && msg.attachment_type === 'image' && (
                            <img
                              src={msg.attachment_url}
                              alt="attachment"
                              className="w-full max-h-64 object-cover cursor-pointer"
                              style={{ display: 'block' }}
                              onClick={() => window.open(msg.attachment_url, '_blank')}
                            />
                          )}
                          {msg.attachment_url && msg.attachment_type === 'video' && (
                            <video src={msg.attachment_url} controls className="w-full max-h-64 block" />
                          )}
                          <div className="px-4 py-2.5">
                            {msg.content && <p className="break-words">{msg.content}</p>}
                            <div className={`flex items-center justify-end gap-1 ${msg.content ? 'mt-1' : 'mt-0'} ${isOwn ? 'text-white/50' : 'text-gray-400'}`}>
                              <span className="text-[10px]">
                                {new Date(msg.created_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <MessageTicks msg={msg} userId={userId} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </Fragment>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {activeConv?.is_closed && userRole === 'client' && (
              <div className="bg-white border-t border-gray-100 px-4 py-3 flex justify-center flex-shrink-0">
                <button
                  onClick={() => handleDeleteConversation(activeConv.id)}
                  className="flex items-center gap-2 text-xs text-red-400 hover:text-red-600 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Șterge conversația
                </button>
              </div>
            )}

            {activeConv?.is_closed ? null : <div className="bg-white border-t border-gray-200" data-emoji-picker>
                {/* Preview attachment */}
                {attachmentPreview && (
                  <div className="px-6 pt-3">
                    <div className="relative inline-block">
                      {attachmentFile?.type.startsWith('video') ? (
                        <div className="relative h-20 w-32 bg-gray-900 rounded-xl flex items-center justify-center">
                          <Play className="w-8 h-8 text-white/80" />
                          <span className="absolute bottom-1 left-2 text-[10px] text-white/60">Video</span>
                        </div>
                      ) : (
                        <img src={attachmentPreview} alt="" className="h-20 rounded-xl object-cover" />
                      )}
                      <button onClick={cancelAttachment}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full text-white flex items-center justify-center shadow">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Emoji picker */}
                {showEmojis && (
                  <div className="px-4 pt-3 pb-1">
                    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 grid grid-cols-10 gap-1 max-h-40 overflow-y-auto">
                      {EMOJIS.map(emoji => (
                        <button key={emoji} onClick={() => setNewMessage(prev => prev + emoji)}
                          className="text-xl hover:bg-gray-100 rounded-lg p-0.5 transition leading-none">
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input row */}
                <div className="px-4 py-3 flex items-center gap-2">
                  <button onClick={() => setShowEmojis(v => !v)}
                    className={`w-9 h-9 flex-shrink-0 rounded-xl flex items-center justify-center transition ${showEmojis ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}>
                    <Smile className="w-5 h-5" />
                  </button>

                  <button onClick={() => fileInputRef.current?.click()}
                    className="w-9 h-9 flex-shrink-0 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFileSelect} className="hidden" />

                  <input type="text" value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                    placeholder="Scrie un mesaj..."
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-gray-50"
                  />

                  <button onClick={sendMessage}
                    disabled={(!newMessage.trim() && !attachmentFile) || uploading}
                    className="w-9 h-9 flex-shrink-0 bg-slate-800 text-white rounded-xl flex items-center justify-center hover:bg-slate-700 transition disabled:opacity-40 disabled:cursor-not-allowed">
                    {uploading
                      ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <Send className="w-4 h-4" />
                    }
                  </button>
                </div>
              </div>}
          </>
        )}
      </div>
      ) : (
        <div className="w-0.5 bg-gray-200" />
      )}
    </div>
    </div>

      {/* ── Right-click context menu ── */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-xl py-1 min-w-[180px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onMouseDown={e => e.stopPropagation()}
        >
          <button
            onClick={() => { handlePinToggle(contextMenu.convId); setContextMenu(null) }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
          >
            <Pin className="w-4 h-4 text-amber-500" />
            {pinnedIds.has(contextMenu.convId) ? 'Desprinde conversația' : 'Fixează sus'}
          </button>
          <div className="h-px bg-gray-100 mx-2" />
          <button
            onClick={() => { setConfirmDeleteId(contextMenu.convId); setContextMenu(null) }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
          >
            <Trash2 className="w-4 h-4" />
            Șterge conversația
          </button>
        </div>
      )}

      {/* ── Delete confirmation modal ── */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onMouseDown={() => setConfirmDeleteId(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 mx-4"
            onMouseDown={e => e.stopPropagation()}>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-base font-bold text-gray-800 text-center mb-1">Ștergi conversația?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Toate mesajele din această conversație vor fi șterse permanent și nu pot fi recuperate.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
                Anulează
              </button>
              <button onClick={() => handleDeleteConv(confirmDeleteId)}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition">
                Da, șterge
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
