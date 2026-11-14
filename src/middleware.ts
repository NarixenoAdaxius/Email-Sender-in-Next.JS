import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequestEdge } from '@/lib/edge-auth';

// Protected page routes (redirect to /login when unauthenticated)
const protectedPageRoutes = [
  '/dashboard',
  '/templates',
  '/send-email',
  '/contacts',
  '/history',
  '/settings',
  '/profile',
];

// Protected API route prefixes (return 401 JSON when unauthenticated)
const protectedApiRoutes = [
  '/api/templates',
  '/api/contacts',
  '/api/users',
  '/api/email',
  '/api/user',
  '/api/scheduled-emails',
  '/api/notifications',
  '/api/upload',
];

function matchesRoutePrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Enforce same-origin checks on mutating browser API requests when Origin header is present
  if (pathname.startsWith('/api/') && MUTATING_METHODS.has(request.method)) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    if (origin && host) {
      try {
        if (new URL(origin).host !== host) {
          return NextResponse.json(
            { error: 'Forbidden', message: 'Invalid request origin' },
            { status: 403 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: 'Forbidden', message: 'Invalid request origin' },
          { status: 403 }
        );
      }
    }
  }

  const isProtectedApi = matchesRoutePrefix(pathname, protectedApiRoutes);
  const isProtectedPage = matchesRoutePrefix(pathname, protectedPageRoutes);

  if (isProtectedApi || isProtectedPage) {
    try {
      const user = await getUserFromRequestEdge(request);

      if (user) {
        return NextResponse.next();
      }
    } catch {
      // Treat verification error as unauthenticated
    }

    if (isProtectedApi || pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const url = new URL('/login', request.url);
    url.searchParams.set('callbackUrl', encodeURI(pathname));
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
