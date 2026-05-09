const express   = require('express')
const router    = express.Router()
const upload    = require('../middleware/upload')
const { generateJSON, generateText } = require('../services/gemini')
const { createClient } = require('@supabase/supabase-js')

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_URL // fallback dacă nu există service key
)

// ─── System instruction: expert în construcții ────────────────────────────────
const CONSTRUCTION_EXPERT_SYSTEM = `Ești CONSTRUCTO, un inspector tehnic cu 25 de ani experiență în construcții, renovări și instalații din România.

Specializările tale:
- Structuri: beton, cărămidă, BCA, tencuieli, șapă, hidroizolații
- Finisaje: zugrăveli, gresie, faianță, parchet, tapet, vopsitorie
- Instalații sanitare: țevi, robinete, sifoane, boilere, radiatoare
- Instalații electrice: prize, întrerupătoare, tablouri, circuite
- Tâmplărie: uși, ferestre, parchet, mobilă
- Construcții: fundații, acoperișuri, zidărie, termoizolații

Regulile tale absolute:
1. Descrii EXACT ce vezi în imagine — nu presupui, nu inventezi
2. Identifici TOATE problemele vizibile, nu doar cea mai evidentă
3. Evaluezi gravitatea realistă (nu exagerezi, nu minimizezi)
4. Ești specific: "fisură verticală de 30cm pe peretele nordic" nu "perete deteriorat"
5. Niciodată nu confunzi o problemă de construcții cu una electrică dacă nu există elemente electrice vizibile`

// ─── MODULE 1: Analiză foto → generare task ───────────────────────────────────
router.post('/analyze-task', upload.array('photos', 5), async (req, res) => {
  try {
    const files = req.files ?? []
    const categoriesRaw = req.body.categories ?? '[]'
    const categories = typeof categoriesRaw === 'string'
      ? JSON.parse(categoriesRaw)
      : categoriesRaw

    if (files.length === 0) {
      return res.status(400).json({ error: 'Trebuie cel puțin o fotografie.' })
    }

    const catList = categories.map(c => c.name).join(' | ')

    const prompt = `Analizează cu atenție imaginile atașate și identifică problemele tehnice vizibile.

PASUL 1 — Scanează imaginea complet și listează TOT ce observi defect sau deteriorat:
- Examinează fiecare colț, suprafață, material vizibil
- Notează chiar și problemele minore pe care clientul poate nu le-a observat

PASUL 2 — Identifică PROBLEMA PRINCIPALĂ (cea mai urgentă/importantă) și alege categoria:
Categorii disponibile: ${catList}

Reguli stricte de categorisire:
- Perete crăpat / tencuială / vopsea / zugrăveală → "Zugrăveli & Vopsitorie" sau "Construcții"
- Apă, umezeală, mucegai, robinet, chiuvetă, duș, WC → "Instalații sanitare" sau "Canalizare"
- Priză, cablu, întrerupător, tablou electric, bec, fir → "Instalații Electrice" sau "Tablouri Electrice"
- Parchet, gresie, faianță, podea deteriorată → "Parchet" sau categoria specifică
- Geam, ușă, fereastră → "Tâmplărie"
- Dacă nu ești sigur → "Reparații generale"

PASUL 3 — Generează JSON:
\`\`\`json
{
  "title": "titlu specific al problemei principale (max 60 caractere)",
  "description": "descriere detaliată: ce material/suprafață este afectată, natura exactă a defectului, localizare, extindere aparentă (3-4 propoziții)",
  "category": "EXACT o categorie din lista de mai sus",
  "urgency": "low / normal / high",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "also_detected": ["altă problemă observată în imagine dacă există", "a doua problemă dacă există"]
}
\`\`\`

Câmpul "also_detected" conține probleme SUPLIMENTARE față de cea principală, vizibile în aceeași imagine.
Dacă nu există alte probleme → "also_detected": []
Urgency: high = pericol sau daune în expansiune rapidă, low = estetic sau minor`

    const json = await generateJSON(prompt, files, CONSTRUCTION_EXPERT_SYSTEM)
    res.json({ ok: true, data: json })
  } catch (err) {
    console.error('[AI analyze-task]', err.message)
    res.status(500).json({ error: 'Analiza AI a eșuat. Încearcă din nou.', detail: err.message })
  }
})

