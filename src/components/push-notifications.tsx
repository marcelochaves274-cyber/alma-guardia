'use client';

import { useEffect, useRef, useState } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { useAuth, useFirebaseApp, useFirestore, useUser } from '@/firebase';
import { useProfile } from '@/context/profile-context';
import { registerForPushNotifications, subscribeToForegroundMessages, ADMIN_NOTIFICATION_SCOPE, type NotificationScope } from '@/firebase/messaging';
import type { MenuPermission } from '@/components/manage-profile';
import { Button } from '@/components/ui/button';
import { Bell, BellRing } from 'lucide-react';

// Deriva o escopo de notificação (quais locais o perfil pode ver por módulo) a partir
// das permissões de um perfil personalizado. Ausência de filtro = vê todos os locais do módulo;
// módulo/submenu desabilitado = não vê nada daquele módulo (array vazio).
function computeNotificationScope(permissions: Record<string, MenuPermission>): NotificationScope {
  const getLocations = (menuId: string, subMenuId: string): string[] | null => {
    const menu = permissions[menuId];
    if (!menu?.enabled) return [];
    const sub = menu.subMenus?.[subMenuId];
    if (!sub?.enabled) return [];
    const locations = sub.filters?.locations;
    return locations && locations.length > 0 ? locations : null;
  };

  return {
    isAdmin: false,
    equipmentLocations: getLocations('equipamentos', 'equipment-report'),
    treatmentLocations: getLocations('tratamento', 'treatment-report'),
  };
}

export function PushNotifications() {
  const app = useFirebaseApp();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user } = useUser();
  const { profile } = useProfile();
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [error, setError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const lastSyncedScopeRef = useRef<string | null>(null);

  const getNotificationScope = async (): Promise<NotificationScope> => {
    if (!user || !firestore || !profile || profile === 'admin') return ADMIN_NOTIFICATION_SCOPE;
    try {
      const profilesDocRef = doc(firestore, 'sgs_genius', user.uid, 'settings', 'profiles');
      const snap = await getDoc(profilesDocRef);
      if (!snap.exists()) return ADMIN_NOTIFICATION_SCOPE;
      const customProfiles = snap.data().customProfiles || [];
      const found = customProfiles.find((p: { name: string }) => p.name === profile);
      // Perfis fixos (supervisor/observer) sem entrada personalizada continuam sem restrição.
      if (!found) return ADMIN_NOTIFICATION_SCOPE;
      return computeNotificationScope(found.permissions || {});
    } catch (scopeError) {
      console.error('[PUSH] Falha ao calcular escopo de notificação:', scopeError);
      return ADMIN_NOTIFICATION_SCOPE;
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission);
  }, [user]);

  const enableNotifications = async () => {
    setError(null);
    setIsRegistering(true);
    try {
      console.log('[PUSH] Iniciando registro de notificações...');
      console.log('[PUSH] Usuário:', user?.uid);
      console.log('[PUSH] Auth currentUser:', auth.currentUser?.uid);
      console.log('[PUSH] Permissão atual:', Notification.permission);
      
      const token = await registerForPushNotifications(auth, app, firestore, await getNotificationScope());
      if (token) {
        console.log('[PUSH] ✅ Token registrado com sucesso:', token);
        setPermission('granted');
        setError(null);
      } else {
        console.warn('[PUSH] ⚠️ Token não foi retornado');
        setError('Falha ao registrar token. Tente novamente.');
      }
    } catch (registrationError) {
      const message = registrationError instanceof Error ? registrationError.message : 'Não foi possível ativar as notificações.';
      console.error('[PUSH] ❌ Erro ao registrar:', registrationError);
      console.error('[PUSH] Stack:', (registrationError as Error).stack);
      setError(message);
    } finally {
      setIsRegistering(false);
    }
  };

  // Não solicita permissão automaticamente, mas se já estiver concedida garante
  // que o token esteja salvo no Firestore (cobre casos em que um registro anterior falhou).
  useEffect(() => {
    if (!user) {
      setPermission('default');
      return;
    }
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    setPermission(Notification.permission);
    if (Notification.permission === 'granted') {
      getNotificationScope()
        .then((scope) => registerForPushNotifications(auth, app, firestore, scope))
        .then(() => setError(null))
        .catch((syncError) => {
          console.error('[PUSH] Falha ao renovar token existente:', syncError);
          setError(syncError instanceof Error ? syncError.message : 'Falha ao confirmar as notificações. Toque em "Tentar novamente".');
        });
    }
  }, [user?.uid, auth, app, firestore, profile]);

  // Re-sincroniza o carimbo de local do token sempre que as permissões do perfil ativo
  // são editadas em "Gerenciar Perfis" (ex.: admin muda o filtro de local), sem precisar
  // desativar/reativar as notificações manualmente no aparelho.
  useEffect(() => {
    if (!user || !firestore) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    if (!profile || profile === 'admin') return;

    const profilesDocRef = doc(firestore, 'sgs_genius', user.uid, 'settings', 'profiles');
    const unsubscribe = onSnapshot(profilesDocRef, (snap) => {
      if (!snap.exists()) return;
      const customProfiles = snap.data().customProfiles || [];
      const found = customProfiles.find((p: { name: string }) => p.name === profile);
      if (!found) return;

      const scope = computeNotificationScope(found.permissions || {});
      const scopeKey = JSON.stringify(scope);
      if (lastSyncedScopeRef.current === scopeKey) return;
      lastSyncedScopeRef.current = scopeKey;

      registerForPushNotifications(auth, app, firestore, scope).catch((syncError) => {
        console.error('[PUSH] Falha ao re-sincronizar escopo do perfil:', syncError);
      });
    });

    return () => unsubscribe();
  }, [user?.uid, firestore, auth, app, profile]);

  // Listener para mensagens em foreground
  useEffect(() => {
    if (!user) return;
    return subscribeToForegroundMessages(app, (title, body) => {
      if (Notification.permission === 'granted') {
        void navigator.serviceWorker.ready.then((registration) => {
          return registration.showNotification(title, { body, tag: 'alma-guardia-critical-alerts' });
        }).catch((error) => {
          console.error('Não foi possível exibir a notificação:', error);
        });
      }
    });
  }, [app, auth, firestore, user]);

  if (!user || permission === 'unsupported') return null;
  if (permission === 'granted' && !error) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-xs space-y-2 rounded-lg border bg-background p-3 shadow-lg">
      <Button type="button" onClick={enableNotifications} className="w-full" disabled={isRegistering}>
        {permission === 'denied' ? <BellRing className="mr-2 h-4 w-4" /> : <Bell className="mr-2 h-4 w-4" />}
        {isRegistering ? 'Processando...' : permission === 'denied' ? 'Permissão bloqueada' : error ? 'Tentar novamente' : 'Ativar alertas no celular'}
      </Button>
      {error && (
        <div className="space-y-2 rounded bg-red-50 p-2 text-xs text-red-700">
          {error.split('\n').map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      )}
    </div>
  );
}