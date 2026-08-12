import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { listMySupportTickets } from "@/lib/support-tickets.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LifeBuoy, Loader2, MessageSquarePlus } from "lucide-react";

const statusBadge = (status: string) => {
  if (status === "resolved") return <Badge className="bg-primary/15 text-primary">Resolved</Badge>;
  if (status === "reviewed") return <Badge variant="secondary">In review</Badge>;
  if (status === "spam") return <Badge variant="destructive">Closed</Badge>;
  return <Badge variant="outline">Awaiting reply</Badge>;
};

/** Lets a signed-in user track their support requests and read support replies. */
export const MySupportTicketsCard = () => {
  const fetchTickets = useServerFn(listMySupportTickets);
  const { data, isLoading } = useQuery({
    queryKey: ["my-support-tickets"],
    queryFn: () => fetchTickets(),
  });

  const tickets = data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LifeBuoy className="h-5 w-5" />
          My support requests
        </CardTitle>
        <CardDescription>
          Track every request you have sent us, its status, and any reply from the support team.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your requests…
          </p>
        ) : tickets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You have not sent any support requests yet.
          </p>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {tickets.map((ticket) => (
              <AccordionItem key={ticket.id} value={ticket.id}>
                <AccordionTrigger className="text-left">
                  <span className="flex flex-1 flex-wrap items-center gap-2 pr-2">
                    <span className="font-medium">{ticket.subject}</span>
                    {statusBadge(ticket.status)}
                    <span className="text-xs text-muted-foreground">
                      {ticket.referenceId} · {new Date(ticket.createdAt).toLocaleDateString()}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Your message
                    </p>
                    <p className="whitespace-pre-wrap text-sm">{ticket.message}</p>
                  </div>
                  {ticket.adminResponse ? (
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                      <p className="text-xs font-semibold uppercase text-primary">
                        Support replied
                        {ticket.respondedAt
                          ? ` · ${new Date(ticket.respondedAt).toLocaleString()}`
                          : ""}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm">{ticket.adminResponse}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No reply yet — we usually respond within one business day.
                    </p>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link to="/contact">
            <MessageSquarePlus className="h-4 w-4" />
            New support request
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};