// ─── MODULE 2: Estimare buget ─────────────────────────────────────────────────
router.post('/estimate-budget', async (req, res) => {
  try {
    const { title, description, category } = req.body

    if (!title || !description) {
      return res.status(400).json({ error: 'Titlul și descrierea sunt obligatorii.' })
    }

    // Caută oferte similare în platformă pe baza categoriei
    let platformData = []
    let contextPlatforma = ''

    if (category) {
      const { data: offers } = await supabaseAdmin
        .from('task_offers')
        .select('proposed_price, tasks!inner(category_id, categories!inner(name))')
        .eq('tasks.categories.name', category)
        .not('proposed_price', 'is', null)
        .limit(20)

      if (offers?.length > 0) {
        platformData = offers.map(o => ({ price: o.proposed_price }))
        const prices = platformData.map(x => Number(x.price)).filter(p => p > 0)
        if (prices.length > 0) {
          const avg = prices.reduce((s, p) => s + p, 0) / prices.length
          const min = Math.min(...prices)
          const max = Math.max(...prices)
          contextPlatforma = `Date reale din platformă (${prices.length} oferte similare pentru categoria "${category}"): min=${min} RON, max=${max} RON, medie=${Math.round(avg)} RON.`
        }
      }
    }

    const dataSource = platformData.length >= 3 ? 'platform' : 'general'

    const prompt = `Ești un expert în prețuri pentru servicii de mentenanță locuință în România (2025-2026).

Task: "${title}"
Descriere: "${description}"
Categorie: "${category ?? 'necunoscută'}"
${contextPlatforma || 'Nu există date suficiente din platformă pentru această categorie.'}

Estimează un buget realist în RON pentru acest task. Răspunde DOAR cu JSON:
{
  "min_budget": <număr întreg RON>,
  "max_budget": <număr întreg RON>,
  "recommended": <număr întreg RON>,
  "confidence": "${platformData.length >= 3 ? 'high' : platformData.length >= 1 ? 'medium' : 'low'}",
  "reasoning": "explicație scurtă în română (1-2 propoziții)",
  "data_source": "${dataSource}"
}`

    const json = await generateJSON(prompt)
    res.json({ ok: true, data: json })
  } catch (err) {
    console.error('[AI estimate-budget]', err.message)
    res.status(500).json({ error: 'Estimarea AI a eșuat.', detail: err.message })
  }
})

// ─── MODULE 3: Checklist instrumente & materiale ──────────────────────────────
router.post('/generate-checklist', async (req, res) => {
  try {
    const { title, description, category } = req.body

    if (!title) {
      return res.status(400).json({ error: 'Titlul task-ului este obligatoriu.' })
    }

    const prompt = `Ești un handyman expert din România.

Task de executat: "${title}"
Descriere: "${description ?? ''}"
Categorie: "${category ?? ''}"

Generează o listă de pregătire pentru acest task. Răspunde DOAR cu JSON:
{
  "estimated_hours": <număr zecimal, ex: 1.5>,
  "tools": [
    { "name": "Nume unealtă", "checked": false }
  ],
  "materials": [
    { "name": "Nume material", "quantity": 1, "unit": "buc|m|l|kg|rolă", "checked": false }
  ],
  "safety_notes": "nota de siguranță importantă (dacă există, altfel null)"
}

Listează doar uneltele și materialele cu adevărat necesare pentru acest task specific.`

    const json = await generateJSON(prompt)
    res.json({ ok: true, data: json })
  } catch (err) {
    console.error('[AI generate-checklist]', err.message)
    res.status(500).json({ error: 'Generarea checklist-ului a eșuat.', detail: err.message })
  }
})

