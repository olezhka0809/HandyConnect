import { Camera } from 'lucide-react'

const categoryImages = {
  'Instalații Electrice': '⚡',
  'Instalații Sanitare': '🔧',
  'Zugrăveli & Vopsitorie': '🎨',
  'Tâmplărie': '🪚',
  'Curățenie': '✨',
  'Grădinărit': '🌱',
  'Reparații Generale': '🔩',
  'Montaj Mobilă': '🪑',
  'Tablouri Electrice': '⚙️',
  'Iluminat': '💡',
  'Construcții': '🏗️',
  'Altele': '🛠️',
}

const categoryColors = {
  'Instalații Electrice': 'from-yellow-400 to-orange-500',
  'Instalații Sanitare': 'from-blue-400 to-cyan-500',
  'Zugrăveli & Vopsitorie': 'from-pink-400 to-purple-500',
  'Tâmplărie': 'from-amber-400 to-yellow-600',
  'Curățenie': 'from-teal-400 to-green-500',
  'Grădinărit': 'from-green-400 to-emerald-500',
  'Reparații Generale': 'from-gray-400 to-slate-500',
  'Montaj Mobilă': 'from-orange-400 to-red-500',
  'Tablouri Electrice': 'from-indigo-400 to-blue-600',
  'Iluminat': 'from-yellow-300 to-amber-500',
  'Construcții': 'from-stone-400 to-stone-600',
  'Altele': 'from-blue-400 to-indigo-500',
}

export default function TaskPhoto({ photos, category, className = 'w-full h-40' }) {
  // Dacă are poze reale, afișează prima
  if (photos && photos.length > 0 && photos[0] !== 'default') {
    return (
      <img
        src={photos[0]}
        alt="Task"
        className={`${className} object-cover rounded-lg`}
      />
    )
  }

  // Placeholder bazat pe categorie
  const emoji = categoryImages[category] || '🛠️'
  const gradient = categoryColors[category] || 'from-blue-400 to-indigo-500'

  return (
    <div className={`${className} bg-gradient-to-br ${gradient} rounded-lg flex flex-col items-center justify-center`}>
      <span className="text-4xl mb-2">{emoji}</span>
      <span className="text-white text-xs font-medium opacity-80">{category || 'Task'}</span>
    </div>
  )
}