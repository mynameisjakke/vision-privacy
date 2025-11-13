# Vision Privacy

Centralized privacy and cookie policy management for 700+ WordPress sites. This system provides GDPR/IMY-compliant cookie consent management through a scalable SaaS platform.

**Current Version**: 1.0.5  
**Status**: ✅ Production Ready  
**Live API**: https://vision-privacy.vercel.app

## Quick Start

### For WordPress Users
1. Download the latest plugin: [`vision-privacy-1.0.5.zip`](./vision-privacy-1.0.5.zip)
2. Install in WordPress: Plugins → Add New → Upload Plugin
3. Activate and the plugin will automatically register your site
4. Widget loads automatically on your site

### For Developers
```bash
# Clone and install
git clone https://github.com/mynameisjakke/vision-privacy.git
cd vision-privacy
npm install

# Set up environment
cp .env.example .env.local
# Add your Supabase credentials

# Run locally
npm run dev
```

## Architecture

- **Backend API**: Next.js serverless functions hosted on Vercel
- **Database**: Supabase PostgreSQL with real-time capabilities  
- **JavaScript Widget**: Lightweight client-side consent management
- **WordPress Plugin**: PHP plugin (v1.0.5) with smart registration system

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

#### Core Endpoints
- `GET /api/health` - Health check endpoint
- `POST /api/sites/register` - Register or update WordPress site (smart registration)
- `GET /api/sites/verify/{siteId}` - Verify existing site registration ✨ NEW in v1.0.5
- `GET /api/widget/script` - Get widget script
- `POST /api/consent` - Store visitor consent
- `POST /api/scan` - Report client-side scan results

#### Policy Endpoints
- `GET /api/policy/{site_id}/{policy_type}` - Get rendered policy content
- `GET /api/demo-policy/{policy_type}` - Get demo policy content

For detailed API documentation, see [docs/api/API_DOCUMENTATION.md](./docs/api/API_DOCUMENTATION.md).

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

For detailed deployment instructions, see [docs/deployment/](./docs/deployment/).

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

### API Documentation
- [API Reference](./docs/api/API_DOCUMENTATION.md) - Complete API reference
- [API Testing Guide](./docs/api/TEST_API_ENDPOINTS.md) - Testing endpoints

### Deployment
- [Deployment Guides](./docs/deployment/) - Deployment instructions and checklists
- [Latest Deployment](./docs/deployment/DEPLOYMENT_SUCCESS.md) - v1.0.5 deployment status

### WordPress Plugin
- [Plugin Documentation](./wordpress-plugin/README.md) - WordPress plugin guide
- [Plugin Changelog](./wordpress-plugin/CHANGELOG.md) - Version history
- [Installation Guide](./wordpress-plugin/INSTALL.md) - Installation instructions

### Development
- [Testing Guide](./docs/TESTING-GUIDE.md) - Testing procedures
- [Architecture Docs](./docs/) - Additional documentation

## Features

### Smart Registration System (v1.0.5) ✨
- **Duplicate Prevention**: Automatically detects and prevents duplicate site registrations
- **Site Verification**: Validates existing registrations before creating new ones
- **Data Continuity**: Maintains consistent site_id across plugin reinstalls
- **Update Support**: Updates existing sites instead of creating duplicates

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
- WordPress plugin integration (v1.0.5)

## License

Private - Vision Media Internal Use Only