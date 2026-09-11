import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Clock, Link2, ShieldOff } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listMyIntegrationConnections,
  revokeMyIntegrationConnection,
} from "@/lib/integration/connections.functions";

const formatDate = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

const ScopeList = ({ scopes }: { scopes: string[] }) => (
  <div className="flex flex-wrap gap-1.5">
    {scopes.map((scope) => (
      <Badge key={scope} variant="secondary" className="text-xs font-normal">
        {scope}
      </Badge>
    ))}
  </div>
);

export const IntegrationConnectionsCard = () => {
  const fetchConnections = useServerFn(listMyIntegrationConnections);
  const revoke = useServerFn(revokeMyIntegrationConnection);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["integration-connections"],
    queryFn: () => fetchConnections(),
  });

  const revokeMutation = useMutation({
    mutationFn: (linkId: string) => revoke({ data: { linkId } }),
    onSuccess: () => {
      toast.success("Connection disconnected");
      queryClient.invalidateQueries({ queryKey: ["integration-connections"] });
    },
    onError: () => toast.error("We could not disconnect that connection"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" aria-hidden="true" />
          Connected apps
        </CardTitle>
        <CardDescription>
          Apps such as Zik&apos;s Got Talent that you have connected to your
          ArtistrySynk identity. They only ever receive your name, username,
          avatar and location.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <>
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Linked
              </h3>
              {data?.linked.length ? (
                data.linked.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1.5">
                      <p className="font-medium">{entry.application}</p>
                      <p className="text-xs text-muted-foreground">
                        Connected {formatDate(entry.linkedAt)} ·{" "}
                        {entry.environment}
                      </p>
                      <ScopeList scopes={entry.scopes} />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={revokeMutation.isPending}
                      onClick={() => revokeMutation.mutate(entry.id)}
                    >
                      Disconnect
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  You have not connected any apps yet.
                </p>
              )}
            </section>

            <section className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <Clock className="h-4 w-4" aria-hidden="true" />
                Waiting for your approval
              </h3>
              {data?.pending.length ? (
                data.pending.map((entry) => (
                  <div key={entry.id} className="space-y-1.5 rounded-lg border border-dashed p-4">
                    <p className="font-medium">{entry.application}</p>
                    <p className="text-xs text-muted-foreground">
                      Requested {formatDate(entry.createdAt)} · expires{" "}
                      {formatDate(entry.expiresAt)}
                    </p>
                    <ScopeList scopes={entry.scopes} />
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nothing is waiting for your approval.
                </p>
              )}
            </section>

            <section className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <ShieldOff className="h-4 w-4" aria-hidden="true" />
                Disconnected
              </h3>
              {data?.revoked.length ? (
                data.revoked.map((entry) => (
                  <div key={entry.id} className="space-y-1 rounded-lg border p-4 opacity-80">
                    <p className="font-medium">{entry.application}</p>
                    <p className="text-xs text-muted-foreground">
                      Disconnected{" "}
                      {entry.revokedAt ? formatDate(entry.revokedAt) : "—"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No disconnected apps.
                </p>
              )}
            </section>
          </>
        )}
      </CardContent>
    </Card>
  );
};
