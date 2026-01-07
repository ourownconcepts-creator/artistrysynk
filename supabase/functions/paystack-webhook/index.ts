import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";
import { encode as encodeHex } from "https://deno.land/std@0.190.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

async function createHmacSHA512(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(message);
  
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  return new TextDecoder().decode(encodeHex(new Uint8Array(signature)));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const paystackKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const body = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    // Verify webhook signature
    const hash = await createHmacSHA512(paystackKey!, body);

    if (hash !== signature) {
      console.error("Invalid webhook signature");
      return new Response("Invalid signature", { status: 401 });
    }

    const event = JSON.parse(body);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Received Paystack event:", event.event);

    if (event.event === "charge.success") {
      const { metadata, customer } = event.data;
      const userId = metadata?.user_id;
      const plan = metadata?.plan;

      if (userId && plan) {
        // Update user subscription
        const { error } = await supabase
          .from("user_subscriptions")
          .upsert({
            user_id: userId,
            tier: plan,
            status: "active",
            paystack_customer_id: customer?.customer_code,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          }, { onConflict: "user_id" });

        if (error) {
          console.error("Error updating subscription:", error);
          throw error;
        }

        console.log(`Subscription updated for user ${userId} to ${plan}`);
      }
    }

    if (event.event === "subscription.disable" || event.event === "subscription.not_renew") {
      const { customer } = event.data;

      // Find user by customer code and downgrade
      const { data: subscription } = await supabase
        .from("user_subscriptions")
        .select("user_id")
        .eq("paystack_customer_id", customer?.customer_code)
        .single();

      if (subscription) {
        await supabase
          .from("user_subscriptions")
          .update({ tier: "free", status: "cancelled" })
          .eq("user_id", subscription.user_id);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
