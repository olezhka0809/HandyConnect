# Sistem de Disponibilitate Handyman — Documentație

## Prezentare generală

Sistemul de disponibilitate permite handymanilor să-și definească un program săptămânal de lucru cu intervale orare multiple per zi. Pe baza acestui program și a joburilor deja alocate, clienții văd în BookingModal doar zilele și orele în care handymanul este liber. Sistemul calculează automat și timpul de deplasare între joburi consecutive folosind distanța GPS (formula Haversine).

---

## 1. Baza de date

### 1.1 Tabel: `handyman_schedule`

Stochează programul săptămânal al fiecărui handyman.

| Coloană | Tip | Descriere |
|---|---|---|
| `id` | UUID | Cheie primară |
| `handyman_id` | UUID | FK → `handyman_profiles(user_id)`, UNIQUE |
| `schedule` | JSONB | Program săptămânal (vezi structura de mai jos) |
| `travel_buffer_min` | INT | Minute minime rezervate între joburi (default 30) |
| `created_at` | TIMESTAMPTZ | — |
| `updated_at` | TIMESTAMPTZ | Auto-actualizat prin trigger |

**Structura JSONB `schedule`:**
```json
{
  "mon": [{"from": "09:00", "to": "12:00"}, {"from": "14:00", "to": "18:00"}],
  "tue": [{"from": "09:00", "to": "17:00"}],
  "wed": [],
  "thu": [{"from": "09:00", "to": "17:00"}],
  "fri": [{"from": "08:00", "to": "13:00"}],
  "sat": [],
  "sun": []
}
```
- Zilele cu array gol = zi liberă
- Fiecare zi poate avea **mai multe intervale** (ex: program split dimineață/seară)
- Cheile sunt: `mon`, `tue`, `wed`, `thu`, `fri`, `sat`, `sun`

**RLS (Row Level Security):**
- Handymanul poate citi/modifica doar propriul program
- Oricine poate citi programul (necesar pentru BookingModal)

---

### 1.2 Tabel: `handyman_calendar_blocks`

Stochează ocupările efective din calendar (joburi acceptate, deplasări, blocuri personale).

| Coloană | Tip | Descriere |
|---|---|---|
| `id` | UUID | Cheie primară |
| `handyman_id` | UUID | FK → `handyman_profiles(user_id)` |
| `date` | DATE | Data calendaristică |
| `start_time` | TIME | Ora de început |
| `end_time` | TIME | Ora de sfârșit |
| `block_type` | TEXT | `booking` / `task` / `travel` / `personal` |
| `ref_id` | UUID | ID-ul rezervării sau taskului asociat |
| `ref_type` | TEXT | `booking` sau `task` |
| `notes` | TEXT | Note descriptive |
| `is_auto` | BOOLEAN | `true` = generat automat de sistem |
| `lat` | NUMERIC | Latitudinea locației (pentru calcul GPS) |
| `lng` | NUMERIC | Longitudinea locației (pentru calcul GPS) |
| `created_at` | TIMESTAMPTZ | — |

**Index:** `(handyman_id, date)` pentru interogări rapide pe zi.

**RLS:**
- Handymanul poate gestiona doar propriile blocuri
- Oricine poate citi blocurile (necesar pentru disponibilitate)

---

### 1.3 Modificări la tabele existente

**Tabel `bookings`** — coloane adăugate:
| Coloană | Tip | Descriere |
|---|---|---|
| `latitude` | NUMERIC | Latitudinea adresei clientului |
| `longitude` | NUMERIC | Longitudinea adresei clientului |
| `estimated_duration_min` | INT | Durata estimată în minute (default 120) |

---

### 1.4 Funcții SQL

#### `fn_haversine_km(lat1, lon1, lat2, lon2)`
Calculează distanța în kilometri între două coordonate GPS folosind formula Haversine.
```
dist = 2 * R * arcsin(sqrt(sin²(Δlat/2) + cos(lat1)*cos(lat2)*sin²(Δlon/2)))
```
- `R = 6371 km` (raza Pământului)
- Returnează: `NUMERIC` (km)
- Tip: `IMMUTABLE` (cache-abil)

#### `fn_travel_minutes(lat1, lon1, lat2, lon2, p_buffer)`
Estimează minutele de deplasare dintre două locații.
- Viteză medie urbană: **40 km/h**
- Formula: `CEIL(distanta_km / 40 * 60)`
- Returnează: `GREATEST(minute_calculate, p_buffer)` — cel puțin buffer-ul setat
- Dacă coordonatele lipsesc → returnează direct `p_buffer`

