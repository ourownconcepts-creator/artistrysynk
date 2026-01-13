import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderStatusNotificationRequest {
  orderId: string;
  serviceTitle: string;
  buyerEmail: string;
  buyerName: string;
  sellerName: string;
  newStatus: string;
  amount: number;
}

const getStatusMessage = (status: string): { subject: string; heading: string; message: string; color: string } => {
  switch (status) {
    case "in_progress":
      return {
        subject: "Your Order is Now In Progress",
        heading: "Work Has Started! 🎨",
        message: "Great news! The seller has started working on your order. You'll be notified when it's completed.",
        color: "#F59E0B"
      };
    case "completed":
      return {
        subject: "Your Order Has Been Completed",
        heading: "Order Completed! 🎉",
        message: "Your order has been completed. Please review the delivery and leave a rating for the seller.",
        color: "#10B981"
      };
    case "cancelled":
      return {
        subject: "Your Order Has Been Cancelled",
        heading: "Order Cancelled",
        message: "Unfortunately, your order has been cancelled. If you have any questions, please contact support.",
        color: "#EF4444"
      };
    default:
      return {
        subject: "Order Status Update",
        heading: "Order Update",
        message: `Your order status has been updated to: ${status}`,
        color: "#8B5CF6"
      };
  }
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const {
      orderId,
      serviceTitle,
      buyerEmail,
      buyerName,
      sellerName,
      newStatus,
      amount
    }: OrderStatusNotificationRequest = await req.json();

    console.log(`Sending order status notification for order: ${orderId} to ${buyerEmail}`);

    const statusInfo = getStatusMessage(newStatus);

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #8B5CF6 0%, #D946EF 100%); padding: 30px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${statusInfo.heading}</h1>
        </div>
        
        <div style="background: #1a1a2e; padding: 30px; border-radius: 0 0 12px 12px;">
          <p style="color: #e0e0e0; font-size: 16px; margin-bottom: 20px;">
            Hi ${buyerName},
          </p>
          
          <p style="color: #e0e0e0; font-size: 16px; margin-bottom: 20px;">
            ${statusInfo.message}
          </p>
          
          <div style="background: #2a2a4e; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid ${statusInfo.color};">
            <h2 style="color: #ffffff; margin: 0 0 10px 0; font-size: 18px;">${serviceTitle}</h2>
            <p style="color: #a0a0a0; margin: 5px 0; font-size: 14px;">
              <strong>Seller:</strong> ${sellerName}
            </p>
            <p style="color: #a0a0a0; margin: 5px 0; font-size: 14px;">
              <strong>Amount:</strong> ₦${amount.toLocaleString()}
            </p>
            <p style="color: ${statusInfo.color}; margin: 10px 0 0 0; font-size: 14px; font-weight: bold; text-transform: uppercase;">
              Status: ${newStatus.replace(/_/g, ' ')}
            </p>
          </div>
          
          <a href="https://artistry.com/marketplace" 
             style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #D946EF 100%); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 10px;">
            View Order Details
          </a>
          
          ${newStatus === 'completed' ? `
            <p style="color: #e0e0e0; font-size: 14px; margin-top: 20px; padding: 15px; background: #2a2a4e; border-radius: 8px;">
              💫 <strong>Don't forget to leave a review!</strong> Your feedback helps other buyers and supports great sellers.
            </p>
          ` : ''}
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #3a3a5e;" />
          
          <p style="color: #6B7280; font-size: 12px; margin: 0;">
            The Artistry Team<br/>
            <a href="https://artistry.com" style="color: #8B5CF6;">artistry.com</a>
          </p>
        </div>
      </div>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Artistry <notifications@resend.dev>",
        to: [buyerEmail],
        subject: `${statusInfo.subject} - ${serviceTitle}`,
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();
    
    if (!emailResponse.ok) {
      console.error("Error sending email:", emailResult);
      return new Response(
        JSON.stringify({ error: "Failed to send notification email", details: emailResult }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Order status notification sent successfully:", emailResult);

    return new Response(
      JSON.stringify({ success: true, messageId: emailResult.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in notify-order-status function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
