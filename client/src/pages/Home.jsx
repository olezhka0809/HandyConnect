import { Link } from 'react-router-dom'
import { 
  Wrench, Zap, Hammer, Paintbrush, Sparkles, Leaf,
  ArrowRight, Star, MapPin, Phone, Mail,
  Facebook, Twitter, Instagram, Linkedin
} from 'lucide-react'

import logo from '../assets/Logo_pin.png'

const services = [
  { icon: Wrench, name: 'Instalații sanitare', desc: 'Reparații, montaj și întreținere pentru instalații sanitare', color: 'bg-blue-100 text-blue-600' },
  { icon: Zap, name: 'Instalații Electrice', desc: 'Cablaj, prize, iluminat, reparații', color: 'bg-yellow-100 text-yellow-600' },
  { icon: Hammer, name: 'Tâmplărie', desc: 'Montaj mobilă, reparații, lucrări la comandă', color: 'bg-amber-100 text-amber-600' },
  { icon: Paintbrush, name: 'Zugrăveli & Vopsitorie', desc: 'Vopsit interior/exterior, retușuri', color: 'bg-purple-100 text-purple-600' },
  { icon: Sparkles, name: 'Curățenie', desc: 'Curățenie generală, întreținere, organizare', color: 'bg-pink-100 text-pink-600' },
  { icon: Leaf, name: 'Grădinărit', desc: 'Îngrijirea gazonului, peisagistică, întreținere', color: 'bg-green-100 text-green-600' },
]

const reviews = [
  { 
    name: 'Maria Popescu', 
    service: 'Instalații Sanitare', 
    text: 'Servicii excelente! Instalatorul a ajuns la timp și a rezolvat problema rapid. Recomand cu toată încrederea!',
    initials: 'MP',
    color: 'bg-blue-500',
    rating: 5
  },
  { 
    name: 'Mihai Stancu', 
    service: 'Zugrăveli & Vopsitorie', 
    text: 'Profesioniști și amabili. Au făcut o treabă minunată cu zugrăvirea sufrageriei. Calitatea lucrării este excepțională.',
    initials: 'MS',
    color: 'bg-purple-500',
    rating: 5
  },
  { 
    name: 'Simona Radu', 
    service: 'Instalații Electrice', 
    text: 'Foarte mulțumit de lucrările electrice. Totul a fost executat în siguranță și eficient. Voi apela din nou la ei.',
    initials: 'SR',
    color: 'bg-green-500',
    rating: 5
  },
]

const steps = [
  { icon: '📝', title: 'Postează un task', desc: 'Descrie ce lucrare ai nevoie și adaugă poze. AI-ul nostru te ajută cu descrierea și etichetele.' },
  { icon: '🤝', title: 'Primește oferte', desc: 'Handymanii din zona ta trimit propuneri cu preț și timp estimat. Tu alegi cel mai potrivit.' },
  { icon: '✅', title: 'Lucrare finalizată', desc: 'După finalizare, confirmi lucrarea și lași un review. Simplu și transparent.' },
]

function StarRating() {
  return (
    <div className="flex gap-1 mb-4">
      {[...Array(5)].map((_, i) => (
        <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
      ))}
    </div>
  )
}

function ServiceCard({ icon: Icon, name, desc, color }) {
  return (
    <div className="bg-white flex flex-col gap-4 hover:shadow-lg transition-shadow cursor-pointer rounded-2xl border-2 border-gray-100 hover:border-blue-500 p-6">
      <div className={`w-14 h-14 ${color} rounded-xl flex items-center justify-center`}>
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-xl font-bold text-gray-800">{name}</h3>
      <p className="text-gray-500">{desc}</p>
      <button className="flex items-center gap-2 text-blue-600 font-medium hover:gap-3 transition-all">
        <span>Rezervă acum</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )
}

function ReviewCard({ name, service, text, initials, color, rating }) {
  return (
    <div className="relative bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 group">
      {/* Quote mark */}
      <div className="absolute -top-4 right-8 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-serif shadow-md group-hover:scale-110 transition-transform">
        "
      </div>

      {/* Stars */}
      <div className="flex gap-1 mb-5">
        {[...Array(rating)].map((_, i) => (
          <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
        ))}
      </div>

      {/* Text */}
      <p className="text-gray-600 leading-relaxed mb-6 italic">
        "{text}"
      </p>

      {/* Divider */}
      <div className="border-t border-gray-100 pt-5">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className={`w-12 h-12 ${color} rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm`}>
            {initials}
          </div>
          <div>
            <p className="font-bold text-gray-800">{name}</p>
            <p className="text-sm text-blue-600 font-medium">{service}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <div className="max-w-6xl mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Găsește cel mai bun handyman
            <br />pentru orice lucrare
          </h1>
          <p className="text-blue-100 text-lg md:text-xl mb-10 max-w-2xl mx-auto">
            Conectăm clienții cu profesioniști verificați pentru lucrări de
            întreținere, reparații și amenajări. Rapid, sigur și la prețuri corecte.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              to="/register"
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-bold text-lg hover:bg-blue-50 transition"
            >
              Postează un task
            </Link>
            <Link
              to="/register"
              className="border-2 border-white text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-white hover:text-blue-600 transition"
            >
              Devino Handyman
            </Link>
          </div>
        </div>
      </section>

      {/* Servicii Populare */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">Servicii Populare</h2>
            <p className="text-gray-500 text-lg">Alege dintr-o gamă largă de servicii profesionale</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <ServiceCard key={service.name} {...service} />
            ))}
          </div>
        </div>
      </section>

      {/* Cum funcționează */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-12">
            Cum funcționează?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((item, i) => (
              <div key={i} className="text-center p-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">{item.title}</h3>
                <p className="text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recenzii */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">Testimoniale</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mt-2 mb-4">Ce zic clienții noștri</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Peste 10.000 de clienți mulțumiți și recenzii excelente
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {reviews.map((review) => (
              <ReviewCard key={review.name} {...review} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ești gata să începi?</h2>
          <p className="text-xl mb-8 text-blue-100">
            Rezervă un meșter astăzi și asigură-te că reparațiile tale sunt făcute corect.
          </p>
          <Link
            to="/register"
            className="inline-block bg-white text-blue-600 px-8 py-3 rounded-xl font-bold text-lg hover:bg-blue-50 transition"
          >
            Rezervă un serviciu
          </Link>
        </div>
      </section>

      
    </div>
  )
}