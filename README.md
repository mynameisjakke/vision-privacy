# Vision Privacy

Centralized privacy and cookie policy management for 700+ WordPress sites. This system provides GDPR/IMY-compliant cookie consent management through a scalable SaaS platform.

## Architecture

- **Backend API**: Next.js serverless functions hosted on Vercel
- **Database**: Supabase PostgreSQL with real-time capabilities  
- **JavaScript Widget**: Lightweight client-side consent management
- **WordPress Plugin**: PHP plugin for site registration and widget injection

## Getting Started

### Prerequisites

- Node.js 18+ 
- Supabase account and project
- Vercel account (for deployment)

### Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Configure your Supabase credentials in `.env.local`

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) to see the API status page

### API Endpoints

- `GET /api/health` - Health check endpoint
- `POST /api/sites/register` - Register a new WordPress site
- `GET /api/widget/{site_id}` - Get widget configuration
- `POST /api/consent` - Store visitor consent
- `POST /api/scan` - Report client-side scan results
- `GET /api/policy/{site_id}/{policy_type}` - Get rendered policy content
- `GET /api/demo-policy/{policy_type}` - Get demo policy content

For detailed API documentation, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md).

### Environment Variables

See `.env.example` for required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `API_SECRET_KEY` - Secret key for API authentication
- `NEXT_PUBLIC_WIDGET_CDN_URL` - CDN URL for widget delivery

### Deployment

Deploy to Vercel:

```bash
vercel --prod
```

Make sure to configure environment variables in your Vercel dashboard.

For detailed deployment instructions, see:
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Complete deployment guide
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Deployment checklist
- [DEPLOYMENT_COMMANDS.md](./DEPLOYMENT_COMMANDS.md) - Quick command reference

## Project Structure

```
src/
├── app/                 # Next.js app router
│   ├── api/            # API routes
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Home page
├── lib/                # Core libraries
│   ├── supabase.ts     # Database client
│   └── validation.ts   # Input validation schemas
├── types/              # TypeScript type definitions
│   └── index.ts        # Core types
├── utils/              # Utility functions
│   ├── auth.ts         # Authentication helpers
│   ├── crypto.ts       # Cryptographic functions
│   └── response.ts     # API response helpers
└── middleware.ts       # Next.js middleware
```

## Requirements Addressed

This implementation addresses the following requirements:

- **6.1**: Backend API responds within 200ms under normal load
- **6.2**: Lightweight widget (< 50KB) with async loading
- **6.3**: Supabase database with appropriate indexes for fast lookups

## Documentation

- [API Documentation](./API_DOCUMENTATION.md) - Complete API reference
- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Step-by-step deployment instructions
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md) - Deployment tracking checklist
- [Deployment Commands](./DEPLOYMENT_COMMANDS.md) - Quick command reference
- [Testing Guide](./TESTING-GUIDE.md) - Testing procedures
- [Manual Testing Guide](./.kiro/specs/policy-system-implementation/MANUAL_TESTING_GUIDE.md) - Policy system manual tests

## Features

### Policy System
- Dynamic policy rendering with site-specific data
- Cookie Policy and Privacy Policy support
- Template variable replacement
- Multi-layer caching for performance
- Demo environment for testing
- Cross-policy navigation
- Accessibility compliant (WCAG AA)
- Mobile responsive design

### Cookie Consent Management
- GDPR/IMY compliant cookie banner
- Granular consent categories (Essential, Functional, Analytics, Advertising)
- Consent storage and tracking
- Cookie scanning and detection
- WordPress plugin integration

## License

Private - Vision Media Internal Use Only