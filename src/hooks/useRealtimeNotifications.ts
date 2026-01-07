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
