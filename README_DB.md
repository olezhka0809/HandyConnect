# Documentație Structură Bază de Date

Acest document conține definițiile tabelelor și relațiile dintre acestea pentru sistemul curent.

## 1. Tabel: `audit_logs`
Folosit pentru monitorizarea schimbărilor efectuate asupra înregistrărilor.

| Coloană | Tip | Constrângeri |
| :--- | :--- | :--- |
| `id` | uuid | PRIMARY KEY, NON-NULLABLE |
| `action` | varchar | NON-NULLABLE |
| `table_name` | varchar | NON-NULLABLE |
| `record_id` | uuid | NON-NULLABLE |
| `user_id` | uuid | NON-NULLABLE |
| `old_values` | jsonb | NULLABLE |
| `new_values` | jsonb | NULLABLE |
| `metadata` | jsonb | NULLABLE |
| `created_at` | timestamptz | NULLABLE |

## 2. Tabel: `bookings`
Gestionează rezervările serviciilor între clienți și handymen.

| Coloană | Tip | Constrângeri |
| :--- | :--- | :--- |
| `id` | uuid | PRIMARY KEY, NON-NULLABLE |
| `client_id` | uuid | FOREIGN KEY, NON-NULLABLE |
| `handyman_id` | uuid | FOREIGN KEY, NON-NULLABLE |
| `service_id` | uuid | FOREIGN KEY, NULLABLE |
| `task_id` | uuid | FOREIGN KEY, NULLABLE |
| `status` | varchar | NULLABLE |
| `scheduled_date` | date | NULLABLE |
| `scheduled_time` | varchar | NULLABLE |
| `urgency` | varchar | NULLABLE |
| `service_address` | text | NULLABLE |
| `subtotal` | numeric | NULLABLE |
| `service_fee` | numeric | NULLABLE |
| `total` | numeric | NULLABLE |
| `payment_status` | varchar | NULLABLE |
| `created_at` | timestamptz | NON-NULLABLE |
| `updated_at` | timestamptz | NON-NULLABLE |

## 3. Tabel: `categories`
Categoriile generale de servicii disponibile.

| Coloană | Tip | Constrângeri |
| :--- | :--- | :--- |
| `id` | int4 | PRIMARY KEY, NON-NULLABLE |
| `name` | varchar | UNIQUE, NON-NULLABLE |
| `slug` | varchar | UNIQUE, NON-NULLABLE |
| `icon` | varchar | NULLABLE |
| `is_active` | bool | NON-NULLABLE |

## 4. Tabel: `client_addresses`
Adresele salvate ale clienților.

| Coloană | Tip | Constrângeri |
| :--- | :--- | :--- |
| `id` | uuid | PRIMARY KEY, NON-NULLABLE |
| `user_id` | uuid | FOREIGN KEY, NON-NULLABLE |
| `city` | varchar | NON-NULLABLE |
| `county` | varchar | NON-NULLABLE |
| `is_primary` | bool | NULLABLE |
| `created_at` | timestamptz | NON-NULLABLE |

## 5. Tabel: `client_categories` (Pivot)
Relația many-to-many între clienți și categorii.

| Coloană | Tip | Constrângeri |
| :--- | :--- | :--- |
| `client_id` | uuid | PRIMARY KEY, FOREIGN KEY, NON-NULLABLE |
| `category_id` | int4 | PRIMARY KEY, FOREIGN KEY, NON-NULLABLE |
| `created_at` | timestamptz | NON-NULLABLE |

## 6. Tabel: `client_dashboard_stats` (View/Table)
Statistici agregate pentru dashboard-ul clientului.

| Coloană | Tip | Constrângeri |
| :--- | :--- | :--- |
| `client_id` | uuid | NULLABLE |
| `active_bookings` | int8 | NULLABLE |
| `completed_bookings` | int8 | NULLABLE |
| `total_spent` | numeric | NULLABLE |
| `favorite_count` | int8 | NULLABLE |

