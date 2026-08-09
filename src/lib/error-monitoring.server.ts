/**
 * Production error monitoring: records server crashes and client runtime errors
 * into function_run_logs (surfaced by the admin Function Run History page) and
 * emails an alert to the ops inbox, throttled per error fingerprint.
 */
import { recordFunctionRun } from "@/lib/functionRunLog.server";
import { hasResend, sendEmail } from "@/lib/email/resend.server";
import { isBenignTransportError } from "@/lib/benignErrors";

export type ErrorReport = {
  source: "client" | "server";
  message: string;
  stack?: string | null;
  route?: string | null;
  userAgent?: string | null;
  release?: string | null;
  mechanism?: string | null;
  correlationId?: string | null;
};

const ALERT_WINDOW_MS = 15 * 60 * 1000;
const lastAlertAt = new Map<string, number>();

export function fingerprint(report: ErrorReport): string {
  const firstFrame = (report.stack ?? "").split("\n")[1]?.trim() ?? "";
  return `${report.source}:${report.message.slice(0, 160)}:${firstFrame.slice(0, 120)}`;
}

function shouldAlert(key: string): boolean {
  const now = Date.now();
  const previous = lastAlertAt.get(key);
  if (previous && now - previous < ALERT_WINDOW_MS) return false;
  lastAlertAt.set(key, now);
  return true;
}

async function alertInbox(): Promise<string> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("admin_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["alert_inbox", "support_inbox"]);
    const map = new Map(
      (data ?? []).map((row) => [
        row.setting_key,
        typeof row.setting_value === "string"
          ? row.setting_value.replace(/^"|"$/g, "")
          : String(row.setting_value ?? ""),
      ]),
    );
    return map.get("alert_inbox") || map.get("support_inbox") || "hello@artistrysynk.app";
  } catch {
    return "hello@artistrysynk.app";
  }
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] as string);

export async function reportError(report: ErrorReport): Promise<{ logged: boolean; alerted: boolean }> {
  // Ignore client-disconnect noise so it never reaches logs or alerts.
  if (isBenignTransportError(new Error(`${report.message}\n${report.stack ?? ""}`))) {
    return { logged: false, alerted: false };
  }
  const key = fingerprint(report);

  await recordFunctionRun({
    functionName: report.source === "client" ? "client-runtime-error" : "server-crash",
    status: "error",
    durationMs: 0,
    errorMessage: report.message,
    context: {
      route: report.route ?? null,
      mechanism: report.mechanism ?? null,
      release: report.release ?? null,
      user_agent: report.userAgent ? report.userAgent.slice(0, 300) : null,
      stack: report.stack ? report.stack.slice(0, 4000) : null,
      correlation_id: report.correlationId ?? null,
      fingerprint: key,
    },
  });

  if (!shouldAlert(key) || !hasResend()) return { logged: true, alerted: false };

  try {
    await sendEmail({
      to: await alertInbox(),
      subject: `[ArtistrySynk ${report.source === "client" ? "client" : "server"} error] ${report.message.slice(0, 90)}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:640px">
          <h2 style="color:#b91c1c">${report.source === "client" ? "Client runtime error" : "Server crash"}</h2>
          <p><strong>Message:</strong> ${escapeHtml(report.message)}</p>
          <p><strong>Route:</strong> ${escapeHtml(report.route ?? "unknown")}</p>
          <p><strong>Mechanism:</strong> ${escapeHtml(report.mechanism ?? "n/a")}</p>
          <p><strong>When:</strong> ${new Date().toISOString()}</p>
          <pre style="background:#f5f5f5;padding:12px;border-radius:6px;white-space:pre-wrap;font-size:12px">${escapeHtml((report.stack ?? "no stack").slice(0, 3000))}</pre>
          <p style="font-size:12px;color:#666">Further alerts for this error are muted for 15 minutes. Full history: /admin-function-logs</p>
        </div>`,
    });
    return { logged: true, alerted: true };
  } catch (err) {
    console.error("[error-monitoring] alert email failed", err);
    return { logged: true, alerted: false };
  }
}
