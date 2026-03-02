import { X, Star, MapPin, Clock, Award, TrendingUp, Search, CheckCircle, Calendar } from 'lucide-react'
import { useState } from 'react'

const mockResults = {
  professionals: [
    {
      name: 'Ion Marin',
      rating: 4.9,
      reviews: 127,
      tags: ['Instalații Electrice', 'Montaj Tablouri'],
      desc: 'Electrician expert specializat în instalații rezidențiale și comerciale.',
      responseTime: 'Răspunde < 1 oră',
      address: 'Str. Victoriei 15, Timișoara',
      badges: ['Electrician Certificat', 'Conștiincios'],
      jobs: 167,
      rate: '90 RON/h',
      availability: 'Disponibil azi',
      availColor: 'text-green-600',
    },
    {
      name: 'Dan Nistor',
      rating: 4.8,
      reviews: 85,
      tags: ['Instalații Electrice', 'Reparații Urgente'],
      desc: 'Electrician de încredere oferind servicii de top pentru case și firme.',
      responseTime: 'Răspunde < 2 ore',
      address: 'Str. Eroilor 3, Timișoara',
      badges: ['Master Electrician', 'Certificat și Asigurat'],
      jobs: 92,
      rate: '80 RON/h',
      availability: 'Disponibil săpt. viitoare',
      availColor: 'text-blue-600',
    },
    {
      name: 'Radu Ionescu',
      rating: 4.5,
      reviews: 100,
      tags: ['Cablaje Moderne', 'Panouri Electrice'],
      desc: 'Specializat în upgrade-uri electrice și instalații de panouri pentru case moderne.',
      responseTime: 'Răspunde < 4 ore',
      address: 'Calea Aradului 44, Timișoara',
      badges: ['Specialist Electrician', 'Profesionist Licențiat'],
      jobs: 50,
      rate: '75 RON/h',
      availability: 'Disponibil weekend',
      availColor: 'text-purple-600',
    },
  ],
  services: [
    { name: 'Cablare Living', tags: ['Electricitate', 'Spații Comerciale'], searches: 200 },
    { name: 'Cablare Pereți Interiori', tags: ['Electricitate', 'Case Rezidențiale'], searches: 150 },
    { name: 'Instalație Electrică Exterioară', tags: ['Electricitate', 'Curb Appeal'], searches: 180 },
  ],
}

export default function SearchResults({ query, onClose }) {
  const [activeTab, setActiveTab] = useState('all')

  const profCount = mockResults.professionals.length
  const servCount = mockResults.services.length
  const totalCount = profCount + servCount

  const tabs = [
    { id: 'all', label: 'Toate rezultatele', count: totalCount },
    { id: 'professionals', label: 'Profesioniști', count: profCount },
    { id: 'services', label: 'Servicii', count: servCount },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-10 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-bold text-gray-800">
              Rezultate pentru "<span className="text-blue-600">{query}</span>"
            </h2>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <p className="text-sm text-gray-500">
            Răsfoiește profesioniștii care corespund căutării tale
          </p>

          {/* Tabs */}
          <div className="flex gap-2 mt-4 bg-gray-100 p-1 rounded-lg">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all flex-1 justify-center
                  ${activeTab === tab.id
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                  }
                `}
              >
                {tab.label}
                <span className={`px-1.5 py-0.5 rounded text-xs font-bold
                  ${activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'}
                `}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Content - scrollable */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">

          {/* Professionals */}
          {(activeTab === 'all' || activeTab === 'professionals') && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-gray-800">Profesioniști ({profCount})</h3>
              </div>
              <div className="space-y-4">
                {mockResults.professionals.map((pro, i) => (
                  <div key={i} className="border border-gray-100 rounded-xl p-5 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                          {pro.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-gray-800">{pro.name}</p>
                            <div className="flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-medium">{pro.rating}</span>
                              <span className="text-xs text-gray-400">({pro.reviews} recenzii)</span>
                            </div>
                          </div>
                          <div className="flex gap-1.5 mt-1">
                            {pro.tags.map((tag) => (
                              <span key={tag} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-md font-medium">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-blue-600">{pro.rate}</p>
                        <p className={`text-xs font-medium ${pro.availColor}`}>{pro.availability}</p>
                      </div>
                    </div>

                    <p className="text-sm text-gray-500 mb-3">{pro.desc}</p>

                    <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{pro.responseTime}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>{pro.address}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                      {pro.badges.map((badge) => (
                        <div key={badge} className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-blue-500" />
                          <span>{badge}</span>
                        </div>
                      ))}
                      <span>{pro.jobs} lucrări finalizate</span>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      
                      <button className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
                        <Calendar className="w-4 h-4" />
                        Rezervă
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Services */}
          {(activeTab === 'all' || activeTab === 'services') && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <h3 className="font-bold text-gray-800">Servicii Populare ({servCount})</h3>
              </div>
              <div className="space-y-3">
                {mockResults.services.map((service, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:shadow-sm transition cursor-pointer hover:border-blue-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Search className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{service.name}</p>
                        <div className="flex gap-1.5 mt-1">
                          {service.tags.map((tag) => (
                            <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-md">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className="text-sm text-gray-400">{service.searches} căutări</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="bg-gray-50 rounded-xl p-8 text-center">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Vrei să vezi mai multe opțiuni?</h3>
            <p className="text-sm text-gray-500 mb-4">
              Explorează directorul complet de servicii și profesioniști
            </p>
            <button
              onClick={onClose}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition"
            >
              <Search className="w-4 h-4" />
              Explorează toate serviciile →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}