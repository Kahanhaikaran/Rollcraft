# RollCraft (Inventory + Attendance + Payroll)

Minimal inventory management for a cloud kitchen network (1 King kitchen + multiple branches) with:
- Inventory (items, stock ledger, adjustments)
- Purchases (receive stock with costing)
- Transfers (request/approve/dispatch/receive)
- Attendance (geo-fenced check-in/out)
- Payroll (period generation, unpaid reminders)

## Prerequisites
- Node.js (LTS)
- PostgreSQL

## Setup

### 1) Server
Copy env file and edit secrets/DB:

```bash
cd server
cp .env.example .env
```

Install deps and set up DB:

```bash
cd server
npm install
npx prisma generate
npx prisma migrate dev
```

Run the API:

```bash
cd server
npm run dev
```

Health check: `http://localhost:4000/health`

### 2) Client

```bash
cd client
npm install
```

Create `client/.env`:

```env
VITE_API_BASE=http://localhost:4000
```

Run:

```bash
cd client
npm run dev
```

Open `http://localhost:5173`

## Quick test plan
- Create an ADMIN user via DB (or add a seed script) and log in.
- Create kitchens (King + Branch) in Settings.
- Create items via API (`POST /items`) and receive purchases (`POST /purchases/po`) to add stock.
- Create transfer, approve, dispatch, receive and verify stock changes.
- Configure kitchen geofence coordinates and test attendance check-in/out.
- Generate payroll period and view unpaid entries.

