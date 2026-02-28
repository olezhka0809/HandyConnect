import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import logo from '../assets/Logo_pin.png'
import {
  ChevronLeft, ChevronRight, Upload, CheckCircle, Camera,
  Shield, UserCheck, Wrench
} from 'lucide-react'

const experienceLevels = [
  { value: 'entry', label: 'Începător (< 1 an)' },
  { value: 'junior', label: 'Junior (1-3 ani)' },
  { value: 'mid', label: 'Intermediar (3-5 ani)' },
  { value: 'senior', label: 'Senior (5-10 ani)' },
  { value: 'expert', label: 'Expert (10+ ani)' },
]

const serviceOptions = [
  'Reparații Generale', 'Tâmplărie', 'Instalații Electrice',
  'Instalații Sanitare', 'Montaj Mobilă', 'Zugrăveli & Vopsitorie',
  'Montaj/Asamblare', 'Grădinărit',
]

const workRadiusOptions = [
  'Sub 5 km', 'Sub 10 km', 'Sub 15 km', 'Sub 25 km', 'Sub 50 km', 'Peste 50 km'
]

const daysOfWeek = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică']

export default function HandymanOnboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: '',
    experience: '',
    services: [],
    bio: '',
    workRadius: 'Sub 15 km',
    certifications: '',
    availableDays: [],
    hasInsurance: false,
    consentBackground: false,
    avatarFile: null,
    avatarPreview: null,
  })

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }
      setUser(user)
      setForm(prev => ({
        ...prev,
        firstName: user.user_metadata?.first_name || '',
        lastName: user.user_metadata?.last_name || '',
        email: user.email || '',
        phone: user.user_metadata?.phone || '',
      }))
    }
    init()
  }, [navigate])

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const toggleService = (service) => {
    setForm(prev => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter(s => s !== service)
        : [...prev.services, service]
    }))
  }

  const toggleDay = (day) => {
    setForm(prev => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter(d => d !== day)
        : [...prev.availableDays, day]
    }))
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setForm(prev => ({ ...prev, avatarFile: file, avatarPreview: URL.createObjectURL(file) }))
    }
  }

  const saveStep1 = async () => {
    setLoading(true)
    await supabase.from('profiles').update({
      first_name: form.firstName,
      last_name: form.lastName,
      phone: form.phone,
      city: form.city,
    }).eq('id', user.id)

    await supabase.from('handyman_profiles').update({
      experience_years: form.experience,
    }).eq('id', user.id)

    setLoading(false)
    setStep(2)
  }

  const saveStep2 = async () => {
    setLoading(true)
    await supabase.from('handyman_profiles').update({
      specialties: form.services,
    }).eq('id', user.id)
    setLoading(false)
    setStep(3)
  }

  const saveStep3 = async () => {
    setLoading(true)
    await supabase.from('handyman_profiles').update({
      bio: form.bio,
      work_radius: form.workRadius,
      certifications: form.certifications,
    }).eq('id', user.id)
    setLoading(false)
    setStep(4)
  }

  const saveStep4 = async () => {
    setLoading(true)
    await supabase.from('handyman_profiles').update({
      available_days: form.availableDays,
      has_insurance: form.hasInsurance,
      background_check_consent: form.consentBackground,
    }).eq('id', user.id)
    setLoading(false)
    setStep(5)
  }

  const saveStep5 = async () => {
    setLoading(true)
    if (form.avatarFile) {
      const fileExt = form.avatarFile.name.split('.').pop()
      const filePath = `avatars/${user.id}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, form.avatarFile, { upsert: true })
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
        await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
      }
    }
    await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user.id)
    await supabase.from('handyman_profiles').update({ status: 'pending_review' }).eq('id', user.id)
    setLoading(false)
    setStep(6)
  }

  const totalSteps = 6
  const progress = (step / totalSteps) * 100

  const titles = {
    1: { title: 'Bine ai venit la HandyConnect!', subtitle: 'Hai să-ți configurăm profilul profesional' },
    2: { title: 'Ce servicii oferi?', subtitle: 'Selectează specialitățile și setează-ți tarifele' },
    3: { title: 'Povestește despre tine', subtitle: 'O biografie bună ajută clienții să te aleagă' },
    4: { title: 'Setează disponibilitatea', subtitle: 'Când ești de obicei disponibil pentru lucru?' },
    5: { title: 'Adaugă o poză de profil', subtitle: 'O poză profesională crește încrederea clienților' },
    6: { title: 'Profil trimis!', subtitle: 'Profilul tău este în curs de verificare. Te vom notifica odată ce este aprobat.' },
  }

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
          {step === 6 && (
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          )}
          <h1 className="text-3xl font-bold text-gray-800">{titles[step].title}</h1>
          <p className="text-gray-500 mt-2">{titles[step].subtitle}</p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>Configurare Handyman</span>
            <span>Pas {step} din {totalSteps}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

          {/* STEP 1: Personal Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-1">Nume *</label>
                  <input type="text" value={form.firstName} onChange={(e) => update('firstName', e.target.value)}
                    placeholder="Prenumele tău" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-1">Email *</label>
                  <input type="email" value={form.email} disabled
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-1">Telefon *</label>
                  <input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)}
                    placeholder="+40 7XX XXX XXX" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-1">Parolă *</label>
                  <input type="password" disabled value="••••••••"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500" />
                  <p className="text-xs text-gray-400 mt-1">Setată la înregistrare</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1">Locație *</label>
                <input type="text" value={form.city} onChange={(e) => update('city', e.target.value)}
                  placeholder="Orașul sau codul poștal" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1">Ani de experiență</label>
                <select value={form.experience} onChange={(e) => update('experience', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Selectează nivelul de experiență</option>
                  {experienceLevels.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* STEP 2: Services */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {serviceOptions.map((service) => (
                  <button
                    key={service}
                    onClick={() => toggleService(service)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left text-sm transition-all
                      ${form.services.includes(service)
                        ? 'border-blue-600 bg-blue-50 text-blue-600'
                        : 'border-gray-200 text-gray-700 hover:border-blue-300'
                      }
                    `}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0
                      ${form.services.includes(service) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}
                    `}>
                      {form.services.includes(service) && <CheckCircle className="w-3 h-3 text-white" />}
                    </div>
                    {service}
                  </button>
                ))}
              </div>
              {form.services.length > 0 && (
                <p className="text-sm text-blue-600 font-medium">{form.services.length} servicii selectate</p>
              )}
            </div>
          )}

          {/* STEP 3: Bio & Details */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">Biografie profesională</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => update('bio', e.target.value)}
                  placeholder="Descrie experiența și abilitățile tale..."
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">{form.bio.length}/500 caractere</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">Rază de lucru</label>
                <select value={form.workRadius} onChange={(e) => update('workRadius', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {workRadiusOptions.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">Certificări și licențe</label>
                <textarea
                  value={form.certifications}
                  onChange={(e) => update('certifications', e.target.value)}
                  placeholder="Listează certificările, cursurile sau licențele relevante..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
          )}

          {/* STEP 4: Availability */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-gray-800 mb-3">Zile disponibile</h3>
                <div className="grid grid-cols-4 gap-2">
                  {daysOfWeek.map((day) => (
                    <button
                      key={day}
                      onClick={() => toggleDay(day)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm transition-all
                        ${form.availableDays.includes(day)
                          ? 'border-blue-600 bg-blue-50 text-blue-600'
                          : 'border-gray-200 text-gray-700 hover:border-blue-300'
                        }
                      `}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0
                        ${form.availableDays.includes(day) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}
                      `}>
                        {form.availableDays.includes(day) && <CheckCircle className="w-3 h-3 text-white" />}
                      </div>
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => update('hasInsurance', !form.hasInsurance)}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all
                  ${form.hasInsurance ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}
                `}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center
                  ${form.hasInsurance ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}
                `}>
                  {form.hasInsurance && <CheckCircle className="w-3 h-3 text-white" />}
                </div>
                <div>
                  <p className="font-medium text-gray-800">Am asigurare de răspundere civilă</p>
                  <p className="text-xs text-gray-500">Crește încrederea clienților</p>
                </div>
              </button>

              <button
                onClick={() => update('consentBackground', !form.consentBackground)}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all
                  ${form.consentBackground ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}
                `}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center
                  ${form.consentBackground ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}
                `}>
                  {form.consentBackground && <CheckCircle className="w-3 h-3 text-white" />}
                </div>
                <div>
                  <p className="font-medium text-gray-800">Consimt la verificarea de background</p>
                  <p className="text-xs text-gray-500">Necesar pentru verificarea pe platformă</p>
                </div>
              </button>
            </div>
          )}

          {/* STEP 5: Profile Photo */}
          {step === 5 && (
            <div className="text-center space-y-6">
              <div className="w-40 h-40 mx-auto rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
                {form.avatarPreview ? (
                  <img src={form.avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Upload foto</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <label className="inline-flex items-center gap-2 px-6 py-2.5 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition font-medium text-gray-700">
                  <Camera className="w-4 h-4" />
                  Alege o poză
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                </label>
                <p className="text-sm text-gray-400">
                  {form.avatarFile ? form.avatarFile.name : 'Poți sări peste acest pas'}
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-5 text-left">
                <h4 className="font-bold text-gray-800 mb-3">Sfaturi pentru poză:</h4>
                <ul className="space-y-1.5 text-sm text-gray-600">
                  <li>• Folosește o poză recentă, clară, tip headshot</li>
                  <li>• Zâmbește și arată profesional</li>
                  <li>• Iluminare bună și fundal simplu</li>
                  <li>• Evită pozele de grup sau cu ochelari de soare</li>
                </ul>
              </div>
            </div>
          )}

          {/* STEP 6: Submitted */}
          {step === 6 && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="font-bold text-gray-800 mb-4">Ce urmează?</h3>
                <div className="space-y-4">
                  {[
                    { num: 1, title: 'Verificare profil (24-48 ore)', desc: 'Vom verifica informațiile și vom face verificarea de background' },
                    { num: 2, title: 'Activare cont', desc: 'Vei primi confirmarea pe email când ești aprobat' },
                    { num: 3, title: 'Începi să primești rezervări', desc: 'Profilul tău va fi live și clienții te vor putea găsi' },
                  ].map((item) => (
                    <div key={item.num} className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
                        {item.num}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{item.title}</p>
                        <p className="text-sm text-gray-500">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                <h4 className="font-bold text-blue-800 mb-2">Între timp...</h4>
                <ul className="space-y-1.5 text-sm text-blue-700">
                  <li>• Completează-ți profilul cu exemple de lucrări</li>
                  <li>• Configurează preferințele de plată</li>
                  <li>• Citește ghidul de succes pentru handymani</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          {step > 1 && step < 6 ? (
            <button onClick={() => setStep(step - 1)}
              className="flex items-center gap-1 px-5 py-2.5 border border-gray-200 rounded-lg text-gray-600 font-medium hover:bg-gray-50 transition">
              <ChevronLeft className="w-4 h-4" /> Înapoi
            </button>
          ) : step === 6 ? (
            <button onClick={() => setStep(step - 1)}
              className="flex items-center gap-1 px-5 py-2.5 border border-gray-200 rounded-lg text-gray-600 font-medium hover:bg-gray-50 transition">
              <ChevronLeft className="w-4 h-4" /> Înapoi
            </button>
          ) : (
            <div />
          )}

          {step === 1 && (
            <button onClick={saveStep1}
              disabled={loading || !form.firstName || !form.phone || !form.city}
              className="flex items-center gap-1 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed ml-auto">
              {loading ? 'Se salvează...' : 'Continuă'} <ChevronRight className="w-4 h-4" />
            </button>
          )}
          {step === 2 && (
            <button onClick={saveStep2}
              disabled={loading || form.services.length === 0}
              className="flex items-center gap-1 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Se salvează...' : 'Continuă'} <ChevronRight className="w-4 h-4" />
            </button>
          )}
          {step === 3 && (
            <button onClick={saveStep3}
              disabled={loading}
              className="flex items-center gap-1 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Se salvează...' : 'Continuă'} <ChevronRight className="w-4 h-4" />
            </button>
          )}
          {step === 4 && (
            <button onClick={saveStep4}
              disabled={loading}
              className="flex items-center gap-1 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Se salvează...' : 'Continuă'} <ChevronRight className="w-4 h-4" />
            </button>
          )}
          {step === 5 && (
            <button onClick={saveStep5}
              disabled={loading}
              className="flex items-center gap-1 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Se salvează...' : 'Continuă'} <ChevronRight className="w-4 h-4" />
            </button>
          )}
          {step === 6 && (
            <button onClick={() => navigate('/dashboard')}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition">
              Finalizează Configurarea
            </button>
          )}
        </div>

        {step === 1 && (
          <p className="text-center text-sm text-gray-500 mt-6">
            Ai deja un cont? <a href="/login" className="text-blue-600 font-medium hover:underline">Autentifică-te</a>
          </p>
        )}
      </div>
    </div>
  )
}