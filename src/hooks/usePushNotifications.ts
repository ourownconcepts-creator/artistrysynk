import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PushNotificationState {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission;
}

// Default VAPID public key - can be overridden by environment variable or edge function
const DEFAULT_VAPID_PUBLIC_KEY = 'BLBz-YrPJCnzNmM_XxbJHxjJUMsQ7wpG0RVKaVT1Hf5LNMCZPHB3dPb0lQPLJRc9yFNV0h1X3aVLQMzYZiGdY8k';

export const usePushNotifications = () => {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    permission: 'default'
  });
  const [loading, setLoading] = useState(false);
  const [vapidPublicKey, setVapidPublicKey] = useState<string>(DEFAULT_VAPID_PUBLIC_KEY);

  useEffect(() => {
    checkSupport();
    fetchVapidKey();
  }, []);

  const fetchVapidKey = async () => {
    try {
      // Try to get VAPID key from edge function (which checks for stored keys)
      const { data, error } = await supabase.functions.invoke('generate-vapid-keys', {
        method: 'POST'
      });
      
      if (!error && data?.publicKey) {
        setVapidPublicKey(data.publicKey);
        console.log('Using VAPID public key from server:', data.alreadyExists ? 'existing' : 'newly generated');
      }
    } catch (err) {
      console.log('Using default VAPID key, fetch error:', err);
    }
  };

  const checkSupport = async () => {
    const isSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    
    if (isSupported) {
      const permission = Notification.permission;
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = registration ? await (registration as any).pushManager?.getSubscription() : null;
      
      setState({
        isSupported: true,
        isSubscribed: !!subscription,
        permission
      });
    } else {
      setState({
        isSupported: false,
        isSubscribed: false,
        permission: 'default'
      });
    }
  };

  const registerServiceWorker = async () => {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported');
    }

    // The app no longer ships a caching service worker (SSR migration); web
    // push requires an existing registration. Native (Capacitor) push is
    // unaffected — it uses device tokens, not this hook.
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      throw new Error('No service worker registration available for web push');
    }
    return registration;
  };

  const requestPermission = useCallback(async () => {
    if (!state.isSupported) {
      toast.error('Push notifications are not supported in your browser');
      return false;
    }

    setLoading(true);
    
    try {
      const permission = await Notification.requestPermission();
      
      setState(prev => ({ ...prev, permission }));
      
      if (permission === 'granted') {
        toast.success('Notification permission granted!');
        return true;
      } else if (permission === 'denied') {
        toast.error('Notification permission denied. Please enable in browser settings.');
        return false;
      }
      
      return false;
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('Failed to request notification permission');
      return false;
    } finally {
      setLoading(false);
    }
  }, [state.isSupported]);

  const subscribe = useCallback(async () => {
    if (!state.isSupported) {
      toast.error('Push notifications are not supported');
      return null;
    }

    setLoading(true);

    try {
      // Request permission first
      if (state.permission !== 'granted') {
        const granted = await requestPermission();
        if (!granted) return null;
      }

      // Register service worker
      const registration = await registerServiceWorker();

      // Subscribe to push with the fetched or default VAPID key
      const subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      // Save subscription to database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const subscriptionJSON = subscription.toJSON();
        const keys = subscriptionJSON.keys as { p256dh: string; auth: string } | undefined;
        
        if (keys) {
          await supabase.from("push_subscriptions").upsert({
            user_id: user.id,
            endpoint: subscription.endpoint,
            p256dh: keys.p256dh,
            auth: keys.auth,
            is_active: true,
          }, {
            onConflict: "user_id,endpoint"
          });
        }
      }

      setState(prev => ({ ...prev, isSubscribed: true }));
      toast.success('Push notifications enabled!');
      
      return subscription;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast.error('Failed to enable push notifications');
      return null;
    } finally {
      setLoading(false);
    }
  }, [state.isSupported, state.permission, requestPermission]);

  const unsubscribe = useCallback(async () => {
    setLoading(true);

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await (registration as any).pushManager?.getSubscription();
        if (subscription) {
          // Remove from database
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from("push_subscriptions")
              .delete()
              .eq("user_id", user.id)
              .eq("endpoint", subscription.endpoint);
          }
          
          await subscription.unsubscribe();
        }
      }

      setState(prev => ({ ...prev, isSubscribed: false }));
      toast.success('Push notifications disabled');
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast.error('Failed to disable push notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  const sendLocalNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (state.permission === 'granted') {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      });
    }
  }, [state.permission]);

  return {
    ...state,
    loading,
    requestPermission,
    subscribe,
    unsubscribe,
    sendLocalNotification
  };
};

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}
