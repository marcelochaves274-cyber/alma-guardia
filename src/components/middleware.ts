import { NextResponse, type NextRequest } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Decodifique a chave de serviço que está em base64 no seu .env.local
const serviceAccount = JSON.parse(
  Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!, 'base64').toString('utf-8')
);

// Garante que o app Firebase Admin seja inicializado apenas uma vez
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('__session')?.value;

  // Se não houver cookie de sessão, redireciona para o login
  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    // Verifica o cookie de sessão para obter o usuário autenticado
    const decodedToken = await getAuth().verifySessionCookie(sessionCookie, true);
    const userUid = decodedToken.uid;

    // Chave Mestra: Permite acesso direto
    if (decodedToken.email === 'sgsburacodopadre@gmail.com') {
      return NextResponse.next();
    }

    // Verifica o status da assinatura no Firestore
    const userDoc = await getFirestore().collection('sgs_genius').doc(userUid).get();
    if (userDoc.exists && userDoc.data()?.status === 'active') {
      return NextResponse.next(); // Assinatura ativa, permite o acesso
    }
  } catch (error) {
    // Em caso de erro (ex: cookie inválido), limpa o cookie e redireciona para o login
    console.error('Middleware Auth Error:', error);
  }

  // Se a assinatura não for ativa ou ocorrer um erro, redireciona para a página de checkout
  const checkoutUrl = new URL('https://buy.stripe.com/7sY5kDb2ldCL8Dt4I7aZi00');
  checkoutUrl.searchParams.set('client_reference_id', sessionCookie ? (await getAuth().verifySessionCookie(sessionCookie)).uid : '');
  return NextResponse.redirect(checkoutUrl);
}

// Define o matcher para aplicar o middleware apenas na rota do dashboard
export const config = {
  matcher: '/dashboard/:path*',
};