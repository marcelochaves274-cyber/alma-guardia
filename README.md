HTTP via the computer's LAN IP will be rejected by FCM Web. On Android, open the HTTPS URL in Chrome. On iPhone, use iOS 16.4 ou mais recente, abra o site no Safari, adicione-o à Tela de Início, abra o aplicativo web instalado e ative as notificações lá. Não use o navegador interno do WhatsApp/Instagram.
# ALMA Guardia

## Push notifications

1. In Firebase Console, open Project settings > Cloud Messaging and create a Web Push certificate.
2. Copy the public VAPID key to `.readme.md ` as `NEXT_PUBLIC_FIREBASE_VAPID_KEY`.
3. Deploy with `npm run deploy` to publish the service worker and the scheduled `sendCriticalReminders` function.

The browser asks for notification permission after an authenticated user enters the app. The device token is stored under the authenticated user's `fcmTokens` collection. The scheduled function checks overdue treatments, equipment inspections/validity and pending notices every day at 08:00 in `America/Sao_Paulo`.

## Mobile development test

`npm run dev` alone does not execute Cloud Functions. To test on a phone, use an HTTPS URL (for example, an HTTPS tunnel to port 9002), configure the VAPID key in `.env.local`, log in with the Firebase account that selects the Administrator profile, and tap `Ativar alertas no celular`. Confirm a document appears in `sgs_genius/{uid}/fcmTokens`; then use Firebase Console > Cloud Messaging > Send test message with that token. HTTP via the computer's LAN IP will be rejected by FCM Web.
