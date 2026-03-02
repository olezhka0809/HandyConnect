import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import DashboardNavbar from '../components/dashboard/DashboardNavbar'
import {
  ChevronLeft, MapPin, Clock, Star, CheckCircle, Heart, Share2,
  Calendar, MessageSquare, Phone, Shield, Award, Briefcase,
  Wrench, Zap, Hammer, Paintbrush,Target
} from 'lucide-react'

const mockHandymen = {
  'ion-marin': {
    name: 'Ion Marin',
    address: 'Str. Victoriei 15, Timișoara',
    rating: 4.9,
    reviews: 127,
    jobsCompleted: 234,
    responseTime: '< 1 oră',
    joinedDate: 'Martie 2020',
    rate: '90 RON/h',
    specialty: 'Instalații Electrice',
    tags: ['Instalații Electrice', 'Tablouri Electrice', 'Iluminat'],
    bio: 'Electrician profesionist cu peste 8 ani de experiență în lucrări electrice rezidențiale și comerciale. Specializat în recablări, instalații de iluminat și reparații electrice. Licențiat, asigurat și dedicat calității.',
    verified: true,
    phoneSupport: true,
    messageGuarantee: true,
    trust: {
      backgroundVerified: true,
      identityConfirmed: true,
      licensedInsured: true,
    },
    portfolio: [
      { title: 'Upgrade Electric Bucătărie', desc: 'Recablare completă bucătărie cu prize și iluminat sub dulap', date: 'Nov 2025', price: '850 RON', duration: '2 zile' },
      { title: 'Iluminat Smart Living', desc: 'Instalare becuri smart și sistem de control pentru iluminat ambient', date: 'Dec 2025', price: '600 RON', duration: '1 zi' },
      { title: 'Extensie Circuit Birou', desc: 'Adăugare circuite suplimentare pentru alimentare sigură birou', date: 'Ian 2026', price: '950 RON', duration: '3 zile' },
      { title: 'Ventilator Baie', desc: 'Instalare și cablare ventilator evacuare baie pentru ventilație îmbunătățită', date: 'Feb 2026', price: '400 RON', duration: '1 zi' },
    ],
    reviewsList: [
    { 
        name: 'Maria Popescu', 
        rating: 5, 
        text: 'Excelent! A venit la timp, a lucrat curat și profesionist. A explicat totul clar și a curățat după el. Recomand cu toată încrederea!', 
        date: 'Feb 2026', 
        service: 'Instalații Electrice',
        helpful: 12,
        reply: 'Mulțumesc, Maria! A fost o plăcere să lucrez la proiectul dumneavoastră. Nu ezitați să mă contactați pentru orice lucrare viitoare.'
    },
    { 
        name: 'Andrei Vasile', 
        rating: 5, 
        text: 'Foarte mulțumit de lucrare. Echipa a fost punctuală și foarte respectuoasă. Calitatea lucrării este de top!', 
        date: 'Ian 2026', 
        service: 'Recablare',
        helpful: 103,
        reply: 'Mulțumesc, Andrei! Mă bucur că sunteți mulțumit. Nu ezitați să ne contactați pentru alte proiecte.'
    },
    { 
        name: 'Elena Dumitrescu', 
        rating: 4, 
        text: 'Experiență plăcută! Instalarea noilor lumini a fost impecabilă. Electricianul a fost prietenos și eficient. Voi angaja din nou cu siguranță!', 
        date: 'Dec 2025', 
        service: 'Instalare Iluminat',
        helpful: 8,
        reply: 'Mulțumim, Elena! Ne bucurăm că v-au plăcut noile lumini. Suntem aici dacă aveți nevoie.'
    },
    { 
        name: 'Bogdan Cristea', 
        rating: 5, 
        text: 'Servicii fantastice! Au gestionat upgrade-ul panoului electric fără nicio problemă. Întregul proces a fost lin și fără stres. Recomand cu căldură.', 
        date: 'Nov 2025', 
        service: 'Upgrade Electric',
        helpful: 15,
        reply: 'Mulțumim, Bogdan! Ne bucurăm că upgrade-ul panoului a decurs perfect. Suntem aici pentru orice alte lucrări electrice.'
    },
    ],
    certifications: [
    { icon: Award, title: 'Electrician Licențiat', desc: 'Licență de Stat #EL-2019-456' },
    { icon: Shield, title: 'Asigurare de Răspundere', desc: 'Acoperire 1M RON' },
    { icon: CheckCircle, title: 'Verificare Background', desc: 'Verificat de HandyConnect' },
    ],
    serviceArea: {
    location: 'Timișoara, Timiș',
    radius: '15 km',
    },
    servicesProvided: [
    {
        title: 'Instalare Iluminat',
        desc: 'Montaj sisteme de iluminat interior și exterior pentru ambianță și siguranță',
        basePrice: '250 RON',
        perHour: '90 RON',
        totalRevenue: '4.150 RON',
        lastBooking: 'Dec 06',
        bookings: 15,
        duration: '2-3 ore',
        rating: 4.8,
        tags: ['Prize', 'Întrerupătoare', 'Cablare', 'Reparații'],
    },
    {
        title: 'Montaj Tablou Electric',
        desc: 'Instalare și upgrade tablouri electrice pentru siguranță și conformitate',
        basePrice: '300 RON',
        perHour: '120 RON',
        totalRevenue: '3.600 RON',
        lastBooking: 'Dec 04',
        bookings: 10,
        duration: '3-4 ore',
        rating: 4.7,
        tags: ['Upgrade', 'Testare', 'Conformitate', 'Instalare'],
    },
    {
        title: 'Recablare Completă',
        desc: 'Instalare completă de cablare pentru construcții noi',
        basePrice: '350 RON',
        perHour: '220 RON',
        totalRevenue: '7.000 RON',
        lastBooking: 'Dec 03',
        bookings: 5,
        duration: '1-2 săpt.',
        rating: 4.6,
        tags: ['Cablare', 'Prize', 'Tablouri', 'Instalare'],
    },
    {
        title: 'Automatizare Locuință',
        desc: 'Instalare sisteme smart home pentru controlul automatizat al iluminatului și aparatelor',
        basePrice: '500 RON',
        perHour: '200 RON',
        totalRevenue: '6.500 RON',
        lastBooking: 'Nov 29',
        bookings: 15,
        duration: '5-6 ore',
        rating: 4.9,
        tags: ['Dispozitive Smart', 'Programare', 'Consultanță'],
    },
    ],
    availability: {
      luni: '08:00 - 18:00',
      marti: '08:00 - 18:00',
      miercuri: '08:00 - 18:00',
      joi: '08:00 - 18:00',
      vineri: '08:00 - 16:00',
      sambata: '09:00 - 14:00',
      duminica: 'Indisponibil',
    }
  },
  'ana-dragomir': {
    name: 'Ana Dragomir',
    address: 'Bd. Revoluției 45, Timișoara',
    rating: 4.9,
    reviews: 112,
    jobsCompleted: 180,
    responseTime: '< 30 min',
    joinedDate: 'Iunie 2021',
    rate: '55 RON/h',
    specialty: 'Curățenie',
    tags: ['Curățenie Generală', 'Organizare', 'Curățenie Post-Renovare'],
    bio: 'Specialist în curățenie profesională cu atenție la detalii. Ofer servicii de curățenie generală, curățenie profundă și organizare spații.',
    verified: true,
    phoneSupport: true,
    messageGuarantee: true,
    trust: { backgroundVerified: true, identityConfirmed: true, licensedInsured: true },
    portfolio: [
      { title: 'Curățenie Apartament 3 Camere', desc: 'Curățenie profundă completă cu igienizare', date: 'Feb 2026', price: '350 RON', duration: '1 zi' },
      { title: 'Curățenie Post-Renovare', desc: 'Curățare completă după lucrări de zugrăvit și parchet', date: 'Ian 2026', price: '500 RON', duration: '2 zile' },
    ],
    reviewsList: [
      { name: 'Simona Radu', rating: 5, text: 'Impecabilă! Apartamentul arată ca nou. Foarte atentă la detalii.', date: 'Feb 2026' },
      { name: 'Mihai Stancu', rating: 5, text: 'Promptă, profesionistă și foarte organizată. O recomand!', date: 'Ian 2026' },
    ],
    availability: {
      luni: '07:00 - 17:00', marti: '07:00 - 17:00', miercuri: '07:00 - 17:00',
      joi: '07:00 - 17:00', vineri: '07:00 - 15:00', sambata: '08:00 - 13:00', duminica: 'Indisponibil',
    }
  },
}




