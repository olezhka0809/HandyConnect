import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../supabase'
import HandymanNavbar from '../components/handyman-dashboard/HandymanNavbar'
import MessagingUI from '../components/messages/MessagingUI'
import TaskDetailModal from '../components/handyman-dashboard/TaskDetailModal'
import JobRequestModal from '../components/handyman-dashboard/JobRequestModal'
import HandymanDisputeModal from '../components/handyman-dashboard/HandymanDisputeModal'

function fmtDate(dateStr, timeStr) {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    const label = d.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })
    return timeStr ? `${label} · ${timeStr}` : label
  } catch { return dateStr }
}

function normaliseBookingForModal(booking) {
  const statusMap = {
    pending: 'new', accepted: 'accepted', confirmed: 'accepted',
    upcoming: 'accepted', in_progress: 'in_progress', delayed: 'delayed',
    completed: 'completed', cancelled: 'cancelled',
  }
  return {
    _type: 'booking',
    _id: booking.id,
    _raw: booking,
    title: booking.handyman_services?.title ?? `Rezervare #${booking.id.slice(0, 6)}`,
    client: booking.contact_name || 'Client',
    clientId: booking.client_id,
    description: booking.handyman_notes ?? '',
    date: fmtDate(booking.scheduled_date, booking.scheduled_time),
    photos: [],
    address: booking.service_address ?? '',
    price: booking.total ? `${Number(booking.total).toLocaleString('ro-RO')} RON` : '—',
    urgency: booking.urgency ?? 'normal',
    approximateDuration: booking.handyman_services?.estimated_duration ?? null,
    uiStatus: statusMap[booking.status] ?? 'new',
  }
}

export default function HandymanMessages() {
  const [userId, setUserId] = useState(null)
  const [searchParams] = useSearchParams()
  const [selectedTaskId, setSelectedTaskId] = useState(null)
  const [selectedJob, setSelectedJob] = useState(null)
  const [selectedDispute, setSelectedDispute] = useState(null)

  const initialBookingId = searchParams.get('booking_id') || null
  const initialTaskId = searchParams.get('task_id') || null

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  const handleTaskClick = (taskId) => {
    setSelectedTaskId(taskId)
  }

  const handleBookingClick = async (bookingId) => {
    const { data } = await supabase
      .from('bookings')
      .select('*, handyman_services(title, estimated_duration)')
      .eq('id', bookingId)
      .maybeSingle()
    if (data) setSelectedJob(normaliseBookingForModal(data))
  }

  const handleDisputeClick = async ({ disputeId }) => {
    const { data } = await supabase
      .from('task_disputes')
      .select(`
        id, task_id, status, details, photos, reason_id, created_at,
        rework_deadline, client_rework_confirmed_at, handyman_response, handyman_response_at, timeline, handyman_evidence,
        refund_amount, handyman_payout, admin_decision, resolution_note,
        task:task_id (id, title, status, final_price, client_id, is_rework, rework_level, profiles!tasks_client_id_fkey(first_name, last_name)),
        rejection_reasons!reason_id(name)
      `)
      .eq('id', disputeId)
      .maybeSingle()
    if (data) setSelectedDispute(data)
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      <HandymanNavbar />
      {userId && (
        <div className="max-w-7xl mx-auto w-full px-4 py-4 flex-1 overflow-hidden">
          <MessagingUI
            userId={userId}
            userRole="handyman"
            initialBookingId={initialBookingId}
            initialTaskId={initialTaskId}
            backPath="/handyman/dashboard"
            onTaskClick={handleTaskClick}
            onBookingClick={handleBookingClick}
            onDisputeClick={handleDisputeClick}
          />
        </div>
      )}

      <TaskDetailModal
        taskId={selectedTaskId}
        userId={userId}
        onClose={() => setSelectedTaskId(null)}
      />

      {selectedJob && (
        <JobRequestModal
          job={selectedJob}
          initialMode="details"
          userId={userId}
          onClose={() => setSelectedJob(null)}
          onUpdate={() => setSelectedJob(null)}
        />
      )}

      <HandymanDisputeModal
        isOpen={!!selectedDispute}
        dispute={selectedDispute}
        onClose={() => setSelectedDispute(null)}
        onRefresh={() => setSelectedDispute(null)}
      />
    </div>
  )
}
