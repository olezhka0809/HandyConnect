import { useState, useRef, useEffect } from 'react'
import { MapPin } from 'lucide-react'
import { searchCities } from '../utils/cityLookup'

export default function CityAutocomplete({ value, onChange, placeholder = 'Caută oraș...' }) {
  const [query, setQuery] = useState(value || '')
  const [results, setResults] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = async (q) => {
    setQuery(q)
    if (q.length >= 2) {
      const cities = await searchCities(q)
      setResults(cities)
      setIsOpen(true)
    } else {
      setResults([])
      setIsOpen(false)
    }
  }

  const handleSelect = (city) => {
    setQuery(`${city.name}, ${city.county}`)
    setIsOpen(false)
    onChange({
      name: city.name,
      county: city.county,
      latitude: city.latitude,
      longitude: city.longitude,
    })
  }

  return (
    <div ref={wrapperRef} className="relative">
      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={() => results.length > 0 && setIsOpen(true)}
        placeholder={placeholder}
        className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      {isOpen && results.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {results.map((city) => (
            <button
              key={`${city.name}-${city.county}`}
              onClick={() => handleSelect(city)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-blue-50 transition"
            >
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-800">{city.name}</p>
                <p className="text-xs text-gray-500">Județul {city.county}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}