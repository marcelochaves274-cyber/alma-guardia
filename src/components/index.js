// functions/index.js
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Initialize Firebase Admin SDK
initializeApp();

exports.createStripeSubscription = onCall(async (request) => {
  // 1. Verificação de Autenticação
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'O usuário deve estar logado para criar uma assinatura.');
  }

  const { email, priceId } = request.data;
  const uid = request.auth.uid;
  const db = getFirestore();

  if (!email || !priceId) {
    throw new HttpsError('invalid-argument', 'Email e priceId são obrigatórios.');
  }

  try {
    // 2. Criar ou buscar cliente no Stripe
    let stripeCustomerId;
    const userDocRef = db.collection("users").doc(uid);
    const userDoc = await userDocRef.get();
    const userData = userDoc.data();

    if (userData?.stripeCustomerId) {
      stripeCustomerId = userData.stripeCustomerId;
    } else {
      // Create a new customer in Stripe
      const customer = await stripe.customers.create({
        email: email,
        metadata: { firebaseUID: uid },
      });
      stripeCustomerId = customer.id;
      // Save the Stripe Customer ID to Firestore
      await userDocRef.set({ stripeCustomerId: stripeCustomerId }, { merge: true });
    }

    // 3. Criar uma Chave Efêmera (Necessária para o Payment Sheet no mobile)
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: stripeCustomerId },
      { apiVersion: '2022-11-15' } // Use a versão da API Stripe que você está usando
    );

    // 4. Criar a Assinatura (Subscription)
    // O status inicial será 'incomplete' até o primeiro pagamento ser confirmado
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'], // Expande o Payment Intent para obter o client_secret
    });

    // 5. Retornar os dados necessários para o Frontend inicializar o Payment Sheet
    return {
      subscriptionId: subscription.id,
      paymentIntentClientSecret: subscription.latest_invoice.payment_intent.client_secret,
      ephemeralKeySecret: ephemeralKey.secret,
      customerId: stripeCustomerId,
    };
  } catch (error) {
    console.error('Erro ao criar assinatura:', error);
    // Re-throw as HttpsError for client-side handling
    throw new HttpsError('internal', error.message || 'Erro interno ao processar assinatura.');
  }
});

exports.stripeWebhook = onRequest({ secrets: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"] }, async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // O Stripe exige o corpo bruto (rawBody) para validar a assinatura digital
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err) {
    console.error(`Erro na assinatura do Webhook: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const db = getFirestore();
  const data = event.data.object;
  const customerId = data.customer;

  // Helper para buscar o documento do usuário pelo ID do Stripe
  const findUserByCustomer = async (cid) => {
    const snapshot = await db.collection("users").where("stripeCustomerId", "==", cid).limit(1).get();
    return snapshot.empty ? null : snapshot.docs[0].ref;
  };

  switch (event.type) {
    case "customer.subscription.deleted": {
      const userRef = await findUserByCustomer(customerId);
      if (userRef) {
        await userRef.update({ status_assinatura: "inactive" });
        console.log(`Assinatura encerrada: ${customerId}`);
      }
      break;
    }

    case "invoice.payment_succeeded": {
      const userRef = await findUserByCustomer(customerId);
      if (userRef) {
        const subscriptionId = data.subscription;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0].price.id;

        await userRef.update({ status_assinatura: "active", plano: priceId });
        console.log(`Pagamento confirmado: ${customerId}`);
      }
      break;
    }

    case "invoice.payment_failed": {
      const userRef = await findUserByCustomer(customerId);
      if (userRef) {
        await userRef.update({ status_assinatura: "past_due" });
        console.log(`Falha no pagamento: ${customerId}`);
      }
      break;
    }
  }

  res.json({ received: true });
});