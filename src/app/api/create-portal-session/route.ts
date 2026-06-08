import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Certifique-se de que a variável de ambiente STRIPE_SECRET_KEY está no seu .env.local
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16' as any, // Mantendo compatibilidade com seu setup atual
});

export async function POST(req: Request) {
  try {
    const { customerId } = await req.json();

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID não encontrado' }, { status: 400 });
    }

    // O return_url deve apontar para a rota de dashboard ou assinatura
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${new URL(req.url).origin}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro interno';
    console.error('Erro ao criar sessão do portal:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}