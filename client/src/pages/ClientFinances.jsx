import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabase'
import DashboardNavbar from '../components/dashboard/DashboardNavbar'
import {
  TrendingUp, Receipt, CreditCard, Calendar, FileText,
  AlertTriangle, CheckCircle, X, Printer, Building2, User,
  ChevronRight, ArrowUpRight, Wallet, BarChart2
} from 'lucide-react'

export default function ClientFinances() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [cards, setCards] = useState([])
  const [transactions, setTransactions] = useState([])
  const [filterPeriod, setFilterPeriod] = useState('all')
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [selectedTx, setSelectedTx] = useState(null)
  const [invoiceType, setInvoiceType] = useState('individual')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/login'); return }

    const [{ data: profileData }, { data: cardsData }, { data: tasksData }, { data: bookingsData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('client_cards').select('*').eq('user_id', user.id).order('is_primary', { ascending: false }),
      supabase.from('tasks')
        .select('id, title, final_price, status, updated_at, created_at, handyman:handyman_id(first_name,last_name), category:category_id(name)')
        .eq('client_id', user.id).eq('status', 'completed').not('final_price', 'is', null)
        .order('updated_at', { ascending: false }),
      supabase.from('bookings')
        .select('id, total, subtotal, service_fee, status, payment_method, completed_at, scheduled_date, created_at, handyman:handyman_id(first_name,last_name), service:service_id(title)')
        .eq('client_id', user.id).eq('status', 'completed')
        .order('completed_at', { ascending: false }),
    ])

    setProfile(profileData)
    setCards(cardsData || [])

    const taskTxs = (tasksData || []).map(t => ({
      id: t.id, type: 'task',
      title: t.title || 'Task',
      category: t.category?.name || 'Serviciu',
      handyman: t.handyman ? `${t.handyman.first_name} ${t.handyman.last_name}` : 'Meșter',
      amount: Number(t.final_price),
      date: t.updated_at || t.created_at,
      payment_method: null,
    }))

    const bookingTxs = (bookingsData || []).map(b => ({
      id: b.id, type: 'booking',
      title: b.service?.title || 'Rezervare',
      category: 'Serviciu rezervat',
      handyman: b.handyman ? `${b.handyman.first_name} ${b.handyman.last_name}` : 'Meșter',
      amount: Number(b.total || 0),
      subtotal: Number(b.subtotal || b.total || 0),
      service_fee: Number(b.service_fee || 0),
      date: b.completed_at || b.scheduled_date || b.created_at,
      payment_method: b.payment_method,
    }))

    setTransactions([...taskTxs, ...bookingTxs].sort((a, b) => new Date(b.date) - new Date(a.date)))
    setLoading(false)
  }

  // ─── Filtered transactions ────────────────────────────────────────────────
  const filteredTxs = transactions.filter(tx => {
    if (filterPeriod === 'all') return true
    const months = { '1m': 1, '3m': 3, '6m': 6, '1y': 12 }[filterPeriod]
    return new Date(tx.date) >= new Date(new Date().setMonth(new Date().getMonth() - months))
  })

  // ─── Stats ────────────────────────────────────────────────────────────────
  const totalSpent = filteredTxs.reduce((s, t) => s + t.amount, 0)
  const now = new Date()
  const thisMonth = transactions
    .filter(t => { const d = new Date(t.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() })
    .reduce((s, t) => s + t.amount, 0)
  const avgPerTx = filteredTxs.length ? totalSpent / filteredTxs.length : 0

  // ─── Monthly chart (last 6 months) ────────────────────────────────────────
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const label = d.toLocaleDateString('ro-RO', { month: 'short' })
    const total = transactions
      .filter(t => { const td = new Date(t.date); return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear() })
      .reduce((s, t) => s + t.amount, 0)
    return { label, total }
  })
  const maxMonthly = Math.max(...monthlyData.map(m => m.total), 1)

  // ─── Payment display ──────────────────────────────────────────────────────
  const getPaymentDisplay = (tx) => {
    if (!tx.payment_method && tx.type === 'task') return { text: 'Platformă HandyConnect', icon: null, isCard: false }
    if (!tx.payment_method) return { text: 'Nespecificat', icon: null, isCard: false }
    if (tx.payment_method === 'cash') return { text: 'Numerar', icon: null, isCard: false }
    if (tx.payment_method === 'bank_transfer') return { text: 'Transfer bancar', icon: null, isCard: false }

    // card payment
    const matchedCard = cards.find(c =>
      tx.payment_method.includes(c.last4) || tx.payment_method === 'card'
    )
    if (matchedCard) {
      const type = matchedCard.card_type === 'visa' ? 'VISA' : matchedCard.card_type === 'mastercard' ? 'Mastercard' : 'Card'
      return { text: `${type} ****${matchedCard.last4}`, icon: matchedCard.card_type, isCard: true, card: matchedCard }
    }
    if (tx.payment_method === 'card' && cards.length === 0) {
      return { text: 'Card (nesalvat în cont)', icon: null, isCard: true, missingCard: true }
    }
    return { text: 'Card online', icon: null, isCard: true }
  }

  // ─── Invoice helpers ──────────────────────────────────────────────────────
  const getBillingData = () => {
    const bd = profile?.billing_details || {}
    return invoiceType === 'individual' ? (bd.individual || {}) : (bd.company || {})
  }

  const getMissingFields = () => {
    const d = getBillingData()
    if (invoiceType === 'individual') {
      return [!d.full_name && 'Nume complet', !d.address && 'Adresă facturare'].filter(Boolean)
    }
    return [!d.company_name && 'Denumire Firmă', !d.cui && 'CUI', !d.address && 'Adresă sediu'].filter(Boolean)
  }

  const openInvoiceModal = (tx) => {
    setSelectedTx(tx)
    const bd = profile?.billing_details || {}
    setInvoiceType(bd.type || 'individual')
    setShowInvoiceModal(true)
  }

  const printInvoice = () => {
    const tx = selectedTx
    const bd = getBillingData()
    const d = new Date(tx.date)
    const invoiceNo = `HC-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-${tx.id.slice(0, 6).toUpperCase()}`
    const dateStr = d.toLocaleDateString('ro-RO')
    const tva = (tx.amount * 0.21 / 1.21).toFixed(2)
    const subtotalVal = (tx.amount / 1.21).toFixed(2)
    const payment = getPaymentDisplay(tx)

    const clientBlock = invoiceType === 'individual'
      ? `<p><strong>${bd.full_name}</strong></p>${bd.cnp ? `<p>CNP: ${bd.cnp}</p>` : ''}<p>${bd.address}</p>`
      : `<p><strong>${bd.company_name}</strong></p><p>CUI: ${bd.cui}</p><p>${bd.address}</p>${bd.reg_commerce ? `<p>Reg. Com.: ${bd.reg_commerce}</p>` : ''}${bd.iban ? `<p>IBAN: ${bd.iban}</p>` : ''}${bd.bank ? `<p>Bancă: ${bd.bank}</p>` : ''}`

    const paymentBlock = payment.isCard && payment.card
      ? `Plată online prin platformă HandyConnect — <strong>${payment.text}</strong>`
      : payment.text === 'Numerar' ? 'Numerar la finalizarea serviciului'
      : payment.text === 'Transfer bancar' ? 'Transfer bancar'
      : 'Platformă HandyConnect'

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Factură ${invoiceNo}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;font-size:13px;color:#1a1a1a;padding:40px;max-width:800px;margin:0 auto}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;border-bottom:3px solid #2563eb;padding-bottom:18px}
.logo{font-size:22px;font-weight:800;color:#2563eb}.logo span{color:#1a1a1a}
.inv-title h1{font-size:30px;font-weight:800;color:#2563eb;text-align:right}
.inv-title p{color:#666;font-size:12px;text-align:right;margin-top:3px}
.parties{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-bottom:24px;background:#f8faff;border-radius:10px;padding:18px}
.party h3{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#2563eb;margin-bottom:8px;font-weight:700}
.party p{margin-bottom:3px;line-height:1.5}
table{width:100%;border-collapse:collapse;margin-bottom:20px}
th{background:#eff6ff;padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#374151;border-bottom:2px solid #bfdbfe}
td{padding:12px;border-bottom:1px solid #f3f4f6;vertical-align:top}
.totals-wrap{display:flex;justify-content:flex-end;margin-bottom:20px}
.totals{width:300px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden}
.totals tr td{padding:8px 14px;border-bottom:1px solid #f3f4f6}
.totals tr:last-child td{font-weight:700;font-size:15px;background:#eff6ff;color:#2563eb;border:none;padding:12px 14px}
.pay-box{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px;margin-bottom:20px}
.pay-box h3{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#16a34a;margin-bottom:6px}
.footer{text-align:center;color:#9ca3af;font-size:11px;border-top:1px solid #e5e7eb;padding-top:14px;margin-top:4px}
@media print{body{padding:20px}}
</style></head><body>
<div class="header">
  <div><div class="logo">Handy<span>Connect</span></div><p style="color:#666;font-size:12px;margin-top:4px">Platformă servicii la domiciliu</p></div>
  <div class="inv-title"><h1>FACTURĂ</h1><p>Nr. ${invoiceNo}</p><p>Data emiterii: ${dateStr}</p></div>
</div>
<div class="parties">
  <div class="party"><h3>Prestator Servicii</h3><p><strong>${tx.handyman}</strong></p><p>Prin intermediul platformei HandyConnect</p></div>
  <div class="party"><h3>Beneficiar — ${invoiceType === 'individual' ? 'Persoană Fizică' : 'Persoană Juridică'}</h3>${clientBlock}</div>
</div>
<table>
  <thead><tr><th>Descriere serviciu</th><th>U.M.</th><th style="text-align:right">Preț fără TVA</th><th style="text-align:right">TVA 21%</th><th style="text-align:right">Total</th></tr></thead>
  <tbody>
    <tr>
      <td><strong>${tx.title}</strong><br><span style="color:#6b7280;font-size:12px">${tx.category} · Finalizat ${dateStr}</span></td>
      <td>buc</td>
      <td style="text-align:right">${subtotalVal} RON</td>
      <td style="text-align:right">${tva} RON</td>
      <td style="text-align:right"><strong>${tx.amount.toFixed(2)} RON</strong></td>
    </tr>
  </tbody>
</table>
<div class="totals-wrap"><table class="totals"><tr><td>Subtotal</td><td style="text-align:right">${subtotalVal} RON</td></tr><tr><td>TVA (19%)</td><td style="text-align:right">${tva} RON</td></tr><tr><td>TOTAL DE PLATĂ</td><td style="text-align:right">${tx.amount.toFixed(2)} RON</td></tr></table></div>
<div class="pay-box"><h3>Metodă de Plată</h3><p>${paymentBlock}</p></div>
<div class="footer"><p>Document generat automat de HandyConnect · ${new Date().toLocaleDateString('ro-RO')}</p><p style="margin-top:4px">Acest document confirmă prestarea serviciului și are valoare informativă.</p></div>
<script>window.onload=()=>window.print()</script>
</body></html>`

    const w = window.open('', '_blank', 'width=900,height=750')
    w.document.write(html)
    w.document.close()
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavbar />
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavbar />

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Finanțele Mele</h1>
          <p className="text-sm text-gray-500 mt-1">Istoricul plăților și facturile tale</p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Wallet,      color: 'blue',   label: 'Total cheltuit',     value: `${totalSpent.toLocaleString('ro-RO', { minimumFractionDigits: 0 })} RON` },
            { icon: Calendar,    color: 'green',  label: 'Luna aceasta',        value: `${thisMonth.toLocaleString('ro-RO', { minimumFractionDigits: 0 })} RON` },
            { icon: Receipt,     color: 'purple', label: 'Tranzacții',          value: filteredTxs.length },
            { icon: TrendingUp,  color: 'orange', label: 'Medie per lucrare',   value: `${avgPerTx.toLocaleString('ro-RO', { maximumFractionDigits: 0 })} RON` },
          ].map(({ icon: Icon, color, label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3
                ${color === 'blue' ? 'bg-blue-100' : color === 'green' ? 'bg-green-100' : color === 'purple' ? 'bg-purple-100' : 'bg-orange-100'}`}>
                <Icon className={`w-5 h-5 ${color === 'blue' ? 'text-blue-600' : color === 'green' ? 'text-green-600' : color === 'purple' ? 'text-purple-600' : 'text-orange-500'}`} />
              </div>
              <p className="text-2xl font-bold text-gray-800">{value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-blue-600" />
              <h2 className="font-bold text-gray-800">Cheltuieli lunare</h2>
            </div>
            <p className="text-xs text-gray-400">Ultimele 6 luni</p>
          </div>
          <div className="flex items-end gap-3 h-40">
            {monthlyData.map((m, i) => {
              const heightPct = maxMonthly > 0 ? (m.total / maxMonthly) * 100 : 0
              const isCurrentMonth = i === 5
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex items-end justify-center" style={{ height: '120px' }}>
                    <div
                      className={`w-full rounded-t-lg transition-all ${isCurrentMonth ? 'bg-blue-600' : 'bg-blue-200'}`}
                      style={{ height: `${Math.max(heightPct, m.total > 0 ? 4 : 0)}%` }}
                      title={`${m.total.toLocaleString('ro-RO')} RON`}
                    />
                  </div>
                  <span className="text-xs text-gray-500 font-medium">{m.label}</span>
                  {m.total > 0 && (
                    <span className="text-xs text-gray-400">{m.total.toLocaleString('ro-RO')} RON</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-gray-100">
            <h2 className="font-bold text-gray-800">Tranzacții</h2>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {[['all', 'Toate'], ['1m', '1L'], ['3m', '3L'], ['6m', '6L'], ['1y', '1A']].map(([val, lbl]) => (
                <button key={val} onClick={() => setFilterPeriod(val)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition
                    ${filterPeriod === val ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {filteredTxs.length === 0 ? (
            <div className="py-16 text-center">
              <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Nicio tranzacție în această perioadă</p>
              <p className="text-sm text-gray-400 mt-1">Tranzacțiile apar după finalizarea taskurilor sau rezervărilor</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filteredTxs.map((tx) => {
                const payment = getPaymentDisplay(tx)
                return (
                  <div key={tx.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                      ${tx.type === 'task' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                      {tx.type === 'task'
                        ? <FileText className="w-5 h-5 text-blue-600" />
                        : <Calendar className="w-5 h-5 text-purple-600" />}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{tx.title}</p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                        <span className="text-sm text-gray-500">{tx.handyman}</span>
                        <span className="text-gray-300">·</span>
                        <span className="text-xs text-gray-400">{new Date(tx.date).toLocaleDateString('ro-RO')}</span>
                        <span className="text-gray-300">·</span>
                        {/* Payment method */}
                        {payment.missingCard ? (
                          <span className="flex items-center gap-1 text-xs text-red-500">
                            <AlertTriangle className="w-3 h-3" /> Card nesalvat în cont
                          </span>
                        ) : (
                          <span className={`flex items-center gap-1 text-xs ${payment.isCard ? 'text-blue-600' : 'text-gray-500'}`}>
                            {payment.isCard && <CreditCard className="w-3 h-3" />}
                            {payment.text}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Amount + action */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <p className="font-bold text-gray-800 text-right">
                        {tx.amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                      </p>
                      <button onClick={() => openInvoiceModal(tx)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-lg hover:bg-blue-100 transition">
                        <FileText className="w-3.5 h-3.5" /> Factură
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Invoice Modal */}
      {showInvoiceModal && selectedTx && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => setShowInvoiceModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Emite Factură</h3>
                <p className="text-sm text-gray-500 mt-0.5 truncate max-w-xs">{selectedTx.title}</p>
              </div>
              <button onClick={() => setShowInvoiceModal(false)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Toggle PF / PJ */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Emite ca:</p>
                <div className="flex bg-gray-100 rounded-xl p-1">
                  <button onClick={() => setInvoiceType('individual')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition
                      ${invoiceType === 'individual' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    <User className="w-4 h-4" /> Persoană Fizică
                  </button>
                  <button onClick={() => setInvoiceType('company')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition
                      ${invoiceType === 'company' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    <Building2 className="w-4 h-4" /> Persoană Juridică
                  </button>
                </div>
              </div>

              {/* Validation */}
              {(() => {
                const missing = getMissingFields()
                if (missing.length > 0) return (
                  <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-700">Date de facturare incomplete</p>
                      <p className="text-xs text-red-600 mt-1">Lipsesc: <strong>{missing.join(', ')}</strong></p>
                      <Link to="/profile" state={{ section: 'billing' }} onClick={() => setShowInvoiceModal(false)}
                        className="inline-flex items-center gap-1 text-xs text-red-600 font-medium hover:underline mt-2">
                        Completează în Profil <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                )
                // Show filled data preview
                const bd = getBillingData()
                return (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl space-y-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <p className="text-sm font-medium text-green-700">Date complete</p>
                    </div>
                    {invoiceType === 'individual' ? (
                      <>
                        <p className="text-xs text-gray-600"><span className="font-medium">Nume:</span> {bd.full_name}</p>
                        {bd.cnp && <p className="text-xs text-gray-600"><span className="font-medium">CNP:</span> {bd.cnp}</p>}
                        <p className="text-xs text-gray-600"><span className="font-medium">Adresă:</span> {bd.address}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-gray-600"><span className="font-medium">Firmă:</span> {bd.company_name}</p>
                        <p className="text-xs text-gray-600"><span className="font-medium">CUI:</span> {bd.cui}</p>
                        <p className="text-xs text-gray-600"><span className="font-medium">Adresă:</span> {bd.address}</p>
                        {bd.iban && <p className="text-xs text-gray-600"><span className="font-medium">IBAN:</span> {bd.iban}</p>}
                      </>
                    )}
                  </div>
                )
              })()}

              {/* Payment info on invoice */}
              {(() => {
                const payment = getPaymentDisplay(selectedTx)
                if (payment.missingCard) return (
                  <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-700">Card nesalvat în cont</p>
                      <p className="text-xs text-amber-600 mt-1">Tranzacția a fost plătită cu cardul, dar cardul nu este salvat în platforma ta. Adaugă cardul din <Link to="/profile" state={{ section: 'cards' }} onClick={() => setShowInvoiceModal(false)} className="underline font-medium">Profil → Cardurile Mele</Link> pentru a-l afișa pe factură.</p>
                    </div>
                  </div>
                )
                return (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 mb-1">Metodă de plată pe factură</p>
                    <div className="flex items-center gap-2">
                      {payment.isCard && <CreditCard className="w-4 h-4 text-blue-600" />}
                      <p className="text-sm font-medium text-gray-700">{payment.text}</p>
                    </div>
                  </div>
                )
              })()}

              {/* Amount summary */}
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                <p className="text-sm text-gray-600">Total facturat</p>
                <p className="text-xl font-bold text-blue-600">
                  {selectedTx.amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setShowInvoiceModal(false)}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
                Anulează
              </button>
              <button
                disabled={getMissingFields().length > 0}
                onClick={printInvoice}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed">
                <Printer className="w-4 h-4" /> Generează și Printează
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
