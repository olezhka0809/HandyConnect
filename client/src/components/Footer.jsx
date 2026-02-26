import { Link } from 'react-router-dom'
import {
  Wrench, MapPin, Phone, Mail,
  Facebook, Twitter, Instagram, Linkedin
} from 'lucide-react'
import logo from '../assets/Logo_pin.png'

const services = [
  'Instalații sanitare', 'Instalații Electrice', 'Tâmplărie',
  'Zugrăveli & Vopsitorie', 'Curățenie', 'Grădinărit'
]

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-white mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src={logo} alt="HandyConnect" className="w-10 h-10 rounded-lg" />
              <span className="text-xl font-bold">HandyConnect</span>
            </div>
            <p className="text-gray-400 mb-4">
              Platforma ta de încredere pentru servicii de reparații și întreținere la domiciliu.
              Găsește rapid meșteri calificați pentru orice lucrare.
            </p>
            <div className="flex gap-3">
              {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
                <button key={i} className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors">
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-bold mb-4">Linkuri Rapide</h3>
            <ul className="space-y-2">
              {['Home', 'Servicii', 'Despre noi', 'Contact', 'Rezervări'].map((item) => (
                <li key={item}>
                  <button className="text-gray-400 hover:text-blue-400 transition-colors">{item}</button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-bold mb-4">Servicii Populare</h3>
            <ul className="space-y-2 text-gray-400">
              {services.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-bold mb-4">Contactează-ne</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-gray-400">
                <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>Piața Victoriei nr. 2, Timișoara, România</span>
              </li>
              <li className="flex items-start gap-3 text-gray-400">
                <Phone className="w-5 h-5 flex-shrink-0" />
                <span>+40 123 456 789</span>
              </li>
              <li className="flex items-start gap-3 text-gray-400">
                <Mail className="w-5 h-5 flex-shrink-0" />
                <span>contact@handyconnect.ro</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-8 text-center text-gray-400">
          <p className="text-lg font-bold text-white mb-2">HandyConnect</p>
          <p className="text-sm">© 2026 HandyConnect. Proiect de licență — Gărnăuțan Oleg, UPT</p>
        </div>
      </div>
    </footer>
  )
}