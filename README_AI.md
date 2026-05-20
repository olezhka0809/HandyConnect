# HandyConnect — Plan de Integrare AI

## Prezentare generală

Integrarea AI în HandyConnect folosește **Google Gemini 2.5 Flash** pentru funcționalități inteligente adresate celor 3 tipuri de utilizatori: **Client**, **Handyman** și **Admin**.

```
Arhitectură:
Browser → Vite Dev Server (proxy /api) → Express Server (port 5000) → Gemini API
                                               ↕
                                          Supabase DB
```

Toate apelurile AI trec prin serverul Express — cheia API nu ajunge niciodată în browser.

---

## Infrastructură tehnică

### Packageuri instalate
| Pachet | Locație | Scop |
|--------|---------|------|
| `@google/generative-ai` | `server/` | Client Gemini API (neutilizat direct — folosim fetch v1) |
| `multer` | `server/` | Upload imagini în memorie pentru analiză vision |
| `@supabase/supabase-js` | `server/` | Query DB din server (estimare buget) |

### Variabile de mediu
`server/.env`:
```
GEMINI_API_KEY=AQ.Ab8RN...     # Cheia Google AI Studio (gratuit)
SUPABASE_URL=https://rfsombznaebjvfufxffc.supabase.co
PORT=5000
```

