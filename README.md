# RetailPulse - Retail Inventory & Sales Management System

A production-quality, full-stack Retail Inventory and Point-of-Sale (POS) Management System built with **Next.js (App Router, React, TypeScript, Tailwind CSS)**, **Node.js + Express.js (TypeScript)**, and **MongoDB with Mongoose transactions**.

---

## Live Deployments & Documentation
- **Live Frontend (Vercel)**: [https://retail-inventory-system-task-2.vercel.app/](https://retail-inventory-system-task-2.vercel.app/)
- **Live Backend API (Render)**: [https://retailpulse-api-cpjo.onrender.com](https://retailpulse-api-cpjo.onrender.com)
- **Interactive Swagger/OpenAPI**: [https://retailpulse-api-cpjo.onrender.com/api/docs/](https://retailpulse-api-cpjo.onrender.com/api/docs/)
- **Postman Collection**: [`docs/retail-inventory.postman_collection.json`](docs/retail-inventory.postman_collection.json)
- **Architecture & Interview Explainer**: [`docs/EXPLAINER.md`](docs/EXPLAINER.md)

---

## Demo Credentials
| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@demo.com` | `Admin@123` | Full access: CRUD products, stock write-offs/additions, profit reports, approve returns |
| **Staff** | `staff@demo.com` | `Staff@123` | View catalog, receive stock deliveries, process sales checkouts, view sales & low stock |

---

## Key Features & Business Rules
- **Atomic POS Transactions**: MongoDB multi-document transactions (`session.withTransaction`) ensure stock deductions, receipt generation, sequential invoice numbering, and audit movements occur atomically or roll back completely on failure.
- **Race-Condition & Overselling Prevention**: Conditional atomic queries `{ _id, stock: { $gte: quantity } }` prevent overselling under high concurrency.
- **Authoritative Server Pricing**: Client price tampering is ignored; selling prices and costs are snapshotted directly from the database into immutable order items.
- **Append-Only Audit Trail**: Every stock change (shipment received, sale, damage write-off, manual addition, return) creates an immutable `StockMovement` entry with quantity before/after, user, and reason.
- **Sales Returns & Stock Restoration**: Return workflow validates returnable quantities against unreturned balances, restores product stock in a transaction, updates sale status (`PartiallyReturned` / `Returned`), and writes a `RETURN` audit log.
- **Low-Stock Advisory**: Automatically flags products where `stock <= reorderLevel` and computes suggested reorder quantities and estimated procurement costs.
- **Profitability Analysis**: Admin-only report calculates net profit: `sum((unitPrice - unitCost) * qty) - discounts`, net of returned merchandise and refunds.
- **CSV Data Export**: One-click download of filtered sales reports with custom header formatting.
- **Printable Invoices**: Clean, dedicated printable tax invoice views with `@media print` stylesheets.

---

## Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide React, React Hook Form, Zod, Recharts
- **Backend**: Node.js, Express.js, TypeScript, Mongoose, JWT (jsonwebtoken), bcryptjs, Zod, Helmet, CORS, Express-Rate-Limit, Swagger UI
- **Database**: MongoDB (Atlas / Replica Set required for ACID transactions; `mongodb-memory-server` replica set in tests)
- **Testing**: Jest, Supertest, MongoMemoryReplSet (17 integration tests across 4 suites)

---

## Monorepo Architecture

```
retail-inventory-system/
├── client/                     # Next.js 14 TypeScript Frontend
│   ├── src/
│   │   ├── app/                # App Router pages (Dashboard, Products, POS, Inventory, Reports)
│   │   ├── components/         # UI component library & layouts
│   │   ├── lib/                # api.ts (central client), auth-context.tsx, formatters.ts
│   │   └── types/              # Domain TypeScript interfaces
│   ├── .env.example
│   └── package.json
├── server/                     # Express.js TypeScript Backend
│   ├── src/
│   │   ├── config/             # DB connection, env variables, Swagger definition
│   │   ├── controllers/        # Thin HTTP request parsers
│   │   ├── middleware/         # JWT auth, role guards, validation, central error handler
│   │   ├── models/             # Mongoose schemas (User, Product, Sale, StockMovement, SaleReturn, Counter)
│   │   ├── routes/             # Express routers mounted under /api
│   │   ├── scripts/            # Database seed script
│   │   ├── services/           # Business logic & atomic database transactions
│   │   ├── utils/              # AppError, standard response envelope, CSV generator
│   │   └── validators/         # Zod request validation schemas
│   ├── tests/                  # Integration test suites with MongoMemoryReplSet
│   ├── .env.example
│   └── package.json
├── docs/
│   ├── EXPLAINER.md            # Technical interview Q&A & architectural decisions
│   └── retail-inventory.postman_collection.json
├── .gitignore
├── package.json                # Monorepo root scripts
└── README.md
```

---

## API Specification

All responses use a consistent envelope format:
- **Success (200, 201)**: `{ "success": true, "data": ... }`
- **Error (400, 401, 403, 404, 409, 422, 500)**: `{ "success": false, "error": { "code": "...", "message": "...", "details": ... } }`

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | Rate-limited user login returning JWT |
| `GET` | `/api/auth/me` | Authenticated | Current authenticated user profile |
| `GET` | `/api/products` | Authenticated | List products with search, category, stock filter, & pagination |
| `GET` | `/api/products/:id` | Authenticated | Get single product details |
| `POST` | `/api/products` | Admin | Create new catalog product (logs initial movement if stock > 0) |
| `PUT` | `/api/products/:id` | Admin | Update product metadata and pricing |
| `PATCH` | `/api/products/:id/deactivate` | Admin | Deactivate product (preserves sales history) |
| `GET` | `/api/inventory/low-stock` | Authenticated | List products where `stock <= reorderLevel` |
| `POST` | `/api/inventory/adjustments` | Staff / Admin | Receive stock (`Staff`), or add/remove adjustments (`Admin`) |
| `GET` | `/api/inventory/movements` | Authenticated | Query append-only audit trail with filters |
| `POST` | `/api/sales` | Authenticated | Process atomic sale, update inventory, create receipt |
| `GET` | `/api/sales` | Authenticated | List historical sales with pagination and date filters |
| `GET` | `/api/sales/:id` | Authenticated | Get sale invoice details and return history |
| `POST` | `/api/sales/:id/returns` | Admin | Process return, restore inventory, create RETURN movement |
| `GET` | `/api/reports/sales` | Authenticated | Sales aggregate metrics and daily velocity |
| `GET` | `/api/reports/sales/export` | Authenticated | Export sales report as downloadable CSV file |
| `GET` | `/api/reports/profit` | Admin | Calculate gross revenue, COGS, discounts, returns, and net margin |

---

## Local Setup & Development

### Prerequisites
- Node.js >= 18.x (tested on v20.x)
- MongoDB running locally as a Replica Set OR MongoDB Atlas connection string

### 1. Clone & Install Dependencies
```bash
git clone <repository_url>
cd retail-inventory-system

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Environment Variables Configuration

**Server (`server/.env`):**
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/retail_inventory?retryWrites=true&w=majority
JWT_SECRET=super_secret_jwt_key_change_in_production
JWT_EXPIRES_IN=24h
CLIENT_URL=http://localhost:3000
```
*(Copy from `server/.env.example`)*

**Client (`client/.env.local`):**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```
*(Copy from `client/.env.example`)*

### 3. Database Seeding
Populate demo users, 6 categories, 33 products (including low/out of stock items), sample sales, and movements:
```bash
cd server
npm run seed
```

### 4. Running the Development Servers
In two separate terminals:

**Terminal 1 (Backend API):**
```bash
cd server
npm run dev
# Server listening on http://localhost:5000
# Swagger documentation at http://localhost:5000/api/docs
```

**Terminal 2 (Frontend Client):**
```bash
cd client
npm run dev
# Frontend accessible at http://localhost:3000
```

---

## Automated Test Suite
The backend includes a comprehensive Jest test suite powered by `mongodb-memory-server` running an in-memory replica set.

Run the test suite:
```bash
cd server
npm test
```

### Covered Test Cases:
1. **Stock Validation**: Product schema enforces integer stock `>= 0`.
2. **Negative Stock Prevention**: Stock removal adjustments exceeding stock return 409 conflict and leave stock untouched.
3. **Transaction Rollback**: Multi-item sales where one item has insufficient stock roll back completely without modifying inventory or creating records.
4. **Concurrent Sales Protection**: Concurrent requests competing for limited stock cannot oversell; one succeeds and the other receives 409 conflict.
5. **Price Tampering Protection**: Client-provided prices or subtotals are disregarded; totals are recalculated strictly from database prices.
6. **Data Consistency**: Verified consistency across Product stock, immutable Sale item snapshots, and append-only `StockMovement` logs.
7. **Return Restoration**: Sales returns restore product inventory, write a `RETURN` movement, update sale status, and prevent excess returns.
8. **Low-Stock Boundary**: Correctly includes boundary items where `stock == reorderLevel` and filters out items where `stock > reorderLevel`.
9. **Role Authorization**: Enforces that Staff cannot create products or approve returns (403), while Admin can.
10. **Reports & CSV**: Confirms sales aggregation, daily breakdown, profit margins, and valid CSV format download.

---

## Production Deployment Steps

### Backend Deployment (Railway or Render)
1. Link GitHub repository to Railway or Render.
2. Root directory: `/server`.
3. Build command: `npm run build`.
4. Start command: `node dist/server.js`.
5. Set environment variables:
   - `PORT=10000`
   - `NODE_ENV=production`
   - `MONGODB_URI=<Your MongoDB Atlas Connection String with Replica Set>`
   - `JWT_SECRET=<Strong Random Production Secret>`
   - `CLIENT_URL=https://retail-inventory-system-task-2.vercel.app`

### Frontend Deployment (Vercel)
1. Import repository on Vercel.
2. Set Root Directory to `client`.
3. Framework Preset: Next.js.
4. Set environment variable:
   - `NEXT_PUBLIC_API_URL=https://retailpulse-api-cpjo.onrender.com/api`
5. Deploy.
