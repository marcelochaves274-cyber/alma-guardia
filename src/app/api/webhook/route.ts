import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { db } from '@/firebase/config';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia' as any,
});

const webhookSecret = 'whsec_AKRrzii9dpNiCGEqvmK4r6bzhFV0K5Bn';

export async function POST(req: Request) {
  try {
    const reqBuffer = await req.arrayBuffer();
    const rawBody = Buffer.from(reqBuffer);

    const headerList = await headers();
    const signature = headerList.get('stripe-signature') as string;

    if (!signature) {
      return new Response('Missing signature', { status: 400 });
    }

    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    // Evento disparado quando o pagamento é concluído com sucesso
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userEmail = session.customer_details?.email || session.customer?.toString();

      console.log("🔍 DEBUG: Evento recebido. Email encontrado:", userEmail);

      if (userEmail && userEmail.includes('@')) {
        // Registro na coleção sgs_genius
        await setDoc(doc(db, 'sgs_genius', userEmail), {
          status: 'pago',
          updatedAt: serverTimestamp(),
          checkoutSessionId: session.id,
          subscriptionId: session.subscription?.toString() || null
        }, { merge: true });
        
        console.log(`✅ Usuário ${userEmail} atualizado com sucesso no Firestore.`);
      }
    }

    return NextResponse.json({ received: true });

  } catch (err: any) {
    console.error(`❌ Erro no processamento do Webhook: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
}