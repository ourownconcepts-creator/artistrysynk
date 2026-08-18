import { openExternalUrl } from "@/lib/nativeMedia";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Music, Video, Image, FileText, Play, ExternalLink, Trash2, Flag } from "lucide-react";
import { toast } from "sonner";
import { FlagContentDialog } from "@/components/FlagContentDialog";

interface PortfolioItem {
  id: string;
  title: string;
  description: string | null;
  media_type: string;
  media_url: string;
  created_at: string | null;
  before_media_url?: string | null;
  after_media_url?: string | null;
  is_transformation?: boolean | null;
  captured_on?: string | null;
}

interface PortfolioGridProps {
  userId: string;
  editable?: boolean;
  onItemClick?: (item: PortfolioItem) => void;
  showReportButton?: boolean;
}

const getMediaIcon = (type: string) => {
  switch (type) {
    case "audio": return Music;
    case "video": return Video;
    case "image": return Image;
    default: return FileText;
  }
};

export const PortfolioGrid = ({ userId, editable = false, onItemClick, showReportButton = false }: PortfolioGridProps) => {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadItems();
  }, [userId]);

  const loadItems = async () => {
    const { data, error } = await supabase
      .from("portfolio_items")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load portfolio");
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  const deleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const { error } = await supabase
      .from("portfolio_items")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete item");
    } else {
      toast.success("Item deleted");
      loadItems();
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <div className="aspect-square bg-muted" />
          </Card>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No portfolio items yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {items.map((item) => {
        const Icon = getMediaIcon(item.media_type);
        
        return (
          <Card 
            key={item.id} 
            className="group cursor-pointer overflow-hidden hover:shadow-lg transition-shadow-sm"
            onClick={() => onItemClick?.(item)}
          >
            <div className="aspect-square relative bg-gradient-to-br from-primary/10 to-secondary/10">
              {item.is_transformation && item.before_media_url && item.after_media_url ? (
                <div className="grid h-full w-full grid-cols-2">
                  {([
                    { label: "Before", src: item.before_media_url },
                    { label: "After", src: item.after_media_url },
                  ] as const).map(({ label, src }) => (
                    <div key={label} className="relative h-full w-full overflow-hidden">
                      <img src={src} alt={`${label}: ${item.title}`} className="h-full w-full object-cover" />
                      <span className="absolute bottom-1 left-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              ) : item.media_type === "image" ? (
                <img 
                  src={item.media_url} 
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              ) : item.media_type === "video" ? (
                <div className="relative w-full h-full">
                  <video 
                    src={item.media_url}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <Play className="w-12 h-12 text-white" />
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Icon className="w-16 h-16 text-muted-foreground/50" />
                </div>
              )}
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">
                      {item.is_transformation ? "before & after" : item.media_type}
                    </Badge>
                    <div className="flex gap-1">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-white hover:bg-white/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          void openExternalUrl(item.media_url);
                        }}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      {editable && (
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-white hover:bg-destructive/80"
                          onClick={(e) => deleteItem(item.id, e)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                      {showReportButton && (
                        <FlagContentDialog
                          contentType="portfolio"
                          contentId={item.id}
                          trigger={
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 text-white hover:bg-destructive/80"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Flag className="w-4 h-4" />
                            </Button>
                          }
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <CardContent className="p-3">
              <h3 className="font-medium truncate">{item.title}</h3>
              {item.description && (
                <p className="text-xs text-muted-foreground truncate">{item.description}</p>
              )}
              {item.captured_on && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {new Date(item.captured_on).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
