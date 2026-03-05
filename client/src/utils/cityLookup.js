import { supabase } from '../supabase'

// Caută orașe pentru autocomplete
export async function searchCities(query) {
  if (!query || query.length < 2) return []

  const { data } = await supabase
    .from('romanian_cities')
    .select('*')
    .ilike('name', `%${query}%`)
    .limit(8)

  return data || []
}

// Ia coordonatele unui oraș
export async function getCityCoords(cityName, countyName) {
  const { data } = await supabase
    .from('romanian_cities')
    .select('latitude, longitude')
    .eq('name', cityName)
    .eq('county', countyName)
    .single()

  return data
}

// Setează coordonatele pe profil
export async function updateProfileLocation(userId, city, county) {
  const coords = await getCityCoords(city, county)
  if (coords) {
    await supabase
      .from('profiles')
      .update({
        city,
        county,
        latitude: coords.latitude,
        longitude: coords.longitude,
      })
      .eq('id', userId)
  }
  return coords
}

// Setează zona de lucru handyman
export async function updateHandymanWorkZone(userId, city, county, radiusKm, extendedKm) {
  const coords = await getCityCoords(city, county)
  if (!coords) {
    console.log('Nu s-au găsit coordonate pentru:', city, county)
    return null
  }

  const { error } = await supabase
    .from('handyman_profiles')
    .update({
      primary_city: city,
      primary_county: county,
      work_latitude: coords.latitude,
      work_longitude: coords.longitude,
      work_radius_km: radiusKm,
      extended_radius_km: extendedKm,
    })
    .eq('user_id', userId)

  if (error) {
    console.error('Eroare update handyman zone:', error)
    return null
  }

  return coords
}