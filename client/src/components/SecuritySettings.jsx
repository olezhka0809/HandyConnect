import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { Lock, Shield, Monitor, AlertTriangle, Eye, EyeOff, X, CheckCircle, Smartphone } from 'lucide-react'

// ── Change Password Modal ────────────────────────────────────────────────────
function ChangePasswordModal({ onClose }) {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [show, setShow] = useState({ current: false, next: false })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.next !== form.confirm) { setError('Parolele noi nu coincid.'); return }
    if (form.next.length < 8) { setError('Parola trebuie să aibă cel puțin 8 caractere.'); return }
    setLoading(true); setError('')
    // Re-authenticate to verify current password
    const { data: { user } } = await supabase.auth.getUser()
    const { error: reAuthErr } = await supabase.auth.signInWithPassword({ email: user.email, password: form.current })
    if (reAuthErr) { setError('Parola curentă este incorectă.'); setLoading(false); return }
    const { error: updateErr } = await supabase.auth.updateUser({ password: form.next })
    setLoading(false)
    if (updateErr) { setError('Eroare la schimbarea parolei.'); return }
    // Trimite email de notificare securitate (user e deja disponibil din pasul de re-autentificare)
    supabase.functions.invoke('notify-email', {
      body: { type: 'password_changed', user_id: user.id },
    })
    setDone(true)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">Schimbă Parola</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
        </div>
        {done ? (
          <div className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3"/>
            <p className="font-semibold text-gray-800">Parola a fost schimbată!</p>
            <button onClick={onClose} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Închide</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
            {[
              { key: 'current', label: 'Parola curentă', showKey: 'current' },
              { key: 'next',    label: 'Parola nouă',    showKey: 'next' },
              { key: 'confirm', label: 'Confirmă parola nouă', showKey: 'next' },
            ].map(({ key, label, showKey }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <div className="relative">
                  <input
                    type={show[showKey] ? 'text' : 'password'}
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <button type="button" onClick={() => setShow(s => ({ ...s, [showKey]: !s[showKey] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {show[showKey] ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                  </button>
                </div>
              </div>
            ))}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition">
              {loading ? 'Se schimbă...' : 'Schimbă Parola'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Enable 2FA Modal ─────────────────────────────────────────────────────────
function Enable2FAModal({ onClose, onEnabled }) {
  const [step, setStep] = useState('loading') // loading | scan | verify | done
  const [factorId, setFactorId] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function enroll() {
      const { data, error: err } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'HandyConnect Authenticator' })
      if (err) { setError('Eroare la inițializare 2FA.'); setStep('error'); return }
      setFactorId(data.id)
      setQrCode(data.totp.qr_code)
      setSecret(data.totp.secret)
      setStep('scan')
    }
    enroll()
  }, [])

  async function handleVerify(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
    setLoading(false)
    if (err) { setError('Cod incorect. Încearcă din nou.'); return }
    setStep('done')
    onEnabled()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">Activează Autentificarea în 2 Pași</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
        </div>

        {step === 'loading' && (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"/>
          </div>
        )}

        {step === 'scan' && (
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <Smartphone className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"/>
              <p className="text-sm text-blue-700">Scanează codul QR cu <strong>Google Authenticator</strong> sau <strong>Authy</strong>, apoi introdu codul generat.</p>
            </div>
            <div className="flex justify-center p-4 bg-gray-50 rounded-xl">
              <img src={qrCode} alt="QR Code 2FA" className="w-48 h-48"/>
            </div>
            <details className="text-xs text-gray-500">
              <summary className="cursor-pointer select-none">Nu poți scana? Introdu manual</summary>
              <p className="mt-2 font-mono bg-gray-100 p-2 rounded break-all select-all">{secret}</p>
            </details>
            <button onClick={() => setStep('verify')}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
              Am scanat — Continuă
            </button>
          </div>
        )}

        {step === 'verify' && (
          <form onSubmit={handleVerify} className="p-6 space-y-4">
            {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
            <p className="text-sm text-gray-600">Introdu codul de 6 cifre din aplicația de autentificare:</p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123 456"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-2xl font-mono text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button type="submit" disabled={loading || code.length !== 6}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Se verifică...' : 'Verifică și Activează'}
            </button>
          </form>
        )}

        {step === 'done' && (
          <div className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3"/>
            <p className="font-semibold text-gray-800">2FA activat cu succes!</p>
            <p className="text-sm text-gray-500 mt-1">La fiecare autentificare vei introduce codul din aplicație.</p>
            <button onClick={onClose} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Închide</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Disable 2FA Modal ────────────────────────────────────────────────────────
function Disable2FAModal({ factorId, onClose, onDisabled }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    // Verify code first, then unenroll
    const { error: challErr } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
    if (challErr) { setError('Cod incorect. Încearcă din nou.'); setLoading(false); return }
    const { error: unenrollErr } = await supabase.auth.mfa.unenroll({ factorId })
    setLoading(false)
    if (unenrollErr) { setError('Eroare la dezactivare.'); return }
    setDone(true)
    onDisabled()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">Dezactivează 2FA</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
        </div>
        {done ? (
          <div className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-3"/>
            <p className="font-semibold text-gray-800">2FA dezactivat.</p>
            <button onClick={onClose} className="mt-4 px-6 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700">Închide</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">Dezactivarea 2FA reduce securitatea contului tău.</p>
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
            <p className="text-sm text-gray-600">Introdu codul din aplicația de autentificare pentru confirmare:</p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123 456"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-2xl font-mono text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button type="submit" disabled={loading || code.length !== 6}
              className="w-full py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
              {loading ? 'Se dezactivează...' : 'Dezactivează 2FA'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Sessions Modal ───────────────────────────────────────────────────────────
function SessionsModal({ onClose }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function signOutAll() {
    setLoading(true)
    await supabase.auth.signOut({ scope: 'global' })
    setDone(true)
    setLoading(false)
    setTimeout(() => window.location.href = '/login', 1500)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">Sesiuni Active</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
            <Monitor className="w-5 h-5 text-blue-600"/>
            <div>
              <p className="text-sm font-semibold text-gray-800">Sesiunea curentă</p>
              <p className="text-xs text-gray-500">Browser · Activ acum</p>
            </div>
            <span className="ml-auto text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">Activ</span>
          </div>
          {done ? (
            <p className="text-center text-sm text-green-600 font-medium">Deconectat de pe toate dispozitivele. Redirecționare...</p>
          ) : (
            <button onClick={signOutAll} disabled={loading}
              className="w-full py-2.5 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition">
              {loading ? 'Se deconectează...' : 'Deconectează-te de pe toate dispozitivele'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Delete Account Modal ─────────────────────────────────────────────────────
function DeleteAccountModal({ onClose }) {
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    setLoading(true); setError('')
    const { error: err } = await supabase.rpc('delete_own_account')
    if (err) { setError('Eroare la ștergerea contului. Contactează suportul.'); setLoading(false); return }
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-red-700">Șterge Contul</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700 font-medium">Această acțiune este permanentă și ireversibilă.</p>
            <p className="text-xs text-red-600 mt-1">Toate datele tale (task-uri, recenzii, mesaje) vor fi șterse definitiv.</p>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Scrie <strong>ȘTERGE</strong> pentru a confirma
            </label>
            <input
              type="text"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="ȘTERGE"
            />
          </div>
          <button onClick={handleDelete} disabled={loading || confirm !== 'ȘTERGE'}
            className="w-full py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition">
            {loading ? 'Se șterge...' : 'Șterge Contul Definitiv'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main SecuritySettings component ─────────────────────────────────────────
export default function SecuritySettings() {
  const [modal, setModal] = useState(null) // 'password' | 'enable2fa' | 'disable2fa' | 'sessions' | 'delete'
  const [mfaStatus, setMfaStatus] = useState(null) // null=loading, { enabled, factorId }

  useEffect(() => { checkMFA() }, [])

  async function checkMFA() {
    const { data } = await supabase.auth.mfa.listFactors()
    const totp = data?.totp?.find(f => f.status === 'verified')
    setMfaStatus({ enabled: !!totp, factorId: totp?.id ?? null })
  }

  return (
    <>
      <div className="space-y-4">
        {/* Change Password */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-gray-400"/>
            <div>
              <p className="font-medium text-gray-800">Schimbă Parola</p>
              <p className="text-xs text-gray-500">Actualizează parola contului tău</p>
            </div>
          </div>
          <button onClick={() => setModal('password')}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-white transition">
            Schimbă
          </button>
        </div>

        {/* 2FA */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-gray-400"/>
            <div>
              <p className="font-medium text-gray-800">Autentificare în 2 Pași (2FA)</p>
              <p className="text-xs text-gray-500">Adaugă un nivel suplimentar de securitate</p>
            </div>
          </div>
          {mfaStatus === null ? (
            <span className="text-xs text-gray-400">Se încarcă...</span>
          ) : mfaStatus.enabled ? (
            <button onClick={() => setModal('disable2fa')}
              className="px-4 py-2 border border-green-200 rounded-lg text-sm font-medium text-green-700 hover:bg-green-50 transition flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5"/> Activat
            </button>
          ) : (
            <button onClick={() => setModal('enable2fa')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
              Activează
            </button>
          )}
        </div>

        {/* Sessions */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-3">
            <Monitor className="w-5 h-5 text-gray-400"/>
            <div>
              <p className="font-medium text-gray-800">Sesiuni Active</p>
              <p className="text-xs text-gray-500">Gestionează dispozitivele conectate</p>
            </div>
          </div>
          <button onClick={() => setModal('sessions')}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-white transition">
            Gestionează
          </button>
        </div>

        {/* Delete Account */}
        <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400"/>
            <div>
              <p className="font-medium text-red-700">Șterge Contul</p>
              <p className="text-xs text-red-500">Acțiune permanentă și ireversibilă</p>
            </div>
          </div>
          <button onClick={() => setModal('delete')}
            className="px-4 py-2 border border-red-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-100 transition">
            Șterge
          </button>
        </div>
      </div>

      {/* Modals */}
      {modal === 'password'   && <ChangePasswordModal onClose={() => setModal(null)} />}
      {modal === 'enable2fa'  && <Enable2FAModal onClose={() => setModal(null)} onEnabled={checkMFA} />}
      {modal === 'disable2fa' && <Disable2FAModal factorId={mfaStatus?.factorId} onClose={() => setModal(null)} onDisabled={checkMFA} />}
      {modal === 'sessions'   && <SessionsModal onClose={() => setModal(null)} />}
      {modal === 'delete'     && <DeleteAccountModal onClose={() => setModal(null)} />}
    </>
  )
}