#### `fn_get_available_slots(p_handyman_id, p_date)` *(RPC)*
Returnează ferestre de timp libere pentru o zi specifică.

**Algoritm:**
1. Determină cheia zilei din dată (`mon`, `tue`, etc.)
2. Preia `schedule[day_key]` din `handyman_schedule`
3. Dacă ziua nu are sloturi → returnează nimic
4. Pentru fiecare interval din program:
   - Pornește un cursor de la `from`
   - Parcurge blocurile ocupate în ordine cronologică
   - Înainte de fiecare bloc → returnează fereastra liberă `(cursor, block.start)`
   - Avansează cursorul la `block.end`
   - Returnează fereastra rămasă până la `to`

---

### 1.5 Triggere

#### `tg_block_from_booking` (AFTER UPDATE OF status ON bookings)
Activat când o rezervare trece în starea `confirmed` sau `in_progress`.

**Acțiuni:**
1. Calculează `end_time = scheduled_time + estimated_duration_min`
2. Inserează un bloc de tip `booking` în `handyman_calendar_blocks`
3. Caută jobul următor al handymanului în aceeași zi
4. Calculează `fn_travel_minutes` între cele două locații
5. Inserează un bloc de tip `travel` dacă există spațiu înainte de jobul următor

#### `tg_block_from_task` (AFTER UPDATE OF status ON tasks)
Similar cu cel de la bookings, activat la `in_progress` sau `accepted`.
- Parsează `approximate_duration` (ex: `"2-3 ore"`) → extrage prima cifră × 60 minute

#### `tg_remove_block_booking` / `tg_remove_block_task` (AFTER UPDATE OF status)
Activat la anulare (`cancelled`, `rejected`, `client_cancelled`).

**Acțiuni:**
1. Șterge blocul principal al jobului (`ref_id = booking/task id`)
2. Șterge blocul de travel auto-generat imediat după (dacă există)

#### `tg_touch_handyman_schedule` (BEFORE UPDATE ON handyman_schedule)
Actualizează `updated_at` automat la fiecare modificare.

---

## 2. Frontend

### 2.1 Componenta `ScheduleEditor` *(reutilizabilă)*

**Fișier:** `client/src/components/ScheduleEditor.jsx`

Componentă standalone care gestionează editarea programului săptămânal.

**Props:**
| Prop | Tip | Descriere |
|---|---|---|
| `schedule` | Object | `{mon:[{from,to}], ...}` |
| `travelBuffer` | INT | Minute buffer transport |
| `onChange` | Function | `(schedule, travelBuffer) => void` |
| `compact` | Boolean | Ascunde previzualizarea (pentru onboarding) |

**Sub-componente:**
- **`DayRow`** — o linie per zi cu toggle activ/inactiv și lista de intervale
- **`SlotRow`** — un interval orar cu select `de la` / `până la` + buton de ștergere
- **`WeekPreview`** — previzualizare grafică a săptămânii (bare albastre proporționale pe o scală 06:00–23:00)

**Funcționalități:**
- Activare/dezactivare zi cu un singur click
- Adăugare interval nou per zi (auto-calculează ora de start din ultimul interval + 1h)
- Ștergere interval (buton × vizibil doar dacă sunt cel puțin 2 intervale)
- Validare: dacă `end <= start` → bordură roșie + mesaj
- Selector buffer transport: 15 / 30 / 45 / 60 / 90 min
- Total ore săptămânale calculat live
- Warning galben dacă nicio zi nu este activată

---

### 2.2 Onboarding — Step 4 actualizat

**Fișier:** `client/src/pages/HandymanOnboarding.jsx`

**Înainte:** Selectare zile cu checkbox-uri simple (Luni–Duminică), fără ore.

**După:** `ScheduleEditor` complet (mod `compact` — fără previzualizare) integrat în step-ul 4 al onboarding-ului.

**Reguli:**
- Butonul "Continuă" este **dezactivat** dacă nicio zi nu are sloturi definite (program obligatoriu)
- La salvare (`saveStep4`):
  1. `UPSERT` în `handyman_schedule` cu schedule + travel_buffer
  2. Sincronizează `available_days` (array de chei active) în `handyman_profiles`

---

### 2.3 Profil Personal — Tab "Program de Lucru"

**Fișier:** `client/src/pages/HandymanPersonalProfile.jsx`

Tab nou adăugat în sidebar cu id `schedule` și iconița `Calendar`.

