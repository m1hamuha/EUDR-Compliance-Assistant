# EUDR Compliance Assistant

A comprehensive web application for companies to comply with the EU Deforestation Regulation (EUDR) by collecting, validating, and managing supplier production location data with geographic coordinates.

## Features

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

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── suppliers/     # Supplier CRUD operations
│   │   ├── production-places/  # Production place endpoints
│   │   └── exports/       # Export generation
│   └── ...                # Page components
├── components/
│   ├── ui/               # Reusable UI components
│   ├── forms/            # Form components
│   ├── maps/             # Map-related components
│   └── error/            # Error boundary
├── lib/
│   ├── auth.ts           # Authentication utilities
│   ├── prisma.ts         # Database client
│   ├── eudr-validator.ts # GeoJSON validation
│   ├── geojson.ts        # Export generation
│   ├── email.ts          # Email utilities
│   └── audit.ts          # Audit logging
├── stores/               # Zustand state stores
├── hooks/                # Custom React hooks
├── types/                # TypeScript type definitions
└── __tests__/            # Test files
```

## API Documentation

### Authentication

#### Register
```http
POST /api/auth
Content-Type: application/json

{
  "mode": "register",
  "companyName": "Your Company",
  "email": "admin@company.com",
  "password": "SecureP@ss123!",
  "country": "DE"
}
```

#### Login
```http
POST /api/auth
Content-Type: application/json

{
  "mode": "login",
  "email": "admin@company.com",
  "password": "SecureP@ss123!"
}
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
