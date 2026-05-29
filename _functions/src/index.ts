import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import Stripe from "stripe";

admin.initializeApp();

const stripeKey = process.env.STRIPE_SECRET_KEY || "";
const stripe = new Stripe(stripeKey, {
  apiVersion: "2023-10-16" as any,
});

export const stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers["stripe-signature"] as string;
  let event;

  try {
    // Aqui verificamos se o aviso realmente veio do Stripe
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
     process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Quando o pagamento for concluído com sucesso
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const clientReferenceId = session.client_reference_id; // Este é o UID que enviamos

    if (clientReferenceId) {
      await admin.firestore()
        .collection("sgs_genius")
        .doc(clientReferenceId)
        .update({
          status: "active",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      
      console.log(`Usuário ${clientReferenceId} ativado com sucesso!`);
    }
  }

  res.json({ received: true });
});