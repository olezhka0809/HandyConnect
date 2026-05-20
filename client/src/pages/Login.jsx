import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import logo from '../assets/Logo_pin.png'
import { Smartphone } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [formData, setFormData] = useState({ email: '', password: '' })

  // MFA step state
  const [mfaStep, setMfaStep]       = useState(false)
  const [mfaCode, setMfaCode]       = useState('')
  const [mfaFactorId, setMfaFactorId] = useState('')
  const [mfaUserId, setMfaUserId]   = useState('')
  const [mfaLoading, setMfaLoading] = useState(false)

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
    navigate(userRole === 'handyman' ? '/handyman/dashboard' : '/dashboard')
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

    // Check if MFA is required
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

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <img src={logo} alt="HandyConnect" className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-800">HandyConnect</h1>
          <p className="text-gray-500 mt-2">
            {mfaStep ? 'Verificare în 2 pași' : 'Conectează-te la contul tău'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>
        )}

        {!mfaStep ? (
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
          </form>
        ) : (
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

        {!mfaStep && (
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
