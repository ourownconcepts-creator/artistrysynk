import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const notifyJobApplicationSchema = z.object({
  jobTitle: z.string(),
  jobPosterEmail: z.string().email(),
  jobPosterName: z.string(),
  applicantName: z.string(),
  coverLetter: z.string().optional(),
  applicationId: z.string(),
});

export const notifyJobApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(notifyJobApplicationSchema)
  .handler(async ({ data }) => {
    const { notifyJobApplication } = await import("@/lib/notify-job-application.server");
    return notifyJobApplication(data);
  });
