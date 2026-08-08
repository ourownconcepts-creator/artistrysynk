const PLAN_PRICES: Record<string, number> = {
  pro: 450000,
  studio: 1500000,
};

export interface PaystackInitializeResult {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export async function initializePaystackTransaction(params: {
  email: string;
  plan: string;
  userId: string;
  authenticatedUserId: string;
  origin: string | null;
}): Promise<PaystackInitializeResult> {
  const { email, plan, userId, authenticatedUserId, origin } = params;

  if (!email || typeof email !== "string" || email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Invalid email address");
  }

  if (!plan || !PLAN_PRICES[plan]) {
    throw new Error("Invalid plan. Must be 'pro' or 'studio'");
  }

  if (userId !== authenticatedUserId) {
    throw new Error("User ID mismatch");
  }

  const paystackKey = process.env["PAYSTACK_SECRET_KEY"];
  if (!paystackKey) {
    throw new Error("Payment provider not configured");
  }

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
      callback_url: `${origin}/pricing?success=true`,
      metadata: {
        user_id: authenticatedUserId,
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
    throw new Error("Failed to initialize payment");
  }

  return data;
}
