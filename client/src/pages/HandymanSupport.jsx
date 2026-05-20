import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../supabase'
import HandymanNavbar from '../components/handyman-dashboard/HandymanNavbar'
import {
  MessageCircle, FileText, Phone, Search, ChevronDown, ChevronUp,
  Calendar, AlertTriangle, CreditCard, User, Shield, HelpCircle,
  Send, X, Loader2, CheckCircle, Clock, RefreshCw, ChevronRight,
  Tag, AlertCircle, TicketCheck, Briefcase, Star, DollarSign, Wrench
} from 'lucide-react'

// ─── constants ────────────────────────────────────────────────────────────────

const REPORT_CATEGORIES = [
  'Problemă Plată / Comision',
  'Problemă cu un Client',
  'Problemă Cont / Profil',
  'Problemă Verificare / Documente',
  'Problemă Tehnică',
  'Altele',
]

const SEVERITY_LEVELS = [
  { value: 'low',      label: 'Scăzut — Întrebare generală',          color: 'text-gray-500',   bg: 'bg-gray-100' },
  { value: 'medium',   label: 'Mediu — Problemă care afectează munca', color: 'text-yellow-600', bg: 'bg-yellow-50' },
  { value: 'high',     label: 'Ridicat — Problemă urgentă',            color: 'text-orange-600', bg: 'bg-orange-50' },
  { value: 'critical', label: 'Critic — Necesită atenție imediată',    color: 'text-red-600',    bg: 'bg-red-50' },
]

const STATUS_CONFIG = {
  open:        { label: 'Deschis',   color: 'bg-blue-100 text-blue-700',    icon: Clock },
  in_progress: { label: 'În lucru',  color: 'bg-yellow-100 text-yellow-700', icon: RefreshCw },
  resolved:    { label: 'Rezolvat',  color: 'bg-green-100 text-green-700',  icon: CheckCircle },
  closed:      { label: 'Închis',    color: 'bg-gray-100 text-gray-500',    icon: X },
}

const FAQ_ITEMS = [
  { q: 'Cum îmi verific contul / profilul?', a: 'Din secțiunea "Verificare & Acces" din profilul personal. Încarcă actele necesare și adminul le aprobă în 24-48h. Vei fi notificat prin email.', tag: 'Verificare' },
  { q: 'Cum primesc plata pentru joburi finalizate?', a: 'Plata este procesată după ce clientul confirmă lucrarea. Banii ajung în contul setat în secțiunea "Plăți & Venituri" din profilul tău.', tag: 'Plăți' },
  { q: 'Ce fac dacă un client deschide o dispută neîntemeiată?', a: 'Contestează disputa din secțiunea "Job Pipeline → Dispute". Adaugă dovezi foto și o explicație. Adminul analizează și ia o decizie imparțială.', tag: 'Dispute' },
  { q: 'Cum îmi cresc nivelul de verificare?', a: 'Finalizează joburi, primește recenzii pozitive și încarcă certificările solicitate. Nivelul crește automat pe baza activității și a documentelor aprobate.', tag: 'Cont' },
  { q: 'Pot schimba zona de lucru?', a: 'Da, din "Profilul Personal → Zona de Lucru". Schimbarea se aplică imediat în feed-ul de taskuri.', tag: 'Zonă' },
  { q: 'Cum gestionez un job întârziat?', a: 'Din "Job Pipeline" apasă butonul de raportare întârziere pe cardul jobului. Clientul va fi notificat automat cu motivul introdus de tine.', tag: 'Joburi' },
]

const HELP_CATEGORIES = [
  { icon: Briefcase,     title: 'Joburi & Pipeline',           desc: 'Acceptare, finalizare, disputuri',          links: ['Cum accept un job', 'Raportare întârziere'] },
  { icon: DollarSign,    title: 'Plăți & Comisioane',          desc: 'Plăți primite, comisioane, facturi',        links: ['Cum primesc plata', 'Comision platformă'] },
  { icon: Shield,        title: 'Verificare & Documente',      desc: 'Nivel verificare, acte, licențe',           links: ['Cum mă verific', 'Documente necesare'] },
  { icon: User,          title: 'Cont & Profil',               desc: 'Setări cont, parolă, informații',           links: ['Actualizare informații', 'Resetare parolă'] },
  { icon: Star,          title: 'Recenzii & Rating',           desc: 'Recenzii primite, contestații',             links: ['Contestă o recenzie', 'Cresc ratingul'] },
  { icon: HelpCircle,    title: 'Alte Întrebări',              desc: 'Întrebări generale despre platformă',       links: ['Cum funcționează HandyConnect', 'Reguli platformă'] },
]

