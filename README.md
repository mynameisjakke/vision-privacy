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

## Next Steps

1. Set up Supabase database schema (Task 2.1)
2. Implement remaining API endpoints (Tasks 3.1-3.3)
3. Build JavaScript widget (Task 5)
4. Create WordPress plugin (Task 6)

## License

Private - Vision Media Internal Use Only