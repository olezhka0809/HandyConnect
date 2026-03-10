import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import HandymanNavbar from '../components/handyman-dashboard/HandymanNavbar'
import CityAutocomplete from '../components/CityAutocomplete'
import { updateHandymanWorkZone } from '../utils/cityLookup'
import {
  User, Bell, Shield, Award, Star, MapPin, Wrench,
  Receipt, Palette, LogOut, ChevronRight, Camera, Edit2, X,
  CheckCircle, Plus, Trash2, Sun, Moon, Monitor,
  Mail, Phone, Lock, AlertTriangle, Clock, Upload, FileText,
  BadgeCheck, Info, Navigation,
  Download, Briefcase, TrendingUp, Wallet, ArrowDownRight, Search
} from 'lucide-react'

const sidebarItems = [
  { id: 'account', label: 'Datele Contului', icon: User },
  { id: 'skills', label: 'Skilluri & Certificări', icon: Award },
  { id: 'workzone', label: 'Zona de Lucru', icon: MapPin },
  { id: 'payments', label: 'Plăți & Venituri', icon: Wallet },
  { id: 'notifications', label: 'Notificări', icon: Bell },
  { id: 'security', label: 'Setări Siguranță', icon: Shield },
  { id: 'reviews', label: 'Recenziile Mele', icon: Star },
  { id: 'services', label: 'Serviciile Mele', icon: Briefcase },
  { id: 'billing', label: 'Date Facturare', icon: Receipt },
  { id: 'appearance', label: 'Aspect Interfață', icon: Palette },
]

const availableSkills = [
  { id: 'electrical', name: 'Instalații Electrice', category: 'Electricitate' },
  { id: 'plumbing', name: 'Instalații Sanitare', category: 'Sanitare' },
  { id: 'painting', name: 'Zugrăveli & Vopsitorie', category: 'Finisaje' },
  { id: 'tiling', name: 'Faianță & Gresie', category: 'Finisaje' },
  { id: 'flooring', name: 'Parchet & Podele', category: 'Finisaje' },
  { id: 'carpentry', name: 'Tâmplărie', category: 'Lemn' },
  { id: 'furniture', name: 'Montaj Mobilier', category: 'Lemn' },
  { id: 'hvac', name: 'Climatizare & Ventilație', category: 'HVAC' },
  { id: 'roofing', name: 'Acoperiș & Izolații', category: 'Construcții' },
  { id: 'masonry', name: 'Zidărie & Construcții', category: 'Construcții' },
  { id: 'drywall', name: 'Rigips & Tavan Fals', category: 'Finisaje' },
  { id: 'welding', name: 'Sudură & Confecții Metalice', category: 'Metal' },
  { id: 'locksmith', name: 'Lăcătușerie', category: 'Metal' },
  { id: 'appliance', name: 'Reparații Electrocasnice', category: 'Electricitate' },
  { id: 'landscaping', name: 'Grădinărit & Amenajări', category: 'Exterior' },
  { id: 'cleaning', name: 'Curățenie Profesională', category: 'Întreținere' },
  { id: 'pest', name: 'Dezinsecție & Deratizare', category: 'Întreținere' },
  { id: 'glass', name: 'Geamuri & Sticlărie', category: 'Finisaje' },
]

const mockPayments = [
  { id: 1, task: 'Instalare Iluminat Living', client: 'Maria Ionescu', amount: 350, fee: 35, net: 315, date: '2026-03-01', status: 'paid' },
  { id: 2, task: 'Reparație Robinet', client: 'Ion Popescu', amount: 150, fee: 15, net: 135, date: '2026-02-28', status: 'paid' },
  { id: 3, task: 'Zugrăveli Dormitor', client: 'Ana Vasile', amount: 800, fee: 80, net: 720, date: '2026-02-25', status: 'paid' },
  { id: 4, task: 'Montaj Priză', client: 'Elena Pop', amount: 120, fee: 12, net: 108, date: '2026-03-03', status: 'pending' },
  { id: 5, task: 'Reparație Ușă', client: 'Andrei Marin', amount: 200, fee: 20, net: 180, date: '2026-03-04', status: 'processing' },
]

const mockReviews = [
  { id: 1, client: 'Maria Ionescu', service: 'Instalare Iluminat', rating: 5, text: 'Excelent! Foarte profesionist și punctual.', date: '2026-02-15', reply: 'Mulțumesc, Maria! A fost o plăcere.' },
  { id: 2, client: 'Ion Popescu', service: 'Reparație Robinet', rating: 4, text: 'Treabă bună, rezolvat rapid.', date: '2026-01-20', reply: null },
  { id: 3, client: 'Ana Vasile', service: 'Zugrăveli', rating: 5, text: 'Impecabil! Recomand cu mare încredere.', date: '2026-01-05', reply: 'Mulțumesc pentru apreciere!' },
]

