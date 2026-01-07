import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, Heart, MessageSquare, Rocket } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    step: "01",
    title: "Create Your Profile",
    description: "Choose your creative role(s) and build a stunning portfolio with your best work",
  },
  {
    icon: Heart,
    step: "02",
    title: "Discover & Match",
    description: "Swipe through creatives, find collaborators who match your vision and style",
  },
  {
    icon: MessageSquare,
    step: "03",
    title: "Connect & Chat",
    description: "When both swipe right, chat opens. Share ideas, demos, and start planning",
  },
  {
    icon: Rocket,
    step: "04",
    title: "Collaborate & Create",
    description: "Launch projects together, share files, and bring creative visions to life",
  },
];

export const HowItWorks = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold">
            How{" "}
            <span className="bg-gradient-to-r from-accent via-secondary to-primary bg-clip-text text-transparent">
              Artistry.ng
            </span>
            {" "}Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Four simple steps to start collaborating with talented creatives
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((item, index) => (
            <div key={index} className="relative">
              {/* Connector Line (hidden on mobile, shown on larger screens) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-20 left-[60%] w-full h-0.5 bg-gradient-to-r from-primary/30 to-transparent z-0" />
              )}
              
              <Card className="relative z-10 border-2 hover:border-primary/50 transition-all duration-300 h-full">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-gradient-to-br from-primary to-accent">
                      <item.icon className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-4xl font-bold text-muted-foreground/20">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold">{item.title}</h3>
                  <p className="text-muted-foreground text-sm">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