## 7. Tabel: `favorite_handymen`
Lista de meseriași favoriți ai fiecărui client.

| Coloană | Tip | Constrângeri |
| :--- | :--- | :--- |
| `id` | int4 | PRIMARY KEY, NON-NULLABLE |
| `client_id` | uuid | FOREIGN KEY, NON-NULLABLE |
| `handyman_id` | uuid | FOREIGN KEY, NON-NULLABLE |
| `created_at` | timestamptz | NON-NULLABLE |

## 8. Tabel: `handyman_categories` (Pivot)
Categoriile de specializare pentru fiecare handyman.

| Coloană | Tip | Constrângeri |
| :--- | :--- | :--- |
| `handyman_id` | uuid | PRIMARY KEY, FOREIGN KEY, NON-NULLABLE |
| `category_id` | int4 | PRIMARY KEY, FOREIGN KEY, NON-NULLABLE |


## 9. Tabel: `handyman_profiles`
Informații detaliate de profil pentru meseriași (handymen).

| Coloană | Tip | Constrângeri |
| :--- | :--- | :--- |
| `user_id` | uuid | PRIMARY KEY, FOREIGN KEY, NON-NULLABLE |
| `bio` | text | NULLABLE |
| `experience_years` | int2 | NULLABLE |
| `hourly_rate` | numeric | NULLABLE |
| `rating_avg` | numeric | NULLABLE |
| `total_jobs_completed` | int4 | NON-NULLABLE |
| `is_verified` | bool | NON-NULLABLE |
| `is_available` | bool | NON-NULLABLE |
| `specialties` | _text (array) | NULLABLE |
| `primary_city` | varchar | NULLABLE |
| `work_radius_km` | int4 | NULLABLE |
| `status` | varchar | NULLABLE |

## 10. Tabel: `handyman_services`
Catalogul de servicii specifice oferite de fiecare handyman.

| Coloană | Tip | Constrângeri |
| :--- | :--- | :--- |
| `id` | uuid | PRIMARY KEY, NON-NULLABLE |
| `handyman_id` | uuid | FOREIGN KEY, NON-NULLABLE |
| `title` | varchar | NON-NULLABLE |
| `description` | text | NULLABLE |
| `base_price` | numeric | NON-NULLABLE |
| `category_id` | int4 | FOREIGN KEY, NULLABLE |
| `is_available` | bool | NULLABLE |
| `created_at` | timestamptz | NON-NULLABLE |

## 11. Tabel: `job_completions`
Detaliile despre finalizarea unui job, inclusiv recenzii și plăți.

| Coloană | Tip | Constrângeri |
| :--- | :--- | :--- |
| `id` | uuid | PRIMARY KEY, NON-NULLABLE |
| `job_id` | uuid | NON-NULLABLE |
| `handyman_id` | uuid | FOREIGN KEY, NON-NULLABLE |
| `completion_photos` | _text (array) | NON-NULLABLE |
| `client_rating` | numeric | NULLABLE |
| `client_review` | text | NULLABLE |
| `payment_released` | bool | NULLABLE |
| `booking_id` | uuid | FOREIGN KEY, NULLABLE |

## 12. Tabel: `notifications`
Sistemul de notificări pentru utilizatori (push/in-app).

| Coloană | Tip | Constrângeri |
| :--- | :--- | :--- |
| `id` | uuid | PRIMARY KEY, NON-NULLABLE |
| `user_id` | uuid | FOREIGN KEY, NULLABLE |
| `type` | text | NON-NULLABLE |
| `title` | text | NON-NULLABLE |
| `body` | text | NULLABLE |
| `data` | jsonb | NULLABLE |
| `is_read` | bool | NULLABLE |

## 13. Tabel: `profiles`
Tabelul principal de utilizator (comun pentru Clienți și Handymen).

