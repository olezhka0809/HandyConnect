import { Link, useLocation } from 'react-router-dom'
import { Wrench, Menu } from 'lucide-react'
import { useState } from 'react'
import logo from '../assets/Logo_pin.png'


export default function Navbar() {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const isActive = (path) => location.pathname === path

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Servicii', path: '/services' },
    { name: 'Rezervări', path: '/bookings' },
    { name: 'Despre noi', path: '/about' },
    { name: 'Contact', path: '/contact' },
  ]

  return (
    <header className="bg-white border-b border-blue-100 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
           
            <img src={logo} alt="HandyConnect" className="w-10 h-10 rounded-lg" />
        
            <span className="text-xl font-bold text-blue-600 group-hover:text-blue-700 transition">
              HandyConnect
            </span>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${isActive(link.path)
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50/50'
                  }
                  after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:h-0.5 after:bg-blue-600 after:rounded-full after:transition-all after:duration-300
                  ${isActive(link.path) ? 'after:w-2/3' : 'after:w-0 hover:after:w-2/3'}
                `}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className={`px-5 py-2 rounded-lg text-sm font-medium min-w-[140px] text-center border transition-all duration-200
                ${isActive('/login')
                  ? 'border-blue-600 text-blue-600 bg-blue-50'
                  : 'border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50'
                }
              `}
            >
              Autentificare
            </Link>
            <Link
              to="/register"
              className={`px-5 py-2 rounded-lg text-sm font-medium min-w-[140px] text-center transition-all duration-200
                ${isActive('/register')
                  ? 'bg-blue-700 text-white shadow-md'
                  : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md hover:-translate-y-0.5'
                }
              `}
            >
              Înregistrare
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-gray-600 hover:text-blue-600 transition"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-blue-100 py-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMenuOpen(false)}
                className={`block px-4 py-2 rounded-lg text-sm font-medium transition
                  ${isActive(link.path)
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                  }
                `}
              >
                {link.name}
              </Link>
            ))}
            <div className="flex gap-3 pt-2 px-4">
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="flex-1 text-center px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:border-blue-300 hover:text-blue-600 transition"
              >
                Autentificare
              </Link>
              <Link
                to="/register"
                onClick={() => setMenuOpen(false)}
                className="flex-1 text-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
              >
                Înregistrare
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}