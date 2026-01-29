import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Send, Mail, Users, Loader2, Palette, Clock, CalendarClock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { newsletterTemplates, getTemplateById } from "@/lib/newsletterTemplates";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScheduledNewsletters } from "./ScheduledNewsletters";

export const NewsletterCampaign = () => {
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("gradient-header");
  const [audience, setAudience] = useState<"subscribers" | "users" | "both">("both");
  const [isSending, setIsSending] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [lastResult, setLastResult] = useState<{
    sent: number;
    failed: number;
    total: number;
  } | null>(null);

  const sendCampaign = async () => {
    if (!subject.trim() || !content.trim()) {
      toast.error("Please enter both subject and content");
      return;
    }

    setIsSending(true);
    try {
      // Get the template and generate HTML
      const template = getTemplateById(selectedTemplate);
      const htmlContent = template 
        ? template.generateHtml(content.trim(), subject.trim())
        : content.trim();

      const { data, error } = await supabase.functions.invoke("send-newsletter-campaign", {
        body: {
          subject: subject.trim(),
          content: htmlContent,
          previewText: previewText.trim() || undefined,
          audience,
          useRawHtml: true,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setLastResult({
        sent: data.sent,
        failed: data.failed,
        total: data.totalRecipients,
      });

      toast.success(`Newsletter sent to ${data.sent} recipients!`, {
        description: data.failed > 0 ? `${data.failed} failed to send` : undefined,
      });

      // Clear form on success
      setSubject("");
      setContent("");
      setPreviewText("");
    } catch (error: any) {
      console.error("Newsletter campaign error:", error);
      toast.error("Failed to send newsletter campaign");
    } finally {
      setIsSending(false);
    }
  };

  const scheduleNewsletter = async () => {
    if (!subject.trim() || !content.trim()) {
      toast.error("Please enter both subject and content");
      return;
    }

    if (!scheduleDate || !scheduleTime) {
      toast.error("Please select a date and time for scheduling");
      return;
    }

    const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`);
    if (scheduledAt <= new Date()) {
      toast.error("Scheduled time must be in the future");
      return;
    }

    setIsScheduling(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      const template = getTemplateById(selectedTemplate);
      const htmlContent = template 
        ? template.generateHtml(content.trim(), subject.trim())
        : content.trim();

      const { error } = await supabase
        .from("scheduled_newsletters")
        .insert({
          subject: subject.trim(),
          content: htmlContent,
          preview_text: previewText.trim() || null,
          audience,
          template_id: selectedTemplate,
          scheduled_at: scheduledAt.toISOString(),
          created_by: user.id,
        });

      if (error) throw error;

      toast.success(`Newsletter scheduled for ${scheduledAt.toLocaleString()}!`);
      queryClient.invalidateQueries({ queryKey: ["scheduled-newsletters"] });

      // Clear form
      setSubject("");
      setContent("");
      setPreviewText("");
      setScheduleDate("");
      setScheduleTime("");
    } catch (error: any) {
      console.error("Schedule newsletter error:", error);
      toast.error("Failed to schedule newsletter");
    } finally {
      setIsScheduling(false);
    }
  };

  const currentTemplate = getTemplateById(selectedTemplate);

  return (
    <Tabs defaultValue="compose" className="space-y-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="compose" className="gap-2">
          <Mail className="w-4 h-4" />
          Compose
        </TabsTrigger>
        <TabsTrigger value="scheduled" className="gap-2">
          <CalendarClock className="w-4 h-4" />
          Scheduled
        </TabsTrigger>
      </TabsList>

      <TabsContent value="compose" className="space-y-6">
        {/* Template Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Choose Template
            </CardTitle>
            <CardDescription>
              Select a pre-designed template for your newsletter
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {newsletterTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                  className={cn(
                    "p-4 rounded-lg border-2 text-left transition-all hover:border-primary/50",
                    selectedTemplate === template.id
                      ? "border-primary bg-primary/5"
                      : "border-muted bg-muted/30"
                  )}
                >
                  <span className="text-2xl mb-2 block">{template.thumbnail}</span>
                  <p className="font-medium text-sm">{template.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {template.description}
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Compose Email */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Compose Newsletter
            </CardTitle>
            <CardDescription>
              Write your newsletter content. It will be styled with the selected template.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {lastResult && (
              <div className="bg-muted/50 rounded-lg p-4 flex items-center gap-4">
                <Users className="w-8 h-8 text-primary" />
                <div>
                  <p className="font-medium">Last Campaign Results</p>
                  <p className="text-sm text-muted-foreground">
                    Sent: {lastResult.sent} | Failed: {lastResult.failed} | Total: {lastResult.total}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Audience</Label>
              <RadioGroup
                value={audience}
                onValueChange={(value) => setAudience(value as "subscribers" | "users" | "both")}
                className="flex flex-wrap gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="subscribers" id="subscribers" />
                  <Label htmlFor="subscribers" className="cursor-pointer">Newsletter Subscribers Only</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="users" id="users" />
                  <Label htmlFor="users" className="cursor-pointer">Registered App Users Only</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="both" id="both" />
                  <Label htmlFor="both" className="cursor-pointer">Both (Subscribers + Users)</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Email Subject *</Label>
                <Input
                  id="subject"
                  placeholder="Your newsletter subject line..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={isSending || isScheduling}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="previewText">Preview Text (optional)</Label>
                <Input
                  id="previewText"
                  placeholder="Text shown in email client preview..."
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  disabled={isSending || isScheduling}
                />
                <p className="text-xs text-muted-foreground">
                  This appears in email clients next to the subject line
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Email Content (HTML supported) *</Label>
                <Textarea
                  id="content"
                  placeholder="<h2>Hello Creatives!</h2><p>We have exciting news...</p>"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                  disabled={isSending || isScheduling}
                />
                <p className="text-xs text-muted-foreground">
                  Your content will be wrapped in the selected template design.
                </p>
              </div>

              {content && currentTemplate && (
                <div className="space-y-2">
                  <Label>Preview ({currentTemplate.name} Template)</Label>
                  <div className="border rounded-lg overflow-hidden bg-background">
                    <div
                      className="prose prose-sm max-w-none"
                      style={{ backgroundColor: selectedTemplate === 'dark-mode' || selectedTemplate === 'creative-spotlight' ? '#0a0a0b' : '#f4f4f5' }}
                      dangerouslySetInnerHTML={{ 
                        __html: currentTemplate.generateHtml(content, subject || 'Newsletter Subject') 
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Schedule Options */}
              <Card className="bg-muted/30 border-dashed">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Schedule for Later
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="scheduleDate">Date</Label>
                      <Input
                        id="scheduleDate"
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        disabled={isSending || isScheduling}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="scheduleTime">Time</Label>
                      <Input
                        id="scheduleTime"
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        disabled={isSending || isScheduling}
                      />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={scheduleNewsletter}
                    disabled={isSending || isScheduling || !subject.trim() || !content.trim() || !scheduleDate || !scheduleTime}
                  >
                    {isScheduling ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Scheduling...
                      </>
                    ) : (
                      <>
                        <CalendarClock className="w-4 h-4 mr-2" />
                        Schedule Newsletter
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Send Now */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    className="w-full"
                    disabled={isSending || isScheduling || !subject.trim() || !content.trim()}
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending Campaign...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Now
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Send Newsletter Campaign?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will send the newsletter using the "{currentTemplate?.name}" template to {
                        audience === "subscribers" ? "newsletter subscribers" :
                        audience === "users" ? "registered app users" :
                        "all subscribers and users"
                      }. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={sendCampaign}>
                      Send Newsletter
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="scheduled">
        <ScheduledNewsletters />
      </TabsContent>
    </Tabs>
  );
};
