export interface VapidKeysResult {
  success: boolean;
  message: string;
  publicKey: string;
  privateKey?: string;
  instructions?: string[];
  alreadyExists: boolean;
}

async function generateVAPIDKeys(): Promise<{ publicKey: string; privateKey: string }> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["sign", "verify"],
  );

  const publicKeyBuffer = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const publicKeyArray = new Uint8Array(publicKeyBuffer);

  const privateKeyJWK = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

  const publicKeyBase64 = Buffer.from(publicKeyArray)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const privateKeyBase64 = privateKeyJWK.d!;

  return {
    publicKey: publicKeyBase64,
    privateKey: privateKeyBase64,
  };
}

export async function getOrGenerateVapidKeys(): Promise<VapidKeysResult> {
  const existingPublicKey = process.env["VAPID_PUBLIC_KEY"];
  const existingPrivateKey = process.env["VAPID_PRIVATE_KEY"];

  if (existingPublicKey && existingPrivateKey) {
    console.log("VAPID keys already exist, returning public key");
    return {
      success: true,
      message: "VAPID keys already configured",
      publicKey: existingPublicKey,
      alreadyExists: true,
    };
  }

  console.log("Generating new VAPID key pair...");
  const { publicKey, privateKey } = await generateVAPIDKeys();

  console.log("VAPID keys generated successfully");
  console.log("Public Key:", publicKey);
  console.log("Private Key Length:", privateKey.length);

  return {
    success: true,
    message: "VAPID keys generated. Please add these as secrets in your project settings.",
    publicKey,
    privateKey,
    instructions: [
      "1. Add VAPID_PUBLIC_KEY as a secret with the publicKey value",
      "2. Add VAPID_PRIVATE_KEY as a secret with the privateKey value",
      "3. Update your frontend to use the public key for push subscriptions",
    ],
    alreadyExists: false,
  };
}
