# EUDR Compliance Assistant

**The compliance decision engine for the EU Deforestation Regulation.** Operators
placing coffee, cocoa, cattle, soy, palm oil, rubber or wood on the EU market must
collect plot-level geolocation, prove the goods carry *no more than negligible
deforestation risk*, and file a Due Diligence Statement before shipping. This
application runs that entire loop end-to-end — from collecting supplier data to
generating the statement an operator submits to the EU Information System (TRACES).

It is not just a data collector: it **assesses deforestation risk**, tells the
operator **exactly what to fix**, and turns a clean verdict into the **legal
artifact** they file.

## The compliance loop

```
Collect → Validate → Assess risk → See what to fix → Remediate → Generate & record DDS → Export
```

## Features

- **Deforestation-risk engine** — combines the EU country benchmark (Reg. (EU)
  2025/1093), commodity deforestation pressure, and plot-level verifiability into a
  per-plot conclusion (negligible / standard / high), a per-supplier rollup, and a
  portfolio verdict: **Ready to file / Due diligence in progress / Action required**.
- **Due Diligence Statement (DDS)** — generates the EUDR Art. 33 statement (HS Annex I
  headings, reference number, commodity lines, risk conclusion), downloadable as a
  machine-readable JSON for TRACES and printable as a PDF. Only *fileable* when every
  plot is negligible-risk; otherwise a clearly-marked DRAFT. **Statement history** keeps
  a durable, audit-logged record of what was assessed and filed.
- **Risk-driven mitigation plan** — turns every risk factor into a concrete,
  prioritized task (re-collect geolocation, request polygon, obtain mitigation
  evidence…) with one-click supplier reminders, surfaced on the Risk page and as
  "next best actions" on the dashboard home.
- **Compliance analytics** — a **risk-weighted** Compliance Readiness Score (blends
  data completeness with the deforestation-risk index), collection funnel,
  time-to-compliance, momentum trend, daily score snapshots, and an at-risk supplier
  list with bulk reminders.
- **Supply-chain map** — every production place plotted, recolourable by validation
  status **or** deforestation risk.
- **Supplier management** — invite, import (CSV), and manage suppliers; a public
  portal where invited suppliers submit geolocation; risk badges inline everywhere.
- **EUDR validation** — automatic GeoJSON validation against EUDR geometry rules.
- **Exports** — export-ready GeoJSON bundles for EU Information System submission, with
  optimization and validation reporting.
- **Plans & billing, account security, audit log** — subscription tiers with usage
  limits, change-password / export / delete-account, and a complete activity timeline.
