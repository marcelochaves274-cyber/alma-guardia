import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { db } from '@/firebase/config';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
export const runtime = 'nodejs'; // Força o uso do Node.js
export const dynamic = 'force-dynamic';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

const webhookSecret = 'whsec_f43725360053c9d9e077125f59b58624cdd2fd4b28bc4859b11f5f742dcdbc9d';

export async function POST(req: Request) {
  // No Next.js 15, precisamos ler o corpo como arrayBuffer para não corromper a assinatura
  const reqBuffer = await req.arrayBuffer();
  const body = Buffer.from(reqBuffer);
  
  const headerList = await headers();
  const signature = headerList.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`❌ Erro na assinatura do Webhook: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Evento disparado quando o pagamento é concluído com sucesso
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userEmail = session.customer_details?.email || session.customer?.toString();

    console.log("🔍 DEBUG: Evento recebido. Email encontrado:", userEmail);

    if (userEmail && userEmail.includes('@')) {
      try {
        // Registro na coleção sgs_genius
        await setDoc(doc(db, 'sgs_genius', userEmail), {
          email: userEmail,
          status: 'aguardando_cadastro',
          updatedAt: serverTimestamp()
        }, { merge: true });

        console.log(`✅ Acesso autorizado no Firestore para: ${userEmail}`);
      } catch (dbError) {
        console.error("❌ Erro ao salvar no Firestore:", dbError);
      }
    }
  }

  return NextResponse.json({ received: true });
}