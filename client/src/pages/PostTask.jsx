import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import logo from '../assets/Logo_pin.png'
import CityAutocomplete from '../components/CityAutocomplete'
import {
  ChevronLeft, ChevronRight, Camera, CheckCircle, X, DollarSign,
  Clock, MapPin, AlertTriangle, Zap, Phone, Mail,
  Tag, Image, Info, Users, Heart, Search, Star, Sparkles, Loader2, Calendar
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL ?? ''
import TaskPhoto from '../components/TaskPhoto'

const TIME_SLOTS = (() => {
  const slots = []
  for (let h = 7; h <= 21; h++) {
    for (let m = 0; m < 60; m += 30) {
      if (h === 21 && m > 0) break
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return slots
})()

const JUDETE = [
  'Alba','Arad','Argeș','Bacău','Bihor','Bistrița-Năsăud','Botoșani','Brăila',
  'Brașov','București','Buzău','Călărași','Caraș-Severin','Cluj','Constanța',
  'Covasna','Dâmbovița','Dolj','Galați','Giurgiu','Gorj','Harghita','Hunedoara',
  'Ialomița','Iași','Ilfov','Maramureș','Mehedinți','Mureș','Neamț','Olt',
  'Prahova','Sălaj','Satu Mare','Sibiu','Suceava','Teleorman','Timiș',
  'Tulcea','Vâlcea','Vaslui','Vrancea',
]

const suggestedKeywords = [
  'urgent', 'reparație', 'montaj', 'instalare', 'înlocuire',
  'curățare', 'verificare', 'întreținere', 'renovare', 'desfundare',
  'zugravit', 'parchet', 'gresie', 'faianță', 'robinet',
]

export default function PostTask() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [keywordInput, setKeywordInput] = useState('')
  const [photoPreviews, setPhotoPreviews] = useState([])
  const [dbCategories, setDbCategories] = useState([])
  const [favorites, setFavorites] = useState([])
  const [searchResults, setSearchResults] = useState([])
  const [handymanSearch, setHandymanSearch] = useState('')
  const [aiLoading,      setAiLoading]      = useState(false)
  const [aiError,        setAiError]        = useState(null)
  const [aiDone,         setAiDone]         = useState(false)
  const [aiAlsoDetected, setAiAlsoDetected] = useState([])
  const [budgetAiLoading, setBudgetAiLoading] = useState(false)
  const [budgetAiResult, setBudgetAiResult] = useState(null)
  const [budgetAiError, setBudgetAiError] = useState(null)
  const [clientContext, setClientContext] = useState('')

  const [form, setForm] = useState({
    category: '',
    customCategory: '',
    title: '',
    description: '',
    keywords: [],
    photos: [],
    urgency: 'normal',
    city: '',
    county: '',
    latitude: null,
    longitude: null,
    address: '',
    accessInstructions: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    contactMethod: 'phone',
    specialInstructions: '',
    budget: '',
    preferredDate: '',
    preferredTime: '',
    notifyFavorites: false,
    notifySpecific: false,
    proposedHandymen: [],
  })

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }
      setUser(user)
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setProfile(data)
        setForm(prev => ({
          ...prev,
          contactName: `${data.first_name} ${data.last_name}`,
          contactEmail: data.email,
          contactPhone: data.phone || '',
          city: data.city || '',
          county: data.county || '',
          latitude: null,
          longitude: null,
          address: data.address || '',
        }))
      }
      // Încarcă categoriile din DB
      const { data: catsData } = await supabase
        .from('categories')
        .select('id, name, icon, default_risk_level')
        .eq('is_active', true)
        .order('name')
      setDbCategories(catsData || [])

      // Încarcă favoriții
    const { data: favData } = await supabase
        .from('favorite_handymen')
        .select(`
          handyman_id,
          handyman:handyman_id (
            id, first_name, last_name, avatar_url, city,
            handyman_profiles!inner (rating_avg, specialties, is_available)
          )
        `)
        .eq('client_id', user.id)
      setFavorites(favData || [])
    }
    loadUser()
  }, [navigate])

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const addKeyword = (keyword) => {
    const cleaned = keyword.trim().toLowerCase()
    if (cleaned && !form.keywords.includes(cleaned) && form.keywords.length < 10) {
      setForm(prev => ({ ...prev, keywords: [...prev.keywords, cleaned] }))
    }
    setKeywordInput('')
  }

  const removeKeyword = (keyword) => {
    setForm(prev => ({ ...prev, keywords: prev.keywords.filter(k => k !== keyword) }))
  }

  const handleKeywordKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addKeyword(keywordInput)
    }
  }

  const handlePhotoAdd = (e) => {
    const files = Array.from(e.target.files)
    if (photoPreviews.length + files.length > 5) {
      alert('Poți adăuga maximum 5 poze')
      return
    }
    const newPreviews = files.map(f => ({ file: f, url: URL.createObjectURL(f) }))
    setPhotoPreviews(prev => [...prev, ...newPreviews])
    setForm(prev => ({ ...prev, photos: [...prev.photos, ...files] }))
  }

  const removePhoto = (index) => {
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index))
    setForm(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }))
    setAiDone(false)
  }

  const URGENCY_MAP = { low: 'normal', normal: 'urgent', high: 'emergency' }

  const estimateBudgetWithAI = async () => {
    if (!form.title || !form.description) return
    setBudgetAiLoading(true)
    setBudgetAiResult(null)
    setBudgetAiError(null)
    try {
      const res  = await fetch(`${API_URL}/api/ai/estimate-budget`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title, description: form.description, category: form.category }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error || 'Eroare AI')
      setBudgetAiResult(json.data)
    } catch (e) {
      setBudgetAiError(e.message || 'Estimarea a eșuat. Încearcă din nou.')
    } finally {
      setBudgetAiLoading(false)
    }
  }

  const analyzeWithAI = async () => {
    if (form.photos.length === 0 && !clientContext.trim()) return
    setAiLoading(true)
    setAiError(null)
    setAiDone(false)
    try {
      const fd = new FormData()
      form.photos.forEach(f => fd.append('photos', f))
      fd.append('categories', JSON.stringify(dbCategories.map(c => ({ name: c.name }))))
      if (clientContext.trim()) fd.append('client_context', clientContext.trim())

      const res  = await fetch(`${API_URL}/api/ai/analyze-task`, { method: 'POST', body: fd })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error || 'Eroare AI')

      const { title, description, category, urgency, keywords, also_detected } = json.data
      setForm(prev => ({
        ...prev,
        title:       title       || prev.title,
        description: description || prev.description,
        category:    dbCategories.find(c => c.name === category)?.name || prev.category,
        urgency:     URGENCY_MAP[urgency] || prev.urgency,
        keywords:    Array.isArray(keywords)
          ? [...new Set([...prev.keywords, ...keywords])].slice(0, 10)
          : prev.keywords,
      }))
      setAiAlsoDetected(Array.isArray(also_detected) ? also_detected.filter(Boolean) : [])
      setAiDone(true)
    } catch (e) {
      setAiError(e.message || 'Analiza AI a eșuat. Încearcă din nou.')
    } finally {
      setAiLoading(false)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const categoryObj = dbCategories.find(c => c.name === form.category)
      const categoryId = categoryObj?.id ?? null
      if (!categoryId) {
        alert('Selectează o categorie înainte de a trimite task-ul.')
        setLoading(false)
        return
      }

      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .insert({
          client_id: user.id,
          title: form.title,
          description: form.description,
          category_id: categoryId,
          keywords: form.keywords,
          photos: [],
          status: 'pending',
          urgency: form.urgency,
          budget: form.budget ? Number(form.budget) : null,
          address_city: form.city,
          address_county: form.county,
          service_address: form.address,
          latitude: form.latitude,
          longitude: form.longitude,
          access_instructions: form.accessInstructions || null,
          contact_name: form.contactName,
          contact_email: form.contactEmail,
          contact_phone: form.contactPhone,
          contact_method: form.contactMethod,
          special_instructions: form.specialInstructions || null,
          scheduled_date: form.preferredDate || null,
          scheduled_time: form.preferredTime || null,
          is_public: true,
          proposed_to: form.proposedHandymen,
        })
        .select()
        .single()

      if (taskError) {
        console.error('Eroare:', taskError)
        alert('Eroare: ' + taskError.message)
        setLoading(false)
        return
      }

      // Upload photos to Supabase Storage
      if (form.photos.length > 0) {
        const uploadedUrls = []
        for (const file of form.photos) {
          const ext = file.name.split('.').pop()
          const path = `${user.id}/${taskData.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
          const { error: upErr } = await supabase.storage
            .from('task-photos')
            .upload(path, file, { contentType: file.type })
          if (!upErr) {
            const { data: urlData } = supabase.storage.from('task-photos').getPublicUrl(path)
            uploadedUrls.push(urlData.publicUrl)
          }
        }
        if (uploadedUrls.length > 0) {
          await supabase.from('tasks').update({ photos: uploadedUrls }).eq('id', taskData.id)
        }
      }

      // Trimite notificări handymanilor propuși
      const allProposed = [
        ...(form.notifyFavorites ? favorites.map(f => f.handyman_id ?? f.id ?? f) : []),
        ...form.proposedHandymen,
      ]
      const uniqueProposed = [...new Set(allProposed.filter(Boolean))]
      if (uniqueProposed.length > 0) {
        const clientName = profile
          ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Un client'
          : 'Un client'
        await supabase.from('notifications').insert(
          uniqueProposed.map(handymanId => ({
            user_id: handymanId,
            type: 'task_proposed',
            title: 'Task propus ție',
            body: `${clientName} ți-a propus task-ul „${taskData.title}". Intră și acceptă/negociază!`,
            data: { task_id: taskData.id, redirect: '/handyman/jobs?tab=proposed' },
          }))
        )
      }

      setLoading(false)
      setShowSuccess(true)

    } catch (err) {
      console.error('Eroare:', err)
      alert('A apărut o eroare.')
      setLoading(false)
    }
  }

  const searchHandyman = async (query) => {
  setHandymanSearch(query)
  if (query.length < 2) { setSearchResults([]); return }

  const { data } = await supabase
    .from('handyman_full_profile')
    .select('*')
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
    .limit(5)

  setSearchResults(data || [])
}