export default function HandymanProfile() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('portfolio')
  const [isFavorite, setIsFavorite] = useState(false)

  const handyman = mockHandymen[slug]

  if (!handyman) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNavbar />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Profil negăsit</h2>
          <p className="text-gray-500 mb-6">Handymanul căutat nu există.</p>
          <button onClick={() => navigate('/find-services')} className="text-blue-600 font-medium hover:underline">
            ← Înapoi la căutare
          </button>
        </div>
      </div>
    )
  }

  const initials = handyman.name.split(' ').map(n => n[0]).join('')

  const tabs = [
    { id: 'portfolio', label: 'Portofoliu' },
    { id: 'reviews', label: 'Recenzii' },
    { id: 'about', label: 'Despre' },
    { id: 'availability', label: 'Disponibilitate' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavbar />

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-gray-500 hover:text-blue-600 transition mb-6 text-sm font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          Înapoi la căutare
        </button>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Header */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    {initials}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl font-bold text-gray-800">{handyman.name}</h1>
                      {handyman.verified && <CheckCircle className="w-5 h-5 text-blue-600" />}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{handyman.address}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>Răspunde {handyman.responseTime}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium text-gray-800">{handyman.rating}</span>
                        <span className="text-sm text-gray-400">({handyman.reviews} recenzii)</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>{handyman.jobsCompleted} lucrări finalizate</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsFavorite(!isFavorite)}
                    className={`w-10 h-10 rounded-lg border flex items-center justify-center transition
                      ${isFavorite ? 'bg-red-50 border-red-200 text-red-500' : 'border-gray-200 text-gray-400 hover:text-red-500'}
                    `}
                  >
                    <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500' : ''}`} />
                  </button>
                  <button className="w-10 h-10 rounded-lg border border-gray-200 text-gray-400 hover:text-blue-600 flex items-center justify-center transition">
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {handyman.tags.map((tag) => (
                  <span key={tag} className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-lg font-medium">
                    {tag}
                  </span>
                ))}
              </div>

              <p className="text-gray-600 leading-relaxed">{handyman.bio}</p>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl border border-gray-100">
              <div className="flex border-b border-gray-100">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-3 text-sm font-medium text-center transition-all relative
                      ${activeTab === tab.id
                        ? 'text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                      }
                      ${activeTab === tab.id ? 'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600' : ''}
                    `}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {/* Portfolio */}
                {activeTab === 'portfolio' && (
                  <div className="grid grid-cols-2 gap-4">
                    {handyman.portfolio.map((item, i) => (
                      <div key={i} className="border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition group">
                        <div className="h-40 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                          <Wrench className="w-12 h-12 text-blue-400 group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="p-4">
                          <h4 className="font-bold text-gray-800 mb-1">{item.title}</h4>
                          <p className="text-sm text-gray-500 mb-3">{item.desc}</p>
                          <div className="flex items-center justify-between text-xs text-gray-400">
                            <span>{item.date}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-blue-600">{item.price}</span>
                              <span>· {item.duration}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reviews */}
                {activeTab === 'reviews' && (
                <div>
                    {/* Rating Summary */}
                    <div className="flex items-start gap-8 mb-8 pb-8 border-b border-gray-100">
                    <div className="text-center">
                        <p className="text-5xl font-bold text-gray-800">{handyman.rating}</p>
                        <div className="flex items-center gap-0.5 mt-2 justify-center">
                        {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-5 h-5 ${i < Math.round(handyman.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                        ))}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{handyman.reviews} recenzii</p>
                    </div>

                    <div className="flex-1 space-y-2">
                        {[5, 4, 3, 2, 1].map((stars) => {
                        const count = handyman.reviewsList.filter(r => r.rating === stars).length
                        const percentage = handyman.reviewsList.length > 0 ? (count / handyman.reviewsList.length) * 100 : 0
                        return (
                            <div key={stars} className="flex items-center gap-3">
                            <span className="text-sm text-gray-500 w-8">{stars} ★</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                                <div
                                className="bg-yellow-400 h-2.5 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                                />
                            </div>
                            <span className="text-sm text-gray-500 w-6 text-right">{count}</span>
                            </div>
                        )
                        })}
                    </div>
                    </div>

                    {/* Reviews List */}
                    <div className="space-y-6">
                    {handyman.reviewsList.map((review, i) => (
                        <div key={i} className="border border-gray-100 rounded-xl p-5">
                        {/* Review Header */}
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-bold text-sm">
                                {review.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                                <p className="font-medium text-gray-800">{review.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                <div className="flex items-center gap-0.5">
                                    {[...Array(5)].map((_, j) => (
                                    <Star key={j} className={`w-3.5 h-3.5 ${j < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                                    ))}
                                </div>
                                <span className="text-xs text-gray-400">{review.date}</span>
                                </div>
                            </div>
                            </div>
                            {review.service && (
                            <span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-xs rounded-lg font-medium">
                                {review.service}
                            </span>
                            )}
                        </div>

                        {/* Review Text */}
                        <p className="text-sm text-gray-600 leading-relaxed mb-4">{review.text}</p>

                        {/* Reply */}
                        {review.reply && (
                            <div className="bg-gray-50 rounded-lg p-4 mb-4 ml-6 border-l-2 border-blue-400">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                {initials}
                                </div>
                                <span className="text-sm font-medium text-gray-800">{handyman.name}</span>
                            </div>
                            <p className="text-sm text-gray-500">{review.reply}</p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                            <button className="flex items-center gap-1 hover:text-blue-600 transition">
                            <Heart className="w-3.5 h-3.5" />
                            <span>Util ({review.helpful})</span>
                            </button>
                            <button className="hover:text-red-500 transition">Raportează</button>
                        </div>
                        </div>
                    ))}
                    </div>
                </div>
                )}

                {/* About */}
                {activeTab === 'about' && (
                    <div className="space-y-8">
                        {/* Bio */}
                        <div>
                        <h4 className="text-lg font-bold text-gray-800 mb-3">Despre {handyman.name}</h4>
                        <p className="text-gray-600 leading-relaxed">{handyman.bio}</p>
                        </div>

                        {/* Certifications + Service Area */}
                        <div className="grid md:grid-cols-2 gap-4">
                        {/* Certifications */}
                        <div className="bg-gray-50 rounded-xl p-6">
                            <h4 className="font-bold text-gray-800 mb-4">Certificări & Licențe</h4>
                            <div className="space-y-4">
                            {(handyman.certifications || []).map((cert, i) => (
                                <div key={i} className="flex items-start gap-3">
                                <cert.icon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="font-medium text-gray-800 text-sm">{cert.title}</p>
                                    <p className="text-xs text-gray-500">{cert.desc}</p>
                                </div>
                                </div>
                            ))}
                            </div>
                        </div>

                        {/* Service Area */}
                        <div className="bg-gray-50 rounded-xl p-6">
                            <h4 className="font-bold text-gray-800 mb-4">Zonă de Acoperire</h4>
                            <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <MapPin className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div>
                                <p className="font-medium text-gray-800 text-sm">Locație principală</p>
                                <p className="text-xs text-gray-500">{handyman.serviceArea?.location || handyman.address}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Target className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div>
                                <p className="font-medium text-gray-800 text-sm">Rază de deservire</p>
                                <p className="text-xs text-gray-500">În limita a {handyman.serviceArea?.radius || '15 km'}</p>
                                </div>
                            </div>
                            </div>
                        </div>
                        </div>

                        {/* Services Provided */}
                        <div>
                        <h4 className="text-lg font-bold text-gray-800 mb-4">Servicii Oferite</h4>
                        <div className="grid md:grid-cols-2 gap-4">
                            {(handyman.servicesProvided || []).map((service, i) => (
                            <div key={i} className="border border-gray-100 rounded-xl p-5 hover:shadow-md transition">
                                <h5 className="font-bold text-gray-800 mb-1">{service.title}</h5>
                                <p className="text-sm text-gray-500 mb-4">{service.desc}</p>

                                <div className="grid grid-cols-2 gap-y-3 mb-4 pb-4 border-b border-gray-100">
                                <div>
                                    <p className="text-xs text-gray-400">Preț de bază</p>
                                    <p className="font-bold text-gray-800">{service.basePrice}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Pe oră</p>
                                    <p className="font-bold text-gray-800">{service.perHour}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Venit total</p>
                                    <p className="font-bold text-blue-600">{service.totalRevenue}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Ultima rezervare</p>
                                    <p className="font-medium text-gray-800">{service.lastBooking}</p>
                                </div>
                                </div>

                                <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                                <div className="flex items-center gap-1">
                                    <Briefcase className="w-3 h-3" />
                                    <span>{service.bookings} rezervări</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    <span>{service.duration}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                    <span className="font-medium">{service.rating}</span>
                                </div>
                                </div>

                                <div className="flex flex-wrap gap-1.5">
                                {service.tags.map((tag) => (
                                    <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md font-medium">
                                    {tag}
                                    </span>
                                ))}
                                </div>
                            </div>
                            ))}
                        </div>
                        </div>
                    </div>
                )}

                {/* Availability */}
                {activeTab === 'availability' && (
                <div className="space-y-6">
                    {/* Schedule + Response Time */}
                    <div className="bg-gray-50 rounded-xl p-6">
                    <h4 className="font-bold text-gray-800 mb-5">Disponibilitate</h4>
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Typical Schedule */}
                        <div>
                        <h5 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Program tipic</h5>
                        <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-800">Luni - Vineri</span>
                            <span className="text-sm text-gray-600">08:00 - 18:00</span>
                            </div>
                            <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-800">Sâmbătă</span>
                            <span className="text-sm text-gray-600">09:00 - 16:00</span>
                            </div>
                            <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-800">Duminică</span>
                            <span className="text-sm text-gray-500 italic">Doar urgențe</span>
                            </div>
                        </div>
                        </div>

                        {/* Response Time */}
                        <div>
                        <h5 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Timp de răspuns</h5>
                        <div className="space-y-2.5">
                            <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            <span className="text-sm text-gray-600">Răspunde de obicei în {handyman.responseTime}</span>
                            </div>
                            <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            <span className="text-sm text-gray-600">Disponibil pentru apeluri de urgență</span>
                            </div>
                            <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full" />
                            <span className="text-sm text-gray-600">Rezervări cu 2-3 săptămâni în avans</span>
                            </div>
                        </div>
                        </div>
                    </div>
                    </div>

                    {/* Current Booking Status */}
                    <div className="bg-gray-50 rounded-xl p-6">
                    <h4 className="font-bold text-gray-800 mb-4">Status Curent Rezervări</h4>
                    <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-1">
                        <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                        <span className="font-semibold text-green-700">Disponibil</span>
                        </div>
                        <p className="text-sm text-green-600">
                        Acceptă rezervări noi. Următorul slot disponibil: <span className="font-medium">Mâine</span>
                        </p>
                    </div>
                    </div>
                </div>
            )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Booking Card */}
            <div className="bg-white rounded-xl border border-gray-100 p-6 sticky top-20">
              <p className="text-sm text-gray-500 text-center mb-1">Tarif de la</p>
              <p className="text-3xl font-bold text-gray-800 text-center mb-6">{handyman.rate}</p>

              <button
                onClick={() => navigate(`/book/${slug}`)}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition mb-3"
                >
                <Calendar className="w-5 h-5" />
                Rezervă acum
              </button>
              <button className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition">
                <MessageSquare className="w-5 h-5" />
                Trimite mesaj
              </button>

              <div className="mt-6 space-y-3 text-sm">
                <div className="flex items-center justify-between text-gray-600">
                  <span>Timp răspuns:</span>
                  <span className="font-medium">{handyman.responseTime}</span>
                </div>
                <div className="flex items-center justify-between text-gray-600">
                  <span>Lucrări finalizate:</span>
                  <span className="font-medium">{handyman.jobsCompleted}</span>
                </div>
                <div className="flex items-center justify-between text-gray-600">
                  <span>Membru din:</span>
                  <span className="font-medium">{handyman.joinedDate}</span>
                </div>
              </div>

              <div className="border-t border-gray-100 mt-5 pt-4 space-y-2">
                {handyman.phoneSupport && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4 text-green-500" />
                    <span>Suport telefonic disponibil</span>
                  </div>
                )}
                {handyman.messageGuarantee && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                    <span>Răspuns la mesaje garantat</span>
                  </div>
                )}
              </div>
            </div>

            {/* Trust & Safety */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h3 className="font-bold text-gray-800 mb-4">Încredere & Siguranță</h3>
              <div className="space-y-3">
                {handyman.trust.backgroundVerified && (
                  <div className="flex items-center gap-3 text-sm">
                    <Shield className="w-5 h-5 text-green-500" />
                    <span className="text-gray-600">Verificare background</span>
                  </div>
                )}
                {handyman.trust.identityConfirmed && (
                  <div className="flex items-center gap-3 text-sm">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-gray-600">Identitate confirmată</span>
                  </div>
                )}
                {handyman.trust.licensedInsured && (
                  <div className="flex items-center gap-3 text-sm">
                    <Award className="w-5 h-5 text-green-500" />
                    <span className="text-gray-600">Licențiat & Asigurat</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}