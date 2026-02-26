import { Link } from 'react-router-dom'
import { 
  Shield, Heart, Clock, Users, Briefcase, CheckCircle,
  Target, Eye, Award
} from 'lucide-react'

const stats = [
  { value: '10.000+', label: 'Clienți mulțumiți', icon: Users },
  { value: '2.500+', label: 'Handymani verificați', icon: Briefcase },
  { value: '25.000+', label: 'Lucrări finalizate', icon: CheckCircle },
  { value: '4.8/5', label: 'Rating mediu', icon: Award },
]

const values = [
  { 
    icon: Shield, 
    title: 'Siguranță', 
    desc: 'Toți handymanii sunt verificați și evaluați. Lucrările sunt garantate pentru liniștea ta.',
    color: 'bg-blue-100 text-blue-600'
  },
  { 
    icon: Heart, 
    title: 'Calitate', 
    desc: 'Selectăm doar profesioniști cu experiență dovedită și recenzii pozitive de la clienți reali.',
    color: 'bg-red-100 text-red-600'
  },
  { 
    icon: Clock, 
    title: 'Rapiditate', 
    desc: 'De la postarea taskului la primirea ofertelor în doar câteva minute. Fără așteptări inutile.',
    color: 'bg-amber-100 text-amber-600'
  },
]

const timeline = [
  { year: '2025', title: 'Ideea', desc: 'Am identificat nevoia unei platforme care să conecteze eficient clienții cu meșterii din zonă.' },
  { year: '2025', title: 'Cercetare', desc: 'Am studiat piața, am analizat platforme existente și am proiectat arhitectura aplicației.' },
  { year: '2026', title: 'Dezvoltare', desc: 'Am construit platforma folosind tehnologii moderne: React, Node.js, Supabase și Tailwind CSS.' },
  { year: '2026', title: 'Lansare', desc: 'HandyConnect devine disponibil public, conectând primii clienți cu handymani verificați.' },
]

export default function AboutUs() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <span className="text-blue-200 font-semibold text-sm uppercase tracking-wider">Despre noi</span>
          <h1 className="text-4xl md:text-5xl font-bold mt-2 mb-6">
            Conectăm oamenii cu meșterii potriviți
          </h1>
          <p className="text-blue-100 text-lg md:text-xl max-w-2xl mx-auto">
            HandyConnect s-a născut din dorința de a simplifica procesul de găsire a unui 
            profesionist de încredere pentru lucrările de acasă.
          </p>
        </div>
      </section>

      {/* Misiune & Viziune */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12">
            <div className="bg-blue-50 rounded-2xl p-8">
              <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mb-6">
                <Target className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Misiunea noastră</h2>
              <p className="text-gray-600 leading-relaxed">
                Să oferim o platformă accesibilă și transparentă prin care orice persoană poate 
                găsi rapid un profesionist verificat pentru lucrările de întreținere, reparații 
                și amenajări la domiciliu. Credem că fiecare om merită servicii de calitate, la 
                prețuri corecte și fără bătăi de cap.
              </p>
            </div>
            <div className="bg-purple-50 rounded-2xl p-8">
              <div className="w-14 h-14 bg-purple-600 rounded-xl flex items-center justify-center mb-6">
                <Eye className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Viziunea noastră</h2>
              <p className="text-gray-600 leading-relaxed">
                Să devenim platforma de referință din România pentru servicii handyman, 
                unde calitatea, transparența și încrederea sunt garantate. Ne dorim să construim 
                o comunitate în care meșterii sunt apreciați, iar clienții sunt mereu mulțumiți.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Statistici */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-white rounded-2xl p-6 text-center shadow-sm hover:shadow-md transition">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <stat.icon className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Valorile noastre */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">De ce noi</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mt-2 mb-4">Valorile noastre</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Principiile care ne ghidează în tot ceea ce facem
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {values.map((item) => (
              <div key={item.title} className="bg-white rounded-2xl p-8 border border-gray-100 hover:shadow-lg transition-all duration-300 text-center">
                <div className={`w-16 h-16 ${item.color} rounded-2xl flex items-center justify-center mx-auto mb-6`}>
                  <item.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">{item.title}</h3>
                <p className="text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline / Povestea noastră */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-14">
            <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">Parcursul nostru</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mt-2 mb-4">Povestea HandyConnect</h2>
          </div>
          <div className="space-y-0">
            {timeline.map((item, i) => (
              <div key={i} className="relative flex gap-6 pb-10 last:pb-0">
                {/* Linia verticală */}
                {i < timeline.length - 1 && (
                  <div className="absolute left-[23px] top-12 w-0.5 h-full bg-blue-200" />
                )}
                {/* Cercul */}
                <div className="relative z-10 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md">
                  {i + 1}
                </div>
                {/* Conținut */}
                <div className="bg-white rounded-xl p-6 shadow-sm flex-1 hover:shadow-md transition">
                  <span className="text-blue-600 font-semibold text-sm">{item.year}</span>
                  <h3 className="text-lg font-bold text-gray-800 mt-1">{item.title}</h3>
                  <p className="text-gray-500 mt-2">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Fii parte din comunitate</h2>
          <p className="text-xl mb-8 text-blue-100 max-w-2xl mx-auto">
            Indiferent dacă ai nevoie de un handyman sau ești un profesionist care caută clienți, 
            HandyConnect este locul potrivit.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              to="/register"
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-bold text-lg hover:bg-blue-50 transition"
            >
              Creează un cont
            </Link>
            <Link
              to="/contact"
              className="border-2 border-white text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-white hover:text-blue-600 transition"
            >
              Contactează-ne
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}