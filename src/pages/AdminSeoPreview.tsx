import { Link } from "@/lib/router-compat";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { MetadataPreview } from "@/components/seo/MetadataPreview";
import { SharePreviewValidator } from "@/components/seo/SharePreviewValidator";
import { IndexingSubmitCard } from "@/components/seo/IndexingSubmitCard";

const AdminSeoPreview = () => {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin">
            <ArrowLeft className="mr-2 h-4 w-4" /> Admin
          </Link>
        </Button>
      </div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Search &amp; social preview</h1>
        <p className="mt-2 text-muted-foreground">
          A live preview of the site title and meta description exactly as Google and social platforms
          render them, read straight from this page&apos;s head tags.
        </p>
      </header>
      <div className="space-y-8">
        <MetadataPreview />
        <SharePreviewValidator />
        <IndexingSubmitCard />
      </div>
    </div>
  );
};

export default AdminSeoPreview;