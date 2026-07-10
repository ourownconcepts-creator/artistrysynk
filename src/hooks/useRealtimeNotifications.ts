import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePushNotifications } from './usePushNotifications';

export const useRealtimeNotifications = (userId: string | null) => {
  const { isSubscribed, sendLocalNotification } = usePushNotifications();

  useEffect(() => {
    if (!userId || !isSubscribed) return;

    // Listen for new matches
    const matchChannel = supabase
      .channel('realtime-matches')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'matches',
          filter: `user_id_1=eq.${userId}`
        },
        async (payload) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', payload.new.user_id_2)
            .single();

          sendLocalNotification('New Match! 🎉', {
            body: `You matched with ${profile?.full_name || 'someone'}!`,
            tag: 'match',
            data: { type: 'match', matchId: payload.new.id }
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'matches',
          filter: `user_id_2=eq.${userId}`
        },
        async (payload) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', payload.new.user_id_1)
            .single();

          sendLocalNotification('New Match! 🎉', {
            body: `You matched with ${profile?.full_name || 'someone'}!`,
            tag: 'match',
            data: { type: 'match', matchId: payload.new.id }
          });
        }
      )
      .subscribe();

    // Listen for new messages
    const messageChannel = supabase
      .channel('realtime-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          // Only notify if message is not from current user
          if (payload.new.sender_id === userId) return;

          // Check if this message is in a conversation involving the user
          const { data: conversation } = await supabase
            .from('conversations')
            .select('id, matches!inner(user_id_1, user_id_2)')
            .eq('id', payload.new.conversation_id)
            .single();

          if (!conversation) return;

          const match = conversation.matches as any;
          if (match.user_id_1 !== userId && match.user_id_2 !== userId) return;

          const { data: sender } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', payload.new.sender_id)
            .single();

          sendLocalNotification(`Message from ${sender?.full_name || 'Someone'}`, {
            body: payload.new.content.substring(0, 100) + (payload.new.content.length > 100 ? '...' : ''),
            tag: 'message',
            data: { 
              type: 'message', 
              conversationId: payload.new.conversation_id,
              senderId: payload.new.sender_id
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(matchChannel);
      supabase.removeChannel(messageChannel);
    };
  }, [userId, isSubscribed, sendLocalNotification]);
};

/**
 * Notifies (push) when a matched user's `last_seen_at` becomes fresh (they came online).
 * Throttled to one notification per match per hour to avoid spam.
 */
export const useMatchOnlinePresence = (userId: string | null) => {
  const { isSubscribed, sendLocalNotification } = usePushNotifications();

  useEffect(() => {
    if (!userId || !isSubscribed) return;

    let matchIds = new Set<string>();
    const lastNotified = new Map<string, number>();
    const ONLINE_WINDOW_MS = 2 * 60 * 1000; // 2 min
    const THROTTLE_MS = 60 * 60 * 1000; // 1 hour

    const loadMatches = async () => {
      const { data } = await supabase
        .from('matches')
        .select('user_id_1, user_id_2')
        .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`);
      matchIds = new Set(
        (data ?? []).map((m: any) => (m.user_id_1 === userId ? m.user_id_2 : m.user_id_1))
      );
    };

    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      // Check user's preference
      const { data: settings } = await supabase
        .from('user_settings')
        .select('match_online_notifications, push_notifications')
        .eq('user_id', userId)
        .maybeSingle();
      if (cancelled) return;
      if (settings && (settings.match_online_notifications === false || settings.push_notifications === false)) return;

      await loadMatches();
      if (cancelled) return;

      channel = supabase
        .channel('realtime-presence')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles' },
          (payload) => {
            const newRow: any = payload.new;
            const oldRow: any = payload.old;
            if (!newRow?.id || !matchIds.has(newRow.id)) return;
            if (!newRow.last_seen_at) return;

            const newSeen = new Date(newRow.last_seen_at).getTime();
            const oldSeen = oldRow?.last_seen_at ? new Date(oldRow.last_seen_at).getTime() : 0;
            const now = Date.now();

            // Fire only when transitioning from stale (or none) to fresh.
            const wasStale = !oldSeen || now - oldSeen > ONLINE_WINDOW_MS;
            const isFresh = now - newSeen < ONLINE_WINDOW_MS;
            if (!wasStale || !isFresh) return;

            const lastFired = lastNotified.get(newRow.id) ?? 0;
            if (now - lastFired < THROTTLE_MS) return;
            lastNotified.set(newRow.id, now);

            sendLocalNotification(`${newRow.full_name || 'A match'} is online`, {
              body: 'Say hi while they’re active!',
              tag: `presence-${newRow.id}`,
              data: { type: 'presence', userId: newRow.id },
            });
          }
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId, isSubscribed, sendLocalNotification]);
};
