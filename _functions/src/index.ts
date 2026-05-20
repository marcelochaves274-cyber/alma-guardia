import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import Stripe from "stripe";

admin.initializeApp();

// Aqui você vai colar a sua Chave Secreta do Stripe (Secret Key) mais tarde
//const stripe = new Stripe("sk_test_51TUWiCFPNwNhFwBvYlAk4ETjmEzdImCaAmWZSof7PL19u3rauhUuKhRAr2N2ptCCbbKsAYl97SAl600Urb27dY6e00qxoYNtJm", {
const stripeKey = process.env.STRIPE_SECRET_KEY || "";
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
      "whsec_5nGSLdKvMnLoTHPw39Ae3ZgOdwTp7354" // Vamos pegar isso no próximo passo
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