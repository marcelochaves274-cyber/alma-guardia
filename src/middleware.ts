import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('firebase-auth-token');

  const isLoginPage = pathname.startsWith('/login');

  // Se o usuário está logado (tem token) e tenta acessar a página de login
  if (token && isLoginPage) {
    // Redireciona para a página inicial, quebrando o loop.
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Se o usuário não está logado e não está tentando acessar a página de login
  if (!token && !isLoginPage) {
    // Redireciona para a página de login.
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Em todos os outros casos (usuário logado acessando outras páginas, ou usuário não logado acessando o login),
  // permite que a solicitação continue.
  return NextResponse.next();
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
};
