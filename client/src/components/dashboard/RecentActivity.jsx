import { CheckCircle, Star, MessageSquare, Clock, CreditCard } from 'lucide-react'

const activities = [
  { icon: CheckCircle, color: 'text-green-600 bg-green-100', title: 'Rezervare confirmată', desc: 'Handymanul a confirmat rezervarea ta pentru instalații electrice', time: 'Acum 2 ore' },
  { icon: Star, color: 'text-yellow-600 bg-yellow-100', title: 'Cerere de recenzie', desc: 'Lasă un review pentru serviciul de curățenie recent', time: 'Ieri, 14:30' },
  { icon: MessageSquare, color: 'text-blue-600 bg-blue-100', title: 'Mesaj nou', desc: 'Ai primit un mesaj de la Mihai Popescu', time: 'Ieri, 09:15' },
  { icon: Clock, color: 'text-purple-600 bg-purple-100', title: 'Reminder programare', desc: 'Ai o programare mâine la ora 10:00', time: '10 Dec, 08:00' },
  { icon: CreditCard, color: 'text-emerald-600 bg-emerald-100', title: 'Plată procesată', desc: 'Plata pentru lucrarea de zugrăvit a fost procesată', time: '8 Dec, 10:00' },
]

export default function RecentActivity() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="p-5 border-b border-gray-100">
        <h3 className="font-bold text-gray-800">Activitate recentă</h3>
      </div>
      <div className="divide-y divide-gray-50">
        {activities.map((item, i) => (
          <div key={i} className="flex items-start gap-3 p-4 hover:bg-gray-50 transition">
            <div className={`w-9 h-9 ${item.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
              <item.icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 text-sm">{item.title}</p>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{item.desc}</p>
              <p className="text-xs text-gray-400 mt-1">{item.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}