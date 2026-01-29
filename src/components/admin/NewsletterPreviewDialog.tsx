import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Monitor, Smartphone, Tablet, X, Send, CalendarClock, Users } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface NewsletterPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: string;
  previewText: string;
  htmlContent: string;
  templateName: string;
  audience: "subscribers" | "users" | "both";
  scheduledAt?: Date | null;
  onConfirmSend?: () => void;
  onConfirmSchedule?: () => void;
  isSending?: boolean;
  isScheduling?: boolean;
}

type DevicePreview = "desktop" | "tablet" | "mobile";

const deviceWidths: Record<DevicePreview, number> = {
  desktop: 600,
  tablet: 480,
  mobile: 320,
};

export const NewsletterPreviewDialog = ({
  open,
  onOpenChange,
  subject,
  previewText,
  htmlContent,
  templateName,
  audience,
  scheduledAt,
  onConfirmSend,
  onConfirmSchedule,
  isSending,
  isScheduling,
}: NewsletterPreviewDialogProps) => {
  const [device, setDevice] = useState<DevicePreview>("desktop");

  const getAudienceLabel = () => {
    switch (audience) {
      case "subscribers":
        return "Newsletter Subscribers";
      case "users":
        return "Registered App Users";
      case "both":
        return "All Subscribers & Users";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">Email Preview</DialogTitle>
              <DialogDescription>
                Review how your newsletter will appear to recipients
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Email metadata */}
        <div className="px-6 py-4 bg-muted/30 border-b space-y-3 shrink-0">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1">
              🎨 {templateName}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Users className="w-3 h-3" />
              {getAudienceLabel()}
            </Badge>
            {scheduledAt && (
              <Badge variant="default" className="gap-1">
                <CalendarClock className="w-3 h-3" />
                {scheduledAt.toLocaleString()}
              </Badge>
            )}
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground font-medium w-20">Subject:</span>
              <span className="font-semibold">{subject || "(No subject)"}</span>
            </div>
            {previewText && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground font-medium w-20">Preview:</span>
                <span className="text-muted-foreground">{previewText}</span>
              </div>
            )}
          </div>
        </div>

        {/* Device selector */}
        <div className="px-6 py-3 border-b flex items-center justify-center gap-2 shrink-0">
          <span className="text-sm text-muted-foreground mr-2">Preview as:</span>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={device === "desktop" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setDevice("desktop")}
              className="gap-1.5"
            >
              <Monitor className="w-4 h-4" />
              Desktop
            </Button>
            <Button
              variant={device === "tablet" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setDevice("tablet")}
              className="gap-1.5"
            >
              <Tablet className="w-4 h-4" />
              Tablet
            </Button>
            <Button
              variant={device === "mobile" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setDevice("mobile")}
              className="gap-1.5"
            >
              <Smartphone className="w-4 h-4" />
              Mobile
            </Button>
          </div>
        </div>

        {/* Email preview */}
        <ScrollArea className="flex-1 bg-muted/50">
          <div className="p-6 flex justify-center">
            <div
              className={cn(
                "bg-background rounded-lg shadow-lg border transition-all duration-300 overflow-hidden",
                device === "mobile" && "rounded-[2rem]"
              )}
              style={{ width: deviceWidths[device], maxWidth: "100%" }}
            >
              {/* Email client header simulation */}
              <div className="bg-muted/50 border-b px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    A
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">ArtistrySynk</p>
                    <p className="text-xs text-muted-foreground truncate">noreply@artistrysynk.com</p>
                  </div>
                </div>
                <p className="text-sm font-semibold truncate">{subject || "(No subject)"}</p>
                {previewText && (
                  <p className="text-xs text-muted-foreground truncate">{previewText}</p>
                )}
              </div>

              {/* Email content */}
              <div
                dangerouslySetInnerHTML={{ __html: htmlContent }}
                className="overflow-x-hidden"
              />
            </div>
          </div>
        </ScrollArea>

        {/* Action buttons */}
        <div className="px-6 py-4 border-t flex items-center justify-end gap-3 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
          
          {onConfirmSchedule && scheduledAt && (
            <Button
              onClick={onConfirmSchedule}
              disabled={isScheduling}
              variant="secondary"
            >
              <CalendarClock className="w-4 h-4 mr-2" />
              {isScheduling ? "Scheduling..." : "Confirm Schedule"}
            </Button>
          )}
          
          {onConfirmSend && !scheduledAt && (
            <Button
              onClick={onConfirmSend}
              disabled={isSending}
            >
              <Send className="w-4 h-4 mr-2" />
              {isSending ? "Sending..." : "Send Now"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