export default function HandymanPersonalProfile() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('account')
  const [profile, setProfile] = useState(null)
  const [handymanProfile, setHandymanProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [theme, setTheme] = useState('system')

  // Skills
  const [mySkills, setMySkills] = useState([])
  const [showAddSkill, setShowAddSkill] = useState(false)
  const [selectedSkill, setSelectedSkill] = useState(null)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [showDeleteSkill, setShowDeleteSkill] = useState(null)
  const [skillSearch, setSkillSearch] = useState('')

  // Work zone
  const [showZoneChange, setShowZoneChange] = useState(false)
  const [showConfirmZone, setShowConfirmZone] = useState(false)
  const [zoneForm, setZoneForm] = useState({ city: '', county: '', radius: 10, extended: 10 })

  // Payments
  const [paymentFilter, setPaymentFilter] = useState('all')

  // Notifications
  const [notifSettings, setNotifSettings] = useState({
    email_tasks: true, email_offers: true, email_messages: true, email_payments: true, email_reviews: true,
    push_tasks: true, push_offers: true, push_messages: true, push_payments: true,
    sms_tasks: false, sms_payments: true,
  })

  // Review reply
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyText, setReplyText] = useState('')

  // Billing
  const [billingForm, setBillingForm] = useState({ company_name: '', cui: '', address: '', iban: '', bank: '' })

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/login'); return }

    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(profileData)
    setEditForm(profileData || {})

    const { data: hp } = await supabase.from('handyman_profiles').select('*').eq('user_id', user.id).single()
    setHandymanProfile(hp)

    if (hp) {
      setZoneForm({ city: hp.primary_city || profileData?.city || '', county: hp.primary_county || profileData?.county || '', radius: hp.work_radius_km || 10, extended: hp.extended_radius_km || 10 })
      const skills = (hp.specialties || []).map((s, i) => ({ id: i, name: s, status: 'verified', verified_at: hp.created_at }))
      setMySkills(skills)
    }
    setLoading(false)
  }

  const handleSaveProfile = async () => {
    await supabase.from('profiles').update({ first_name: editForm.first_name, last_name: editForm.last_name, phone: editForm.phone, city: editForm.city, county: editForm.county }).eq('id', profile.id)
    await supabase.from('handyman_profiles').update({ bio: editForm.bio, experience_years: editForm.experience_years }).eq('user_id', profile.id)
    setProfile(prev => ({ ...prev, ...editForm }))
    setHandymanProfile(prev => ({ ...prev, bio: editForm.bio, experience_years: editForm.experience_years }))
    setEditing(false)
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const fileExt = file.name.split('.').pop()
    const fileName = `${profile.id}/avatar.${fileExt}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true })
    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName)
      await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', profile.id)
      setProfile(prev => ({ ...prev, avatar_url: urlData.publicUrl }))
    }
  }

  // Skills
  const handleAddSkillWithDoc = async () => {
    if (!selectedSkill) return
    const newSkill = { id: Date.now(), name: selectedSkill.name, status: 'pending_review', method: 'document', submitted_at: new Date().toISOString() }
    const updatedSkills = [...mySkills, newSkill]
    setMySkills(updatedSkills)
    await supabase.from('handyman_profiles').update({ specialties: updatedSkills.map(s => s.name) }).eq('user_id', profile.id)
    setShowAddSkill(false)
    setSelectedSkill(null)
  }

  const handleDeleteSkill = async (skillId) => {
    const updatedSkills = mySkills.filter(s => s.id !== skillId)
    setMySkills(updatedSkills)
    await supabase.from('handyman_profiles').update({ specialties: updatedSkills.map(s => s.name) }).eq('user_id', profile.id)
    setShowDeleteSkill(null)
  }

  const handleDocUpload = async (e) => {
    const file = e.target.files[0]
    if (!file || !selectedSkill) return
    setUploadingDoc(true)
    // Simulare upload — în producție Supabase Storage
    setTimeout(() => { setUploadingDoc(false); handleAddSkillWithDoc() }, 1500)
  }

  // Zone
  async function handleConfirmZoneChange() {
    let coords = await updateHandymanWorkZone(profile.id, zoneForm.city, zoneForm.county, zoneForm.radius, zoneForm.extended)
    if (!coords) {
      const { data: cityData } = await supabase.from('romanian_cities').select('name, county, latitude, longitude').ilike('name', zoneForm.city).limit(1).single()
      if (cityData) { coords = await updateHandymanWorkZone(profile.id, cityData.name, cityData.county, zoneForm.radius, zoneForm.extended) }
    }
    if (coords) {
      setHandymanProfile(prev => ({ ...prev, primary_city: zoneForm.city, primary_county: zoneForm.county, work_latitude: coords.latitude, work_longitude: coords.longitude, work_radius_km: zoneForm.radius, extended_radius_km: zoneForm.extended }))
      setShowConfirmZone(false)
      setShowZoneChange(false)
    } else { alert('Orașul nu a fost găsit. Încearcă din nou.') }
  }

  const toggleNotif = (key) => setNotifSettings(prev => ({ ...prev, [key]: !prev[key] }))
  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/login') }

  const getSkillBadge = (status) => {
    if (status === 'verified') return { label: 'Verificat', cls: 'bg-green-100 text-green-700', Icon: BadgeCheck }
    if (status === 'pending_review') return { label: 'În verificare', cls: 'bg-yellow-100 text-yellow-700', Icon: Clock }
    if (status === 'rejected') return { label: 'Respins', cls: 'bg-red-100 text-red-700', Icon: X }
    return { label: status, cls: 'bg-gray-100 text-gray-700', Icon: Clock }
  }

  const getPayBadge = (status) => {
    if (status === 'paid') return { label: 'Plătit', cls: 'bg-green-100 text-green-700' }
    if (status === 'pending') return { label: 'În așteptare', cls: 'bg-yellow-100 text-yellow-700' }
    if (status === 'processing') return { label: 'Se procesează', cls: 'bg-blue-100 text-blue-700' }
    return { label: status, cls: 'bg-gray-100 text-gray-600' }
  }

  const filteredPayments = paymentFilter === 'all' ? mockPayments : mockPayments.filter(p => p.status === paymentFilter)
  const totalEarnings = mockPayments.filter(p => p.status === 'paid').reduce((s, p) => s + p.net, 0)
  const pendingEarnings = mockPayments.filter(p => p.status !== 'paid').reduce((s, p) => s + p.net, 0)
  const totalFees = mockPayments.reduce((s, p) => s + p.fee, 0)
  const filteredAvailableSkills = availableSkills.filter(s => !mySkills.some(ms => ms.name === s.name) && (s.name.toLowerCase().includes(skillSearch.toLowerCase()) || s.category.toLowerCase().includes(skillSearch.toLowerCase())))

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <HandymanNavbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex gap-6">

          {/* Sidebar */}
          <div className="w-72 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-3">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover border-4 border-gray-100" />
                  ) : (
                    <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold border-4 border-gray-100">
                      {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                    </div>
                  )}
                  <label className="absolute bottom-0 right-0 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition">
                    <Camera className="w-3.5 h-3.5 text-white" />
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                  </label>
                </div>
                <h3 className="font-bold text-gray-800">{profile?.first_name} {profile?.last_name}</h3>
                <p className="text-sm text-gray-500">{profile?.email}</p>
                <div className="flex items-center gap-1 mt-1">
                  {handymanProfile?.rating_avg > 0 && (
                    <span className="flex items-center gap-1 text-sm"><Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /><span className="font-medium text-gray-700">{handymanProfile.rating_avg}</span></span>
                  )}
                  <span className="text-xs text-gray-400">• {handymanProfile?.total_jobs_completed || 0} lucrări</span>
                </div>
                <span className={`mt-2 px-3 py-0.5 text-xs rounded-full font-medium ${handymanProfile?.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {handymanProfile?.status === 'approved' ? 'Verificat' : 'În verificare'}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {sidebarItems.map((item) => (
                <button key={item.id} onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all border-b border-gray-50 last:border-0 ${activeSection === item.id ? 'bg-blue-50 text-blue-600 border-l-4 border-l-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>
                  <item.icon className="w-4 h-4" />
                  <span className="text-sm font-medium flex-1">{item.label}</span>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </button>
              ))}
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-500 hover:bg-red-50 transition">
                <LogOut className="w-4 h-4" /><span className="text-sm font-medium">Deconectare</span>
              </button>
            </div>
          </div>

          {/* Main */}
          <div className="flex-1">

            {/* DATELE CONTULUI */}
            {activeSection === 'account' && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                  <div><h2 className="text-lg font-bold text-gray-800">Datele Contului</h2><p className="text-sm text-gray-500">Informațiile tale de handyman</p></div>
                  {!editing ? (
                    <button onClick={() => { setEditing(true); setEditForm({ ...profile, bio: handymanProfile?.bio, experience_years: handymanProfile?.experience_years }) }}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"><Edit2 className="w-4 h-4" /> Editează</button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => setEditing(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Anulează</button>
                      <button onClick={handleSaveProfile} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"><CheckCircle className="w-4 h-4" /> Salvează</button>
                    </div>
                  )}
                </div>
                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Prenume</label>
                      {editing ? <input type="text" value={editForm.first_name || ''} onChange={(e) => setEditForm(p => ({ ...p, first_name: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" /> : <p className="text-gray-800 font-medium">{profile?.first_name || '-'}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Nume</label>
                      {editing ? <input type="text" value={editForm.last_name || ''} onChange={(e) => setEditForm(p => ({ ...p, last_name: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" /> : <p className="text-gray-800 font-medium">{profile?.last_name || '-'}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                    <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" /><p className="text-gray-800">{profile?.email}</p><span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">Verificat</span></div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Telefon</label>
                    {editing ? <input type="tel" value={editForm.phone || ''} onChange={(e) => setEditForm(p => ({ ...p, phone: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" /> : <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" /><p className="text-gray-800">{profile?.phone || 'Necompletat'}</p></div>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Bio / Descriere</label>
                    {editing ? <textarea value={editForm.bio || ''} onChange={(e) => setEditForm(p => ({ ...p, bio: e.target.value }))} rows={3} placeholder="Descrie experiența și serviciile tale..." className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" /> : <p className="text-gray-800">{handymanProfile?.bio || 'Nedefinit'}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Ani experiență</label>
                      {editing ? <input type="number" value={editForm.experience_years || ''} onChange={(e) => setEditForm(p => ({ ...p, experience_years: parseInt(e.target.value) || 0 }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" /> : <p className="text-gray-800">{handymanProfile?.experience_years || 0} ani</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Disponibilitate</label>
                      <p className="text-gray-800">{handymanProfile?.is_available ? <span className="text-green-600 font-medium">Disponibil</span> : <span className="text-red-500 font-medium">Indisponibil</span>}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SKILLURI & CERTIFICĂRI */}
            {activeSection === 'skills' && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                  <div><h2 className="text-lg font-bold text-gray-800">Skilluri & Certificări</h2><p className="text-sm text-gray-500">{mySkills.filter(s => s.status === 'verified').length} verificate din {mySkills.length} total</p></div>
                  <button onClick={() => { setShowAddSkill(true); setSelectedSkill(null); setSkillSearch('') }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"><Plus className="w-4 h-4" /> Adaugă Skill</button>
                </div>
                <div className="mx-6 mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-start gap-2">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-700">
                      <p className="font-medium mb-1">Cum funcționează verificarea:</p>
                      <p className="text-xs">Fiecare skill poate fi verificat prin <strong>încărcarea unui certificat</strong> (diplomă, atestat profesional). Skillurile verificate apar cu badge-ul ✅ în profilul tău public și primești taskuri prioritare.</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-3">
                  {mySkills.length > 0 ? mySkills.map((skill) => {
                    const b = getSkillBadge(skill.status)
                    return (
                      <div key={skill.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${skill.status === 'verified' ? 'bg-green-100' : 'bg-yellow-100'}`}>
                            <b.Icon className={`w-5 h-5 ${skill.status === 'verified' ? 'text-green-600' : 'text-yellow-600'}`} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{skill.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${b.cls}`}>{b.label}</span>
                              {skill.method === 'document' && <span className="text-xs text-gray-400">via certificat</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {skill.status === 'pending_review' && <span className="text-xs text-yellow-600">Se verifică documentul...</span>}
                          <button onClick={() => setShowDeleteSkill(skill.id)} className="w-8 h-8 rounded-lg hover:bg-red-100 flex items-center justify-center transition"><Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" /></button>
                        </div>
                      </div>
                    )
                  }) : (
                    <div className="text-center py-8"><Award className="w-10 h-10 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">Niciun skill adăugat</p><p className="text-xs text-gray-400 mt-1">Adaugă skilluri pentru a primi taskuri relevante</p></div>
                  )}
                </div>
              </div>
            )}

            {/* ZONA DE LUCRU */}
            {activeSection === 'workzone' && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                  <div><h2 className="text-lg font-bold text-gray-800">Zona de Lucru</h2><p className="text-sm text-gray-500">Setează unde ești disponibil</p></div>
                  <button onClick={() => setShowZoneChange(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"><Edit2 className="w-4 h-4" /> Modifică</button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-xl"><p className="text-xs text-gray-500 mb-1">Oraș principal</p><p className="font-bold text-gray-800 text-lg">{handymanProfile?.primary_city || 'Nesetat'}</p><p className="text-sm text-gray-500">{handymanProfile?.primary_county || ''}</p></div>
                    <div className="p-4 bg-gray-50 rounded-xl"><p className="text-xs text-gray-500 mb-1">Coordonate</p><p className="font-medium text-gray-800">{handymanProfile?.work_latitude ? `${handymanProfile.work_latitude}°, ${handymanProfile.work_longitude}°` : 'Nesetate'}</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                      <div className="flex items-center gap-2 mb-2"><div className="w-3 h-3 bg-green-500 rounded-full" /><p className="text-sm font-bold text-green-700">Zona principală</p></div>
                      <p className="text-2xl font-bold text-green-800">{handymanProfile?.work_radius_km || 10} km</p>
                      <p className="text-xs text-green-600 mt-1">Taskuri prioritare, fără cost deplasare</p>
                    </div>
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                      <div className="flex items-center gap-2 mb-2"><div className="w-3 h-3 bg-yellow-500 rounded-full" /><p className="text-sm font-bold text-yellow-700">Zona extinsă</p></div>
                      <p className="text-2xl font-bold text-yellow-800">{handymanProfile?.extended_radius_km || 10} km</p>
                      <p className="text-xs text-yellow-600 mt-1">Taskuri disponibile, cu cost deplasare</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PLĂȚI & VENITURI */}
            {activeSection === 'payments' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-2"><p className="text-sm text-gray-500">Venituri nete</p><div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center"><TrendingUp className="w-4 h-4 text-green-600" /></div></div>
                    <p className="text-2xl font-bold text-gray-800">{totalEarnings.toLocaleString('ro-RO')} RON</p><p className="text-xs text-green-600 mt-1">Luna aceasta</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-2"><p className="text-sm text-gray-500">În așteptare</p><div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center"><Clock className="w-4 h-4 text-yellow-600" /></div></div>
                    <p className="text-2xl font-bold text-gray-800">{pendingEarnings.toLocaleString('ro-RO')} RON</p><p className="text-xs text-yellow-600 mt-1">Se procesează</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-2"><p className="text-sm text-gray-500">Comision platformă</p><div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center"><ArrowDownRight className="w-4 h-4 text-red-500" /></div></div>
                    <p className="text-2xl font-bold text-gray-800">{totalFees.toLocaleString('ro-RO')} RON</p><p className="text-xs text-red-500 mt-1">10% din total</p>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800">Istoric Plăți</h2>
                    <div className="flex items-center gap-2">
                      <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"><option value="all">Toate</option><option value="paid">Plătite</option><option value="pending">În așteptare</option><option value="processing">Se procesează</option></select>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"><Download className="w-3.5 h-3.5" /> Export</button>
                    </div>
                  </div>
                  <div className="px-6 py-3 bg-gray-50 grid grid-cols-12 gap-4 text-xs font-bold text-gray-500 uppercase">
                    <div className="col-span-4">Lucrare</div><div className="col-span-2">Client</div><div className="col-span-1 text-right">Brut</div><div className="col-span-1 text-right">Comision</div><div className="col-span-1 text-right">Net</div><div className="col-span-2">Data</div><div className="col-span-1">Status</div>
                  </div>
                  {filteredPayments.map((p) => {
                    const b = getPayBadge(p.status)
                    return (
                      <div key={p.id} className="px-6 py-4 grid grid-cols-12 gap-4 items-center border-b border-gray-50 hover:bg-gray-50 transition">
                        <div className="col-span-4"><p className="font-medium text-gray-800 text-sm">{p.task}</p></div>
                        <div className="col-span-2"><p className="text-sm text-gray-600">{p.client}</p></div>
                        <div className="col-span-1 text-right"><p className="text-sm text-gray-800">{p.amount} RON</p></div>
                        <div className="col-span-1 text-right"><p className="text-sm text-red-500">-{p.fee} RON</p></div>
                        <div className="col-span-1 text-right"><p className="text-sm font-bold text-green-700">{p.net} RON</p></div>
                        <div className="col-span-2"><p className="text-sm text-gray-500">{new Date(p.date).toLocaleDateString('ro-RO')}</p></div>
                        <div className="col-span-1"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${b.cls}`}>{b.label}</span></div>
                      </div>
                    )
                  })}
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                  <div className="flex items-start gap-3"><Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" /><div><p className="text-sm font-bold text-blue-700 mb-1">Informații plăți</p><p className="text-xs text-blue-600">Plățile se procesează automat la 7 zile după finalizarea lucrării. Comisionul platformei este de 10%. Banii sunt virați în contul IBAN din „Date Facturare".</p></div></div>
                </div>
              </div>
            )}

            {/* NOTIFICĂRI */}
            {activeSection === 'notifications' && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="p-6 border-b border-gray-100"><h2 className="text-lg font-bold text-gray-800">Setări Notificări</h2><p className="text-sm text-gray-500">Alege cum vrei să fii notificat</p></div>
                <div className="p-6 space-y-6">
                  {[
                    { title: 'Email', items: [{ key: 'email_tasks', label: 'Taskuri noi în zona ta' }, { key: 'email_offers', label: 'Oferte acceptate/refuzate' }, { key: 'email_messages', label: 'Mesaje de la clienți' }, { key: 'email_payments', label: 'Plăți și venituri' }, { key: 'email_reviews', label: 'Recenzii noi' }] },
                    { title: 'Push', items: [{ key: 'push_tasks', label: 'Taskuri noi și urgente' }, { key: 'push_offers', label: 'Status oferte' }, { key: 'push_messages', label: 'Mesaje noi' }, { key: 'push_payments', label: 'Plăți procesate' }] },
                    { title: 'SMS', items: [{ key: 'sms_tasks', label: 'Taskuri de urgență' }, { key: 'sms_payments', label: 'Plăți importante' }] },
                  ].map((g) => (
                    <div key={g.title}><h3 className="font-bold text-gray-800 mb-3">{g.title}</h3><div className="space-y-3">{g.items.map((item) => (
                      <div key={item.key} className="flex items-center justify-between py-2"><span className="text-sm text-gray-600">{item.label}</span>
                        <button onClick={() => toggleNotif(item.key)} className={`w-11 h-6 rounded-full relative transition-colors ${notifSettings[item.key] ? 'bg-blue-600' : 'bg-gray-200'}`}><div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow transition-transform ${notifSettings[item.key] ? 'translate-x-5' : 'translate-x-0.5'}`} /></button>
                      </div>
                    ))}</div></div>
                  ))}
                </div>
              </div>
            )}

            {/* SETĂRI SIGURANȚĂ */}
            {activeSection === 'security' && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-1">Setări Siguranță</h2><p className="text-sm text-gray-500 mb-6">Gestionează securitatea contului</p>
                <div className="space-y-4">
                  {[
                    { icon: Lock, title: 'Schimbă Parola', desc: 'Ultima schimbare: acum 30 de zile', action: 'Schimbă', danger: false, badge: false },
                    { icon: Shield, title: 'Autentificare 2FA', desc: 'Securitate suplimentară', action: 'Dezactivat', danger: false, badge: true },
                    { icon: Monitor, title: 'Sesiuni Active', desc: '1 sesiune activă', action: 'Gestionează', danger: false, badge: false },
                    { icon: AlertTriangle, title: 'Șterge Contul', desc: 'Acțiune permanentă', action: 'Șterge', danger: true, badge: false },
                  ].map((item) => (
                    <div key={item.title} className={`flex items-center justify-between p-4 rounded-xl ${item.danger ? 'bg-red-50' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-3"><item.icon className={`w-5 h-5 ${item.danger ? 'text-red-400' : 'text-gray-400'}`} /><div><p className={`font-medium ${item.danger ? 'text-red-700' : 'text-gray-800'}`}>{item.title}</p><p className={`text-xs ${item.danger ? 'text-red-500' : 'text-gray-500'}`}>{item.desc}</p></div></div>
                      {item.badge ? <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">{item.action}</span> : <button className={`px-4 py-2 border rounded-lg text-sm font-medium transition ${item.danger ? 'border-red-200 text-red-600 hover:bg-red-100' : 'border-gray-200 text-gray-600 hover:bg-white'}`}>{item.action}</button>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* RECENZII */}
            {activeSection === 'reviews' && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="p-6 border-b border-gray-100"><h2 className="text-lg font-bold text-gray-800">Recenziile Mele</h2><p className="text-sm text-gray-500">Recenzii primite de la clienți</p></div>
                <div className="divide-y divide-gray-50">
                  {mockReviews.map((r) => (
                    <div key={r.id} className="p-5">
                      <div className="flex items-center justify-between mb-2">
                        <div><p className="font-bold text-gray-800">{r.service}</p><p className="text-sm text-gray-500">De la: {r.client}</p></div>
                        <div className="text-right"><div className="flex items-center gap-0.5">{[1,2,3,4,5].map(s => <Star key={s} className={`w-4 h-4 ${s <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />)}</div><p className="text-xs text-gray-400 mt-1">{new Date(r.date).toLocaleDateString('ro-RO')}</p></div>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{r.text}</p>
                      {r.reply ? (
                        <div className="bg-blue-50 rounded-xl p-3 ml-6"><p className="text-xs font-bold text-blue-700 mb-1">Răspunsul tău:</p><p className="text-sm text-blue-600">{r.reply}</p></div>
                      ) : replyingTo === r.id ? (
                        <div className="ml-6 space-y-2">
                          <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Scrie un răspuns..." rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                          <div className="flex gap-2"><button onClick={() => { setReplyingTo(null); setReplyText('') }} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600">Anulează</button><button className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">Trimite</button></div>
                        </div>
                      ) : <button onClick={() => setReplyingTo(r.id)} className="ml-6 text-xs text-blue-600 font-medium hover:underline">Răspunde</button>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SERVICII */}
            {activeSection === 'services' && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center">
                <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" /><h2 className="text-lg font-bold text-gray-800 mb-2">Serviciile Mele</h2><p className="text-sm text-gray-500 mb-4">Gestionează serviciile oferite</p>
                <button onClick={() => navigate('/handyman/services')} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">Gestionează Servicii</button>
              </div>
            )}

            {/* DATE FACTURARE */}
            {activeSection === 'billing' && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="p-6 border-b border-gray-100"><h2 className="text-lg font-bold text-gray-800">Date Facturare</h2><p className="text-sm text-gray-500">Necesare pentru plata lucrărilor</p></div>
                <div className="p-6 space-y-5">
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl"><p className="text-sm text-yellow-700">Fără IBAN valid, plățile nu pot fi procesate.</p></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Nume / Firmă *</label><input type="text" value={billingForm.company_name} onChange={(e) => setBillingForm(p => ({ ...p, company_name: e.target.value }))} placeholder="Nume complet sau firmă" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">CUI / CNP *</label><input type="text" value={billingForm.cui} onChange={(e) => setBillingForm(p => ({ ...p, cui: e.target.value }))} placeholder="CUI firmă sau CNP" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                  </div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Adresă</label><input type="text" value={billingForm.address} onChange={(e) => setBillingForm(p => ({ ...p, address: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">IBAN *</label><input type="text" value={billingForm.iban} onChange={(e) => setBillingForm(p => ({ ...p, iban: e.target.value }))} placeholder="RO00XXXX..." className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Banca</label><input type="text" value={billingForm.bank} onChange={(e) => setBillingForm(p => ({ ...p, bank: e.target.value }))} placeholder="Ex: BRD, BCR, ING..." className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                  </div>
                  <button className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition">Salvează Datele</button>
                </div>
              </div>
            )}

            {/* ASPECT INTERFAȚĂ */}
            {activeSection === 'appearance' && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="p-6 border-b border-gray-100"><h2 className="text-lg font-bold text-gray-800">Aspect Interfață</h2></div>
                <div className="p-6 space-y-6">
                  <div><h3 className="font-bold text-gray-800 mb-3">Temă</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {[{ id: 'light', icon: Sun, label: 'Luminoasă', preview: 'bg-white border-2' }, { id: 'dark', icon: Moon, label: 'Întunecată', preview: 'bg-gray-800 border-2' }, { id: 'system', icon: Monitor, label: 'Sistem', preview: 'bg-gradient-to-r from-white to-gray-800 border-2' }].map((t) => (
                        <button key={t.id} onClick={() => setTheme(t.id)} className={`p-4 rounded-xl border-2 text-center transition-all ${theme === t.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                          <div className={`w-full h-16 rounded-lg mb-3 ${t.preview} border-gray-200`} /><t.icon className={`w-5 h-5 mx-auto mb-1 ${theme === t.id ? 'text-blue-600' : 'text-gray-400'}`} /><p className="text-sm font-medium text-gray-800">{t.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div><h3 className="font-bold text-gray-800 mb-3">Limbă</h3><select className="w-full max-w-xs px-4 py-2.5 border border-gray-300 rounded-xl bg-white"><option value="ro">Română</option><option value="en">English</option></select></div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* MODAL: Adaugă Skill */}
      {showAddSkill && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => { setShowAddSkill(false); setSelectedSkill(null) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-800">{!selectedSkill ? 'Alege un Skill' : 'Încarcă Certificat'}</h3>
                <p className="text-sm text-gray-500">{!selectedSkill ? 'Selectează skillul pe care vrei să-l adaugi' : `Verifică: ${selectedSkill.name}`}</p>
              </div>
              <button onClick={() => { setShowAddSkill(false); setSelectedSkill(null) }} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {!selectedSkill ? (
                <div className="space-y-3">
                  <div className="relative mb-3">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" value={skillSearch} onChange={(e) => setSkillSearch(e.target.value)} placeholder="Caută skill..." className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {filteredAvailableSkills.length > 0 ? filteredAvailableSkills.map((skill) => (
                      <button key={skill.id} onClick={() => setSelectedSkill(skill)} className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 text-left hover:border-blue-300 hover:bg-blue-50 transition">
                        <div><p className="font-medium text-gray-800 text-sm">{skill.name}</p><p className="text-xs text-gray-500">{skill.category}</p></div>
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </button>
                    )) : <p className="text-sm text-gray-500 text-center py-4">Niciun skill disponibil</p>}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <button onClick={() => setSelectedSkill(null)} className="text-sm text-blue-600 font-medium hover:underline">← Înapoi la lista de skilluri</button>
                  <div className="p-3 bg-gray-50 rounded-xl"><p className="text-sm font-medium text-gray-800">Skill selectat: <strong>{selectedSkill.name}</strong></p></div>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                    <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                    <p className="font-medium text-gray-700 mb-1">Încarcă certificatul sau atestatul</p>
                    <p className="text-xs text-gray-500 mb-4">PDF, JPG sau PNG — max 5MB</p>
                    {uploadingDoc ? (
                      <div className="flex items-center justify-center gap-2"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /><span className="text-sm text-blue-600">Se încarcă...</span></div>
                    ) : (
                      <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium cursor-pointer hover:bg-blue-700 transition">
                        <Upload className="w-4 h-4" /> Alege fișier
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleDocUpload} className="hidden" />
                      </label>
                    )}
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-start gap-2"><Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" /><div className="text-xs text-blue-700"><p className="font-medium mb-1">Ce documente sunt acceptate:</p><p>• Diplome și certificate profesionale</p><p>• Atestate ANRE, ISCIR, autorizații</p><p>• Certificări producător (ex: Bosch, Vaillant)</p><p className="mt-1">Verificarea durează 1-3 zile lucrătoare.</p></div></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Confirmare ștergere skill */}
      {showDeleteSkill && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm text-center p-6">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-7 h-7 text-red-500" /></div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Ștergi acest skill?</h3>
            <p className="text-sm text-gray-500 mb-1"><strong>{mySkills.find(s => s.id === showDeleteSkill)?.name}</strong></p>
            <p className="text-xs text-gray-400 mb-6">Dacă skillul era verificat, va trebui să-l re-verifici.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteSkill(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Anulează</button>
              <button onClick={() => handleDeleteSkill(showDeleteSkill)} className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition">Șterge</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Schimbă zona */}
      {showZoneChange && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => setShowZoneChange(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">Modifică Zona de Lucru</h3>
              <button onClick={() => setShowZoneChange(false)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-sm font-bold text-gray-800 mb-2">Oraș *</label><CityAutocomplete value={zoneForm.city ? `${zoneForm.city}, ${zoneForm.county}` : ''} onChange={(c) => setZoneForm(p => ({ ...p, city: c.name, county: c.county }))} placeholder="Caută orașul..." /></div>
              <div><label className="block text-sm font-bold text-gray-800 mb-2">Raza principală: <span className="text-blue-600">{zoneForm.radius} km</span></label><input type="range" min="5" max="50" value={zoneForm.radius} onChange={(e) => setZoneForm(p => ({ ...p, radius: parseInt(e.target.value) }))} className="w-full accent-blue-600" /></div>
              <div><label className="block text-sm font-bold text-gray-800 mb-2">Raza extinsă: <span className="text-yellow-600">{zoneForm.extended} km</span></label><input type="range" min={zoneForm.radius} max="100" value={zoneForm.extended} onChange={(e) => setZoneForm(p => ({ ...p, extended: parseInt(e.target.value) }))} className="w-full accent-yellow-500" /></div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setShowZoneChange(false)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Anulează</button>
              <button onClick={() => setShowConfirmZone(true)} disabled={!zoneForm.city} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">Salvează</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Confirmare schimbare zonă */}
      {showConfirmZone && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm text-center p-6">
            <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-7 h-7 text-yellow-600" /></div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Schimbi zona de lucru?</h3>
            <p className="text-sm mb-1"><strong>{handymanProfile?.primary_city || 'Nedefinit'}</strong> → <strong>{zoneForm.city}, {zoneForm.county}</strong></p>
            <p className="text-xs text-gray-400 mb-6">Rază: {zoneForm.radius} km principală, {zoneForm.extended} km extinsă</p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmZone(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Nu, anulează</button>
              <button onClick={handleConfirmZoneChange} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">Da, schimbă</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}