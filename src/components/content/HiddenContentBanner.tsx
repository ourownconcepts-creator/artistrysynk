import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ContentAppealsForm } from './ContentAppealsForm';

interface HiddenContentBannerProps {
  contentType: 'message' | 'portfolio' | 'profile' | 'service' | 'project';
  contentId: string;
  showAppeal?: boolean;
}

export const HiddenContentBanner = ({ contentType, contentId, showAppeal = true }: HiddenContentBannerProps) => {
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Content Hidden</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>
          This {contentType} has been temporarily hidden due to user reports and is pending admin review.
        </span>
        {showAppeal && (
          <ContentAppealsForm contentType={contentType} contentId={contentId} />
        )}
      </AlertDescription>
    </Alert>
  );
};
