import { Search, MessageSquare, Star, Heart } from 'lucide-react'

const actions = [
  { icon: Search, label: 'Caută Handymani', desc: 'Răsfoiește servicii disponibile', color: 'bg-blue-100 text-blue-600' },
  { icon: MessageSquare, label: 'Mesaje', desc: 'Chat cu handymani', color: 'bg-green-100 text-green-600' },
  { icon: Star, label: 'Scrie Recenzii', desc: 'Împărtășește experiența ta', color: 'bg-yellow-100 text-yellow-600' },
  { icon: Heart, label: 'Favoriți', desc: 'Handymanii tăi preferați', color: 'bg-red-100 text-red-600' },
]

export default function QuickActions() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {actions.map((action) => (
        <button
          key={action.label}
          className="flex items-center gap-3 bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all text-left"
        >
          <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
            <action.icon className="w-5 h-5" />
          </div>
          <div>
            <p className="font-medium text-gray-800 text-sm">{action.label}</p>
            <p className="text-xs text-gray-500">{action.desc}</p>
          </div>
        </button>
      ))}
    </div>
  )
}