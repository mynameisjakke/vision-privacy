#!/bin/bash

# Environment Setup Script for Vision Privacy
# Helps configure environment variables for different deployment environments

set -e

echo "🔧 Vision Privacy Environment Setup"

# Generate secure random strings
generate_secret() {
    local length=${1:-32}
    openssl rand -base64 $length | tr -d "=+/" | cut -c1-$length
}

# Setup development environment
setup_development() {
    echo "🛠️ Setting up development environment..."
    
    if [ ! -f ".env.local" ]; then
        echo "📝 Creating .env.local from template..."
        cp .env.example .env.local
        
        # Generate secure secrets
        API_SECRET=$(generate_secret 32)
        NEXTAUTH_SECRET=$(generate_secret 32)
        ADMIN_TOKEN=$(generate_secret 48)
        
        # Update .env.local with generated secrets
        sed -i.bak "s/your_api_secret_key/$API_SECRET/g" .env.local
        sed -i.bak "s/your_nextauth_secret/$NEXTAUTH_SECRET/g" .env.local
        sed -i.bak "s/your_secure_admin_token_here_minimum_32_characters/$ADMIN_TOKEN/g" .env.local
        
        # Clean up backup file
        rm -f .env.local.bak
        
        echo "✅ .env.local created with secure secrets"
        echo "⚠️ Please update Supabase and Redis URLs in .env.local"
    else
        echo "ℹ️ .env.local already exists"
    fi
}

# Setup production environment variables for Vercel
setup_production() {
    echo "🚀 Setting up production environment..."
    
    # Check if Vercel CLI is available
    if ! command -v vercel &> /dev/null; then
        echo "❌ Vercel CLI not found. Install with: npm install -g vercel"
        exit 1
    fi
    
    echo "🔐 Setting up production environment variables..."
    
    # Generate production secrets
    API_SECRET=$(generate_secret 32)
    NEXTAUTH_SECRET=$(generate_secret 32)
    ADMIN_TOKEN=$(generate_secret 48)
    
    echo "📋 Please set these environment variables in Vercel:"
    echo ""
    echo "Required Supabase Variables:"
    echo "  NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url"
    echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_supabase_anon_key"
    echo "  SUPABASE_SERVICE_ROLE_KEY=your_production_supabase_service_role_key"
    echo ""
    echo "Generated Secrets (save these securely):"
    echo "  API_SECRET_KEY=$API_SECRET"
    echo "  NEXTAUTH_SECRET=$NEXTAUTH_SECRET"
    echo "  ADMIN_API_TOKEN=$ADMIN_TOKEN"
    echo ""
    echo "Redis Configuration:"
    echo "  UPSTASH_REDIS_REST_URL=your_upstash_redis_rest_url"
    echo "  UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_rest_token"
    echo ""
    echo "Other Configuration:"
    echo "  NODE_ENV=production"
    echo "  NEXT_PUBLIC_WIDGET_CDN_URL=https://your-domain.vercel.app"
    echo "  NEXT_PUBLIC_API_URL=https://your-domain.vercel.app"
    echo "  CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://anotherdomain.com"
    echo "  RATE_LIMIT_ENABLED=true"
    echo ""
    
    read -p "Do you want to set these automatically via Vercel CLI? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🔧 Setting environment variables via Vercel CLI..."
        
        # Set the generated secrets
        vercel env add API_SECRET_KEY production <<< "$API_SECRET"
        vercel env add NEXTAUTH_SECRET production <<< "$NEXTAUTH_SECRET"
        vercel env add ADMIN_API_TOKEN production <<< "$ADMIN_TOKEN"
        vercel env add NODE_ENV production <<< "production"
        vercel env add RATE_LIMIT_ENABLED production <<< "true"
        
        echo "✅ Basic environment variables set"
        echo "⚠️ Please manually set Supabase and Redis URLs via Vercel dashboard"
    fi
}

# Validate environment configuration
validate_environment() {
    echo "🔍 Validating environment configuration..."
    
    local env_file=${1:-.env.local}
    
    if [ ! -f "$env_file" ]; then
        echo "❌ Environment file not found: $env_file"
        exit 1
    fi
    
    # Source the environment file
    set -a
    source "$env_file"
    set +a
    
    # Check required variables
    local required_vars=(
        "NEXT_PUBLIC_SUPABASE_URL"
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        "SUPABASE_SERVICE_ROLE_KEY"
        "API_SECRET_KEY"
        "ADMIN_API_TOKEN"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ] || [ "${!var}" = "your_${var,,}" ] || [[ "${!var}" == *"your_"* ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -eq 0 ]; then
        echo "✅ All required environment variables are properly configured"
    else
        echo "❌ Missing or incomplete environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        exit 1
    fi
}

# Show environment status
show_status() {
    echo "📊 Environment Status:"
    echo ""
    
    # Check development environment
    if [ -f ".env.local" ]; then
        echo "🛠️ Development: .env.local exists"
        validate_environment ".env.local" 2>/dev/null && echo "   ✅ Valid configuration" || echo "   ⚠️ Needs configuration"
    else
        echo "🛠️ Development: Not configured"
    fi
    
    # Check if in git repository
    if git rev-parse --git-dir > /dev/null 2>&1; then
        echo "📦 Git: Repository initialized"
        
        # Check if Vercel is configured
        if [ -f ".vercel/project.json" ]; then
            echo "🚀 Vercel: Project linked"
        else
            echo "🚀 Vercel: Not linked (run 'vercel' to link)"
        fi
    else
        echo "📦 Git: Not initialized"
    fi
    
    # Check if Supabase is configured
    if [ -f "supabase/config.toml" ]; then
        echo "🗄️ Supabase: Project configured"
    else
        echo "🗄️ Supabase: Not configured (run 'supabase init')"
    fi
}

# Main function
main() {
    local command=${1:-status}
    
    case "$command" in
        "dev"|"development")
            setup_development
            ;;
        "prod"|"production")
            setup_production
            ;;
        "validate")
            validate_environment "${2:-.env.local}"
            ;;
        "status")
            show_status
            ;;
        "help"|"-h"|"--help")
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  dev          Setup development environment"
            echo "  prod         Setup production environment"
            echo "  validate     Validate environment configuration"
            echo "  status       Show environment status (default)"
            echo "  help         Show this help message"
            ;;
        *)
            echo "❌ Unknown command: $command"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"