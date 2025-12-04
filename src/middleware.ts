import { NextResponse, type NextRequest } from 'next/server';

// Este middleware está desativado para simplificar a lógica de autenticação
// e resolver conflitos de carregamento. A verificação de rota agora é 
// gerenciada no lado do cliente (em page.tsx e login/page.tsx).
export async function middleware(request: NextRequest) {
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
