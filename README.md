# 🏪 Pawnshop

Pawnshop / výkupní okno aplikace postavená na **React Router v8 + Cloudflare Workers + D1**.

## Funkce

- **Přihlášení** — admin i prodavači, session v D1
- **Pokladna (POS)** — přepínání Výkup / Prodej / Vývoz, kategorie s barvami, mřížka položek, košík s množstvím
- **Admin panel**:
  - Přehled (počty položek, kategorií, uživatelů, transakcí, obrat)
  - Správa položek (přidat, skrýt/zobrazit, smazat)
  - Správa kategorií (barva, pořadí)
  - Správa uživatelů (vytváření účtů pro prodavače, role admin/seller)
  - Historie transakcí

## Rychlý start

### 1. Instalace závislostí

```bash
npm install
```

### 2. Vytvoření D1 databáze

```bash
npm run db:create
```

Tento příkaz vypíše `database_id`. Zkopíruj ho a vlož do `wrangler.jsonc`
místo `REPLACE_WITH_YOUR_D1_ID`.

### 3. Vytvoření tabulek a seed dat

```bash
npm run db:migrate
npm run db:seed
```

Pro lokální vývoj:

```bash
npm run db:migrate:local
npm run db:seed:local
```

### 4. Lokální vývoj

```bash
npm run dev
```

Aplikace poběží na `http://localhost:5173`.

### 5. Nasazení

```bash
npm run deploy
```

Po nasazení aplikace poběží na `https://pawnshop.<tvuj-subdomain>.workers.dev`.

## Výchozí přihlášení

| Uživatel | Heslo    | Role  |
|----------|----------|-------|
| admin    | admin123 | admin |

**Po prvním přihlášení okamžitě změň heslo** — vytvoř nového admina a smaž výchozího, nebo přidej produkty a uživatele podle potřeby.

## Struktura projektu

```
pawnshop/
├── app/
│   ├── routes/
│   │   ├── _index.tsx              # redirect na login/dashboard
│   │   ├── login.tsx               # přihlášení
│   │   ├── logout.tsx              # odhlášení
│   │   ├── dashboard.tsx           # pokladna (POS)
│   │   ├── admin.tsx              # admin layout
│   │   ├── admin._index.tsx       # přehled
│   │   ├── admin.products.tsx     # správa položek
│   │   ├── admin.products.new.tsx # nová položka
│   │   ├── admin.categories.tsx   # správa kategorií
│   │   ├── admin.users.tsx        # správa uživatelů
│   │   └── admin.transactions.tsx # historie transakcí
│   ├── lib/
│   │   └── auth.server.ts          # hesla, session, guards
│   ├── db/
│   │   ├── schema.sql             # D1 schéma
│   │   └── seed.sql               # výchozí data
│   ├── root.tsx                   # root layout + topnav
│   ├── routes.ts                  # routy
│   ├── app.css                    # styly (dark theme)
│   ├── entry.server.tsx
│   └── entry.client.tsx
├── workers/
│   └── app.ts                     # Worker entry → React Router
├── vite.config.ts
├── react-router.config.ts
├── wrangler.jsonc                 # D1 binding
└── package.json
```

## Tech stack

- **React Router v8** (SSR) — frontend + API v jednom Workeru
- **Cloudflare Workers** — compute
- **D1** — SQLite databáze (produkty, kategorie, uživatelé, transakce)
- **@cloudflare/vite-plugin** — build a lokální vývoj v Workers runtime
- Hesla hashována SHA-256 (Web Crypto API), session tokeny v D1
