#!/bin/bash

# Generate secure secrets for production deployment

echo "🔐 Generating secure secrets for Vision Privacy deployment..."
echo ""

# Generate API Secret Key (32 characters)
API_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
echo "API_SECRET_KEY=$API_SECRET"
echo ""

# Generate NextAuth Secret (32 characters)
NEXTAUTH_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
echo "NEXTAUTH_SECRET=$NEXTAUTH_SECRET"
echo ""

# Generate Admin API Token (48 characters)
ADMIN_TOKEN=$(openssl rand -base64 48 | tr -d "=+/" | cut -c1-48)
echo "ADMIN_API_TOKEN=$ADMIN_TOKEN"
echo ""

echo "✅ Secrets generated successfully!"
echo ""
echo "⚠️  IMPORTANT: Save these secrets securely!"
echo "   - Add them to Vercel environment variables"
echo "   - Never commit them to git"
echo "   - Store them in a password manager"