`client/.env`:
```
VITE_API_URL=                  # Gol — Vite proxy redirecționează /api → localhost:5000
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

### Vite Proxy (rezolvă problema Codespaces)
În `client/vite.config.js`:
```javascript
server: {
  proxy: {
    '/api': { target: 'http://localhost:5000', changeOrigin: true }
  }
}
```
Fără proxy, browserul din Codespaces nu poate accesa direct `localhost:5000` (containerul e remote). Cu proxy, Vite forwardează intern `/api/*` → `http://localhost:5000/api/*`, fără să treacă prin browser.

### Supabase MCP (configurat)
- Fișier: `.mcp.json` (project root)
- Permite Claude Code să interogeze/modifice DB-ul Supabase direct
- Activat via `enableAllProjectMcpServers: true` în `.claude/settings.local.json`

---

## Tehnici AI Implementate

### 1. System Instruction — Personalitate Expert Persistentă

**Fișier:** `server/routes/ai.js` — constanta `CONSTRUCTION_EXPERT_SYSTEM`

**Ce este:** Echivalentul unui „skill" sau „system prompt" persistent — instrucțiuni date modelului AI **înainte** de orice cerere a utilizatorului. Modelul „intră în rol" și rămâne în el pe toată durata conversației.

**Cum funcționează tehnic:**
```javascript
// Gemini API v1 — câmpul system_instruction în request body
{
  "system_instruction": {
    "parts": [{ "text": "Tu ești CONSTRUCTO, un inspector tehnic cu 25 ani experiență..." }]
  },
  "contents": [{ "parts": [{ "text": "promptul utilizatorului..." }] }]
}
```
Spre deosebire de a pune totul în promptul utilizatorului, `system_instruction` are prioritate mai mare în procesarea modelului și nu poate fi „suprascris" de conținutul imaginii sau textului utilizatorului.

**Conținutul identității CONSTRUCTO:**
- Specializări explicite: structuri, finisaje, instalații sanitare, electrice, tâmplărie
- Reguli absolute de comportament (nu presupune, nu inventează, e specific)
- Formatare specifică: „fisură verticală de 30cm pe peretele nordic" nu „perete deteriorat"

**Beneficiu practic:** Fără system instruction, modelul generic ghicea categoria (ex: tencuiala → electricitate). Cu CONSTRUCTO, aplică cunoștințe de specialitate reale și regulile de categorisire sunt respectate.

---

### 2. Detectare Probleme Multiple — `also_detected`

**Fișier:** `server/routes/ai.js` (Modulul 1) + `client/src/pages/PostTask.jsx`

**Problema rezolvată:** Un client fotografiază o problemă dar în imagine pot fi vizibile și alte defecte pe care nu le observă (ex: fotografiezi un robinet stricat dar în fundal e mucegai pe perete și o gresie crăpată).

**Cum funcționează:**

Promptul cere explicit AI-ului să **scaneze toată imaginea** și să returneze două tipuri de probleme:

```json
{
  "title": "Robinet bucătărie — scurgere",
  "description": "...",
  "category": "Instalații sanitare",
  "urgency": "normal",
  "keywords": ["robinet", "scurgere"],
  "also_detected": [
    "Mucegai în colțul stâng al peretelui",
    "Gresie crăpată sub chiuvetă"
  ]
}
```

**Flux UI:**
1. Problema principală completează automat formularul
2. Problemele adiționale apar într-un **panel portocaliu** cu avertisment
3. Fiecare problemă adițională are butonul **„+ Adaugă"** care o append-ează la câmpul Descriere
4. Clientul decide ce include și ce ignoră

**De ce e important:** Clientul poate să nu fie conștient de toate problemele. AI-ul joacă rolul unui inspector care verifică tot cadrul, nu doar subiectul principal al fotografiei.

---

### 3. Prompt Engineering — Structura în 3 Pași

**Fișier:** `server/routes/ai.js` (toate modulele)

**Principiu:** În loc să dai un prompt vag („analizează și generează"), structurezi răspunsul AI în pași expliciți. Modelul este obligat să parcurgă un proces logic înainte de a genera output-ul final.

**Pattern folosit:**
```
PASUL 1 — Analizează (descrie ce observi)
PASUL 2 — Raționează (aplică reguli de categorisire)  
PASUL 3 — Generează (output-ul structurat JSON)
```

**De ce funcționează:** Modelele LLM sunt mai precise când „gândesc cu voce tare" (Chain of Thought). Forțând pasul de descriere vizuală înainte de categorisire, modelul nu mai poate „sări" direct la o categorie greșită bazată pe pattern matching superficial.

**Reguli negative explicite** (important pentru acuratețe):
```
- NICIODATĂ nu alege "Electricitate" dacă nu există clar elemente electrice în imagine
- Dacă nu ești sigur → "Reparații generale"
```

---

### 4. Retry cu Fallback pe Modele

**Fișier:** `server/services/gemini.js` — funcția `callGemini()`

Gemini 2.5 Flash are uneori perioade de „high demand" (supraîncărcare). Serviciul încearcă automat pe mai multe modele:

```
gemini-2.5-flash → dacă eșuează (429/503) → gemini-2.5-flash-lite → retry
```

```javascript
const MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-flash']

async function callGemini(parts, systemInstruction = null) {
  for (const model of MODELS) {
    try {
      return await callGeminiWithModel(model, parts, systemInstruction)
    } catch (e) {
      if (!isRetryable(e)) throw e  // eroare permanentă → oprește
      // altfel încearcă modelul următor
    }
  }
}
```

---

### 5. API v1 Direct (fără SDK)

**Fișier:** `server/services/gemini.js`

**Motivul:** SDK-ul `@google/generative-ai` folosea endpoint-ul `v1beta` care, pentru acest proiect Google Cloud, returna quota 0. Endpoint-ul `v1` cu modelele `gemini-2.5-*` funcționează corect.

```javascript
// Nu folosim SDK — apelăm direct REST API v1
const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`
const body = {
  system_instruction: { parts: [{ text: systemInstruction }] },  // dacă există
  contents: [{ parts }]  // imagini (base64) + text
}
```

**Vision (imagini):** Imaginile sunt trimise ca `inlineData` cu `base64` + `mimeType`. Gemini 2.5 Flash suportă nativ analiza de imagini (multimodal).

---

## MODULE AI — Detalii complete

---

### MODULUL 1 — CLIENT: Analiză foto → Generare task automat
**Fișier frontend:** `client/src/pages/PostTask.jsx`
**Endpoint server:** `POST /api/ai/analyze-task`

#### Flux utilizator
1. Clientul încarcă 1–5 fotografii ale problemei tehnice
2. Apare butonul **„Analizează cu AI ✨"** (condiționat — apare doar după upload)
3. AI (cu identitatea CONSTRUCTO) analizează imaginile și returnează:
   - `title` — titlu concis și specific bazat pe ce se vede
   - `description` — descriere detaliată a problemei (suprafață, natură defect, localizare)
   - `category` — categoria exactă din DB (selectată pe baza regulilor de categorisire)
   - `urgency` — `low` / `normal` / `high`
   - `keywords` — cuvinte cheie relevante
   - `also_detected` — **alte probleme vizibile** în imagine (nou — vezi Tehnici AI)
4. Câmpurile formularului se populează automat (editabile)
5. Problemele adiționale apar în panel portocaliu cu opțiunea de a le adăuga la descriere

#### Implementare server (reală)
```javascript
// server/routes/ai.js

const CONSTRUCTION_EXPERT_SYSTEM = `Ești CONSTRUCTO, un inspector tehnic cu 25 ani experiență...`

router.post('/analyze-task', upload.array('photos', 5), async (req, res) => {
  const catList = categories.map(c => c.name).join(' | ')

  const prompt = `Analizează imaginile și identifică problemele tehnice.
  PASUL 1 — Scanează vizual tot ce e defect/deteriorat
  PASUL 2 — Alege categoria: ${catList}
             Reguli: perete/tencuiala → Zugrăveli, apă → Sanitare, priză → Electrice
  PASUL 3 — Generează JSON cu: title, description, category, urgency, keywords, also_detected`

  // Imaginile sunt trimise ca inlineData base64 + system instruction expert
  const json = await generateJSON(prompt, req.files, CONSTRUCTION_EXPERT_SYSTEM)
  res.json({ ok: true, data: json })
})
```

#### Mapare urgency (AI → Form)
| AI returnează | Form folosește | Afișat ca |
|--------------|---------------|-----------|
| `low` | `normal` | Normal |
| `normal` | `urgent` | Urgență medie |
| `high` | `emergency` | Urgență critică |

#### Schimbări DB aplicate
```sql
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC(3,2);
```

---

### MODULUL 2 — CLIENT: Estimare buget inteligent
**Fișier frontend:** `client/src/pages/PostTask.jsx` (Step buget)
**Endpoint server:** `POST /api/ai/estimate-budget`

#### Flux utilizator
1. Clientul a completat titlul + descrierea task-ului
2. Apasă **„Estimează bugetul cu AI"**
3. Serverul interoghează DB-ul pentru task-uri/oferte similare (prin Supabase)
4. AI analizează datele platformei + cunoștințe generale și returnează:
   - `min_budget` — limita inferioară RON
   - `max_budget` — limita superioară RON
   - `recommended` — valoarea recomandată RON
   - `confidence` — `high` / `medium` / `low`
   - `reasoning` — explicație scurtă (1-2 propoziții)
   - `data_source` — `platform` / `general` / `insufficient`
5. Clientul vede range-ul și îl poate accepta sau modifica

#### Logica de date
```
IF task_offers similare în DB >= 5:
  → folosește media/mediana prețurilor din platformă
  → confidence = 'high'
ELIF task_offers similare >= 2:
  → combină date platformă + AI
  → confidence = 'medium'  
ELSE:
  → AI folosește cunoștințe generale pentru România
  → confidence = 'low', afișează mesaj explicativ
```

#### Schimbări DB necesare
Niciuna — interogăm `task_offers` și `bookings` existente.

---

### MODULUL 3 — HANDYMAN: Checklist instrumente & materiale
**Fișier frontend:** `client/src/components/handyman-dashboard/TaskDetailModal.jsx`
**Endpoint server:** `POST /api/ai/generate-checklist`

#### Flux utilizator
1. Handymanul deschide un task acceptat/în progres
2. Vede tab nou **„Lista AI"** (lângă Detalii, Oferte, etc.)
3. Prima dată când intră în tab: buton **„Generează Lista cu AI ✨"**
4. AI returnează:
   ```json
   {
     "estimated_hours": 2.5,
     "tools": [
       { "name": "Cheie franceză", "checked": false },
       { "name": "Multimetru", "checked": false }
     ],
     "materials": [
       { "name": "Teflon", "quantity": 1, "unit": "rolă", "checked": false },
       { "name": "Robinet 1/2\"", "quantity": 1, "unit": "buc", "checked": false }
     ],
     "safety_notes": "Închide apa de la robinet principal înainte de intervenție."
   }
   ```
5. Lista apare ca checklist interactiv (bifabil)
6. Handymanul poate adăuga/elimina itemi manual
7. Lista se salvează în DB (persistentă între sesiuni)

#### Schimbări DB necesare
```sql
CREATE TABLE IF NOT EXISTS task_ai_checklists (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  handyman_id   UUID NOT NULL REFERENCES handyman_profiles(user_id),
  estimated_hours NUMERIC(4,1),
  tools         JSONB DEFAULT '[]',      -- [{name, checked}]
  materials     JSONB DEFAULT '[]',      -- [{name, quantity, unit, checked}]
  safety_notes  TEXT,
  generated_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, handyman_id)
);

-- RLS
ALTER TABLE task_ai_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "handyman_own_checklist" ON task_ai_checklists
  FOR ALL USING (auth.uid() = handyman_id);
CREATE POLICY "client_read_checklist" ON task_ai_checklists
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM tasks WHERE id = task_id AND client_id = auth.uid())
  );
```

---

### MODULUL 4 — HANDYMAN: Generator bio profil
**Fișier frontend:** `client/src/pages/HandymanPersonalProfile.jsx`
**Endpoint server:** `POST /api/ai/generate-bio`

#### Flux utilizator
1. Handymanul este în secțiunea **Profil Personal → Bio**
2. Apasă **„Ajutor AI — Generează bio"** (buton mic lângă textarea)
3. Se deschide un mini-modal cu 2 câmpuri opționale:
   - „Ce vrei să evidențiezi?" (textarea liberă)
   - „Ton preferat": Profesional / Prietenos / Direct
4. AI generează bio-ul pe baza:
   - Specialitățile handymanului (din profil)
   - Ani de experiență
   - Categorii de servicii
   - Certificări existente
   - Input-ul suplimentar din modal
5. Bio-ul generat apare în textarea (editabil)
6. Handymanul salvează manual (butonul existent „Salvează")

#### Schimbări DB necesare
```sql
ALTER TABLE handyman_profiles ADD COLUMN IF NOT EXISTS bio_ai_generated BOOLEAN DEFAULT false;
```

---

### MODULUL 5 — HANDYMAN: Generator descriere serviciu
**Fișier frontend:** `client/src/components/handyman-services/HandymanServiceModal.jsx`
**Endpoint server:** `POST /api/ai/generate-service-description`

#### Flux utilizator
1. Handymanul creează/editează un serviciu
2. Lângă câmpul **Descriere** apare butonul **„✨ Completează cu AI"**
3. AI generează descrierea pe baza:
   - Titlul serviciului (completat deja)
   - Categoria selectată
   - Prețul de bază / pe oră (dacă sunt completate)
   - Durata estimată
4. Descrierea apare în câmpul textarea (editabilă)

#### Schimbări DB necesare
Niciuna.

---

### MODULUL 6 — ADMIN: Analiză disputuri cu AI
**Fișier frontend:** `client/src/pages/AdminDashboard.jsx` (secțiunea Disputes)
**Endpoint server:** `POST /api/ai/analyze-dispute`

#### Flux utilizator
1. Admin-ul deschide o dispută activă
2. Vede butonul **„Analizează cu AI"** în panelul de dispută
3. AI primește:
   - Descrierea task-ului original
   - Motivul disputei
   - Fotografiile încărcate de client (dovezi)
   - Fotografiile încărcate de handyman (dovezi)
   - Statusul job-ului
4. AI returnează:
   ```json
   {
     "recommendation": "handyman",          // sau "client" / "neutral"
     "confidence": 78,                      // procent 0-100
     "reasoning": "Fotografiile handymanului arată...",
     "client_points": ["Punctul 1 valid al clientului"],
     "handyman_points": ["Punctul 1 valid al handymanului"],
     "suggested_resolution": "Returnare parțială 50% din suma plătită",
     "disclaimer": "Aceasta este o recomandare AI, decizia finală aparține adminului."
   }
   ```
5. Analiza AI apare ca un panel colapsibil în UI-ul de dispută
6. Admin-ul poate accepta/respinge recomandarea și adaugă nota sa

#### Schimbări DB necesare
```sql
ALTER TABLE task_disputes ADD COLUMN IF NOT EXISTS ai_analysis JSONB;
ALTER TABLE task_disputes ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMPTZ;
```

---

## Propuneri suplimentare AI (de discutat)

### A. Smart Search în FindServices
- Când clientul caută servicii, AI îmbunătățește query-ul
- Ex: „țevi care curg" → caută în categoria „Instalații sanitare" + keywords „scurgere", „robinet"
- **Efort:** Mic (câteva linii de logică + prompt simplu)

### B. Răspuns automat la review-uri (Handyman)
- La primirea unui review nou, AI sugerează un răspuns politicos
- Handymanul poate edita și trimite
- **Efort:** Mic

### C. Detectare task duplicat (Client)
- Când clientul postează un task nou, AI verifică dacă există task-uri similare nerezolvate
- Avertizare: „Ai un task similar deschis din [data]. Vrei să-l folosești pe acela?"
- **Efort:** Mediu

### D. Estimare score compatibilitate Handyman-Task (Feed)
- În HandymanFeed, fiecare task primește un scor AI de compatibilitate (0-100%)
- Bazat pe: specialitățile handymanului, locație, disponibilitate, istoricul joburilor
- **Efort:** Mare

---

## Structura fișierelor server (realizată)

```
server/
├── index.js                    ✅ Actualizat cu /api/ai routes
├── routes/
│   └── ai.js                   ✅ Toate cele 6 endpoint-uri implementate
├── services/
│   └── gemini.js               ✅ Client Gemini 2.5 Flash (fetch v1 + retry)
├── middleware/
│   └── upload.js               ✅ Multer configurat (memoryStorage, max 5 img)
├── package.json                ✅ @google/generative-ai + multer instalate
└── .env                        ✅ GEMINI_API_KEY configurat și testat
```

---

## TASK-URI DE IMPLEMENTARE

### FAZA 0 — Infrastructură (Prioritate: Critică)
| # | Task | Fișier(e) | Status |
|---|------|-----------|--------|
| 0.1 | Adaugă `GEMINI_API_KEY` în `server/.env` | `server/.env` | ✅ Done |
| 0.2 | Creează `server/services/gemini.js` (client Gemini 2.5 Flash + retry) | `server/services/gemini.js` | ✅ Done |
| 0.3 | Creează `server/middleware/upload.js` (multer config) | `server/middleware/upload.js` | ✅ Done |
| 0.4 | Creează `server/routes/ai.js` cu toate cele 6 endpoint-uri | `server/routes/ai.js` | ✅ Done |
| 0.5 | Actualizează `server/index.js` să încarce route-urile AI | `server/index.js` | ✅ Done |
| 0.6 | Rulează migrările SQL (task_ai_checklists + coloane noi) | `supabase_ai_migration.sql` | ✅ Done — fișier SQL creat, rulează manual în Supabase Dashboard → SQL Editor |

### FAZA 1 — Modul Client: Analiză foto task (Prioritate: Înaltă)
| # | Task | Fișier(e) | Status |
|---|------|-----------|--------|
| 1.1 | Implementează endpoint `POST /api/ai/analyze-task` | `server/routes/ai.js` | ✅ Done |
| 1.2 | Adaugă buton „Analizează cu AI" în PostTask după upload foto | `client/src/pages/PostTask.jsx` | ✅ Done |
| 1.3 | Integrare răspuns AI → auto-fill form fields (titlu, descriere, categorie, urgență, keywords) | `client/src/pages/PostTask.jsx` | ✅ Done |
| 1.4 | UI loading state + error handling | `client/src/pages/PostTask.jsx` | ✅ Done |

### FAZA 2 — Modul Client: Estimare buget (Prioritate: Înaltă)
| # | Task | Fișier(e) | Status |
|---|------|-----------|--------|
| 2.1 | Implementează endpoint `POST /api/ai/estimate-budget` | `server/routes/ai.js` | ✅ Done |
| 2.2 | Query Supabase pentru task_offers similare (în server) | `server/routes/ai.js` | ✅ Done |
| 2.3 | Adaugă buton + UI estimare buget în step-ul de buget din PostTask | `client/src/pages/PostTask.jsx` | ✅ Done |
| 2.4 | Afișare range recomandat cu explicație și nivel de încredere | `client/src/pages/PostTask.jsx` | ✅ Done |

### FAZA 3 — Modul Handyman: Checklist instrumente (Prioritate: Înaltă)
| # | Task | Fișier(e) | Status |
|---|------|-----------|--------|
| 3.1 | Rulează migrare SQL pentru `task_ai_checklists` | `supabase_ai_migration.sql` | ✅ Done — fișier SQL creat |
| 3.2 | Implementează endpoint `POST /api/ai/generate-checklist` | `server/routes/ai.js` | ✅ Done |
| 3.3 | Adaugă tab „Lista AI" în TaskDetailModal | `client/src/components/handyman-dashboard/TaskDetailModal.jsx` | ✅ Done |
| 3.4 | UI checklist interactiv (tools + materials bifabile) | `client/src/components/handyman-dashboard/TaskDetailModal.jsx` | ✅ Done |
| 3.5 | Salvare/încărcare checklist din Supabase (task_ai_checklists) | `client/src/components/handyman-dashboard/TaskDetailModal.jsx` | ✅ Done |
| 3.6 | Afișare timp estimat în header-ul tab-ului | `client/src/components/handyman-dashboard/TaskDetailModal.jsx` | ✅ Done |

### FAZA 4 — Modul Handyman: Generator bio (Prioritate: Medie)
| # | Task | Fișier(e) | Status |
|---|------|-----------|--------|
| 4.1 | Implementează endpoint `POST /api/ai/generate-bio` | `server/routes/ai.js` | ✅ Done |
| 4.2 | Adaugă buton „Ajutor AI" + mini-modal în secțiunea Bio | `client/src/pages/HandymanPersonalProfile.jsx` | ✅ Done |
| 4.3 | Integrare răspuns AI → populate textarea bio | `client/src/pages/HandymanPersonalProfile.jsx` | ✅ Done |

### FAZA 5 — Modul Handyman: Generator descriere serviciu (Prioritate: Medie)
| # | Task | Fișier(e) | Status |
|---|------|-----------|--------|
| 5.1 | Implementează endpoint `POST /api/ai/generate-service-description` | `server/routes/ai.js` | ✅ Done |
| 5.2 | Adaugă buton „✨ Completează cu AI" lângă câmpul Descriere | `client/src/components/handyman-services/HandymanServiceModal.jsx` | ✅ Done |
| 5.3 | Integrare răspuns → populate textarea descriere serviciu | `client/src/components/handyman-services/HandymanServiceModal.jsx` | ✅ Done |

### FAZA 6 — Modul Admin: Analiză disputuri (Prioritate: Medie)
| # | Task | Fișier(e) | Status |
|---|------|-----------|--------|
| 6.1 | Rulează migrare SQL (coloane ai_analysis, ai_analyzed_at pe task_disputes) | Supabase | ⬜ Neînceput |
| 6.2 | Implementează endpoint `POST /api/ai/analyze-dispute` | `server/routes/ai.js` | ✅ Done |
| 6.3 | Adaugă buton „Analizează cu AI" în UI-ul de disputuri din Admin | `client/src/pages/AdminDashboard.jsx` | ⬜ Neînceput |
| 6.4 | Afișare panel cu analiza AI (recomandare + raționament + puncte pro/contra) | `client/src/pages/AdminDashboard.jsx` | ⬜ Neînceput |
| 6.5 | Salvare analiză AI în task_disputes.ai_analysis | `client/src/pages/AdminDashboard.jsx` | ⬜ Neînceput |

---

## Ordine de implementare recomandată

```
FAZA 0 (Infrastractură) → FAZA 1 (Foto→Task) → FAZA 3 (Checklist) 
→ FAZA 2 (Buget) → FAZA 4 (Bio) → FAZA 5 (Serviciu) → FAZA 6 (Dispute)
```

**Motivare:** Modulele 1 și 3 au cel mai mare impact vizibil imediat + validează arhitectura server. Modulul 2 (buget) depinde de date reale din platformă. Modulele 4 și 5 sunt rapide de implementat după ce arhitectura e validată. Modulul 6 (admin) este mai sensibil și necesită testare atentă.

---

## Note de securitate

- Cheia `ANTHROPIC_API_KEY` rămâne **exclusiv pe server** — nu ajunge niciodată în frontend
- Imaginile trimise la Anthropic nu sunt stocate pe serverele Anthropic (conform ToS)
- Rate limiting recomandat: max 10 request-uri AI / utilizator / oră
- Toate endpoint-urile AI necesită autentificare Supabase (token verificat pe server)
- Analiza AI pentru disputuri → disclaimer obligatoriu că e doar o recomandare

---

## Estimare efort total

| Fază | Efort estimat | Complexitate |
|------|--------------|--------------|
| 0 — Infrastructură | 2-3 ore | Medie |
| 1 — Foto → Task | 4-6 ore | Mare (Vision API) |
| 2 — Estimare buget | 3-4 ore | Medie |
| 3 — Checklist | 5-7 ore | Mare (UI complex) |
| 4 — Generator bio | 2-3 ore | Mică |
| 5 — Descriere serviciu | 1-2 ore | Mică |
| 6 — Analiză disputuri | 4-5 ore | Mare (Vision + logică complexă) |
| **TOTAL** | **~21-30 ore** | — |
