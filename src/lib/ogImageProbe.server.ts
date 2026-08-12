/**
 * Server-only: inspect a remote image's real pixel dimensions from its header
 * bytes (no native image libraries, Worker-safe).
 */
export interface ProbedImage {
  ok: boolean;
  status: number | null;
  contentType: string | null;
  width: number | null;
  height: number | null;
  bytes: Uint8Array | null;
}

export function readImageSize(buf: Uint8Array): { width: number; height: number } | null {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  // PNG
  if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  // GIF
  if (buf.length > 10 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
    return { width: view.getUint16(6, true), height: view.getUint16(8, true) };
  }
  // WEBP (VP8X / VP8 / VP8L)
  if (
    buf.length > 30 &&
    String.fromCharCode(buf[0]!, buf[1]!, buf[2]!, buf[3]!) === "RIFF" &&
    String.fromCharCode(buf[8]!, buf[9]!, buf[10]!, buf[11]!) === "WEBP"
  ) {
    const chunk = String.fromCharCode(buf[12]!, buf[13]!, buf[14]!, buf[15]!);
    if (chunk === "VP8X") {
      const w = 1 + (buf[24]! | (buf[25]! << 8) | (buf[26]! << 16));
      const h = 1 + (buf[27]! | (buf[28]! << 8) | (buf[29]! << 16));
      return { width: w, height: h };
    }
    if (chunk === "VP8 ") {
      return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
    }
    if (chunk === "VP8L") {
      const bits = view.getUint32(21, true);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
  }
  // JPEG: walk the segment markers
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) {
        i += 1;
        continue;
      }
      const marker = buf[i + 1]!;
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        i += 2;
        continue;
      }
      const len = view.getUint16(i + 2);
      const isSof = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
      if (isSof) return { width: view.getUint16(i + 7), height: view.getUint16(i + 5) };
      i += 2 + len;
    }
  }
  return null;
}

const MAX_BYTES = 6 * 1024 * 1024;

/**
 * Raster image types we are willing to re-serve from our own origin.
 * SVG is deliberately excluded: it can carry script and would be
 * same-origin active content, which Safe Browsing treats as harmful.
 */
const SAFE_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

/** Hosts whose images we are willing to proxy (our own + our storage). */
function isAllowedImageHost(host: string): boolean {
  const h = host.toLowerCase();
  const storageHost = (() => {
    try {
      return new URL(process.env["VITE_SUPABASE_URL"] ?? "").hostname.toLowerCase();
    } catch {
      return null;
    }
  })();
  return (
    h === "artistrysynk.app" ||
    h === "www.artistrysynk.app" ||
    h.endsWith(".lovable.app") ||
    h.endsWith(".supabase.co") ||
    (storageHost !== null && h === storageHost)
  );
}

export function isProxyableImageSource(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && isAllowedImageHost(parsed.hostname);
  } catch {
    return false;
  }
}

export async function probeRemoteImage(url: string): Promise<ProbedImage> {
  try {
    if (!isProxyableImageSource(url)) {
      return { ok: false, status: null, contentType: null, width: null, height: null, bytes: null };
    }
    const res = await fetch(url, {
      headers: { "User-Agent": "ArtistrySynkOgImage/1.0 (+https://artistrysynk.app)" },
      redirect: "manual",
    });
    const contentType = res.headers.get("content-type");
    if (!res.ok) return { ok: false, status: res.status, contentType, width: null, height: null, bytes: null };
    const buf = new Uint8Array(await res.arrayBuffer());
    const baseType = contentType?.split(";")[0]?.trim().toLowerCase() ?? "";
    if (buf.byteLength > MAX_BYTES || !SAFE_IMAGE_TYPES.has(baseType)) {
      return { ok: false, status: res.status, contentType, width: null, height: null, bytes: null };
    }
    const size = readImageSize(buf);
    // Magic bytes must parse: guarantees real raster data, not a disguised file.
    if (!size) {
      return { ok: false, status: res.status, contentType: baseType, width: null, height: null, bytes: null };
    }
    return {
      ok: true,
      status: res.status,
      contentType: baseType,
      width: size.width,
      height: size.height,
      bytes: buf,
    };
  } catch {
    return { ok: false, status: null, contentType: null, width: null, height: null, bytes: null };
  }
}
