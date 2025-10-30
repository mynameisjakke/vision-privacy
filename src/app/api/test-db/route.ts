import { NextResponse } from 'next/server'
import { testDatabaseConnection } from '@/lib/test-db'

export async function GET() {
  try {
    const success = await testDatabaseConnection()
    
    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Database connection test passed' 
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Database connection test failed' 
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Database test error:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Database test error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}