import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InitializeRequest {
  email: string;
  plan: "pro" | "studio";
  userId: string;
}

const PLAN_PRICES = {
  pro: 250000, // ₦2,500 in kobo
  studio: 1500000, // ₦15,000 in kobo
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, plan, userId }: InitializeRequest = await req.json();
    const paystackKey = Deno.env.get("PAYSTACK_SECRET_KEY");

    if (!paystackKey) {
      throw new Error("Paystack secret key not configured");
    }

    // Initialize transaction with Paystack
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: PLAN_PRICES[plan],
        currency: "NGN",
        callback_url: `${req.headers.get("origin")}/pricing?success=true`,
        metadata: {
          user_id: userId,
          plan,
          custom_fields: [
            {
              display_name: "Plan",
              variable_name: "plan",
              value: plan,
            },
          ],
        },
      }),
    });

    const data = await response.json();

    if (!data.status) {
      throw new Error(data.message || "Failed to initialize payment");
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error initializing payment:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
