import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import DashboardNavbar from '../components/dashboard/DashboardNavbar'
import CityAutocomplete from '../components/CityAutocomplete'
import SecuritySettings from '../components/SecuritySettings'
import {
  User, Bell, Shield, Tag, CreditCard, Star, MapPin, Wrench,
  Receipt, Palette, LogOut, ChevronRight, Camera, Edit2, X,
  CheckCircle, Plus, Trash2, Eye, EyeOff, Sun, Moon, Monitor,
  Mail, Phone, Lock, AlertTriangle, Clock, Heart,Calendar
} from 'lucide-react'

const sidebarItems = [
  { id: 'account', label: 'Datele Contului', icon: User },
  { id: 'notifications', label: 'Notificări', icon: Bell },
  { id: 'security', label: 'Setări Siguranță', icon: Shield },
  { id: 'vouchers', label: 'Vouchere', icon: Tag },
  { id: 'cards', label: 'Cardurile Mele', icon: CreditCard },
  { id: 'reviews', label: 'Recenziile Mele', icon: Star },
  { id: 'addresses', label: 'Adresele Mele', icon: MapPin },
  { id: 'repairs', label: 'Istoric Comenzi', icon: Wrench },
  { id: 'billing', label: 'Date Facturare', icon: Receipt },
  { id: 'appearance', label: 'Aspect Interfață', icon: Palette },
]

const mockVouchers = [
  { id: 1, code: 'WELCOME20', discount: '20%', description: 'Reducere la prima rezervare', expires: '2026-04-01', used: false },
  { id: 2, code: 'SPRING10', discount: '10 RON', description: 'Reducere de primăvară', expires: '2026-03-31', used: false },
  { id: 3, code: 'LOYAL50', discount: '50 RON', description: 'Bonus fidelitate', expires: '2026-06-01', used: true },
]

const mockCards = [
  { id: 1, type: 'visa', last4: '4532', expiry: '12/27', isDefault: true },
  { id: 2, type: 'mastercard', last4: '8901', expiry: '08/26', isDefault: false },
]

const mockRepairs = [
  { id: 1, title: 'Instalare Iluminat Living', handyman: 'Ion Marin', date: '2026-02-15', status: 'completed', price: '350 RON' },
  { id: 2, title: 'Reparație Robinet Bucătărie', handyman: 'Andrei Vasile', date: '2026-01-20', status: 'completed', price: '150 RON' },
  { id: 3, title: 'Zugrăveli Living', handyman: 'Elena Pop', date: '2026-01-05', status: 'completed', price: '800 RON' },
  { id: 4, title: 'Montaj Priză Dormitor', handyman: 'Ion Marin', date: '2026-03-01', status: 'in_progress', price: '120 RON' },
]

