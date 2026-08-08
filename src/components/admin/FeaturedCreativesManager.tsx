import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Star, Plus, Trash2, Search, Calendar } from "lucide-react";

interface FeaturedCreative {
  id: string;
  user_id: string;
  reason: string | null;
  is_active: boolean | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
  featured_by: string | null;
  profile?: {
    full_name: string;
    username: string;
    avatar_url: string | null;
  };
}

interface SearchResult {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
}

export const FeaturedCreativesManager = () => {
  const [featured, setFeatured] = useState<FeaturedCreative[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null);
  const [reason, setReason] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadFeaturedCreatives();
  }, []);

  const loadFeaturedCreatives = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("featured_creatives")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load featured creatives");
      setLoading(false);
      return;
    }

    // Fetch profiles for each featured creative
    const enrichedData = await Promise.all(
      (data || []).map(async (item) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, username, avatar_url")
          .eq("id", item.user_id)
          .maybeSingle();

        return {
          ...item,
          profile: profile || undefined,
        };
      })
    );

    setFeatured(enrichedData);
    setLoading(false);
  };

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
      .limit(10);

    setSearchResults(data || []);
    setSearching(false);
  };

  const handleAddFeatured = async () => {
    if (!selectedUser) {
      toast.error("Please select a user");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Not authenticated");
      return;
    }

    // Check if already featured
    const existing = featured.find(f => f.user_id === selectedUser.id && f.is_active);
    if (existing) {
      toast.error("This user is already featured");
      return;
    }

    const { error } = await supabase.from("featured_creatives").insert({
      user_id: selectedUser.id,
      featured_by: user.id,
      reason: reason || null,
      end_date: endDate || null,
      is_active: true,
    });

    if (error) {
      toast.error("Failed to add featured creative");
      return;
    }

    toast.success(`${selectedUser.full_name} is now featured!`);
    setDialogOpen(false);
    setSelectedUser(null);
    setReason("");
    setEndDate("");
    setSearchQuery("");
    setSearchResults([]);
    loadFeaturedCreatives();
  };

  const handleRemoveFeatured = async (id: string, userName: string) => {
    const { error } = await supabase
      .from("featured_creatives")
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      toast.error("Failed to remove featured creative");
      return;
    }

    toast.success(`${userName} removed from featured`);
    loadFeaturedCreatives();
  };

  const handleDeleteFeatured = async (id: string) => {
    const { error } = await supabase
      .from("featured_creatives")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete featured record");
      return;
    }

    toast.success("Featured record deleted");
    loadFeaturedCreatives();
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("featured_creatives")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update status");
      return;
    }

    toast.success(`Status updated`);
    loadFeaturedCreatives();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-secondary" />
              Featured Creatives
            </CardTitle>
            <CardDescription>
              Manage featured creatives shown on the Discover page
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Featured
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Featured Creative</DialogTitle>
                <DialogDescription>
                  Search for a user to feature on the Discover page
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Search User</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or username..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        searchUsers(e.target.value);
                      }}
                      className="pl-9"
                    />
                  </div>
                  {searchResults.length > 0 && (
                    <div className="border rounded-md max-h-48 overflow-y-auto">
                      {searchResults.map((user) => (
                        <div
                          key={user.id}
                          className={`flex items-center gap-3 p-2 cursor-pointer hover:bg-muted transition-colors ${
                            selectedUser?.id === user.id ? "bg-primary/10" : ""
                          }`}
                          onClick={() => {
                            setSelectedUser(user);
                            setSearchQuery(user.full_name);
                            setSearchResults([]);
                          }}
                        >
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback>{user.full_name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{user.full_name}</p>
                            <p className="text-xs text-muted-foreground">@{user.username}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedUser && (
                    <div className="flex items-center gap-2 p-2 bg-secondary/10 rounded-md">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={selectedUser.avatar_url || undefined} />
                        <AvatarFallback>{selectedUser.full_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{selectedUser.full_name}</span>
                      <Badge variant="secondary" className="ml-auto">Selected</Badge>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Featured Reason (optional)</Label>
                  <Textarea
                    placeholder="e.g., Rising star producer, Top collaborator..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date (optional)</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddFeatured} disabled={!selectedUser}>
                  Add Featured
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-center py-8">Loading...</p>
        ) : featured.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No featured creatives yet</p>
            <p className="text-sm">Add your first featured creative above</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {featured.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={item.profile?.avatar_url || undefined} />
                        <AvatarFallback>
                          {item.profile?.full_name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{item.profile?.full_name || "Unknown"}</p>
                        <p className="text-sm text-muted-foreground">
                          @{item.profile?.username || "unknown"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {item.reason || "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={item.is_active ? "default" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => handleToggleActive(item.id, !!item.is_active)}
                    >
                      {item.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {item.end_date ? (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {new Date(item.end_date).toLocaleDateString()}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">No end date</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Featured Creative</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove {item.profile?.full_name} from featured creatives?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteFeatured(item.id)}
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
