import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Link2, Plus, ExternalLink, Trash2, Cloud } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ExternalLink {
  id: string;
  provider: string;
  file_name: string;
  file_url: string;
  file_type: string;
  created_at: string;
  added_by: string;
}

interface ExternalFileLinksProps {
  projectId: string;
  currentUserId: string;
}

const PROVIDERS = [
  { value: "google_drive", label: "Google Drive", icon: "🔵" },
  { value: "dropbox", label: "Dropbox", icon: "📦" },
  { value: "onedrive", label: "OneDrive", icon: "☁️" },
  { value: "other", label: "Other", icon: "🔗" },
];

export const ExternalFileLinks = ({ projectId, currentUserId }: ExternalFileLinksProps) => {
  const [links, setLinks] = useState<ExternalLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [addLinkOpen, setAddLinkOpen] = useState(false);
  const [newLink, setNewLink] = useState({
    provider: "google_drive",
    file_name: "",
    file_url: "",
    file_type: "",
  });

  useEffect(() => {
    loadLinks();
  }, [projectId]);

  const loadLinks = async () => {
    const { data, error } = await supabase
      .from("external_file_links")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading links:", error);
    } else {
      setLinks(data || []);
    }
    setLoading(false);
  };

  const addLink = async () => {
    if (!newLink.file_name || !newLink.file_url) {
      toast.error("Name and URL are required");
      return;
    }

    // Basic URL validation
    try {
      new URL(newLink.file_url);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }

    const { error } = await supabase.from("external_file_links").insert({
      project_id: projectId,
      added_by: currentUserId,
      provider: newLink.provider,
      file_name: newLink.file_name,
      file_url: newLink.file_url,
      file_type: newLink.file_type || "link",
    });

    if (error) {
      toast.error("Failed to add link");
    } else {
      toast.success("Link added!");
      setAddLinkOpen(false);
      setNewLink({ provider: "google_drive", file_name: "", file_url: "", file_type: "" });
      loadLinks();
    }
  };

  const removeLink = async (linkId: string) => {
    const { error } = await supabase
      .from("external_file_links")
      .delete()
      .eq("id", linkId);

    if (error) {
      toast.error("Failed to remove link");
    } else {
      toast.success("Link removed");
      loadLinks();
    }
  };

  const getProviderInfo = (provider: string) => {
    return PROVIDERS.find(p => p.value === provider) || PROVIDERS[3];
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Cloud className="w-5 h-5" />
          Cloud Files
        </CardTitle>
        <Dialog open={addLinkOpen} onOpenChange={setAddLinkOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Link
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Cloud File Link</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select
                  value={newLink.provider}
                  onValueChange={(v) => setNewLink({ ...newLink, provider: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map((provider) => (
                      <SelectItem key={provider.value} value={provider.value}>
                        <span className="flex items-center gap-2">
                          <span>{provider.icon}</span>
                          {provider.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>File Name</Label>
                <Input
                  value={newLink.file_name}
                  onChange={(e) => setNewLink({ ...newLink, file_name: e.target.value })}
                  placeholder="e.g., Project Assets"
                />
              </div>
              <div className="space-y-2">
                <Label>Share Link</Label>
                <Input
                  value={newLink.file_url}
                  onChange={(e) => setNewLink({ ...newLink, file_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>File Type (optional)</Label>
                <Input
                  value={newLink.file_type}
                  onChange={(e) => setNewLink({ ...newLink, file_type: e.target.value })}
                  placeholder="e.g., folder, document, audio"
                />
              </div>
              <Button onClick={addLink} className="w-full">
                <Link2 className="w-4 h-4 mr-2" />
                Add Link
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {links.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No cloud files linked yet. Add Google Drive, Dropbox, or other links to share files.
          </p>
        ) : (
          <div className="space-y-2">
            {links.map((link) => {
              const provider = getProviderInfo(link.provider);
              return (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                >
                  <a
                    href={link.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <span className="text-xl">{provider.icon}</span>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{link.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {provider.label} • {formatDistanceToNow(new Date(link.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </a>
                  <div className="flex items-center gap-2">
                    <a
                      href={link.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </a>
                    {link.added_by === currentUserId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLink(link.id)}
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};