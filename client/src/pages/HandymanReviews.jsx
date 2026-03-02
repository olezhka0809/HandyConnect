import { useState } from 'react'
import HandymanNavbar from '../components/handyman-dashboard/HandymanNavbar'
import {
  Star, Search, Heart, Share2, Flag, Camera, Clock,
  DollarSign, ThumbsUp, Users, Award, CheckCircle
} from 'lucide-react'

const ratingBreakdown = [
  { stars: 5, count: 20 },
  { stars: 4, count: 6 },
  { stars: 3, count: 0 },
  { stars: 2, count: 0 },
  { stars: 1, count: 0 },
]

const totalReviews = ratingBreakdown.reduce((a, b) => a + b.count, 0)
const avgRating = (ratingBreakdown.reduce((a, b) => a + (b.stars * b.count), 0) / totalReviews).toFixed(1)

const popularTags = ['Profesionist', 'La Timp', 'Calitate', 'Preț Corect', 'Curățenie']

const reviews = [
  {
    id: 1,
    client: 'Maria Popescu',
    verified: true,
    date: 'Dec 01, 2025',
    rating: 5,
    title: 'Lucrare electrică excelentă!',
    text: 'Ion a făcut o treabă extraordinară instalând prizele noi și upgrade-ul panoului electric. A fost profesionist, punctual și a explicat totul clar. Lucrarea a fost finalizată mai repede decât era de așteptat, iar curățenia a fost impecabilă. Cu siguranță voi apela din nou!',
    service: 'Instalații Electrice',
    photos: 4,
    tags: ['Profesionist', 'La Timp', 'Calitate', 'Comunicare Bună', 'Curățenie'],
    duration: '8 ore',
    cost: '1.200 RON',
    helpful: 12,
    reply: {
      name: 'Ion Marin',
      text: 'Mulțumesc, Maria! A fost o plăcere să lucrez la proiectul din bucătărie. Nu ezitați să mă contactați pentru orice alte nevoi electrice!',
    },
  },
  {
    id: 2,
    client: 'Andrei Vasile',
    verified: true,
    date: 'Ian 15, 2026',
    rating: 5,
    title: 'Electrician foarte priceput!',
    text: 'Am angajat echipa pentru recablarea casei și au făcut o treabă fantastică. Cunoștea standardele de siguranță foarte bine și s-a asigurat că totul este conform. Am fost impresionat de atenția la detalii.',
    service: 'Instalare Electrică',
    photos: 3,
    tags: ['Profesionist', 'La Timp', 'Calitate', 'Comunicare Bună', 'Curățenie'],
    duration: '8 ore',
    cost: '1.500 RON',
    helpful: 10,
    reply: {
      name: 'Ion Marin',
      text: 'Mulțumesc, Andrei! A fost minunat să transformăm cablajul casei tale. Aștept cu nerăbdare proiectele viitoare!',
    },
  },
  {
    id: 3,
    client: 'Elena Dumitrescu',
    verified: true,
    date: 'Feb 20, 2026',
    rating: 5,
    title: 'Serviciu excelent!',
    text: 'A înlocuit toate corpurile de iluminat din birou și nu puteam fi mai mulțumită. A fost meticuloasă, a lucrat eficient și a lăsat spațiul curat. Apreciez dedicarea pentru satisfacția clientului.',
    service: 'Înlocuire Corpuri Iluminat',
    photos: 4,
    tags: ['Profesionist', 'La Timp', 'Calitate', 'Comunicare Bună', 'Curățenie'],
    duration: '5 ore',
    cost: '700 RON',
    helpful: 15,
    reply: {
      name: 'Ion Marin',
      text: 'Mulțumesc, Elena! Mă bucur că îți plac noile corpuri de iluminat. Sunt aici pentru orice upgrade viitor!',
    },
  },
  {
    id: 4,
    client: 'Bogdan Cristea',
    verified: true,
    date: 'Mar 05, 2026',
    rating: 5,
    title: 'Lucrare impresionantă!',
    text: 'Am chemat echipa pentru instalarea unui ventilator de tavan și iluminat suplimentar în living. Au venit prompt, au lucrat rapid și au fost foarte respectuoși cu spațiul. Recomand cu încredere!',
    service: 'Instalare Ventilator',
    photos: 3,
    tags: ['Profesionist', 'La Timp', 'Calitate', 'Comunicare Bună', 'Curățenie'],
    duration: '3 ore',
    cost: '400 RON',
    helpful: 8,
    reply: {
      name: 'Ion Marin',
      text: 'Mulțumesc, Bogdan! A fost o plăcere să îmbunătățim confortul casei tale. Contactează-mă oricând pentru proiecte electrice!',
    },
  },
]

const ratingOptions = ['Toate Ratingurile', '5 Stele', '4 Stele', '3 Stele', '2 Stele', '1 Stea']
const serviceOptions = ['Toate Serviciile', 'Instalații Electrice', 'Instalare Electrică', 'Înlocuire Corpuri Iluminat', 'Instalare Ventilator']
const sortOptions = ['Cele mai recente', 'Rating descrescător', 'Rating crescător', 'Cele mai utile']

