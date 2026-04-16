import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../supabase'
import DashboardNavbar from '../components/dashboard/DashboardNavbar'
import MessagingUI from '../components/messages/MessagingUI'
import ClientTaskDetailModal from '../components/dashboard/client-dashboard/ClientTaskDetailModal'
import ClientBookingDetailModal from '../components/dashboard/client-dashboard/ClientBookingDetailModal'

export default function Messages() {
  const [userId, setUserId] = useState(null)
  const [searchParams] = useSearchParams()
  const [selectedTaskId, setSelectedTaskId] = useState(null)
  const [selectedBookingId, setSelectedBookingId] = useState(null)

  const initialBookingId = searchParams.get('booking_id') || null
  const initialTaskId = searchParams.get('task_id') || null

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      <DashboardNavbar />
      {userId && (
        <div className="max-w-7xl mx-auto w-full px-4 py-4 flex-1 overflow-hidden">
          <MessagingUI
            userId={userId}
            userRole="client"
            initialBookingId={initialBookingId}
            initialTaskId={initialTaskId}
            backPath="/dashboard"
            onTaskClick={(taskId) => setSelectedTaskId(taskId)}
            onBookingClick={(bookingId) => setSelectedBookingId(bookingId)}
            onDisputeClick={({ taskId }) => setSelectedTaskId(taskId)}
          />
        </div>
      )}

      <ClientTaskDetailModal
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onUpdated={() => setSelectedTaskId(null)}
      />

      <ClientBookingDetailModal
        bookingId={selectedBookingId}
        onClose={() => setSelectedBookingId(null)}
        onUpdated={() => setSelectedBookingId(null)}
      />
    </div>
  )
}
