import React, { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';

export default function CheckoutScreen() {
  const [loading, setLoading] = useState(false);
  const auth = getAuth();
  const functions = getFunctions();

  const handleCheckout = async (priceId: string) => {
    setLoading(true);
    try {
      const createSubscription = httpsCallable(functions, 'createStripeSubscription');
      const { data }: any = await createSubscription({
        email: auth.currentUser?.email,
        priceId: priceId,
      });

      // Como é Web, redirecionamos para o checkout do Stripe
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Erro no checkout:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 flex flex-col items-center">
      <h2 className="text-xl font-bold mb-4">Assinatura ALMA Guardia</h2>
      <button 
        onClick={() => handleCheckout('prod_R8V3v43')} 
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-2 rounded"
      >
        {loading ? 'Carregando...' : 'Assinar Agora'}
      </button>
    </div>
  );
}