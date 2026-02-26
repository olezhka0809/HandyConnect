import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { 
  ChevronLeft, ChevronRight, Upload, CheckCircle,
  Building2, Home, Hotel, Store,
  Search, Calendar, Star, Shield, CreditCard, Award
} from 'lucide-react'

const propertyTypes = [
  { value: 'apartment', label: 'Apartament', desc: 'Apartament închiriat sau proprietate', icon: Building2 },
  { value: 'house', label: 'Casă', desc: 'Casă individuală', icon: Home },
  { value: 'townhouse', label: 'Duplex / Triplex', desc: 'Locuință cu mai multe nivele', icon: Hotel },
  { value: 'commercial', label: 'Comercial', desc: 'Birou sau spațiu comercial', icon: Store },
]

const serviceOptions = [
  'Instalații sanitare', 'Instalații Electrice', 'Tâmplărie',
  'Zugrăveli & Vopsitorie', 'Curățenie', 'Grădinărit', 'Reparații generale'
]

const nextSteps = [
  { icon: Search, title: 'Caută handymani în zona ta', desc: 'Folosește căutarea pentru a găsi profesioniști verificați' },
  { icon: Calendar, title: 'Rezervă primul serviciu', desc: 'Programează o întâlnire în doar câteva clickuri' },
  { icon: Star, title: 'Lasă o recenzie', desc: 'Ajută-i pe alții împărtășind experiența ta' },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)
  const [categories, setCategories] = useState([])

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    city: '',
    address: '',
    propertyType: '',
    selectedServices: [],
    avatarFile: null,
    avatarPreview: null,
  })

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }
      setUser(user)
      setFormData(prev => ({
        ...prev,
        firstName: user.user_metadata?.first_name || '',
        lastName: user.user_metadata?.last_name || '',
        phone: user.user_metadata?.phone || '',
      }))

      const { data: cats } = await supabase.from('categories').select('*').eq('is_active', true)
      if (cats) setCategories(cats)
    }
    init()
  }, [navigate])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const toggleService = (serviceName) => {
    setFormData(prev => ({
      ...prev,
      selectedServices: prev.selectedServices.includes(serviceName)
        ? prev.selectedServices.filter(s => s !== serviceName)
        : [...prev.selectedServices, serviceName]
    }))
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFormData(prev => ({
        ...prev,
        avatarFile: file,
        avatarPreview: URL.createObjectURL(file)
      }))
    }
  }

  const saveStep1 = async () => {
    setLoading(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone,
        city: formData.city,
        address: formData.address,
      })
      .eq('id', user.id)
    setLoading(false)
    if (!error) setStep(2)
  }

  const saveStep2 = async () => {
    setLoading(true)
    
    await supabase
      .from('profiles')
      .update({ property_type: formData.propertyType })
      .eq('id', user.id)

    // Șterge preferințele vechi și adaugă cele noi
    await supabase.from('client_categories').delete().eq('client_id', user.id)
    
    if (formData.selectedServices.length > 0) {
      const categoryRows = categories
        .filter(c => formData.selectedServices.includes(c.name))
        .map(c => ({ client_id: user.id, category_id: c.id }))
      
      if (categoryRows.length > 0) {
        await supabase.from('client_categories').insert(categoryRows)
      }
    }

    setLoading(false)
    setStep(3)
  }

  const saveStep3 = async () => {
    setLoading(true)

    if (formData.avatarFile) {
      const fileExt = formData.avatarFile.name.split('.').pop()
      const filePath = `avatars/${user.id}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, formData.avatarFile, { upsert: true })

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath)

        await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('id', user.id)
      }
    }

    await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', user.id)

    setLoading(false)
    setStep(4)
  }

  const completeSetup = () => {
    navigate('/dashboard')
  }

  const totalSteps = 4
  const progress = (step / totalSteps) * 100

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl">
        {/* Logo */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-blue-600">🔧 HandyConnect</h2>
        </div>

        {/* Titlu per step */}
        <div className="text-center mb-6">
          {step === 1 && (
            <>
              <h1 className="text-3xl font-bold text-gray-800">Hai să începem!</h1>
              <p className="text-gray-500 mt-2">Spune-ne câteva lucruri despre tine</p>
            </>
          )}
          {step === 2 && (
            <>
              <h1 className="text-3xl font-bold text-gray-800">Despre proprietatea ta</h1>
              <p className="text-gray-500 mt-2">Ne ajută să te potrivim cu handymanii potriviți</p>
            </>
          )}
          {step === 3 && (
            <>
              <h1 className="text-3xl font-bold text-gray-800">Adaugă o poză de profil</h1>
              <p className="text-gray-500 mt-2">O poză ajută handymanii să te recunoască</p>
            </>
          )}
          {step === 4 && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-800">Totul e gata!</h1>
              <p className="text-gray-500 mt-2">Profilul tău de client este pregătit. Hai să găsim handymani!</p>
            </>
          )}
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>Configurare cont</span>
            <span>Pas {step} din {totalSteps}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Card principal */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

          {/* STEP 1: Date personale */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prenume *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Oleg"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nume *</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Gărnăuțan"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="07xxxxxxxx"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Oraș *</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Timișoara"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresă</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Strada, număr, bloc, apartament"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Proprietate & Servicii */}
          {step === 2 && (
            <div className="space-y-8">
              <div>
                <h3 className="font-bold text-gray-800 mb-4">Ce tip de proprietate ai?</h3>
                <div className="grid grid-cols-2 gap-3">
                  {propertyTypes.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setFormData({ ...formData, propertyType: type.value })}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all
                        ${formData.propertyType === type.value
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                        }
                      `}
                    >
                      <type.icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${formData.propertyType === type.value ? 'text-blue-600' : 'text-gray-400'}`} />
                      <div>
                        <p className={`font-medium ${formData.propertyType === type.value ? 'text-blue-600' : 'text-gray-800'}`}>{type.label}</p>
                        <p className="text-xs text-gray-500">{type.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-bold text-gray-800 mb-1">Ce servicii te interesează?</h3>
                <p className="text-sm text-gray-500 mb-4">Selectează toate cele relevante</p>
                <div className="grid grid-cols-2 gap-3">
                  {(categories.length > 0 ? categories.map(c => c.name) : serviceOptions).map((service) => (
                    <button
                      key={service}
                      onClick={() => toggleService(service)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left text-sm transition-all
                        ${formData.selectedServices.includes(service)
                          ? 'border-blue-600 bg-blue-50 text-blue-600'
                          : 'border-gray-200 text-gray-700 hover:border-blue-300'
                        }
                      `}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0
                        ${formData.selectedServices.includes(service)
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300'
                        }
                      `}>
                        {formData.selectedServices.includes(service) && (
                          <CheckCircle className="w-3 h-3 text-white" />
                        )}
                      </div>
                      {service}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Poză profil */}
          {step === 3 && (
            <div className="text-center space-y-6">
              <div className="w-40 h-40 mx-auto rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
                {formData.avatarPreview ? (
                  <img src={formData.avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Upload foto</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <label className="inline-flex items-center gap-2 px-6 py-2.5 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition font-medium text-gray-700">
                  <Upload className="w-4 h-4" />
                  Alege o poză
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
                <p className="text-sm text-gray-400">
                  {formData.avatarFile ? formData.avatarFile.name : 'Poți sări peste acest pas'}
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: Confirmare */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-gray-800 mb-4">Ce urmează?</h3>
                <div className="space-y-4">
                  {nextSteps.map((item, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{item.title}</p>
                        <p className="text-sm text-gray-500">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-4">
                {[
                  { icon: Shield, label: 'Profesioniști verificați' },
                  { icon: CreditCard, label: 'Plăți sigure' },
                  { icon: Award, label: 'Calitate garantată' },
                ].map((badge) => (
                  <div key={badge.label} className="flex flex-col items-center gap-2 p-3 bg-gray-50 rounded-xl">
                    <badge.icon className="w-5 h-5 text-blue-600" />
                    <span className="text-xs text-gray-600 text-center font-medium">{badge.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Butoane navigare */}
        <div className="flex justify-between mt-6">
          {step > 1 && step < 4 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1 px-5 py-2.5 border border-gray-200 rounded-lg text-gray-600 font-medium hover:bg-gray-50 transition"
            >
              <ChevronLeft className="w-4 h-4" />
              Înapoi
            </button>
          ) : (
            <div />
          )}

          {step === 1 && (
            <button
              onClick={saveStep1}
              disabled={loading || !formData.firstName || !formData.lastName || !formData.phone || !formData.city}
              className="flex items-center gap-1 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
            >
              {loading ? 'Se salvează...' : 'Continuă'}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {step === 2 && (
            <button
              onClick={saveStep2}
              disabled={loading}
              className="flex items-center gap-1 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Se salvează...' : 'Continuă'}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {step === 3 && (
            <button
              onClick={saveStep3}
              disabled={loading}
              className="flex items-center gap-1 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Se salvează...' : 'Continuă'}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {step === 4 && (
            <button
              onClick={completeSetup}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition ml-auto"
            >
              Finalizează configurarea
            </button>
          )}
        </div>
      </div>
    </div>
  )
}