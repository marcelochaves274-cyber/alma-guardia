import { NextResponse } from 'next/server';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

if (!getApps().length) {
  initializeApp();
}

export async function POST(request: Request) {
  const authorization = request.headers.get('authorization');
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : '';

  if (!token) {
    return NextResponse.json({ error: 'Autenticação necessária.' }, { status: 401 });
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    const userSnapshot = await getFirestore()
      .collection('sgs_genius')
      .doc(decodedToken.uid)
      .get();
    const promotionalCode = userSnapshot.data()?.promotionalCode;

    if (!userSnapshot.exists || typeof promotionalCode !== 'string' || !promotionalCode.trim()) {
      return NextResponse.json(
        { error: 'Não há código promocional associado a esta conta.' },
        { status: 404 }
      );
    }

    const paymentLink = process.env.PROMOTIONAL_STRIPE_PAYMENT_LINK?.trim();
    if (!paymentLink) {
      return NextResponse.json(
        { error: 'O checkout promocional ainda não foi configurado.' },
        { status: 503 }
      );
    }

    const checkoutUrl = new URL(paymentLink);
    if (checkoutUrl.protocol !== 'https:') {
      return NextResponse.json(
        { error: 'A URL do checkout promocional deve usar HTTPS.' },
        { status: 500 }
      );
    }

    checkoutUrl.searchParams.set('client_reference_id', decodedToken.uid);
    checkoutUrl.searchParams.set('prefilled_promo_code', promotionalCode.trim());

    return NextResponse.json({ url: checkoutUrl.toString() });
  } catch (error) {
    console.error('Erro ao preparar checkout promocional:', error);
    return NextResponse.json(
      { error: 'Não foi possível preparar o checkout promocional.' },
      { status: 500 }
    );
  }
}
