import { useState } from 'react'
import {
  X, CheckCircle, XCircle, MessageSquare, Calendar,
  Clock, MapPin, Phone, Mail, Camera
} from 'lucide-react'

const timeSlots = [
  '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '13:00 PM', '14:00 PM', '15:00 PM', '16:00 PM', '17:00 PM'
]

export default function JobRequestModal({ job, onClose, onAccept, onDecline }) {
  const [step, setStep] = useState(1)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')
  const [notes, setNotes] = useState('')

  if (!job) return null

  const handleAcceptClick = () => setStep(2)

  const handleConfirmSchedule = () => setStep(3)

  const handleFinalAccept = () => {
    setStep(4)
    if (onAccept) onAccept(job, { date: scheduleDate, time: scheduleTime, notes })
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>

        {/* Header - persistent across steps */}
        {step <= 3 && (
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                {step === 1 ? 'Detalii Cerere de Job' : 'Acceptare Cerere de Job'}
              </h2>
              {step >= 2 && (
                <p className="text-sm text-gray-500">Confirmă detaliile și setează programarea</p>
              )}
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        )}

        <div className="p-6">

          {/* STEP 1: Job Details */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Job Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                    {job.client.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{job.title}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm text-gray-500">{job.client}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                        ${job.urgency === 'high' ? 'bg-red-100 text-red-700' :
                          job.urgency === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'}
                      `}>
                        {job.urgency === 'high' ? 'Urgent' : job.urgency === 'medium' ? 'Mediu' : 'Normal'}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="text-xl font-bold text-blue-600">{job.price}</span>
              </div>

              {/* Schedule & Location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-bold text-gray-800 mb-2">Programare</h4>
                  <div className="space-y-1.5 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{job.date?.split(' la ')[0] || job.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span>{job.date?.split(' la ')[1] || ''} ({job.duration || '2-4 ore'})</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-800 mb-2">Locație</h4>
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span>{job.address}</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-sm font-bold text-gray-800 mb-2">Descriere</h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {job.description || 'Clientul necesită lucrări profesionale conform specificațiilor discutate. Vă rugăm să confirmați disponibilitatea.'}
                </p>
              </div>

              {/* Customer Info */}
              <div>
                <h4 className="text-sm font-bold text-gray-800 mb-2">Informații client</h4>
                <div className="space-y-1.5 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{job.phone || '+40 712 345 678'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>{job.email || `${job.client.toLowerCase().replace(' ', '.')}@email.com`}</span>
                  </div>
                </div>
              </div>

              {/* Photos */}
              {job.photos > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-gray-800 mb-2">Poze atașate</h4>
                  <div className="flex gap-2">
                    {[...Array(Math.min(job.photos, 4))].map((_, i) => (
                      <div key={i} className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Camera className="w-6 h-6 text-gray-300" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleAcceptClick}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition"
                >
                  <CheckCircle className="w-4 h-4" /> Acceptă
                </button>
                <button
                  onClick={() => { if (onDecline) onDecline(job); onClose(); }}
                  className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition"
                >
                  <XCircle className="w-4 h-4" /> Refuză
                </button>
                <button
                  className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition"
                >
                  <MessageSquare className="w-4 h-4" /> Mesaj
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Confirm Schedule */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="font-bold text-blue-600 mb-4">Confirmă programarea și adaugă note</h3>

                <div className="bg-gray-50 rounded-xl p-5">
                  <h4 className="font-bold text-gray-800 mb-1">Programare propusă</h4>
                  <p className="text-sm text-gray-500 mb-4">
                    Clientul a solicitat: {job.date}
                  </p>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-800 mb-2">Confirmă/Schimbă Data</label>
                      <input
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-800 mb-2">Confirmă/Schimbă Ora</label>
                      <select
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Selectează ora</option>
                        {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-2">Note adiționale (opțional)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Adaugă note adiționale pentru client..."
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition"
                >
                  Înapoi
                </button>
                <button
                  onClick={handleConfirmSchedule}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition"
                >
                  Acceptă Job
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Summary Confirmation */}
          {step === 3 && (
            <div className="space-y-5">
              {/* Summary Card */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h3 className="font-bold text-green-800">{job.title}</h3>
                </div>
                <p className="text-sm text-green-700 mb-3">{job.client}</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-green-600">Buget:</span>
                    <p className="font-bold text-green-800">{job.price}</p>
                  </div>
                  <div>
                    <span className="text-green-600">Durată:</span>
                    <p className="font-bold text-green-800">{job.duration || '2-3 ore'}</p>
                  </div>
                  <div>
                    <span className="text-green-600">Data:</span>
                    <p className="font-bold text-green-800">{scheduleDate || 'Conform cerere'}</p>
                  </div>
                  <div>
                    <span className="text-green-600">Ora:</span>
                    <p className="font-bold text-green-800">{scheduleTime || 'Conform cerere'}</p>
                  </div>
                </div>
              </div>

              {/* What happens next */}
              <div>
                <h4 className="font-bold text-gray-800 mb-3">Ce urmează:</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">•</span>
                    Clientul va fi notificat imediat
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">•</span>
                    Job-ul se mută la statusul "Acceptat" în Pipeline-ul tău
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">•</span>
                    25% din depozit va fi reținut în escrow
                  </li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition"
                >
                  Anulează
                </button>
                <button
                  onClick={handleFinalAccept}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition"
                >
                  Continuă
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Success */}
          {step === 4 && (
            <div className="text-center space-y-5 py-4">
              <div className="flex items-center justify-end">
                <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-800">Job Acceptat cu Succes!</h2>
                <p className="text-sm text-gray-500 mt-2">
                  Excelent! Ai acceptat job-ul. Iată detaliile pașilor următori:
                </p>
              </div>

              <div className="text-left">
                <h4 className="font-bold text-gray-800 mb-3">Ce urmează:</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">•</span>
                    Clientul va fi notificat și plata va fi securizată
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">•</span>
                    Contactează clientul pentru a confirma detaliile finale
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">•</span>
                    Prezintă-te la timp și finalizează lucrarea profesional
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">•</span>
                    Marchează job-ul ca finalizat pentru a primi plata integrală
                  </li>
                </ul>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition">
                  <MessageSquare className="w-4 h-4" /> Mesaj Client
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition"
                >
                  Gata
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}