# EUDR Compliance Assistant

A comprehensive web application for companies to comply with the EU Deforestation Regulation (EUDR) by collecting, validating, and managing supplier production location data with geographic coordinates.

## Features

- **Compliance Analytics**: A Compliance Readiness Score, collection funnel, time-to-compliance, and an at-risk supplier list with one-click bulk reminders to drive completion
- **Supplier Management**: Invite and manage suppliers across your supply chain
- **Geolocation Collection**: Collect production place coordinates using interactive maps
- **EUDR Validation**: Automatic validation of GeoJSON data against EUDR requirements
- **Compliance Reporting**: Generate export-ready reports for EU Information System submission
- **Audit Logging**: Complete audit trail for compliance verification
- **Multi-language Support**: English and German localization

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

### Try it in 30 seconds

1. Sign up for an account (it logs you straight into the dashboard).
2. On the empty dashboard, click **“Load sample data”** to populate a realistic
   8-supplier supply chain.
3. Open **Analytics** to see the Compliance Readiness Score, funnel, momentum,
   and the at-risk list, then **Compliance report** for the printable one-pager.

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
│   │   ├── page.tsx       # Dashboard overview
│   │   ├── suppliers/     # Supplier management
│   │   ├── exports/       # Export generation & history
│   │   └── settings/      # Account settings
│   └── api/
│       ├── auth/          # login, register, refresh, me, logout
│       ├── dashboard/     # aggregated dashboard stats
│       ├── health/        # DB-checked health endpoint
│       ├── suppliers/     # Supplier CRUD + bulk import
│       ├── production-places/
│       ├── portal/        # Supplier portal submit/complete
│       └── exports/       # Export generation
├── components/            # ui/ , forms/ , maps/ , error/
├── lib/
│   ├── auth.ts            # JWT, password, rate limiting, sessions
│   ├── prisma.ts          # Database client (pg driver adapter)
│   ├── eudr-validator.ts  # GeoJSON validation
│   ├── geojson.ts         # Export generation
│   ├── api-response.ts    # Standardised API envelope + correlation IDs
│   ├── env-validation.ts  # Runtime env-var validation (Zod)
│   ├── email.ts           # Transactional email (Resend)
│   └── audit.ts           # Audit logging
├── stores/  hooks/  types/
└── __tests__/             # Unit tests (lib + API route handlers)
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
