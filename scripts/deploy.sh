#!/bin/bash

# Vision Privacy Deployment Script
# This script handles production deployment to Vercel

set -e

echo "🚀 Starting Vision Privacy deployment..."

# Check if required environment variables are set
check_env_vars() {
    local required_vars=(
        "NEXT_PUBLIC_SUPABASE_URL"
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        "SUPABASE_SERVICE_ROLE_KEY"
        "API_SECRET_KEY"
        "UPSTASH_REDIS_REST_URL"
        "UPSTASH_REDIS_REST_TOKEN"
        "ADMIN_API_TOKEN"
    )
    
    echo "🔍 Checking environment variables..."
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            echo "❌ Error: $var is not set"
            exit 1
        fi
    done
    echo "✅ All required environment variables are set"
}

# Run tests before deployment
run_tests() {
    echo "🧪 Running tests..."
    npm run test:unit
    npm run test:integration
    echo "✅ All tests passed"
}

# Build the application
build_app() {
    echo "🔨 Building application..."
    npm run build
    echo "✅ Build completed successfully"
}

# Deploy to Vercel
deploy_to_vercel() {
    echo "🌐 Deploying to Vercel..."
    
    # Check if this is a production deployment
    if [ "$1" = "production" ]; then
        echo "📦 Deploying to production..."
        vercel --prod --yes
    else
        echo "🔧 Deploying to preview..."
        vercel --yes
    fi
    
    echo "✅ Deployment completed"
}

# Run database migrations
run_migrations() {
    echo "🗄️ Running database migrations..."
    
    # Check if supabase CLI is available
    if ! command -v supabase &> /dev/null; then
        echo "⚠️ Supabase CLI not found. Please run migrations manually."
        echo "   Visit: https://supabase.com/docs/guides/cli"
        return
    fi
    
    # Run migrations
    supabase db push
    echo "✅ Database migrations completed"
}

# Main deployment flow
main() {
    local deployment_type=${1:-preview}
    
    echo "🎯 Deployment type: $deployment_type"
    
    # Pre-deployment checks
    check_env_vars
    
    # Run tests (skip in CI if needed)
    if [ "$SKIP_TESTS" != "true" ]; then
        run_tests
    fi
    
    # Build application
    build_app
    
    # Deploy to Vercel
    deploy_to_vercel "$deployment_type"
    
    # Run migrations for production
    if [ "$deployment_type" = "production" ]; then
        run_migrations
    fi
    
    echo "🎉 Deployment completed successfully!"
    echo "📋 Next steps:"
    echo "   1. Verify the deployment at your Vercel URL"
    echo "   2. Test the API endpoints"
    echo "   3. Check monitoring dashboards"
}

# Handle script arguments
case "$1" in
    "production"|"prod")
        main "production"
        ;;
    "preview"|"staging"|"")
        main "preview"
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [production|preview|help]"
        echo ""
        echo "Commands:"
        echo "  production  Deploy to production environment"
        echo "  preview     Deploy to preview environment (default)"
        echo "  help        Show this help message"
        ;;
    *)
        echo "❌ Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac