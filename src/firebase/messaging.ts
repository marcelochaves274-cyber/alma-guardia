import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from './config';

// Inicializa o Firebase Messaging, mas apenas no lado do cliente (navegador)
const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;

/**
 * Solicita permissão para receber notificações push.
 * Se a permissão for concedida, obtém e retorna o token FCM do dispositivo.
 */
export const requestNotificationPermission = async () => {
  try {
    if (!messaging) return null;
    
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: 'BBQgrv5Tpxc1QIIAbLZTMCTHPXwDWxUrLRbQskN1wasJf9cWFZQ1VbV7pheFGVJ9L0Lj9SMRTiY-BIcn76PU4'
      });
      console.log('Token de FCM obtido com sucesso:', token);
      return token;
    } else {
      console.warn('Permissão de notificação negada pelo usuário.');
      return null;
    }
  } catch (error) {
    console.error('Erro ao solicitar permissão de notificação ou obter token:', error);
    return null;
  }
};

/**
 * Cria um listener para mensagens recebidas enquanto o app está em primeiro plano.
 */
export const onMessageListener = () =>
  new Promise((resolve) => {
    if (messaging) {
      onMessage(messaging, (payload) => {
        console.log('Mensagem recebida em primeiro plano: ', payload);
        resolve(payload);
      });
    }
  });