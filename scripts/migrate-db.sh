#!/bin/bash

# Database Migration Script for Vision Privacy
# Handles Supabase database migrations and seeding

set -e

echo "🗄️ Vision Privacy Database Migration Script"

# Check if Supabase CLI is installed
check_supabase_cli() {
    if ! command -v supabase &> /dev/null; then
        echo "❌ Supabase CLI is not installed"
        echo "📦 Install it with: npm install -g supabase"
        echo "📖 Or visit: https://supabase.com/docs/guides/cli"
        exit 1
    fi
    echo "✅ Supabase CLI found"
}

# Check environment variables
check_env_vars() {
    if [ -z "$SUPABASE_PROJECT_REF" ] && [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
        echo "❌ Error: SUPABASE_PROJECT_REF or NEXT_PUBLIC_SUPABASE_URL must be set"
        echo "💡 Set SUPABASE_PROJECT_REF to your project reference ID"
        exit 1
    fi
    
    if [ -z "$SUPABASE_ACCESS_TOKEN" ] && [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
        echo "⚠️ Warning: No Supabase access token found"
        echo "💡 You may need to login with: supabase login"
    fi
    
    echo "✅ Environment variables checked"
}

# Link to Supabase project
link_project() {
    echo "🔗 Linking to Supabase project..."
    
    if [ -n "$SUPABASE_PROJECT_REF" ]; then
        supabase link --project-ref "$SUPABASE_PROJECT_REF"
    else
        # Extract project ref from URL
        PROJECT_REF=$(echo "$NEXT_PUBLIC_SUPABASE_URL" | sed -n 's/.*https:\/\/\([^.]*\)\.supabase\.co.*/\1/p')
        if [ -n "$PROJECT_REF" ]; then
            supabase link --project-ref "$PROJECT_REF"
        else
            echo "❌ Could not extract project reference from URL"
            exit 1
        fi
    fi
    
    echo "✅ Project linked successfully"
}

# Run database migrations
run_migrations() {
    echo "📋 Running database migrations..."
    
    # Check if migrations directory exists
    if [ ! -d "supabase/migrations" ]; then
        echo "❌ Migrations directory not found: supabase/migrations"
        exit 1
    fi
    
    # List available migrations
    echo "📁 Available migrations:"
    ls -la supabase/migrations/
    
    # Push migrations to database
    supabase db push
    
    echo "✅ Migrations completed successfully"
}

# Verify database schema
verify_schema() {
    echo "🔍 Verifying database schema..."
    
    # Generate types to verify schema
    supabase gen types typescript --local > /tmp/schema-check.ts
    
    if [ $? -eq 0 ]; then
        echo "✅ Schema verification passed"
        rm -f /tmp/schema-check.ts
    else
        echo "❌ Schema verification failed"
        exit 1
    fi
}

# Reset database (development only)
reset_database() {
    echo "⚠️ WARNING: This will reset the entire database!"
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🔄 Resetting database..."
        supabase db reset
        echo "✅ Database reset completed"
    else
        echo "❌ Database reset cancelled"
        exit 1
    fi
}

# Generate TypeScript types
generate_types() {
    echo "📝 Generating TypeScript types..."
    
    # Generate types for the database schema
    supabase gen types typescript --linked > src/types/supabase.ts
    
    echo "✅ TypeScript types generated at src/types/supabase.ts"
}

# Main function
main() {
    local command=${1:-migrate}
    
    echo "🎯 Command: $command"
    
    case "$command" in
        "migrate"|"push")
            check_supabase_cli
            check_env_vars
            link_project
            run_migrations
            verify_schema
            ;;
        "reset")
            check_supabase_cli
            check_env_vars
            link_project
            reset_database
            ;;
        "types"|"generate-types")
            check_supabase_cli
            check_env_vars
            link_project
            generate_types
            ;;
        "verify")
            check_supabase_cli
            check_env_vars
            link_project
            verify_schema
            ;;
        "help"|"-h"|"--help")
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  migrate         Run database migrations (default)"
            echo "  reset           Reset database (development only)"
            echo "  types           Generate TypeScript types"
            echo "  verify          Verify database schema"
            echo "  help            Show this help message"
            echo ""
            echo "Environment Variables:"
            echo "  SUPABASE_PROJECT_REF    Your Supabase project reference ID"
            echo "  SUPABASE_ACCESS_TOKEN   Your Supabase access token (optional)"
            ;;
        *)
            echo "❌ Unknown command: $command"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
    
    echo "🎉 Database operation completed successfully!"
}

# Run main function with all arguments
main "$@"