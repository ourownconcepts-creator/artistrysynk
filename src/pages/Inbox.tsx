import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { Heart, MessageCircle, Sparkles, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell/AppShell";
import {
  Chip,
  EmptyState,
  HScroll,
  ListRow,
  PresenceAvatar,
  Pressable,
  SectionHeader,
  SkeletonList,
  Surface,
} from "@/components/native-ui";
import { useSubscription } from "@/hooks/useSubscription";

type InboxItem = {
  id: string;
  matched_at: string | null;
  conversation_id?: string;
  profile: {
    id: string;
    full_name: string;
    username: string;
    avatar_url: string | null;
    last_seen_at?: string | null;
  };
  last_message?: { content: string; created_at: string; sender_id: string; read: boolean };
  unread_count: number;
};

const isOnline = (lastSeen?: string | null) =>
  !!lastSeen && Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000;

export default function Inbox() {
  const navigate = useNavigate();
  const { canSeeWhoLikedYou } = useSubscription();
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"chats" | "new">("chats");
  const [likesCount, setLikesCount] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setUserId(user.id);
      void load(user.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const load = async (uid: string) => {
    setLoading(true);

    const { data: swipes } = await supabase
      .from("swipes")
      .select("swiped_id")
      .eq("swiper_id", uid);
    const swipedIds = swipes?.map((s) => s.swiped_id) || [];
    const { count } = await supabase
      .from("swipes")
      .select("*", { count: "exact", head: true })
      .eq("swiped_id", uid)
      .eq("liked", true)
      .not("swiper_id", "in", `(${[uid, ...swipedIds].join(",")})`);
    setLikesCount(count || 0);

    const { data: matches } = await supabase
      .from("matches")
      .select("id, matched_at, user_id_1, user_id_2, conversations(id)")
      .or(`user_id_1.eq.${uid},user_id_2.eq.${uid}`)
      .order("matched_at", { ascending: false });

    const rows = await Promise.all(
      (matches || []).map(async (match: any) => {
        const otherId = match.user_id_1 === uid ? match.user_id_2 : match.user_id_1;
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url, last_seen_at")
          .eq("id", otherId)
          .single();

        const conversationId = match.conversations?.[0]?.id as string | undefined;
        let last_message;
        let unread_count = 0;

        if (conversationId) {
          const { data: lastMsg } = await supabase
            .from("messages")
            .select("content, created_at, sender_id, read")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (lastMsg) {
            last_message = {
              content: lastMsg.content,
              created_at: lastMsg.created_at ?? new Date().toISOString(),
              sender_id: lastMsg.sender_id,
              read: lastMsg.read ?? false,
            };
          }
          const { count: unread } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", conversationId)
            .neq("sender_id", uid)
            .eq("read", false);
          unread_count = unread || 0;
        }

        return {
          id: match.id,
          matched_at: match.matched_at,
          conversation_id: conversationId,
          profile: profile!,
          last_message,
          unread_count,
        } as InboxItem;
      }),
    );

    setItems(rows.filter((r) => r.profile));
    setLoading(false);
  };

  const chats = items.filter((i) => i.last_message);
  const fresh = items.filter((i) => !i.last_message);
  const visible = tab === "chats" ? chats : fresh;
  const totalUnread = chats.reduce((sum, c) => sum + c.unread_count, 0);

  const open = (item: InboxItem) => {
    if (item.conversation_id) navigate(`/messages/${item.conversation_id}`);
    else navigate(`/profile/${item.profile.id}`);
  };

  return (
    <AppShell title="Inbox">
      <div className="space-y-4">
        {/* Likes teaser */}
        <Pressable
          onClick={() => navigate(canSeeWhoLikedYou ? "/who-liked-you" : "/pricing?source=inbox")}
          className="w-full text-left"
        >
          <Surface inset className="flex items-center gap-3">
            <div
              className="grid h-11 w-11 place-items-center rounded-2xl text-primary-foreground"
              style={{ backgroundImage: "var(--gradient-primary)" }}
            >
              <Heart className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {likesCount > 0
                  ? `${likesCount} ${likesCount === 1 ? "creative" : "creatives"} liked you`
                  : "Likes you get land here"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {canSeeWhoLikedYou ? "Tap to see who they are" : "Unlock with Pro to see who"}
              </p>
            </div>
          </Surface>
        </Pressable>

        {/* New matches strip */}
        {fresh.length > 0 ? (
          <section className="space-y-2">
            <SectionHeader title="New matches" subtitle="Say hello before the spark fades" />
            <HScroll>
              {fresh.map((item) => (
                <Pressable
                  key={item.id}
                  onClick={() => open(item)}
                  className="flex w-[76px] shrink-0 flex-col items-center gap-1.5"
                >
                  <PresenceAvatar
                    src={item.profile.avatar_url}
                    name={item.profile.full_name}
                    online={isOnline(item.profile.last_seen_at)}
                    size="lg"
                    ring
                  />
                  <span className="w-full truncate text-center text-[11px] font-medium">
                    {item.profile.full_name?.split(" ")[0]}
                  </span>
                </Pressable>
              ))}
            </HScroll>
          </section>
        ) : null}

        {/* Tabs */}
        <div className="flex gap-2">
          <Chip active={tab === "chats"} onClick={() => setTab("chats")}>
            Chats{totalUnread > 0 ? ` · ${totalUnread}` : ""}
          </Chip>
          <Chip active={tab === "new"} onClick={() => setTab("new")}>
            Matches{fresh.length > 0 ? ` · ${fresh.length}` : ""}
          </Chip>
        </div>

        {loading ? (
          <SkeletonList />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={tab === "chats" ? <MessageCircle className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
            title={tab === "chats" ? "No conversations yet" : "No new matches"}
            description="Swipe in Discover to find collaborators — conversations unlock the moment you both like each other."
            action={
              <Button size="sm" onClick={() => navigate("/discover")}>
                Start discovering
              </Button>
            }
          />
        ) : (
          <ul className="space-y-2">
            {visible.map((item) => (
              <li key={item.id}>
                <ListRow
                  onClick={() => open(item)}
                  ariaLabel={`Open conversation with ${item.profile.full_name}`}
                  leading={
                    <PresenceAvatar
                      src={item.profile.avatar_url}
                      name={item.profile.full_name}
                      online={isOnline(item.profile.last_seen_at)}
                    />
                  }
                  title={item.profile.full_name}
                  subtitle={
                    item.last_message ? (
                      <span className="flex items-center gap-1">
                        {item.last_message.sender_id === userId ? (
                          <CheckCheck
                            className={
                              item.last_message.read ? "h-3 w-3 text-primary" : "h-3 w-3 text-muted-foreground"
                            }
                          />
                        ) : null}
                        <span className="truncate">{item.last_message.content}</span>
                      </span>
                    ) : item.matched_at ? (
                      `Matched ${formatDistanceToNow(new Date(item.matched_at), { addSuffix: true })}`
                    ) : (
                      "New match"
                    )
                  }
                  trailing={
                    item.unread_count > 0 ? (
                      <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                        {item.unread_count}
                      </span>
                    ) : undefined
                  }
                  chevron={item.unread_count === 0}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
