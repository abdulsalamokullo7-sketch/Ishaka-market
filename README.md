# Ishaka Market Hub - Local Market & Logistics System

Production-oriented full-stack marketplace for Ishaka, Uganda:
- Buy/sell goods
- Rentals and services
- Seller application + admin approval workflow
- Delivery fare calculation by area-to-area mapping
- WhatsApp-first communication for low-friction mobile usage

## Stack

- Frontend: Next.js App Router + Tailwind CSS
- Backend: Node.js + Express REST API
- Database: PostgreSQL
- Cache (optional): Redis-ready config placeholder
- Storage: Cloudinary-ready env variables
- Auth: JWT + RBAC (`admin`, `seller`, `user`)

## Project Structure

- `frontend/` - Next.js mobile-first app
- `backend/` - Express API, schema, seed script
- `backend/sql/schema.sql` - full PostgreSQL schema with indexes

## Core Features Implemented

- Seller application lifecycle (`pending`, `approved`, `rejected`, `more_info`, `suspended`)
- Admin approval endpoint that upgrades user to seller
- Verification badge system (`new`, `verified`, `suspended`)
- Listings with heavy-data search/filter/pagination
- Area model + delivery fare matrix management
- Admin analytics endpoint
- Role-protected routes and rate-limited API

## Setup

### 1) Backend

```bash
cd backend
npm install
cp .env.example .env
```

Set `DATABASE_URL` in `.env`, then:

```bash
npm run seed
npm run dev
```

Backend runs at `http://localhost:5000`.

### 2) Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Frontend runs at `http://localhost:3000`.

## Deploy Backend on Render

1. Push latest code to GitHub (already done).
2. In Render, click **New +** -> **Blueprint**.
3. Select your repo: `abdulsalamokullo7-sketch/Ishaka-market`.
4. Render detects `render.yaml` and creates:
   - Web service: `ishaka-market-backend`
   - PostgreSQL: `ishaka-market-db`
5. Set required env values in Render service:
   - `FRONTEND_ORIGIN` = your Vercel frontend URL (example: `https://ishaka-market.vercel.app`)
   - Optional Cloudinary keys if you enable uploads
6. Deploy. After first deploy, open Render Shell and run:
   - `npm run seed`
7. Backend base URL becomes:
   - `https://<your-render-service>.onrender.com/api/v1`
8. Put that URL in Vercel frontend env:
   - `NEXT_PUBLIC_API_URL=https://<your-render-service>.onrender.com/api/v1`

## Seed Credentials

- Admin phone: `+256700000001`
- Admin password: `Admin@123`

## API Documentation (`/api/v1`)

### Auth
- `POST /auth/register` - Register buyer/user
- `POST /auth/login` - Login and return JWT

### Public
- `GET /areas`
- `GET /categories`
- `GET /listings?q=&category_id=&area_id=&min_price=&max_price=&verified=&page=&limit=`
- `GET /listings/:id`
- `GET /sellers/:id/listings?page=&limit=`
- `POST /delivery/calculate` `{ from_area_id, to_area_id }`

### Seller (JWT)
- `POST /seller/apply`
- `GET /seller/me`
- `POST /seller/listings` (approved sellers only)

### Admin (JWT + role=admin)
- `GET /admin/seller-applications`
- `PATCH /admin/seller-applications/:id` `{ status, admin_note? }`
- `POST /admin/areas` `{ name }`
- `POST /admin/categories` `{ name }`
- `POST /admin/delivery-fares` `{ from_area_id, to_area_id, distance_km, fare_ugx }`
- `GET /admin/delivery-fares`
- `GET /admin/analytics`

## Performance and Scale Notes

- Indexed listing filters and full-text search index in PostgreSQL
- Pagination enforced (default 20, max 50 records/request)
- Lightweight, low-bandwidth mobile-first pages
- Lazy image loading in listing grids
- Rate limiting and helmet for API protection
- Structure is ready for Redis cache and object storage integration

## Monetization-Ready Extension Points

- `listings.is_featured` for paid boosts
- `orders` table for transaction/delivery commission workflows
- Admin analytics endpoint for dashboard growth
- Ad slots can be introduced in frontend listing/home modules
