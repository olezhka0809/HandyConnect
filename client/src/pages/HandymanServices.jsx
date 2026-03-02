import { useState } from 'react'
import HandymanNavbar from '../components/handyman-dashboard/HandymanNavbar'
import {
  Plus, Edit2, Trash2, Star, Briefcase, DollarSign,
  Clock, Calendar, Settings, BarChart3, X, CheckCircle
} from 'lucide-react'

const mockServices = [
  {
    id: 1,
    title: 'Instalare Iluminat',
    description: 'Montaj sisteme de iluminat interior și exterior pentru ambianță și siguranță',
    bookings: 15,
    duration: '2-3 ore',
    rating: 4.8,
    basePrice: 250,
    perHour: 150,
    totalRevenue: 4150,
    lastBooking: 'Dec 06',
    tags: ['Prize', 'Întrerupătoare', 'Cablaj', 'Reparații'],
  },
  {
    id: 2,
    title: 'Instalare Întrerupătoare',
    description: 'Instalare și upgrade întrerupătoare pentru siguranță și conformitate',
    bookings: 10,
    duration: '3-4 ore',
    rating: 4.7,
    basePrice: 300,
    perHour: 120,
    totalRevenue: 3600,
    lastBooking: 'Dec 04',
    tags: ['Upgrade', 'Testare', 'Conformitate', 'Instalare'],
  },
  {
    id: 3,
    title: 'Instalare Generator',
    description: 'Instalare și configurare generatoare backup pentru rezidențial și comercial',
    bookings: 8,
    duration: '4-6 ore',
    rating: 4.7,
    basePrice: 400,
    perHour: 250,
    totalRevenue: 8000,
    lastBooking: 'Dec 04',
    tags: ['Linii Alimentare', 'Sisteme Control', 'Conexiuni', 'Configurare'],
  },
  {
    id: 4,
    title: 'Cablaj Generator',
    description: 'Configurare cablaj pentru generatoare standby pentru alimentare fiabilă',
    bookings: 12,
    duration: '4-5 ore',
    rating: 4.6,
    basePrice: 350,
    perHour: 180,
    totalRevenue: 5400,
    lastBooking: 'Dec 01',
    tags: ['Instalare', 'Testare', 'Integrare', 'Suport'],
  },
  {
    id: 5,
    title: 'Upgrade Panou Electric',
    description: 'Upgrade și înlocuire panouri electrice existente pentru capacitate crescută',
    bookings: 10,
    duration: '3-5 ore',
    rating: 4.9,
    basePrice: 300,
    perHour: 250,
    totalRevenue: 6000,
    lastBooking: 'Dec 05',
    tags: ['Siguranțe', 'Întrerupătoare', 'Siguranță', 'Instalare'],
  },
  {
    id: 6,
    title: 'Sistem Protecție Supratensiune',
    description: 'Instalare protecție supratensiune pentru echipamente contra spike-urilor de tensiune',
    bookings: 8,
    duration: '2-3 ore',
    rating: 4.9,
    basePrice: 200,
    perHour: 100,
    totalRevenue: 2000,
    lastBooking: 'Dec 02',
    tags: ['Protecție', 'Siguranță', 'Instalare', 'Consultanță'],
  },
  {
    id: 7,
    title: 'Sistem Cablaj Casă',
    description: 'Instalare completă sisteme cablaj pentru construcții noi',
    bookings: 5,
    duration: '1-2 săpt.',
    rating: 4.6,
    basePrice: 350,
    perHour: 220,
    totalRevenue: 7000,
    lastBooking: 'Dec 03',
    tags: ['Cablaj', 'Prize', 'Tablouri', 'Instalare'],
  },
  {
    id: 8,
    title: 'Sisteme Automatizare Casă',
    description: 'Instalare sisteme smart home pentru control automat iluminat și aparatură',
    bookings: 15,
    duration: '5-6 ore',
    rating: 4.9,
    basePrice: 500,
    perHour: 200,
    totalRevenue: 6500,
    lastBooking: 'Nov 29',
    tags: ['Dispozitive Smart', 'Instalare', 'Programare', 'Consultanță'],
  },
]

const emptyService = {
  title: '',
  description: '',
  basePrice: '',
  perHour: '',
  duration: '',
  tags: [],
}

