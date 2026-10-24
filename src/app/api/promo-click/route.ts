import { NextResponse } from 'next/server';
import { getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

if (!getApps().length) {
  initializeApp();
}

export async function POST() {
  try {
    await getFirestore()
      .collection('public_metrics')
      .doc('promo_button')
      .set(
        {
          clickCount: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    return NextResponse.json({ recorded: true });
  } catch (error) {
    console.error('Erro ao registrar clique promocional:', error);
    return NextResponse.json(
      { error: 'Não foi possível registrar o clique.' },
      { status: 500 }
    );
  }
}
