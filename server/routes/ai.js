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

// ─── MODULE 1: Analiză foto + text → generare task ───────────────────────────
router.post('/analyze-task', upload.array('photos', 5), async (req, res) => {
  try {
    const files         = req.files ?? []
    const categoriesRaw = req.body.categories ?? '[]'
    const clientContext = (req.body.client_context ?? '').trim()
    const categories    = typeof categoriesRaw === 'string'
      ? JSON.parse(categoriesRaw)
      : categoriesRaw

    if (files.length === 0 && !clientContext) {
      return res.status(400).json({ error: 'Adaugă cel puțin o fotografie sau o descriere a problemei.' })
    }

    const catList = categories.map(c => c.name).join(' | ')

    const categorizareRules = `Reguli de categorisire — alege categoria care corespunde CEL MAI BINE descrierii clientului:
- Grădină, gazon, iarbă, plante, arbuști, copaci, curte, teren, peisagistică → "Grădinărit"
- Curățenie generală, igienizare spații → "Curățenie"
- Mobilier, raft, dulap, asamblare → "Montaj Mobilă"
- Perete crăpat, tencuială, vopsea, zugrăveală → "Zugrăveli & Vopsitorie" sau "Construcții"
- Apă, umezeală, mucegai, robinet, chiuvetă, duș, WC, țeavă → "Instalații sanitare" sau "Canalizare"
- Priză, cablu, întrerupător, tablou electric, bec, fir → "Instalații Electrice" sau "Tablouri Electrice"
- Parchet, gresie, faianță, podea → "Parchet" sau categoria specifică
- Geam, ușă, fereastră → "Tâmplărie"
- Dacă nu ești sigur → "Reparații generale"`

    const jsonSchema = `\`\`\`json
{
  "title": "titlu specific al lucrării solicitate (max 60 caractere)",
  "description": "descriere clară a lucrării: ce trebuie făcut, suprafața/zona afectată, detalii relevante (3-4 propoziții)",
  "category": "EXACT o categorie din lista disponibilă",
  "urgency": "low / normal / high",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "also_detected": []
}
\`\`\`
Urgency: high = urgent/pericol, normal = standard, low = fără grabă`

    let prompt
    // Folosim system prompt de construcții doar pentru analiză foto pură
    const systemPrompt = (files.length > 0 && !clientContext) ? CONSTRUCTION_EXPERT_SYSTEM : null

    if (files.length > 0 && clientContext) {
      // ── Mod mixt: descrierea clientului are PRIORITATE, pozele oferă detalii vizuale ──
      prompt = `Clientul descrie ce dorește: "${clientContext}"

⚠️ REGULA PRINCIPALĂ: Descrierea clientului are PRIORITATE absolută față de orice se vede în poze.
Dacă clientul spune "grădină" → categoria este "Grădinărit", indiferent de conținutul imaginii.
Dacă clientul spune "zugrăvit" → categoria este zugrăveli, indiferent de imaginea.

Pozele servesc DOAR pentru detalii vizuale suplimentare (dimensiuni aparente, starea terenului, etc.).

Categorii disponibile: ${catList}
${categorizareRules}

Generează un anunț tehnic și clar pe înțelesul unui meșter profesionist:
${jsonSchema}`

    } else if (files.length > 0) {
      // ── Mod foto: doar imagini ─────────────────────────────────────────────
      prompt = `Analizează cu atenție imaginile atașate și identifică ce lucrare este necesară.

Identifică tipul principal de lucrare și alege categoria din: ${catList}
${categorizareRules}

Generează JSON:
${jsonSchema}`

    } else {
      // ── Mod text: doar descrierea clientului ──────────────────────────────
      prompt = `Clientul descrie ce dorește: "${clientContext}"

Transformă această descriere într-un anunț clar și profesionist, pe înțelesul unui meșter.
Nu inventa detalii care nu sunt menționate.

Categorii disponibile: ${catList}
${categorizareRules}

Generează JSON:
${jsonSchema}`
    }

    const json = await generateJSON(prompt, files, systemPrompt)
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

    const priceCtx   = base_price     ? `Preț de bază: ${base_price} RON` : null
    const hourlyCtx  = price_per_hour ? `Tarif orar: ${price_per_hour} RON/h` : null
    const durCtx     = estimated_duration ? `Durată estimată: ${estimated_duration}` : null
    const ctxParts   = [priceCtx, hourlyCtx, durCtx].filter(Boolean).join(' | ')

    const prompt = `Ești un meșter profesionist din România care listează un serviciu pe platforma HandyConnect.

Serviciu: "${title}"
Categorie: "${category ?? ''}"
${ctxParts ? `Context: ${ctxParts}` : ''}

Scrie o descriere PROFESIONALĂ și SPECIFICĂ a acestui serviciu. Regulile sunt stricte:
- Descrie CE FACE CONCRET meșterul: pașii de lucru, metoda, materialele/uneltele implicate
- Specifică ce INCLUDE serviciul (ex: evaluare inițială, curățenie după lucru, garanție etc.)
- Limbaj direct și tehnic — FĂRĂ clișee de marketing ("expert", "calitate superioară", "profesionalism")
- NU repeta titlul ca primă propoziție
- Maxim 100 de cuvinte, 2-3 propoziții

Generează un JSON cu câmpurile de mai jos. Pentru câmpurile de preț și durată, propune valori DOAR dacă nu sunt deja specificate în context — altfel pune null.
\`\`\`json
{
  "description": "descrierea serviciului",
  "keywords": ["3-5 cuvinte cheie tehnice relevante pentru serviciu"],
  "suggested_duration": ${estimated_duration ? 'null' : '"durată potrivită pentru serviciu, ex: 1-2 ore"'},
  "suggested_base_price": ${base_price ? 'null' : 'număr RON realist pentru serviciu sau null dacă nu știi'}
}
\`\`\``

    const { generateJSON: genJSON } = require('../services/gemini')
    const data = await genJSON(prompt, [], null)
    res.json({ ok: true, data })
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

// ─── MODULE 7: Estimare durată task cu AI ────────────────────────────────────
router.post('/estimate-duration', upload.array('photos', 5), async (req, res) => {
  try {
    const { title = '', description = '', category = '' } = req.body
    const files = req.files ?? []

    const prompt = `Ești un asistent expert pentru meșteri din România. Analizează descrierea${files.length ? ' și pozele' : ''} acestei lucrări și estimează durata realistă de execuție.

Categorie: ${category}
Titlu: ${title}
Descriere: ${description}

Returnează DOAR un JSON valid cu această structură exactă:
{
  "duration_minutes": <număr întreg, multiplu de 15, minim 15, maxim 1440>,
  "reason": "<justificare scurtă în română, max 2 propoziții>"
}

Reguli:
- duration_minutes trebuie să fie multiplu de 15 (ex: 30, 45, 60, 90, 120, 180...)
- Fii realist: nu subestima și nu supraestima
- Ia în calcul deplasarea, pregătirea și curățenia după lucru`

    const json = await generateJSON(prompt, files)

    // Validare și normalizare
    let mins = parseInt(json?.duration_minutes)
    if (!mins || mins < 15) mins = 60
    mins = Math.round(mins / 15) * 15  // snapă la multiplu de 15

    res.json({ ok: true, data: { duration_minutes: mins, reason: json?.reason ?? '' } })
  } catch (err) {
    console.error('[AI estimate-duration]', err.message)
    res.status(500).json({ error: 'Estimarea duratei a eșuat.', detail: err.message })
  }
})

module.exports = router
