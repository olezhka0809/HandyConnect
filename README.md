# HandyConnect — Platformă Marketplace pentru Servicii la Domiciliu

## Repository

**https://github.com/olezhka0809/HandyConnect**

Repository-ul este setat la vizibilitate publică și conține întregul cod sursă al aplicației, fără fișiere binare compilate sau fișiere de configurare cu date sensibile.

---

## Tehnologii utilizate

- **Frontend:** React 19, Vite, Tailwind CSS v4
- **Backend:** Node.js, Express 5
- **Bază de date:** Supabase (PostgreSQL + Auth + Realtime + Storage)
- **AI:** Google Gemini 2.5 Flash (7 endpoint-uri)

---

## Cerințe preliminare

- Node.js **v18** sau mai nou
- npm **v9** sau mai nou
- Un proiect Supabase activ (gratuit la [supabase.com](https://supabase.com))
- O cheie API Google Gemini (gratuită la [aistudio.google.com](https://aistudio.google.com))

---

## Pași de compilare

Aplicația are două componente: clientul React (compilat cu Vite) și serverul Express (rulat direct cu Node.js, fără pas de compilare).

### Compilare client (React → bundle static)

```bash
cd client
npm install
npm run build
```

Rezultatul se găsește în folderul `client/dist/` și poate fi servit de orice server HTTP static.

### Server (fără compilare)

Serverul este scris în CommonJS și rulează direct cu Node.js, fără un pas de build:

```bash
cd server
npm install
```

---

## Pași de instalare și lansare

### 1. Clonare repository

```bash
git clone https://github.com/olezhka0809/HandyConnect.git
cd HandyConnect
```

### 2. Instalare dependințe rădăcină

```bash
npm install
```

### 3. Configurare variabile de mediu

**Pentru server** — creați fișierul `server/.env`:

```env
SUPABASE_URL=https://<project-id>.supabase.co
SUPABASE_SERVICE_KEY=<service-role-key>
GEMINI_API_KEY=<gemini-api-key>
PORT=5000
```

**Pentru client** — creați fișierul `client/.env`:

```env
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-public-key>
```

Valorile `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` și `VITE_SUPABASE_PUBLISHABLE_KEY` se găsesc în panoul Supabase la **Project Settings → API**.

### 4. Lansare în modul dezvoltare

Comanda următoare pornește simultan serverul Express (portul 5000) și clientul Vite (portul 5173):

```bash
npm run dev
```

Aplicația este accesibilă la **http://localhost:5173**.

### 5. Lansare în producție (opțional)

```bash
# Compilare client
cd client && npm run build && cd ..

# Pornire server (servește și bundle-ul static din client/dist)
cd server && node index.js
```

---

## Structura repository-ului

```
HandyConnect/
├── client/          # Aplicația React (Vite + Tailwind CSS)
│   ├── src/
│   │   ├── pages/   # Paginile aplicației (client, meșter, admin)
│   │   ├── components/
│   │   └── lib/     # Configurare Supabase client
│   └── package.json
├── server/          # API Express
│   ├── routes/      # Endpoint-uri REST
│   ├── services/    # Logică AI (Gemini), Supabase admin
│   └── package.json
└── package.json     # Script-uri rădăcină (dev, server, client)
```
