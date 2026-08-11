import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Browser } from "@capacitor/browser";
import { isNativeApp } from "@/lib/native";
import { sanitizeExternalUrl } from "@/lib/safeLinks";

/**
 * Picks an image with the native camera/photo library and returns it as a File
 * so existing web upload code paths keep working unchanged.
 */
export const pickNativeImage = async (
  source: "camera" | "photos" = "photos",
): Promise<File | null> => {
  if (!isNativeApp()) return null;

  const photo = await Camera.getPhoto({
    quality: 85,
    allowEditing: false,
    resultType: CameraResultType.Uri,
    source: source === "camera" ? CameraSource.Camera : CameraSource.Photos,
  });

  if (!photo.webPath) return null;

  const blob = await fetch(photo.webPath).then((res) => res.blob());
  const ext = photo.format || "jpg";
  return new File([blob], `photo-${Date.now()}.${ext}`, {
    type: blob.type || `image/${ext}`,
  });
};

/**
 * Opens an external URL in the system browser on native, a new tab on web.
 * Unsafe schemes and executable downloads are refused, since many of these
 * URLs come from user-generated content.
 */
export const openExternalUrl = async (url: string) => {
  const safe = sanitizeExternalUrl(url);
  if (!safe) return;

  if (isNativeApp()) {
    await Browser.open({ url: safe, presentationStyle: "popover" });
    return;
  }
  window.open(safe, "_blank", "noopener,noreferrer");
};