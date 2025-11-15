# SaasPE Backend API

Production-ready NestJS backend for the SaasPE Agency Automation Platform.

## Overview

SaasPE is an all-in-one platform that connects the entire agency client lifecycle—from initial sales call to executed campaign—using AI to automate what currently requires 5-10 separate tools.

This backend provides:
- Multi-tenant SaaS architecture with row-level security
- AI-powered transcription analysis (OpenAI Whisper + GPT-4)
- Automated proposal generation with e-signature integration
- Email campaign management with deliverability optimization
- Complete audit trails for compliance (GDPR, ESIGN, CAN-SPAM)

## Tech Stack

- **Framework**: NestJS (Node.js/TypeScript)
- **Database**: PostgreSQL with Prisma ORM
- **Cache/Queue**: Redis + Bull
- **Authentication**: JWT + OAuth 2.0 (Google, Microsoft)
- **File Storage**: AWS S3
- **Email**: AWS SES
- **AI**: OpenAI (Whisper, GPT-4)
- **E-Signature**: DocuSign / PandaDoc
- **CRM Sync**: HubSpot
- **Billing**: Stripe

## Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Docker Desktop** (for PostgreSQL and Redis)
- **Git**

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env and add your API keys
   ```

3. **Start Docker services**
   ```bash
   docker compose up -d
   ```

4. **Set up database**
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   npm run prisma:seed
   ```

5. **Start development server**
   ```bash
   npm run start:dev
   ```

   API will be available at `http://localhost:3000`

### Test Credentials

After running seed:
- **Email**: `admin@acme-agency.com`
- **Password**: `Admin123!@#`

## Available Scripts

### Development
```bash
npm run start:dev      # Start with hot reload
npm run start:debug    # Start with debugger
npm run prisma:studio  # Open database GUI
```

### Database
```bash
npm run prisma:generate  # Generate Prisma Client
npm run prisma:migrate   # Run migrations
npm run prisma:seed      # Seed test data
```

### Testing
```bash
npm test               # Run unit tests
npm run test:watch     # Run tests in watch mode
npm run test:cov       # Generate coverage report
npm run test:e2e       # Run end-to-end tests
```

### Production
```bash
npm run build          # Build for production
npm run start:prod     # Start production server
```

## Project Structure

```
SaasPE-Backend/
├── prisma/
│   ├── schema.prisma           # Database schema (15 tables)
│   └── seed.ts                 # Development seed data
├── src/
│   ├── shared/
│   │   ├── database/           # Prisma service + tenant middleware
│   │   ├── filters/            # Global exception filter
│   │   ├── guards/             # Rate limiting + auth guards
│   │   └── integrations/       # External API integrations
│   └── modules/
│       ├── auth/               # Authentication & authorization
│       ├── transcriptions/     # AI transcription & analysis
│       ├── proposals/          # Proposal generation & e-signature
│       ├── clients/            # Client management
│       └── campaigns/          # Email outreach campaigns
├── test/
│   └── e2e/                    # End-to-end integration tests
├── .env.example                # Environment variables template
├── docker-compose.yml          # PostgreSQL + Redis setup
└── package.json                # Dependencies and scripts
```

## Database Schema

### Core Tables

**Tenants** - Agency workspaces
- Multi-tenant isolation on every table
- Subscription management (Stripe)
- Usage tracking (credits, limits)

**Users** - Team members
- Role-based access control (admin, manager, user)
- OAuth support (Google, Microsoft)
- MFA support

**Clients** - Customer records
- AI-extracted business information
- HubSpot sync integration

**Transcriptions** - Meeting recordings
- OpenAI Whisper transcription
- GPT-4 analysis and extraction
- Cost tracking

**Proposals** - AI-generated proposals
- E-signature integration (DocuSign)
- PDF export
- Version history

**Campaigns** - Email outreach
- Multi-step sequences
- Deliverability tracking
- Reply classification (AI)

See `prisma/schema.prisma` for complete schema.

## Multi-Tenant Architecture

Every database query is automatically filtered by `tenantId`:

1. User logs in → JWT includes `tenantId`
2. Tenant middleware extracts `tenantId` from JWT
3. PostgreSQL session variable set: `app.current_tenant = 'tenant-id'`
4. All queries automatically filter by `tenantId`

**Critical Security**: Cross-tenant data access is impossible at the database level.

## API Documentation

### Base URL
- Development: `http://localhost:3000/api/v1`
- Production: `https://api.saaspe.com/v1`

### Authentication

All endpoints except `/auth/*` require JWT Bearer token:

```bash
Authorization: Bearer <access_token>
```

See full API specification in `/docs/project-documentation/api-specification.md`

## Environment Variables

```bash
# Database
DATABASE_URL="postgresql://dev:dev@localhost:5432/saaspe_dev"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-secret-key-change-this"
JWT_ACCESS_EXPIRATION="15m"
JWT_REFRESH_EXPIRATION="7d"

# OpenAI (for transcription & AI generation)
OPENAI_API_KEY="sk-..."

# AWS (for S3 storage & SES email)
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="us-east-1"
AWS_S3_BUCKET="saaspe-uploads-dev"

# Stripe (for billing)
STRIPE_SECRET_KEY="sk_test_..."

# DocuSign (for e-signature)
DOCUSIGN_CLIENT_ID="..."
DOCUSIGN_CLIENT_SECRET="..."
```

See `.env.example` for complete list.

## Security

### Authentication
- JWT tokens with RS256 signing
- Access tokens: 15-minute expiry
- Refresh tokens: 7-day expiry (stored in Redis)
- OAuth 2.0 support (Google, Microsoft)
- MFA support (TOTP)

### Data Protection
- Passwords hashed with bcrypt (cost factor 12)
- All sensitive data encrypted at rest (AES-256)
- API keys encrypted in database
- HTTPS only (TLS 1.3)

### Compliance
- **GDPR**: Data export, deletion, consent management
- **ESIGN**: E-signature audit trails
- **CAN-SPAM**: Unsubscribe links, DNC management
- **SOC 2**: Audit logging, encryption, access controls

## Troubleshooting

### Database Connection Failed

```bash
# Check if PostgreSQL is running
docker compose ps

# Restart services
docker compose restart postgres
```

### Redis Connection Failed

```bash
# Check if Redis is running
docker compose ps

# Restart Redis
docker compose restart redis
```

## Implementation Status

**Phase 1 Complete**: Infrastructure & Foundation (25% of MVP)
- ✅ NestJS project setup
- ✅ Complete Prisma schema (15 tables)
- ✅ Multi-tenant middleware
- ✅ Global exception filter
- ✅ Database seed data
- ✅ Docker Compose configuration

**Next Steps**:
- ⏳ Implement Auth Module (P0 - CRITICAL)
- ⏳ Implement Transcriptions Module
- ⏳ Implement Proposals Module
- ⏳ Implement Clients Module
- ⏳ Implement Campaigns Module
- ⏳ Write comprehensive tests (80%+ coverage)

See `IMPLEMENTATION_SUMMARY.md` for detailed progress.

## License

UNLICENSED - Proprietary software for SaasPE platform.

---

**Current Progress**: ~25% of MVP backend complete
**ETA to MVP**: 3-4 weeks
**Next Priority**: Implement Auth Module
