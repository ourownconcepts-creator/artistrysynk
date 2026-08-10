import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bell,
  Heart,
  MessageCircle,
  CheckCircle,
  Info,
  Mail,
  Sparkles,
  Users,
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Chip } from "@/components/native-ui";

interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  data: Record<string, any> | null;
}

interface EmailLogRow {
  id: string;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  created_at: string;
  metadata: Record<string, any> | null;
}

const iconFor = (type: string) => {
  switch (type) {
    case "match":
      return Heart;
    case "like":
      return Sparkles;
    case "message":
      return MessageCircle;
    case "match_online":
      return Users;
    default:
      return Info;
  }
};

type Category = "all" | "matches" | "messages" | "projects" | "system";

const CATEGORIES: { id: Category; label: string }[] = [
  { id: "all", label: "All" },
  { id: "matches", label: "Matches" },
  { id: "messages", label: "Messages" },
  { id: "projects", label: "Projects" },
  { id: "system", label: "System" },
];

/** Buckets a notification type into a user-facing category. */
const categoryFor = (type: string): Exclude<Category, "all"> => {
  if (["match", "match_online", "like", "swipe"].includes(type)) return "matches";
  if (type === "message") return "messages";
  if (
    [
      "collaboration_request",
      "project_application",
      "application_status",
      "project_invite",
      "job_application",
      "role_change",
      "room_activity",
    ].includes(type)
  )
    return "projects";
  return "system";
};

/** Primary action label for an actionable notification. */
const actionLabelFor = (type: string): string => {
  switch (categoryFor(type)) {
    case "messages":
      return "Reply";
    case "matches":
      return "View match";
    case "projects":
      return "Open project";
    default:
      return "View";
  }
};

const linkFor = (n: AppNotification): string => {
  const data = n.data || {};
  switch (n.type) {
    case "match":
    case "match_online":
      return "/matches";
    case "message":
      return data.conversation_id ? `/messages/${data.conversation_id}` : "/matches";
    case "like":
    case "swipe":
      return "/who-liked-you";
    case "job_application":
      return "/jobs";
    case "collaboration_request":
    case "project_application":
    case "application_status":
      return data.project_id ? `/projects/${data.project_id}` : "/projects";
    case "verification":
      return "/profile";
    case "order":
      return "/marketplace";
    default:
      if (data.url) return data.url as string;
      if (data.profile_id) return `/profile/${data.profile_id}`;
      return "/notifications";
  }
};

