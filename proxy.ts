import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCookieName } from './lib/session';
import { verifyToken } from './lib/auth';

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow access to login page, auth API routes, and health check
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/health')
  ) {
    return NextResponse.next();
  }

  // Get auth token from cookie
  const token = request.cookies.get(getCookieName())?.value;

  // Redirect to login if no token
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Verify token
  const payload = verifyToken(token);

  // Redirect to login if token is invalid
  if (!payload) {
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    // Clear invalid cookie
    response.cookies.delete(getCookieName());
    return response;
  }

  // Accountant role restriction - only allow access to accounting page and related API routes
  if (payload.role === 'Accountant') {
    const isAccountingPage = pathname === '/accounting' || pathname.startsWith('/accounting/');
    const isAccountingApi = pathname.startsWith('/api/expenses') ||
                           pathname.startsWith('/api/projects') ||
                           pathname.startsWith('/api/my-projects') ||
                           pathname.startsWith('/api/clients') ||
                           pathname.startsWith('/api/categories') ||
                           pathname.startsWith('/api/user-preferences');

    if (!isAccountingPage && !isAccountingApi) {
      // Redirect Accountants to accounting page if they try to access other routes
      const accountingUrl = new URL('/accounting', request.url);
      return NextResponse.redirect(accountingUrl);
    }
  }

  // Allow access to protected routes
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/auth/* (authentication endpoints)
     * - login (login page)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - manifest.json (PWA manifest)
     * - icon-*.png (PWA icons)
     * - sw.js (service worker)
     */
    '/((?!api/auth|login|_next/static|_next/image|favicon.ico|manifest.json|icon-.*\\.png|sw.js).*)',
  ],
};
