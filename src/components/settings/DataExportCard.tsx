import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { exportMyData } from "@/lib/export-my-data.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2, ImageIcon } from "lucide-react";
import { toast } from "sonner";

export const DataExportCard = () => {
  const runExport = useServerFn(exportMyData);
  const [loading, setLoading] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);

  const download = (filename: string, content: string, type: string) => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const result = await runExport();
      const stamp = new Date().toISOString().slice(0, 10);
      download(`artistrysynk-data-${stamp}.json`, result.json, "application/json");
      setMediaUrls(result.mediaUrls);
      toast.success("Your data export has been downloaded.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not prepare your export.");
    } finally {
      setLoading(false);
    }
  };

  const handleMediaList = () => {
    download(`artistrysynk-media-${new Date().toISOString().slice(0, 10)}.txt`, mediaUrls.join("\n"), "text/plain");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="w-5 h-5" />
          Download my data
        </CardTitle>
        <CardDescription>
          Export your profile, settings, portfolio, projects, notifications and referrals as a JSON
          file, plus direct links to all of your uploaded media.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={handleExport} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {loading ? "Preparing export…" : "Download my data"}
        </Button>
        {mediaUrls.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {mediaUrls.length} media file{mediaUrls.length === 1 ? "" : "s"} found in your export.
            </p>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleMediaList}>
              <ImageIcon className="w-4 h-4" />
              Download media link list
            </Button>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Tip: download your data before deleting your account — deletion is permanent.
        </p>
      </CardContent>
    </Card>
  );
};