importScripts('https://www.gstatic.com/firebasejs/11.9.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.9.1/firebase-messaging-compat.js');

firebase.initializeApp({
	apiKey: 'AIzaSyARUFMEZXmZRD2GJEbQb4BrthjiVHc-mSA',
	authDomain: 'brave-drive-472322-m2.firebaseapp.com',
	projectId: 'brave-drive-472322-m2',
	storageBucket: 'brave-drive-472322-m2.firebasestorage.app',
	messagingSenderId: '768402541625',
	appId: '1:768402541625:web:cf3ae4a28647d60c9491e8',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
	const notification = payload.notification || {};
	self.registration.showNotification(notification.title || 'ALMA Guardia', {
		body: notification.body || 'Você tem novos alertas críticos.',
		icon: notification.icon || '/icon-192x192.png',
		tag: notification.tag || 'alma-guardia-critical-alerts',
		data: { url: payload.fcmOptions?.link || '/dashboard' },
		requireInteraction: true,
	});
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	event.waitUntil(self.clients.openWindow(event.notification.data?.url || '/dashboard'));
});
