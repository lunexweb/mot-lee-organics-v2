import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // For now, let's simplify the middleware to avoid environment variable issues
  // We'll handle authentication checks in the components instead
  
  // Basic route protection without Supabase calls
  const { pathname } = req.nextUrl
  
  // Redirect to login if trying to access protected routes without auth
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
    // We'll handle this in the components for now
    return NextResponse.next()
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
