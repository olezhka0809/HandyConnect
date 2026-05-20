# HandyConnect

Platformă web pentru conectarea clienților cu meșteri locali. Clienții postează task-uri, primesc oferte de la meșteri verificați și gestionează întregul ciclu al lucrării — de la negociere până la finalizare și recenzie.

---

## Stack tehnic

| Layer | Tehnologie |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Bază de date | Supabase (PostgreSQL + RLS) |
| Autentificare | Supabase Auth |
| AI | Google Gemini API |
| Upload fișiere | Multer + Supabase Storage |
| Real-time | Supabase Realtime |

---

## Funcționalități principale

**Clienți**
- Postare task-uri cu fotografii, categorie, urgență și program preferat
- Primire și gestionare oferte de la meșteri
- Sistem de programare și reprogramare task-uri
- Urmărire stare lucrare, deschidere dispute, recenzii

**Meșteri**
- Feed task-uri filtrat după zonă și nivel de skill
- Trimitere oferte, gestionare job-uri active, marcare finalizare cu fotografii
- Profil public cu servicii, recenzii și statistici
- Calendar săptămânal cu blocuri automate per task

**Admin**
- Verificare identitate meșteri și certificări de skill
- Gestionare dispute cu decizii (relucrare, rambursare, redirecționare)
- Suport tichete, gestionare utilizatori, căutare task-uri

**Platformă**
- Chat real-time client ↔ meșter per task
- Notificări in-app în timp real (Supabase Realtime)
- Funcționalități AI: generare descrieri, analiză fotografii, estimare buget, checklist pași

---

## Configurare locală

```bash
# Instalare dependențe
cd client && npm install
cd ../server && npm install
```

Variabile de mediu necesare:

```env
# client/.env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# server/.env
GEMINI_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
PORT=5000
```

```bash
# Pornire (din root — pornește client + server concurent)
npm run dev
```

---

## Structură proiect

```
HandyConnect_Clean/
├── client/                  # Frontend React (Vite)
│   └── src/
│       ├── components/      # Componente UI reutilizabile
│       ├── pages/           # Pagini principale
│       ├── hooks/           # Custom hooks
│       └── utils/           # Utilități
├── server/                  # Backend Express
│   ├── routes/              # Route handlers
│   ├── services/            # Servicii externe (Gemini AI)
│   └── middleware/          # Middleware (upload, auth)
└── supabase_*.sql           # Migrații bază de date
```

---

## Securitate

- Row Level Security (RLS) activat pe toate tabelele principale
- Politici RLS separate pentru rolurile client, meșter și admin
- Funcții PostgreSQL `SECURITY DEFINER` pentru operații privilegiate
- Autentificare 2FA disponibilă prin Supabase Auth
- Variabilele de mediu sensibile excluse din repository

---

*Proiect licență — 2025*