| Coloană | Tip | Constrângeri |
| :--- | :--- | :--- |
| `id` | uuid | PRIMARY KEY, FOREIGN KEY, NON-NULLABLE |
| `email` | varchar | NULLABLE |
| `first_name` | varchar | NON-NULLABLE |
| `last_name` | varchar | NON-NULLABLE |
| `phone` | varchar | NULLABLE |
| `is_active` | bool | NON-NULLABLE |
| `onboarding_completed` | bool | NON-NULLABLE |
| `average_rating` | numeric | NULLABLE |

## 14. Tabel: `rejection_reasons`
Motive predefinite pentru respingerea sau anularea unui serviciu.

| Coloană | Tip | Constrângeri |
| :--- | :--- | :--- |
| `id` | int4 | PRIMARY KEY, NON-NULLABLE |
| `name` | text | NON-NULLABLE |
| `is_active` | bool | NULLABLE |

## 15. Tabel: `reschedule_requests`
Solicitări de modificare a datei/orei pentru rezervările existente.

| Coloană | Tip | Constrângeri |
| :--- | :--- | :--- |
| `id` | uuid | PRIMARY KEY, NON-NULLABLE |
| `job_id` | uuid | NON-NULLABLE |
| `handyman_id` | uuid | FOREIGN KEY, NON-NULLABLE |
| `client_id` | uuid | FOREIGN KEY, NON-NULLABLE |
| `proposed_date` | date | NON-NULLABLE |
| `status` | varchar | NON-NULLABLE |

## 16. Tabel: `review_helpful`
Sistem de votare pentru recenzii (dacă o recenzie a fost utilă).

| Coloană | Tip | Constrângeri |
| :--- | :--- | :--- |
| `id` | int4 | PRIMARY KEY, NON-NULLABLE |
| `review_id` | uuid | FOREIGN KEY, NON-NULLABLE |
| `user_id` | uuid | FOREIGN KEY, NON-NULLABLE |
| `created_at` | timestamptz | NON-NULLABLE |



## 17. Tabel: `reviews`
Recenzii detaliate lăsate de utilizatori după finalizarea serviciilor.

| Coloană | Tip | Constrângeri |
| :--- | :--- | :--- |
| `id` | uuid | PRIMARY KEY, NON-NULLABLE |
| `task_id` | uuid | FOREIGN KEY, NULLABLE |
| `booking_id` | uuid | FOREIGN KEY, NULLABLE |
| `rating` | int2 | NON-NULLABLE |
| `title` | varchar | NULLABLE |
| `description` | text | NULLABLE |
| `reviewer_id` | uuid | FOREIGN KEY, NON-NULLABLE |
| `reviewed_id` | uuid | FOREIGN KEY, NON-NULLABLE |
| `helpful_count` | int4 | NULLABLE |
| `owner_reply` | text | NULLABLE |

## 18. Tabel: `roles`
Definirea rolurilor disponibile în sistem (ex: Admin, Client, Handyman).

| Coloană | Tip | Constrângeri |
| :--- | :--- | :--- |
| `id` | int4 | PRIMARY KEY, NON-NULLABLE |
| `name` | varchar | UNIQUE, NON-NULLABLE |
| `description` | varchar | NULLABLE |

## 19. Tabel: `romanian_cities`
Baza de date cu orașele și județele din România pentru geolocație.

| Coloană | Tip | Constrângeri |
| :--- | :--- | :--- |
| `id` | int4 | PRIMARY KEY, NON-NULLABLE |
| `name` | varchar | NON-NULLABLE |
| `county` | varchar | NON-NULLABLE |
| `latitude` | numeric | NON-NULLABLE |
| `longitude` | numeric | NON-NULLABLE |
| `population` | int4 | NULLABLE |

## 20. Tabel: `task_disputes`
Gestiunea conflictelor apărute între client și handyman.

| Coloană | Tip | Constrângeri |
| :--- | :--- | :--- |
| `id` | uuid | PRIMARY KEY, NON-NULLABLE |
| `task_id` | uuid | FOREIGN KEY, NULLABLE |
| `completion_id` | uuid | FOREIGN KEY, NULLABLE |
| `reason_id` | int4 | FOREIGN KEY, NULLABLE |
| `status` | text | NULLABLE |
| `assigned_to` | uuid | FOREIGN KEY, NULLABLE |
| `resolution_note` | text | NULLABLE |

