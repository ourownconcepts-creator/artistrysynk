import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate VAPID keys using Web Crypto API
async function generateVAPIDKeys(): Promise<{ publicKey: string; privateKey: string }> {
  // Generate ECDSA key pair on P-256 curve (required for VAPID)
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["sign", "verify"]
  );

  // Export public key to raw format
  const publicKeyBuffer = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const publicKeyArray = new Uint8Array(publicKeyBuffer);
  
  // Export private key to JWK format to get the 'd' parameter
  const privateKeyJWK = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  
  // Convert public key to URL-safe base64
  const publicKeyBase64 = btoa(String.fromCharCode(...publicKeyArray))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  
  // The private key 'd' parameter is already base64url encoded in JWK
  const privateKeyBase64 = privateKeyJWK.d!;
  
  return {
    publicKey: publicKeyBase64,
    privateKey: privateKeyBase64,
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check for existing VAPID keys
    const existingPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const existingPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    
    if (existingPublicKey && existingPrivateKey) {
      console.log("VAPID keys already exist, returning public key");
      return new Response(
        JSON.stringify({
          success: true,
          message: "VAPID keys already configured",
          publicKey: existingPublicKey,
          alreadyExists: true,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Generate new VAPID keys
    console.log("Generating new VAPID key pair...");
    const { publicKey, privateKey } = await generateVAPIDKeys();
    
    console.log("VAPID keys generated successfully");
    console.log("Public Key:", publicKey);
    console.log("Private Key Length:", privateKey.length);

    // Return the keys - admin will need to add them as secrets
    return new Response(
      JSON.stringify({
        success: true,
        message: "VAPID keys generated. Please add these as secrets in your project settings.",
        publicKey: publicKey,
        privateKey: privateKey,
        instructions: [
          "1. Add VAPID_PUBLIC_KEY as a secret with the publicKey value",
          "2. Add VAPID_PRIVATE_KEY as a secret with the privateKey value",
          "3. Update your frontend to use the public key for push subscriptions"
        ],
        alreadyExists: false,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error generating VAPID keys:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
