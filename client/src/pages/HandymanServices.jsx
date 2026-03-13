import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import HandymanNavbar from '../components/handyman-dashboard/HandymanNavbar'
import HandymanServiceModal from '../components/handyman-services/HandymanServiceModal'
import {
  Plus, Edit2, Trash2, Star, Briefcase, DollarSign,
  Clock, Settings, BarChart3, X, CheckCircle, Loader2,
  ToggleRight, ToggleLeft, Flame, Tag, ChevronRight, ImagePlus
} from 'lucide-react'

const emptyService = {
  title: '', description: '', base_price: '', price_per_hour: '',
  estimated_duration: '', keywords: [], is_available: true,
}

export default function HandymanServices() {
  const [tab,          setTab]          = useState('services')
  const [services,     setServices]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [handymanId,   setHandymanId]   = useState(null)
  const [categories,   setCategories]   = useState([])
  const [detailId,     setDetailId]     = useState(null)   // modal detail
  const [showAddModal, setShowAddModal] = useState(false)
  const [newService,   setNewService]   = useState({ ...emptyService })
  const [tagInput,     setTagInput]     = useState('')
  const [adding,       setAdding]       = useState(false)
  const [deleteConfirm,setDeleteConfirm]= useState(null)
  const [deleting,     setDeleting]     = useState(false)
  const [pendingPhotos,setPendingPhotos]= useState([])   // File[] înainte de insert
  const [uploadingPhoto,setUploadingPhoto] = useState(false)

  // ── load ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setHandymanId(user.id)

      const [{ data: svcData }, { data: catsData }] = await Promise.all([
        supabase.from('handyman_services')
          .select('*, categories(id, name, icon)')
          .eq('handyman_id', user.id)
          .order('created_at', { ascending: false }),
        supabase.from('categories').select('id, name, icon').eq('is_active', true).order('name'),
      ])
      setServices(svcData ?? [])
      setCategories(catsData ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const reload = async () => {
    if (!handymanId) return
    const { data } = await supabase.from('handyman_services')
      .select('*, categories(id, name, icon)')
      .eq('handyman_id', handymanId)
      .order('created_at', { ascending: false })
    setServices(data ?? [])
  }

  // ── add service ─────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!newService.title || !handymanId) return
    setAdding(true)

    // 1. Insert serviciul și obținem ID-ul
    const { data: inserted, error } = await supabase
      .from('handyman_services')
      .insert({
        handyman_id:        handymanId,
        title:              newService.title,
        description:        newService.description || null,
        base_price:         newService.base_price ? Number(newService.base_price) : null,
        price_per_hour:     newService.price_per_hour ? Number(newService.price_per_hour) : null,
        estimated_duration: newService.estimated_duration || null,
        keywords:           newService.keywords,
        is_available:       true,
        category_id:        newService.category_id || null,
      })
      .select('id')
      .single()

    if (error || !inserted) {
      setAdding(false)
      return
    }

    const newId = inserted.id

    // 2. Upload poze dacă există
    if (pendingPhotos.length > 0) {
      setUploadingPhoto(true)
      const uploadedUrls = []

      for (const file of pendingPhotos.slice(0, 5)) {
        const ext  = file.name.split('.').pop()
        const path = `${handymanId}/${newId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('service-photos')
          .upload(path, file, { upsert: false })
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('service-photos').getPublicUrl(path)
          if (urlData?.publicUrl) uploadedUrls.push(urlData.publicUrl)
        }
      }

      if (uploadedUrls.length) {
        await supabase.from('handyman_services')
          .update({ photos: uploadedUrls })
          .eq('id', newId)
      }
      setUploadingPhoto(false)
    }

    setAdding(false)
    setShowAddModal(false)
    setNewService({ ...emptyService })
    setTagInput('')
    setPendingPhotos([])
    reload()
  }

  // ── delete service ──────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    setDeleting(true)
    await supabase.from('handyman_services').delete().eq('id', id)
    setDeleteConfirm(null)
    setDeleting(false)
    setServices(prev => prev.filter(s => s.id !== id))
  }

  // ── toggle available ────────────────────────────────────────────────────────
  const handleToggle = async (svc) => {
    const newVal = !svc.is_available
    await supabase.from('handyman_services').update({ is_available: newVal }).eq('id', svc.id)
    setServices(prev => prev.map(s => s.id === svc.id ? { ...s, is_available: newVal } : s))
  }

  // ── tag helpers ─────────────────────────────────────────────────────────────
  const addTag = () => {
    const t = tagInput.trim()
    if (t && !newService.keywords.includes(t) && newService.keywords.length < 8) {
      setNewService(p => ({ ...p, keywords: [...p.keywords, t] }))
    }
    setTagInput('')
  }
  const removeTag = (tag) => setNewService(p => ({ ...p, keywords: p.keywords.filter(t => t !== tag) }))

  // ── stats ────────────────────────────────────────────────────────────────────
  const totalBookings = services.reduce((a, b) => a + (b.times_booked ?? 0), 0)
  const activeCount   = services.filter(s => s.is_available).length

  const tabs = [
    { id: 'services',  label: `Servicii (${services.length})` },
    { id: 'analytics', label: 'Analiză' },
    { id: 'settings',  label: 'Setări' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <HandymanNavbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Gestionare Servicii</h1>
            <p className="text-gray-500 mt-1">Gestionează serviciile tale, prețurile și disponibilitatea</p>
          </div>
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition">
            <Plus className="w-4 h-4" /> Adaugă Serviciu
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Servicii Active', value: activeCount,    icon: Settings,  color: 'bg-blue-100 text-blue-600' },
            { label: 'Total Servicii',  value: services.length, icon: Briefcase, color: 'bg-green-100 text-green-600' },
            { label: 'Total Rezervări', value: totalBookings,  icon: DollarSign, color: 'bg-purple-100 text-purple-600' },
          ].map(stat => (
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
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium text-center transition-all
                ${tab === t.id ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}
              `}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── SERVICES TAB ── */}
        {tab === 'services' && (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : services.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-16 text-center">
                <Settings className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-bold text-gray-800 mb-2">Niciun serviciu adăugat</h3>
                <p className="text-sm text-gray-500 mb-5">Adaugă serviciile pe care le oferi pentru a apărea în căutări</p>
                <button onClick={() => setShowAddModal(true)}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition">
                  Adaugă primul serviciu
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {services.map(service => (
                  <div key={service.id}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition cursor-pointer group"
                    onClick={() => setDetailId(service.id)}>

                    {/* header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-gray-800 truncate">{service.title}</h3>
                          {service.is_popular && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-100 text-orange-600 text-[10px] font-bold rounded-full flex-shrink-0">
                              <Flame className="w-2.5 h-2.5" /> Popular
                            </span>
                          )}
                        </div>
                        {service.categories && (
                          <p className="text-xs text-blue-500 font-medium mt-0.5">{service.categories.name}</p>
                        )}
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{service.description}</p>
                      </div>
                      <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                        {/* availability toggle */}
                        <button onClick={e => { e.stopPropagation(); handleToggle(service) }}
                          className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition flex-shrink-0 ${
                            service.is_available
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}>
                          {service.is_available ? 'Activ' : 'Inactiv'}
                        </button>
                        <button onClick={e => { e.stopPropagation(); setDeleteConfirm(service.id) }}
                          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* meta */}
                    <div className="flex items-center gap-4 text-xs text-gray-400 mb-3 mt-3">
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3 h-3" />{service.times_booked ?? 0} rezervări
                      </span>
                      {service.estimated_duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />{service.estimated_duration}
                        </span>
                      )}
                    </div>

                    {/* pricing */}
                    <div className="flex items-center gap-4 pb-3 border-b border-gray-100 mb-3">
                      {service.base_price && (
                        <div>
                          <p className="text-xs text-gray-400">Preț bază</p>
                          <p className="font-bold text-gray-800 text-sm">{Number(service.base_price).toLocaleString('ro-RO')} RON</p>
                        </div>
                      )}
                      {service.price_per_hour && (
                        <div>
                          <p className="text-xs text-gray-400">Pe oră</p>
                          <p className="font-bold text-gray-800 text-sm">{Number(service.price_per_hour).toLocaleString('ro-RO')} RON</p>
                        </div>
                      )}
                      <div className="ml-auto flex items-center gap-1 text-blue-500 text-xs font-medium group-hover:gap-2 transition-all">
                        Detalii <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* keywords */}
                    {Array.isArray(service.keywords) && service.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {service.keywords.slice(0, 4).map((kw, i) => (
                          <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-lg">{kw}</span>
                        ))}
                        {service.keywords.length > 4 && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-400 text-xs rounded-lg">+{service.keywords.length - 4}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── ANALYTICS TAB ── */}
        {tab === 'analytics' && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-800 mb-2">Analiză Servicii</h3>
              <p className="text-gray-500 mb-8">Vizualizări detaliate ale performanței vor fi disponibile în curând.</p>
              {services.slice(0, 3).length > 0 && (
                <div className="grid md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                  {services.slice(0, 3).map(s => (
                    <div key={s.id} className="bg-gray-50 rounded-xl p-4 text-left cursor-pointer hover:bg-blue-50 transition"
                      onClick={() => setDetailId(s.id)}>
                      <h4 className="font-bold text-gray-800 text-sm mb-2 truncate">{s.title}</h4>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Rezervări</span>
                          <span className="font-bold">{s.times_booked ?? 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Preț bază</span>
                          <span className="font-bold">{s.base_price ? `${Number(s.base_price).toLocaleString('ro-RO')} RON` : '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Status</span>
                          <span className={`font-bold ${s.is_available ? 'text-green-600' : 'text-gray-400'}`}>
                            {s.is_available ? 'Activ' : 'Inactiv'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SETTINGS TAB ── */}
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
                  <option>Sub 5 km</option><option>Sub 10 km</option>
                  <option>Sub 15 km</option><option>Sub 25 km</option><option>Sub 50 km</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">Notificări cereri noi</label>
                <div className="flex items-center gap-3">
                  <button className="w-12 h-7 bg-blue-600 rounded-full relative transition">
                    <div className="w-5 h-5 bg-white rounded-full absolute top-1 right-1 shadow transition" />
                  </button>
                  <span className="text-sm text-gray-500">Activat — Primești notificări pentru cereri noi</span>
                </div>
              </div>
              <button className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition">
                Salvează Setările
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── ADD SERVICE MODAL ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4"
          onClick={() => { setShowAddModal(false); setPendingPhotos([]) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90dvh] flex flex-col"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-800">Adaugă Serviciu Nou</h2>
              <button onClick={() => { setShowAddModal(false); setPendingPhotos([]) }}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1.5">Titlu *</label>
                <input type="text" value={newService.title}
                  onChange={e => setNewService(p => ({ ...p, title: e.target.value }))}
                  placeholder="Ex: Instalare Iluminat"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>

              {/* ── PHOTO PICKER ── */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1.5">
                  Poze serviciu
                  <span className="ml-1.5 text-xs font-normal text-gray-400">
                    ({pendingPhotos.length}/5 · opțional)
                  </span>
                </label>

                {/* previzualizare poze selectate */}
                {pendingPhotos.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {pendingPhotos.map((file, i) => (
                      <div key={i} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                        <img
                          src={URL.createObjectURL(file)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => setPendingPhotos(prev => prev.filter((_, j) => j !== i))}
                          className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        {i === 0 && (
                          <span className="absolute bottom-1 left-1 text-[9px] bg-black/50 text-white px-1 py-0.5 rounded-full font-medium">
                            Principală
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {pendingPhotos.length < 5 && (
                  <label className="flex items-center justify-center gap-2.5 w-full py-4 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition">
                    <ImagePlus className="w-5 h-5 text-gray-400" />
                    <div>
                      <span className="text-sm text-gray-600 font-medium">Alege poze</span>
                      <span className="text-xs text-gray-400 ml-1.5">PNG, JPG, WEBP</span>
                    </div>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      multiple
                      onChange={e => {
                        const files = Array.from(e.target.files ?? [])
                        setPendingPhotos(prev => [...prev, ...files].slice(0, 5))
                        e.target.value = ''
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1.5">Descriere</label>
                <textarea value={newService.description}
                  onChange={e => setNewService(p => ({ ...p, description: e.target.value }))}
                  rows={3} placeholder="Descrie serviciul..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1.5">Categorie</label>
                <select value={newService.category_id ?? ''}
                  onChange={e => setNewService(p => ({ ...p, category_id: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                  <option value="">Selectează categoria</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-1.5">Preț bază (RON)</label>
                  <input type="number" value={newService.base_price}
                    onChange={e => setNewService(p => ({ ...p, base_price: e.target.value }))}
                    placeholder="250"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-1.5">Pe oră (RON)</label>
                  <input type="number" value={newService.price_per_hour}
                    onChange={e => setNewService(p => ({ ...p, price_per_hour: e.target.value }))}
                    placeholder="150"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-1.5">Durată</label>
                  <input type="text" value={newService.estimated_duration}
                    onChange={e => setNewService(p => ({ ...p, estimated_duration: e.target.value }))}
                    placeholder="2-3 ore"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1.5">Cuvinte cheie</label>
                <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
                  {newService.keywords.map(tag => (
                    <span key={tag} className="flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 text-xs rounded-lg font-medium">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-red-500 transition">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() }}}
                    placeholder="Adaugă tag și apasă Enter…"
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  <button onClick={addTag}
                    className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition">
                    Adaugă
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 flex-shrink-0">
              <button onClick={() => { setShowAddModal(false); setPendingPhotos([]) }}
                className="px-5 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition text-sm">
                Anulează
              </button>
              <button onClick={handleAdd} disabled={!newService.title || adding || uploadingPhoto}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50 text-sm">
                {(adding || uploadingPhoto) && <Loader2 className="w-4 h-4 animate-spin" />}
                {uploadingPhoto ? 'Se încarcă pozele…' : adding ? 'Se adaugă…' : 'Adaugă Serviciu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4"
          onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center"
            onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Șterge Serviciul?</h3>
            <p className="text-sm text-gray-500 mb-6">Această acțiune este ireversibilă.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-5 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition text-sm">
                Anulează
              </button>
              <button onClick={() => handleDelete(deleteConfirm)} disabled={deleting}
                className="flex-1 px-5 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition disabled:opacity-50 text-sm">
                {deleting ? 'Se șterge…' : 'Șterge'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SERVICE DETAIL MODAL ── */}
      <HandymanServiceModal
        serviceId={detailId}
        onClose={() => setDetailId(null)}
        onUpdated={reload}
      />
    </div>
  )
}