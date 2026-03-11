import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import HandymanNavbar from '../components/handyman-dashboard/HandymanNavbar'
import {
  Edit3, Save, X, Star, MapPin, CheckCircle, Shield,
  Award, Briefcase, Camera, Plus, Loader2,
  ToggleLeft, ToggleRight, MessageSquare, Wrench, XCircle,
  Zap, RotateCcw, Globe, ChevronDown, ChevronUp, Clock
} from 'lucide-react'

const DAYS_RO    = ['luni','marti','miercuri','joi','vineri','sambata','duminica']
const DAYS_LABEL = { luni:'Luni', marti:'Marți', miercuri:'Miercuri', joi:'Joi', vineri:'Vineri', sambata:'Sâmbătă', duminica:'Duminică' }
const RADIUS_OPT = ['5','10','15','25','50','100']

function initials(f,l) { return `${f?.[0]??''}${l?.[0]??''}`.toUpperCase() }
function calcAvg(arr)   { return arr?.length ? arr.reduce((a,b)=>a+b.rating,0)/arr.length : 0 }

function StarRow({ rating, size='sm' }) {
  const sz = size==='sm' ? 'w-3.5 h-3.5' : 'w-5 h-5'
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i=>(
        <Star key={i} className={`${sz} ${i<=Math.round(rating)?'fill-yellow-400 text-yellow-400':'text-gray-200'}`}/>
      ))}
    </div>
  )
}