- **Fully bilingual** — every screen localized in English and German, enforced by a
  dictionary key-parity test.

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **UI Components**: Radix UI, Tailwind CSS 4
- **Maps**: Leaflet with react-leaflet
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Custom JWT with refresh tokens
- **Storage**: Cloudflare R2 (S3-compatible)
- **Testing**: Jest + React Testing Library

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Cloudflare R2 account (for file storage)
- Resend account (for emails)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/m1hamuha/EUDR-Compliance-Assistant
cd eudr-compliance-assistant
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Configure your `.env` file with the required credentials:
```env
# Database (Railway PostgreSQL)
DATABASE_URL="postgresql://postgres:password@postgres.railway.internal:5432/railway?schema=public"

# Auth
AUTH_SECRET="generate-with-openssl-rand-base64-32"
REFRESH_SECRET="generate-with-openssl-rand-base64-32"

# Resend (Email)
RESEND_API_KEY="re_xxxxxxxxxxxx"

# Cloudflare R2 (Object Storage)
R2_ACCOUNT_ID="your-account-id"
R2_ACCESS_KEY_ID="your-access-key"
R2_SECRET_ACCESS_KEY="your-secret-key"
R2_BUCKET_NAME="eudr-exports"
R2_PUBLIC_URL="https://your-r2-public-url.com"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

5. Generate the database schema:
```bash
npm run db:generate
npm run db:push
```

6. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

### Try it in 60 seconds

1. Sign up for an account (it logs you straight into the dashboard).
2. On the empty dashboard, click **“Load sample data”** to populate a realistic
   multi-commodity supply chain spanning low-, standard- and high-risk origins.
3. The dashboard greets you with **next best actions**. Follow them:
   - **Risk** → see the portfolio verdict ("Action required"), the per-supplier risk
     breakdown, and the prioritized action plan.
   - **Statement** → generate the Due Diligence Statement; it shows as a DRAFT until the
     risk is resolved, then becomes fileable (download JSON / print PDF) and is recorded.
   - **Analytics** → the risk-weighted readiness score, funnel and momentum;
     **Compliance report** for the printable one-pager.
   - **Map** → toggle plot colours between validation status and deforestation risk.

See **[DEMO.md](./DEMO.md)** for a full guided walkthrough.

`GET /api/health` returns a DB-checked status for uptime monitoring.

## Project Structure

```
src/
├── proxy.ts                # Edge auth middleware (Next.js 16 proxy convention)
├── app/
│   ├── page.tsx           # Public marketing landing page  (/)
│   ├── login/ , signup/   # Authentication pages
│   ├── thank-you/         # Supplier submission confirmation
│   ├── supplier/[token]/  # Public supplier data-collection portal
│   ├── dashboard/         # Authenticated app  (/dashboard, /dashboard/*)
│   │   ├── page.tsx       # Dashboard overview + next-best-actions
│   │   ├── suppliers/     # Supplier management + detail (with risk)
│   │   ├── map/           # Supply-chain map (status / risk colouring)
│   │   ├── analytics/     # Risk-weighted score, funnel, momentum, at-risk
│   │   ├── risk/          # Risk assessment + mitigation action plan
│   │   ├── dds/           # Due Diligence Statement + history
│   │   ├── exports/       # Export generation & history
│   │   ├── billing/       # Plans & usage
│   │   ├── activity/      # Audit timeline
│   │   └── settings/      # Account settings & security
│   ├── report/            # Printable compliance report
│   └── api/
│       ├── auth/          # login, register, refresh, me, logout
│       ├── dashboard/     # aggregated dashboard stats
│       ├── analytics/     # analytics + lazy score snapshots
│       ├── risk/          # portfolio risk assessment
│       ├── mitigation/    # prioritized mitigation plan
│       ├── dds/           # statement + records (history)
│       ├── health/        # DB-checked health endpoint
│       ├── suppliers/     # Supplier CRUD + bulk import + reminders
│       ├── production-places/  # CRUD + GeoJSON (risk-enriched)
│       ├── account/       # usage, plan, password, export, delete
│       ├── audit/         # activity timeline
│       ├── portal/        # Supplier portal submit/complete
│       └── exports/       # Export generation
├── components/            # ui/ , forms/ , maps/ , error/
├── lib/
│   ├── risk.ts            # Deforestation-risk engine (country benchmark + scoring)
│   ├── dds.ts             # Due Diligence Statement builder (HS codes, ref numbers)
│   ├── mitigation.ts      # Risk factors → prioritized remediation tasks
│   ├── analytics.ts       # Risk-weighted score, funnel, momentum, snapshots
│   ├── auth.ts            # JWT, password, rate limiting, sessions
│   ├── prisma.ts          # Database client (pg driver adapter)
│   ├── eudr-validator.ts  # GeoJSON validation
│   ├── i18n/              # EN/DE dictionaries + provider (key-parity tested)
│   ├── env-validation.ts  # Runtime env-var validation (Zod)
│   ├── email.ts           # Transactional email (Resend)
│   └── audit.ts           # Audit logging
├── stores/  hooks/  types/
└── __tests__/             # Unit tests (lib + API route handlers); 217 tests
```

## Routing & Authentication

- `/` — public marketing landing page.
- `/login`, `/signup` — authentication; on success the user is sent to `/dashboard`.
- `/dashboard/*` — the authenticated application. Protected by `src/proxy.ts`,
  which verifies the access-token cookie on the edge and 401s/redirects otherwise.
- `/supplier/[token]` — public portal where invited suppliers submit production
  locations; on completion they land on `/thank-you`.
- Access tokens live 15 minutes; the dashboard transparently calls
  `POST /api/auth/refresh` to mint a new one from the 7-day refresh-token cookie,
  so sessions stay alive without forcing re-login.

## API Documentation

Authentication uses HttpOnly cookies (a 15-minute access token and a 7-day
refresh token). Successful login/register set both cookies automatically.

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "companyName": "Your Company",
  "email": "admin@company.com",
  "password": "SecureP@ss123!",
  "country": "DE"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@company.com",
  "password": "SecureP@ss123!"
}
```

#### Refresh session
Exchanges the `refresh-token` cookie for a new access token (with rotation).
```http
POST /api/auth/refresh
```

#### Current user / Logout
```http
GET  /api/auth/me      # returns the authenticated client
POST /api/auth/logout  # revokes refresh tokens and clears cookies
```

#### Health check
Public endpoint for uptime monitoring; verifies the database connection.
```http
GET /api/health   # 200 { status: "ok" } or 503 when the DB is unreachable
```

### Suppliers

#### Create Supplier
```http
POST /api/suppliers
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "name": "Supplier Name",
  "country": "BR",
  "commodity": "COFFEE",
  "contactEmail": "contact@supplier.com",
  "contactPhone": "+1234567890"
}
```

#### List Suppliers
```http
GET /api/suppliers?page=1&limit=20&status=INVITED&commodity=COFFEE
Authorization: Bearer <access-token>
```

### Production Places

#### Create Production Place
```http
POST /api/production-places
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "supplierId": "supplier-id",
  "name": "Farm A",
  "areaHectares": 10.5,
  "geometryType": "POLYGON",
  "coordinates": [[-60.1, -10.1], [-60.0, -10.1], [-60.0, -10.0], [-60.1, -10.0], [-60.1, -10.1]],
  "country": "BR"
}
```

### Exports

#### Generate Export
```http
POST /api/exports
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "supplierIds": ["id-1", "id-2"],
  "commodity": "COFFEE",
  "convertSmallToPoints": true,
  "includeAuditLog": true
}
```

## EUDR Compliance Validation

The application validates GeoJSON data against EUDR requirements:

- **Coordinate System**: WGS84 (EPSG:4326)
- **Precision**: Minimum 6 decimal places
- **Latitude Range**: -90 to +90
- **Longitude Range**: -180 to +180
- **Polygon Requirements**:
  - Must be closed (first = last point)
  - No self-intersections
  - No holes allowed
  - Minimum 4 vertices
- **Large Plots**: Plots > 4 hectares require polygon geometry

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript type check
npm test            # Run tests
npm run test:watch  # Run tests in watch mode
npm run test:coverage # Run tests with coverage
npm run db:generate # Generate Prisma client
npm run db:push     # Push schema to database
npm run db:migrate  # Run database migrations
npm run db:studio   # Open Prisma Studio
```

## Testing

The project uses Jest and React Testing Library. Tests are located in `__tests__` directories throughout the project.

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run in watch mode
npm run test:watch
```

## Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for a complete step-by-step guide
(Vercel + managed Postgres, environment variables, schema setup, and Docker).

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Railway

1. Connect your repository to Railway
2. Add PostgreSQL service
3. Configure environment variables
4. Deploy

## Security Features

- **Password Requirements**: Minimum 12 characters with uppercase, lowercase, numbers, and special characters
- **Rate Limiting**: 5 login attempts per 15-minute window
- **JWT Authentication**: 15-minute access token, 7-day refresh token
- **CSRF Protection**: Built-in via Next.js middleware
- **Audit Logging**: All actions logged for compliance

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| DATABASE_URL | Yes | PostgreSQL connection string |
| AUTH_SECRET | Yes | JWT secret (32+ characters) |
| REFRESH_SECRET | Yes | Refresh token secret (32+ characters) |
| RESEND_API_KEY | Yes | Resend API key for emails |
| R2_ACCOUNT_ID | Yes | Cloudflare R2 account ID |
| R2_ACCESS_KEY_ID | Yes | R2 access key |
| R2_SECRET_ACCESS_KEY | Yes | R2 secret key |
| R2_BUCKET_NAME | Yes | R2 bucket name |
| R2_PUBLIC_URL | Yes | Public URL for R2 files |
| NEXT_PUBLIC_APP_URL | Yes | Application URL |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions or support, please open an issue in the repository.

## Acknowledgments

- [EUDR Regulation](https://environment.ec.europa.eu/topics/forests/eu-deforestation-regulation_en) - EU Deforestation Regulation
- [Next.js](https://nextjs.org/) - React framework
- [Prisma](https://www.prisma.io/) - Database ORM
- [Radix UI](https://www.radix-ui.com/) - UI components
- [Leaflet](https://leafletjs.com/) - Interactive maps
