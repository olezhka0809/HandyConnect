import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import HandymanNavbar from '../components/handyman-dashboard/HandymanNavbar'
import CityAutocomplete from '../components/CityAutocomplete'
import ScheduleEditor, { EMPTY_SCHEDULE } from '../components/ScheduleEditor'
import { updateHandymanWorkZone } from '../utils/cityLookup'
import {
  User, Bell, Shield, Award, Star, MapPin, Calendar,
  Receipt, Palette, LogOut, ChevronRight, Camera, Edit2, X,
  CheckCircle, Plus, Trash2, Sun, Moon, Monitor,
  Mail, Phone, Lock, AlertTriangle, Clock, Upload, FileText,
  Info, Download, Briefcase, TrendingUp, Wallet, ArrowDownRight,
  Search, ShieldCheck, Fingerprint, FileCheck, BadgeCheck,
  Image, Video, Building2, ChevronDown, ChevronUp, Eye, Send, Car
} from 'lucide-react'

// ─── Configurații constante ────────────────────────────────────────────────────

const RISK_CONFIG = {
  low:    { label: 'Scăzut',  color: 'text-green-700',  bg: 'bg-green-100',  border: 'border-green-200',  dot: 'bg-green-500'  },
  medium: { label: 'Mediu',   color: 'text-yellow-700', bg: 'bg-yellow-100', border: 'border-yellow-200', dot: 'bg-yellow-500' },
  high:   { label: 'Ridicat', color: 'text-red-700',    bg: 'bg-red-100',    border: 'border-red-200',    dot: 'bg-red-500'    },
}

const VERIF_LEVELS = [
  {
    level: 1, label: 'Cont nou',          badge: 'bg-gray-100 text-gray-600',      color: 'gray',
    desc:  'Cont creat, completează profilul',
    requirements: [],
    unlocks: [],
    cta: 'Încarcă actul de identitate + selfie (tab „Verificare & Acces")',
  },
  {
    level: 2, label: 'Meșter verificat',  badge: 'bg-blue-100 text-blue-700',      color: 'blue',
    desc:  'Identitate + cazier + 1 skill scăzut aprobat',
    requirements: ['Identitate aprobată (buletin + selfie)', 'Cazier judiciar aprobat', 'Minim 1 skill de nivel Scăzut aprobat'],
    unlocks: ['Feed taskuri publice', 'Preluare taskuri risc scăzut'],
    cta: 'Mergi la Verificare & Acces → încarcă documentele. Apoi adaugă un skill scăzut.',
  },
  {
    level: 3, label: 'Meșter activ',      badge: 'bg-indigo-100 text-indigo-700',   color: 'indigo',
    desc:  '5 lucrări finalizate fără incidente + scoruri bune',
    requirements: ['5 taskuri finalizate', 'Reliability > 70 (90 zile)', 'Trust score > 45', 'Max 1 no-show în istoric'],
    unlocks: ['Profil public complet', 'Recenzii vizibile clienților'],
    cta: 'Finalizează primele 5 taskuri cu rating bun și fără no-show.',
  },
  {
    level: 4, label: 'Meșter experimentat', badge: 'bg-teal-100 text-teal-700',    color: 'teal',
    desc:  '15 lucrări + skill mediu + fără dispute pierdute',
    requirements: ['15 taskuri finalizate', '1 skill de nivel Mediu aprobat', 'Reliability > 75', 'Trust score > 55', '0 dispute pierdute'],
    unlocks: ['Taskuri risc mediu', 'Rezervări proprii pe profil'],
    cta: 'Adaugă un skill de nivel Mediu și atinge 15 lucrări fără dispute.',
  },
  {
    level: 5, label: 'Meșter avansat',    badge: 'bg-orange-100 text-orange-700',   color: 'orange',
    desc:  '35 lucrări + skill ridicat + rating 4.2+',
    requirements: ['35 taskuri finalizate', '1 skill Ridicat SAU 3 skilluri Medii aprobate', 'Reliability > 80', 'Trust > 65', 'Rating ≥ 4.2'],
    unlocks: ['Taskuri risc ridicat', 'Servicii cu preț fix'],
    cta: 'Adaugă un skill de nivel Ridicat (necesită certificat) și menține rating-ul.',
  },
  {
    level: 6, label: 'Meșter expert',     badge: 'bg-purple-100 text-purple-700',   color: 'purple',
    desc:  '70 lucrări + skilluri din min. 2 categorii + rating 4.4+',
    requirements: ['70 taskuri finalizate', 'Skilluri din minim 2 niveluri de risc', 'Reliability > 85', 'Trust > 75', 'Rating ≥ 4.4', 'Activity score > 60'],
    unlocks: ['Prioritate în feed', 'Comision redus −2%'],
    cta: 'Continuă să fii activ și diversifică skillurile pe categorii diferite.',
  },
  {
    level: 7, label: 'Meșter de Top ⭐',  badge: 'bg-yellow-100 text-yellow-700',   color: 'yellow',
    desc:  '120 lucrări + toate cele 3 niveluri de risc + rating 4.6+',
    requirements: ['120 taskuri finalizate', 'Skilluri din toate 3 nivelurile de risc', 'Reliability > 90', 'Trust > 85', 'Rating ≥ 4.6', 'Activity > 70'],
    unlocks: ['Badge premium „Meșter de Top"', 'Comision redus −5%', 'Promovat în feed'],
    cta: 'Cel mai înalt nivel — continui să excelezi!',
  },
]

const trustStatus = (score) => {
  if (score >= 86) return { label: 'Top Rated',              icon: '🏆', color: 'text-yellow-600', bar: 'from-yellow-400 to-yellow-500', badge: 'bg-yellow-50 text-yellow-700 border-yellow-200' }
  if (score >= 61) return { label: 'Profesionist verificat', icon: '⭐', color: 'text-green-600',  bar: 'from-green-400 to-green-600',   badge: 'bg-green-50 text-green-700 border-green-200' }
  if (score >= 31) return { label: 'Profil verificat',       icon: '🟡', color: 'text-blue-600',   bar: 'from-blue-400 to-blue-500',     badge: 'bg-blue-50 text-blue-700 border-blue-200' }
  return                   { label: 'Nou pe platformă',      icon: '🔵', color: 'text-gray-500',   bar: 'from-gray-400 to-gray-500',     badge: 'bg-gray-50 text-gray-600 border-gray-200' }
}

const EVIDENCE_TYPES = [
  { id: 'certificate', label: 'Certificat / Diplomă', icon: FileCheck, desc: 'Diplomă, atestat, autorizație ANRE/ISCIR' },
  { id: 'photo',       label: 'Poze lucrări',          icon: Image,     desc: 'Minim 3 poze înainte/după lucrare' },
  { id: 'video',       label: 'Video demonstrativ',    icon: Video,     desc: 'Video scurt cu lucrarea efectuată' },
  { id: 'employer',    label: 'Referință angajator',   icon: Building2, desc: 'Scrisoare de recomandare / confirmare' },
]

const sidebarItems = [
  { id: 'account',       label: 'Datele Contului',       icon: User },
  { id: 'verification',  label: 'Verificare & Acces',    icon: ShieldCheck },
  { id: 'skills',        label: 'Skilluri & Certificări', icon: Award },
  { id: 'workzone',      label: 'Zona de Lucru',          icon: MapPin },
  { id: 'payments',      label: 'Plăți & Venituri',       icon: Wallet },
  { id: 'notifications', label: 'Notificări',             icon: Bell },
  { id: 'security',      label: 'Setări Siguranță',       icon: Shield },
  { id: 'schedule',      label: 'Program de Lucru',       icon: Calendar },
  { id: 'reviews',       label: 'Recenziile Mele',        icon: Star },
  { id: 'services',      label: 'Serviciile Mele',        icon: Briefcase },
  { id: 'billing',       label: 'Date Facturare',         icon: Receipt },
  { id: 'appearance',    label: 'Aspect Interfață',       icon: Palette },
]

const mockPayments = [
  { id: 1, task: 'Instalare Iluminat Living',  client: 'Maria Ionescu', amount: 350, fee: 35,  net: 315, date: '2026-03-01', status: 'paid' },
  { id: 2, task: 'Reparație Robinet',          client: 'Ion Popescu',   amount: 150, fee: 15,  net: 135, date: '2026-02-28', status: 'paid' },
  { id: 3, task: 'Zugrăveli Dormitor',         client: 'Ana Vasile',    amount: 800, fee: 80,  net: 720, date: '2026-02-25', status: 'paid' },
  { id: 4, task: 'Montaj Priză',               client: 'Elena Pop',     amount: 120, fee: 12,  net: 108, date: '2026-03-03', status: 'pending' },
  { id: 5, task: 'Reparație Ușă',              client: 'Andrei Marin',  amount: 200, fee: 20,  net: 180, date: '2026-03-04', status: 'processing' },
]

const mockReviews = [
  { id: 1, client: 'Maria Ionescu', service: 'Instalare Iluminat', rating: 5, text: 'Excelent! Foarte profesionist și punctual.', date: '2026-02-15', reply: 'Mulțumesc, Maria! A fost o plăcere.' },
  { id: 2, client: 'Ion Popescu',   service: 'Reparație Robinet',  rating: 4, text: 'Treabă bună, rezolvat rapid.',               date: '2026-01-20', reply: null },
  { id: 3, client: 'Ana Vasile',    service: 'Zugrăveli',          rating: 5, text: 'Impecabil! Recomand cu mare încredere.',      date: '2026-01-05', reply: 'Mulțumesc pentru apreciere!' },
]

