import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import DashboardNavbar from '../components/dashboard/DashboardNavbar'
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

// Mock data
const mockReviews = [
  { id: 1, handyman: 'Ion Marin', service: 'Instalare Iluminat', rating: 5, text: 'Lucrare excelentă, foarte profesionist!', date: '2026-02-15', status: 'published' },
  { id: 2, handyman: 'Andrei Vasile', service: 'Reparație Robinet', rating: 4, text: 'Treabă bună, a venit la timp.', date: '2026-01-20', status: 'published' },
  { id: 3, handyman: 'Elena Pop', service: 'Zugrăveli Living', rating: 5, text: 'Impecabil! Recomand cu încredere.', date: '2026-01-05', status: 'published' },
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

  // Notification settings
  const [notifSettings, setNotifSettings] = useState({
    email_bookings: true,
    email_messages: true,
    email_offers: true,
    email_promotions: false,
    push_bookings: true,
    push_messages: true,
    push_offers: true,
    push_reminders: true,
    sms_bookings: false,
    sms_reminders: true,
  })

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

    const { data: addressData } = await supabase
      .from('client_addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_primary', { ascending: false })
    setAddresses(addressData || [])

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

    setLoading(false)
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

  const toggleNotif = (key) => {
    setNotifSettings(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const getStatusColor = (status) => {
    if (status === 'completed') return 'bg-green-100 text-green-700'
    if (status === 'in_progress') return 'bg-purple-100 text-purple-700'
    if (status === 'pending') return 'bg-yellow-100 text-yellow-700'
    return 'bg-gray-100 text-gray-700'
  }

  const getStatusLabel = (status) => {
    if (status === 'completed') return 'Finalizat'
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Oraș</label>
                      {editing ? (
                        <input type="text" value={editForm.city || ''}
                          onChange={(e) => setEditForm(p => ({ ...p, city: e.target.value }))}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      ) : (
                        <p className="text-gray-800">{profile?.city || 'Necompletat'}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Județ</label>
                      {editing ? (
                        <input type="text" value={editForm.county || ''}
                          onChange={(e) => setEditForm(p => ({ ...p, county: e.target.value }))}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      ) : (
                        <p className="text-gray-800">{profile?.county || 'Necompletat'}</p>
                      )}
                    </div>
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
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-lg font-bold text-gray-800">Setări Notificări</h2>
                  <p className="text-sm text-gray-500">Alege cum și când vrei să fii notificat</p>
                </div>
                <div className="p-6 space-y-6">
                  {[
                    { title: 'Email', items: [
                      { key: 'email_bookings', label: 'Rezervări și confirmări' },
                      { key: 'email_messages', label: 'Mesaje de la handymani' },
                      { key: 'email_offers', label: 'Oferte primite la taskuri' },
                      { key: 'email_promotions', label: 'Promoții și noutăți' },
                    ]},
                    { title: 'Notificări Push', items: [
                      { key: 'push_bookings', label: 'Actualizări rezervări' },
                      { key: 'push_messages', label: 'Mesaje noi' },
                      { key: 'push_offers', label: 'Oferte noi la taskuri' },
                      { key: 'push_reminders', label: 'Remindere programări' },
                    ]},
                    { title: 'SMS', items: [
                      { key: 'sms_bookings', label: 'Confirmări rezervări' },
                      { key: 'sms_reminders', label: 'Remindere importante' },
                    ]},
                  ].map((group) => (
                    <div key={group.title}>
                      <h3 className="font-bold text-gray-800 mb-3">{group.title}</h3>
                      <div className="space-y-3">
                        {group.items.map((item) => (
                          <div key={item.key} className="flex items-center justify-between py-2">
                            <span className="text-sm text-gray-600">{item.label}</span>
                            <button
                              onClick={() => toggleNotif(item.key)}
                              className={`w-11 h-6 rounded-full relative transition-colors ${notifSettings[item.key] ? 'bg-blue-600' : 'bg-gray-200'}`}
                            >
                              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow transition-transform ${notifSettings[item.key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SETĂRI SIGURANȚĂ */}
            {activeSection === 'security' && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                  <h2 className="text-lg font-bold text-gray-800 mb-1">Setări Siguranță</h2>
                  <p className="text-sm text-gray-500 mb-6">Gestionează securitatea contului tău</p>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Lock className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-800">Schimbă Parola</p>
                          <p className="text-xs text-gray-500">Ultima schimbare: acum 30 de zile</p>
                        </div>
                      </div>
                      <button className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-white transition">
                        Schimbă
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-800">Autentificare în 2 Pași (2FA)</p>
                          <p className="text-xs text-gray-500">Adaugă un nivel suplimentar de securitate</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">Dezactivat</span>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Monitor className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-800">Sesiuni Active</p>
                          <p className="text-xs text-gray-500">1 sesiune activă pe acest dispozitiv</p>
                        </div>
                      </div>
                      <button className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-white transition">
                        Gestionează
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        <div>
                          <p className="font-medium text-red-700">Șterge Contul</p>
                          <p className="text-xs text-red-500">Acțiune permanentă și ireversibilă</p>
                        </div>
                      </div>
                      <button className="px-4 py-2 border border-red-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-100 transition">
                        Șterge
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VOUCHERE */}
            {activeSection === 'vouchers' && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-lg font-bold text-gray-800">Voucherele Mele</h2>
                  <p className="text-sm text-gray-500">{mockVouchers.filter(v => !v.used).length} vouchere active</p>
                </div>
                <div className="p-6 space-y-3">
                  {mockVouchers.map((v) => (
                    <div key={v.id} className={`flex items-center justify-between p-4 rounded-xl border-2 border-dashed
                      ${v.used ? 'border-gray-200 bg-gray-50 opacity-60' : 'border-blue-300 bg-blue-50'}
                    `}>
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-bold text-lg
                          ${v.used ? 'bg-gray-200 text-gray-500' : 'bg-blue-600 text-white'}
                        `}>
                          {v.discount}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">{v.code}</p>
                          <p className="text-sm text-gray-500">{v.description}</p>
                          <p className="text-xs text-gray-400 mt-0.5">Expiră: {new Date(v.expires).toLocaleDateString('ro-RO')}</p>
                        </div>
                      </div>
                      {v.used ? (
                        <span className="px-3 py-1 bg-gray-200 text-gray-500 text-xs rounded-full font-medium">Folosit</span>
                      ) : (
                        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
                          Folosește
                        </button>
                      )}
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
                    <p className="text-sm text-gray-500">Gestionează metodele de plată</p>
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
                    <Plus className="w-4 h-4" /> Adaugă Card
                  </button>
                </div>
                <div className="p-6 space-y-3">
                  {mockCards.map((card) => (
                    <div key={card.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xs
                          ${card.type === 'visa' ? 'bg-blue-700' : 'bg-orange-500'}
                        `}>
                          {card.type === 'visa' ? 'VISA' : 'MC'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">•••• •••• •••• {card.last4}</p>
                          <p className="text-xs text-gray-500">Expiră {card.expiry}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {card.isDefault && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">Principal</span>
                        )}
                        <button className="w-8 h-8 rounded-lg hover:bg-gray-200 flex items-center justify-center transition">
                          <Trash2 className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
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
                  {mockReviews.map((review) => (
                    <div key={review.id} className="p-5">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-bold text-gray-800">{review.service}</p>
                          <p className="text-sm text-gray-500">Handyman: {review.handyman}</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map(s => (
                              <Star key={s} className={`w-4 h-4 ${s <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                            ))}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{new Date(review.date).toLocaleDateString('ro-RO')}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{review.text}</p>
                      <div className="flex items-center gap-2 mt-3">
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Publicat</span>
                        <button className="text-xs text-blue-600 font-medium hover:underline">Editează</button>
                        <button className="text-xs text-red-500 font-medium hover:underline">Șterge</button>
                      </div>
                    </div>
                  ))}
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
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Oraș *</label>
                            <input type="text" value={newAddress.city}
                              onChange={(e) => setNewAddress(p => ({ ...p, city: e.target.value }))}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Județ *</label>
                            <input type="text" value={newAddress.county}
                              onChange={(e) => setNewAddress(p => ({ ...p, county: e.target.value }))}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
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
                                {task.urgency === 'emergency' ? 'Urgență' : 'Urgent'}
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
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-lg font-bold text-gray-800">Date Facturare</h2>
                  <p className="text-sm text-gray-500">Informații pentru emiterea facturilor</p>
                </div>
                <div className="p-6 space-y-5">
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                    <p className="text-sm text-yellow-700">
                      Completează datele de facturare dacă ai nevoie de factură fiscală pentru lucrări.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nume / Denumire Firmă</label>
                      <input type="text" placeholder="Nume complet sau firmă"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">CUI / CNP</label>
                      <input type="text" placeholder="CUI firmă sau CNP"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Adresă Facturare</label>
                    <input type="text" placeholder="Adresa completă pentru factură"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Registrul Comerțului</label>
                      <input type="text" placeholder="J00/000/0000"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cont Bancar (IBAN)</label>
                      <input type="text" placeholder="RO00XXXX..."
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  <button className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition">
                    Salvează Datele
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