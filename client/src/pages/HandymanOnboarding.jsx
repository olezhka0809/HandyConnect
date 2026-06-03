import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import CityAutocomplete from '../components/CityAutocomplete'
import ScheduleEditor, { EMPTY_SCHEDULE } from '../components/ScheduleEditor'
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


const workRadiusOptions = [
  'Sub 5 km', 'Sub 10 km', 'Sub 15 km', 'Sub 25 km', 'Sub 50 km', 'Peste 50 km'
]

const daysOfWeek = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică']

export default function HandymanOnboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)
  const [dbSkills, setDbSkills] = useState([])

  const RISK_BADGE = {
    low:    { label: 'Scăzut',  cls: 'bg-green-100 text-green-700 border-green-200' },
    medium: { label: 'Mediu',   cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    high:   { label: 'Ridicat', cls: 'bg-red-100 text-red-700 border-red-200' },
  }

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: '',
    county: '',
    experience: '',
    services: [],
    bio: '',
    workRadius: 'Sub 15 km',
    certifications: '',
    availableDays: [],
    schedule: EMPTY_SCHEDULE,
    travelBuffer: 30,
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

      const [profileRes, hpRes, skillsRes, userSkillsRes] = await Promise.all([
        supabase.from('profiles').select('first_name, last_name, phone, city, county, onboarding_completed').eq('id', user.id).single(),
        supabase.from('handyman_profiles').select('experience_years, specialties, bio, work_radius, certifications, has_insurance, background_check_consent, onboarding_step').eq('user_id', user.id).maybeSingle(),
        supabase.from('skills').select('id, name, category, risk_level, requires_certificate').eq('is_active', true).order('category').order('name'),
        supabase.from('user_skills').select('skill_id').eq('user_id', user.id),
      ])

      if (profileRes.data?.onboarding_completed) { navigate('/handyman/dashboard'); return }

      const p  = profileRes.data
      const hp = hpRes.data

      const savedStep = hp?.onboarding_step ?? 0
      if (savedStep > 0) setStep(Math.min(savedStep + 1, 5))

      setForm(prev => ({
        ...prev,
        firstName:        p?.first_name  || user.user_metadata?.first_name || '',
        lastName:         p?.last_name   || user.user_metadata?.last_name  || '',
        email:            user.email     || '',
        phone:            p?.phone       || user.user_metadata?.phone      || '',
        city:             p?.city        || '',
        county:           p?.county      || '',
        experience:       (() => {
          const inv = { 0:'entry', 2:'junior', 4:'mid', 7:'senior', 12:'expert' }
          return inv[hp?.experience_years] || ''
        })(),
        services:         userSkillsRes.data?.map(us => us.skill_id) || [],
        bio:              hp?.bio               || '',
        workRadius:       hp?.work_radius       || 'Sub 15 km',
        certifications:   hp?.certifications    || '',
        hasInsurance:     hp?.has_insurance              ?? false,
        consentBackground: hp?.background_check_consent ?? false,
      }))

      if (skillsRes.data) setDbSkills(skillsRes.data)
    }
    init()
  }, [navigate])

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const toggleService = (skillId) => {
    setForm(prev => ({
      ...prev,
      services: prev.services.includes(skillId)
        ? prev.services.filter(id => id !== skillId)
        : [...prev.services, skillId]
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
      county: form.county,
    }).eq('id', user.id)

    const EXP_YEARS = { entry: 0, junior: 2, mid: 4, senior: 7, expert: 12 }
    const expYears = EXP_YEARS[form.experience] ?? null

    await supabase.from('handyman_profiles').update({
      ...(expYears !== null && { experience_years: expYears }),
      onboarding_step: 1,
    }).eq('user_id', user.id)

    setLoading(false)
    setStep(2)
  }

  const saveStep2 = async () => {
    setLoading(true)

    const { data: existing } = await supabase
      .from('user_skills').select('skill_id').eq('user_id', user.id)
    const existingIds = new Set(existing?.map(s => s.skill_id) || [])
    const newIds = form.services.filter(id => !existingIds.has(id))

    if (newIds.length > 0) {
      await supabase.from('user_skills').insert(
        newIds.map(skillId => ({ user_id: user.id, skill_id: skillId, status: 'draft' }))
      )
    }

    const selectedNames = dbSkills.filter(s => form.services.includes(s.id)).map(s => s.name)
    await supabase.from('handyman_profiles').update({
      specialties: selectedNames,
      onboarding_step: 2,
    }).eq('user_id', user.id)

    setLoading(false)
    setStep(3)
  }

  const saveStep3 = async () => {
    setLoading(true)
    await supabase.from('handyman_profiles').update({
      bio: form.bio,
      work_radius: form.workRadius,
      certifications: form.certifications,
      onboarding_step: 3,
    }).eq('user_id', user.id)
    setLoading(false)
    setStep(4)
  }

  const saveStep4 = async () => {
    setLoading(true)
    await supabase.from('handyman_schedule').upsert({
      handyman_id: user.id,
      schedule: form.schedule,
      travel_buffer_min: form.travelBuffer,
    }, { onConflict: 'handyman_id' })

    const activeDays = Object.entries(form.schedule)
      .filter(([, slots]) => slots.length > 0)
      .map(([day]) => day)
    await supabase.from('handyman_profiles').update({
      available_days: activeDays,
      has_insurance: form.hasInsurance,
      background_check_consent: form.consentBackground,
      onboarding_step: 4,
    }).eq('user_id', user.id)

    setLoading(false)
    setStep(5)
  }

  const skipStep3 = async () => {
    await supabase.from('handyman_profiles').update({ onboarding_step: 3 }).eq('user_id', user.id)
    setStep(4)
  }

  const finishOnboarding = async (uploadPhoto = true) => {
    setLoading(true)
    if (uploadPhoto && form.avatarFile) {
      const fileExt = form.avatarFile.name.split('.').pop()
      const filePath = `avatars/${user.id}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('avatars').upload(filePath, form.avatarFile, { upsert: true })
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
        await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
      }
    }
    await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user.id)
    await supabase.from('handyman_profiles').update({ onboarding_step: 5 }).eq('user_id', user.id)
    setLoading(false)
    navigate('/handyman/dashboard')
  }

  const saveStep5 = () => finishOnboarding(true)
  const skipStep5 = () => finishOnboarding(false)

  const totalSteps = 5
  const progress = (step / totalSteps) * 100

  const titles = {
    1: { title: 'Bine ai venit la HandyConnect!', subtitle: 'Hai să-ți configurăm profilul profesional' },
    2: { title: 'Ce skill-uri oferi?', subtitle: 'Selectează minim 1 skill — vei adăuga dovezi din profil' },
    3: { title: 'Povestește despre tine', subtitle: 'O biografie bună ajută clienții să te aleagă' },
    4: { title: 'Setează disponibilitatea', subtitle: 'Când ești de obicei disponibil pentru lucru?' },
    5: { title: 'Adaugă o poză de profil', subtitle: 'O poză profesională crește încrederea clienților' },
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
                  <label className="block text-sm font-bold text-gray-800 mb-1">Prenume *</label>
                  <input type="text" value={form.firstName} onChange={(e) => update('firstName', e.target.value)}
                    placeholder="Prenumele tău" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-1">Nume *</label>
                  <input type="text" value={form.lastName} onChange={(e) => update('lastName', e.target.value)}
                    placeholder="Numele tău" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-1">Email *</label>
                  <input type="email" value={form.email} disabled
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-1">Telefon *</label>
                  <input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)}
                    placeholder="+40 7XX XXX XXX" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1">Locație *</label>
                <CityAutocomplete
                  value={form.city ? `${form.city}${form.county ? ', ' + form.county : ''}` : ''}
                  onChange={(city) => setForm(prev => ({ ...prev, city: city.name, county: city.county }))}
                  placeholder="Exemplu: Timișoara"
                />
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

          {/* STEP 2: Skills */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                <strong>Notă:</strong> Skill-urile selectate vor fi în așteptare până când uploadezi dovezi din profilul tău. Până la aprobare nu poți prelua taskuri pe baza lor.
              </div>

              {Object.entries(
                dbSkills.reduce((acc, skill) => {
                  const cat = skill.category || 'Altele'
                  if (!acc[cat]) acc[cat] = []
                  acc[cat].push(skill)
                  return acc
                }, {})
              ).map(([category, skills]) => (
                <div key={category}>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{category}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {skills.map((skill) => {
                      const selected = form.services.includes(skill.id)
                      const risk = RISK_BADGE[skill.risk_level] ?? RISK_BADGE.low
                      return (
                        <button
                          key={skill.id}
                          onClick={() => toggleService(skill.id)}
                          className={`flex flex-col gap-1.5 px-3 py-3 rounded-xl border-2 text-left text-sm transition-all
                            ${selected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 text-gray-700 hover:border-blue-300'}
                          `}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0
                              ${selected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}
                            `}>
                              {selected && <CheckCircle className="w-2.5 h-2.5 text-white" />}
                            </div>
                            <span className={`font-medium text-xs leading-tight ${selected ? 'text-blue-700' : 'text-gray-800'}`}>
                              {skill.name}
                            </span>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full border w-fit ${risk.cls}`}>
                            {risk.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}

              {form.services.length > 0 && (
                <p className="text-sm text-blue-600 font-medium">{form.services.length} skill-uri selectate</p>
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

          {/* STEP 4: Schedule */}
          {step === 4 && (
            <div className="space-y-5">
              <ScheduleEditor
                schedule={form.schedule}
                travelBuffer={form.travelBuffer}
                onChange={(sched, buf) => setForm(p => ({ ...p, schedule: sched, travelBuffer: buf }))}
                compact
              />

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

        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          {step > 1 ? (
            <button onClick={() => setStep(step - 1)}
              className="flex items-center gap-1 px-5 py-2.5 border border-gray-200 rounded-lg text-gray-600 font-medium hover:bg-gray-50 transition">
              <ChevronLeft className="w-4 h-4" /> Înapoi
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            {step === 3 && (
              <button onClick={skipStep3} disabled={loading}
                className="px-5 py-2.5 border border-gray-200 rounded-lg text-gray-500 text-sm font-medium hover:bg-gray-50 transition">
                Sari peste
              </button>
            )}
            {step === 5 && (
              <button onClick={skipStep5} disabled={loading}
                className="px-5 py-2.5 border border-gray-200 rounded-lg text-gray-500 text-sm font-medium hover:bg-gray-50 transition">
                Sari peste
              </button>
            )}

            {step === 1 && (
              <button onClick={saveStep1}
                disabled={loading || !form.firstName || !form.lastName || !form.phone || !form.city}
                className="flex items-center gap-1 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
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
              <button onClick={saveStep3} disabled={loading}
                className="flex items-center gap-1 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Se salvează...' : 'Continuă'} <ChevronRight className="w-4 h-4" />
              </button>
            )}
            {step === 4 && (
              <button onClick={saveStep4}
                disabled={loading || Object.values(form.schedule).every(s => s.length === 0)}
                className="flex items-center gap-1 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Se salvează...' : 'Continuă'} <ChevronRight className="w-4 h-4" />
              </button>
            )}
            {step === 5 && (
              <button onClick={saveStep5} disabled={loading}
                className="flex items-center gap-1 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Se salvează...' : 'Finalizează'} <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
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