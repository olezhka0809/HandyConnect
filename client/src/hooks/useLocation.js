import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function useLocation(userId) {
  const [location, setLocation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!userId) return

    // Verifică dacă browserul suportă geolocation
    if (!navigator.geolocation) {
      setError('Browserul nu suportă geolocalizarea')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          latitude: parseFloat(position.coords.latitude.toFixed(6)),
          longitude: parseFloat(position.coords.longitude.toFixed(6)),
        }
        setLocation(coords)

        // Salvează coordonatele în profiles
        await supabase
          .from('profiles')
          .update({
            latitude: coords.latitude,
            longitude: coords.longitude,
          })
          .eq('id', userId)

        setLoading(false)
      },
      (err) => {
        console.log('Geolocalizare refuzată sau indisponibilă:', err.message)
        setError(err.message)
        setLoading(false)
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 600000, // Cache 10 minute
      }
    )
  }, [userId])

  return { location, loading, error }
}