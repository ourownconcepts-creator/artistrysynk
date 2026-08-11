import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Trash2, Upload, Zap } from "lucide-react";
import { toast } from "sonner";
import {
  deleteOgOverride,
  getOgBrandConfig,
  purgeOgImageCache,
  uploadOgImage,
} from "@/lib/ogBrand.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OG_VARIANTS } from "@/lib/ogImage";

type Slot = "wide" | "square" | "portrait";
type Config = Awaited<ReturnType<typeof getOgBrandConfig>>;

const toBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Could not read that file"));
    reader.readAsDataURL(file);
  });

export function OgFallbackManager({ onChanged }: { onChanged?: () => void }) {
  const loadConfig = useServerFn(getOgBrandConfig);
  const upload = useServerFn(uploadOgImage);
  const removeOverride = useServerFn(deleteOgOverride);
  const purge = useServerFn(purgeOgImageCache);

  const [config, setConfig] = useState<Config | null>(null);
  const [busy, setBusy] = useState(false);
  const [slot, setSlot] = useState<Slot>("wide");
  const [pagePath, setPagePath] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    try {
      setConfig(await loadConfig({ data: {} }));
    } catch (err) {
      toast.error((err as Error).message || "Could not load share image settings");
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const base64 = await toBase64(file);
      const contentType = (
        ["image/jpeg", "image/png", "image/webp"].includes(file.type) ? file.type : "image/jpeg"
      ) as "image/jpeg" | "image/png" | "image/webp";
      const result = await upload({
        data: {
          base64,
          contentType,
          slot,
          ...(pagePath.trim() ? { path: pagePath.trim() } : {}),
        },
      });
      toast.success(
        result.scope === "page"
          ? `Share image set for ${result.path} (${result.width}×${result.height})`
          : `Brand fallback updated (${result.width}×${result.height})`,
      );
      await refresh();
      onChanged?.();
    } catch (err) {
      toast.error((err as Error).message || "Upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handlePurge = async () => {
    setBusy(true);
    try {
      const res = await purge({ data: {} });
      toast.success(`Caches busted for ${res.purgedPaths.length + 1} page(s)`);
      await refresh();
      onChanged?.();
    } catch (err) {
      toast.error((err as Error).message || "Purge failed");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (path: string) => {
    setBusy(true);
    try {
      await removeOverride({ data: { path } });
      toast.success(`Override removed for ${path}`);
      await refresh();
      onChanged?.();
    } catch (err) {
      toast.error((err as Error).message || "Could not remove override");
    } finally {
      setBusy(false);
    }
  };

  const settings = config?.settings ?? null;
  const overrides = config?.overrides ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Brand share image</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          Replace the branded fallback used whenever a page has no suitable image of its own, or
          override the share image for one specific page. Changes go live immediately — the tags stay
          the same and the image is resolved per request.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          {(Object.keys(OG_VARIANTS) as (keyof typeof OG_VARIANTS)[])
            .filter((r) => r !== "twitter")
            .map((r) => (
              <div key={r} className="rounded-lg border border-border/60 p-2">
                <img
                  src={`${OG_VARIANTS[r].path}?v=${settings?.version ?? "static"}`}
                  alt={`${r} share banner preview`}
                  loading="lazy"
                  className="w-full rounded bg-surface-2 object-contain"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  {r} · {OG_VARIANTS[r].width}×{OG_VARIANTS[r].height}
                </p>
              </div>
            ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="og-slot">Aspect ratio slot</Label>
            <Select value={slot} onValueChange={(v) => setSlot(v as Slot)}>
              <SelectTrigger id="og-slot">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wide">Wide — 1200×630 (Facebook, X, LinkedIn)</SelectItem>
                <SelectItem value="square">Square — 1200×1200 (WhatsApp, chat apps)</SelectItem>
                <SelectItem value="portrait">Portrait — 1080×1350 (mobile feeds)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="og-path">Page path (optional)</Label>
            <Input
              id="og-path"
              name="og-path"
              placeholder="/studios/my-studio — leave empty for site-wide"
              value={pagePath}
              onChange={(e) => setPagePath(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            id="og-file"
            name="og-file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <Button onClick={() => fileRef.current?.click()} disabled={busy} size="sm">
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Upload image
          </Button>
          <Button onClick={handlePurge} disabled={busy} size="sm" variant="outline">
            <Zap className="mr-2 h-4 w-4" /> Bust caches
          </Button>
          {settings?.version ? (
            <Badge variant="outline" className="text-xs">
              version {settings.version}
            </Badge>
          ) : null}
        </div>

        {overrides.length ? (
          <div>
            <h3 className="mb-2 text-sm font-semibold">Page overrides</h3>
            <ul className="divide-y divide-border/60 rounded-lg border border-border/60">
              {overrides.map((o) => (
                <li key={o.path as string} className="flex items-center gap-3 p-3">
                  <span className="flex-1 truncate font-mono text-sm">{o.path as string}</span>
                  <span className="text-xs text-muted-foreground">
                    {[o.image_url ? "wide" : null, o.square_url ? "square" : null, o.portrait_url ? "portrait" : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Remove override for ${o.path as string}`}
                    disabled={busy}
                    onClick={() => handleDelete(o.path as string)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