export default function ClientProfile() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('account')
  const [profile, setProfile] = useState(null)
  const [addresses, setAddresses] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [theme, setTheme] = useState('system')
  const [showAddAddress, setShowAddAddress] = useState(false)
  const [newAddress, setNewAddress] = useState({ label: 'Acasă', street: '', city: '', county: '', postal_code: '' })
  const [historyTab, setHistoryTab] = useState('tasks')
  const [historyTasks, setHistoryTasks] = useState([])
  const [historyBookings, setHistoryBookings] = useState([])
  const [reviews, setReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [editingReviewId, setEditingReviewId] = useState(null)
  const [reviewEditForm, setReviewEditForm] = useState({ rating: 5, title: '', description: '' })

  // Cards
  const [cards, setCards] = useState([])
  const [showAddCard, setShowAddCard] = useState(false)
  const [newCard, setNewCard] = useState({ cardholderName: '', cardNumber: '', expiry: '', cvv: '' })
  const [addCardLoading, setAddCardLoading] = useState(false)

  // Billing
  const [billingType, setBillingType] = useState('individual')
  const [billingData, setBillingData] = useState({
    individual: { full_name: '', cnp: '', address: '' },
    company: { company_name: '', cui: '', address: '', reg_commerce: '', iban: '', bank: '' },
  })
  const [billingSaved, setBillingSaved] = useState(false)

  const [notifSettings, setNotifSettings] = useState({
    inapp_offers: true,
    inapp_task_updates: true,
    inapp_bookings: true,
    inapp_reschedule: true,
    inapp_disputes: true,
    inapp_messages: true,
    inapp_support: true,
    email_offers: true,
    email_task_updates: true,
    email_bookings: true,
  })
  const [notifSaved, setNotifSaved] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/login'); return }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    setProfile(profileData)
    setEditForm(profileData || {})

    if (profileData?.notification_preferences) {
      setNotifSettings(prev => ({ ...prev, ...profileData.notification_preferences }))
    }

    const { data: addressData } = await supabase
      .from('client_addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_primary', { ascending: false })
    setAddresses(addressData || [])

    const { data: cardsData } = await supabase
      .from('client_cards')
      .select('*')
      .eq('user_id', user.id)
      .order('is_primary', { ascending: false })
    setCards(cardsData || [])

    if (profileData?.billing_details && Object.keys(profileData.billing_details).length > 0) {
      const bd = profileData.billing_details
      setBillingType(bd.type || 'individual')
      if (bd.individual) setBillingData(prev => ({ ...prev, individual: bd.individual }))
      if (bd.company) setBillingData(prev => ({ ...prev, company: bd.company }))
    }

    // Istoric taskuri
    const { data: tasksData } = await supabase
    .from('tasks')
    .select(`
        *,
        category:category_id (name),
        handyman:handyman_id (first_name, last_name)
    `)
    .eq('client_id', user.id)
    .order('created_at', { ascending: false })
    setHistoryTasks(tasksData || [])

    // Istoric rezervări
    const { data: bookingsData } = await supabase
    .from('bookings')
    .select(`
        *,
        handyman:handyman_id (first_name, last_name),
        service:service_id (title)
    `)
    .eq('client_id', user.id)
    .order('created_at', { ascending: false })
    setHistoryBookings(bookingsData || [])

    setReviewsLoading(true)
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select('*')
      .eq('reviewer_id', user.id)
      .order('created_at', { ascending: false })

    let enrichedReviews = reviewsData || []
    const reviewedIds = [...new Set((reviewsData || []).map(r => r.reviewed_id).filter(Boolean))]

    if (reviewedIds.length > 0) {
      const { data: reviewedProfiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', reviewedIds)

      const reviewedNameMap = Object.fromEntries(
        (reviewedProfiles || []).map(p => [p.id, `${p.first_name || ''} ${p.last_name || ''}`.trim()])
      )

      enrichedReviews = (reviewsData || []).map(r => ({
        ...r,
        handyman_name: reviewedNameMap[r.reviewed_id] || 'Handyman'
      }))
    }

    setReviews(enrichedReviews)
    setReviewsLoading(false)

    setLoading(false)
  }

  const startEditReview = (review) => {
    setEditingReviewId(review.id)
    setReviewEditForm({
      rating: review.rating || 5,
      title: review.title || '',
      description: review.description || '',
    })
  }

  const cancelEditReview = () => {
    setEditingReviewId(null)
    setReviewEditForm({ rating: 5, title: '', description: '' })
  }

  const saveReviewEdit = async (reviewId) => {
    const payload = {
      rating: Number(reviewEditForm.rating),
      title: reviewEditForm.title?.trim() || null,
      description: reviewEditForm.description?.trim() || null,
    }

    const { error } = await supabase
      .from('reviews')
      .update(payload)
      .eq('id', reviewId)
      .eq('reviewer_id', profile.id)

    if (!error) {
      setReviews(prev => prev.map(r => (r.id === reviewId ? { ...r, ...payload } : r)))
      cancelEditReview()
    }
  }

  const deleteReview = async (reviewId) => {
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId)
      .eq('reviewer_id', profile.id)

    if (!error) {
      setReviews(prev => prev.filter(r => r.id !== reviewId))
      if (editingReviewId === reviewId) cancelEditReview()
    }
  }

  const handleSaveProfile = async () => {
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        phone: editForm.phone,
        city: editForm.city,
        county: editForm.county,
        property_type: editForm.property_type,
      })
      .eq('id', profile.id)

    if (!error) {
      setProfile(prev => ({ ...prev, ...editForm }))
      setEditing(false)
    }
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const fileExt = file.name.split('.').pop()
    const fileName = `${profile.id}/avatar.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { upsert: true })

    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName)
      await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', profile.id)
      setProfile(prev => ({ ...prev, avatar_url: urlData.publicUrl }))
    }
  }

  const handleAddAddress = async () => {
    const { data, error } = await supabase
      .from('client_addresses')
      .insert({
        user_id: profile.id,
        ...newAddress,
        is_primary: addresses.length === 0,
      })
      .select()
      .single()

    if (!error && data) {
      setAddresses(prev => [...prev, data])
      setShowAddAddress(false)
      setNewAddress({ label: 'Acasă', street: '', city: '', county: '', postal_code: '' })
    }
  }

  const deleteAddress = async (id) => {
    await supabase.from('client_addresses').delete().eq('id', id)
    setAddresses(prev => prev.filter(a => a.id !== id))
  }

  const setPrimaryAddress = async (id) => {
    await supabase.from('client_addresses').update({ is_primary: false }).eq('user_id', profile.id)
    await supabase.from('client_addresses').update({ is_primary: true }).eq('id', id)
    setAddresses(prev => prev.map(a => ({ ...a, is_primary: a.id === id })))
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const formatCardNumber = (value) => {
    const v = value.replace(/\D/g, '').slice(0, 16)
    return v.replace(/(.{4})/g, '$1 ').trim()
  }

  const detectCardType = (number) => {
    const n = number.replace(/\s/g, '')
    if (n.startsWith('4')) return 'visa'
    if (n.startsWith('5')) return 'mastercard'
    if (n.startsWith('3')) return 'amex'
    return 'other'
  }

  const handleAddCard = async () => {
    const clean = newCard.cardNumber.replace(/\s/g, '')
    if (clean.length < 13 || !newCard.expiry || !newCard.cardholderName) return
    setAddCardLoading(true)
    const { data, error } = await supabase.from('client_cards').insert({
      user_id: profile.id,
      card_type: detectCardType(clean),
      last4: clean.slice(-4),
      expiry: newCard.expiry,
      cardholder_name: newCard.cardholderName,
      is_primary: cards.length === 0,
    }).select().single()
    if (!error && data) {
      setCards(prev => cards.length === 0 ? [data] : [...prev, data])
      setShowAddCard(false)
      setNewCard({ cardholderName: '', cardNumber: '', expiry: '', cvv: '' })
    }
    setAddCardLoading(false)
  }

  const deleteCard = async (id) => {
    await supabase.from('client_cards').delete().eq('id', id)
    setCards(prev => prev.filter(c => c.id !== id))
  }

  const setPrimaryCard = async (id) => {
    await supabase.from('client_cards').update({ is_primary: false }).eq('user_id', profile.id)
    await supabase.from('client_cards').update({ is_primary: true }).eq('id', id)
    setCards(prev => prev.map(c => ({ ...c, is_primary: c.id === id })))
  }

  const saveBilling = async () => {
    const { error } = await supabase.from('profiles').update({
      billing_details: { type: billingType, individual: billingData.individual, company: billingData.company },
    }).eq('id', profile.id)
    if (!error) {
      setBillingSaved(true)
      setTimeout(() => setBillingSaved(false), 2000)
    }
  }

  const toggleNotif = async (key) => {
    const newSettings = { ...notifSettings, [key]: !notifSettings[key] }
    setNotifSettings(newSettings)
    const { error } = await supabase
      .from('profiles')
      .update({ notification_preferences: newSettings })
      .eq('id', profile.id)
    if (!error) {
      setNotifSaved(true)
      setTimeout(() => setNotifSaved(false), 2000)
    }
  }

  const getStatusColor = (status) => {
    if (status === 'completed') return 'bg-green-100 text-green-700'
    if (status === 'delayed') return 'bg-orange-100 text-orange-700'
    if (status === 'in_progress') return 'bg-purple-100 text-purple-700'
    if (status === 'pending') return 'bg-yellow-100 text-yellow-700'
    return 'bg-gray-100 text-gray-700'
  }

  const getStatusLabel = (status) => {
    if (status === 'completed') return 'Finalizat'
    if (status === 'delayed') return 'Întârziat'
    if (status === 'in_progress') return 'În progres'
    if (status === 'pending') return 'În așteptare'
    return status
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavbar />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex gap-6">

          {/* Sidebar */}
          <div className="w-72 flex-shrink-0">
            {/* Profile Card */}
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
                <p className="text-xs text-gray-400 mt-1">
                  Membru din {new Date(profile?.created_at).toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Nav Items */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all border-b border-gray-50 last:border-0
                    ${activeSection === item.id
                      ? 'bg-blue-50 text-blue-600 border-l-4 border-l-blue-600'
                      : 'text-gray-600 hover:bg-gray-50'
                    }
                  `}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="text-sm font-medium flex-1">{item.label}</span>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </button>
              ))}

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-500 hover:bg-red-50 transition"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">Deconectare</span>
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">

            {/* DATELE CONTULUI */}
            {activeSection === 'account' && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">Datele Contului</h2>
                    <p className="text-sm text-gray-500">Gestionează informațiile tale personale</p>
                  </div>
                  {!editing ? (
                    <button onClick={() => setEditing(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
                      <Edit2 className="w-4 h-4" /> Editează
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => setEditing(false)}
                        className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
                        Anulează
                      </button>
                      <button onClick={handleSaveProfile}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
                        <CheckCircle className="w-4 h-4" /> Salvează
                      </button>
                    </div>
                  )}
                </div>
                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Prenume</label>
                      {editing ? (
                        <input type="text" value={editForm.first_name || ''}
                          onChange={(e) => setEditForm(p => ({ ...p, first_name: e.target.value }))}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      ) : (
                        <p className="text-gray-800 font-medium">{profile?.first_name || '-'}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Nume</label>
                      {editing ? (
                        <input type="text" value={editForm.last_name || ''}
                          onChange={(e) => setEditForm(p => ({ ...p, last_name: e.target.value }))}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      ) : (
                        <p className="text-gray-800 font-medium">{profile?.last_name || '-'}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <p className="text-gray-800">{profile?.email}</p>
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">Verificat</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Telefon</label>
                    {editing ? (
                      <input type="tel" value={editForm.phone || ''}
                        onChange={(e) => setEditForm(p => ({ ...p, phone: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    ) : (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <p className="text-gray-800">{profile?.phone || 'Necompletat'}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Oraș / Județ</label>
                    {editing ? (
                      <CityAutocomplete
                        value={editForm.city ? `${editForm.city}${editForm.county ? ', ' + editForm.county : ''}` : ''}
                        onChange={(city) => setEditForm(p => ({ ...p, city: city.name, county: city.county }))}
                        placeholder="Caută oraș..."
                      />
                    ) : (
                      <p className="text-gray-800">
                        {profile?.city ? `${profile.city}${profile.county ? ', ' + profile.county : ''}` : 'Necompletat'}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Tip Locuință</label>
                    {editing ? (
                      <select value={editForm.property_type || ''}
                        onChange={(e) => setEditForm(p => ({ ...p, property_type: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Selectează</option>
                        <option value="apartment">Apartament</option>
                        <option value="house">Casă</option>
                        <option value="studio">Garsonieră</option>
                        <option value="office">Birou</option>
                      </select>
                    ) : (
                      <p className="text-gray-800">
                        {profile?.property_type === 'apartment' ? 'Apartament' :
                         profile?.property_type === 'house' ? 'Casă' :
                         profile?.property_type === 'studio' ? 'Garsonieră' :
                         profile?.property_type === 'office' ? 'Birou' : 'Necompletat'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* NOTIFICĂRI */}
            {activeSection === 'notifications' && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">Setări Notificări</h2>
                    <p className="text-sm text-gray-500">Alege ce notificări vrei să primești</p>
                  </div>
                  {notifSaved && (
                    <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                      <CheckCircle className="w-4 h-4" /> Salvat
                    </span>
                  )}
                </div>
                <div className="p-6 space-y-8">

                  {/* IN-APP */}
                  <div>
                    <div className="mb-4">
                      <h3 className="font-bold text-gray-800">Notificări în aplicație</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Apar instant în clopotelul din navigație</p>
                    </div>
                    <div className="space-y-1">
                      {[
                        { key: 'inapp_offers',       label: 'Oferte și negociere',      desc: 'Oferte noi, contra-oferte și task atribuit' },
                        { key: 'inapp_task_updates',  label: 'Actualizări task',          desc: 'Meșterul a început, a finalizat sau task întârziat' },
                        { key: 'inapp_bookings',      label: 'Rezervări',                 desc: 'Confirmare rezervare și notificări de întârziere' },
                        { key: 'inapp_reschedule',    label: 'Reprogramări',              desc: 'Cereri de reprogramare primite de la meșteri' },
                        { key: 'inapp_disputes',      label: 'Dispute și relucrări',      desc: 'Actualizări dispute, propuneri relucrare și decizii admin' },
                        { key: 'inapp_messages',      label: 'Mesaje noi',                desc: 'Mesaje primite de la meșteri în chat' },
                        { key: 'inapp_support',       label: 'Răspunsuri suport',         desc: 'Răspunsuri la tichetele tale de suport' },
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                          <div>
                            <p className="text-sm font-medium text-gray-700">{item.label}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                          </div>
                          <button
                            onClick={() => toggleNotif(item.key)}
                            className={`w-11 h-6 rounded-full relative transition-colors flex-shrink-0 ml-4 ${notifSettings[item.key] ? 'bg-blue-600' : 'bg-gray-200'}`}
                          >
                            <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow transition-transform ${notifSettings[item.key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* EMAIL */}
                  <div>
                    <div className="mb-4">
                      <h3 className="font-bold text-gray-800">Email</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Trimis pe adresa <span className="font-medium text-gray-500">{profile?.email}</span></p>
                    </div>
                    <div className="space-y-1">
                      {[
                        { key: 'email_offers',        label: 'Oferte la taskuri',         desc: 'Email când primești o ofertă nouă de la un meșter' },
                        { key: 'email_task_updates',  label: 'Actualizări importante task', desc: 'Finalizare, întârziere sau task atribuit meșterului' },
                        { key: 'email_bookings',      label: 'Rezervări și confirmări',   desc: 'Confirmare și actualizări pentru rezervările tale' },
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                          <div>
                            <p className="text-sm font-medium text-gray-700">{item.label}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                          </div>
                          <button
                            onClick={() => toggleNotif(item.key)}
                            className={`w-11 h-6 rounded-full relative transition-colors flex-shrink-0 ml-4 ${notifSettings[item.key] ? 'bg-blue-600' : 'bg-gray-200'}`}
                          >
                            <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow transition-transform ${notifSettings[item.key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* SETĂRI SIGURANȚĂ */}
            {activeSection === 'security' && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-1">Setări Siguranță</h2>
                <p className="text-sm text-gray-500 mb-6">Gestionează securitatea contului tău</p>
                <SecuritySettings />
              </div>
            )}

            {/* VOUCHERE */}
            {activeSection === 'vouchers' && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-lg font-bold text-gray-800">Voucherele Mele</h2>
                  <p className="text-sm text-gray-500">{mockVouchers.filter(v => !v.used).length} active · {mockVouchers.filter(v => v.used).length} folosite</p>
                </div>

                {/* Input adaugare voucher */}
                <div className="px-6 pt-5 pb-2">
                  <div className="flex gap-2">
                    <input type="text" placeholder="Introdu codul de voucher..."
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase placeholder:normal-case" />
                    <button className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">
                      Aplică
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-3">
                  {mockVouchers.map((v) => (
                    <div key={v.id} className={`relative overflow-hidden rounded-2xl border transition
                      ${v.used ? 'border-gray-200 bg-gray-50' : 'border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50'}`}>
                      <div className="flex items-center gap-4 p-4">
                        {/* Discount badge */}
                        <div className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center font-bold flex-shrink-0
                          ${v.used ? 'bg-gray-200 text-gray-400' : 'bg-blue-600 text-white shadow-lg shadow-blue-200'}`}>
                          <span className="text-lg leading-none">{v.discount.replace(' RON', '')}</span>
                          {v.discount.includes('RON') && <span className="text-xs font-normal opacity-80">RON</span>}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className={`font-bold tracking-widest text-sm font-mono ${v.used ? 'text-gray-400' : 'text-gray-800'}`}>
                              {v.code}
                            </p>
                            {v.used && <span className="px-2 py-0.5 bg-gray-200 text-gray-500 text-xs rounded-full font-medium">Folosit</span>}
                            {!v.used && new Date(v.expires) < new Date() && <span className="px-2 py-0.5 bg-red-100 text-red-500 text-xs rounded-full font-medium">Expirat</span>}
                            {!v.used && new Date(v.expires) >= new Date() && <span className="px-2 py-0.5 bg-green-100 text-green-600 text-xs rounded-full font-medium">Activ</span>}
                          </div>
                          <p className={`text-sm ${v.used ? 'text-gray-400' : 'text-gray-600'}`}>{v.description}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Expiră {new Date(v.expires).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                        </div>

                        {/* Action */}
                        {!v.used && new Date(v.expires) >= new Date() && (
                          <button className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition shadow-sm flex-shrink-0">
                            Folosește
                          </button>
                        )}
                      </div>

                      {/* Decorative circles (ticket effect) */}
                      <div className={`absolute left-[72px] -top-3 w-6 h-6 rounded-full ${v.used ? 'bg-gray-100' : 'bg-white'} border ${v.used ? 'border-gray-200' : 'border-blue-100'}`} />
                      <div className={`absolute left-[72px] -bottom-3 w-6 h-6 rounded-full ${v.used ? 'bg-gray-100' : 'bg-white'} border ${v.used ? 'border-gray-200' : 'border-blue-100'}`} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CARDURI */}
            {activeSection === 'cards' && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">Cardurile Mele</h2>
                    <p className="text-sm text-gray-500">{cards.length} card{cards.length !== 1 ? 'uri' : ''} salvat{cards.length !== 1 ? 'e' : ''}</p>
                  </div>
                  <button onClick={() => setShowAddCard(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
                    <Plus className="w-4 h-4" /> Adaugă Card
                  </button>
                </div>
                <div className="p-6 space-y-3">
                  {cards.length === 0 ? (
                    <div className="text-center py-10">
                      <CreditCard className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">Niciun card salvat</p>
                      <p className="text-sm text-gray-400 mt-1">Adaugă un card pentru plăți rapide</p>
                    </div>
                  ) : cards.map((card) => (
                    <div key={card.id} className={`flex items-center justify-between p-4 rounded-xl border-2 transition
                      ${card.is_primary ? 'border-blue-200 bg-blue-50' : 'border-gray-100 bg-gray-50'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xs
                          ${card.card_type === 'visa' ? 'bg-blue-700' : card.card_type === 'mastercard' ? 'bg-orange-500' : 'bg-gray-600'}`}>
                          {card.card_type === 'visa' ? 'VISA' : card.card_type === 'mastercard' ? 'MC' : 'CARD'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">•••• •••• •••• {card.last4}</p>
                          {card.cardholder_name && <p className="text-xs text-gray-600">{card.cardholder_name}</p>}
                          <p className="text-xs text-gray-400">Expiră {card.expiry}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {card.is_primary
                          ? <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">Principal</span>
                          : <button onClick={() => setPrimaryCard(card.id)}
                              className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 rounded-lg transition">
                              Setează principal
                            </button>
                        }
                        <button onClick={() => deleteCard(card.id)}
                          className="w-8 h-8 rounded-lg hover:bg-red-100 flex items-center justify-center transition">
                          <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Modal Adaugă Card */}
                {showAddCard && (
                  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => setShowAddCard(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-between p-6 border-b border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800">Adaugă Card</h3>
                        <button onClick={() => setShowAddCard(false)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                          <X className="w-5 h-5 text-gray-400" />
                        </button>
                      </div>
                      <div className="p-6 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Titular card *</label>
                          <input type="text" placeholder="Nume Prenume"
                            value={newCard.cardholderName}
                            onChange={e => setNewCard(p => ({ ...p, cardholderName: e.target.value }))}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Număr card *</label>
                          <input type="text" placeholder="0000 0000 0000 0000" maxLength={19}
                            value={newCard.cardNumber}
                            onChange={e => setNewCard(p => ({ ...p, cardNumber: formatCardNumber(e.target.value) }))}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-widest" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Data expirare *</label>
                            <input type="text" placeholder="MM/YY" maxLength={5}
                              value={newCard.expiry}
                              onChange={e => {
                                let v = e.target.value.replace(/\D/g, '').slice(0, 4)
                                if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2)
                                setNewCard(p => ({ ...p, expiry: v }))
                              }}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">CVV *</label>
                            <input type="password" placeholder="•••" maxLength={4}
                              value={newCard.cvv}
                              onChange={e => setNewCard(p => ({ ...p, cvv: e.target.value.replace(/\D/g, '') }))}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Shield className="w-3 h-3" /> Datele cardului sunt stocate securizat
                        </p>
                      </div>
                      <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
                        <button onClick={() => setShowAddCard(false)}
                          className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
                          Anulează
                        </button>
                        <button onClick={handleAddCard} disabled={addCardLoading || newCard.cardNumber.replace(/\s/g,'').length < 13 || !newCard.expiry || !newCard.cardholderName}
                          className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">
                          {addCardLoading ? 'Se adaugă...' : 'Adaugă Card'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* RECENZII */}
            {activeSection === 'reviews' && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-lg font-bold text-gray-800">Recenziile Mele</h2>
                  <p className="text-sm text-gray-500">Recenzii pe care le-ai lăsat handymanilor</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {reviewsLoading ? (
                    <div className="p-8 text-center text-sm text-gray-500">Se încarcă recenziile...</div>
                  ) : reviews.length === 0 ? (
                    <div className="p-8 text-center text-sm text-gray-500">Nu ai recenzii lăsate încă.</div>
                  ) : (
                    reviews.map((review) => (
                      <div key={review.id} className="p-5">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-bold text-gray-800">{review.title || 'Recenzie'}</p>
                            <p className="text-sm text-gray-500">Handyman: {review.handyman_name || 'Necunoscut'}</p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-0.5 justify-end">
                              {[1, 2, 3, 4, 5].map(s => (
                                <Star key={s} className={`w-4 h-4 ${s <= (review.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                              ))}
                            </div>
                            <p className="text-xs text-gray-400 mt-1">{new Date(review.created_at || review.updated_at).toLocaleDateString('ro-RO')}</p>
                          </div>
                        </div>

                        {editingReviewId === review.id ? (
                          <div className="space-y-3 mt-3">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Rating</label>
                              <select
                                value={reviewEditForm.rating}
                                onChange={(e) => setReviewEditForm(prev => ({ ...prev, rating: Number(e.target.value) }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                {[1, 2, 3, 4, 5].map(r => (
                                  <option key={r} value={r}>{r} stele</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Titlu</label>
                              <input
                                type="text"
                                value={reviewEditForm.title}
                                onChange={(e) => setReviewEditForm(prev => ({ ...prev, title: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Descriere</label>
                              <textarea
                                rows={3}
                                value={reviewEditForm.description}
                                onChange={(e) => setReviewEditForm(prev => ({ ...prev, description: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                              />
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => saveReviewEdit(review.id)}
                                className="text-xs text-blue-600 font-medium hover:underline"
                              >
                                Salvează
                              </button>
                              <button
                                onClick={cancelEditReview}
                                className="text-xs text-gray-500 font-medium hover:underline"
                              >
                                Anulează
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm text-gray-600">{review.description || '-'}</p>
                            <div className="flex items-center gap-2 mt-3">
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Publicat</span>
                              <button
                                onClick={() => startEditReview(review)}
                                className="text-xs text-blue-600 font-medium hover:underline"
                              >
                                Editează
                              </button>
                              <button
                                onClick={() => deleteReview(review.id)}
                                className="text-xs text-red-500 font-medium hover:underline"
                              >
                                Șterge
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ADRESE */}
            {activeSection === 'addresses' && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">Adresele Mele</h2>
                    <p className="text-sm text-gray-500">Gestionează adresele pentru lucrări</p>
                  </div>
                  <button onClick={() => setShowAddAddress(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
                    <Plus className="w-4 h-4" /> Adaugă Adresă
                  </button>
                </div>
                <div className="p-6 space-y-3">
                  {addresses.length > 0 ? addresses.map((addr) => (
                    <div key={addr.id} className={`flex items-center justify-between p-4 rounded-xl border-2
                      ${addr.is_primary ? 'border-blue-200 bg-blue-50' : 'border-gray-100 bg-gray-50'}
                    `}>
                      <div className="flex items-center gap-3">
                        <MapPin className={`w-5 h-5 ${addr.is_primary ? 'text-blue-600' : 'text-gray-400'}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-800">{addr.label}</p>
                            {addr.is_primary && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">Principală</span>}
                          </div>
                          <p className="text-sm text-gray-500">{addr.street}, {addr.city}, {addr.county}</p>
                          {addr.postal_code && <p className="text-xs text-gray-400">{addr.postal_code}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {!addr.is_primary && (
                          <button onClick={() => setPrimaryAddress(addr.id)}
                            className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 rounded-lg transition">
                            Setează principală
                          </button>
                        )}
                        <button onClick={() => deleteAddress(addr.id)}
                          className="w-8 h-8 rounded-lg hover:bg-red-100 flex items-center justify-center transition">
                          <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                        </button>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8">
                      <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">Nicio adresă salvată</p>
                    </div>
                  )}
                </div>

                {/* Add Address Modal */}
                {showAddAddress && (
                  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => setShowAddAddress(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-between p-6 border-b border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800">Adaugă Adresă</h3>
                        <button onClick={() => setShowAddAddress(false)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                          <X className="w-5 h-5 text-gray-400" />
                        </button>
                      </div>
                      <div className="p-6 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Etichetă</label>
                          <select value={newAddress.label} onChange={(e) => setNewAddress(p => ({ ...p, label: e.target.value }))}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="Acasă">Acasă</option>
                            <option value="Birou">Birou</option>
                            <option value="Altă adresă">Altă adresă</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Stradă *</label>
                          <input type="text" value={newAddress.street}
                            onChange={(e) => setNewAddress(p => ({ ...p, street: e.target.value }))}
                            placeholder="Str. Exemplu nr. 10, bl. A, ap. 5"
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Oraș / Județ *</label>
                          <CityAutocomplete
                            value={newAddress.city ? `${newAddress.city}${newAddress.county ? ', ' + newAddress.county : ''}` : ''}
                            onChange={(city) => setNewAddress(p => ({ ...p, city: city.name, county: city.county }))}
                            placeholder="Caută oraș..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Cod Poștal</label>
                          <input type="text" value={newAddress.postal_code}
                            onChange={(e) => setNewAddress(p => ({ ...p, postal_code: e.target.value }))}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                      </div>
                      <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
                        <button onClick={() => setShowAddAddress(false)}
                          className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
                          Anulează
                        </button>
                        <button onClick={handleAddAddress}
                          disabled={!newAddress.street || !newAddress.city || !newAddress.county}
                          className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">
                          Salvează
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* REPARAȚII */}
            {activeSection === 'repairs' && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                    <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800">Istoric Comenzi</h2>
                    <p className="text-sm text-gray-500">Taskurile și rezervările tale</p>
                    </div>

                    {/* Toggler */}
                    <div className="px-6 pt-4">
                    <div className="flex bg-gray-100 rounded-xl p-1">
                        <button
                        onClick={() => setHistoryTab('tasks')}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition
                            ${historyTab === 'tasks' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}
                        `}
                        >
                        Taskuri ({historyTasks.length})
                        </button>
                        <button
                        onClick={() => setHistoryTab('bookings')}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition
                            ${historyTab === 'bookings' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}
                        `}
                        >
                        Rezervări ({historyBookings.length})
                        </button>
                    </div>
                    </div>

                    {/* Tasks List */}
                    {historyTab === 'tasks' && (
                    <div className="divide-y divide-gray-50">
                        {historyTasks.length > 0 ? historyTasks.map((task) => (
                        <div key={task.id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition">
                            <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center
                                ${task.status === 'completed' ? 'bg-green-100' :
                                task.status === 'in_progress' ? 'bg-purple-100' :
                                task.status === 'confirmed' ? 'bg-blue-100' : 'bg-yellow-100'}
                            `}>
                                {task.status === 'completed'
                                ? <CheckCircle className="w-5 h-5 text-green-600" />
                                : task.status === 'in_progress'
                                ? <Clock className="w-5 h-5 text-purple-600" />
                                : task.status === 'confirmed'
                                ? <CheckCircle className="w-5 h-5 text-blue-600" />
                                : <Clock className="w-5 h-5 text-yellow-600" />
                                }
                            </div>
                            <div>
                                <p className="font-medium text-gray-800">{task.title}</p>
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                <span>{task.category?.name || 'Necategorizat'}</span>
                                <span>•</span>
                                <span>{new Date(task.created_at).toLocaleDateString('ro-RO')}</span>
                                </div>
                                {task.handyman && (
                                <p className="text-xs text-blue-600 mt-0.5">
                                    Handyman: {task.handyman.first_name} {task.handyman.last_name}
                                </p>
                                )}
                            </div>
                            </div>
                            <div className="text-right">
                            {task.final_price && <p className="font-bold text-gray-800">{Number(task.final_price).toLocaleString('ro-RO')} RON</p>}
                            {task.budget && !task.final_price && <p className="text-sm text-gray-500">Buget: {Number(task.budget).toLocaleString('ro-RO')} RON</p>}
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                                {getStatusLabel(task.status)}
                            </span>
                            {task.urgency !== 'normal' && (
                                <span className={`ml-1 px-1.5 py-0.5 rounded text-xs font-medium
                                ${task.urgency === 'emergency' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}
                                `}>
                                {task.urgency === 'emergency' ? 'Urgență critică' : 'Urgență medie'}
                                </span>
                            )}
                            </div>
                        </div>
                        )) : (
                        <div className="p-8 text-center">
                            <Wrench className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">Niciun task postat încă</p>
                        </div>
                        )}
                    </div>
                    )}

                    {/* Bookings List */}
                    {historyTab === 'bookings' && (
                    <div className="divide-y divide-gray-50">
                        {historyBookings.length > 0 ? historyBookings.map((booking) => (
                        <div key={booking.id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition">
                            <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center
                                ${booking.status === 'completed' ? 'bg-green-100' :
                                booking.status === 'in_progress' ? 'bg-purple-100' :
                                booking.status === 'confirmed' ? 'bg-blue-100' : 'bg-yellow-100'}
                            `}>
                                {booking.status === 'completed'
                                ? <CheckCircle className="w-5 h-5 text-green-600" />
                                : booking.status === 'in_progress'
                                ? <Clock className="w-5 h-5 text-purple-600" />
                                : booking.status === 'confirmed'
                                ? <CheckCircle className="w-5 h-5 text-blue-600" />
                                : <Clock className="w-5 h-5 text-yellow-600" />
                                }
                            </div>
                            <div>
                                <p className="font-medium text-gray-800">{booking.service?.title || 'Rezervare'}</p>
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                {booking.handyman && (
                                    <span>{booking.handyman.first_name} {booking.handyman.last_name}</span>
                                )}
                                <span>•</span>
                                <span>{new Date(booking.created_at).toLocaleDateString('ro-RO')}</span>
                                </div>
                                {booking.scheduled_date && (
                                <p className="text-xs text-gray-400 mt-0.5">
                                    Programat: {new Date(booking.scheduled_date).toLocaleDateString('ro-RO')} {booking.scheduled_time || ''}
                                </p>
                                )}
                            </div>
                            </div>
                            <div className="text-right">
                            {booking.total && <p className="font-bold text-gray-800">{Number(booking.total).toLocaleString('ro-RO')} RON</p>}
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                                {getStatusLabel(booking.status)}
                            </span>
                            {booking.payment_status === 'paid' && (
                                <span className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">Plătit</span>
                            )}
                            </div>
                        </div>
                        )) : (
                        <div className="p-8 text-center">
                            <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">Nicio rezervare încă</p>
                        </div>
                        )}
                    </div>
                    )}
                </div>
            )}

            {/* DATE FACTURARE */}
            {activeSection === 'billing' && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">Date Facturare</h2>
                    <p className="text-sm text-gray-500">Informații pentru emiterea facturilor fiscale</p>
                  </div>
                  {billingSaved && (
                    <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                      <CheckCircle className="w-4 h-4" /> Salvat
                    </span>
                  )}
                </div>
                <div className="p-6 space-y-5">
                  {/* Toggle PF / PJ */}
                  <div className="flex bg-gray-100 rounded-xl p-1 w-fit">
                    <button onClick={() => setBillingType('individual')}
                      className={`px-5 py-2 text-sm font-medium rounded-lg transition
                        ${billingType === 'individual' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                      Persoană Fizică
                    </button>
                    <button onClick={() => setBillingType('company')}
                      className={`px-5 py-2 text-sm font-medium rounded-lg transition
                        ${billingType === 'company' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                      Persoană Juridică
                    </button>
                  </div>

                  {billingType === 'individual' ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nume complet *</label>
                        <input type="text" placeholder="Nume Prenume"
                          value={billingData.individual.full_name}
                          onChange={e => setBillingData(p => ({ ...p, individual: { ...p.individual, full_name: e.target.value } }))}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CNP</label>
                        <input type="text" placeholder="1234567890123" maxLength={13}
                          value={billingData.individual.cnp}
                          onChange={e => setBillingData(p => ({ ...p, individual: { ...p.individual, cnp: e.target.value.replace(/\D/g, '') } }))}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Adresă facturare *</label>
                        <input type="text" placeholder="Str. Exemplu nr. 1, oraș, județ"
                          value={billingData.individual.address}
                          onChange={e => setBillingData(p => ({ ...p, individual: { ...p.individual, address: e.target.value } }))}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Denumire Firmă *</label>
                          <input type="text" placeholder="S.C. Exemplu S.R.L."
                            value={billingData.company.company_name}
                            onChange={e => setBillingData(p => ({ ...p, company: { ...p.company, company_name: e.target.value } }))}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">CUI *</label>
                          <input type="text" placeholder="RO12345678"
                            value={billingData.company.cui}
                            onChange={e => setBillingData(p => ({ ...p, company: { ...p.company, cui: e.target.value } }))}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Adresă sediu *</label>
                        <input type="text" placeholder="Str. Exemplu nr. 1, oraș, județ"
                          value={billingData.company.address}
                          onChange={e => setBillingData(p => ({ ...p, company: { ...p.company, address: e.target.value } }))}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Registrul Comerțului</label>
                          <input type="text" placeholder="J00/000/0000"
                            value={billingData.company.reg_commerce}
                            onChange={e => setBillingData(p => ({ ...p, company: { ...p.company, reg_commerce: e.target.value } }))}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">IBAN</label>
                          <input type="text" placeholder="RO00XXXX..."
                            value={billingData.company.iban}
                            onChange={e => setBillingData(p => ({ ...p, company: { ...p.company, iban: e.target.value } }))}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Bancă</label>
                        <input type="text" placeholder="Banca Transilvania, BRD, ING..."
                          value={billingData.company.bank}
                          onChange={e => setBillingData(p => ({ ...p, company: { ...p.company, bank: e.target.value } }))}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                  )}

                  <button onClick={saveBilling}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition">
                    <CheckCircle className="w-4 h-4" /> Salvează Datele
                  </button>
                </div>
              </div>
            )}

            {/* ASPECT INTERFAȚĂ */}
            {activeSection === 'appearance' && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-lg font-bold text-gray-800">Aspect Interfață</h2>
                  <p className="text-sm text-gray-500">Personalizează aspectul aplicației</p>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <h3 className="font-bold text-gray-800 mb-3">Temă</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'light', icon: Sun, label: 'Luminoasă', desc: 'Fundal alb', preview: 'bg-white border-2' },
                        { id: 'dark', icon: Moon, label: 'Întunecată', desc: 'Fundal întunecat', preview: 'bg-gray-800 border-2' },
                        { id: 'system', icon: Monitor, label: 'Sistem', desc: 'Urmează setarea OS', preview: 'bg-gradient-to-r from-white to-gray-800 border-2' },
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setTheme(t.id)}
                          className={`p-4 rounded-xl border-2 text-center transition-all
                            ${theme === t.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}
                          `}
                        >
                          <div className={`w-full h-16 rounded-lg mb-3 ${t.preview} border-gray-200`} />
                          <t.icon className={`w-5 h-5 mx-auto mb-1 ${theme === t.id ? 'text-blue-600' : 'text-gray-400'}`} />
                          <p className="text-sm font-medium text-gray-800">{t.label}</p>
                          <p className="text-xs text-gray-500">{t.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-800 mb-3">Limbă</h3>
                    <select className="w-full max-w-xs px-4 py-2.5 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="ro">Română</option>
                      <option value="en">English</option>
                      <option value="de">Deutsch</option>
                      <option value="fr">Français</option>
                    </select>
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-800 mb-3">Dimensiune Text</h3>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-gray-500">Aa</span>
                      <input type="range" min="12" max="20" defaultValue="16" className="flex-1 accent-blue-600" />
                      <span className="text-lg text-gray-500">Aa</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}