// Test script to verify database connection and operations
import { config } from 'dotenv'
config({ path: '.env.local' })

import { DatabaseUtils, SitesDB, CookieCategoriesDB } from './database'

export async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...')
  
  try {
    // Test 1: Health check
    const isHealthy = await DatabaseUtils.healthCheck()
    console.log('✅ Database health check:', isHealthy ? 'PASSED' : 'FAILED')
    
    if (!isHealthy) {
      throw new Error('Database health check failed')
    }

    // Test 2: Get basic stats
    const stats = await DatabaseUtils.getStats()
    console.log('📊 Database stats:', stats)

    // Test 3: List cookie categories (should have seed data)
    const categories = await CookieCategoriesDB.listActive()
    console.log('🍪 Cookie categories found:', categories.length)
    
    if (categories.length === 0) {
      console.log('⚠️  No cookie categories found - seed data might not be loaded')
    } else {
      console.log('✅ Cookie categories:', categories.map(c => c.name).join(', '))
    }

    // Test 4: Try to list sites (should be empty initially)
    const sites = await SitesDB.list()
    console.log('🌐 Sites found:', sites.data.length)

    console.log('🎉 All database tests passed!')
    return true

  } catch (error) {
    console.error('❌ Database test failed:', error)
    return false
  }
}

// Export for use in API routes or scripts
export default testDatabaseConnection