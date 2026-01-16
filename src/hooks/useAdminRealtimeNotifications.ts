import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Bell, Flag, UserCheck, AlertTriangle } from 'lucide-react';

interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: Date;
  data?: any;
}

export const useAdminRealtimeNotifications = () => {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Listen for new content flags
    const flagsChannel = supabase
      .channel('admin-content-flags')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'content_flags',
        },
        async (payload) => {
          const newFlag = payload.new as any;
          
          // Get reporter info
          const { data: reporter } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', newFlag.reporter_id)
            .single();

          const notification: AdminNotification = {
            id: newFlag.id,
            type: 'content_flag',
            title: 'New Content Report',
            message: `${reporter?.full_name || 'A user'} reported a ${newFlag.content_type} for ${newFlag.reason}`,
            timestamp: new Date(),
            data: newFlag,
          };

          setNotifications(prev => [notification, ...prev]);
          setUnreadCount(prev => prev + 1);

          toast.warning(notification.title, {
            description: notification.message,
            duration: 10000,
          });
        }
      )
      .subscribe();

    // Listen for new verification requests
    const verificationChannel = supabase
      .channel('admin-verification-requests')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'verification_requests',
        },
        async (payload) => {
          const newRequest = payload.new as any;
          
          const { data: user } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', newRequest.user_id)
            .single();

          const notification: AdminNotification = {
            id: newRequest.id,
            type: 'verification_request',
            title: 'New Verification Request',
            message: `${user?.full_name || 'A user'} requested ${newRequest.request_type} verification`,
            timestamp: new Date(),
            data: newRequest,
          };

          setNotifications(prev => [notification, ...prev]);
          setUnreadCount(prev => prev + 1);

          toast.info(notification.title, {
            description: notification.message,
            duration: 8000,
          });
        }
      )
      .subscribe();

    // Listen for new contact submissions
    const contactChannel = supabase
      .channel('admin-contact-submissions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'contact_submissions',
        },
        (payload) => {
          const newSubmission = payload.new as any;

          const notification: AdminNotification = {
            id: newSubmission.id,
            type: 'contact_submission',
            title: 'New Contact Message',
            message: `${newSubmission.name} sent a message: ${newSubmission.subject}`,
            timestamp: new Date(),
            data: newSubmission,
          };

          setNotifications(prev => [notification, ...prev]);
          setUnreadCount(prev => prev + 1);

          toast.info(notification.title, {
            description: notification.message,
            duration: 6000,
          });
        }
      )
      .subscribe();

    // Listen for new career applications
    const careerChannel = supabase
      .channel('admin-career-applications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'career_applications',
        },
        (payload) => {
          const newApp = payload.new as any;

          const notification: AdminNotification = {
            id: newApp.id,
            type: 'career_application',
            title: 'New Job Application',
            message: `${newApp.full_name} applied for ${newApp.job_title}`,
            timestamp: new Date(),
            data: newApp,
          };

          setNotifications(prev => [notification, ...prev]);
          setUnreadCount(prev => prev + 1);

          toast.info(notification.title, {
            description: notification.message,
            duration: 6000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(flagsChannel);
      supabase.removeChannel(verificationChannel);
      supabase.removeChannel(contactChannel);
      supabase.removeChannel(careerChannel);
    };
  }, []);

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  return {
    notifications,
    unreadCount,
    clearNotifications,
    markAsRead,
  };
};
