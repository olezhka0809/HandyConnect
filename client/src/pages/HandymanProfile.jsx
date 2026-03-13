import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import DashboardNavbar from '../components/dashboard/DashboardNavbar'
import {
  ChevronLeft, MapPin, Clock, Star, CheckCircle, Heart, Share2,
  Calendar, MessageSquare, Shield, Award, Briefcase,
  Wrench, Globe, Loader2, Target, AlertCircle
} from 'lucide-react'

function StarRow({ rating, size = 'sm' }) {
  const sz = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i=>(
        <Star key={i} className={`${sz} ${i<=Math.round(rating)?'fill-yellow-400 text-yellow-400':'text-gray-200'}`}/>
      ))}
    </div>
  )
}

export default function HandymanProfile() {
  const { slug } = useParams()
  const navigate  = useNavigate()
  const [activeTab,   setActiveTab]   = useState('servicii')
  const [isFavorite,  setIsFavorite]  = useState(false)
  const [loading,     setLoading]     = useState(true)
  const [notFound,    setNotFound]    = useState(false)

  // data
  const [handyman,  setHandyman]  = useState(null)   // handyman_profiles row
  const [profile,   setProfile]   = useState(null)   // profiles row (name, avatar)
  const [services,  setServices]  = useState([])
  const [reviews,   setReviews]   = useState([])

  // ── load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true)

      // 1. get all profiles to find one matching the slug
      // slug = firstName-lastName normalized
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, phone, email')

      if (!allProfiles?.length) { setNotFound(true); setLoading(false); return }

      // find matching slug
      function slugify(f, l) {
        return `${f}-${l}`.toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
          .replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')
      }

      const matched = allProfiles.find(p =>
        slugify(p.first_name ?? '', p.last_name ?? '') === slug
      )
      if (!matched) { setNotFound(true); setLoading(false); return }

      setProfile(matched)

      // 2. handyman_profiles
      const { data: hp } = await supabase
        .from('handyman_profiles')
        .select('*')
        .eq('user_id', matched.id)
        .maybeSingle()

      if (!hp) { setNotFound(true); setLoading(false); return }
      setHandyman(hp)

      // 3. services
      const { data: svcs } = await supabase
        .from('handyman_services')
        .select('id, handyman_id, title, description, base_price, price_per_hour, estimated_duration, photos, keywords, times_booked, is_popular, category_id, categories(id,name)')
        .eq('handyman_id', matched.id)
        .eq('is_available', true)
        .order('created_at', { ascending: false })
      setServices(svcs ?? [])

      // 4. reviews via bookings
      const { data: bIds } = await supabase
        .from('bookings')
        .select('id')
        .eq('handyman_id', matched.id)

      let revs = []
      if (bIds?.length) {
        const { data } = await supabase
          .from('reviews')
          .select('id,rating,title,description,created_at,reviewer:reviewer_id(first_name,last_name,avatar_url)')
          .in('booking_id', bIds.map(b=>b.id))
          .order('created_at', { ascending: false })
          .limit(20)
        revs = data ?? []
      }
      setReviews(revs)
      setLoading(false)
    }
    load()
  }, [slug])

  // ── derived ───────────────────────────────────────────────────────────────
  const firstName = profile?.first_name ?? ''
  const lastName  = profile?.last_name  ?? ''
  const fullName  = `${firstName} ${lastName}`.trim() || 'Handyman'
  const initStr   = `${firstName[0]??''}${lastName[0]??''}`.toUpperCase()
  const avatarUrl = profile?.avatar_url ?? null
  const location  = [handyman?.primary_city, handyman?.primary_county].filter(Boolean).join(', ') || '—'
  const ratingAvg = handyman?.rating_avg ?? (reviews.length ? reviews.reduce((a,b)=>a+b.rating,0)/reviews.length : 0)
  const availDays = handyman?.available_days ?? []

  const DAYS_LABEL = { luni:'Luni', marti:'Marți', miercuri:'Miercuri', joi:'Joi', vineri:'Vineri', sambata:'Sâmbătă', duminica:'Duminică' }

  const tabs = [
    { id:'servicii',        label:'Servicii' },
    { id:'recenzii',        label:`Recenzii (${reviews.length})` },
    { id:'disponibilitate', label:'Disponibilitate' },
    { id:'despre',          label:'Despre' },
  ]

  // ── loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavbar/>
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin"/>
      </div>
    </div>
  )

  // ── not found ──────────────────────────────────────────────────────────────
  if (notFound) return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavbar/>
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4"/>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Profil negăsit</h2>
        <p className="text-gray-500 mb-6 text-sm">Handymanul căutat nu există sau nu are un profil activ.</p>
        <button onClick={()=>navigate('/find-services')} className="text-blue-600 font-medium hover:underline text-sm">
          ← Înapoi la căutare
        </button>
      </div>
    </div>
  )

  // ═════════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavbar/>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <button onClick={()=>navigate(-1)}
          className="flex items-center gap-1 text-gray-500 hover:text-blue-600 transition mb-6 text-sm font-medium">
          <ChevronLeft className="w-4 h-4"/> Înapoi la căutare
        </button>

        <div className="grid lg:grid-cols-3 gap-6">

          {/* ═══ MAIN ═══ */}
          <div className="lg:col-span-2 space-y-6">

            {/* ── profile header card ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* cover */}
              <div className="h-32 relative">
                {handyman?.cover_url
                  ? <img src={handyman.cover_url} alt="" className="w-full h-full object-cover"/>
                  : <div className="w-full h-full bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500"
                      style={{backgroundImage:'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.15) 1px, transparent 1px)',backgroundSize:'40px 40px'}}/>
                }
              </div>

              <div className="px-6 pb-6">
                <div className="flex items-end justify-between -mt-10 mb-4">
                  <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                    {avatarUrl
                      ? <img src={avatarUrl} alt="" className="w-full h-full object-cover"/>
                      : <span className="text-white font-black text-2xl">{initStr}</span>
                    }
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <button onClick={()=>setIsFavorite(f=>!f)}
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center transition ${isFavorite?'bg-red-50 border-red-200 text-red-500':'border-gray-200 text-gray-400 hover:text-red-400'}`}>
                      <Heart className={`w-4 h-4 ${isFavorite?'fill-red-500':''}`}/>
                    </button>
                    <button className="w-9 h-9 rounded-xl border border-gray-200 text-gray-400 hover:text-blue-600 flex items-center justify-center transition">
                      <Share2 className="w-4 h-4"/>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl font-bold text-gray-800">{fullName}</h1>
                  {handyman?.is_verified&&<CheckCircle className="w-5 h-5 text-blue-500"/>}
                  {handyman?.has_insurance&&<Shield className="w-5 h-5 text-green-500"/>}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mb-3">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5"/>{location}</span>
                  {handyman?.work_radius_km&&<span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5"/>Rază {handyman.work_radius_km} km</span>}
                  {handyman?.experience_years&&<span className="flex items-center gap-1"><Award className="w-3.5 h-3.5"/>{handyman.experience_years} ani exp.</span>}
                  <span className={`flex items-center gap-1 font-medium ${handyman?.is_available?'text-green-600':'text-gray-400'}`}>
                    <span className={`w-2 h-2 rounded-full ${handyman?.is_available?'bg-green-500 animate-pulse':'bg-gray-400'}`}/>
                    {handyman?.is_available?'Disponibil acum':'Indisponibil'}
                  </span>
                </div>

                {/* stats row */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { icon: Star,     value: ratingAvg>0?Number(ratingAvg).toFixed(1):'—', label:'Rating',   color:'text-yellow-500 bg-yellow-50' },
                    { icon: Briefcase,value: handyman?.total_jobs_completed??0,             label:'Lucrări',  color:'text-blue-600 bg-blue-50' },
                    { icon: MessageSquare,value: reviews.length,                            label:'Recenzii', color:'text-purple-600 bg-purple-50' },
                  ].map((s,i)=>(
                    <div key={i} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl ${s.color}`}>
                      <s.icon className="w-4 h-4 flex-shrink-0"/>
                      <div>
                        <p className="text-sm font-black">{s.value}</p>
                        <p className="text-xs opacity-70">{s.label}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* specialties */}
                {(handyman?.specialties?.length > 0) && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {handyman.specialties.map(s=>(
                      <span key={s} className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-full border border-blue-100">{s}</span>
                    ))}
                  </div>
                )}

                {/* bio */}
                {handyman?.bio && <p className="text-sm text-gray-600 leading-relaxed">{handyman.bio}</p>}
              </div>
            </div>

            {/* ── TABS ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex border-b border-gray-100">
                {tabs.map(t=>(
                  <button key={t.id} onClick={()=>setActiveTab(t.id)}
                    className={`flex-1 py-3.5 text-sm font-medium transition border-b-2 ${activeTab===t.id?'border-blue-600 text-blue-600':'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="p-6">

                {/* SERVICII */}
                {activeTab==='servicii'&&(
                  services.length===0 ? (
                    <div className="text-center py-10">
                      <Wrench className="w-10 h-10 text-gray-200 mx-auto mb-3"/>
                      <p className="text-sm text-gray-400">Niciun serviciu activ momentan</p>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                      {services.map(svc=>(
                        <div key={svc.id} className="border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition group">

                          {/* photo */}
                          {Array.isArray(svc.photos)&&svc.photos[0]
                            ? <div className="h-44 overflow-hidden">
                                <img src={svc.photos[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                              </div>
                            : <div className="h-44 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                                <Wrench className="w-12 h-12 text-blue-400 group-hover:scale-110 transition-transform"/>
                              </div>
                          }

                          <div className="p-4">
                            {/* title + category */}
                            <h4 className="font-bold text-gray-800 mb-0.5">{svc.title}</h4>
                            {svc.categories&&(
                              <p className="text-xs text-blue-500 font-semibold mb-2">{svc.categories.name}</p>
                            )}
                            <p className="text-sm text-gray-500 mb-4 line-clamp-2">{svc.description}</p>

                            {/* pricing cards */}
                            <div className="grid grid-cols-2 gap-2 mb-4">
                              <div className="bg-blue-50 rounded-xl p-3 text-center">
                                <p className="text-[11px] text-blue-400 font-medium mb-0.5">Preț de bază</p>
                                <p className="text-base font-black text-blue-700">
                                  {svc.base_price ? `${Number(svc.base_price).toLocaleString('ro-RO')} RON` : '—'}
                                </p>
                              </div>
                              <div className="bg-purple-50 rounded-xl p-3 text-center">
                                <p className="text-[11px] text-purple-400 font-medium mb-0.5">Pe oră</p>
                                <p className="text-base font-black text-purple-700">
                                  {svc.price_per_hour ? `${Number(svc.price_per_hour).toLocaleString('ro-RO')} RON` : '—'}
                                </p>
                              </div>
                            </div>

                            {/* stats row */}
                            <div className="flex items-center gap-4 text-xs text-gray-500 mb-3 pb-3 border-b border-gray-100">
                              <div className="flex items-center gap-1">
                                <Briefcase className="w-3.5 h-3.5 text-gray-400"/>
                                <span><strong className="text-gray-700">{svc.times_booked ?? 0}</strong> rezervări</span>
                              </div>
                              {svc.estimated_duration&&(
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-gray-400"/>
                                  <span>{svc.estimated_duration}</span>
                                </div>
                              )}
                              {svc.is_popular&&(
                                <span className="ml-auto px-2 py-0.5 bg-yellow-50 text-yellow-600 font-semibold rounded-full border border-yellow-100 text-[10px]">
                                  🔥 Popular
                                </span>
                              )}
                            </div>

                            {/* keywords/tags */}
                            {Array.isArray(svc.keywords)&&svc.keywords.length>0&&(
                              <div className="flex flex-wrap gap-1.5">
                                {svc.keywords.slice(0,5).map(tag=>(
                                  <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md font-medium">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* RECENZII */}
                {activeTab==='recenzii'&&(
                  <div>
                    <div className="flex items-center gap-6 p-5 bg-yellow-50 rounded-xl border border-yellow-100 mb-5">
                      <div className="text-center flex-shrink-0">
                        <p className="text-5xl font-black text-gray-800">{ratingAvg>0?Number(ratingAvg).toFixed(1):'—'}</p>
                        <StarRow rating={ratingAvg} size="md"/>
                        <p className="text-xs text-gray-400 mt-1">{reviews.length} recenzii</p>
                      </div>
                      <div className="flex-1 space-y-1.5">
                        {[5,4,3,2,1].map(s=>{
                          const cnt=reviews.filter(r=>r.rating===s).length
                          const pct=reviews.length?(cnt/reviews.length)*100:0
                          return (
                            <div key={s} className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 w-6">{s}★</span>
                              <div className="flex-1 bg-white rounded-full h-2">
                                <div className="bg-yellow-400 h-2 rounded-full" style={{width:`${pct}%`}}/>
                              </div>
                              <span className="text-xs text-gray-400 w-4 text-right">{cnt}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    {reviews.length===0
                      ? <p className="text-center text-sm text-gray-400 py-8">Nicio recenzie încă</p>
                      : <div className="space-y-4">
                          {reviews.map(rev=>{
                            const rName=rev.reviewer?`${rev.reviewer.first_name??''} ${rev.reviewer.last_name??''}`.trim()||'Anonim':'Anonim'
                            const rDate=rev.created_at?new Date(rev.created_at).toLocaleDateString('ro-RO',{day:'2-digit',month:'short',year:'numeric'}):''
                            return (
                              <div key={rev.id} className="border border-gray-100 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                    {rName.split(' ').slice(0,2).map(n=>n[0]).join('')}
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-gray-800">{rName}</p>
                                    <div className="flex items-center gap-1.5"><StarRow rating={rev.rating}/><span className="text-xs text-gray-400">{rDate}</span></div>
                                  </div>
                                </div>
                                {rev.title&&<p className="text-xs font-bold text-gray-700 mb-1">{rev.title}</p>}
                                {rev.description&&<p className="text-xs text-gray-500 leading-relaxed">{rev.description}</p>}
                              </div>
                            )
                          })}
                        </div>
                    }
                  </div>
                )}

                {/* DISPONIBILITATE */}
                {activeTab==='disponibilitate'&&(
                  <div>
                    <p className="text-sm font-bold text-gray-700 mb-3">Zile de lucru</p>
                    <div className="space-y-2">
                      {Object.entries(DAYS_LABEL).map(([key, label])=>{
                        const act = availDays.includes(key)
                        return (
                          <div key={key} className={`flex items-center justify-between px-4 py-2.5 rounded-xl ${act?'bg-blue-50 border border-blue-100':'bg-gray-50 border border-gray-100'}`}>
                            <span className={`text-sm font-medium ${act?'text-blue-700':'text-gray-400'}`}>{label}</span>
                            {act
                              ? <span className="text-xs text-blue-600 font-semibold flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5"/>Disponibil</span>
                              : <span className="text-xs text-gray-400">Indisponibil</span>
                            }
                          </div>
                        )
                      })}
                    </div>
                    {availDays.length===0&&<p className="text-sm text-gray-400 italic text-center py-6">Program nespecificat de handyman</p>}
                  </div>
                )}

                {/* DESPRE */}
                {activeTab==='despre'&&(
                  <div className="space-y-5">
                    {handyman?.bio&&(
                      <div>
                        <p className="text-sm font-bold text-gray-700 mb-2">Despre {fullName}</p>
                        <p className="text-sm text-gray-600 leading-relaxed">{handyman.bio}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold text-gray-700 mb-3">Încredere & Siguranță</p>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { cond:handyman?.is_verified,             icon:CheckCircle, label:'Identitate verificată', color:'text-blue-600 bg-blue-50 border-blue-100' },
                          { cond:handyman?.has_insurance,           icon:Shield,      label:'Asigurat',              color:'text-green-600 bg-green-50 border-green-100' },
                          { cond:handyman?.background_check_consent,icon:Award,       label:'Background verificat',  color:'text-purple-600 bg-purple-50 border-purple-100' },
                        ].map((b,i)=>(
                          <div key={i} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center ${b.cond?b.color:'text-gray-300 bg-gray-50 border-gray-100'}`}>
                            <b.icon className="w-5 h-5"/>
                            <p className="text-xs font-semibold leading-tight">{b.label}</p>
                            <p className="text-[10px]">{b.cond?'✓ Confirmat':'Neprecizat'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    {handyman?.certifications&&(
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Certificări & Licențe</p>
                        <p className="text-sm text-gray-700">{handyman.certifications}</p>
                      </div>
                    )}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Zonă de acoperire</p>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-blue-500"/>Locație: <strong>{location}</strong></div>
                        {handyman?.work_radius_km&&<div className="flex items-center gap-2"><Globe className="w-4 h-4 text-blue-500"/>Rază: <strong>{handyman.work_radius_km} km</strong></div>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ═══ SIDEBAR ═══ */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-20">
              {handyman?.hourly_rate&&(
                <>
                  <p className="text-xs text-gray-400 text-center mb-1">Tarif de la</p>
                  <p className="text-3xl font-black text-gray-800 text-center mb-5">
                    {Number(handyman.hourly_rate)} <span className="text-base font-normal text-gray-400">RON/h</span>
                  </p>
                </>
              )}

              <button onClick={()=>navigate(`/book/${slug}`)}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 transition mb-2">
                <Calendar className="w-4 h-4"/> Rezervă acum
              </button>
              <button className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-600 py-3 rounded-xl font-medium text-sm hover:bg-gray-50 transition">
                <MessageSquare className="w-4 h-4"/> Trimite mesaj
              </button>

              <div className="mt-5 pt-4 border-t border-gray-100 space-y-2.5 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Lucrări finalizate</span>
                  <span className="font-semibold text-gray-800">{handyman?.total_jobs_completed??0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Rating mediu</span>
                  <span className="font-semibold text-gray-800">{ratingAvg>0?Number(ratingAvg).toFixed(1):'—'}</span>
                </div>
                {handyman?.experience_years&&(
                  <div className="flex justify-between">
                    <span>Experiență</span>
                    <span className="font-semibold text-gray-800">{handyman.experience_years} ani</span>
                  </div>
                )}
              </div>
            </div>

            {/* trust */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-800 text-sm mb-3">Încredere & Siguranță</h3>
              <div className="space-y-2.5">
                {[
                  { cond:handyman?.is_verified,             icon:CheckCircle, label:'Verificare identitate', color:'text-blue-500' },
                  { cond:handyman?.has_insurance,           icon:Shield,      label:'Asigurare de răspundere', color:'text-green-500' },
                  { cond:handyman?.background_check_consent,icon:Award,       label:'Background verificat',   color:'text-purple-500' },
                ].map((b,i)=>(
                  <div key={i} className={`flex items-center gap-2.5 text-sm ${b.cond?'text-gray-700':'text-gray-300'}`}>
                    <b.icon className={`w-4 h-4 ${b.cond?b.color:'text-gray-300'}`}/>
                    {b.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}