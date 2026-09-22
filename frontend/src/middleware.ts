import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/accept-invite'];
const PROTECTED_PREFIXES = ['/platform', '/organization', '/member'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Refresh alone is not enough — after logout / expired access it can linger and
  // would bounce /login → / forever while /api/auth/me returns 401.
  const hasAccess = request.cookies.has('orgflow_access');
  const hasRefresh = request.cookies.has('orgflow_refresh');
  const hasSession = hasAccess || hasRefresh;

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isAuthPage = AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  if (isProtected && !hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Only skip auth pages when access cookie is present (likely still logged in).
  // Orphaned refresh cookies must not block Sign in / Register.
  if (hasAccess && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