const toggleHandyman = (id) => {
  setForm(prev => ({
    ...prev,
    proposedHandymen: prev.proposedHandymen.includes(id)
      ? prev.proposedHandymen.filter(h => h !== id)
      : [...prev.proposedHandymen, id]
  }))
}

  const totalSteps = 4
  const progress = (step / totalSteps) * 100

  const titles = {
    1: { title: 'Descrie Taskul', subtitle: 'Spune-ne ce lucrare ai nevoie să fie făcută' },
    2: { title: 'Locație & Urgență', subtitle: 'Unde și cât de urgent trebuie rezolvat?' },
    3: { title: 'Informații de Contact', subtitle: 'Cum te pot contacta handymanii interesați?' },
    4: { title: 'Trimite Taskul', subtitle: 'Alege cui vrei să trimiți cererea ta' },
  }

  const canProceedStep1 = form.category && form.title && form.description
  const canProceedStep2 = form.city && form.county && form.address && form.preferredDate
  const canProceedStep3 = form.contactName && form.contactEmail && form.contactPhone
  const canProceedStep4 = form.sendOption === 'all' || form.proposedHandymen.length > 0

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <img src={logo} alt="HandyConnect" className="w-14 h-14" />
          <span className="text-2xl font-bold text-blue-600">HandyConnect</span>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">{titles[step].title}</h1>
          <p className="text-gray-500 mt-2">{titles[step].subtitle}</p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>Postează un task</span>
            <span>Pas {step} din {totalSteps}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

          {/* STEP 1: Task Details */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Category */}
              <div>
                <h3 className="font-bold text-gray-800 mb-3">Selectează categoria <span className="text-red-500">*</span></h3>
                <div className="grid grid-cols-2 gap-2">
                  {dbCategories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => update('category', cat.name)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-left text-sm transition-all
                        ${form.category === cat.name
                          ? 'border-blue-600 bg-blue-50 text-blue-600 font-medium'
                          : 'border-gray-200 text-gray-700 hover:border-blue-300'
                        }
                      `}
                    >
                      {cat.icon && <span className="text-base leading-none flex-shrink-0">{cat.icon}</span>}
                      <span className="flex-1">{cat.name}</span>
                      {form.category === cat.name && (
                        <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                          <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                <p className="mt-3 text-xs text-gray-400 text-center">
                  Nu găsești categoria potrivită? Alege <strong className="text-gray-500">Reparații generale</strong> sau <strong className="text-gray-500">Construcții</strong>.
                </p>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">Titlu task *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                  placeholder="Ex: Reparație robinet bucătărie, Montaj lustră dormitor..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">Descriere detaliată *</label>
                <textarea
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  placeholder="Descrie problema în detaliu: ce trebuie reparat/instalat, dimensiuni, materiale necesare, orice informații utile pentru handyman..."
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">{form.description.length}/500 caractere</p>
              </div>

              {/* Keywords */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1">Cuvinte cheie</label>
                <p className="text-xs text-gray-500 mb-3">Adaugă cuvinte cheie pentru a ajuta handymanii să găsească taskul tău mai ușor</p>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {form.keywords.map((kw) => (
                    <span key={kw} className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-lg font-medium">
                      {kw}
                      <button onClick={() => removeKeyword(kw)} className="hover:text-red-500 transition">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="relative">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={handleKeywordKeyDown}
                    placeholder="Scrie un cuvânt cheie și apasă Enter..."
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {form.keywords.length < 10 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-400 mb-2">Sugestii:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestedKeywords
                        .filter(kw => !form.keywords.includes(kw))
                        .slice(0, 8)
                        .map((kw) => (
                          <button
                            key={kw}
                            onClick={() => addKeyword(kw)}
                            className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-blue-100 hover:text-blue-600 transition"
                          >
                            + {kw}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-2">{form.keywords.length}/10 cuvinte cheie</p>
              </div>

              {/* Photos + AI context */}
              <div className="space-y-4">
                {/* AI tip banner */}
                <div className="flex items-start gap-2.5 p-3 bg-purple-50 border border-purple-100 rounded-xl">
                  <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-purple-700">Completare automată cu AI</p>
                    <p className="text-xs text-purple-600 mt-0.5">
                      Descrie problema cu cuvintele tale și/sau adaugă poze — AI-ul transformă totul
                      într-un anunț <strong>tehnic</strong>, clar pentru orice meșter.
                    </p>
                  </div>
                </div>

                {/* Client context textarea */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-1">
                    Descrie problema cu cuvintele tale <span className="font-normal text-gray-400">(opțional)</span>
                  </label>
                  <textarea
                    value={clientContext}
                    onChange={e => setClientContext(e.target.value)}
                    rows={3}
                    placeholder="Ex: Chiuveta din baie curge pe sub ea, nu știu de unde exact. Sau: Ușa de la intrare nu se mai închide bine, parcă s-a strâmbat tocul..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">Scrie simplu, ca și cum ai explica unui prieten. AI-ul se ocupă de termenii tehnici.</p>
                </div>

                {/* Photos */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-1">Adaugă poze <span className="font-normal text-gray-400">(opțional)</span></label>
                  <p className="text-xs text-gray-500 mb-3">Ajută handymanii să înțeleagă mai bine problema. Max. 5 poze.</p>

                <div className="flex flex-wrap gap-3">
                  {photoPreviews.map((photo, i) => (
                    <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200">
                      <img src={photo.url} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removePhoto(i)}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {photoPreviews.length < 5 && (
                    <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition">
                      <Camera className="w-6 h-6 text-gray-400" />
                      <span className="text-xs text-gray-400 mt-1">Adaugă</span>
                      <input type="file" accept="image/*" onChange={handlePhotoAdd} className="hidden" multiple />
                    </label>
                  )}
                </div>

                {/* Buton AI — activ dacă există poze sau text */}
                {(photoPreviews.length > 0 || clientContext.trim()) && (
                  <div className="mt-4 space-y-2">
                    <button
                      onClick={analyzeWithAI}
                      disabled={aiLoading}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all
                        bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700
                        disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                    >
                      {aiLoading
                        ? <><Loader2 className="w-4 h-4 animate-spin"/> Generez cu AI…</>
                        : <><Sparkles className="w-4 h-4"/> Generează titlu și descriere cu AI</>
                      }
                    </button>

                    {aiDone && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700 font-medium">
                          <CheckCircle className="w-4 h-4 flex-shrink-0"/>
                          Formularul a fost completat automat. Verifică și ajustează dacă e necesar.
                        </div>

                        {aiAlsoDetected.length > 0 && (
                          <div className="px-3 py-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                            <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5"/>
                              AI-ul a mai detectat în imagine:
                            </p>
                            <div className="flex flex-col gap-1.5">
                              {aiAlsoDetected.map((problem, i) => (
                                <div key={i} className="flex items-start justify-between gap-2 bg-white rounded-lg px-3 py-2 border border-amber-100">
                                  <span className="text-xs text-amber-900 flex-1">{problem}</span>
                                  <button
                                    onClick={() => {
                                      setForm(prev => ({
                                        ...prev,
                                        description: prev.description
                                          ? `${prev.description}\n\nProblemă adițională observată: ${problem}`
                                          : `Problemă adițională observată: ${problem}`
                                      }))
                                      setAiAlsoDetected(prev => prev.filter((_, j) => j !== i))
                                    }}
                                    className="text-xs font-semibold text-amber-700 hover:text-amber-900 whitespace-nowrap border border-amber-200 rounded-md px-2 py-0.5 hover:bg-amber-100 transition"
                                  >
                                    + Adaugă
                                  </button>
                                </div>
                              ))}
                            </div>
                            <p className="text-[10px] text-amber-600 italic">
                              Poți adăuga aceste observații la descriere sau le poți ignora.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {aiError && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0"/>
                        {aiError}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          )}

          {/* STEP 2: Location & Urgency */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Urgency */}
              <div>
                <h3 className="font-bold text-gray-800 mb-3">Nivel de urgență</h3>
                <div className="space-y-2">
                  {[
                    { value: 'normal', icon: Clock, label: 'Normal', desc: 'Programare standard, fără grabă', color: '' },
                    { value: 'urgent', icon: Zap, label: 'Urgență medie', desc: 'Finalizare necesară în 24-48 ore', color: 'text-yellow-600' },
                    { value: 'emergency', icon: AlertTriangle, label: 'Urgență critică', desc: 'Atenție imediată necesară', color: 'text-red-600' },
                  ].map((level) => (
                    <button
                      key={level.value}
                      onClick={() => update('urgency', level.value)}
                      className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all
                        ${form.urgency === level.value ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}
                      `}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
                        ${form.urgency === level.value ? 'border-blue-600' : 'border-gray-300'}
                      `}>
                        {form.urgency === level.value && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />}
                      </div>
                      <level.icon className={`w-5 h-5 ${level.color || 'text-gray-400'}`} />
                      <div>
                        <p className={`font-medium ${form.urgency === level.value ? 'text-blue-600' : 'text-gray-800'}`}>{level.label}</p>
                        <p className="text-xs text-gray-500">{level.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">Buget estimat (opțional)</label>
                <p className="text-xs text-gray-500 mb-3">Indică suma maximă pe care ești dispus să o plătești. Handymanii pot face oferte sub sau la nivelul bugetului tău.</p>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    min="0"
                    value={form.budget}
                    onChange={(e) => update('budget', e.target.value)}
                    placeholder="Ex: 500"
                    className="w-full pl-11 pr-16 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">RON</span>
                </div>

                {/* Buton estimare AI */}
                {form.title && form.description && (
                  <div className="mt-3 space-y-3">
                    <button
                      onClick={estimateBudgetWithAI}
                      disabled={budgetAiLoading}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all
                        border-2 border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100
                        disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {budgetAiLoading
                        ? <><Loader2 className="w-4 h-4 animate-spin"/> Calculez prețul…</>
                        : <><Sparkles className="w-4 h-4"/> Estimează bugetul cu AI</>
                      }
                    </button>

                    {budgetAiResult && (
                      <div className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-purple-700 uppercase tracking-wide">Estimare AI</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            budgetAiResult.confidence === 'high'   ? 'bg-green-100 text-green-700' :
                            budgetAiResult.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {budgetAiResult.confidence === 'high' ? 'Precizie ridicată' :
                             budgetAiResult.confidence === 'medium' ? 'Precizie medie' : 'Estimare generală'}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-white rounded-lg p-2 border border-purple-100">
                            <p className="text-xs text-gray-400">Minim</p>
                            <p className="font-bold text-gray-800">{budgetAiResult.min_budget} RON</p>
                          </div>
                          <div className="bg-purple-600 rounded-lg p-2 text-white">
                            <p className="text-xs opacity-80">Recomandat</p>
                            <p className="font-bold">{budgetAiResult.recommended} RON</p>
                          </div>
                          <div className="bg-white rounded-lg p-2 border border-purple-100">
                            <p className="text-xs text-gray-400">Maxim</p>
                            <p className="font-bold text-gray-800">{budgetAiResult.max_budget} RON</p>
                          </div>
                        </div>

                        {budgetAiResult.reasoning && (
                          <p className="text-xs text-gray-600 leading-relaxed">{budgetAiResult.reasoning}</p>
                        )}

                        <button
                          onClick={() => update('budget', budgetAiResult.recommended)}
                          className="w-full py-2 text-xs font-semibold text-purple-700 bg-white border border-purple-200 rounded-lg hover:bg-purple-50 transition"
                        >
                          Aplică valoarea recomandată ({budgetAiResult.recommended} RON)
                        </button>
                      </div>
                    )}

                    {budgetAiError && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0"/>
                        {budgetAiError}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Localitate + Județ */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">Localitate *</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={async (e) => {
                      const cityName = e.target.value
                      update('city', cityName)
                      // Încearcă lookup coordonate după ce userul termină de scris
                      if (cityName.length >= 3 && form.county) {
                        const { data } = await supabase
                          .from('romanian_cities')
                          .select('latitude, longitude')
                          .ilike('name', cityName)
                          .eq('county', form.county)
                          .maybeSingle()
                        setForm(prev => ({
                          ...prev,
                          latitude: data?.latitude ?? null,
                          longitude: data?.longitude ?? null,
                        }))
                      }
                    }}
                    placeholder="Ex: Timișoara, Moșnița, Lugoj"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">Județ *</label>
                  <select
                    value={form.county}
                    onChange={async (e) => {
                      const county = e.target.value
                      setForm(prev => ({ ...prev, county, latitude: null, longitude: null }))
                      // Re-lookup coordonate cu noul județ
                      if (form.city.length >= 3 && county) {
                        const { data } = await supabase
                          .from('romanian_cities')
                          .select('latitude, longitude')
                          .ilike('name', form.city)
                          .eq('county', county)
                          .maybeSingle()
                        if (data) setForm(prev => ({ ...prev, county, latitude: data.latitude, longitude: data.longitude }))
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Selectează județul</option>
                    {JUDETE.map(j => <option key={j} value={j}>{j}</option>)}
                  </select>
                </div>
              </div>
              {form.city && form.county && !form.latitude && (
                <p className="text-xs text-amber-600 flex items-center gap-1 -mt-1">
                  <Info className="w-3 h-3" /> Localitate negăsită în lista principală — vei fi localizat aproximativ în {form.county}
                </p>
              )}

              {/* Address */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">Adresa lucrării *</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => update('address', e.target.value)}
                    placeholder="Introdu adresa unde se va efectua lucrarea"
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Access Instructions */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">Instrucțiuni de acces (opțional)</label>
                <textarea
                  value={form.accessInstructions}
                  onChange={(e) => update('accessInstructions', e.target.value)}
                  placeholder="Cum ar trebui să acceseze proprietatea? (ex: ușa din față, cod poartă, etaj, etc.)"
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Date & Time preference */}
              <div>
                <h3 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  Când ai nevoie? *
                </h3>
                <p className="text-xs text-gray-500 mb-3">Handymanii vor vedea data preferată și îți vor confirma disponibilitatea.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Data preferată *</label>
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={form.preferredDate}
                      onChange={(e) => update('preferredDate', e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Ora preferată</label>
                    <select
                      value={form.preferredTime}
                      onChange={(e) => update('preferredTime', e.target.value)}
                      disabled={!form.preferredDate}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-50 disabled:text-gray-400 bg-white"
                    >
                      <option value="">— oră —</option>
                      {TIME_SLOTS.filter(t => {
                        if (form.preferredDate !== new Date().toISOString().split('T')[0]) return true
                        const [h, m] = t.split(':').map(Number)
                        const now = new Date()
                        return h * 60 + m > now.getHours() * 60 + now.getMinutes()
                      }).map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Contact Information */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">Nume complet *</label>
                  <input
                    type="text"
                    value={form.contactName}
                    onChange={(e) => update('contactName', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">Email *</label>
                  <input
                    type="email"
                    value={form.contactEmail}
                    onChange={(e) => update('contactEmail', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">Telefon *</label>
                  <input
                    type="tel"
                    value={form.contactPhone}
                    onChange={(e) => update('contactPhone', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">Metoda preferată</label>
                  <select
                    value={form.contactMethod}
                    onChange={(e) => update('contactMethod', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="phone">Apel telefonic</option>
                    <option value="sms">SMS</option>
                    <option value="email">Email</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">Instrucțiuni speciale (opțional)</label>
                <textarea
                  value={form.specialInstructions}
                  onChange={(e) => update('specialInstructions', e.target.value)}
                  placeholder="Alte informații de care handymanul ar trebui să țină cont..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Summary preview */}
              <div className="bg-gray-50 rounded-xl p-5">
                <h4 className="font-bold text-gray-800 mb-3">Rezumat task</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Categorie:</span>
                    <span className="font-medium">{form.category === 'Altele' ? form.customCategory || 'Altele' : form.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Titlu:</span>
                    <span className="font-medium text-right max-w-[200px] truncate">{form.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Urgență:</span>
                    <span className={`font-medium ${form.urgency === 'emergency' ? 'text-red-600' : form.urgency === 'urgent' ? 'text-yellow-600' : 'text-green-600'}`}>
                      {form.urgency === 'normal' ? 'Normal' : form.urgency === 'urgent' ? 'Urgență medie' : 'Urgență critică'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Locație:</span>
                    <span className="font-medium text-right max-w-[200px] truncate">
                      {form.city && form.county ? `${form.city}, ${form.county}` : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Adresă:</span>
                    <span className="font-medium text-right max-w-[200px] truncate">{form.address}</span>
                  </div>
                  {form.budget && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Buget:</span>
                      <span className="font-medium">{Number(form.budget).toLocaleString('ro-RO')} RON</span>
                    </div>
                  )}
                  {form.preferredDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Data dorită:</span>
                      <span className="font-medium text-blue-600">
                        {new Date(form.preferredDate).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })}
                        {form.preferredTime && ` la ${form.preferredTime}`}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Poze:</span>
                    <span className="font-medium">{photoPreviews.length} adăugate</span>
                  </div>
                  {form.keywords.length > 0 && (
                    <div className="pt-2 border-t border-gray-200">
                      <span className="text-gray-500 text-xs">Cuvinte cheie:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {form.keywords.map(kw => (
                          <span key={kw} className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-md">{kw}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Send Options */}
          {step === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-gray-800 mb-2">Cum vrei să trimiți taskul?</h3>
              <p className="text-sm text-gray-500 mb-4">
                Taskul va fi vizibil pentru toți handymanii. Opțional, poți notifica și handymani specifici.
              </p>

              {/* Opțiunea de notificare */}
              <div className="space-y-2 mb-6">
                <button
                  onClick={() => update('notifyFavorites', !form.notifyFavorites)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all
                    ${form.notifyFavorites ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}
                  `}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center
                    ${form.notifyFavorites ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}
                  `}>
                    {form.notifyFavorites && <CheckCircle className="w-3 h-3 text-white" />}
                  </div>
                  <Heart className={`w-5 h-5 ${form.notifyFavorites ? 'text-blue-600' : 'text-gray-400'}`} />
                  <div>
                    <p className={`font-medium ${form.notifyFavorites ? 'text-blue-600' : 'text-gray-800'}`}>
                      Notifică handymanii mei favoriți
                    </p>
                    <p className="text-xs text-gray-500">
                      {favorites.length > 0
                        ? `${favorites.length} handymani favoriți vor primi o notificare prioritară`
                        : 'Nu ai handymani favoriți încă'
                      }
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => update('notifySpecific', !form.notifySpecific)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all
                    ${form.notifySpecific ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}
                  `}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center
                    ${form.notifySpecific ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}
                  `}>
                    {form.notifySpecific && <CheckCircle className="w-3 h-3 text-white" />}
                  </div>
                  <Search className={`w-5 h-5 ${form.notifySpecific ? 'text-blue-600' : 'text-gray-400'}`} />
                  <div>
                    <p className={`font-medium ${form.notifySpecific ? 'text-blue-600' : 'text-gray-800'}`}>
                      Caută și adaugă handymani specifici
                    </p>
                    <p className="text-xs text-gray-500">Caută după nume și adaugă-i la notificări</p>
                  </div>
                </button>
              </div>

              {/* Favoriți - selectare */}
              {form.notifyFavorites && favorites.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-gray-800 mb-2">
                    Selectează din favoriți ({form.proposedHandymen.length} selectați)
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {favorites.map((fav) => {
                      const h = fav.handyman
                      const hp = h?.handyman_profiles?.[0]
                      const isSelected = form.proposedHandymen.includes(fav.handyman_id)
                      return (
                        <button
                          key={fav.handyman_id}
                          onClick={() => toggleHandyman(fav.handyman_id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all
                            ${isSelected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}
                          `}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0
                            ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}
                          `}>
                            {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                          </div>
                          {h?.avatar_url ? (
                            <img src={h.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                              {h?.first_name?.[0]}{h?.last_name?.[0]}
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">{h?.first_name} {h?.last_name}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              {h?.city && <span>{h.city}</span>}
                              {hp?.rating_avg > 0 && (
                                <span className="flex items-center gap-0.5">
                                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> {hp.rating_avg}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Căutare handyman */}
              {form.notifySpecific && (
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-gray-800 mb-2">Caută handyman</h4>
                  <div className="relative mb-3">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={handymanSearch}
                      onChange={(e) => searchHandyman(e.target.value)}
                      placeholder="Caută după nume..."
                      className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {searchResults.length > 0 && (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {searchResults.map((h) => {
                        const isSelected = form.proposedHandymen.includes(h.id)
                        return (
                          <button
                            key={h.id}
                            onClick={() => toggleHandyman(h.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all
                              ${isSelected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}
                            `}
                          >
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0
                              ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}
                            `}>
                              {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                            </div>
                            {h.avatar_url ? (
                              <img src={h.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                                {h.first_name?.[0]}{h.last_name?.[0]}
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="font-medium text-gray-800">{h.first_name} {h.last_name}</p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                {h.primary_city && <span>{h.primary_city}</span>}
                                {h.rating_avg > 0 && (
                                  <span className="flex items-center gap-0.5">
                                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> {h.rating_avg}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                  {handymanSearch.length >= 2 && searchResults.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">Niciun handyman găsit</p>
                  )}
                </div>
              )}

              {/* Info box */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-1">Cum funcționează:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• Taskul va fi publicat și vizibil pentru toți handymanii</li>
                      <li>• Handymanii interesați îți vor trimite oferte cu preț și disponibilitate</li>
                      {form.proposedHandymen.length > 0 && (
                        <li>• {form.proposedHandymen.length} handyman{form.proposedHandymen.length > 1 ? 'i' : ''} vor primi notificare prioritară</li>
                      )}
                      <li>• Tu alegi oferta care ți se potrivește cel mai bine</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1 px-5 py-2.5 border border-gray-200 rounded-lg text-gray-600 font-medium hover:bg-gray-50 transition"
            >
              <ChevronLeft className="w-4 h-4" /> Înapoi
            </button>
          ) : (
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1 px-5 py-2.5 border border-gray-200 rounded-lg text-gray-600 font-medium hover:bg-gray-50 transition"
            >
              <ChevronLeft className="w-4 h-4" /> Anulează
            </button>
          )}

          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={(step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2)}
              className="flex items-center gap-1 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continuă <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading || !canProceedStep3}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Se postează...' : 'Postează Taskul'}
            </button>
          )}
        </div>
      </div>

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Task postat cu succes!</h2>
            <p className="text-gray-500 text-sm mb-6">
              Anunțul tău a fost publicat! Handymanii din zona ta vor putea vedea taskul și
              te vor contacta cu oferte. Vei primi notificări când cineva este interesat.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-6 py-2.5 border border-gray-200 rounded-lg font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                Dashboard
              </button>
              <button
                onClick={() => {
                  setShowSuccess(false)
                  setStep(1)
                  setForm({
                    category: '', customCategory: '', title: '', description: '',
                    keywords: [], photos: [], urgency: 'normal',
                    city: '', county: '', latitude: null, longitude: null,
                    address: '', accessInstructions: '',
                    contactName: profile ? `${profile.first_name} ${profile.last_name}` : '',
                    contactEmail: profile?.email || '',
                    contactPhone: profile?.phone || '',
                    contactMethod: 'phone', specialInstructions: '',
                    budget: '', preferredDate: '', preferredTime: '',
                    notifyFavorites: false, notifySpecific: false, proposedHandymen: [],
                  })
                  setPhotoPreviews([])
                  setBudgetAiResult(null)
                  setBudgetAiError(null)
                  setAiDone(false)
                  setAiAlsoDetected([])
                  setKeywordInput('')
                }}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
              >
                Postează alt task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}