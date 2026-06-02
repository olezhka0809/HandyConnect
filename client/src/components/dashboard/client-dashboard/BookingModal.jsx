import { useState, useEffect } from 'react'
import { supabase } from '../../../supabase'
import {
  X, Calendar, Clock, MapPin, Phone, Mail, User,
  ChevronLeft, ChevronRight, CheckCircle, Loader2,
  AlertTriangle, Zap, Shield, Wrench, Star,
  MessageSquare, CreditCard, Banknote
} from 'lucide-react'

// ─── constants ────────────────────────────────────────────────────────────────

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00',
  '16:00', '17:00', '18:00',
]

const URGENCY_OPTIONS = [
  { value: 'low',    label: 'Fără grabă',  desc: 'În 7–14 zile',  cls: 'border-gray-200 text-gray-600',  Icon: Clock,         active: 'border-blue-500 bg-blue-50 text-blue-700' },
  { value: 'normal', label: 'Normal',      desc: 'În 3–7 zile',   cls: 'border-gray-200 text-gray-600',  Icon: Wrench,        active: 'border-blue-500 bg-blue-50 text-blue-700' },
  { value: 'medium', label: 'Mediu',       desc: 'În 1–3 zile',   cls: 'border-gray-200 text-gray-600',  Icon: Zap,           active: 'border-yellow-500 bg-yellow-50 text-yellow-700' },
  { value: 'high',   label: 'Urgent',      desc: 'Azi / mâine',   cls: 'border-gray-200 text-gray-600',  Icon: AlertTriangle, active: 'border-red-500 bg-red-50 text-red-700' },
]

const PAYMENT_OPTIONS = [
  { value: 'cash',   label: 'Cash la finalizare', Icon: Banknote },
  { value: 'card',   label: 'Card la finalizare', Icon: CreditCard },
]


// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtRON(val) {
  return `${Number(val).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`
}

function getMinDate() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

function StarRow({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-3.5 h-3.5 ${i <= Math.round(rating ?? 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
      ))}
    </div>
  )
}

// ─── step progress ────────────────────────────────────────────────────────────

