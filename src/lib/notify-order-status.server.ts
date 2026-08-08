import { sendEmail, LOGO_URL } from "@/lib/email/resend.server";

export interface NotifyOrderStatusInput {
  orderId: string;
  serviceTitle: string;
  buyerEmail: string;
  buyerName: string;
  sellerName: string;
  newStatus: string;
  amount: number;
}

const getStatusMessage = (status: string) => {
  switch (status) {
    case "in_progress":
      return { subject: "Your Order is Now In Progress", heading: "Work Has Started! 🎨", message: "The seller has started working on your order. You'll be notified when it's completed.", color: "#F59E0B" };
    case "completed":
      return { subject: "Your Order Has Been Completed", heading: "Order Completed! 🎉", message: "Your order has been completed. Please review the delivery and leave a rating.", color: "#10B981" };
    case "cancelled":
      return { subject: "Your Order Has Been Cancelled", heading: "Order Cancelled", message: "Unfortunately, your order has been cancelled. Contact support if you have questions.", color: "#EF4444" };
    default:
      return { subject: "Order Status Update", heading: "Order Update", message: `Your order status has been updated to: ${status}`, color: "#c026d3" };
  }
};

export async function notifyOrderStatus({
  serviceTitle,
  buyerEmail,
  buyerName,
  sellerName,
  newStatus,
  amount,
}: NotifyOrderStatusInput) {
  if (!process.env["RESEND_API_KEY"]) {
    throw new Error("Email service not configured");
  }

  const statusInfo = getStatusMessage(newStatus);

  const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; padding: 30px 0 20px 0; background: linear-gradient(135deg, #c026d3 0%, #7c3aed 50%, #f97316 100%); border-radius: 12px 12px 0 0;">
          <img src="${LOGO_URL}" alt="ArtistrySynk" style="height: 80px; width: auto;" />
        </div>
        
        <div style="background: #1a1a2e; padding: 30px; border-radius: 0 0 12px 12px;">
          <h1 style="color: white; font-size: 24px;">${statusInfo.heading}</h1>
          <p style="color: #e0e0e0; font-size: 16px;">Hi ${buyerName},</p>
          <p style="color: #e0e0e0; font-size: 16px;">${statusInfo.message}</p>
          
          <div style="background: #2a2a4e; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${statusInfo.color};">
            <h2 style="color: #ffffff; margin: 0 0 10px 0; font-size: 18px;">${serviceTitle}</h2>
            <p style="color: #a0a0a0; margin: 5px 0; font-size: 14px;"><strong>Seller:</strong> ${sellerName}</p>
            <p style="color: #a0a0a0; margin: 5px 0; font-size: 14px;"><strong>Amount:</strong> ₦${amount.toLocaleString()}</p>
            <p style="color: ${statusInfo.color}; margin: 10px 0 0 0; font-size: 14px; font-weight: bold; text-transform: uppercase;">Status: ${newStatus.replace(/_/g, ' ')}</p>
          </div>
          
          <a href="https://artistrysynk.lovable.app/marketplace" 
             style="display: inline-block; background: linear-gradient(135deg, #c026d3 0%, #7c3aed 100%); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            View Order Details
          </a>
          
          ${newStatus === 'completed' ? `
            <p style="color: #e0e0e0; font-size: 14px; margin-top: 20px; padding: 15px; background: #2a2a4e; border-radius: 8px;">
              💫 <strong>Don't forget to leave a review!</strong> Your feedback helps other buyers and supports great sellers.
            </p>
          ` : ''}
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #3a3a5e;" />
          <p style="color: #6B7280; font-size: 12px;">The ArtistrySynk Team</p>
        </div>
      </div>
    `;

  try {
    const emailResult = await sendEmail({
      from: "ArtistrySynk <notifications@artistrysynk.app>",
      to: buyerEmail,
      subject: `${statusInfo.subject} - ${serviceTitle}`,
      html,
    });

    return { success: true as const, messageId: emailResult.id };
  } catch (error: any) {
    console.error("Error in notify-order-status:", error);
    throw new Error(error.message);
  }
}