const Notifications = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [emails, setEmails] = useState<EmailLogRow[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [category, setCategory] = useState<Category>("all");

  useEffect(() => {
    document.title = "Notifications inbox | ArtistrySynk";
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      setUserId(uid);
      if (!uid) {
        setLoading(false);
        return;
      }

      const [{ data: notifs }, { data: log }] = await Promise.all([
        supabase
          .from("user_notifications")
          .select("id, type, title, message, is_read, created_at, data")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("email_send_log")
          .select("id, template_name, recipient_email, status, error_message, created_at, metadata")
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      setNotifications((notifs as AppNotification[]) || []);
      setEmails((log as EmailLogRow[]) || []);
      setLoading(false);

      channel = supabase
        .channel("notifications-inbox")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "user_notifications",
            filter: `user_id=eq.${uid}`,
          },
          (payload) =>
            setNotifications((prev) => [payload.new as AppNotification, ...prev])
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "user_notifications",
            filter: `user_id=eq.${uid}`,
          },
          (payload) => {
            const updated = payload.new as AppNotification;
            setNotifications((prev) => prev.map((n) => (n.id === updated.id ? { ...n, ...updated } : n)));
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "user_notifications",
            filter: `user_id=eq.${uid}`,
          },
          (payload) => {
            const removed = payload.old as { id: string };
            setNotifications((prev) => prev.filter((n) => n.id !== removed.id));
          }
        )
        .subscribe();
    };

    init();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  /** Live unread counters per category. */
  const categoryCounts = useMemo(() => {
    const counts: Record<Category, number> = { all: 0, matches: 0, messages: 0, projects: 0, system: 0 };
    for (const n of notifications) {
      if (n.is_read) continue;
      counts.all += 1;
      counts[categoryFor(n.type)] += 1;
    }
    return counts;
  }, [notifications]);

  const visible = useMemo(
    () =>
      notifications
        .filter((n) => (filter === "unread" ? !n.is_read : true))
        .filter((n) => (category === "all" ? true : categoryFor(n.type) === category)),
    [notifications, filter, category]
  );

  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    await supabase.from("user_notifications").update({ is_read: true }).eq("id", id);
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase
      .from("user_notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
  };

  const open = (n: AppNotification) => {
    if (!n.is_read) markAsRead(n.id);
    navigate(linkFor(n));
  };

  return (
    <main className="container max-w-3xl px-4 py-8 pt-24">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Bell className="h-6 w-6 text-primary" aria-hidden="true" />
            Notifications
          </h1>
          <p className="text-sm text-muted-foreground">
            Everything that happened on your profile, plus the emails we sent you.
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <CheckCircle className="mr-1 h-4 w-4" />
            Mark all read
          </Button>
        )}
      </header>

      <Tabs defaultValue="in-app">
        <TabsList className="mb-4">
          <TabsTrigger value="in-app">
            In-app
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="emails">
            <Mail className="mr-1 h-4 w-4" />
            Emails
          </TabsTrigger>
        </TabsList>

        <TabsContent value="in-app">
          <div className="app-scroll -mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1">
            {CATEGORIES.map((c) => (
              <Chip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>
                {c.label}
                {categoryCounts[c.id] > 0 ? (
                  <span className="ml-1.5 rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground tabular-nums">
                    {categoryCounts[c.id]}
                  </span>
                ) : null}
              </Chip>
            ))}
          </div>

          <div className="mb-4 flex gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              All ({notifications.length})
            </Button>
            <Button
              variant={filter === "unread" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("unread")}
            >
              Unread ({unreadCount})
            </Button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <Card className="p-10 text-center text-muted-foreground">
              <Bell className="mx-auto mb-3 h-8 w-8 opacity-50" aria-hidden="true" />
              <p>No notifications here yet.</p>
            </Card>
          ) : (
            <ul className="space-y-3">
              {visible.map((n) => {
                const Icon = iconFor(n.type);
                return (
                  <li key={n.id}>
                    <Card
                      role="button"
                      tabIndex={0}
                      aria-label={`${n.title}. ${n.is_read ? "Read" : "Unread"}`}
                      onClick={() => open(n)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          open(n);
                        }
                      }}
                      className={`flex cursor-pointer gap-3 p-4 transition-colors hover:bg-muted/50 ${
                        n.is_read ? "" : "border-primary/40 bg-primary/5"
                      }`}
                    >
                      <div className="rounded-full bg-primary/10 p-2 text-primary">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{n.title}</p>
                        <p className="text-sm text-muted-foreground">{n.message}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        {!n.is_read && (
                          <span className="mt-1 h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                        )}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            open(n);
                          }}
                        >
                          {actionLabelFor(n.type)}
                        </Button>
                        {!n.is_read && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              void markAsRead(n.id);
                            }}
                          >
                            Mark read
                          </Button>
                        )}
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="emails">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : emails.length === 0 ? (
            <Card className="p-10 text-center text-muted-foreground">
              <Mail className="mx-auto mb-3 h-8 w-8 opacity-50" aria-hidden="true" />
              <p>No notification emails sent to you yet.</p>
            </Card>
          ) : (
            <ul className="space-y-3">
              {emails.map((e) => (
                <li key={e.id}>
                  <Card className="flex gap-3 p-4">
                    <div className="rounded-full bg-muted p-2">
                      {e.status === "sent" ? (
                        <Mail className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium capitalize">
                        {e.template_name.replace(/^notification:/, "").replace(/[-_:]/g, " ")}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        To {e.recipient_email}
                        {e.error_message ? ` — ${e.error_message}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <Badge variant={e.status === "sent" ? "secondary" : "destructive"}>
                      {e.status}
                    </Badge>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default Notifications;
