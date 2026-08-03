import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import * as admin from 'firebase-admin';

// Inicializa o Firebase Admin SDK se ainda não foi inicializado.
// As credenciais devem ser fornecidas via variáveis de ambiente para segurança.
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Substitui '\n' por quebras de linha reais
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
}

const firestoreAdmin = admin.firestore();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22' as any,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'No signature' }, { status: 400 });

  try {
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const uid = session.client_reference_id;

      console.log("DEBUG: Evento recebido. UID encontrado:", uid);

      if (uid) {
        // Tenta atualizar
        await firestoreAdmin.collection('sgs_genius').doc(uid).set({
          status: 'active'
        }, { merge: true });
        console.log("DEBUG: Comando de escrita executado para o UID:", uid);
      } else {
        console.log("DEBUG: UID nulo! O cliente_reference_id não veio no evento.");
      }
    }
    
    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}