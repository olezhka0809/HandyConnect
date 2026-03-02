import { useState } from 'react'
import DashboardNavbar from '../components/dashboard/DashboardNavbar'
import {
  MessageCircle, FileText, Phone, Search, ChevronDown, ChevronUp,
  Calendar, AlertTriangle, CreditCard, User, Shield, HelpCircle,
  Send, X
} from 'lucide-react'

const quickActions = [
  { icon: MessageCircle, title: 'Live Chat', desc: 'Primește ajutor instant de la echipa de suport', badge: 'Disponibil 24/7', badgeColor: 'text-green-600' },
  { icon: FileText, title: 'Trimite Ticket', desc: 'Creează o cerere detaliată de suport', badge: 'Răspuns în 2-4 ore', badgeColor: 'text-blue-600' },
  { icon: Phone, title: 'Suport Telefonic', desc: 'Vorbește direct cu echipa noastră', badge: '0800-HANDY-HELP', badgeColor: 'text-purple-600' },
]

const faqs = [
  {
    question: 'Cum rezerv un handyman?',
    answer: 'Poți rezerva un handyman din secțiunea "Caută Servicii", selectând un profesionist și apăsând "Rezervă acum". Urmează pașii din formularul de rezervare pentru a selecta data și ora preferate.',
    tag: 'Rezervări & Programări',
  },
  {
    question: 'Ce servicii oferă handymanii?',
    answer: 'Handymanii oferă o gamă variată de servicii incluzând instalații sanitare, electrice, zugrăveli, tâmplărie și reparații generale. Verifică pagina fiecărui profesionist pentru lista completă de servicii.',
    tag: 'Servicii Oferite',
  },
  {
    question: 'Cât costă să angajez un handyman?',
    answer: 'Costul variază în funcție de tipul serviciului, locație și timp necesar. În medie, poți plăti între 50 și 200 RON pe oră. Fiecare handyman are tarifele afișate pe profil.',
    tag: 'Informații Prețuri',
  },
  {
    question: 'Handymanii sunt licențiați și asigurați?',
    answer: 'Majoritatea handymanilor sunt obligați să dețină licențele și asigurările necesare. Este recomandabil să verifici acreditările înainte de angajare. Profilurile verificate au badge-ul de verificare.',
    tag: 'Licențe & Asigurări',
  },
  {
    question: 'Ce fac dacă nu sunt mulțumit de serviciu?',
    answer: 'Dacă nu ești mulțumit, contactează imediat suportul clienți. Vom lucra cu tine pentru a rezolva problema sau pentru a oferi o rambursare dacă este cazul.',
    tag: 'Satisfacție Client',
  },
]

const categories = [
  { icon: Calendar, title: 'Rezervări & Programări', desc: 'Ajutor cu rezervări, programări și modificări', links: ['Cum rezerv un serviciu', 'Reprogramare întâlniri'] },
  { icon: AlertTriangle, title: 'Probleme Handyman', desc: 'Raportează probleme sau nemulțumiri', links: ['Raportează comportament', 'Probleme de calitate'] },
  { icon: CreditCard, title: 'Plăți & Facturare', desc: 'Întrebări despre plăți, rambursări și facturi', links: ['Plată neprocesată', 'Cerere rambursare'] },
  { icon: User, title: 'Cont & Profil', desc: 'Ajutor cu setările contului și profilului', links: ['Actualizare informații', 'Resetare parolă'] },
  { icon: Shield, title: 'Siguranță & Securitate', desc: 'Raportează probleme de siguranță', links: ['Raportează activitate suspectă', 'Ghid siguranță'] },
  { icon: HelpCircle, title: 'Alte Întrebări', desc: 'Întrebări generale și feedback', links: ['Cum funcționează HandyConnect', 'Funcționalități aplicație'] },
]

const reportCategories = ['Problemă Handyman', 'Problemă Plată', 'Problemă Tehnică', 'Siguranță', 'Altele']
const severityLevels = [
  { value: 'low', label: 'Scăzut - Întrebare generală' },
  { value: 'medium', label: 'Mediu - Problemă care afectează experiența' },
  { value: 'high', label: 'Ridicat - Problemă urgentă' },
  { value: 'critical', label: 'Critic - Necesită atenție imediată' },
]