**Funcționalități:**
- Încărcarea programului curent la activarea tab-ului (`useEffect` pe `activeSection`)
- `ScheduleEditor` în mod complet (cu previzualizare)
- Buton "Salvează Programul" cu spinner și confirmare vizuală (banner verde 4 secunde)
- Salvare sincronizată în `handyman_schedule` + `handyman_profiles.available_days`
- Butonul dezactivat dacă nicio zi nu este selectată

---

### 2.4 BookingModal — Calendar inteligent

**Fișier:** `client/src/components/dashboard/client-dashboard/BookingModal.jsx`

**Înainte:** Afișa toate orele fixe (08:00–18:00), fără legătură cu programul handymanului.

**După:**

**La deschiderea modal-ului:**
- Încarcă `handyman_schedule` și `travel_buffer_min` din DB

**La selectarea unei date:**
1. Determină ziua săptămânii (`sun=0, mon=1, ...`)
2. Verifică dacă handymanul lucrează în acea zi
   - **Da**: calculează orele disponibile
   - **Nu**: afișează warning portocaliu "Handymanul nu lucrează în această zi"
3. Încarcă blocurile existente din `handyman_calendar_blocks` pentru acea dată
4. Calculează orele libere:
   - Parcurge fiecare interval din program
   - Scade blocurile ocupate
   - Returnează ore la interval de 60 de minute în ferestrele libere
5. Dacă ziua e complet ocupată → mesaj "Nicio oră disponibilă, alege altă dată"
6. Dacă ora anterior selectată nu mai e disponibilă → se resetează automat

**Indicatori vizuali:**
- Număr de sloturi disponibile afișat lângă label ("X sloturi disponibile")
- Warning portocaliu pentru zi neworking
- Mesaj gri pentru zi complet ocupată

---

## 3. Flux complet end-to-end

```
[Handyman - Onboarding Step 4]
  │
  ├─ Setează program (ex: Luni–Vineri 09:00–17:00, buffer 30 min)
  └─ Salvează în handyman_schedule
  
[Handyman - Personal Profile → Program de Lucru]
  └─ Poate modifica programul oricând

[Client - Caută Servicii → BookingModal]
  │
  ├─ Modal se deschide → încarcă handyman_schedule
  ├─ Client selectează o dată
  │   ├─ Zi neworking → warning, nicio oră afișată
  │   └─ Zi lucrătoare → calculează ore libere:
  │       program_zilei − calendar_blocks_existente
  ├─ Client alege ora disponibilă
  └─ Rezervare creată (status: pending)

[Handyman acceptă rezervarea → status: confirmed]
  │
  ├─ Trigger: inserează bloc booking în calendar_blocks
  │   (durata = estimated_duration_min)
  └─ Trigger: caută jobul următor în aceeași zi
      ├─ Calculează fn_travel_minutes (GPS Haversine / 40kmh)
      └─ Inserează bloc travel între cele două joburi

[Rezervare anulată → status: cancelled]
  │
  ├─ Trigger: șterge bloc booking
  └─ Trigger: șterge bloc travel asociat
```

---

## 4. Migrări aplicate

| Nume migrare | Descriere |
|---|---|
| `handyman_schedule_and_calendar` | Creează tabelele, funcțiile și triggere-le principale |

---

## 5. Fișiere modificate

| Fișier | Tip modificare |
|---|---|
| `client/src/components/ScheduleEditor.jsx` | **Creat** — componentă reutilizabilă |
| `client/src/pages/HandymanOnboarding.jsx` | **Modificat** — step 4 înlocuit cu ScheduleEditor |
| `client/src/pages/HandymanPersonalProfile.jsx` | **Modificat** — tab nou "Program de Lucru" |
| `client/src/components/dashboard/client-dashboard/BookingModal.jsx` | **Modificat** — calendar inteligent bazat pe schedule |

---

## 6. Limitări cunoscute și evoluții viitoare

| Limitare | Plan viitor |
|---|---|
| Bookings nu au lat/lng stocate la creare | Adăugare geocoding la creare booking (Google Maps / OpenStreetMap Nominatim) |
| Orele afișate sunt la interval de 60 min | Adăugare opțiune 30 min granularitate |
| Ziua neworking → input dată nu blochează selectarea | Înlocuire `<input type="date">` cu calendar custom care dezactivează zilele nelucrătoare |
| `fn_get_available_slots` este RPC dar nefolosit în frontend | Migrare logică client-side → apel RPC pentru consistență |
| Deplasarea se calculează cu viteză fixă 40 km/h | Integrare Google Maps Distance Matrix API pentru trafic real |
| Handymanul nu poate adăuga manual blocuri personale din UI | Adăugare UI "Blochează interval" în calendar profil |
