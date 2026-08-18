import { useState } from "react";
import { UPLOAD_BUCKETS, UPLOAD_LIMITS, UPLOAD_RULES, extensionFor, formatBytes } from "@/config/uploads";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, Music, Video, Image, FileText, X, Loader2 } from "lucide-react";
import { Camera as CameraIcon, Images } from "lucide-react";
import { isNativeApp } from "@/lib/native";
import { pickNativeImage } from "@/lib/nativeMedia";

interface PortfolioUploadProps {
  userId: string;
  onUploadComplete?: () => void;
}

const mediaTypes = [
  { value: "audio", label: "Audio", icon: Music, accept: "audio/*" },
  { value: "video", label: "Video", icon: Video, accept: "video/*" },
  { value: "image", label: "Image", icon: Image, accept: "image/*" },
  { value: "before_after", label: "Before & After", icon: Images, accept: "image/*" },
  { value: "document", label: "Document", icon: FileText, accept: ".pdf,.doc,.docx" },
];

export const PortfolioUpload = ({ userId, onUploadComplete }: PortfolioUploadProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediaType, setMediaType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [capturedOn, setCapturedOn] = useState("");

  const isTransformation = mediaType === "before_after";

  const uploadToStorage = async (fileToUpload: File) => {
    const fileExt = extensionFor(fileToUpload, "bin");
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
    const { error } = await supabase.storage
      .from(UPLOAD_BUCKETS.portfolios)
      .upload(fileName, fileToUpload);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage
      .from(UPLOAD_BUCKETS.portfolios)
      .getPublicUrl(fileName);
    return publicUrl;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (mediaType === "image" || mediaType === "video") {
        setPreview(URL.createObjectURL(selectedFile));
      }
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
  };

  const handleNativePick = async (source: "camera" | "photos") => {
    try {
      const picked = await pickNativeImage(source);
      if (!picked) return;
      setFile(picked);
      setPreview(URL.createObjectURL(picked));
    } catch {
      toast.error("Could not access your photos");
    }
  };

  const handleUpload = async () => {
    if (!title || !mediaType || (isTransformation ? !beforeFile || !afterFile : !file)) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (isTransformation) {
      const cap = UPLOAD_LIMITS.portfolioImage;
      for (const pick of [beforeFile!, afterFile!]) {
        if (pick.size > cap) {
          toast.error(`${pick.name} is larger than ${formatBytes(cap)}`);
          return;
        }
      }

      setUploading(true);
      try {
        const [beforeUrl, afterUrl] = await Promise.all([
          uploadToStorage(beforeFile!),
          uploadToStorage(afterFile!),
        ]);

        const { error: dbError } = await supabase.from("portfolio_items").insert({
          user_id: userId,
          title,
          description,
          media_type: "image",
          media_url: afterUrl,
          before_media_url: beforeUrl,
          after_media_url: afterUrl,
          is_transformation: true,
          captured_on: capturedOn || null,
        });
        if (dbError) throw dbError;

        toast.success("Transformation added to your portfolio!");
        setTitle("");
        setDescription("");
        setMediaType("");
        setBeforeFile(null);
        setAfterFile(null);
        setCapturedOn("");
        onUploadComplete?.();
      } catch (error: any) {
        toast.error(error.message || "Failed to upload");
      } finally {
        setUploading(false);
      }
      return;
    }

    const caps: Record<string, number> = {
      image: UPLOAD_LIMITS.portfolioImage,
      audio: UPLOAD_LIMITS.portfolioAudio,
      video: UPLOAD_LIMITS.portfolioVideo,
      document: UPLOAD_RULES.document.maxBytes,
    };
    const cap = caps[mediaType] ?? UPLOAD_RULES.document.maxBytes;
    const picked = file;
    if (!picked) return;
    if (picked.size > cap) {
      toast.error(`${picked.name} is larger than ${formatBytes(cap)}`);
      return;
    }

    setUploading(true);

    try {
      const fileExt = extensionFor(picked, "bin");
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(UPLOAD_BUCKETS.portfolios)
        .upload(fileName, picked);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(UPLOAD_BUCKETS.portfolios)
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from("portfolio_items")
        .insert({
          user_id: userId,
          title,
          description,
          media_type: mediaType,
          media_url: publicUrl,
        });

      if (dbError) throw dbError;

      toast.success("Portfolio item uploaded successfully!");
      setTitle("");
      setDescription("");
      setMediaType("");
      setFile(null);
      setPreview(null);
      onUploadComplete?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to upload");
    } finally {
      setUploading(false);
    }
  };

  const selectedType = mediaTypes.find(t => t.value === mediaType);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload Portfolio Item
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter title"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={isTransformation ? "Caption this transformation — technique, products, client goals…" : "Describe your work..."}
          />
        </div>

        <div className="space-y-2">
          <Label>Media Type *</Label>
          <Select value={mediaType} onValueChange={setMediaType}>
            <SelectTrigger>
              <SelectValue placeholder="Select media type" />
            </SelectTrigger>
            <SelectContent>
              {mediaTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center gap-2">
                    <type.icon className="w-4 h-4" />
                    {type.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isTransformation && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {([
                { key: "before", label: "Before", value: beforeFile, setter: setBeforeFile },
                { key: "after", label: "After", value: afterFile, setter: setAfterFile },
              ] as const).map(({ key, label, value, setter }) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`ba-${key}`}>{label} *</Label>
                  {value ? (
                    <div className="relative rounded-lg border p-2">
                      <img
                        src={URL.createObjectURL(value)}
                        alt={`${label} preview`}
                        className="mx-auto max-h-40 rounded-sm"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1"
                        aria-label={`Remove ${label} image`}
                        onClick={() => setter(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <input
                        id={`ba-${key}`}
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => setter(e.target.files?.[0] ?? null)}
                      />
                      <label
                        htmlFor={`ba-${key}`}
                        className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-sm text-muted-foreground"
                      >
                        <Image className="w-6 h-6" />
                        Add {label.toLowerCase()} photo
                      </label>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="captured-on">Date of work</Label>
              <Input
                id="captured-on"
                type="date"
                value={capturedOn}
                onChange={(e) => setCapturedOn(e.target.value)}
              />
            </div>
          </div>
        )}

        {mediaType && !isTransformation && (
          <div className="space-y-2">
            <Label>File *</Label>
            {file ? (
              <div className="relative border rounded-lg p-4">
                {preview && (mediaType === "image" || mediaType === "video") && (
                  <div className="mb-4">
                    {mediaType === "image" ? (
                      <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-sm" />
                    ) : (
                      <video src={preview} controls className="max-h-48 mx-auto rounded-sm" />
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground truncate">
                    {file.name}
                  </span>
                  <Button variant="ghost" size="icon" onClick={clearFile}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept={selectedType?.accept}
                  onChange={handleFileChange}
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  {selectedType && <selectedType.icon className="w-8 h-8 text-muted-foreground" />}
                  <span className="text-sm text-muted-foreground">
                    Click to select {selectedType?.label.toLowerCase()} file
                  </span>
                </label>
                {isNativeApp() && mediaType === "image" && (
                  <div className="flex gap-2 justify-center mt-4">
                    <Button variant="outline" size="sm" onClick={() => handleNativePick("camera")}>
                      <CameraIcon className="w-4 h-4 mr-2" />
                      Camera
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleNativePick("photos")}>
                      <Images className="w-4 h-4 mr-2" />
                      Photos
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <Button 
          onClick={handleUpload} 
          disabled={uploading || !title || !mediaType || (isTransformation ? !beforeFile || !afterFile : !file)}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
