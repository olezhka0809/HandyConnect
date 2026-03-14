import { MapPin, X, Navigation } from 'lucide-react'
import { useState } from 'react'

export default function LocationBanner({ location, error, onRetry }) {
  const [dismissed, setDismissed] = useState(false)

  // Nu arăta nimic dacă locația e OK sau bannerul e închis
  if (location || dismissed) return null

  // Eroare de localizare
  if (error) {
    return (
      <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-yellow-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-800">Localizarea nu este activă</p>
              <p className="text-xs text-yellow-600">
                Activează localizarea pentru a vedea handymani din zona ta și pentru ca taskurile tale să ajungă la handymanii potriviți.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onRetry}
              className="px-3 py-1.5 bg-yellow-600 text-white rounded-lg text-xs font-medium hover:bg-yellow-700 transition"
            >
              Activează
            </button>
            <button onClick={() => setDismissed(true)} className="w-7 h-7 rounded-lg hover:bg-yellow-100 flex items-center justify-center">
              <X className="w-4 h-4 text-yellow-500" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}