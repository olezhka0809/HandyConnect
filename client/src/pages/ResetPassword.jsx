import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabase'
import logo from '../assets/Logo_pin.png'
import { CheckCircle, Eye, EyeOff, AlertTriangle } from 'lucide-react'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading') // 'loading' | 'form' | 'success' | 'invalid'
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setStatus('form')
      }
    })

    // Dacă în 5 secunde nu vine evenimentul PASSWORD_RECOVERY → link invalid/expirat
    const timeout = setTimeout(() => {
      setStatus(prev => prev === 'loading' ? 'invalid' : prev)
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const handleReset = async (e) => {
    e.preventDefault()
    if (password !== confirmPassword) { setError('Parolele nu coincid.'); return }
    if (password.length < 8) { setError('Parola trebuie să aibă cel puțin 8 caractere.'); return }
    setLoading(true)
    setError('')

    const { error: updateErr } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateErr) { setError('Eroare la resetarea parolei. Încearcă din nou.'); return }

    setStatus('success')
    await supabase.auth.signOut()
    setTimeout(() => navigate('/login'), 3000)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <img src={logo} alt="HandyConnect" className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-800">HandyConnect</h1>
        </div>

        {status === 'loading' && (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Se verifică linkul de resetare...</p>
          </div>
        )}

        {status === 'invalid' && (
          <div className="text-center py-4">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-gray-800 mb-2">Link invalid sau expirat</h2>
            <p className="text-sm text-gray-500 mb-6">
              Linkul de resetare nu mai este valabil. Solicită unul nou de pe pagina de autentificare.
            </p>
            <Link to="/login"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">
              Înapoi la autentificare
            </Link>
          </div>
        )}

        {status === 'form' && (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-800">Setează parola nouă</h2>
              <p className="text-sm text-gray-500 mt-1">Alege o parolă nouă pentru contul tău HandyConnect.</p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>
            )}

            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parolă nouă</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError('') }}
                    placeholder="Minim 8 caractere"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl pr-11 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required autoFocus
                  />
                  <button type="button" onClick={() => setShowPw(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmă parola nouă</label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); setError('') }}
                  placeholder="Repetă parola"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <button type="submit" disabled={loading || password.length < 8}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50">
                {loading ? 'Se salvează...' : 'Salvează parola nouă'}
              </button>
            </form>
          </>
        )}

        {status === 'success' && (
          <div className="text-center py-4">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-gray-800 mb-2">Parolă schimbată cu succes!</h2>
            <p className="text-sm text-gray-500">Vei fi redirecționat la autentificare în câteva secunde...</p>
          </div>
        )}
      </div>
    </div>
  )
}
