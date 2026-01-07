import { Crown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

interface UpgradePromptProps {
  feature: string;
  description?: string;
}

export const UpgradePrompt = ({ feature, description }: UpgradePromptProps) => {
  const navigate = useNavigate();

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
      <CardContent className="p-6 text-center">
        <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6 text-white" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{feature}</h3>
        <p className="text-muted-foreground text-sm mb-4">
          {description || "This feature is available for Pro members only."}
        </p>
        <Button variant="hero" onClick={() => navigate("/pricing")}>
          <Crown className="w-4 h-4 mr-2" />
          Upgrade to Pro
        </Button>
      </CardContent>
    </Card>
  );
};