function StepBar({ step }) {
  const steps = ['Programare', 'Contact', 'Confirmare']
  return (
    <div className="flex items-center justify-center gap-0 mb-1">
      {steps.map((label, i) => {
        const idx = i + 1
        const done    = step > idx
        const current = step === idx
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${done    ? 'bg-green-500 text-white' : ''}
                ${current ? 'bg-blue-600 text-white ring-4 ring-blue-100' : ''}
                ${!done && !current ? 'bg-gray-100 text-gray-400' : ''}
              `}>
                {done ? <CheckCircle className="w-4 h-4" /> : idx}
              </div>
              <span className={`text-[10px] mt-1 font-medium ${current ? 'text-blue-600' : 'text-gray-400'}`}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-16 h-0.5 mb-4 mx-1 transition-all ${step > idx ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── MAIN MODAL ───────────────────────────────────────────────────────────────

/**
 * Props:
 *   service    – handyman_service row (with .handyman merged in)
 *   handyman   – merged handyman object
 *   userId     – current client uuid
 *   onClose    – () => void
 *   onSuccess  – () => void  (optional, called after booking created)
 */
export default function BookingModal({ service, handyman, userId, onClose, onSuccess }) {
  const [step,        setStep]        = useState(1)          // 1 | 2 | 3 | 4 (done)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState(null)
  const [bookingId,   setBookingId]   = useState(null)

  // Step 1
  const [date,        setDate]        = useState('')
  const [time,        setTime]        = useState('')
  const [urgency,     setUrgency]     = useState('normal')
  const [payment,     setPayment]     = useState('cash')

  // Step 2
  const [address,     setAddress]     = useState('')
  const [city,        setCity]        = useState('')
  const [contactName, setContactName] = useState('')
  const [phone,       setPhone]       = useState('')
  const [email,       setEmail]       = useState('')
  const [notes,       setNotes]       = useState('')

  // Handyman schedule + availability
  const [handymanSchedule,  setHandymanSchedule]  = useState(null)  // {mon:[{from,to}],...}
  const [travelBuffer,      setTravelBufferVal]   = useState(30)
  const [calendarBlocks,    setCalendarBlocks]    = useState([])     // blocks for selected date
  const [availableTimes,    setAvailableTimes]    = useState(TIME_SLOTS)
  const [dayNotWorking,     setDayNotWorking]     = useState(false)

  const DAY_KEYS = ['sun','mon','tue','wed','thu','fri','sat']

  // Load handyman schedule once
  useEffect(() => {
    if (!handyman?.user_id) return
    supabase
      .from('handyman_schedule')
      .select('schedule, travel_buffer_min')
      .eq('handyman_id', handyman.user_id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setHandymanSchedule(data.schedule)
          setTravelBufferVal(data.travel_buffer_min ?? 30)
        }
      })
  }, [handyman?.user_id])

  // When date changes, load blocks and compute available times
  useEffect(() => {
    if (!date) { setAvailableTimes(TIME_SLOTS); setDayNotWorking(false); return }

    const jsDay = new Date(date + 'T12:00:00').getDay()
    const dayKey = DAY_KEYS[jsDay]
    const daySlots = handymanSchedule?.[dayKey] ?? null

    // Check if handyman works that day
    if (handymanSchedule && (!daySlots || daySlots.length === 0)) {
      setDayNotWorking(true)
      setAvailableTimes([])
      setTime('')
      return
    }
    setDayNotWorking(false)

    // Load blocks for that date
    supabase
      .from('handyman_calendar_blocks')
      .select('start_time, end_time, block_type')
      .eq('handyman_id', handyman.user_id)
      .eq('date', date)
      .then(({ data: blocks }) => {
        const blks = blocks ?? []
        setCalendarBlocks(blks)

        // Compute available slots from schedule
        const timeToMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
        const minToTime = m => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`

        let available = []

        if (daySlots && daySlots.length > 0) {
          // For each schedule window, find free sub-windows, then extract hourly/half-hourly starts
          daySlots.forEach(slot => {
            let cursor = timeToMin(slot.from)
            const windowEnd = timeToMin(slot.to)

            // Sort blocks that overlap this window
            const overlapping = blks
              .filter(b => timeToMin(b.end_time.slice(0,5)) > cursor && timeToMin(b.start_time.slice(0,5)) < windowEnd)
              .sort((a, b) => timeToMin(a.start_time.slice(0,5)) - timeToMin(b.start_time.slice(0,5)))

            for (const blk of overlapping) {
              const bStart = timeToMin(blk.start_time.slice(0,5))
              const bEnd   = timeToMin(blk.end_time.slice(0,5))
              if (cursor < bStart) {
                // Free window: cursor → bStart
                for (let t = cursor; t < bStart - 30; t += 60) {
                  available.push(minToTime(t))
                }
              }
              cursor = Math.max(cursor, bEnd)
            }
            // Remaining free time after last block
            for (let t = cursor; t < windowEnd - 30; t += 60) {
              available.push(minToTime(t))
            }
          })
        } else {
          // No schedule data — show all times
          available = TIME_SLOTS
        }

        setAvailableTimes([...new Set(available)].sort())
        if (time && !available.includes(time)) setTime('')
      })
  }, [date, handymanSchedule, handyman?.user_id])

  // prefill contact from profile
  useEffect(() => {
    if (!userId) return
    supabase.from('profiles')
      .select('first_name, last_name, phone, city, county')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return
        const name = `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim()
        if (name)       setContactName(name)
        if (data.phone) setPhone(data.phone)
        if (data.city)  setCity(data.city)
      })
  }, [userId])

  // ── pricing ────────────────────────────────────────────────────────────────
  const total       = Number(service.base_price ?? 0)
  const tva         = Math.round(total * 0.21 / 1.21 * 100) / 100
  const pretFaraTva = Math.round(total / 1.21 * 100) / 100

  // ── validation ─────────────────────────────────────────────────────────────
  const step1Valid = date && time
  const step2Valid = address.trim() && contactName.trim() && phone.trim()

  // ── confirm booking ────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    setSaving(true)
    setError(null)
    try {
      const { data, error: insErr } = await supabase
        .from('bookings')
        .insert({
          client_id:      userId,
          handyman_id:    handyman.user_id,
          service_id:     service.id,
          status:         'pending',
          scheduled_date: date,
          scheduled_time: time,
          urgency:        urgency,
          service_address: `${address}${city ? ', ' + city : ''}`,
          contact_name:   contactName,
          contact_phone:  phone,
          contact_email:  email || null,
          total:          total,
          payment_method: payment,
          payment_status: 'pending',
          handyman_notes: notes || null,
          created_at:     new Date().toISOString(),
          updated_at:     new Date().toISOString(),
        })
        .select('id')
        .single()

      if (insErr) throw insErr

      // bump times_booked on the service
      await supabase
        .from('handyman_services')
        .update({ times_booked: (service.times_booked ?? 0) + 1 })
        .eq('id', service.id)

      // Notificare handyman
      await supabase.from('notifications').insert({
        user_id: handyman.user_id,
        type: 'new_offer',
        title: 'Rezervare nouă primită',
        body: `${contactName} a rezervat serviciul „${service.title}"`,
        data: { booking_id: data.id, redirect: '/handyman/jobs' },
      })

      setBookingId(data.id)
      setStep(4)
      onSuccess?.()
    } catch (e) {
      setError('Eroare la trimiterea rezervării: ' + (e.message ?? 'necunoscută'))
    } finally {
      setSaving(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:px-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[92dvh]"
        onClick={e => e.stopPropagation()}
      >

        {/* ── HEADER ── */}
        {step < 4 && (
          <div className="p-5 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0 pr-3">
                <h2 className="text-base font-bold text-gray-800 leading-tight">{service.title}</h2>
                <p className="text-sm text-gray-400 mt-0.5">
                  {handyman.full_name}
                  {handyman.is_verified && (
                    <span className="inline-flex items-center gap-0.5 text-blue-500 ml-1 text-xs">
                      <CheckCircle className="w-3 h-3" /> Verificat
                    </span>
                  )}
                </p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center flex-shrink-0 ml-2">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <StepBar step={step} />
          </div>
        )}

        {/* ── BODY ── */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* ── error ── */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          {/* ════════════════════════════════
              STEP 1: Date + time + urgency
          ════════════════════════════════ */}
          {step === 1 && (
            <>
              {/* service summary */}
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-blue-100 flex-shrink-0 flex items-center justify-center">
                  {Array.isArray(service.photos) && service.photos[0]
                    ? <img src={service.photos[0]} alt="" className="w-full h-full object-cover" />
                    : <Wrench className="w-5 h-5 text-blue-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 text-sm truncate">{service.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <StarRow rating={handyman.rating_avg ?? 0} />
                    <span className="text-xs text-gray-500">{handyman.full_name}</span>
                    {handyman.has_insurance && (
                      <span className="text-xs text-green-600 flex items-center gap-0.5"><Shield className="w-3 h-3" />Asigurat</span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-black text-blue-700">{fmtRON(total)}</p>
                  {service.price_per_hour && (
                    <p className="text-[10px] text-purple-500 font-semibold">{fmtRON(service.price_per_hour)}/h</p>
                  )}
                </div>
              </div>

              {/* availability notice */}
              {!handyman.is_available && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                  <p className="text-xs text-yellow-700">
                    <strong>Handymanul este momentan indisponibil.</strong> Poți trimite totuși cererea —
                    el va confirma când devine disponibil.
                  </p>
                </div>
              )}

              {/* date picker */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1.5 text-gray-400" />
                  Data dorită *
                </label>
                <input
                  type="date"
                  value={date}
                  min={getMinDate()}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* day not working warning */}
              {dayNotWorking && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    <strong>Handymanul nu lucrează în această zi.</strong> Alege o altă dată disponibilă în programul său.
                  </p>
                </div>
              )}

              {/* time slots */}
              {!dayNotWorking && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    <Clock className="w-4 h-4 inline mr-1.5 text-gray-400" />
                    Ora dorită *
                    {date && handymanSchedule && (
                      <span className="ml-2 text-xs font-normal text-gray-400">
                        ({availableTimes.length} sloturi disponibile)
                      </span>
                    )}
                  </label>
                  {availableTimes.length === 0 && date ? (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-center">
                      <p className="text-sm text-gray-500">Nicio oră disponibilă în această zi.</p>
                      <p className="text-xs text-gray-400 mt-1">Ziua este complet ocupată. Alege altă dată.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {availableTimes.map(t => (
                        <button
                          key={t}
                          onClick={() => setTime(t)}
                          className={`py-2.5 rounded-xl text-sm font-medium border transition-all
                            ${time === t
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600'
                            }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* urgency */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Urgență</label>
                <div className="grid grid-cols-2 gap-2">
                  {URGENCY_OPTIONS.map(opt => {
                    const Icon = opt.Icon
                    const isActive = urgency === opt.value
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setUrgency(opt.value)}
                        className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all
                          ${isActive ? opt.active : opt.cls + ' hover:bg-gray-50'}`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-bold">{opt.label}</p>
                          <p className="text-[10px] opacity-70">{opt.desc}</p>
                        </div>
                        {isActive && <CheckCircle className="w-3.5 h-3.5 ml-auto flex-shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* payment */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Metodă de plată</label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_OPTIONS.map(opt => {
                    const Icon = opt.Icon
                    const isActive = payment === opt.value
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setPayment(opt.value)}
                        className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all
                          ${isActive
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                      >
                        <Icon className="w-4 h-4" />
                        {opt.label}
                        {isActive && <CheckCircle className="w-3.5 h-3.5 ml-auto" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {/* ════════════════════════════════
              STEP 2: Address + contact
          ════════════════════════════════ */}
          {step === 2 && (
            <>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  <MapPin className="w-4 h-4 inline mr-1 text-gray-400" />
                  Adresa lucrării *
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Str. Exemplu, nr. 10, Bl. A, Ap. 5"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Oraș</label>
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="Ex: Timișoara"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Date de contact</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">
                      <User className="w-4 h-4 inline mr-1 text-gray-400" />
                      Nume complet *
                    </label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={e => setContactName(e.target.value)}
                      placeholder="Prenume Nume"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">
                      <Phone className="w-4 h-4 inline mr-1 text-gray-400" />
                      Telefon *
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="07xx xxx xxx"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">
                      <Mail className="w-4 h-4 inline mr-1 text-gray-400" />
                      Email <span className="text-gray-400 font-normal">(opțional)</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="email@exemplu.ro"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">
                      <MessageSquare className="w-4 h-4 inline mr-1 text-gray-400" />
                      Note suplimentare <span className="text-gray-400 font-normal">(opțional)</span>
                    </label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Detalii despre problemă, acces în clădire, etc."
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ════════════════════════════════
              STEP 3: Summary + confirm
          ════════════════════════════════ */}
          {step === 3 && (
            <>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-xs font-bold text-blue-500 uppercase tracking-wide mb-3">Rezumat rezervare</p>

                <div className="space-y-2.5 text-sm">
                  <div className="flex items-start gap-2">
                    <Wrench className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-400">Serviciu</p>
                      <p className="font-semibold text-gray-800">{service.title}</p>
                      <p className="text-xs text-gray-500">{handyman.full_name}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-400">Programare</p>
                      <p className="font-semibold text-gray-800">
                        {new Date(date).toLocaleDateString('ro-RO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-gray-500">Ora {time}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-400">Adresă</p>
                      <p className="font-semibold text-gray-800">{address}{city ? `, ${city}` : ''}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Phone className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-400">Contact</p>
                      <p className="font-semibold text-gray-800">{contactName}</p>
                      <p className="text-xs text-gray-500">{phone}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* urgency summary */}
              {(() => {
                const opt = URGENCY_OPTIONS.find(o => o.value === urgency)
                const Icon = opt.Icon
                return (
                  <div className={`flex items-center gap-2 p-3 rounded-xl border ${opt.active}`}>
                    <Icon className="w-4 h-4" />
                    <div>
                      <p className="text-xs font-bold">{opt.label}</p>
                      <p className="text-[10px] opacity-70">{opt.desc}</p>
                    </div>
                  </div>
                )
              })()}

              {/* pricing breakdown */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="p-4 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Preț fără TVA</span>
                    <span className="font-semibold text-gray-800">{fmtRON(pretFaraTva)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>TVA (21%)</span>
                    <span>{fmtRON(tva)}</span>
                  </div>
                  <div className="border-t border-gray-100 pt-2 mt-2 flex justify-between font-black text-base">
                    <span>Total</span>
                    <span className="text-blue-700">{fmtRON(total)}</span>
                  </div>
                  <p className="text-[10px] text-gray-400">
                    Plata se face {payment === 'cash' ? 'în numerar' : 'cu cardul'} la finalizarea lucrării.
                    Prețul final poate varia în funcție de complexitate.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* ════════════════════════════════
              STEP 4: Success
          ════════════════════════════════ */}
          {step === 4 && (
            <div className="text-center space-y-5 py-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-11 h-11 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Cerere trimisă!</h2>
                <p className="text-sm text-gray-500 mt-2">
                  <strong>{handyman.full_name}</strong> a primit cererea ta și va răspunde în curând.
                </p>
                {bookingId && (
                  <p className="text-xs text-gray-400 mt-1 font-mono">
                    #{bookingId.slice(0, 8).toUpperCase()}
                  </p>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-left space-y-1.5 text-sm text-blue-800">
                <p>✓ Vei primi confirmare pe email / telefon</p>
                <p>✓ Poți urmări statusul în secțiunea <strong>Rezervările mele</strong></p>
                <p>✓ Handymanul va ajunge la ora {time}, data {new Date(date).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long' })}</p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={onClose}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition"
                >
                  Super, mulțumesc!
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        {step < 4 && (
          <div className="flex items-center gap-3 p-5 border-t border-gray-100 flex-shrink-0">
            {step > 1 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1.5 px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                <ChevronLeft className="w-4 h-4" /> Înapoi
              </button>
            )}

            {step === 1 && (
              <button
                onClick={() => setStep(2)}
                disabled={!step1Valid}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continuă <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {step === 2 && (
              <button
                onClick={() => setStep(3)}
                disabled={!step2Valid}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continuă <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {step === 3 && (
              <button
                onClick={handleConfirm}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition disabled:opacity-60"
              >
                {saving
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Se trimite...</>
                  : <><CheckCircle className="w-4 h-4" /> Confirmă Rezervarea</>
                }
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}