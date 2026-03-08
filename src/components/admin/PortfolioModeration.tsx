import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Image, Film, Music, FileText, ExternalLink } from "lucide-react";

interface PortfolioItem {
  id: string;
  user_id: string;
  title: string;
  media_type: string;
  media_url: string;
  created_at: string;
  user_name?: string;
  user_roles?: string[];
}

export const PortfolioModeration = () => {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPortfolioItems();
    
    const channel = supabase
      .channel('portfolio_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'portfolio_items'
      }, () => {
        fetchPortfolioItems();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPortfolioItems = async () => {
    const { data, error } = await supabase
      .from('portfolio_items')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      // Fetch creative roles for all users
      const userIds = [...new Set(data.map((item: any) => item.user_id))];
      const { data: rolesData } = await supabase
        .from('user_creative_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      const rolesMap = new Map<string, string[]>();
      rolesData?.forEach((r: any) => {
        const existing = rolesMap.get(r.user_id) || [];
        existing.push(r.role);
        rolesMap.set(r.user_id, existing);
      });

      const formattedItems = data.map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        title: item.title,
        media_type: item.media_type,
        media_url: item.media_url,
        created_at: item.created_at,
        user_name: item.profiles?.full_name || 'Unknown',
        user_roles: rolesMap.get(item.user_id) || []
      }));
      setItems(formattedItems);
    }
    setLoading(false);
  };

  const getMediaIcon = (mediaType: string) => {
    switch (mediaType.toLowerCase()) {
      case 'image':
        return <Image className="w-4 h-4" />;
      case 'video':
        return <Film className="w-4 h-4" />;
      case 'audio':
        return <Music className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getMediaTypeBadge = (mediaType: string) => {
    const variants: Record<string, any> = {
      image: 'default',
      video: 'secondary',
      audio: 'outline',
    };
    return variants[mediaType.toLowerCase()] || 'outline';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="w-5 h-5" />
          Portfolio Moderation
        </CardTitle>
        <CardDescription>Review and manage user portfolio items</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          {loading ? (
            <p className="text-muted-foreground">Loading portfolio items...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Artist</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant={getMediaTypeBadge(item.media_type)}>
                        <span className="flex items-center gap-1">
                          {getMediaIcon(item.media_type)}
                          {item.media_type}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {item.title}
                    </TableCell>
                    <TableCell>{item.user_name}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap max-w-[200px]">
                        {item.user_roles?.slice(0, 2).map((role, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {role}
                          </Badge>
                        ))}
                        {item.user_roles && item.user_roles.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{item.user_roles.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(item.created_at), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(item.media_url, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No portfolio items found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};