import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Users, MessageCircle, Briefcase, Store, ChevronRight, ChevronLeft, X } from "lucide-react";

interface TourStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: string;
  actionPath?: string;
}

const tourSteps: TourStep[] = [
  {
    title: "Welcome to Artistry! 🎨",
    description: "We're excited to have you join our creative community. Let's take a quick tour to help you get started and make the most of your experience.",
    icon: <Sparkles className="w-12 h-12 text-secondary" />,
  },
  {
    title: "Discover Creatives",
    description: "Swipe through profiles of talented musicians, producers, and artists. When you both like each other, it's a match! Start collaborating right away.",
    icon: <Users className="w-12 h-12 text-primary" />,
    action: "Explore Discover",
    actionPath: "/discover",
  },
  {
    title: "Connect & Chat",
    description: "Once you match, start chatting instantly. Share ideas, discuss projects, and build meaningful creative partnerships.",
    icon: <MessageCircle className="w-12 h-12 text-accent" />,
    action: "View Matches",
    actionPath: "/matches",
  },
  {
    title: "Find Opportunities",
    description: "Browse job postings from other creatives or post your own. Find collaborators for your next big project.",
    icon: <Briefcase className="w-12 h-12 text-primary" />,
    action: "Browse Jobs",
    actionPath: "/jobs",
  },
  {
    title: "Marketplace",
    description: "Offer your services or hire talent for specific tasks. From mixing to mastering, artwork to video editing - it's all here.",
    icon: <Store className="w-12 h-12 text-secondary" />,
    action: "Visit Marketplace",
    actionPath: "/marketplace",
  },
];

interface OnboardingTourProps {
  userId: string;
}

export const OnboardingTour = ({ userId }: OnboardingTourProps) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    checkOnboardingStatus();
  }, [userId]);

  const checkOnboardingStatus = async () => {
    const { data } = await supabase
      .from("user_settings")
      .select("onboarding_completed")
      .eq("user_id", userId)
      .single();

    // Show tour if no settings exist or onboarding not completed
    if (!data || !data.onboarding_completed) {
      // Small delay for better UX
      setTimeout(() => setOpen(true), 1000);
    }
  };

  const completeOnboarding = async () => {
    await supabase
      .from("user_settings")
      .upsert({
        user_id: userId,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      });
    setOpen(false);
  };

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAction = () => {
    const step = tourSteps[currentStep];
    if (step.actionPath) {
      completeOnboarding();
      navigate(step.actionPath);
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const step = tourSteps[currentStep];
  const progress = ((currentStep + 1) / tourSteps.length) * 100;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <button
          onClick={handleSkip}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Skip tour</span>
        </button>
        
        <div className="flex flex-col items-center text-center pt-4">
          <div className="mb-4 p-4 rounded-full bg-muted">
            {step.icon}
          </div>
          
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl">{step.title}</DialogTitle>
            <DialogDescription className="text-base">
              {step.description}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="py-4">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center mt-2">
            Step {currentStep + 1} of {tourSteps.length}
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="flex-1 sm:flex-none"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <Button
              onClick={handleNext}
              className="flex-1 sm:flex-none"
            >
              {currentStep === tourSteps.length - 1 ? "Get Started" : "Next"}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          
          {step.action && (
            <Button
              variant="secondary"
              onClick={handleAction}
              className="w-full sm:w-auto"
            >
              {step.action}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