function StatBadge({ icon:Icon, value, label, color='blue' }) {
  const clr = { blue:'bg-blue-50 text-blue-600 border-blue-100', green:'bg-green-50 text-green-600 border-green-100',
                yellow:'bg-yellow-50 text-yellow-600 border-yellow-100', purple:'bg-purple-50 text-purple-600 border-purple-100' }
  return (
    <div className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border ${clr[color]}`}>
      <Icon className="w-5 h-5"/>
      <span className="text-xl font-black">{value}</span>
      <span className="text-xs font-medium opacity-70">{label}</span>
    </div>
  )
}

// ── collapsible completion widget ─────────────────────────────────────────────
function CompletionWidget({ checks }) {
  const [open, setOpen] = useState(false)
  const done = checks.filter(c=>c.done).length
  const pct  = Math.round((done/checks.length)*100)
  const barColor  = pct===100?'bg-green-500':pct>=60?'bg-blue-500':'bg-orange-400'
  const textColor = pct===100?'text-green-600':pct>=60?'text-blue-600':'text-orange-500'
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button onClick={()=>setOpen(o=>!o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-gray-600">Completitudine profil</span>
            <span className={`text-xs font-black ${textColor}`}>{pct}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div className={`h-1.5 rounded-full transition-all ${barColor}`} style={{width:`${pct}%`}}/>
          </div>
        </div>
        <div className="text-gray-400 flex-shrink-0">
          {open ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-1.5 border-t border-gray-100 pt-3">
          {checks.map((c,i)=>(
            <div key={i} className="flex items-center gap-2 text-xs">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${c.done?'bg-green-100 text-green-600':'bg-gray-100 text-gray-400'}`}>
                {c.done ? <CheckCircle className="w-3 h-3"/> : <div className="w-1.5 h-1.5 rounded-full bg-gray-300"/>}
              </div>
              <span className={c.done?'text-gray-600':'text-gray-400'}>{c.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function HandymanMyProfile() {
  const [profile,         setProfile]         = useState(null)
  const [userInfo,        setUserInfo]         = useState(null)
  const [services,        setServices]         = useState([])
  const [reviews,         setReviews]          = useState([])
  const [loading,         setLoading]          = useState(true)
  const [saving,          setSaving]           = useState(false)
  const [saveMsg,         setSaveMsg]          = useState(null)
  const [editMode,        setEditMode]         = useState(false)
  const [activeTab,       setActiveTab]        = useState('servicii')
  const [userId,          setUserId]           = useState(null)
  const [uploadingAvatar, setUploadingAvatar]  = useState(false)
  const [uploadingCover,  setUploadingCover]   = useState(false)
  const avatarRef = useRef()
  const coverRef  = useRef()

  const [form, setForm] = useState({
    bio:'', experience_years:'', hourly_rate:'', specialties:[],
    work_radius_km:'', available_days:[], has_insurance:false,
    is_available:true, primary_city:'', primary_county:'', certifications:'',
  })
  const [specInput, setSpecInput] = useState('')

  // ── load ──────────────────────────────────────────────────────────────────
  useEffect(()=>{
    async function load() {
      setLoading(true)
      const { data:{ user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const [{ data:prof }, { data:uInfo }, { data:svcs }] = await Promise.all([
        supabase.from('handyman_profiles').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('profiles').select('first_name,last_name,avatar_url,phone,email').eq('id', user.id).maybeSingle(),
        supabase.from('handyman_services')
          .select('*, categories(id,name,icon)')
          .eq('handyman_id', user.id)
          .eq('is_available', true)
          .order('created_at',{ ascending:false }),
      ])

      const { data:bIds } = await supabase.from('bookings').select('id').eq('handyman_id', user.id)
      let revs = []
      if (bIds?.length) {
        const { data } = await supabase.from('reviews')
          .select('id,rating,title,description,created_at,reviewer:reviewer_id(first_name,last_name)')
          .in('booking_id', bIds.map(b=>b.id))
          .order('created_at',{ ascending:false }).limit(20)
        revs = data ?? []
      }

      setProfile(prof); setUserInfo(uInfo); setServices(svcs??[]); setReviews(revs)
      if (prof) setForm({
        bio:              prof.bio ?? '',
        experience_years: prof.experience_years ?? '',
        hourly_rate:      prof.hourly_rate ?? '',
        specialties:      prof.specialties ?? [],
        work_radius_km:   prof.work_radius_km ?? '',
        available_days:   prof.available_days ?? [],
        has_insurance:    prof.has_insurance ?? false,
        is_available:     prof.is_available ?? true,
        primary_city:     prof.primary_city ?? '',
        primary_county:   prof.primary_county ?? '',
        certifications:   prof.certifications ?? '',
      })
      setLoading(false)
    }
    load()
  },[])

  // ── save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true)
    const payload = {
      bio:              form.bio || null,
      experience_years: form.experience_years ? Number(form.experience_years) : null,
      hourly_rate:      form.hourly_rate ? Number(form.hourly_rate) : null,
      specialties:      form.specialties,
      work_radius_km:   form.work_radius_km ? Number(form.work_radius_km) : null,
      available_days:   form.available_days,
      has_insurance:    form.has_insurance,
      is_available:     form.is_available,
      primary_city:     form.primary_city || null,
      primary_county:   form.primary_county || null,
      certifications:   form.certifications || null,
    }
    const { error } = profile
      ? await supabase.from('handyman_profiles').update(payload).eq('user_id', userId)
      : await supabase.from('handyman_profiles').insert({ ...payload, user_id:userId })
    setSaving(false)
    if (!error) {
      setSaveMsg('Profilul a fost salvat!')
      setProfile(p=>({ ...(p??{}), ...payload, user_id:userId }))
      setEditMode(false)
      setTimeout(()=>setSaveMsg(null), 3000)
    } else {
      setSaveMsg('Eroare la salvare.')
    }
  }

  const handleToggleAvailable = async () => {
    const newVal = !profile?.is_available
    await supabase.from('handyman_profiles').update({ is_available:newVal }).eq('user_id', userId)
    setProfile(p=>({ ...p, is_available:newVal }))
    setForm(p=>({ ...p, is_available:newVal }))
  }

  // ── upload avatar ─────────────────────────────────────────────────────────
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploadingAvatar(true)
    const ext  = file.name.split('.').pop()
    const path = `${userId}/avatar.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert:true })
    if (!error) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      if (data?.publicUrl) {
        await supabase.from('profiles').update({ avatar_url:data.publicUrl }).eq('id', userId)
        setUserInfo(p=>({ ...p, avatar_url:data.publicUrl }))
      }
    }
    setUploadingAvatar(false); e.target.value=''
  }

  // ── upload cover ──────────────────────────────────────────────────────────
  // Requires: ALTER TABLE handyman_profiles ADD COLUMN IF NOT EXISTS cover_url text;
  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploadingCover(true)
    const ext  = file.name.split('.').pop()
    const path = `covers/${userId}/cover.${ext}`
    const { error } = await supabase.storage.from('service-photos').upload(path, file, { upsert:true })
    if (!error) {
      const { data } = supabase.storage.from('service-photos').getPublicUrl(path)
      if (data?.publicUrl) {
        await supabase.from('handyman_profiles').update({ cover_url:data.publicUrl }).eq('user_id', userId)
        setProfile(p=>({ ...p, cover_url:data.publicUrl }))
      }
    }
    setUploadingCover(false); e.target.value=''
  }

  // ── derived ───────────────────────────────────────────────────────────────
  const firstName   = userInfo?.first_name ?? ''
  const lastName    = userInfo?.last_name  ?? ''
  const fullName    = `${firstName} ${lastName}`.trim() || 'Handyman'
  const avatarUrl   = userInfo?.avatar_url ?? null
  const coverUrl    = profile?.cover_url   ?? null
  const initStr     = initials(firstName, lastName) || 'H'
  const ratingAvg   = profile?.rating_avg ?? (reviews.length ? calcAvg(reviews) : 0)
  const totalJobs   = profile?.total_jobs_completed ?? 0
  const location    = [profile?.primary_city, profile?.primary_county].filter(Boolean).join(', ') || null
  const specialties = profile?.specialties ?? []
  const availDays   = profile?.available_days ?? []
  const isAvailable = profile?.is_available ?? false

  const completionChecks = [
    { label:'Bio adăugat',            done:!!profile?.bio },
    { label:'Fotografie profil',      done:!!avatarUrl },
    { label:'Tarif completat',        done:!!profile?.hourly_rate },
    { label:'Localitate setată',      done:!!profile?.primary_city },
    { label:'Specialități adăugate',  done:specialties.length>0 },
    { label:'Disponibilitate setată', done:availDays.length>0 },
    { label:'Serviciu activ',         done:services.length>0 },
  ]

  const tabs = [
    { id:'servicii',        label:'Servicii' },
    { id:'recenzii',        label:`Recenzii (${reviews.length})` },
    { id:'disponibilitate', label:'Disponibilitate' },
    { id:'despre',          label:'Despre' },
  ]

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <HandymanNavbar/>
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin"/>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <HandymanNavbar/>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">

        {saveMsg && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border ${
            saveMsg.includes('Eroare')?'bg-red-50 text-red-700 border-red-200':'bg-green-50 text-green-700 border-green-200'
          }`}>
            {saveMsg.includes('Eroare')?<XCircle className="w-4 h-4"/>:<CheckCircle className="w-4 h-4"/>}
            {saveMsg}
          </div>
        )}

        <div className="max-w-4xl space-y-5">

            {/* ── HERO PROFILE CARD ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

              {/* COVER */}
              <div
                className={`relative h-52 group ${editMode ? 'cursor-pointer' : 'cursor-default'}`}
                onClick={()=>{ if(editMode) coverRef.current?.click() }}
              >
                {coverUrl
                  ? <img src={coverUrl} alt="" className="w-full h-full object-cover"/>
                  : <div className="w-full h-full bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500"
                      style={{backgroundImage:'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.15) 1px, transparent 1px), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 1px, transparent 1px)',backgroundSize:'40px 40px'}}/>
                }
                {/* hover overlay — only in edit mode */}
                {editMode && (
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition">
                    {uploadingCover
                      ? <Loader2 className="w-7 h-7 text-white animate-spin"/>
                      : <><Camera className="w-7 h-7 text-white"/><span className="text-white text-sm font-semibold">Schimbă poza de fundal</span></>
                    }
                  </div>
                )}
                <input ref={coverRef} type="file" accept="image/*" onChange={handleCoverUpload} className="hidden"/>

                {/* controls top-right */}
                <div className="absolute top-3 right-3 flex items-center gap-2" onClick={e=>e.stopPropagation()}>
                  <button onClick={handleToggleAvailable}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg backdrop-blur-sm transition ${
                      isAvailable?'bg-green-500/90 text-white hover:bg-green-600':'bg-gray-800/80 text-gray-200 hover:bg-gray-900'
                    }`}>
                    <span className={`w-2 h-2 rounded-full ${isAvailable?'bg-white animate-pulse':'bg-gray-400'}`}/>
                    {isAvailable?'Disponibil':'Indisponibil'}
                  </button>

                  {editMode ? (
                    <>
                      <button onClick={()=>setEditMode(false)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white/85 backdrop-blur-sm text-gray-700 rounded-lg text-xs font-semibold shadow hover:bg-white transition">
                        <RotateCcw className="w-3 h-3"/> Anulează
                      </button>
                      <button onClick={handleSave} disabled={saving}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600/90 backdrop-blur-sm text-white rounded-lg text-xs font-bold shadow hover:bg-blue-700 transition disabled:opacity-50">
                        {saving?<Loader2 className="w-3 h-3 animate-spin"/>:<Save className="w-3 h-3"/>}
                        {saving?'Se salvează…':'Salvează'}
                      </button>
                    </>
                  ) : (
                    <button onClick={()=>setEditMode(true)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-white/85 backdrop-blur-sm text-gray-700 rounded-lg text-xs font-bold shadow hover:bg-white transition">
                      <Edit3 className="w-3 h-3"/> Editează
                    </button>
                  )}
                </div>
              </div>

              {/* AVATAR + NAME */}
              <div className="px-6 pb-6">
                <div className="flex items-end gap-4 -mt-14 mb-4">
                  {/* avatar */}
                  <div className="relative group flex-shrink-0">
                    <div className="w-28 h-28 rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                      {avatarUrl
                        ? <img src={avatarUrl} alt="" className="w-full h-full object-cover"/>
                        : <span className="text-white font-black text-4xl">{initStr}</span>
                      }
                    </div>
                    {/* online dot */}
                    <span className={`absolute bottom-1.5 right-1.5 w-4 h-4 rounded-full border-2 border-white shadow-md ${isAvailable?'bg-green-500':'bg-gray-400'}`}/>
                    {editMode && (
                      <button onClick={()=>avatarRef.current?.click()} disabled={uploadingAvatar}
                        className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        {uploadingAvatar?<Loader2 className="w-5 h-5 text-white animate-spin"/>:<Camera className="w-5 h-5 text-white"/>}
                      </button>
                    )}
                    <input ref={avatarRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden"/>
                  </div>

                  {/* badges */}
                  <div className="flex-1 flex justify-end items-start gap-1.5 mt-16">
                    {profile?.is_verified && (
                      <span className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-full border border-blue-100">
                        <CheckCircle className="w-3 h-3"/> Verificat
                      </span>
                    )}
                    {profile?.has_insurance && (
                      <span className="flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-600 text-xs font-bold rounded-full border border-green-100">
                        <Shield className="w-3 h-3"/> Asigurat
                      </span>
                    )}
                  </div>
                </div>

                <h2 className="text-2xl font-black text-gray-800">{fullName}</h2>

                {!editMode ? (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-1.5">
                    {location&&<span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5"/>{location}</span>}
                    {profile?.work_radius_km&&<span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5"/>Rază {profile.work_radius_km} km</span>}
                    {profile?.experience_years&&<span className="flex items-center gap-1"><Award className="w-3.5 h-3.5"/>{profile.experience_years} ani exp.</span>}
                    {profile?.hourly_rate&&<span className="flex items-center gap-1 text-blue-600 font-semibold"><Zap className="w-3.5 h-3.5"/>{Number(profile.hourly_rate)} RON/h</span>}
                  </div>
                ) : (
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Oraș</label>
                        <input value={form.primary_city} onChange={e=>setForm(p=>({...p,primary_city:e.target.value}))} placeholder="Timișoara"
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Județ</label>
                        <input value={form.primary_county} onChange={e=>setForm(p=>({...p,primary_county:e.target.value}))} placeholder="Timiș"
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Tarif orar (RON/h)</label>
                        <input type="number" value={form.hourly_rate} onChange={e=>setForm(p=>({...p,hourly_rate:e.target.value}))} placeholder="90"
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Ani experiență</label>
                        <input type="number" value={form.experience_years} onChange={e=>setForm(p=>({...p,experience_years:e.target.value}))} placeholder="5"
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Rază (km)</label>
                        <select value={form.work_radius_km} onChange={e=>setForm(p=>({...p,work_radius_km:e.target.value}))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="">—</option>
                          {RADIUS_OPT.map(r=><option key={r} value={r}>Sub {r} km</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* stats */}
                <div className="grid grid-cols-4 gap-3 mt-5">
                  <StatBadge icon={Star}          value={ratingAvg>0?Number(ratingAvg).toFixed(1):'—'} label="Rating"   color="yellow"/>
                  <StatBadge icon={Briefcase}     value={totalJobs}       label="Lucrări"  color="blue"/>
                  <StatBadge icon={MessageSquare} value={reviews.length}  label="Recenzii" color="purple"/>
                  <StatBadge icon={Wrench}        value={services.length} label="Servicii" color="green"/>
                </div>

                {/* specialties */}
                <div className="mt-5">
                  {editMode ? (
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-2">Specialități</label>
                      <div className="flex flex-wrap gap-1.5 mb-2 min-h-[24px]">
                        {form.specialties.map(s=>(
                          <span key={s} className="flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                            {s}
                            <button onClick={()=>setForm(p=>({...p,specialties:p.specialties.filter(x=>x!==s)}))}>
                              <X className="w-3 h-3 hover:text-red-500 transition"/>
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input value={specInput} onChange={e=>setSpecInput(e.target.value)}
                          onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();const t=specInput.trim();if(t&&!form.specialties.includes(t)&&form.specialties.length<8){setForm(p=>({...p,specialties:[...p.specialties,t]}))}setSpecInput('')}}}
                          placeholder="Adaugă specialitate…"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                        <button onClick={()=>{const t=specInput.trim();if(t&&!form.specialties.includes(t)&&form.specialties.length<8){setForm(p=>({...p,specialties:[...p.specialties,t]}))}setSpecInput('')}}
                          className="px-3 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm hover:bg-gray-200 transition">
                          <Plus className="w-4 h-4"/>
                        </button>
                      </div>
                    </div>
                  ) : specialties.length>0&&(
                    <div className="flex flex-wrap gap-2">
                      {specialties.map(s=>(
                        <span key={s} className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-full border border-blue-100">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── BIO ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-800">Bio</h3>
                {!editMode&&<button onClick={()=>setEditMode(true)} className="text-xs text-blue-500 hover:text-blue-700 font-medium flex items-center gap-1"><Edit3 className="w-3 h-3"/>Editează</button>}
              </div>
              {editMode ? (
                <div className="space-y-4">
                  <textarea value={form.bio} onChange={e=>setForm(p=>({...p,bio:e.target.value}))} rows={5}
                    placeholder="Descrie-te: experiența ta, ce tipuri de lucrări faci, cum lucrezi cu clienții…"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-2">Certificări / Licențe</label>
                    <textarea value={form.certifications} onChange={e=>setForm(p=>({...p,certifications:e.target.value}))} rows={2}
                      placeholder="Ex: Electrician autorizat ANRE, Instalator autorizat…"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div>
                      <p className="text-sm font-bold text-gray-700">Asigurare de răspundere civilă</p>
                      <p className="text-xs text-gray-400 mt-0.5">Apare ca insignă pe profilul tău public</p>
                    </div>
                    <button onClick={()=>setForm(p=>({...p,has_insurance:!p.has_insurance}))}
                      className={`relative w-11 h-6 rounded-full transition-colors ${form.has_insurance?'bg-blue-600':'bg-gray-300'}`}>
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.has_insurance?'translate-x-5':'translate-x-0.5'}`}/>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {profile?.bio
                    ? <p className="text-gray-600 leading-relaxed text-sm">{profile.bio}</p>
                    : <p className="text-gray-400 italic text-sm">Nicio descriere adăugată. Click pe Editează pentru a adăuga.</p>
                  }
                  {profile?.certifications&&(
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Certificări</p>
                      <p className="text-sm text-gray-600">{profile.certifications}</p>
                    </div>
                  )}
                </>
              )}
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
                    <div className="text-center py-12">
                      <Wrench className="w-10 h-10 text-gray-300 mx-auto mb-3"/>
                      <p className="text-sm font-semibold text-gray-500">Niciun serviciu activ</p>
                      <p className="text-xs text-gray-400 mt-1">Adaugă servicii din secțiunea Gestionare Servicii</p>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                      {services.map(svc=>(
                        <div key={svc.id} className="border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition">
                          {Array.isArray(svc.photos)&&svc.photos[0]
                            ? <div className="h-36 bg-gray-100"><img src={svc.photos[0]} alt="" className="w-full h-full object-cover"/></div>
                            : <div className="h-36 bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center"><Wrench className="w-8 h-8 text-blue-300"/></div>
                          }
                          <div className="p-4">
                            <h4 className="font-bold text-gray-800 text-sm mb-0.5">{svc.title}</h4>
                            {svc.categories&&<p className="text-xs text-blue-500 font-medium mb-1">{svc.categories.name}</p>}
                            <p className="text-xs text-gray-500 line-clamp-2 mb-3">{svc.description}</p>
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-gray-800">{svc.base_price?`${Number(svc.base_price).toLocaleString('ro-RO')} RON`:'—'}</span>
                              {svc.estimated_duration&&<span className="text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3"/>{svc.estimated_duration}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* RECENZII */}
                {activeTab==='recenzii'&&(
                  <div>
                    <div className="flex items-center gap-6 p-5 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border border-yellow-100 mb-5">
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
                              <div className="flex-1 bg-white rounded-full h-2 border border-yellow-100">
                                <div className="bg-yellow-400 h-2 rounded-full" style={{width:`${pct}%`}}/>
                              </div>
                              <span className="text-xs text-gray-400 w-4 text-right">{cnt}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    {reviews.length===0
                      ? <div className="text-center py-10"><Star className="w-10 h-10 text-gray-200 mx-auto mb-3"/><p className="text-sm text-gray-500">Nicio recenzie încă</p></div>
                      : <div className="space-y-4">
                          {reviews.map(rev=>{
                            const rName=rev.reviewer?`${rev.reviewer.first_name??''} ${rev.reviewer.last_name??''}`.trim()||'Anonim':'Anonim'
                            const rDate=rev.created_at?new Date(rev.created_at).toLocaleDateString('ro-RO',{day:'2-digit',month:'short',year:'numeric'}):''
                            return (
                              <div key={rev.id} className="border border-gray-100 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
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
                    {editMode ? (
                      <div>
                        <p className="text-sm font-bold text-gray-700 mb-3">Zilele în care lucrezi</p>
                        <div className="grid grid-cols-4 gap-2">
                          {DAYS_RO.map(day=>{
                            const active=form.available_days.includes(day)
                            return (
                              <button key={day}
                                onClick={()=>setForm(p=>({...p,available_days:active?p.available_days.filter(d=>d!==day):[...p.available_days,day]}))}
                                className={`py-2.5 rounded-xl text-xs font-semibold border transition ${active?'bg-blue-600 text-white border-blue-600':'bg-white text-gray-500 border-gray-200 hover:border-blue-300'}`}>
                                {DAYS_LABEL[day]}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-bold text-gray-700 mb-3">Program de lucru</p>
                        <div className="space-y-2">
                          {DAYS_RO.map(day=>{
                            const act=availDays.includes(day)
                            return (
                              <div key={day} className={`flex items-center justify-between px-4 py-2.5 rounded-xl ${act?'bg-blue-50 border border-blue-100':'bg-gray-50 border border-gray-100'}`}>
                                <span className={`text-sm font-medium ${act?'text-blue-700':'text-gray-400'}`}>{DAYS_LABEL[day]}</span>
                                {act
                                  ? <span className="text-xs text-blue-600 font-semibold flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5"/>Disponibil</span>
                                  : <span className="text-xs text-gray-400">Indisponibil</span>
                                }
                              </div>
                            )
                          })}
                        </div>
                        {availDays.length===0&&<p className="text-sm text-gray-400 italic text-center py-4">Editează profilul pentru a seta disponibilitatea.</p>}
                      </div>
                    )}
                  </div>
                )}

                {/* DESPRE */}
                {activeTab==='despre'&&(
                  <div className="space-y-5">
                    <div>
                      <p className="text-sm font-bold text-gray-700 mb-3">Încredere & Siguranță</p>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { cond:profile?.is_verified,             icon:CheckCircle, label:'Identitate verificată', color:'text-blue-600 bg-blue-50 border-blue-100' },
                          { cond:profile?.has_insurance,           icon:Shield,      label:'Asigurat',              color:'text-green-600 bg-green-50 border-green-100' },
                          { cond:profile?.background_check_consent,icon:Award,       label:'Background verificat',  color:'text-purple-600 bg-purple-50 border-purple-100' },
                        ].map((b,i)=>(
                          <div key={i} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center ${b.cond?b.color:'text-gray-300 bg-gray-50 border-gray-100'}`}>
                            <b.icon className="w-5 h-5"/>
                            <p className="text-xs font-semibold leading-tight">{b.label}</p>
                            <p className="text-[10px]">{b.cond?'✓ Confirmat':'Neprecizat'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    {profile?.certifications&&(
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Certificări & Licențe</p>
                        <p className="text-sm text-gray-700">{profile.certifications}</p>
                      </div>
                    )}
                    {(location||profile?.work_radius_km)&&(
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Zonă de acoperire</p>
                        <div className="space-y-2">
                          {location&&<div className="flex items-center gap-2 text-sm text-gray-600"><MapPin className="w-4 h-4 text-blue-500"/>Locație principală: <strong>{location}</strong></div>}
                          {profile?.work_radius_km&&<div className="flex items-center gap-2 text-sm text-gray-600"><Globe className="w-4 h-4 text-blue-500"/>Rază de lucru: <strong>{profile.work_radius_km} km</strong></div>}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          <CompletionWidget checks={completionChecks}/>

        </div>
      </div>
    </div>
  )
}