# Implux.io

Internal CRO overlay management platform for Shopify merchant storefronts (Rakuten Advertising).

## Structure

| Folder        | Purpose                    | Deploy to   |
|---------------|----------------------------|-------------|
| `backend`     | Express + Prisma + PostgreSQL | Railway (Service 1) |
| `frontend`    | React + Vite + Tailwind    | Vercel      |
| `shopify-app` | Shopify Remix app          | Railway (Service 2) |
| `docs`        | Documentation              | —           |

## Backend (this step)

- **Schema**: `backend/prisma/schema.prisma` — User, Merchant, Campaign, CampaignEvent, RakutenTransaction, RakutenCredentials.
- **Migration**: `backend/prisma/migrations/20250301234600_init/migration.sql` (apply with a real DB).
- **Seed**: `backend/prisma/seed.js` — creates admin user `admin@implux.io` / `admin123`.

### Backend setup

1. Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL` (e.g. Railway PostgreSQL).
2. From `backend`: `npm install` then `npx prisma migrate deploy` (then `npm run db:seed` to seed).
3. Run: `npm run dev`.

Schema is set and ready for the next steps.