// ─── helpers ──────────────────────────────────────────────────────────────────

function SeverityBadge({ value }) {
  const s = SEVERITY_LEVELS.find(x => x.value === value)
  if (!s) return null
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.bg} ${s.color}`}>{s.label.split('—')[0].trim()}</span>
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.open
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${cfg.color}`}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  )
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ═════════════════════════════════════════════════════════════════════════════
export default function HandymanSupport() {
  const location = useLocation()
  const [activeTab,  setActiveTab]  = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('tab') ?? 'help'
  })
  const [userId,     setUserId]     = useState(null)
  const [faqSearch,  setFaqSearch]  = useState('')
  const [openFaq,    setOpenFaq]    = useState(null)

  // form
  const [form,       setForm]       = useState({ category: '', severity: '', title: '', description: '', task_id: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitOk,   setSubmitOk]   = useState(false)
  const [submitErr,  setSubmitErr]  = useState('')

  // tickets list
  const [tickets,    setTickets]    = useState([])
  const [loadingT,   setLoadingT]   = useState(false)
  const [openTicket, setOpenTicket] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const tab = params.get('tab')
    if (tab) setActiveTab(tab)
  }, [location.search])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  useEffect(() => {
    if (activeTab === 'tickets' && userId) loadTickets()
  }, [activeTab, userId])

  async function loadTickets() {
    setLoadingT(true)
    const { data } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('handyman_id', userId)
      .order('created_at', { ascending: false })
    setTickets(data ?? [])
    setLoadingT(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!userId) { setSubmitErr('Trebuie să fii autentificat.'); return }
    setSubmitting(true)
    setSubmitErr('')

    const rawRef = form.task_id.trim()
    const isUuid = /^[0-9a-f-]{36}$/i.test(rawRef)
    const desc = rawRef && !isUuid
      ? `${form.description}\n\n[Referință task: ${rawRef}]`
      : form.description

    const { error } = await supabase.from('support_tickets').insert({
      handyman_id:  userId,
      submitted_by: 'handyman',
      status:       'open',
      category:     form.category,
      severity:     form.severity,
      title:        form.title,
      description:  desc,
      task_id:      isUuid ? rawRef : null,
      updated_at:   new Date().toISOString(),
    })

    setSubmitting(false)
    if (error) {
      setSubmitErr('Eroare la trimitere. Încearcă din nou.')
    } else {
      setSubmitOk(true)
      setForm({ category: '', severity: '', title: '', description: '', task_id: '' })
      setTimeout(() => setSubmitOk(false), 5000)
    }
  }

  const filteredFaqs = faqSearch
    ? FAQ_ITEMS.filter(f => f.q.toLowerCase().includes(faqSearch.toLowerCase()) || f.a.toLowerCase().includes(faqSearch.toLowerCase()))
    : FAQ_ITEMS

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gray-50">
      <HandymanNavbar />

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ── HEADER ── */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Suport Meșteri</h1>
          <p className="text-gray-500 mt-1 text-sm">Suntem aici să te ajutăm cu joburi, plăți și orice alte întrebări.</p>
        </div>

        {/* ── QUICK ACTIONS ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => setActiveTab('report')}
            className="bg-white rounded-xl border border-gray-100 p-5 text-left hover:shadow-md hover:border-blue-200 transition-all group"
          >
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition">
                <FileText className="w-5 h-5 text-blue-600 group-hover:text-white transition" />
              </div>
              <div>
                <p className="font-bold text-gray-800">Trimite Tichet</p>
                <p className="text-xs text-gray-500 mt-0.5">Creează o cerere detaliată de suport</p>
                <p className="text-xs font-medium text-blue-600 mt-1">Răspuns în 2-4 ore</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('tickets')}
            className="bg-white rounded-xl border border-gray-100 p-5 text-left hover:shadow-md hover:border-green-200 transition-all group"
          >
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-600 transition">
                <TicketCheck className="w-5 h-5 text-green-600 group-hover:text-white transition" />
              </div>
              <div>
                <p className="font-bold text-gray-800">Tichetele Mele</p>
                <p className="text-xs text-gray-500 mt-0.5">Urmărește stadiul cererilor tale</p>
                <p className="text-xs font-medium text-green-600 mt-1">Vezi istoricul</p>
              </div>
            </div>
          </button>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 bg-purple-100 rounded-lg flex items-center justify-center">
                <Phone className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-bold text-gray-800">Suport Telefonic</p>
                <p className="text-xs text-gray-500 mt-0.5">Vorbește direct cu echipa noastră</p>
                <p className="text-xs font-medium text-purple-600 mt-1">0800-HANDY-HELP</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="flex gap-1.5 mb-6 bg-white rounded-xl border border-gray-100 p-1.5">
          {[
            { id: 'help',    label: 'Centru de Ajutor' },
            { id: 'report',  label: 'Raportează Problemă' },
            { id: 'tickets', label: 'Tichetele Mele' },
            { id: 'contact', label: 'Contact' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all
                ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">

          {/* ══ HELP CENTER ══ */}
          {activeTab === 'help' && (
            <div className="p-6">
              <h3 className="font-bold text-gray-800 mb-4">Întrebări Frecvente — Meșteri</h3>
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={faqSearch}
                  onChange={e => setFaqSearch(e.target.value)}
                  placeholder="Caută în FAQ…"
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {faqSearch && <button onClick={() => setFaqSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-gray-400" /></button>}
              </div>

              <div className="space-y-2 mb-8">
                {filteredFaqs.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-8">Niciun rezultat pentru „{faqSearch}"</p>
                )}
                {filteredFaqs.map((faq, i) => (
                  <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition"
                    >
                      <span className="font-medium text-gray-800 text-sm">{faq.q}</span>
                      {openFaq === i ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                    </button>
                    {openFaq === i && (
                      <div className="px-4 pb-4">
                        <p className="text-sm text-gray-600 leading-relaxed mb-2">{faq.a}</p>
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-md font-medium">{faq.tag}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <h3 className="font-bold text-gray-800 mb-4 text-sm">Categorii de ajutor</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {HELP_CATEGORIES.map(cat => (
                  <div
                    key={cat.title}
                    onClick={() => setActiveTab('report')}
                    className="border border-gray-100 rounded-xl p-4 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group"
                  >
                    <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-600 transition">
                      <cat.icon className="w-4 h-4 text-blue-600 group-hover:text-white transition" />
                    </div>
                    <h4 className="font-bold text-gray-800 text-sm">{cat.title}</h4>
                    <p className="text-xs text-gray-500 mt-1 mb-2">{cat.desc}</p>
                    <div className="space-y-0.5">
                      {cat.links.map(link => (
                        <p key={link} className="text-xs text-blue-600 flex items-center gap-1">
                          <ChevronRight className="w-3 h-3" />{link}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ REPORT ISSUE ══ */}
          {activeTab === 'report' && (
            <div className="p-6">
              <h3 className="font-bold text-gray-800 mb-1">Raportează o problemă</h3>
              <p className="text-sm text-gray-500 mb-6">Completează formularul și echipa noastră îți va răspunde în 2-4 ore.</p>

              {submitOk && (
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-green-700">Tichetul a fost trimis cu succes!</p>
                    <p className="text-xs text-green-600 mt-0.5">Vei primi o notificare când adminul îți răspunde. Urmărește statusul în „Tichetele Mele".</p>
                  </div>
                </div>
              )}

              {submitErr && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-600">{submitErr}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-1.5">Titlu problemă <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="Ex: Nu am primit plata pentru jobul #123"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-1.5">Categorie <span className="text-red-500">*</span></label>
                    <select
                      value={form.category}
                      onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Selectează categoria</option>
                      {REPORT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-1.5">Severitate <span className="text-red-500">*</span></label>
                    <select
                      value={form.severity}
                      onChange={e => setForm(p => ({ ...p, severity: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Selectează severitatea</option>
                      {SEVERITY_LEVELS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-1.5">Descrie problema <span className="text-red-500">*</span></label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Descrie în detaliu problema întâlnită, când a apărut și ce ai încercat deja…"
                    rows={5}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-1.5">Referință task afectat <span className="text-gray-400 font-normal">(opțional)</span></label>
                  <input
                    type="text"
                    value={form.task_id}
                    onChange={e => setForm(p => ({ ...p, task_id: e.target.value }))}
                    placeholder="Ex: #42 sau UUID-ul complet al task-ului"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Codul (ex: #3F4A2B1) îl găsești pe cardul jobului din Job Pipeline sau Feed Taskuri.</p>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setForm({ category: '', severity: '', title: '', description: '', task_id: '' })}
                    className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm font-medium hover:bg-gray-50 transition"
                  >
                    Resetează
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {submitting ? 'Se trimite…' : 'Trimite Tichetul'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ══ MY TICKETS ══ */}
          {activeTab === 'tickets' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-gray-800">Tichetele Mele</h3>
                <button onClick={loadTickets} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 transition">
                  <RefreshCw className="w-3.5 h-3.5" /> Actualizează
                </button>
              </div>

              {loadingT ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                </div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-14">
                  <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <TicketCheck className="w-7 h-7 text-gray-300" />
                  </div>
                  <h4 className="font-bold text-gray-700 mb-1">Niciun tichet deschis</h4>
                  <p className="text-sm text-gray-400 mb-5">Nu ai trimis nicio cerere de suport încă.</p>
                  <button
                    onClick={() => setActiveTab('report')}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
                  >
                    Deschide un tichet
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {tickets.map(t => (
                    <div key={t.id} className="border border-gray-100 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setOpenTicket(openTicket === t.id ? null : t.id)}
                        className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-semibold text-gray-800 text-sm truncate">{t.title}</span>
                            <StatusBadge status={t.status} />
                            <SeverityBadge value={t.severity} />
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{t.category}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(t.created_at)}</span>
                          </div>
                        </div>
                        {openTicket === t.id
                          ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                      </button>

                      {openTicket === t.id && (
                        <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-4">
                          <div>
                            <p className="text-xs font-bold text-gray-500 mb-1">Descriere</p>
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{t.description}</p>
                          </div>

                          {t.task_id && (
                            <p className="text-xs text-gray-500">Task: <code className="bg-gray-100 px-1 rounded">{t.task_id}</code></p>
                          )}

                          {t.admin_response ? (
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                                  <Shield className="w-3 h-3 text-white" />
                                </div>
                                <p className="text-xs font-bold text-blue-700">Răspuns Admin</p>
                                {t.resolved_at && <span className="text-xs text-blue-400 ml-auto">{formatDate(t.resolved_at)}</span>}
                              </div>
                              <p className="text-sm text-blue-800 leading-relaxed">{t.admin_response}</p>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                              <Clock className="w-3.5 h-3.5" />
                              Se așteaptă răspunsul adminului — vei fi notificat când răspunde.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══ CONTACT ══ */}
          {activeTab === 'contact' && (
            <div className="p-6 space-y-6">
              <div>
                <h3 className="font-bold text-gray-800 mb-1">Contactează-ne</h3>
                <p className="text-sm text-gray-500">Alege metoda de contact preferată.</p>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { icon: MessageCircle, title: 'Chat Live',        desc: 'Disponibil Lun–Vin 9:00–18:00',   val: 'Deschide chat-ul', color: 'blue' },
                  { icon: Phone,         title: 'Telefon',           desc: 'Apelează-ne pentru urgențe',      val: '0800-HANDY-HELP',  color: 'green' },
                  { icon: FileText,      title: 'Email Suport',      desc: 'Răspuns în max 4 ore lucrătoare', val: 'suport@handyconnect.ro', color: 'purple' },
                  { icon: Calendar,      title: 'Programează apel',  desc: 'Alege un slot pentru a fi sunat', val: 'Programează',      color: 'orange' },
                ].map(item => (
                  <div key={item.title} className="border border-gray-100 rounded-xl p-5 flex items-start gap-4">
                    <div className={`w-10 h-10 bg-${item.color}-100 rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <item.icon className={`w-5 h-5 text-${item.color}-600`} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{item.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                      <p className={`text-xs font-semibold text-${item.color}-600 mt-1.5`}>{item.val}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
