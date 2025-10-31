import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function GET(request: NextRequest) {
  try {
    // Read the widget JavaScript file
    const widgetPath = join(process.cwd(), 'public', 'vision-privacy-widget.js')
    const widgetContent = await readFile(widgetPath, 'utf-8')
    
    // Create response with appropriate headers
    const response = new NextResponse(widgetContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600', // 1 hour cache
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })
    
    return response
    
  } catch (error) {
    console.error('Failed to serve widget script:', error)
    
    return new NextResponse('Widget script not found', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain',
      }
    })
  }
}

export async function POST() {
  return new NextResponse('Method not allowed', { status: 405 })
}

export async function PUT() {
  return new NextResponse('Method not allowed', { status: 405 })
}

export async function DELETE() {
  return new NextResponse('Method not allowed', { status: 405 })
}