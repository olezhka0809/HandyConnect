import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import logo from '../assets/Logo_pin.png'
import {
  ChevronLeft, ChevronRight, Camera, CheckCircle,
  Clock, MapPin, AlertTriangle, Zap, Phone, Mail,
  CreditCard, Shield, Star, Info
} from 'lucide-react'

const serviceOptions = [
  { name: 'Instalare Iluminat', rate: '90 RON/oră' },
  { name: 'Montaj Tablou Electric', rate: '120 RON/oră' },
  { name: 'Recablare Completă', rate: '220 RON/oră' },
  { name: 'Reparații Electrice', rate: '80 RON/oră' },
]

const durationOptions = [
  'Sub 1 oră', '1-2 ore', '2-4 ore', '4-8 ore', '1-2 zile', 'Peste 2 zile'
]

const timeSlots = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'
]

const additionalServices = [
  'Curățenie după lucrare',
  'Eliminare materiale vechi',
  'Finalizare în aceeași zi',
  'Disponibilitate weekend',
  'Garanție extinsă',
  'Documentație foto',
]

export default function BookService() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [showSuccess, setShowSuccess] = useState(false)

  const handymanName = slug ? slug.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ') : 'Handyman'

  const [form, setForm] = useState({
    service: '',
    description: '',
    duration: '',
    photos: [],
    date: '',
    time: '',
    urgency: 'normal',
    address: '',
    accessInstructions: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    contactMethod: 'phone',
    specialInstructions: '',
    additionalServices: [],
    paymentMethod: 'card',
    cardNumber: '',
    cardExpiry: '',
    cardCvv: '',
    billingAddress: '',
    insuranceRequired: false,
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
          address: data.address || '',
          billingAddress: data.address || '',
        }))
      }
    }
    loadUser()
  }, [navigate])

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const toggleAdditional = (service) => {
    setForm(prev => ({
      ...prev,
      additionalServices: prev.additionalServices.includes(service)
        ? prev.additionalServices.filter(s => s !== service)
        : [...prev.additionalServices, service]
    }))
  }

  const selectedService = serviceOptions.find(s => s.name === form.service)
  const rateNum = selectedService ? parseInt(selectedService.rate) : 0
  const hours = form.duration === 'Sub 1 oră' ? 1 : form.duration === '1-2 ore' ? 2 : form.duration === '2-4 ore' ? 3 : form.duration === '4-8 ore' ? 6 : 8
  const subtotal = rateNum * hours
  const serviceFee = Math.round(subtotal * 0.1)
  const total = subtotal + serviceFee

  const handleSubmit = async () => {
    setLoading(true)
    // Salvăm în Supabase (simplificat)
    const { error } = await supabase.from('bookings').insert({
      client_id: user.id,
      handyman_id: user.id, // placeholder - va fi ID-ul real al handymanului
      service_name: form.service,
      description: form.description,
      estimated_duration: form.duration,
      urgency: form.urgency,
      preferred_date: form.date || null,
      preferred_time: form.time,
      service_address: form.address,
      access_instructions: form.accessInstructions,
      contact_name: form.contactName,
      contact_email: form.contactEmail,
      contact_phone: form.contactPhone,
      contact_method: form.contactMethod,
      special_instructions: form.specialInstructions,
      additional_services: form.additionalServices,
      payment_method: form.paymentMethod,
      subtotal,
      service_fee: serviceFee,
      total,
      status: 'pending',
    })
    setLoading(false)
    if (!error) setShowSuccess(true)
  }

  const totalSteps = 5
  const progress = (step / totalSteps) * 100

  const titles = {
    1: { title: 'Detalii Serviciu', subtitle: 'Spune-ne cu ce ai nevoie de ajutor' },
    2: { title: 'Programare & Locație', subtitle: 'Când și unde trebuie efectuată lucrarea?' },
    3: { title: 'Informații de Contact', subtitle: 'Cum te poate contacta handymanul?' },
    4: { title: 'Informații Plată', subtitle: 'Procesare sigură a plății' },
    5: { title: 'Verifică & Confirmă', subtitle: 'Verifică detaliile rezervării tale' },
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
          <h1 className="text-3xl font-bold text-gray-800">{titles[step].title}</h1>
          <p className="text-gray-500 mt-2">{titles[step].subtitle}</p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>Rezervare serviciu</span>
            <span>Pas {step} din {totalSteps}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

          {/* STEP 1: Service Details */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-gray-800 mb-3">Selectează serviciul</h3>
                <div className="space-y-2">
                  {serviceOptions.map((service) => (
                    <button
                      key={service.name}
                      onClick={() => update('service', service.name)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border-2 text-left transition-all
                        ${form.service === service.name ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
                          ${form.service === service.name ? 'border-blue-600' : 'border-gray-300'}
                        `}>
                          {form.service === service.name && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />}
                        </div>
                        <span className={`font-medium ${form.service === service.name ? 'text-blue-600' : 'text-gray-800'}`}>
                          {service.name}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">De la {service.rate}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">Descriere detaliată</label>
                <textarea
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  placeholder="Oferă detalii despre lucrarea necesară, inclusiv cerințe specifice sau provocări..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">Durată estimată</label>
                <select
                  value={form.duration}
                  onChange={(e) => update('duration', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selectează durata estimată</option>
                  {durationOptions.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1">Aceasta e doar o estimare. Facturarea finală se bazează pe timpul real.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1">Adaugă poze (opțional)</label>
                <p className="text-xs text-gray-500 mb-2">Ajută handymanul să înțeleagă mai bine lucrarea</p>
                <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 transition">
                  <Camera className="w-6 h-6 text-gray-400" />
                  <span className="text-xs text-gray-400 mt-1">Adaugă</span>
                  <input type="file" accept="image/*" className="hidden" multiple />
                </label>
              </div>
            </div>
          )}

          {/* STEP 2: Schedule & Location */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">Selectează data</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => update('date', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">Ora preferată</label>
                  <select
                    value={form.time}
                    onChange={(e) => update('time', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Alege intervalul</option>
                    {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-gray-800 mb-3">Nivel de urgență</h3>
                <div className="space-y-2">
                  {[
                    { value: 'normal', icon: Clock, label: 'Normal', desc: 'Programare standard, fără grabă', color: '' },
                    { value: 'urgent', icon: Zap, label: 'Urgent', desc: 'Finalizare în 24-48 ore (+15% taxă)', color: 'text-yellow-600' },
                    { value: 'emergency', icon: AlertTriangle, label: 'Urgență', desc: 'Atenție imediată necesară (+30% taxă)', color: 'text-red-600' },
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

              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">Adresa lucrării</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => update('address', e.target.value)}
                    placeholder="Introdu adresa unde se va efectua lucrarea"
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">Instrucțiuni de acces</label>
                <textarea
                  value={form.accessInstructions}
                  onChange={(e) => update('accessInstructions', e.target.value)}
                  placeholder="Cum ar trebui să acceseze proprietatea? (ex: ușa din față, cod poartă, locație cheie, etc.)"
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">Email *</label>
                  <input
                    type="email"
                    value={form.contactEmail}
                    onChange={(e) => update('contactEmail', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  placeholder="Adaugă orice informații suplimentare de care handymanul ar trebui să țină cont..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <h3 className="font-bold text-gray-800 mb-1">Servicii adiționale</h3>
                <p className="text-xs text-gray-500 mb-3">Selectează orice servicii suplimentare de care ai nevoie</p>
                <div className="grid grid-cols-2 gap-2">
                  {additionalServices.map((service) => (
                    <button
                      key={service}
                      onClick={() => toggleAdditional(service)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left text-sm transition-all
                        ${form.additionalServices.includes(service)
                          ? 'border-blue-600 bg-blue-50 text-blue-600'
                          : 'border-gray-200 text-gray-700 hover:border-blue-300'
                        }
                      `}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0
                        ${form.additionalServices.includes(service) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}
                      `}>
                        {form.additionalServices.includes(service) && <CheckCircle className="w-3 h-3 text-white" />}
                      </div>
                      {service}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => update('insuranceRequired', !form.insuranceRequired)}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all
                  ${form.insuranceRequired ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}
                `}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center
                  ${form.insuranceRequired ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}
                `}>
                  {form.insuranceRequired && <CheckCircle className="w-3 h-3 text-white" />}
                </div>
                <div>
                  <p className="font-medium text-gray-800">Solicită dovada asigurării</p>
                  <p className="text-xs text-gray-500">Solicită handymanului documentația de asigurare actuală</p>
                </div>
              </button>
            </div>
          )}

          {/* STEP 4: Payment */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="font-bold text-gray-800 mb-4">Sumar Rezervare</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Serviciu:</span><span className="font-medium">{form.service || '-'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Durată:</span><span className="font-medium">{form.duration || '-'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Tarif:</span><span className="font-medium">{selectedService?.rate || '-'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Data & Ora:</span><span className="font-medium">{form.date ? `${form.date}, ${form.time}` : '-'}</span></div>
                  <div className="border-t border-gray-200 my-3" />
                  <div className="flex justify-between"><span className="text-gray-500">Subtotal:</span><span className="font-medium">{subtotal} RON</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Taxă serviciu (10%):</span><span className="text-gray-400">{serviceFee} RON</span></div>
                  <div className="border-t border-gray-200 my-3" />
                  <div className="flex justify-between text-lg"><span className="font-bold text-gray-800">Total:</span><span className="font-bold text-blue-600">{total} RON</span></div>
                </div>
              </div>

              <div className="space-y-2">
                {['card', 'paypal'].map((method) => (
                  <button
                    key={method}
                    onClick={() => update('paymentMethod', method)}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all
                      ${form.paymentMethod === method ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}
                    `}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
                      ${form.paymentMethod === method ? 'border-blue-600' : 'border-gray-300'}
                    `}>
                      {form.paymentMethod === method && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />}
                    </div>
                    <CreditCard className="w-5 h-5 text-gray-400" />
                    <span className="font-medium text-gray-800">{method === 'card' ? 'Card Credit/Debit' : 'PayPal'}</span>
                  </button>
                ))}
              </div>

              {form.paymentMethod === 'card' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-2">Număr card</label>
                    <input
                      type="text"
                      value={form.cardNumber}
                      onChange={(e) => update('cardNumber', e.target.value)}
                      placeholder="1234 5678 9012 3456"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-800 mb-2">Data expirare</label>
                      <input type="text" value={form.cardExpiry} onChange={(e) => update('cardExpiry', e.target.value)} placeholder="MM/YY" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-800 mb-2">CVV</label>
                      <input type="text" value={form.cardCvv} onChange={(e) => update('cardCvv', e.target.value)} placeholder="123" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-2">Adresă facturare</label>
                    <input type="text" value={form.billingAddress} onChange={(e) => update('billingAddress', e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-blue-800 text-sm">Protecție plată</p>
                    <p className="text-xs text-blue-600">Plata ta este reținută în siguranță până la finalizarea lucrării. Poți solicita rambursare dacă serviciul nu corespunde așteptărilor.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Review & Confirm */}
          {step === 5 && (
            <div className="space-y-6">
              {/* Handyman info */}
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  {handymanName.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="font-bold text-gray-800">{handymanName}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    <span>4.9 · 234 lucrări</span>
                  </div>
                </div>
                <span className="ml-auto px-2.5 py-1 bg-blue-100 text-blue-600 text-xs font-medium rounded-full">Verificat</span>
              </div>

              {/* Service Details */}
              <div className="bg-gray-50 rounded-xl p-5">
                <h4 className="font-bold text-gray-800 mb-3">Detalii Serviciu</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500">Serviciu:</span></div><div className="font-medium text-right">{form.service}</div>
                  <div><span className="text-gray-500">Durată:</span></div><div className="font-medium text-right">{form.duration}</div>
                  <div><span className="text-gray-500">Data & Ora:</span></div><div className="font-medium text-right">{form.date}, {form.time}</div>
                  <div><span className="text-gray-500">Locație:</span></div><div className="font-medium text-right">{form.address}</div>
                </div>
                {form.description && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Descriere:</p>
                    <p className="text-sm text-gray-600">{form.description}</p>
                  </div>
                )}
              </div>

              {/* Contact + Payment */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-bold text-gray-800 mb-2 text-sm">Informații contact</h4>
                  <div className="space-y-1.5 text-sm text-gray-600">
                    <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" />{form.contactPhone}</div>
                    <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" />{form.contactEmail}</div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-bold text-gray-800 mb-2 text-sm">Plată</h4>
                  <div className="space-y-1.5 text-sm text-gray-600">
                    <div>Metodă: <span className="font-medium">{form.paymentMethod === 'card' ? 'Card' : 'PayPal'}</span></div>
                    <div>Total: <span className="font-bold text-blue-600">{total} RON</span></div>
                  </div>
                </div>
              </div>

              {/* Guarantees */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
                {[
                  'Plata va fi reținută în siguranță până la finalizarea lucrării',
                  'Poți anula sau reprograma cu până la 24h înainte',
                  'Toate lucrările sunt acoperite de garanția noastră de satisfacție',
                ].map((text, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>{text}</span>
                  </div>
                ))}
              </div>

              {/* Important Notes */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-yellow-600" />
                  <span className="font-medium text-yellow-800 text-sm">Note importante</span>
                </div>
                <ul className="text-xs text-yellow-700 space-y-1 ml-6 list-disc">
                  <li>Handymanul te va contacta în 2 ore pentru confirmare detalii</li>
                  <li>Costul real poate varia în funcție de complexitate și materiale</li>
                  <li>Te rugăm să fii disponibil în intervalul programat</li>
                </ul>
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
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 px-5 py-2.5 border border-gray-200 rounded-lg text-gray-600 font-medium hover:bg-gray-50 transition"
            >
              <ChevronLeft className="w-4 h-4" /> Anulează
            </button>
          )}

          {step < 5 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && !form.service}
              className="flex items-center gap-1 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continuă <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Se procesează...' : 'Confirmă Rezervarea'}
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
            <h2 className="text-xl font-bold text-gray-800 mb-2">Rezervare finalizată!</h2>
            <p className="text-gray-500 text-sm mb-6">
              Vești bune! Serviciul tău a fost rezervat cu succes! Suntem încântați să te ajutăm.
              Nu ezita să faci ajustări la programare și să confirmi orice modificări.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-6 py-2.5 border border-gray-200 rounded-lg font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
              >
                Confirmă
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}