export default function Issues() {
  const [activeTab, setActiveTab] = useState('help')
  const [searchQuery, setSearchQuery] = useState('')
  const [openFaq, setOpenFaq] = useState(null)
  const [reportForm, setReportForm] = useState({
    category: '',
    severity: '',
    bookingId: '',
    description: '',
  })

  const tabs = [
    { id: 'help', label: 'Centru de Ajutor' },
    { id: 'report', label: 'Raportează Problemă' },
    { id: 'tickets', label: 'Tichetele Mele' },
    { id: 'contact', label: 'Informații Contact' },
  ]

  const filteredFaqs = searchQuery
    ? faqs.filter(f => f.question.toLowerCase().includes(searchQuery.toLowerCase()) || f.answer.toLowerCase().includes(searchQuery.toLowerCase()))
    : faqs

  const handleSubmitReport = (e) => {
    e.preventDefault()
    console.log('Report submitted:', reportForm)
    alert('Raportul a fost trimis cu succes!')
    setReportForm({ category: '', severity: '', bookingId: '', description: '' })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavbar />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Suport Clienți</h1>
          <p className="text-gray-500 mt-1">Suntem aici să te ajutăm! Primește asistență cu rezervări, plăți și orice alte întrebări.</p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h3 className="font-bold text-gray-800 mb-3">Acțiuni Rapide</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action) => (
              <button key={action.title} className="bg-white rounded-xl border border-gray-100 p-5 text-left hover:shadow-md hover:border-blue-200 transition-all group">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition">
                    <action.icon className="w-5 h-5 text-blue-600 group-hover:text-white transition" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{action.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{action.desc}</p>
                    <p className={`text-xs font-medium ${action.badgeColor} mt-1`}>{action.badge}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white rounded-xl border border-gray-100 p-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium text-center transition-all
                ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">

          {/* Help Center */}
          {activeTab === 'help' && (
            <div className="p-6">
              <h3 className="font-bold text-gray-800 mb-4">Întrebări Frecvente</h3>

              {/* Search */}
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Caută în FAQ..."
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* FAQ Items */}
              <div className="space-y-3 mb-8">
                {filteredFaqs.map((faq, i) => (
                  <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition"
                    >
                      <span className="font-medium text-gray-800">{faq.question}</span>
                      {openFaq === i ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                    </button>
                    {openFaq === i && (
                      <div className="px-5 pb-5">
                        <p className="text-sm text-gray-600 leading-relaxed mb-3">{faq.answer}</p>
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg font-medium">{faq.tag}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Categories */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {categories.map((cat) => (
                  <div key={cat.title} className="border border-gray-100 rounded-xl p-5 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                      <cat.icon className="w-5 h-5 text-blue-600" />
                    </div>
                    <h4 className="font-bold text-gray-800 text-sm">{cat.title}</h4>
                    <p className="text-xs text-gray-500 mt-1 mb-3">{cat.desc}</p>
                    <div className="space-y-1">
                      {cat.links.map((link) => (
                        <p key={link} className="text-xs text-blue-600 hover:underline cursor-pointer">→ {link}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Report Issue */}
          {activeTab === 'report' && (
            <div className="p-6">
              <h3 className="font-bold text-gray-800 mb-1">Raportează o problemă</h3>
              <p className="text-sm text-gray-500 mb-6">Descrie problema și echipa noastră o va analiza</p>

              <form onSubmit={handleSubmitReport} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">Categoria raportului</label>
                  <select
                    value={reportForm.category}
                    onChange={(e) => setReportForm({ ...reportForm, category: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Selectează categoria</option>
                    {reportCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">Nivel de severitate</label>
                  <select
                    value={reportForm.severity}
                    onChange={(e) => setReportForm({ ...reportForm, severity: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Selectează severitatea</option>
                    {severityLevels.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">ID Rezervare (opțional)</label>
                  <input
                    type="text"
                    value={reportForm.bookingId}
                    onChange={(e) => setReportForm({ ...reportForm, bookingId: e.target.value })}
                    placeholder="Introdu ID-ul rezervării dacă este relevant"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">Descrie problema</label>
                  <textarea
                    value={reportForm.description}
                    onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
                    placeholder="Oferă detalii despre problemă..."
                    rows={5}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setReportForm({ category: '', severity: '', bookingId: '', description: '' })}
                    className="px-5 py-2.5 border border-gray-200 rounded-lg text-gray-600 font-medium hover:bg-gray-50 transition"
                  >
                    Anulează
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                  >
                    <Send className="w-4 h-4" />
                    Trimite Raportul
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* My Tickets */}
          {activeTab === 'tickets' && (
            <div className="p-6">
              <h3 className="font-bold text-gray-800 mb-4">Tichetele Mele</h3>
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-gray-400" />
                </div>
                <h4 className="font-bold text-gray-800 mb-2">Niciun tichet activ</h4>
                <p className="text-sm text-gray-500 mb-4">Nu ai niciun tichet de suport deschis momentan.</p>
                <button
                  onClick={() => setActiveTab('report')}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition"
                >
                  Creează un tichet
                </button>
              </div>
            </div>
          )}

          {/* Contact Info */}
          {activeTab === 'contact' && (
            <div className="p-6">
              <h3 className="font-bold text-gray-800 mb-6">Informații de Contact</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Phone className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">Telefon</p>
                      <p className="text-sm text-gray-600">+40 123 456 789</p>
                      <p className="text-xs text-gray-400 mt-1">Luni - Vineri, 08:00 - 18:00</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">Live Chat</p>
                      <p className="text-sm text-gray-600">Disponibil pe platformă</p>
                      <p className="text-xs text-green-600 mt-1">Online acum</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">Email Suport</p>
                      <p className="text-sm text-gray-600">suport@handyconnect.ro</p>
                      <p className="text-xs text-gray-400 mt-1">Răspuns în max. 24 ore</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">Urgențe</p>
                      <p className="text-sm text-gray-600">+40 123 456 000</p>
                      <p className="text-xs text-red-500 mt-1">Disponibil 24/7</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}