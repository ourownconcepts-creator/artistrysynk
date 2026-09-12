import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Link } from "@/lib/router-compat";
import { CheckCircle2, ExternalLink, Loader2, Plug, RefreshCw, ShieldOff, UserCheck, XCircle } from "lucide-react";
import {
  approvePartnerIntent,
  cancelPartnerIntent,
  listPartnerIdentities,
  setPartnerLinkStatus,
  type PartnerIdentityRow,
  type PartnerIntentRow,
} from "@/lib/integration/admin.functions";

const initials = (value: string | null) => (value ? value.slice(0, 2).toUpperCase() : "AS");

const ProfileCell = ({ profile }: { profile: PartnerIdentityRow["profile"] }) => {
  if (!profile) return <span className="text-sm text-muted-foreground">No member linked yet</span>;
  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-9 w-9">
        <AvatarImage src={profile.avatarUrl ?? undefined} alt={profile.displayName ?? "Member"} />
        <AvatarFallback>{initials(profile.displayName ?? profile.username)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {profile.displayName ?? profile.username ?? "Member"}
          {profile.isVerified && <CheckCircle2 className="ml-1 inline h-3.5 w-3.5 text-primary" />}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {profile.username ? `@${profile.username}` : profile.userId}
          {profile.location ? ` · ${profile.location}` : ""}
        </p>
      </div>
      {profile.username && (
        <Button asChild variant="ghost" size="sm">
          <Link to={`/profile/${profile.username}`} target="_blank">
            <ExternalLink className="mr-1 h-3.5 w-3.5" /> Profile
          </Link>
        </Button>
      )}
    </div>
  );
};

/**
 * Admin console for partner integrations (Zik's Got Talent and any future
 * partner): connected contestants, their ArtistrySynk profile, and the
 * requests still waiting for approval.
 */
const AdminIntegrations = () => {
  const load = useServerFn(listPartnerIdentities);
  const approve = useServerFn(approvePartnerIntent);
  const cancel = useServerFn(cancelPartnerIntent);
  const setStatus = useServerFn(setPartnerLinkStatus);

  const [identities, setIdentities] = useState<PartnerIdentityRow[]>([]);
  const [pending, setPending] = useState<PartnerIntentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [usernames, setUsernames] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await load();
      setIdentities(result.identities);
      setPending(result.pending);
      setDenied(false);
    } catch {
      setDenied(true);
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return identities;
    return identities.filter((row) =>
      [row.application, row.externalSubject, row.profile?.username, row.profile?.displayName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [identities, search]);

  const active = filtered.filter((row) => row.status === "active");
  const revoked = filtered.filter((row) => row.status !== "active");

  const run = async (id: string, action: () => Promise<unknown>, message: string) => {
    setBusyId(id);
    try {
      await action();
      toast.success(message);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  if (denied) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Not available</h1>
        <p className="mt-2 text-muted-foreground">
          You do not have permission to manage partner connections.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Plug className="h-7 w-7 text-primary" /> Partner connections
          </h1>
          <p className="text-muted-foreground">
            Connected contestants, their ArtistrySynk profile, and requests awaiting approval.
          </p>
        </div>
        <Button variant="outline" onClick={() => void refresh()} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Awaiting approval ({pending.length})</TabsTrigger>
          <TabsTrigger value="connected">Connected ({active.length})</TabsTrigger>
          <TabsTrigger value="revoked">Revoked ({revoked.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-4">
          {pending.length === 0 && !loading && (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No requests are waiting for approval.
              </CardContent>
            </Card>
          )}
          {pending.map((intent) => (
            <Card key={intent.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-lg">{intent.application}</CardTitle>
                  <Badge variant="outline">{intent.environment}</Badge>
                  <Badge variant="secondary">{intent.type.replace("_", " ")}</Badge>
                  {intent.expired && <Badge variant="destructive">Expired</Badge>}
                </div>
                <CardDescription>
                  Partner account {intent.externalSubject} · requested{" "}
                  {new Date(intent.createdAt).toLocaleString()} · expires{" "}
                  {new Date(intent.expiresAt).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1">
                  {intent.scopes.map((scope) => (
                    <Badge key={scope} variant="outline" className="text-xs">
                      {scope}
                    </Badge>
                  ))}
                </div>
                {intent.matchedProfile && (
                  <div className="rounded-lg border p-3">
                    <p className="mb-2 text-xs uppercase text-muted-foreground">Suggested member</p>
                    <ProfileCell profile={intent.matchedProfile} />
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    className="max-w-xs"
                    placeholder="ArtistrySynk username"
                    value={usernames[intent.id] ?? intent.matchedProfile?.username ?? ""}
                    onChange={(event) =>
                      setUsernames((prev) => ({ ...prev, [intent.id]: event.target.value }))
                    }
                  />
                  <Button
                    disabled={busyId === intent.id || intent.expired}
                    onClick={() => {
                      const username = (usernames[intent.id] ?? intent.matchedProfile?.username ?? "").trim();
                      if (!username) {
                        toast.error("Enter the member's ArtistrySynk username first");
                        return;
                      }
                      void run(
                        intent.id,
                        () => approve({ data: { intentId: intent.id, username } }),
                        "Connection approved",
                      );
                    }}
                  >
                    {busyId === intent.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <UserCheck className="mr-2 h-4 w-4" />
                    )}
                    Approve link
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busyId === intent.id}
                    onClick={() =>
                      void run(
                        intent.id,
                        () => cancel({ data: { intentId: intent.id } }),
                        "Request cancelled",
                      )
                    }
                  >
                    <XCircle className="mr-2 h-4 w-4" /> Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="connected" className="mt-4 space-y-4">
          <Input
            className="max-w-sm"
            placeholder="Search by name, username or partner account"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {active.length === 0 && !loading && (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No connected contestants yet.
              </CardContent>
            </Card>
          )}
          {active.map((row) => (
            <Card key={row.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div className="min-w-[240px] space-y-2">
                  <ProfileCell profile={row.profile} />
                  <p className="text-xs text-muted-foreground">
                    {row.application} · {row.environment} · partner account {row.externalSubject} ·
                    linked {new Date(row.linkedAt).toLocaleDateString()}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {row.scopes.map((scope) => (
                      <Badge key={scope} variant="outline" className="text-xs">
                        {scope}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button
                  variant="destructive"
                  disabled={busyId === row.id}
                  onClick={() =>
                    void run(
                      row.id,
                      () => setStatus({ data: { linkId: row.id, status: "revoked" } }),
                      "Connection revoked",
                    )
                  }
                >
                  <ShieldOff className="mr-2 h-4 w-4" /> Revoke
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="revoked" className="mt-4 space-y-4">
          {revoked.length === 0 && !loading && (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No revoked connections.
              </CardContent>
            </Card>
          )}
          {revoked.map((row) => (
            <Card key={row.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div className="space-y-2">
                  <ProfileCell profile={row.profile} />
                  <p className="text-xs text-muted-foreground">
                    {row.application} · partner account {row.externalSubject} ·
                    {row.revokedAt ? ` revoked ${new Date(row.revokedAt).toLocaleDateString()}` : ""}
                  </p>
                </div>
                <Button
                  variant="outline"
                  disabled={busyId === row.id}
                  onClick={() =>
                    void run(
                      row.id,
                      () => setStatus({ data: { linkId: row.id, status: "active" } }),
                      "Connection restored",
                    )
                  }
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Restore
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminIntegrations;
