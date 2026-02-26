import { useState } from 'react'
import { 
  MapPin, Phone, Mail, Clock, Send, 
  MessageSquare, HelpCircle, Bug
} from 'lucide-react'

const contactInfo = [
  { icon: MapPin, title: 'Adresă', text: 'Piața Victoriei nr. 2, Timișoara, România' },
  { icon: Phone, title: 'Telefon', text: '+40 123 456 789' },
  { icon: Mail, title: 'Email', text: 'contact@handyconnect.ro' },
  { icon: Clock, title: 'Program', text: 'Luni - Vineri: 08:00 - 18:00' },
]

const topics = [
  { icon: MessageSquare, title: 'Întrebări generale', desc: 'Informații despre platformă și servicii', color: 'bg-blue-100 text-blue-600' },
  { icon: HelpCircle, title: 'Suport clienți', desc: 'Ajutor cu contul, plăți sau rezervări', color: 'bg-green-100 text-green-600' },
  { icon: Bug, title: 'Raportare problemă', desc: 'Sesizează o eroare sau o problemă tehnică', color: 'bg-red-100 text-red-600' },
]

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log('Contact form:', formData)
    setSubmitted(true)
    // Aici vom conecta la backend mai târziu
  }

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <span className="text-blue-200 font-semibold text-sm uppercase tracking-wider">Contact</span>
          <h1 className="text-4xl md:text-5xl font-bold mt-2 mb-6">
            Suntem aici pentru tine
          </h1>
          <p className="text-blue-100 text-lg md:text-xl max-w-2xl mx-auto">
            Ai o întrebare, o sugestie sau ai nevoie de ajutor? 
            Nu ezita să ne contactezi — răspundem în cel mai scurt timp.
          </p>
        </div>
      </section>

      {/* Subiecte de contact */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6">
            {topics.map((topic) => (
              <div key={topic.title} className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-all duration-300 cursor-pointer group">
                <div className={`w-14 h-14 ${topic.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <topic.icon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">{topic.title}</h3>
                <p className="text-gray-500 text-sm">{topic.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Formular + Info */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-5 gap-8">
            
            {/* Formular */}
            <div className="md:col-span-3 bg-white rounded-2xl p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Trimite-ne un mesaj</h2>
              <p className="text-gray-500 mb-6">Completează formularul și te contactăm noi.</p>

              {submitted ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Mesaj trimis!</h3>
                  <p className="text-gray-500">Îți mulțumim! Vom reveni cu un răspuns în cel mai scurt timp.</p>
                  <button 
                    onClick={() => { setSubmitted(false); setFormData({ name: '', email: '', subject: '', message: '' }) }}
                    className="mt-6 text-blue-600 font-medium hover:underline"
                  >
                    Trimite alt mesaj
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nume complet</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Ion Popescu"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="email@exemplu.com"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subiect</label>
                    <select
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      required
                    >
                      <option value="">Selectează un subiect</option>
                      <option value="general">Întrebare generală</option>
                      <option value="support">Suport clienți</option>
                      <option value="bug">Raportare problemă</option>
                      <option value="partnership">Parteneriate</option>
                      <option value="other">Altele</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mesaj</label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Descrie pe scurt cum te putem ajuta..."
                      rows={5}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Send className="w-5 h-5" />
                    Trimite mesajul
                  </button>
                </form>
              )}
            </div>

            {/* Info contact */}
            <div className="md:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl p-8 shadow-sm">
                <h3 className="text-xl font-bold text-gray-800 mb-6">Informații de contact</h3>
                <div className="space-y-5">
                  {contactInfo.map((item) => (
                    <div key={item.title} className="flex items-start gap-4">
                      <div className="w-11 h-11 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{item.title}</p>
                        <p className="text-gray-500 text-sm">{item.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* FAQ rapid */}
              <div className="bg-blue-50 rounded-2xl p-8">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Întrebări frecvente</h3>
                <div className="space-y-4">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">Cât durează până primesc un răspuns?</p>
                    <p className="text-gray-500 text-sm mt-1">De obicei răspundem în maxim 24 de ore lucrătoare.</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">Cum îmi pot recupera parola?</p>
                    <p className="text-gray-500 text-sm mt-1">Folosește opțiunea "Am uitat parola" din pagina de autentificare.</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">Pot anula o rezervare?</p>
                    <p className="text-gray-500 text-sm mt-1">Da, poți anula gratuit cu cel puțin 24h înainte de programare.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}