// ─── MODULE 4: Generator bio profil handyman ──────────────────────────────────
router.post('/generate-bio', async (req, res) => {
  try {
    const { specialties, experience_years, categories, certifications, extra, tone } = req.body

    const prompt = `Ești un copywriter pentru platforma HandyConnect din România.

Scrie un bio profesional pentru un handyman cu profilul:
- Specialități: ${specialties?.join(', ') ?? 'generale'}
- Ani de experiență: ${experience_years ?? 'nespecificat'}
- Categorii de servicii: ${categories?.join(', ') ?? 'diverse'}
- Certificări: ${certifications ?? 'niciuna menționată'}
- Informații suplimentare: ${extra ?? 'niciuna'}
- Ton preferat: ${tone ?? 'profesional'} (opțiuni: profesional / prietenos / direct)

Cerințe bio:
- Scris la persoana I
- 3-5 propoziții în română
- Natural, fără clișee
- Nu mai lung de 250 de cuvinte

Răspunde DOAR cu bio-ul, fără explicații sau ghilimele.`

    const bio = await require('../services/gemini').generateText(prompt)
    res.json({ ok: true, data: { bio: bio.trim() } })
  } catch (err) {
    console.error('[AI generate-bio]', err.message)
    res.status(500).json({ error: 'Generarea bio-ului a eșuat.', detail: err.message })
  }
})

// ─── MODULE 5: Generator descriere serviciu ───────────────────────────────────
router.post('/generate-service-description', async (req, res) => {
  try {
    const { title, category, base_price, price_per_hour, estimated_duration } = req.body

    if (!title) {
      return res.status(400).json({ error: 'Titlul serviciului este obligatoriu.' })
    }

    const prompt = `Ești un copywriter pentru platforma HandyConnect din România.

Scrie o descriere atractivă pentru un serviciu de handyman:
- Titlu serviciu: "${title}"
- Categorie: "${category ?? ''}"
- Preț de bază: ${base_price ? base_price + ' RON' : 'nespecificat'}
- Tarif orar: ${price_per_hour ? price_per_hour + ' RON/h' : 'nespecificat'}
- Durată estimată: "${estimated_duration ?? 'variabilă'}"

Cerințe descriere:
- 2-4 propoziții în română
- Evidențiază beneficiile pentru client
- Menționează ce include serviciul
- Nu mai mult de 150 de cuvinte
- Nu repeta prețul (e deja afișat separat)

Răspunde DOAR cu descrierea, fără explicații.`

    const description = await require('../services/gemini').generateText(prompt)
    res.json({ ok: true, data: { description: description.trim() } })
  } catch (err) {
    console.error('[AI generate-service-description]', err.message)
    res.status(500).json({ error: 'Generarea descrierii a eșuat.', detail: err.message })
  }
})

// ─── MODULE 6: Analiză disputuri (Admin) ─────────────────────────────────────
router.post('/analyze-dispute', upload.array('photos', 10), async (req, res) => {
  try {
    const { task_title, task_description, dispute_reason, job_status } = req.body
    const files = req.files ?? []

    if (!task_title || !dispute_reason) {
      return res.status(400).json({ error: 'Titlul task-ului și motivul disputei sunt obligatorii.' })
    }

    const prompt = `Ești un arbitru imparțial pentru platforma HandyConnect din România.

Analizează această dispută între un client și un handyman:

Task: "${task_title}"
Descriere task original: "${task_description ?? ''}"
Motivul disputei: "${dispute_reason}"
Status job: "${job_status ?? 'necunoscut'}"
${files.length > 0 ? `Fotografii atașate: ${files.length} (analizează-le cu atenție)` : 'Fără fotografii atașate.'}

Pe baza informațiilor disponibile, oferă o analiză imparțială. Răspunde DOAR cu JSON:
{
  "recommendation": "handyman | client | neutral",
  "confidence": <număr 0-100>,
  "reasoning": "raționamentul principal în română (2-3 propoziții)",
  "client_points": ["punct valid al clientului 1", "punct valid 2"],
  "handyman_points": ["punct valid al handymanului 1", "punct valid 2"],
  "suggested_resolution": "rezoluție concretă sugerată în română",
  "disclaimer": "Aceasta este o recomandare AI bazată pe informațiile disponibile. Decizia finală aparține administratorului platformei."
}`

    const json = await generateJSON(prompt, files)
    res.json({ ok: true, data: json })
  } catch (err) {
    console.error('[AI analyze-dispute]', err.message)
    res.status(500).json({ error: 'Analiza disputei a eșuat.', detail: err.message })
  }
})

module.exports = router
