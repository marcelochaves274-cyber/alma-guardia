// Importa os scripts do Firebase necessários para o Service Worker.
// É importante usar a versão 'compat' para a sintaxe legada do messaging.
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Inicializa o app Firebase no Service Worker com as credenciais do projeto.
// Estas credenciais devem ser as mesmas da sua aplicação web.
firebase.initializeApp({
  apiKey: "AIzaSyARUFMEZXmZRD2GJEbQb4BrthjiVHc-mSA",
  authDomain: "brave-drive-472322-m2.firebaseapp.com",
  projectId: "brave-drive-472322-m2",
  storageBucket: "brave-drive-472322-m2.firebasestorage.app",
  messagingSenderId: "768402541625",
  appId: "1:768402541625:web:cf3ae4a28647d60c9491e8"
});

// Recupera uma instância do Firebase Messaging para manipular mensagens em segundo plano.
const messaging = firebase.messaging();

// Adiciona um handler para quando uma mensagem push é recebida enquanto o app está em segundo plano.
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Mensagem recebida em segundo plano:', payload);

  // Personaliza e exibe a notificação para o usuário.
  const notificationTitle = payload.notification?.title || 'ALMA Guardia';
  const notificationOptions = {
    body: payload.notification?.body || 'Você possui um novo alerta pendente.',
    icon: 'https://firebasestorage.googleapis.com/v0/b/studio-6033207211-536c4.firebasestorage.app/o/Logo-Final-ico.ico?alt=media&token=7b88f673-93d1-4e01-a1c7-bf0da7beaa86' // Ícone da aplicação
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});