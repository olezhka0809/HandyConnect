import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import {
  X, Star, CheckCircle, Clock, Camera, FileText,
  Banknote, ChevronLeft, ChevronRight, Loader2,
  Briefcase, Tag, AlertCircle, ThumbsUp, ThumbsDown,
  User
} from 'lucide-react'

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function StarDisplay({ rating }) {
  if (!rating) return <span className="text-sm text-gray-400">Fără rating încă</span>
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <Star key={i} className={`w-5 h-5 ${i <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
        ))}
      </div>
      <span className="text-lg font-black text-gray-800">{Number(rating).toFixed(1)}</span>
    </div>
  )
}

function PhotoGallery({ photos }) {
  const [active, setActive] = useState(0)
  if (!photos?.length) {
    return (
      <div className="h-32 rounded-xl bg-gray-50 border border-dashed border-gray-200 flex flex-col items-center justify-center gap-2">
        <Camera className="w-6 h-6 text-gray-300" />
        <p className="text-xs text-gray-400">Fără poze salvate</p>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      <div className="relative rounded-xl overflow-hidden bg-gray-900 h-52">
        <img src={photos[active]} alt="" className="w-full h-full object-contain" />
        {photos.length > 1 && (
          <>
            <button onClick={() => setActive(i => Math.max(0, i - 1))} disabled={active === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center disabled:opacity-30 hover:bg-black/70 transition">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setActive(i => Math.min(photos.length - 1, i + 1))} disabled={active === photos.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center disabled:opacity-30 hover:bg-black/70 transition">
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
              {active + 1} / {photos.length}
            </div>
          </>
        )}
      </div>
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((url, i) => (
            <button key={i} onClick={() => setActive(i)}
              className={`w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition ${i === active ? 'border-blue-500' : 'border-transparent'}`}>
              <img src={url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── MAIN MODAL ───────────────────────────────────────────────────────────────

/**
 * Props:
 *   job      – normalised job object
 *   onClose  – () => void
 */
export default function CompletedJobModal({ job, onClose }) {
  const [completion, setCompletion] = useState(null)
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    supabase.from('job_completions').select('*')
      .eq('job_id', job._id).order('created_at', { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => { setCompletion(data ?? null); setLoading(false) })
  }, [job._id])

  const TypeIcon = job._type === 'task' ? Briefcase : Tag
  const typeCls  = job._type === 'task'
    ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
    : 'bg-teal-100 text-teal-700 border-teal-200'

  const clientAccepted = completion?.client_accepted
  const hasRating      = completion?.client_rating != null
  const paymentReleased = completion?.payment_released

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center sm:px-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[92dvh]"
        onClick={e => e.stopPropagation()}>

        {/* ── HEADER ── */}
        <div className="p-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-3">
              <div className="flex items-center gap-2 mb-1">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${typeCls}`}>
                  <TypeIcon className="w-3 h-3" />
                  {job._type === 'task' ? 'Task' : 'Rezervare'}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${job.isRework ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-green-100 text-green-700 border-green-200'}`}>
                  <CheckCircle className="w-3 h-3" /> {job.isRework ? 'Relucrare finalizată' : 'Finalizat'}
                </span>
              </div>
              <h2 className="text-base font-bold text-gray-800 leading-snug">{job.title}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{job.client}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center flex-shrink-0">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : (
            <>
              {/* ── PAYMENT STATUS BANNER ── */}
              {paymentReleased ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Banknote className="w-5 h-5 text-green-600" />
                    <h3 className="font-bold text-green-800">Plata a fost procesată!</h3>
                  </div>
                  <p className="text-sm text-green-700">
                    Banii au fost transferați în contul tău bancar.
                  </p>
                  {completion?.payment_released_at && (
                    <p className="text-xs text-green-500 mt-1">{fmtDate(completion.payment_released_at)}</p>
                  )}
                </div>
              ) : clientAccepted ? (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <h3 className="font-bold text-blue-800">Lucrare acceptată de client</h3>
                  </div>
                  <p className="text-sm text-blue-700">
                    În maxim <strong>24 de ore</strong> vei primi banii în contul tău bancar. 
                    Asigură-te că datele bancare sunt actualizate în profilul tău.
                  </p>
                </div>
              ) : clientAccepted === false ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <h3 className="font-bold text-red-800">Client a contestat lucrarea</h3>
                  </div>
                  <p className="text-sm text-red-700">
                    Clientul nu a acceptat lucrarea. Echipa HandyConnect va analiza situația și te va contacta.
                  </p>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-5 h-5 text-yellow-600" />
                    <h3 className="font-bold text-yellow-800">Așteptăm confirmarea clientului</h3>
                  </div>
                  <p className="text-sm text-yellow-700">
                    Clientul trebuie să confirme că lucrarea a fost efectuată corespunzător. 
                    Plata va fi procesată după confirmare.
                  </p>
                </div>
              )}

              {/* ── PHOTOS ── */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-gray-400" />
                  Pozele tale ({completion?.completion_photos?.length ?? 0})
                </h3>
                <PhotoGallery photos={completion?.completion_photos ?? []} />
              </div>

              {/* ── DESCRIPTION ── */}
              {completion?.completion_description && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Descrierea ta
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {completion.completion_description}
                  </p>
                </div>
              )}

              {/* ── RATING ── */}
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5" /> Rating primit de la client
                </h3>
                <StarDisplay rating={completion?.client_rating} />
                {completion?.client_review && (
                  <p className="text-sm text-gray-600 mt-3 italic border-l-2 border-yellow-400 pl-3">
                    "{completion.client_review}"
                  </p>
                )}
                {!hasRating && (
                  <p className="text-xs text-gray-400 mt-2">
                    Clientul nu a lăsat încă un rating. Ratingurile pot fi adăugate în primele 7 zile.
                  </p>
                )}
              </div>

              {/* ── CLIENT VERDICT ── */}
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
                  Verdict client
                </h3>
                {clientAccepted === true && (
                  <div className="flex items-center gap-2 text-green-600">
                    <ThumbsUp className="w-5 h-5" />
                    <span className="text-sm font-semibold">Lucrarea a fost acceptată</span>
                    {completion?.client_responded_at && (
                      <span className="text-xs text-gray-400 ml-auto">{fmtDate(completion.client_responded_at)}</span>
                    )}
                  </div>
                )}
                {clientAccepted === false && (
                  <div className="flex items-center gap-2 text-red-600">
                    <ThumbsDown className="w-5 h-5" />
                    <span className="text-sm font-semibold">Lucrarea a fost contestată</span>
                  </div>
                )}
                {clientAccepted === null || clientAccepted === undefined ? (
                  <div className="flex items-center gap-2 text-yellow-600">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">În așteptare — clientul nu a răspuns încă</span>
                  </div>
                ) : null}
              </div>

              {/* ── JOB DETAILS ── */}
              <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1.5 text-gray-600">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Detalii job</p>
                <div className="flex justify-between">
                  <span>Data finalizării</span>
                  <span className="font-semibold text-gray-800">
                    {fmtDate(job._raw.completed_at ?? completion?.created_at)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Preț</span>
                  <span className="font-semibold text-gray-800">{job.price}</span>
                </div>
                <div className="flex justify-between">
                  <span>Client</span>
                  <span className="font-semibold text-gray-800">{job.client}</span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-5 border-t border-gray-100 flex-shrink-0">
          <button onClick={onClose}
            className="w-full py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition">
            Închide
          </button>
        </div>
      </div>
    </div>
  )
}