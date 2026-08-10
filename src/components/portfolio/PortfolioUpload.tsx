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
  { value: "document", label: "Document", icon: FileText, accept: ".pdf,.doc,.docx" },
];

export const PortfolioUpload = ({ userId, onUploadComplete }: PortfolioUploadProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediaType, setMediaType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

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
    if (!title || !mediaType || !file) {
      toast.error("Please fill in all required fields");
      return;
    }

    const caps: Record<string, number> = {
      image: UPLOAD_LIMITS.portfolioImage,
      audio: UPLOAD_LIMITS.portfolioAudio,
      video: UPLOAD_LIMITS.portfolioVideo,
      document: UPLOAD_RULES.document.maxBytes,
    };
    const cap = caps[mediaType] ?? UPLOAD_RULES.document.maxBytes;
    if (file.size > cap) {
      toast.error(`${file.name} is larger than ${formatBytes(cap)}`);
      return;
    }

    setUploading(true);

    try {
      const fileExt = extensionFor(file, "bin");
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(UPLOAD_BUCKETS.portfolios)
        .upload(fileName, file);

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
            placeholder="Describe your work..."
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

        {mediaType && (
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
          disabled={uploading || !title || !mediaType || !file}
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
