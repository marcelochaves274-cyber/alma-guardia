import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cookie = request.cookies.get('firebase-auth-edge');

  // Allow access to the login page itself
  if (pathname.startsWith('/login')) {
    // If user is logged in and tries to access login page, redirect to home
    if (cookie) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }
    
  // Allow access to API routes and static files, these are not protected
  if (pathname.startsWith('/api') || pathname.startsWith('/_next/static') || pathname.startsWith('/_next/image') || pathname.endsWith('.ico')) {
    return NextResponse.next();
  }

  // If there's no auth cookie, redirect to the login page.
  if (!cookie) {
    const loginUrl = new URL('/login', request.url);
    // you can add a `next` query parameter to redirect back to the original page
    loginUrl.searchParams.set('next', pathname); 
    return NextResponse.redirect(loginUrl);
  }
  
  // If we are here, the user is authenticated, so we can continue.
  return NextResponse.next();
}

// This will apply the middleware to all routes except the ones specified.
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
};
