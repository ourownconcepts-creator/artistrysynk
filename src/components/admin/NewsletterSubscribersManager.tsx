import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format } from "date-fns";
import { Mail, Users, Search, RefreshCw, UserX, UserCheck, Download } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface NewsletterSubscriber {
  id: string;
  email: string;
  is_active: boolean;
  subscribed_at: string;
  unsubscribed_at: string | null;
}

export const NewsletterSubscribersManager = () => {
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showActive, setShowActive] = useState(true);

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const fetchSubscribers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("newsletter_subscribers")
      .select("*")
      .order("subscribed_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch newsletter subscribers");
      console.error(error);
    } else {
      setSubscribers(data || []);
    }
    setLoading(false);
  };

  const toggleSubscriberStatus = async (id: string, currentStatus: boolean) => {
    const updates = {
      is_active: !currentStatus,
      unsubscribed_at: currentStatus ? new Date().toISOString() : null,
    };

    const { error } = await supabase
      .from("newsletter_subscribers")
      .update(updates)
      .eq("id", id);

    if (error) {
      toast.error("Failed to update subscriber status");
    } else {
      toast.success(currentStatus ? "Subscriber deactivated" : "Subscriber reactivated");
      fetchSubscribers();
    }
  };

  const deleteSubscriber = async (id: string) => {
    const { error } = await supabase
      .from("newsletter_subscribers")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete subscriber");
    } else {
      toast.success("Subscriber deleted");
      fetchSubscribers();
    }
  };

  const exportToCSV = () => {
    const activeSubscribers = subscribers.filter((s) => s.is_active);
    const csvContent = [
      "Email,Subscribed Date",
      ...activeSubscribers.map(
        (s) => `${s.email},${format(new Date(s.subscribed_at), "yyyy-MM-dd")}`
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter-subscribers-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success("Exported active subscribers to CSV");
  };

  const filteredSubscribers = subscribers.filter((s) => {
    const matchesSearch = s.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = showActive ? s.is_active : !s.is_active;
    return matchesSearch && matchesStatus;
  });

  const activeCount = subscribers.filter((s) => s.is_active).length;
  const inactiveCount = subscribers.filter((s) => !s.is_active).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Newsletter Subscribers
            </CardTitle>
            <CardDescription>
              Manage your newsletter mailing list
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="default" className="gap-1">
                <Users className="w-3 h-3" />
                {activeCount} active
              </Badge>
              <Badge variant="secondary">{inactiveCount} inactive</Badge>
            </div>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showActive ? "default" : "outline"}
              size="sm"
              onClick={() => setShowActive(true)}
            >
              Active
            </Button>
            <Button
              variant={!showActive ? "default" : "outline"}
              size="sm"
              onClick={() => setShowActive(false)}
            >
              Inactive
            </Button>
          </div>
          <Button variant="outline" size="icon" onClick={fetchSubscribers}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading subscribers...</p>
        ) : filteredSubscribers.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No subscribers found
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Subscribed</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscribers.map((subscriber) => (
                <TableRow key={subscriber.id}>
                  <TableCell className="font-medium">{subscriber.email}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(subscriber.subscribed_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    {subscriber.is_active ? (
                      <Badge variant="default" className="gap-1">
                        <UserCheck className="w-3 h-3" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <UserX className="w-3 h-3" />
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          toggleSubscriberStatus(subscriber.id, subscriber.is_active)
                        }
                      >
                        {subscriber.is_active ? "Deactivate" : "Reactivate"}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Subscriber</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to permanently delete{" "}
                              {subscriber.email}? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteSubscriber(subscriber.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
