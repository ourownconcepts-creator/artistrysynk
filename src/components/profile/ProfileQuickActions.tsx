import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CalendarCheck, Handshake, MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomSheet, EmptyState, ListRow, Surface } from "@/components/native-ui";
import { CollaborationRequestDialog } from "@/components/collaboration/CollaborationRequestDialog";

type Service = { id: string; title: string; price: number; currency: string | null; delivery_days: number | null };

/**
 * Message / Collaborate / Book quick actions for a creative's profile.
 * Messaging and collaboration require a mutual match, so both actions guide
 * the viewer to Discover when there isn't one yet.
 */
export function ProfileQuickActions({
  currentUserId,
  profileId,
  profileName,
}: {
  currentUserId: string;
  profileId: string;
  profileName: string;
}) {
  const navigate = useNavigate();
  const [matchId, setMatchId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [bookOpen, setBookOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [a, b] = [currentUserId, profileId].sort();
      const { data: match } = await supabase
        .from("matches")
        .select("id, conversations(id)")
        .eq("user_id_1", a)
        .eq("user_id_2", b)
        .maybeSingle();
      if (!active) return;
      setMatchId((match?.id as string) ?? null);
      setConversationId(((match as any)?.conversations?.[0]?.id as string) ?? null);

      const { data: svc } = await supabase
        .from("services")
        .select("id, title, price, currency, delivery_days")
        .eq("seller_id", profileId)
        .eq("is_active", true)
        .limit(10);
      if (active) setServices((svc as Service[]) ?? []);
    };
    void load();
    return () => {
      active = false;
    };
  }, [currentUserId, profileId]);

  const needsMatch = () =>
    toast.info(`Match with ${profileName} first`, {
      description: "Messaging and collaboration unlock once you both like each other.",
      action: { label: "Discover", onClick: () => navigate("/discover") },
    });

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <Button
          className="h-11 rounded-2xl"
          onClick={() => (conversationId ? navigate(`/messages/${conversationId}`) : needsMatch())}
        >
          <MessageCircle className="mr-1.5 h-4 w-4" />
          Message
        </Button>

        {matchId ? (
          <CollaborationRequestDialog
            matchId={matchId}
            recipientId={profileId}
            recipientName={profileName}
            currentUserId={currentUserId}
          />
        ) : (
          <Button variant="outline" className="h-11 rounded-2xl" onClick={needsMatch}>
            <Handshake className="mr-1.5 h-4 w-4" />
            Collaborate
          </Button>
        )}

        <Button variant="outline" className="h-11 rounded-2xl" onClick={() => setBookOpen(true)}>
          <CalendarCheck className="mr-1.5 h-4 w-4" />
          Book
        </Button>
      </div>

      <BottomSheet
        open={bookOpen}
        onOpenChange={setBookOpen}
        title={`Book ${profileName}`}
        description="Paid services this creative offers on the marketplace."
      >
        <div className="space-y-2 pb-4">
          {services.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="h-6 w-6" />}
              title="No bookable services yet"
              description={`${profileName} hasn't listed a paid service. Send a collaboration request instead.`}
            />
          ) : (
            services.map((s) => (
              <ListRow
                key={s.id}
                onClick={() => {
                  setBookOpen(false);
                  navigate(`/marketplace?q=${encodeURIComponent(s.title)}`);
                }}
                title={s.title}
                subtitle={`${s.currency ?? "NGN"} ${s.price.toLocaleString()}${
                  s.delivery_days ? ` · ${s.delivery_days} day delivery` : ""
                }`}
                chevron
              />
            ))
          )}
          <Surface level={2} inset className="text-xs text-muted-foreground">
            Bookings are handled through the marketplace so payments and delivery stay protected.
          </Surface>
        </div>
      </BottomSheet>
    </>
  );
}