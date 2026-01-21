import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PendingCounts {
  flags: number;
  appeals: number;
  verifications: number;
  careers: number;
  leads: number;
  jobApplications: number;
  projectApplications: number;
  serviceOrders: number;
}

export const useAdminPendingCounts = () => {
  const [counts, setCounts] = useState<PendingCounts>({
    flags: 0,
    appeals: 0,
    verifications: 0,
    careers: 0,
    leads: 0,
    jobApplications: 0,
    projectApplications: 0,
    serviceOrders: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchCounts = async () => {
    try {
      const [
        flagsRes,
        appealsRes,
        verificationsRes,
        careersRes,
        leadsRes,
        jobAppsRes,
        projectAppsRes,
        ordersRes,
      ] = await Promise.all([
        supabase.from("content_flags").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("content_appeals").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("verification_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("career_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("contact_submissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("job_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("project_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("service_orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);

      setCounts({
        flags: flagsRes.count || 0,
        appeals: appealsRes.count || 0,
        verifications: verificationsRes.count || 0,
        careers: careersRes.count || 0,
        leads: leadsRes.count || 0,
        jobApplications: jobAppsRes.count || 0,
        projectApplications: projectAppsRes.count || 0,
        serviceOrders: ordersRes.count || 0,
      });
    } catch (error) {
      console.error("Failed to fetch pending counts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounts();

    // Refresh counts every 30 seconds
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  return { counts, loading, refetch: fetchCounts };
};
