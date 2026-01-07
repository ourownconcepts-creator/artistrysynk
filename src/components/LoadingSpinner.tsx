import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
}

export const LoadingSpinner = ({ size = "md", text = "Loading..." }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12"
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-secondary/5">
      <div className="text-center space-y-4">
        <Loader2 className={`${sizeClasses[size]} animate-spin text-primary mx-auto`} />
        {text && <p className="text-muted-foreground">{text}</p>}
      </div>
    </div>
  );
};
