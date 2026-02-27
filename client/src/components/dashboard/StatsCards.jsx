import { Calendar, CheckCircle, CreditCard, Star } from 'lucide-react'

const stats = [
  { label: 'Rezervări active', value: '0', change: '', icon: Calendar, color: 'bg-blue-100 text-blue-600' },
  { label: 'Lucrări finalizate', value: '0', change: '', icon: CheckCircle, color: 'bg-green-100 text-green-600' },
  { label: 'Total cheltuit', value: '0 RON', change: '', icon: CreditCard, color: 'bg-purple-100 text-purple-600' },
  { label: 'Rating mediu dat', value: '-', change: '', icon: Star, color: 'bg-yellow-100 text-yellow-600' },
]

export default function StatsCards() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center`}>
              <stat.icon className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
          {stat.change && <p className="text-sm text-green-600 mt-1">{stat.change}</p>}
        </div>
      ))}
    </div>
  )
}