export default function HandymanReviews() {
  const [searchQuery, setSearchQuery] = useState('')
  const [ratingFilter, setRatingFilter] = useState('Toate Ratingurile')
  const [serviceFilter, setServiceFilter] = useState('Toate Serviciile')
  const [sortBy, setSortBy] = useState('Cele mai recente')
  const [activeTag, setActiveTag] = useState(null)
  const [helpfulClicked, setHelpfulClicked] = useState([])

  const toggleHelpful = (id) => {
    setHelpfulClicked(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const filteredReviews = reviews.filter(r => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (!r.title.toLowerCase().includes(q) && !r.text.toLowerCase().includes(q) && !r.client.toLowerCase().includes(q)) return false
    }
    if (ratingFilter !== 'Toate Ratingurile') {
      const num = parseInt(ratingFilter)
      if (r.rating !== num) return false
    }
    if (serviceFilter !== 'Toate Serviciile' && r.service !== serviceFilter) return false
    if (activeTag && !r.tags.includes(activeTag)) return false
    return true
  })

  const maxCount = Math.max(...ratingBreakdown.map(r => r.count))

  return (
    <div className="min-h-screen bg-gray-50">
      <HandymanNavbar />

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Recenzii & Ratinguri</h1>
          <p className="text-gray-500 mt-1">{totalReviews} recenzii pentru tine</p>
        </div>

        {/* Rating Summary */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Left: Big rating */}
            <div className="text-center md:text-left flex-shrink-0">
              <p className="text-5xl font-bold text-gray-800">{avgRating}</p>
              <div className="flex items-center justify-center md:justify-start gap-0.5 my-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={`w-5 h-5 ${s <= Math.round(avgRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                ))}
              </div>
              <p className="text-sm text-gray-500">{totalReviews} recenzii total</p>
            </div>

            {/* Center: Breakdown bars */}
            <div className="flex-1 w-full space-y-2">
              {ratingBreakdown.map((item) => (
                <div key={item.stars} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-8 justify-end">
                    <span className="text-sm font-medium text-gray-600">{item.stars}</span>
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-yellow-400 h-3 rounded-full transition-all"
                      style={{ width: maxCount > 0 ? `${(item.count / maxCount) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="text-sm text-gray-500 w-8">{item.count}</span>
                </div>
              ))}
            </div>

            {/* Right: Stats */}
            <div className="flex-shrink-0 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <ThumbsUp className="w-4 h-4 text-green-500" />
                <span className="text-gray-600">88% ar recomanda</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Award className="w-4 h-4 text-blue-500" />
                <span className="text-gray-600">Top rated în Electrică</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-purple-500" />
                <span className="text-gray-600">127 clienți recurenți</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Caută recenzii după serviciu, client sau descriere..."
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)}
            className="px-4 py-3 border border-gray-200 rounded-xl bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            {ratingOptions.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)}
            className="px-4 py-3 border border-gray-200 rounded-xl bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            {serviceOptions.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-3 border border-gray-200 rounded-xl bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            {sortOptions.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        {/* Popular Tags */}
        <div className="flex items-center gap-2 mb-6">
          <span className="text-sm text-gray-500">Tag-uri populare:</span>
          {popularTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition
                ${activeTag === tag ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
              `}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Reviews List */}
        <div className="space-y-4">
          {filteredReviews.map((review) => (
            <div key={review.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              {/* Review Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                    {review.client[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-800">{review.client}</span>
                      {review.verified && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">
                          <CheckCircle className="w-3 h-3" /> Client Verificat
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`w-3.5 h-3.5 ${s <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                        ))}
                      </div>
                      <span className="text-xs text-gray-400">{review.date}</span>
                    </div>
                  </div>
                </div>
                <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg">
                  {review.service}
                </span>
              </div>

              {/* Review Content */}
              <h4 className="font-bold text-gray-800 mb-2">{review.title}</h4>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">{review.text}</p>

              {/* Photos */}
              {review.photos > 0 && (
                <div className="flex gap-2 mb-3">
                  {[...Array(Math.min(review.photos, 4))].map((_, i) => (
                    <div key={i} className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Camera className="w-6 h-6 text-gray-300" />
                    </div>
                  ))}
                </div>
              )}

              {/* Tags */}
              <div className="flex flex-wrap items-center gap-1.5 mb-3">
                {review.tags.map((tag) => (
                  <span key={tag} className="px-2.5 py-1 bg-blue-50 text-blue-600 text-xs rounded-lg font-medium">
                    {tag}
                  </span>
                ))}
              </div>

              {/* Duration & Cost */}
              <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Durată: {review.duration}</span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  <span>Cost: {review.cost}</span>
                </div>
              </div>

              {/* Reply */}
              {review.reply && (
                <div className="bg-gray-50 rounded-xl p-4 mb-4 border-l-4 border-blue-400">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {review.reply.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span className="font-bold text-gray-800 text-sm">{review.reply.name}</span>
                  </div>
                  <p className="text-sm text-gray-600">{review.reply.text}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleHelpful(review.id)}
                    className={`flex items-center gap-1.5 text-sm transition
                      ${helpfulClicked.includes(review.id) ? 'text-blue-600 font-medium' : 'text-gray-400 hover:text-gray-600'}
                    `}
                  >
                    <Heart className={`w-4 h-4 ${helpfulClicked.includes(review.id) ? 'fill-blue-600' : ''}`} />
                    Util ({helpfulClicked.includes(review.id) ? review.helpful + 1 : review.helpful})
                  </button>
                  <button className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition">
                    <Share2 className="w-4 h-4" />
                    Distribuie
                  </button>
                </div>
                <button className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 transition">
                  <Flag className="w-4 h-4" />
                  Raportează
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredReviews.length === 0 && (
          <div className="text-center py-16">
            <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">Nicio recenzie găsită</h3>
            <p className="text-gray-500">Încearcă să modifici filtrele sau caută altceva</p>
          </div>
        )}
      </div>
    </div>
  )
}