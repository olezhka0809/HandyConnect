import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabase'
import logo from '../assets/Logo_pin.png'
import { User, Wrench } from 'lucide-react'

export default function Register() {
  const navigate = useNavigate()
  const [role, setRole] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!role) { setError('Te rugăm să selectezi tipul de cont'); return }
    if (password !== confirmPassword) { setError('Parolele nu coincid'); return }
    if (password.length < 8) { setError('Parola trebuie să aibă minim 8 caractere'); return }

    setLoading(true)
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role }
      }
    })
    setLoading(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    if (data.user) {
      navigate(role === 'handyman' ? '/handyman-onboarding' : '/onboarding')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <img src={logo} alt="HandyConnect" className="w-16 h-16" />
          <span className="text-3xl font-bold text-blue-600">HandyConnect</span>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Creează un cont</h1>
          <p className="text-gray-500 mt-1">Înregistrează-te pentru a începe</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Selector Rol */}
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-3">Te înregistrezi ca: *</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('client')}
                  className={`p-4 rounded-xl border-2 text-center transition-all
                    ${role === 'client' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}
                  `}
                >
                  <div className={`w-10 h-10 mx-auto mb-2 rounded-full flex items-center justify-center
                    ${role === 'client' ? 'bg-blue-600' : 'bg-gray-100'}
                  `}>
                    <User className={`w-5 h-5 ${role === 'client' ? 'text-white' : 'text-gray-400'}`} />
                  </div>
                  <p className={`font-medium ${role === 'client' ? 'text-blue-600' : 'text-gray-800'}`}>Client</p>
                  <p className="text-xs text-gray-500 mt-1">Caut un handyman</p>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('handyman')}
                  className={`p-4 rounded-xl border-2 text-center transition-all
                    ${role === 'handyman' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}
                  `}
                >
                  <div className={`w-10 h-10 mx-auto mb-2 rounded-full flex items-center justify-center
                    ${role === 'handyman' ? 'bg-blue-600' : 'bg-gray-100'}
                  `}>
                    <Wrench className={`w-5 h-5 ${role === 'handyman' ? 'text-white' : 'text-gray-400'}`} />
                  </div>
                  <p className={`font-medium ${role === 'handyman' ? 'text-blue-600' : 'text-gray-800'}`}>Handyman</p>
                  <p className="text-xs text-gray-500 mt-1">Ofer servicii</p>
                </button>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1">Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplu@email.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1">Parolă *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minim 8 caractere"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1">Confirmă parola *</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repetă parola"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !role}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Se creează contul...' : 'Creează cont'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Ai deja un cont? <Link to="/login" className="text-blue-600 font-medium hover:underline">Autentifică-te</Link>
          </p>
        </div>
      </div>
    </div>
  )
}