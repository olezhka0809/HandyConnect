import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import logo from '../assets/Logo_pin.png'
import { Smartphone, CheckCircle, Mail } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [formData, setFormData] = useState({ email: '', password: '' })

  // MFA step state
  const [mfaStep, setMfaStep]           = useState(false)
  const [mfaCode, setMfaCode]           = useState('')
  const [mfaFactorId, setMfaFactorId]   = useState('')
  const [mfaUserId, setMfaUserId]       = useState('')
  const [mfaLoading, setMfaLoading]     = useState(false)

  // Forgot password state
  const [forgotMode, setForgotMode]     = useState(false)
  const [resetEmail, setResetEmail]     = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSent, setResetSent]       = useState(false)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setError('')
  }

  async function redirectByRole(userId) {
    const { data: roles } = await supabase
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', userId)
    const userRole = roles?.[0]?.roles?.name

    if (userRole === 'handyman') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', userId)
        .single()
      navigate(profile?.onboarding_completed ? '/handyman/dashboard' : '/handyman-onboarding')
    } else {
      navigate('/dashboard')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    })

    setLoading(false)

    if (signInError) {
      setError('Email sau parolă incorectă')
      return
    }

    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aal?.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel) {
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const totp = factors?.totp?.[0]
      if (totp) {
        setMfaFactorId(totp.id)
        setMfaUserId(data.user.id)
        setMfaStep(true)
        return
      }
    }

    await redirectByRole(data.user.id)
  }

  const handleMfaVerify = async (e) => {
    e.preventDefault()
    setMfaLoading(true)
    setError('')

    const { data: challenge, error: challErr } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId })
    if (challErr) { setError('Eroare la verificare. Încearcă din nou.'); setMfaLoading(false); return }

    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId: mfaFactorId,
      challengeId: challenge.id,
      code: mfaCode,
    })
    setMfaLoading(false)

    if (verifyErr) { setError('Cod incorect. Încearcă din nou.'); return }

    await redirectByRole(mfaUserId)
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    if (!resetEmail.trim()) return
    setResetLoading(true)
    setError('')

    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setResetLoading(false)

    if (resetErr) {
      setError('Eroare la trimiterea emailului. Verifică adresa și încearcă din nou.')
      return
    }
    setResetSent(true)
  }

  // ─── Subtitle text ──────────────────────────────────────────────────────────
  const subtitle = mfaStep
    ? 'Verificare în 2 pași'
    : forgotMode
    ? 'Resetare parolă'
    : 'Conectează-te la contul tău'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <img src={logo} alt="HandyConnect" className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-800">HandyConnect</h1>
          <p className="text-gray-500 mt-2">{subtitle}</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>
        )}

        {/* ── Normal login ── */}
        {!mfaStep && !forgotMode && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email" name="email" value={formData.email}
                onChange={handleChange} placeholder="email@exemplu.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parolă</label>
              <input
                type="password" name="password" value={formData.password}
                onChange={handleChange} placeholder="••••••••"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50">
              {loading ? 'Se conectează...' : 'Intră în cont'}
            </button>
            <div className="flex justify-end">
              <button type="button" onClick={() => { setForgotMode(true); setError(''); setResetEmail(formData.email) }}
                className="text-sm text-blue-600 hover:underline font-medium">
                Ai uitat parola?
              </button>
            </div>
          </form>
        )}

        {/* ── MFA step ── */}
        {mfaStep && (
          <form onSubmit={handleMfaVerify} className="space-y-5">
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <Smartphone className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"/>
              <p className="text-sm text-blue-700">Introdu codul de 6 cifre din aplicația de autentificare.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cod autentificare</label>
              <input
                type="text" inputMode="numeric" maxLength={6}
                value={mfaCode}
                onChange={e => { setMfaCode(e.target.value.replace(/\D/g, '')); setError('') }}
                placeholder="123 456"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-2xl font-mono text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <button type="submit" disabled={mfaLoading || mfaCode.length !== 6}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50">
              {mfaLoading ? 'Se verifică...' : 'Verifică'}
            </button>
            <button type="button" onClick={() => { setMfaStep(false); setError('') }}
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-700">
              ← Înapoi la autentificare
            </button>
          </form>
        )}

        {/* ── Forgot password — form ── */}
        {forgotMode && !resetSent && (
          <form onSubmit={handleForgotPassword} className="space-y-5">
            <p className="text-sm text-gray-500">
              Introdu adresa de email asociată contului tău și îți trimitem un link de resetare.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={resetEmail}
                onChange={e => { setResetEmail(e.target.value); setError('') }}
                placeholder="email@exemplu.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required autoFocus
              />
            </div>
            <button type="submit" disabled={resetLoading || !resetEmail.trim()}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50">
              {resetLoading ? 'Se trimite...' : 'Trimite link de resetare'}
            </button>
            <button type="button" onClick={() => { setForgotMode(false); setError('') }}
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-700">
              ← Înapoi la autentificare
            </button>
          </form>
        )}

        {/* ── Forgot password — confirmation ── */}
        {forgotMode && resetSent && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Mail className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-800">Email trimis!</p>
              <p className="text-sm text-gray-500 mt-1">
                Verifică inbox-ul pentru <strong>{resetEmail}</strong> și urmează linkul din email.
              </p>
              <p className="text-xs text-gray-400 mt-2">Linkul expiră în 24 de ore. Verifică și folderul Spam.</p>
            </div>
            <button type="button" onClick={() => { setForgotMode(false); setResetSent(false); setError('') }}
              className="w-full py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
              Înapoi la autentificare
            </button>
          </div>
        )}

        {/* ── Bottom link ── */}
        {!mfaStep && !forgotMode && (
          <p className="text-center text-gray-500 mt-6">
            Nu ai cont?{' '}
            <Link to="/register" className="text-blue-600 font-semibold hover:underline">
              Înregistrează-te
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