## 21. Tabel: `task_offers`
Ofertele trimise de handymen pentru task-urile publicate.

| Coloană | Tip | Constrângeri |
| :--- | :--- | :--- |
| `id` | uuid | PRIMARY KEY, NON-NULLABLE |
| `task_id` | uuid | FOREIGN KEY, NON-NULLABLE |
| `handyman_id` | uuid | FOREIGN KEY, NON-NULLABLE |
| `proposed_price` | numeric | NON-NULLABLE |
| `estimated_duration` | varchar | NULLABLE |
| `status` | varchar | NULLABLE |
| `created_at` | timestamptz | NON-NULLABLE |

## 22. Tabel: `tasks`
Sarcini/proiecte postate de clienți pentru a primi oferte.

| Coloană | Tip | Constrângeri |
| :--- | :--- | :--- |
| `id` | uuid | PRIMARY KEY, NON-NULLABLE |
| `client_id` | uuid | FOREIGN KEY, NON-NULLABLE |
| `title` | varchar | NON-NULLABLE |
| `description` | text | NULLABLE |
| `category_id` | int4 | FOREIGN KEY, NULLABLE |
| `budget` | numeric | NULLABLE |
| `address_city` | varchar | NULLABLE |
| `status` | varchar | NULLABLE |
| `is_public` | bool | NULLABLE |

## 23. Tabel: `user_roles` (Pivot)
Asocierea utilizatorilor cu unul sau mai multe roluri.

| Coloană | Tip | Constrângeri |
| :--- | :--- | :--- |
| `user_id` | uuid | PRIMARY KEY, FOREIGN KEY, NON-NULLABLE |
| `role_id` | int4 | PRIMARY KEY, FOREIGN KEY, NON-NULLABLE |
| `granted_at` | timestamptz | NON-NULLABLE |




## 24. Tabel: `conversations`
Gestionează sesiunile de chat între clienți și handymen, legate de un context specific (booking sau task).

| Coloană | Tip | Constrângeri |
| :--- | :--- | :--- |
| `id` | uuid | PRIMARY KEY, NON-NULLABLE |
| `client_id` | uuid | FOREIGN KEY, NON-NULLABLE |
| `handyman_id` | uuid | FOREIGN KEY, NON-NULLABLE |
| `booking_id` | uuid | FOREIGN KEY, NULLABLE |
| `task_id` | uuid | FOREIGN KEY, NULLABLE |
| `last_message_at` | timestamptz | NULLABLE |
| `created_at` | timestamptz | NULLABLE |
| `is_closed` | bool | NULLABLE |

## 25. Tabel: `messages`
Stochează mesajele individuale din cadrul unei conversații, inclusiv suport pentru atașamente.

| Coloană | Tip | Constrângeri |
| :--- | :--- | :--- |
| `id` | uuid | PRIMARY KEY, NON-NULLABLE |
| `conversation_id` | uuid | FOREIGN KEY, NON-NULLABLE |
| `sender_id` | uuid | FOREIGN KEY, NON-NULLABLE |
| `content` | text | NON-NULLABLE |
| `is_read` | bool | NULLABLE |
| `created_at` | timestamptz | NULLABLE |
| `attachment_url` | text | NULLABLE |
| `attachment_type` | text | NULLABLE |


## 26. Tabel: `review_not_helpful`
Sistem de votare negativă pentru recenzii (indică faptul că o recenzie nu a fost utilă).

| Coloană | Tip | Constrângeri |
| :--- | :--- | :--- |
| `id` | uuid | PRIMARY KEY, NON-NULLABLE |
| `review_id` | uuid | FOREIGN KEY, NULLABLE |
| `user_id` | uuid | FOREIGN KEY, NULLABLE |
| `created_at` | timestamptz | NULLABLE |