// ─── Componente helper ─────────────────────────────────────────────────────────

function RiskBadge({ level }) {
  const cfg = RISK_CONFIG[level]
  if (!cfg) return null
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function StatusBadge({ status }) {
  const map = {
    pending:  { label: 'În verificare', cls: 'bg-yellow-100 text-yellow-700', icon: Clock },
    approved: { label: 'Aprobat',       cls: 'bg-green-100 text-green-700',   icon: CheckCircle },
    rejected: { label: 'Respins',       cls: 'bg-red-100 text-red-700',       icon: X },
  }
  const s = map[status]
  if (!s) return null
  const Icon = s.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${s.cls}`}>
      <Icon className="w-3 h-3" /> {s.label}
    </span>
  )
}

// ─── Component principal ───────────────────────────────────────────────────────

export default function HandymanPersonalProfile() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('account')
  const [profile, setProfile] = useState(null)
  const [handymanProfile, setHandymanProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [theme, setTheme] = useState('system')

  // Verification state
  const [identityVerif, setIdentityVerif] = useState(null)
  const [legalVerif, setLegalVerif] = useState(null)
  const [trustScore, setTrustScore] = useState(10)
  const [verificationScore, setVerificationScore] = useState(0)
  const [reputationScore, setReputationScore] = useState(50)
  const [reliabilityScore, setReliabilityScore] = useState(60)
  const [activityScore, setActivityScore] = useState(0)
  const [verificationLevel, setVerificationLevel] = useState(1)
  const [graceUntil, setGraceUntil] = useState(null)
  const [graceReason, setGraceReason] = useState(null)
  const [isSuspended, setIsSuspended] = useState(false)
  const [suspensionReason, setSuspensionReason] = useState(null)
  const [activeVerifTab, setActiveVerifTab] = useState('identity')
  const [identityDoc1, setIdentityDoc1] = useState(null)
  const [identityDoc1Preview, setIdentityDoc1Preview] = useState(null)
  const [identityDoc2, setIdentityDoc2] = useState(null)
  const [identityDoc2Preview, setIdentityDoc2Preview] = useState(null)
  const [legalDoc, setLegalDoc] = useState(null)
  const [legalDocPreview, setLegalDocPreview] = useState(null)
  const [verifySubmitting, setVerifySubmitting] = useState(false)
  const [verifyToast, setVerifyToast] = useState(null)

  // Skills (DB) state
  const [dbSkills, setDbSkills] = useState([])
  const [userDbSkills, setUserDbSkills] = useState([])
  const [skillRiskFilter, setSkillRiskFilter] = useState('all')
  const [skillSearch, setSkillSearch] = useState('')
  const [evidenceModal, setEvidenceModal] = useState(null)
  const [evidenceType, setEvidenceType] = useState('certificate')
  const [evidenceDesc, setEvidenceDesc] = useState('')
  const [evidenceFile, setEvidenceFile] = useState(null)
  const [evidenceUploading, setEvidenceUploading] = useState(false)
  const [evidenceSubmitted, setEvidenceSubmitted] = useState(false)
  const [skillsLoading, setSkillsLoading] = useState(false)
  const [expandedSkill, setExpandedSkill] = useState(null)

  // Work zone state
  const [showZoneChange, setShowZoneChange] = useState(false)
  const [showConfirmZone, setShowConfirmZone] = useState(false)
  const [zoneForm, setZoneForm] = useState({ city: '', county: '', radius: 10, extended: 10 })

  // Payments
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [financialTx, setFinancialTx] = useState([])
  const [txLoading, setTxLoading] = useState(false)

  // Notifications
  const [notifSettings, setNotifSettings] = useState({
    email_tasks: true, email_offers: true, email_messages: true, email_payments: true, email_reviews: true,
    push_tasks: true, push_offers: true, push_messages: true, push_payments: true,
    sms_tasks: false, sms_payments: true,
  })

  // Reviews
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyText, setReplyText] = useState('')

  // Billing
  const [billingForm, setBillingForm] = useState({ company_name: '', cui: '', address: '', iban: '', bank: '' })

  // Schedule
  const [schedule, setSchedule]           = useState(EMPTY_SCHEDULE)
  const [travelBuffer, setTravelBuffer]   = useState(30)
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [scheduleSaved, setScheduleSaved] = useState(false)

  useEffect(() => { loadProfile() }, [])

  useEffect(() => {
    if (activeSection !== 'schedule') return
    async function loadSchedule() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('handyman_schedule')
        .select('schedule, travel_buffer_min')
        .eq('handyman_id', user.id)
        .maybeSingle()
      if (data) {
        setSchedule({ ...EMPTY_SCHEDULE, ...data.schedule })
        setTravelBuffer(data.travel_buffer_min ?? 30)
      }
    }
    loadSchedule()
  }, [activeSection])

  useEffect(() => {
    if (activeSection !== 'payments') return
    async function loadTx() {
      setTxLoading(true)
      const { data } = await supabase
        .from('financial_transactions')
        .select('*')
        .order('created_at', { ascending: false })
      setFinancialTx(data || [])
      setTxLoading(false)
    }
    loadTx()
  }, [activeSection])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/login'); return }

    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(profileData)
    setEditForm(profileData || {})

    const { data: hp } = await supabase.from('handyman_profiles').select('*').eq('user_id', user.id).single()
    setHandymanProfile(hp)

    if (hp) {
      setZoneForm({ city: hp.primary_city || '', county: hp.primary_county || '', radius: hp.work_radius_km || 10, extended: hp.extended_radius_km || 10 })
      setTrustScore(hp.trust_score ?? 10)
      setVerificationScore(hp.verification_score ?? 0)
      setReputationScore(hp.reputation_score ?? 50)
      setReliabilityScore(hp.reliability_score ?? 60)
      setActivityScore(hp.activity_score ?? 0)
      setVerificationLevel(hp.verification_level ?? 1)
      setGraceUntil(hp.grace_until ?? null)
      setGraceReason(hp.grace_reason ?? null)
      setIsSuspended(hp.is_suspended ?? false)
      setSuspensionReason(hp.suspension_reason ?? null)
    }

    // Load verifications
    const { data: verifsData } = await supabase
      .from('verifications')
      .select('*')
      .eq('user_id', user.id)
    setIdentityVerif(verifsData?.find(v => v.type === 'identity') || null)
    setLegalVerif(verifsData?.find(v => v.type === 'legal') || null)

    // Load DB skills
    await loadSkills(user.id)

    setLoading(false)
  }

  async function loadSkills(userId) {
    setSkillsLoading(true)
    const uid = userId || profile?.id
    if (!uid) return

    const [{ data: allSkills }, { data: mySkills }] = await Promise.all([
      supabase.from('skills').select('*').eq('is_active', true).order('risk_level').order('name'),
      supabase.from('user_skills')
        .select('*, skills(id, name, category, risk_level, requires_certificate), skill_evidences(*)')
        .eq('user_id', uid),
    ])

    setDbSkills(allSkills || [])
    setUserDbSkills(mySkills || [])
    setSkillsLoading(false)
  }

  // ─── Handlers profil ────────────────────────────────────────────────────────

  const handleSaveProfile = async () => {
    await supabase.from('profiles').update({ first_name: editForm.first_name, last_name: editForm.last_name, phone: editForm.phone }).eq('id', profile.id)
    await supabase.from('handyman_profiles').update({ bio: editForm.bio, experience_years: editForm.experience_years }).eq('user_id', profile.id)
    setProfile(prev => ({ ...prev, ...editForm }))
    setHandymanProfile(prev => ({ ...prev, bio: editForm.bio, experience_years: editForm.experience_years }))
    setEditing(false)
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const fileName = `${profile.id}/avatar.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true })
    if (!error) {
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName)
      await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', profile.id)
      setProfile(prev => ({ ...prev, avatar_url: urlData.publicUrl }))
    }
  }

  // ─── Handlers verificare ────────────────────────────────────────────────────

  function showToast(msg, type = 'success') {
    setVerifyToast({ msg, type })
    setTimeout(() => setVerifyToast(null), 3500)
  }

  function handleFileSelect(file, setFile, setPreview) {
    if (!file) return
    setFile(file)
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = e => setPreview(e.target.result)
      reader.readAsDataURL(file)
    } else {
      setPreview(file.name)
    }
  }

  async function uploadVerificationDoc(userId, type, field, file) {
    const ext = file.name.split('.').pop()
    const path = `${userId}/${type}/${field}.${ext}`
    const { error } = await supabase.storage.from('verification-docs').upload(path, file, { upsert: true })
    if (error) throw error
    const { data } = supabase.storage.from('verification-docs').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleSubmitIdentity() {
    if (!identityDoc1) { showToast('Încarcă actul de identitate.', 'error'); return }
    if (!identityDoc2) { showToast('Încarcă selfie-ul cu buletinul.', 'error'); return }
    setVerifySubmitting(true)
    try {
      const url1 = await uploadVerificationDoc(profile.id, 'identity', 'buletin', identityDoc1)
      const url2 = await uploadVerificationDoc(profile.id, 'identity', 'selfie', identityDoc2)

      const payload = { user_id: profile.id, type: 'identity', status: 'pending', document_url: url1, document_url_2: url2, rejection_reason: null, updated_at: new Date().toISOString() }
      const { data: existing } = await supabase.from('verifications').select('id').eq('user_id', profile.id).eq('type', 'identity').maybeSingle()

      if (existing) {
        await supabase.from('verifications').update(payload).eq('id', existing.id)
      } else {
        await supabase.from('verifications').insert(payload)
      }

      const { data } = await supabase.from('verifications').select('*').eq('user_id', profile.id).eq('type', 'identity').maybeSingle()
      setIdentityVerif(data)
      setIdentityDoc1(null); setIdentityDoc1Preview(null)
      setIdentityDoc2(null); setIdentityDoc2Preview(null)
      showToast('Documentele au fost trimise spre verificare!')
    } catch {
      showToast('Eroare la încărcare. Încearcă din nou.', 'error')
    }
    setVerifySubmitting(false)
  }

  async function handleSubmitLegal() {
    if (!legalDoc) { showToast('Încarcă cazierul judiciar.', 'error'); return }
    if (identityVerif?.status !== 'approved') { showToast('Trebuie să ai identitatea verificată mai întâi.', 'error'); return }
    setVerifySubmitting(true)
    try {
      const url = await uploadVerificationDoc(profile.id, 'legal', 'cazier', legalDoc)
      const payload = { user_id: profile.id, type: 'legal', status: 'pending', document_url: url, rejection_reason: null, updated_at: new Date().toISOString() }
      const { data: existing } = await supabase.from('verifications').select('id').eq('user_id', profile.id).eq('type', 'legal').maybeSingle()

      if (existing) {
        await supabase.from('verifications').update(payload).eq('id', existing.id)
      } else {
        await supabase.from('verifications').insert(payload)
      }

      const { data } = await supabase.from('verifications').select('*').eq('user_id', profile.id).eq('type', 'legal').maybeSingle()
      setLegalVerif(data)
      setLegalDoc(null); setLegalDocPreview(null)
      showToast('Cazierul a fost trimis spre verificare!')
    } catch {
      showToast('Eroare la încărcare. Încearcă din nou.', 'error')
    }
    setVerifySubmitting(false)
  }

  // ─── Handlers skilluri ──────────────────────────────────────────────────────

  async function handleAddSkill(skillId) {
    const { data, error } = await supabase.from('user_skills')
      .insert({ user_id: profile.id, skill_id: skillId, status: 'draft' })
      .select('*, skills(*), skill_evidences(*)')
      .single()
    if (!error) {
      setUserDbSkills(prev => [...prev, data])
      setExpandedSkill(skillId)
    }
  }

  async function handleSubmitSkillForReview(userSkillId) {
    const { error } = await supabase.from('user_skills')
      .update({ status: 'pending', rejection_reason: null })
      .eq('id', userSkillId)
    if (!error) {
      setUserDbSkills(prev => prev.map(s =>
        s.id === userSkillId ? { ...s, status: 'pending', rejection_reason: null } : s
      ))
      showToast('Skillul a fost trimis la verificare!')
    }
  }

  async function handleRemoveSkill(userSkillId) {
    await supabase.from('user_skills').delete().eq('id', userSkillId)
    setUserDbSkills(prev => prev.filter(s => s.id !== userSkillId))
  }

  async function handleUploadEvidence() {
    if (!evidenceFile || !evidenceModal) return
    setEvidenceUploading(true)
    try {
      const ext = evidenceFile.name.split('.').pop()
      const path = `${profile.id}/${evidenceModal.skill_id}/${evidenceType}_${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('skill-evidences').upload(path, evidenceFile, { upsert: true })
      if (uploadErr) throw uploadErr

      const { data: urlData } = supabase.storage.from('skill-evidences').getPublicUrl(path)
      const { data: ev } = await supabase.from('skill_evidences')
        .insert({ user_skill_id: evidenceModal.id, type: evidenceType, file_url: urlData.publicUrl, description: evidenceDesc })
        .select()
        .single()

      setUserDbSkills(prev => prev.map(s =>
        s.id === evidenceModal.id ? { ...s, skill_evidences: [...(s.skill_evidences || []), ev] } : s
      ))
      setEvidenceModal(prev => ({ ...prev, skill_evidences: [...(prev.skill_evidences || []), ev] }))
      setEvidenceFile(null); setEvidenceDesc('')
      setEvidenceSubmitted(true)
    } catch {
      showToast('Eroare la încărcare.', 'error')
    }
    setEvidenceUploading(false)
  }

  async function handleDeleteEvidence(evidenceId, userSkillId) {
    await supabase.from('skill_evidences').delete().eq('id', evidenceId)
    setUserDbSkills(prev => prev.map(s =>
      s.id === userSkillId ? { ...s, skill_evidences: s.skill_evidences.filter(e => e.id !== evidenceId) } : s
    ))
    if (evidenceModal?.id === userSkillId) {
      setEvidenceModal(prev => ({ ...prev, skill_evidences: prev.skill_evidences.filter(e => e.id !== evidenceId) }))
    }
  }

  // ─── Work zone ──────────────────────────────────────────────────────────────

  async function handleConfirmZoneChange() {
    let coords = await updateHandymanWorkZone(profile.id, zoneForm.city, zoneForm.county, zoneForm.radius, zoneForm.extended)
    if (!coords) {
      const { data: cityData } = await supabase.from('romanian_cities').select('name, county, latitude, longitude').ilike('name', zoneForm.city).limit(1).single()
      if (cityData) coords = await updateHandymanWorkZone(profile.id, cityData.name, cityData.county, zoneForm.radius, zoneForm.extended)
    }
    if (coords) {
      setHandymanProfile(prev => ({ ...prev, primary_city: zoneForm.city, primary_county: zoneForm.county, work_latitude: coords.latitude, work_longitude: coords.longitude, work_radius_km: zoneForm.radius, extended_radius_km: zoneForm.extended }))
      setShowConfirmZone(false); setShowZoneChange(false)
    } else { alert('Orașul nu a fost găsit.') }
  }

  const toggleNotif = (key) => setNotifSettings(prev => ({ ...prev, [key]: !prev[key] }))
  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/login') }

  // ─── Helpers afișare ────────────────────────────────────────────────────────

  const getPayBadge = (s) => ({
    paid:       { label: 'Plătit',          cls: 'bg-green-100 text-green-700' },
    pending:    { label: 'În așteptare',     cls: 'bg-yellow-100 text-yellow-700' },
    processing: { label: 'Se procesează',   cls: 'bg-blue-100 text-blue-700' },
  }[s] || { label: s, cls: 'bg-gray-100 text-gray-600' })

  const filteredTx = paymentFilter === 'all'
    ? financialTx
    : financialTx.filter(t => t.status === paymentFilter)
  const totalEarnings  = financialTx.filter(t => t.status === 'processed').reduce((s, t) => s + Number(t.amount), 0)
  const pendingEarnings = financialTx.filter(t => t.status === 'pending').reduce((s, t) => s + Number(t.amount), 0)

  const TX_TYPE_LABEL = {
    task_payment:   { label: 'Plată task',      cls: 'bg-green-100 text-green-700' },
    dispute_payout: { label: 'Plată dispută',   cls: 'bg-teal-100 text-teal-700'   },
    refund_received:{ label: 'Rambursare',       cls: 'bg-blue-100 text-blue-700'   },
    platform_cost:  { label: 'Cost platformă',  cls: 'bg-red-100 text-red-700'     },
  }
  const getTxTypeBadge = (type) => TX_TYPE_LABEL[type] || { label: type, cls: 'bg-gray-100 text-gray-600' }

  const ts = trustStatus(trustScore)
  const currentLevelInfo = VERIF_LEVELS.find(l => l.level === verificationLevel) || VERIF_LEVELS[0]
  const nextLevelInfo     = VERIF_LEVELS.find(l => l.level === verificationLevel + 1) || null

  const nextLevelChecks = (() => {
    if (!nextLevelInfo) return []
    const hp       = handymanProfile || {}
    const idOk     = identityVerif?.status === 'approved'
    const legalOk  = legalVerif?.status === 'approved'
    const approved = userDbSkills.filter(s => s.status === 'approved')
    const hasLow   = approved.some(s => s.skills?.risk_level === 'low')
    const hasMed   = approved.some(s => s.skills?.risk_level === 'medium')
    const hasHigh  = approved.some(s => s.skills?.risk_level === 'high')
    const medCount = approved.filter(s => s.skills?.risk_level === 'medium').length
    const cats     = new Set(approved.map(s => s.skills?.risk_level).filter(Boolean))
    const jobs     = hp.completed_tasks || 0
    const rating   = hp.rating_avg || 0
    const noshow   = hp.no_show_count || 0
    const disputes = hp.disputes_lost || 0
    switch (verificationLevel) {
      case 1: return [
        { label: 'Identitate aprobată (buletin + selfie)', met: idOk },
        { label: 'Cazier judiciar aprobat', met: legalOk },
        { label: 'Minim 1 skill Scăzut aprobat', met: hasLow },
      ]
      case 2: return [
        { label: '5 taskuri finalizate', met: jobs >= 5, current: `${jobs}/5` },
        { label: 'Fiabilitate > 70', met: reliabilityScore > 70, current: `${reliabilityScore}` },
        { label: 'Trust score > 45', met: trustScore > 45, current: `${trustScore}` },
        { label: 'Max 1 no-show', met: noshow <= 1, current: `${noshow} no-show-uri` },
      ]
      case 3: return [
        { label: '15 taskuri finalizate', met: jobs >= 15, current: `${jobs}/15` },
        { label: '1 skill Mediu aprobat', met: hasMed },
        { label: 'Fiabilitate > 75', met: reliabilityScore > 75, current: `${reliabilityScore}` },
        { label: 'Trust score > 55', met: trustScore > 55, current: `${trustScore}` },
        { label: '0 dispute pierdute', met: disputes === 0, current: `${disputes} pierdute` },
      ]
      case 4: return [
        { label: '35 taskuri finalizate', met: jobs >= 35, current: `${jobs}/35` },
        { label: '1 skill Ridicat SAU 3 skilluri Medii', met: hasHigh || medCount >= 3, current: hasHigh ? '✓ skill ridicat' : `${medCount}/3 medii` },
        { label: 'Fiabilitate > 80', met: reliabilityScore > 80, current: `${reliabilityScore}` },
        { label: 'Trust score > 65', met: trustScore > 65, current: `${trustScore}` },
        { label: 'Rating ≥ 4.2', met: rating > 4.2, current: `${rating}★` },
      ]
      case 5: return [
        { label: '70 taskuri finalizate', met: jobs >= 70, current: `${jobs}/70` },
        { label: 'Skilluri din min. 2 niveluri de risc', met: cats.size >= 2, current: `${cats.size}/2` },
        { label: 'Fiabilitate > 85', met: reliabilityScore > 85, current: `${reliabilityScore}` },
        { label: 'Trust score > 75', met: trustScore > 75, current: `${trustScore}` },
        { label: 'Rating ≥ 4.4', met: rating > 4.4, current: `${rating}★` },
        { label: 'Activitate > 60', met: activityScore > 60, current: `${activityScore}` },
      ]
      case 6: return [
        { label: '120 taskuri finalizate', met: jobs >= 120, current: `${jobs}/120` },
        { label: 'Skilluri din toate 3 nivelurile', met: cats.size === 3, current: `${cats.size}/3` },
        { label: 'Fiabilitate > 90', met: reliabilityScore > 90, current: `${reliabilityScore}` },
        { label: 'Trust score > 85', met: trustScore > 85, current: `${trustScore}` },
        { label: 'Rating ≥ 4.6', met: rating > 4.6, current: `${rating}★` },
        { label: 'Activitate > 70', met: activityScore > 70, current: `${activityScore}` },
      ]
      default: return []
    }
  })()

  // Skills filtering — approved skills first, then pending, then unadded
  const userSkillIds = new Set(userDbSkills.map(s => s.skill_id))
  const approvedSkillIds = new Set(userDbSkills.filter(s => s.status === 'approved').map(s => s.skill_id))
  const pendingSkillIds  = new Set(userDbSkills.filter(s => s.status === 'pending').map(s => s.skill_id))
  const filteredDbSkills = dbSkills.filter(s => {
    const matchRisk = skillRiskFilter === 'all' || s.risk_level === skillRiskFilter
    const matchSearch = s.name.toLowerCase().includes(skillSearch.toLowerCase()) || s.category.toLowerCase().includes(skillSearch.toLowerCase())
    return matchRisk && matchSearch
  }).sort((a, b) => {
    const rank = (id) => approvedSkillIds.has(id) ? 0 : pendingSkillIds.has(id) ? 1 : 2
    return rank(a.id) - rank(b.id)
  })

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  // ─── RENDER ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      <HandymanNavbar />

      {/* Toast */}
      {verifyToast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white
          ${verifyToast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {verifyToast.msg}
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex gap-6">

          {/* ── SIDEBAR ── */}
          <div className="w-72 flex-shrink-0 space-y-4">

            {/* Avatar + info */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-3">
                  {profile?.avatar_url
                    ? <img src={profile.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover border-4 border-gray-100" />
                    : <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold border-4 border-gray-100">{profile?.first_name?.[0]}{profile?.last_name?.[0]}</div>
                  }
                  <label className="absolute bottom-0 right-0 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition">
                    <Camera className="w-3.5 h-3.5 text-white" />
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                  </label>
                </div>
                <h3 className="font-bold text-gray-800">{profile?.first_name} {profile?.last_name}</h3>
                <p className="text-sm text-gray-500">{profile?.email}</p>
                {handymanProfile?.rating_avg > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium text-gray-700 text-sm">{handymanProfile.rating_avg}</span>
                    <span className="text-xs text-gray-400">• {handymanProfile?.total_jobs_completed || 0} lucrări</span>
                  </div>
                )}

              </div>

              {/* Nivel */}
              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-center">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${currentLevelInfo.badge}`}>
                  Nivel {verificationLevel} · {currentLevelInfo.label}
                </span>
              </div>
            </div>

            {/* Nav */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {sidebarItems.map((item) => (
                <button key={item.id} onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all border-b border-gray-50 last:border-0
                    ${activeSection === item.id ? 'bg-blue-50 text-blue-600 border-l-4 border-l-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-medium flex-1">{item.label}</span>
                  {item.id === 'verification' && verificationLevel < 7 && (
                    <span className="w-2 h-2 rounded-full bg-yellow-400" />
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </button>
              ))}
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-500 hover:bg-red-50 transition">
                <LogOut className="w-4 h-4" /><span className="text-sm font-medium">Deconectare</span>
              </button>
            </div>
          </div>

          {/* ── MAIN CONTENT ── */}
          <div className="flex-1 min-w-0">

            {/* Banner suspendat */}
            {isSuspended && (
              <div className="mb-4 flex items-start gap-3 bg-red-50 border border-red-300 rounded-xl p-4">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-700">Cont suspendat</p>
                  <p className="text-sm text-red-600">{suspensionReason || 'Contul tău a fost suspendat. Contactează suportul pentru detalii.'}</p>
                </div>
              </div>
            )}

            {/* Banner perioadă de grație */}
            {!isSuspended && graceUntil && new Date(graceUntil) > new Date() && (
              <div className="mb-4 flex items-start gap-3 bg-orange-50 border border-orange-300 rounded-xl p-4">
                <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-orange-700">Perioadă de grație activă</p>
                  <p className="text-sm text-orange-600">{graceReason}</p>
                  <p className="text-xs text-orange-500 mt-1">
                    Ai până pe <strong>{new Date(graceUntil).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}</strong> să recuperezi scorurile,
                    altfel vei fi retrogradat cu un nivel.
                  </p>
                </div>
                <button onClick={() => setActiveSection('verification')}
                  className="flex-shrink-0 text-xs font-semibold text-orange-700 underline hover:no-underline">
                  Vezi detalii
                </button>
              </div>
            )}

            {/* ══ DATELE CONTULUI ══ */}
            {activeSection === 'account' && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                  <div><h2 className="text-lg font-bold text-gray-800">Datele Contului</h2><p className="text-sm text-gray-500">Informațiile tale de handyman</p></div>
                  {!editing
                    ? <button onClick={() => { setEditing(true); setEditForm({ ...profile, bio: handymanProfile?.bio, experience_years: handymanProfile?.experience_years }) }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"><Edit2 className="w-4 h-4" /> Editează</button>
                    : <div className="flex gap-2">
                        <button onClick={() => setEditing(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Anulează</button>
                        <button onClick={handleSaveProfile} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"><CheckCircle className="w-4 h-4" /> Salvează</button>
                      </div>
                  }
                </div>
                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-500 mb-1">Prenume</label>
                      {editing ? <input value={editForm.first_name||''} onChange={e=>setEditForm(p=>({...p,first_name:e.target.value}))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" /> : <p className="text-gray-800 font-medium">{profile?.first_name||'-'}</p>}</div>
                    <div><label className="block text-sm font-medium text-gray-500 mb-1">Nume</label>
                      {editing ? <input value={editForm.last_name||''} onChange={e=>setEditForm(p=>({...p,last_name:e.target.value}))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" /> : <p className="text-gray-800 font-medium">{profile?.last_name||'-'}</p>}</div>
                  </div>
                  <div><label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                    <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" /><p className="text-gray-800">{profile?.email}</p><span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">Verificat</span></div></div>
                  <div><label className="block text-sm font-medium text-gray-500 mb-1">Telefon</label>
                    {editing ? <input type="tel" value={editForm.phone||''} onChange={e=>setEditForm(p=>({...p,phone:e.target.value}))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" /> : <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" /><p className="text-gray-800">{profile?.phone||'Necompletat'}</p></div>}</div>
                  <div><label className="block text-sm font-medium text-gray-500 mb-1">Bio / Descriere</label>
                    {editing ? <textarea value={editForm.bio||''} onChange={e=>setEditForm(p=>({...p,bio:e.target.value}))} rows={3} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" /> : <p className="text-gray-800">{handymanProfile?.bio||'Nedefinit'}</p>}</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-500 mb-1">Ani experiență</label>
                      {editing ? <input type="number" value={editForm.experience_years||''} onChange={e=>setEditForm(p=>({...p,experience_years:parseInt(e.target.value)||0}))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" /> : <p className="text-gray-800">{handymanProfile?.experience_years||0} ani</p>}</div>
                    <div><label className="block text-sm font-medium text-gray-500 mb-1">Disponibilitate</label>
                      <p className="text-gray-800">{handymanProfile?.is_available ? <span className="text-green-600 font-medium">Disponibil</span> : <span className="text-red-500 font-medium">Indisponibil</span>}</p></div>
                  </div>
                </div>
              </div>
            )}

            {/* ══ VERIFICARE & ACCES ══ */}
            {activeSection === 'verification' && (
              <div className="space-y-5">
                {/* Progress card — compact */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">

                  {/* Header: nivel curent */}
                  <div className="mb-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${currentLevelInfo.badge}`}>
                      Nivel {verificationLevel} — {currentLevelInfo.label}
                    </span>
                    <p className="text-xs text-gray-400 mt-1.5">{currentLevelInfo.desc}</p>
                  </div>

                  {/* Stepper orizontal */}
                  <div className="flex items-center gap-1 mb-5">
                    {VERIF_LEVELS.map((lv, i) => {
                      const done   = verificationLevel > lv.level
                      const active = verificationLevel === lv.level
                      const BG = { gray:'bg-gray-400', blue:'bg-blue-500', indigo:'bg-indigo-500', teal:'bg-teal-500', orange:'bg-orange-500', purple:'bg-purple-500', yellow:'bg-yellow-500' }
                      return (
                        <div key={lv.level} className="flex items-center flex-1">
                          <div title={lv.label} className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white transition-all
                            ${done ? 'bg-green-500' : active ? BG[lv.color] : 'bg-gray-200 text-gray-400'}`}>
                            {done ? <CheckCircle className="w-3 h-3" /> : lv.level}
                          </div>
                          {i < VERIF_LEVELS.length - 1 && (
                            <div className={`flex-1 h-px mx-0.5 ${done ? 'bg-green-400' : 'bg-gray-200'}`} />
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Indicator grație în cardul de verificare */}
                  {graceUntil && new Date(graceUntil) > new Date() && (
                    <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-700">
                      <span className="font-bold">Grație:</span> {Math.ceil((new Date(graceUntil) - new Date()) / 86400000)} zile rămase să recuperezi scorurile.
                    </div>
                  )}

                  {/* Criterii pentru nivelul următor */}
                  {nextLevelInfo ? (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                        Criterii pentru Nivel {nextLevelInfo.level} — {nextLevelInfo.label}
                      </p>
                      <div className="space-y-2">
                        {nextLevelChecks.map((check, i) => (
                          <div key={i} className="flex items-center gap-2.5">
                            {check.met
                              ? <CheckCircle className="w-4 h-4 flex-shrink-0 text-green-500" />
                              : <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
                            }
                            <span className={`text-sm flex-1 ${check.met ? 'text-green-700' : 'text-gray-600'}`}>
                              {check.label}
                            </span>
                            {!check.met && check.current && (
                              <span className="text-xs text-gray-400 font-medium">{check.current}</span>
                            )}
                          </div>
                        ))}
                      </div>
                      {/* Ce deblochezi */}
                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1.5">La nivel {nextLevelInfo.level} deblochezi</p>
                        <div className="flex flex-wrap gap-1.5">
                          {nextLevelInfo.unlocks.map((u, i) => (
                            <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full font-medium">{u}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-3">
                      <p className="text-yellow-600 font-bold">⭐ Ai atins nivelul maxim — Meșter de Top!</p>
                    </div>
                  )}
                </div>

                {/* Tabs */}
                <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white text-sm">
                  {[
                    { id: 'identity', label: 'Identitate', icon: Fingerprint },
                    { id: 'legal',    label: 'Legal / Cazier', icon: FileCheck },
                  ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveVerifTab(tab.id)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 font-medium transition
                        ${activeVerifTab === tab.id ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                      <tab.icon className="w-4 h-4" /> {tab.label}
                    </button>
                  ))}
                </div>

                {/* ── Tab: Identitate ── */}
                {activeVerifTab === 'identity' && (
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
                    {identityVerif?.status === 'approved' ? (
                      <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <BadgeCheck className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <p className="font-bold text-green-800">Identitate verificată ✓</p>
                          <p className="text-sm text-green-600">Buletinul și selfie-ul tău au fost aprobate de echipa noastră.</p>
                        </div>
                      </div>
                    ) : identityVerif?.status === 'pending' ? (
                      <div className="flex items-center gap-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                        <Clock className="w-8 h-8 text-yellow-500 flex-shrink-0" />
                        <div>
                          <p className="font-bold text-yellow-800">În curs de verificare</p>
                          <p className="text-sm text-yellow-600">Documentele tale sunt analizate de echipa noastră (1-2 zile lucrătoare).</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {identityVerif?.status === 'rejected' && (
                          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                            <p className="font-bold text-red-700 mb-1">Verificare respinsă</p>
                            <p className="text-sm text-red-600">{identityVerif.rejection_reason || 'Documentele nu au putut fi verificate. Te rugăm să retrimiti.'}</p>
                          </div>
                        )}

                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
                          <p className="font-medium mb-1">Ce documente sunt necesare:</p>
                          <p className="text-xs">• Carte de identitate / buletin (față + verso vizibil)<br />• Selfie clar ținând buletinul lângă față</p>
                        </div>

                        {/* Upload 1 - Buletin */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">1. Carte de identitate / Buletin *</label>
                          {identityDoc1Preview ? (
                            <div className="relative">
                              {identityDoc1?.type?.startsWith('image/')
                                ? <img src={identityDoc1Preview} alt="" className="w-full max-h-40 object-contain border border-gray-200 rounded-xl" />
                                : <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl"><FileText className="w-5 h-5 text-gray-400" /><span className="text-sm text-gray-600 truncate">{identityDoc1Preview}</span></div>
                              }
                              <button onClick={() => { setIdentityDoc1(null); setIdentityDoc1Preview(null) }} className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                                <X className="w-3 h-3 text-white" />
                              </button>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition">
                              <Upload className="w-8 h-8 text-gray-400" />
                              <span className="text-sm text-gray-500">Click sau drag & drop</span>
                              <span className="text-xs text-gray-400">JPG, PNG, PDF — max 10MB</span>
                              <input type="file" accept="image/*,.pdf" className="hidden"
                                onChange={e => handleFileSelect(e.target.files[0], setIdentityDoc1, setIdentityDoc1Preview)} />
                            </label>
                          )}
                        </div>

                        {/* Upload 2 - Selfie */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">2. Selfie cu buletinul în mână *</label>
                          {identityDoc2Preview ? (
                            <div className="relative">
                              {identityDoc2?.type?.startsWith('image/')
                                ? <img src={identityDoc2Preview} alt="" className="w-full max-h-40 object-contain border border-gray-200 rounded-xl" />
                                : <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl"><FileText className="w-5 h-5 text-gray-400" /><span className="text-sm text-gray-600 truncate">{identityDoc2Preview}</span></div>
                              }
                              <button onClick={() => { setIdentityDoc2(null); setIdentityDoc2Preview(null) }} className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                                <X className="w-3 h-3 text-white" />
                              </button>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition">
                              <Camera className="w-8 h-8 text-gray-400" />
                              <span className="text-sm text-gray-500">Selfie cu buletinul vizibil</span>
                              <span className="text-xs text-gray-400">JPG, PNG — max 10MB</span>
                              <input type="file" accept="image/*" className="hidden"
                                onChange={e => handleFileSelect(e.target.files[0], setIdentityDoc2, setIdentityDoc2Preview)} />
                            </label>
                          )}
                        </div>

                        <button
                          onClick={handleSubmitIdentity}
                          disabled={verifySubmitting || !identityDoc1 || !identityDoc2}
                          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                          {verifySubmitting
                            ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Se încarcă...</>
                            : <><ShieldCheck className="w-4 h-4" /> Trimite pentru verificare</>}
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* ── Tab: Legal ── */}
                {activeVerifTab === 'legal' && (
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
                    {identityVerif?.status !== 'approved' && (
                      <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                        <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                        <p className="text-sm text-yellow-700">Trebuie să ai <strong>identitatea verificată</strong> înainte de a trimite cazierul.</p>
                      </div>
                    )}

                    {legalVerif?.status === 'approved' ? (
                      <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                        <BadgeCheck className="w-8 h-8 text-green-600 flex-shrink-0" />
                        <div>
                          <p className="font-bold text-green-800">Background verificat ✓</p>
                          <p className="text-sm text-green-600">Cazierul judiciar a fost verificat cu succes.</p>
                        </div>
                      </div>
                    ) : legalVerif?.status === 'pending' ? (
                      <div className="flex items-center gap-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                        <Clock className="w-8 h-8 text-yellow-500 flex-shrink-0" />
                        <div>
                          <p className="font-bold text-yellow-800">În curs de verificare</p>
                          <p className="text-sm text-yellow-600">Cazierul tău este analizat de echipa noastră.</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {legalVerif?.status === 'rejected' && (
                          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                            <p className="font-bold text-red-700 mb-1">Verificare respinsă</p>
                            <p className="text-sm text-red-600">{legalVerif.rejection_reason || 'Documentul nu a putut fi verificat.'}</p>
                          </div>
                        )}
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
                          <p className="font-medium mb-1">Cazier judiciar necesar:</p>
                          <p className="text-xs">• Cazier judiciar obținut de la secția de poliție sau online (ghiseul.ro)<br />• Document eliberat în ultimele 3 luni<br />• Documentul este procesat confidențial și șters după verificare</p>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Cazier judiciar *</label>
                          {legalDocPreview ? (
                            <div className="relative flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                              <FileText className="w-5 h-5 text-gray-400" />
                              <span className="text-sm text-gray-600 truncate flex-1">{typeof legalDocPreview === 'string' && !legalDocPreview.startsWith('data') ? legalDocPreview : legalDoc?.name}</span>
                              <button onClick={() => { setLegalDoc(null); setLegalDocPreview(null) }} className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <X className="w-3 h-3 text-white" />
                              </button>
                            </div>
                          ) : (
                            <label className={`flex flex-col items-center gap-2 p-6 border-2 border-dashed rounded-xl transition
                              ${identityVerif?.status !== 'approved' ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50' : 'border-gray-300 cursor-pointer hover:border-blue-400 hover:bg-blue-50'}`}>
                              <FileCheck className="w-8 h-8 text-gray-400" />
                              <span className="text-sm text-gray-500">Cazier judiciar</span>
                              <span className="text-xs text-gray-400">PDF, JPG — max 10MB</span>
                              <input type="file" accept="image/*,.pdf" className="hidden" disabled={identityVerif?.status !== 'approved'}
                                onChange={e => handleFileSelect(e.target.files[0], setLegalDoc, setLegalDocPreview)} />
                            </label>
                          )}
                        </div>

                        <button
                          onClick={handleSubmitLegal}
                          disabled={verifySubmitting || !legalDoc || identityVerif?.status !== 'approved'}
                          className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                          {verifySubmitting
                            ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Se încarcă...</>
                            : <><FileCheck className="w-4 h-4" /> Trimite cazierul</>}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ══ SKILLURI & CERTIFICĂRI ══ */}
            {activeSection === 'skills' && (
              <div className="space-y-4">
                {/* Skills header */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <h2 className="text-lg font-bold text-gray-800">Skilluri & Certificări</h2>
                      <p className="text-sm text-gray-500">
                        {userDbSkills.filter(s => s.status === 'approved').length > 0
                          ? `${userDbSkills.filter(s => s.status === 'approved').length} skill${userDbSkills.filter(s => s.status === 'approved').length > 1 ? 'uri aprobate' : ' aprobat'}`
                          : 'Adaugă primul skill pentru a-ți crește vizibilitatea'}
                      </p>
                    </div>
                    <div className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold border ${ts.badge}`}>
                      <span>{ts.icon}</span> {ts.label}
                    </div>
                  </div>

                  {/* Reputation context */}
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                    <span>⭐</span>
                    {(handymanProfile?.total_jobs_completed ?? 0) > 0
                      ? `Reputație bazată pe ${handymanProfile.total_jobs_completed} lucrări finalizate`
                      : 'Finalizează primele lucrări pentru a-ți construi reputația'}
                  </div>

                  {/* Progress bar (visual only, no numbers) */}
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full bg-gradient-to-r ${ts.bar} rounded-full transition-all duration-500`}
                      style={{ width: `${trustScore}%` }} />
                  </div>

                  {/* CTA if no approved skills */}
                  {userDbSkills.filter(s => s.status === 'approved').length === 0 && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-blue-700">
                        Adaugă un skill verificat pentru a debloca taskuri de risc ridicat și a apărea mai sus în rezultatele de căutare.
                      </p>
                    </div>
                  )}
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input value={skillSearch} onChange={e => setSkillSearch(e.target.value)}
                      placeholder="Caută skill sau categorie..."
                      className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm">
                    {[
                      { id: 'all',    label: 'Toate' },
                      { id: 'low',    label: '🟢 Scăzut' },
                      { id: 'medium', label: '🟡 Mediu' },
                      { id: 'high',   label: '🔴 Ridicat' },
                    ].map(f => (
                      <button key={f.id} onClick={() => setSkillRiskFilter(f.id)}
                        className={`px-3 py-2.5 font-medium transition ${skillRiskFilter === f.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Skills list */}
                {skillsLoading ? (
                  <div className="flex items-center justify-center py-12 bg-white rounded-xl border border-gray-100">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filteredDbSkills.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                    <Award className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">Niciun skill găsit</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredDbSkills.map(skill => {
                      const userSkill = userDbSkills.find(us => us.skill_id === skill.id)
                      const riskCfg = RISK_CONFIG[skill.risk_level]

                      return (
                        <div key={skill.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${userSkill ? 'border-blue-100' : 'border-gray-100'}`}>
                          <div className="flex items-center gap-4 p-4">
                            {/* Risk dot */}
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${riskCfg.bg}`}>
                              <span className={`text-lg`}>{skill.risk_level === 'low' ? '🟢' : skill.risk_level === 'medium' ? '🟡' : '🔴'}</span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-gray-800 text-sm">{skill.name}</p>
                                <RiskBadge level={skill.risk_level} />
                                {skill.requires_certificate && (
                                  <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[10px] rounded font-medium">Certificat obligatoriu</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5">{skill.category} {userSkill ? `• ${userSkill.skill_evidences?.length || 0} dovezi` : ''}</p>
                            </div>

                            {/* Status + action */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {userSkill && <StatusBadge status={userSkill.status} />}

                              {!userSkill ? (
                                <button onClick={() => handleAddSkill(skill.id)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition">
                                  <Plus className="w-3.5 h-3.5" /> Adaugă
                                </button>
                              ) : (
                                <button
                                  onClick={() => setExpandedSkill(expandedSkill === skill.id ? null : skill.id)}
                                  className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-50 transition">
                                  Gestionează {expandedSkill === skill.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Expanded manage area */}
                          {userSkill && expandedSkill === skill.id && (
                            <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3">

                              {/* ── PENDING: read-only waiting state ── */}
                              {userSkill.status === 'pending' && (
                                <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                                  <Clock className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                                  <p className="text-xs text-yellow-800 font-medium">
                                    Trimis la verificare — adminul va revizui dovezile tale în curând.
                                  </p>
                                </div>
                              )}

                              {/* ── APPROVED: read-only ── */}
                              {userSkill.status === 'approved' && (
                                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                                  <BadgeCheck className="w-4 h-4 text-green-600 flex-shrink-0" />
                                  <p className="text-xs text-green-800 font-medium">Skill verificat și aprobat.</p>
                                </div>
                              )}

                              {/* ── REJECTED: show reason ── */}
                              {userSkill.status === 'rejected' && userSkill.rejection_reason && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                                  <p className="text-xs font-semibold text-red-700 mb-0.5">Motiv respingere:</p>
                                  <p className="text-xs text-red-600">{userSkill.rejection_reason}</p>
                                </div>
                              )}

                              {/* ── Evidence list (all statuses) ── */}
                              {userSkill.skill_evidences?.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-600 mb-2">Dovezi încărcate:</p>
                                  <div className="space-y-1.5">
                                    {userSkill.skill_evidences.map(ev => {
                                      const evType = EVIDENCE_TYPES.find(t => t.id === ev.type)
                                      const Icon = evType?.icon || FileText
                                      const canDelete = userSkill.status === 'draft' || userSkill.status === 'rejected'
                                      return (
                                        <div key={ev.id} className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded-lg">
                                          <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                          <span className="text-xs font-medium text-gray-700">{evType?.label}</span>
                                          {ev.description && <span className="text-xs text-gray-400 truncate flex-1">— {ev.description}</span>}
                                          <a href={ev.file_url} target="_blank" rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-700">
                                            <Eye className="w-3.5 h-3.5" />
                                          </a>
                                          {canDelete && (
                                            <button onClick={() => handleDeleteEvidence(ev.id, userSkill.id)} className="text-red-400 hover:text-red-600">
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* ── Actions: draft or rejected ── */}
                              {(userSkill.status === 'draft' || userSkill.status === 'rejected') && (
                                <>
                                  <button onClick={() => {
                                    setEvidenceModal(userSkill)
                                    setEvidenceType('certificate')
                                    setEvidenceDesc('')
                                    setEvidenceFile(null)
                                    setEvidenceSubmitted(false)
                                  }} className="flex items-center gap-2 text-xs text-blue-600 font-semibold hover:text-blue-700 transition">
                                    <Upload className="w-3.5 h-3.5" /> Adaugă dovadă
                                  </button>

                                  <div className="flex items-center gap-3 pt-1 border-t border-gray-200">
                                    <button
                                      onClick={() => handleSubmitSkillForReview(userSkill.id)}
                                      disabled={!userSkill.skill_evidences?.length}
                                      title={!userSkill.skill_evidences?.length ? 'Adaugă cel puțin o dovadă înainte de a trimite' : ''}
                                      className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                      <Send className="w-3.5 h-3.5" />
                                      {userSkill.status === 'rejected' ? 'Retrimite la verificare' : 'Trimite la verificare'}
                                    </button>
                                    <button onClick={() => handleRemoveSkill(userSkill.id)}
                                      className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition">
                                      <Trash2 className="w-3.5 h-3.5" /> Șterge
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ══ ZONA DE LUCRU ══ */}
            {activeSection === 'workzone' && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                  <div><h2 className="text-lg font-bold text-gray-800">Zona de Lucru</h2><p className="text-sm text-gray-500">Setează unde ești disponibil</p></div>
                  <button onClick={() => setShowZoneChange(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"><Edit2 className="w-4 h-4" /> Modifică</button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-xl"><p className="text-xs text-gray-500 mb-1">Oraș principal</p><p className="font-bold text-gray-800 text-lg">{handymanProfile?.primary_city||'Nesetat'}</p><p className="text-sm text-gray-500">{handymanProfile?.primary_county||''}</p></div>
                    <div className="p-4 bg-gray-50 rounded-xl"><p className="text-xs text-gray-500 mb-1">Coordonate</p><p className="font-medium text-gray-800">{handymanProfile?.work_latitude?`${handymanProfile.work_latitude}°, ${handymanProfile.work_longitude}°`:'Nesetate'}</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-xl"><div className="flex items-center gap-2 mb-2"><div className="w-3 h-3 bg-green-500 rounded-full"/><p className="text-sm font-bold text-green-700">Zona principală</p></div><p className="text-2xl font-bold text-green-800">{handymanProfile?.work_radius_km||10} km</p><p className="text-xs text-green-600 mt-1">Taskuri prioritare</p></div>
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl"><div className="flex items-center gap-2 mb-2"><div className="w-3 h-3 bg-yellow-500 rounded-full"/><p className="text-sm font-bold text-yellow-700">Zona extinsă</p></div><p className="text-2xl font-bold text-yellow-800">{handymanProfile?.extended_radius_km||10} km</p><p className="text-xs text-yellow-600 mt-1">Cu cost deplasare</p></div>
                  </div>
                </div>
              </div>
            )}

            {/* ══ PLĂȚI & VENITURI ══ */}
            {activeSection === 'payments' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-500">Total procesat</p>
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center"><TrendingUp className="w-4 h-4 text-green-600"/></div>
                    </div>
                    <p className="text-2xl font-bold text-gray-800">{totalEarnings.toLocaleString('ro-RO')} RON</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-500">În așteptare</p>
                      <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center"><Clock className="w-4 h-4 text-yellow-600"/></div>
                    </div>
                    <p className="text-2xl font-bold text-gray-800">{pendingEarnings.toLocaleString('ro-RO')} RON</p>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800">Istoric Tranzacții</h2>
                    <select value={paymentFilter} onChange={e=>setPaymentFilter(e.target.value)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white">
                      <option value="all">Toate</option>
                      <option value="processed">Procesate</option>
                      <option value="pending">În așteptare</option>
                    </select>
                  </div>
                  {txLoading ? (
                    <div className="p-8 text-center text-gray-400 text-sm">Se încarcă...</div>
                  ) : filteredTx.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">Nu există tranzacții înregistrate.</div>
                  ) : (
                    <>
                      <div className="px-6 py-3 bg-gray-50 grid grid-cols-12 gap-4 text-xs font-bold text-gray-500 uppercase">
                        <div className="col-span-5">Descriere</div>
                        <div className="col-span-2">Tip</div>
                        <div className="col-span-2 text-right">Sumă</div>
                        <div className="col-span-2">Data</div>
                        <div className="col-span-1">Status</div>
                      </div>
                      {filteredTx.map(t => {
                        const typeBadge = getTxTypeBadge(t.type)
                        const statusBadge = t.status === 'processed'
                          ? { label: 'Procesat', cls: 'bg-green-100 text-green-700' }
                          : { label: 'În așteptare', cls: 'bg-yellow-100 text-yellow-700' }
                        return (
                          <div key={t.id} className="px-6 py-4 grid grid-cols-12 gap-4 items-center border-b border-gray-50 hover:bg-gray-50 transition">
                            <div className="col-span-5"><p className="font-medium text-gray-800 text-sm">{t.description}</p></div>
                            <div className="col-span-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeBadge.cls}`}>{typeBadge.label}</span></div>
                            <div className="col-span-2 text-right"><p className="text-sm font-bold text-green-700">+{Number(t.amount).toLocaleString('ro-RO')} RON</p></div>
                            <div className="col-span-2"><p className="text-sm text-gray-500">{new Date(t.created_at).toLocaleDateString('ro-RO')}</p></div>
                            <div className="col-span-1"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.cls}`}>{statusBadge.label}</span></div>
                          </div>
                        )
                      })}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ══ NOTIFICĂRI ══ */}
            {activeSection === 'notifications' && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="p-6 border-b border-gray-100"><h2 className="text-lg font-bold text-gray-800">Setări Notificări</h2></div>
                <div className="p-6 space-y-6">
                  {[
                    {title:'Email',items:[{key:'email_tasks',label:'Taskuri noi'},{key:'email_messages',label:'Mesaje'},{key:'email_payments',label:'Plăți'},{key:'email_reviews',label:'Recenzii'}]},
                    {title:'Push',items:[{key:'push_tasks',label:'Taskuri urgente'},{key:'push_messages',label:'Mesaje noi'},{key:'push_payments',label:'Plăți procesate'}]},
                    {title:'SMS',items:[{key:'sms_tasks',label:'Urgențe'},{key:'sms_payments',label:'Plăți importante'}]},
                  ].map(g=>(
                    <div key={g.title}><h3 className="font-bold text-gray-800 mb-3">{g.title}</h3><div className="space-y-3">{g.items.map(item=>(
                      <div key={item.key} className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-600">{item.label}</span>
                        <button onClick={()=>toggleNotif(item.key)} className={`w-11 h-6 rounded-full relative transition-colors ${notifSettings[item.key]?'bg-blue-600':'bg-gray-200'}`}>
                          <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow transition-transform ${notifSettings[item.key]?'translate-x-5':'translate-x-0.5'}`}/>
                        </button>
                      </div>
                    ))}</div></div>
                  ))}
                </div>
              </div>
            )}

            {/* ══ SECURITATE ══ */}
            {activeSection === 'security' && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-1">Setări Siguranță</h2><p className="text-sm text-gray-500 mb-6">Gestionează securitatea contului</p>
                <div className="space-y-4">
                  {[
                    {icon:Lock,title:'Schimbă Parola',desc:'Ultima schimbare: acum 30 zile',action:'Schimbă',danger:false},
                    {icon:Shield,title:'Autentificare 2FA',desc:'Securitate suplimentară',action:'Dezactivat',danger:false,badge:true},
                    {icon:Monitor,title:'Sesiuni Active',desc:'1 sesiune activă',action:'Gestionează',danger:false},
                    {icon:AlertTriangle,title:'Șterge Contul',desc:'Acțiune permanentă',action:'Șterge',danger:true},
                  ].map(item=>(
                    <div key={item.title} className={`flex items-center justify-between p-4 rounded-xl ${item.danger?'bg-red-50':'bg-gray-50'}`}>
                      <div className="flex items-center gap-3"><item.icon className={`w-5 h-5 ${item.danger?'text-red-400':'text-gray-400'}`}/><div><p className={`font-medium ${item.danger?'text-red-700':'text-gray-800'}`}>{item.title}</p><p className={`text-xs ${item.danger?'text-red-500':'text-gray-500'}`}>{item.desc}</p></div></div>
                      {item.badge?<span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">{item.action}</span>:<button className={`px-4 py-2 border rounded-lg text-sm font-medium transition ${item.danger?'border-red-200 text-red-600 hover:bg-red-100':'border-gray-200 text-gray-600 hover:bg-white'}`}>{item.action}</button>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ══ RECENZII ══ */}
            {activeSection === 'reviews' && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="p-6 border-b border-gray-100"><h2 className="text-lg font-bold text-gray-800">Recenziile Mele</h2></div>
                <div className="divide-y divide-gray-50">
                  {mockReviews.map(r=>(
                    <div key={r.id} className="p-5">
                      <div className="flex items-center justify-between mb-2">
                        <div><p className="font-bold text-gray-800">{r.service}</p><p className="text-sm text-gray-500">De la: {r.client}</p></div>
                        <div className="text-right"><div className="flex items-center gap-0.5">{[1,2,3,4,5].map(s=><Star key={s} className={`w-4 h-4 ${s<=r.rating?'fill-yellow-400 text-yellow-400':'text-gray-200'}`}/>)}</div><p className="text-xs text-gray-400 mt-1">{new Date(r.date).toLocaleDateString('ro-RO')}</p></div>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{r.text}</p>
                      {r.reply?(<div className="bg-blue-50 rounded-xl p-3 ml-6"><p className="text-xs font-bold text-blue-700 mb-1">Răspunsul tău:</p><p className="text-sm text-blue-600">{r.reply}</p></div>)
                        :replyingTo===r.id?(<div className="ml-6 space-y-2"><textarea value={replyText} onChange={e=>setReplyText(e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/><div className="flex gap-2"><button onClick={()=>{setReplyingTo(null);setReplyText('')}} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs">Anulează</button><button className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs">Trimite</button></div></div>)
                        :<button onClick={()=>setReplyingTo(r.id)} className="ml-6 text-xs text-blue-600 font-medium hover:underline">Răspunde</button>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ══ SERVICII ══ */}
            {activeSection === 'services' && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center">
                <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3"/>
                <h2 className="text-lg font-bold text-gray-800 mb-2">Serviciile Mele</h2>
                <p className="text-sm text-gray-500 mb-4">Gestionează serviciile oferite</p>
                <button onClick={()=>navigate('/handyman/services')} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">Gestionează Servicii</button>
              </div>
            )}

            {/* ══ PROGRAM DE LUCRU ══ */}
            {activeSection === 'schedule' && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-lg font-bold text-gray-800">Program de Lucru</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Definește zilele și orele în care ești disponibil. Clienții vor putea rezerva doar în aceste intervale.
                  </p>
                </div>
                <div className="p-6">
                  {scheduleSaved && (
                    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-5">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-700 font-medium">Programul a fost salvat cu succes!</span>
                    </div>
                  )}
                  <ScheduleEditor
                    schedule={schedule}
                    travelBuffer={travelBuffer}
                    onChange={(sched, buf) => { setSchedule(sched); setTravelBuffer(buf); setScheduleSaved(false) }}
                  />
                  <div className="flex justify-end mt-6">
                    <button
                      onClick={async () => {
                        setScheduleLoading(true)
                        const { data: { user } } = await supabase.auth.getUser()
                        await supabase.from('handyman_schedule').upsert({
                          handyman_id: user.id,
                          schedule,
                          travel_buffer_min: travelBuffer,
                        }, { onConflict: 'handyman_id' })
                        const activeDays = Object.entries(schedule)
                          .filter(([, slots]) => slots.length > 0)
                          .map(([day]) => day)
                        await supabase.from('handyman_profiles')
                          .update({ available_days: activeDays })
                          .eq('user_id', user.id)
                        setScheduleLoading(false)
                        setScheduleSaved(true)
                        setTimeout(() => setScheduleSaved(false), 4000)
                      }}
                      disabled={scheduleLoading || Object.values(schedule).every(s => s.length === 0)}
                      className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60"
                    >
                      {scheduleLoading
                        ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Se salvează…</>
                        : <><Calendar className="w-4 h-4" /> Salvează Programul</>}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ══ DATE FACTURARE ══ */}
            {activeSection === 'billing' && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="p-6 border-b border-gray-100"><h2 className="text-lg font-bold text-gray-800">Date Facturare</h2></div>
                <div className="p-6 space-y-5">
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl"><p className="text-sm text-yellow-700">Fără IBAN valid, plățile nu pot fi procesate.</p></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Nume / Firmă *</label><input value={billingForm.company_name} onChange={e=>setBillingForm(p=>({...p,company_name:e.target.value}))} placeholder="Nume complet sau firmă" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">CUI / CNP *</label><input value={billingForm.cui} onChange={e=>setBillingForm(p=>({...p,cui:e.target.value}))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
                  </div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Adresă</label><input value={billingForm.address} onChange={e=>setBillingForm(p=>({...p,address:e.target.value}))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">IBAN *</label><input value={billingForm.iban} onChange={e=>setBillingForm(p=>({...p,iban:e.target.value}))} placeholder="RO00XXXX..." className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Banca</label><input value={billingForm.bank} onChange={e=>setBillingForm(p=>({...p,bank:e.target.value}))} placeholder="BRD, BCR, ING..." className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
                  </div>
                  <button className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition">Salvează Datele</button>
                </div>
              </div>
            )}

            {/* ══ ASPECT INTERFAȚĂ ══ */}
            {activeSection === 'appearance' && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="p-6 border-b border-gray-100"><h2 className="text-lg font-bold text-gray-800">Aspect Interfață</h2></div>
                <div className="p-6 space-y-6">
                  <div><h3 className="font-bold text-gray-800 mb-3">Temă</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {[{id:'light',icon:Sun,label:'Luminoasă',preview:'bg-white'},{id:'dark',icon:Moon,label:'Întunecată',preview:'bg-gray-800'},{id:'system',icon:Monitor,label:'Sistem',preview:'bg-gradient-to-r from-white to-gray-800'}].map(t=>(
                        <button key={t.id} onClick={()=>setTheme(t.id)} className={`p-4 rounded-xl border-2 text-center transition-all ${theme===t.id?'border-blue-600 bg-blue-50':'border-gray-200 hover:border-blue-300'}`}>
                          <div className={`w-full h-16 rounded-lg mb-3 ${t.preview} border border-gray-200`}/>
                          <t.icon className={`w-5 h-5 mx-auto mb-1 ${theme===t.id?'text-blue-600':'text-gray-400'}`}/>
                          <p className="text-sm font-medium text-gray-800">{t.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>{/* end main */}
        </div>
      </div>

      {/* ══ MODAL: Adaugă Dovadă ══ */}
      {evidenceModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => { setEvidenceModal(null); setEvidenceSubmitted(false) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-800">Adaugă Dovadă</h3>
                <p className="text-sm text-gray-500">{evidenceModal.skills?.name}</p>
              </div>
              <button onClick={() => { setEvidenceModal(null); setEvidenceSubmitted(false) }} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {evidenceSubmitted ? (
              /* ── Success state ── */
              <div className="p-6 text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-base">Dovadă adăugată cu succes!</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Trimite skillul la verificare pentru ca administratorul să îl revizuiască și să îl aprobe.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    await handleSubmitSkillForReview(evidenceModal.id)
                    setEvidenceModal(null)
                    setEvidenceSubmitted(false)
                  }}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" /> Trimite la verificare
                </button>
                <button
                  onClick={() => setEvidenceSubmitted(false)}
                  className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition"
                >
                  Adaugă altă dovadă
                </button>
              </div>
            ) : (
              /* ── Upload form ── */
              <div className="p-6 space-y-4">
                {/* Type selector */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Tip dovadă</label>
                  <div className="grid grid-cols-2 gap-2">
                    {EVIDENCE_TYPES.map(t => {
                      const Icon = t.icon
                      return (
                        <button key={t.id} onClick={() => setEvidenceType(t.id)}
                          className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${evidenceType === t.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                          <Icon className={`w-4 h-4 flex-shrink-0 ${evidenceType === t.id ? 'text-blue-600' : 'text-gray-400'}`} />
                          <div>
                            <p className={`text-xs font-semibold ${evidenceType === t.id ? 'text-blue-700' : 'text-gray-700'}`}>{t.label}</p>
                            <p className="text-[10px] text-gray-400 leading-tight">{t.desc}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Descriere (opțional)</label>
                  <input value={evidenceDesc} onChange={e => setEvidenceDesc(e.target.value)}
                    placeholder="Ex: Certificat ANRE tip II..."
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                {/* File upload */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Fișier *</label>
                  {evidenceFile ? (
                    <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                      <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-600 truncate flex-1">{evidenceFile.name}</span>
                      <button onClick={() => setEvidenceFile(null)} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition">
                      <Upload className="w-7 h-7 text-gray-400" />
                      <span className="text-sm text-gray-500">Click sau drag & drop</span>
                      <span className="text-xs text-gray-400">PDF, JPG, PNG, MP4 — max 50MB</span>
                      <input type="file" accept="image/*,.pdf,video/*" className="hidden"
                        onChange={e => setEvidenceFile(e.target.files[0])} />
                    </label>
                  )}
                </div>

                <button onClick={handleUploadEvidence} disabled={evidenceUploading || !evidenceFile}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {evidenceUploading
                    ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Se încarcă...</>
                    : <><Upload className="w-4 h-4" /> Adaugă dovada</>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ MODAL: Schimbă Zona ══ */}
      {showZoneChange && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => setShowZoneChange(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">Modifică Zona de Lucru</h3>
              <button onClick={() => setShowZoneChange(false)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-sm font-bold text-gray-800 mb-2">Oraș *</label><CityAutocomplete value={zoneForm.city?`${zoneForm.city}, ${zoneForm.county}`:''} onChange={c=>setZoneForm(p=>({...p,city:c.name,county:c.county}))} placeholder="Caută orașul..."/></div>
              <div><label className="block text-sm font-bold text-gray-800 mb-2">Raza principală: <span className="text-blue-600">{zoneForm.radius} km</span></label><input type="range" min="5" max="50" value={zoneForm.radius} onChange={e=>setZoneForm(p=>({...p,radius:parseInt(e.target.value)}))} className="w-full accent-blue-600"/></div>
              <div><label className="block text-sm font-bold text-gray-800 mb-2">Raza extinsă: <span className="text-yellow-600">{zoneForm.extended} km</span></label><input type="range" min={zoneForm.radius} max="100" value={zoneForm.extended} onChange={e=>setZoneForm(p=>({...p,extended:parseInt(e.target.value)}))} className="w-full accent-yellow-500"/></div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button onClick={()=>setShowZoneChange(false)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Anulează</button>
              <button onClick={()=>setShowConfirmZone(true)} disabled={!zoneForm.city} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">Salvează</button>
            </div>
          </div>
        </div>
      )}

      {showConfirmZone && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm text-center p-6">
            <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-7 h-7 text-yellow-600"/></div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Schimbi zona de lucru?</h3>
            <p className="text-sm mb-1"><strong>{handymanProfile?.primary_city||'Nedefinit'}</strong> → <strong>{zoneForm.city}, {zoneForm.county}</strong></p>
            <p className="text-xs text-gray-400 mb-6">Rază: {zoneForm.radius} km principală, {zoneForm.extended} km extinsă</p>
            <div className="flex gap-3"><button onClick={()=>setShowConfirmZone(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Anulează</button><button onClick={handleConfirmZoneChange} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">Da, schimbă</button></div>
          </div>
        </div>
      )}

    </div>
  )
}
