import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function Dashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate('/login')
      } else {
        setUser(user)
      }
    })
  }, [navigate])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  if (!user) return null

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          Bine ai venit, {user.user_metadata?.first_name || 'Utilizator'}! 👋
        </h1>
        <p className="text-gray-500 mb-2">Email: {user.email}</p>
        <p className="text-gray-500 mb-2">Rol: {user.user_metadata?.role || 'client'}</p>
        <p className="text-gray-500 mb-6">Cont creat: {new Date(user.created_at).toLocaleDateString('ro-RO')}</p>
        
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition cursor-pointer"
        >
          Deconectare
        </button>
      </div>
    </div>
  )
}