export default function HandymanServices() {
  const [tab, setTab] = useState('services')
  const [services, setServices] = useState(mockServices)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingService, setEditingService] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [newService, setNewService] = useState({ ...emptyService })
  const [tagInput, setTagInput] = useState('')

  const totalBookings = services.reduce((a, b) => a + b.bookings, 0)
  const totalRevenue = services.reduce((a, b) => a + b.totalRevenue, 0)
  const avgRating = (services.reduce((a, b) => a + b.rating, 0) / services.length).toFixed(1)

  const openEdit = (service) => {
    setEditingService(service.id)
    setNewService({
      title: service.title,
      description: service.description,
      basePrice: service.basePrice,
      perHour: service.perHour,
      duration: service.duration,
      tags: [...service.tags],
    })
    setShowAddModal(true)
  }

  const openAdd = () => {
    setEditingService(null)
    setNewService({ ...emptyService })
    setShowAddModal(true)
  }

  const handleSave = () => {
    if (editingService) {
      setServices(prev => prev.map(s => s.id === editingService ? {
        ...s,
        ...newService,
        basePrice: Number(newService.basePrice),
        perHour: Number(newService.perHour),
      } : s))
    } else {
      setServices(prev => [...prev, {
        id: Date.now(),
        ...newService,
        basePrice: Number(newService.basePrice),
        perHour: Number(newService.perHour),
        bookings: 0,
        rating: 0,
        totalRevenue: 0,
        lastBooking: 'Niciuna',
      }])
    }
    setShowAddModal(false)
    setNewService({ ...emptyService })
  }

  const handleDelete = (id) => {
    setServices(prev => prev.filter(s => s.id !== id))
    setDeleteConfirm(null)
  }

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !newService.tags.includes(t) && newService.tags.length < 6) {
      setNewService(prev => ({ ...prev, tags: [...prev.tags, t] }))
    }
    setTagInput('')
  }

  const removeTag = (tag) => {
    setNewService(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))
  }

  const tabs = [
    { id: 'services', label: `Servicii (${services.length})` },
    { id: 'analytics', label: 'Analiză' },
    { id: 'settings', label: 'Setări' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <HandymanNavbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Gestionare Servicii</h1>
            <p className="text-gray-500 mt-1">Gestionează serviciile oferite, prețurile și disponibilitatea</p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" /> Adaugă Serviciu
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Servicii Active', value: services.length, icon: Settings, color: 'bg-blue-100 text-blue-600' },
            { label: 'Total Rezervări', value: totalBookings, icon: Briefcase, color: 'bg-green-100 text-green-600' },
            { label: 'Venituri Totale', value: `${totalRevenue.toLocaleString()} RON`, icon: DollarSign, color: 'bg-purple-100 text-purple-600' },
            { label: 'Rating Mediu', value: avgRating, icon: Star, color: 'bg-yellow-100 text-yellow-600' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-500">{stat.label}</p>
                <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white rounded-xl border border-gray-100 p-1.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium text-center transition-all
                ${tab === t.id ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}
              `}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Services Tab */}
        {tab === 'services' && (
          <div className="grid md:grid-cols-2 gap-4">
            {services.map((service) => (
              <div key={service.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                {/* Service Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800">{service.title}</h3>
                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{service.description}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-3">
                    <button
                      onClick={() => openEdit(service)}
                      className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(service.id)}
                      className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Meta */}
                <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                  <div className="flex items-center gap-1">
                    <Briefcase className="w-3 h-3" />
                    <span>{service.bookings} rezervări</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{service.duration}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-gray-600 font-medium">{service.rating}</span>
                  </div>
                </div>

                {/* Pricing Grid */}
                <div className="grid grid-cols-4 gap-3 mb-4 pb-4 border-b border-gray-100">
                  <div>
                    <p className="text-xs text-gray-400">Preț Bază</p>
                    <p className="font-bold text-gray-800 text-sm">{service.basePrice} RON</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Pe Oră</p>
                    <p className="font-bold text-gray-800 text-sm">{service.perHour} RON</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Venituri Totale</p>
                    <p className="font-bold text-gray-800 text-sm">{service.totalRevenue.toLocaleString()} RON</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Ultima Rezervare</p>
                    <p className="font-bold text-gray-800 text-sm">{service.lastBooking}</p>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {service.tags.map((tag) => (
                    <span key={tag} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Analytics Tab */}
        {tab === 'analytics' && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-800 mb-2">Analiză Servicii</h3>
              <p className="text-gray-500 mb-4">Vizualizări detaliate ale performanței serviciilor tale vor fi disponibile aici.</p>

              <div className="grid md:grid-cols-3 gap-4 mt-8 max-w-2xl mx-auto">
                {services.slice(0, 3).map((s) => (
                  <div key={s.id} className="bg-gray-50 rounded-xl p-4 text-left">
                    <h4 className="font-bold text-gray-800 text-sm mb-2">{s.title}</h4>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Rezervări</span>
                        <span className="font-bold">{s.bookings}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Venituri</span>
                        <span className="font-bold">{s.totalRevenue.toLocaleString()} RON</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Rating</span>
                        <span className="font-bold">{s.rating} ⭐</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {tab === 'settings' && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-bold text-gray-800 mb-6">Setări Servicii</h3>
            <div className="space-y-6 max-w-lg">
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">Moneda implicită</label>
                <select className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>RON - Leu Românesc</option>
                  <option>EUR - Euro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">Rază de lucru implicită</label>
                <select className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Sub 5 km</option>
                  <option>Sub 10 km</option>
                  <option>Sub 15 km</option>
                  <option>Sub 25 km</option>
                  <option>Sub 50 km</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">Acceptare automată rezervări</label>
                <div className="flex items-center gap-3">
                  <button className="w-12 h-7 bg-gray-200 rounded-full relative transition">
                    <div className="w-5 h-5 bg-white rounded-full absolute top-1 left-1 shadow transition" />
                  </button>
                  <span className="text-sm text-gray-500">Dezactivat - Verifici manual fiecare cerere</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">Notificări cereri noi</label>
                <div className="flex items-center gap-3">
                  <button className="w-12 h-7 bg-blue-600 rounded-full relative transition">
                    <div className="w-5 h-5 bg-white rounded-full absolute top-1 right-1 shadow transition" />
                  </button>
                  <span className="text-sm text-gray-500">Activat - Primești notificări pentru cereri noi</span>
                </div>
              </div>
              <button className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition">
                Salvează Setările
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">
                {editingService ? 'Editează Serviciu' : 'Adaugă Serviciu Nou'}
              </h2>
              <button onClick={() => setShowAddModal(false)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1">Nume serviciu *</label>
                <input
                  type="text"
                  value={newService.title}
                  onChange={(e) => setNewService(p => ({ ...p, title: e.target.value }))}
                  placeholder="Ex: Instalare Iluminat"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1">Descriere</label>
                <textarea
                  value={newService.description}
                  onChange={(e) => setNewService(p => ({ ...p, description: e.target.value }))}
                  placeholder="Descrie serviciul oferit..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-1">Preț Bază (RON)</label>
                  <input
                    type="number"
                    value={newService.basePrice}
                    onChange={(e) => setNewService(p => ({ ...p, basePrice: e.target.value }))}
                    placeholder="250"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-1">Pe Oră (RON)</label>
                  <input
                    type="number"
                    value={newService.perHour}
                    onChange={(e) => setNewService(p => ({ ...p, perHour: e.target.value }))}
                    placeholder="150"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-1">Durată</label>
                  <input
                    type="text"
                    value={newService.duration}
                    onChange={(e) => setNewService(p => ({ ...p, duration: e.target.value }))}
                    placeholder="2-3 ore"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1">Tag-uri</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {newService.tags.map((tag) => (
                    <span key={tag} className="flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 text-xs rounded-lg font-medium">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                    placeholder="Adaugă tag și apasă Enter..."
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <button onClick={addTag} className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition">
                    Adaugă
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setShowAddModal(false)}
                className="px-5 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition">
                Anulează
              </button>
              <button onClick={handleSave}
                disabled={!newService.title}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50">
                {editingService ? 'Salvează Modificările' : 'Adaugă Serviciu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Șterge Serviciul?</h3>
            <p className="text-sm text-gray-500 mb-6">Această acțiune este ireversibilă. Toate datele asociate vor fi pierdute.</p>
            <div className="flex items-center gap-3 justify-center">
              <button onClick={() => setDeleteConfirm(null)}
                className="px-5 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition">
                Anulează
              </button>
              <button onClick={() => handleDelete(deleteConfirm)}
                className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition">
                Șterge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}