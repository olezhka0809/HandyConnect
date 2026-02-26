import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const location = useLocation()

  const isActive = (path) => location.pathname === path

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🔧</span>
          <span className="text-xl font-bold text-blue-600">HandyConnect</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className={`px-4 py-2 rounded-lg font-medium transition ${
              isActive('/login')
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Autentificare
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Înregistrare
          </Link>
        </div>
      </div>
    </nav>
  )
}