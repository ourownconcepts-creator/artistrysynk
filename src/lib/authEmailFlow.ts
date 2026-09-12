import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Dedicated client used only to *send* auth emails (sign-up confirmation,
 * password reset).
 *
 * The main client uses the PKCE flow, which stores a code verifier in the
 * browser that created the request. Confirmation links are very often opened
 * somewhere else — the Gmail app's in-app browser, a different browser, another
 * device — where that verifier does not exist, so the exchange fails and the
 * user lands back on the sign-in page still unconfirmed.
 *
 * Using the implicit flow for these emails makes the link self-contained, so it
 * works from any browser. Sessions are never persisted here; the returned
 * tokens are handed to the main client.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export const authEmailClient = createClient<Database>(url, key, {
  auth: {
    flowType: "implicit",
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storage: undefined,
  },
});
