import { Card, CardContent } from "@/components/ui/card";
import { Music, Mic2, Headphones, Drama, Video, Camera, Palette, Megaphone } from "lucide-react";

const roles = [
  { icon: Mic2, name: "Artists & Musicians", color: "from-secondary to-secondary/70" },
  { icon: Headphones, name: "Producers & Engineers", color: "from-accent to-accent/70" },
  { icon: Music, name: "Songwriters", color: "from-primary to-primary/70" },
  { icon: Drama, name: "Performers & Dancers", color: "from-secondary to-accent" },
  { icon: Video, name: "Actors & Actresses", color: "from-primary to-secondary" },
  { icon: Camera, name: "Directors & Filmmakers", color: "from-accent to-primary" },
  { icon: Palette, name: "Visual Artists & Designers", color: "from-secondary to-primary" },
  { icon: Megaphone, name: "Promoters & Managers", color: "from-primary to-accent" },
];

export const Roles = () => {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold">
            Built for Every{" "}
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Creative Role
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Whether you're a musician, dancer, actor, or filmmaker — find your creative tribe
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {roles.map((role, index) => (
            <Card 
              key={index}
              className="group hover:scale-105 transition-all duration-300 cursor-pointer border-2 hover:border-primary/50 hover:shadow-[0_0_20px_hsl(270,70%,55%/0.2)]"
            >
              <CardContent className="p-6 flex flex-col items-center gap-3 text-center">
                <div className={`p-4 rounded-full bg-gradient-to-br ${role.color} group-hover:shadow-lg transition-shadow`}>
                  <role.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-semibold text-sm">{role.name}</h3>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground">
            + Many more creative roles and specializations
          </p>
        </div>
      </div>
    </section>
  );
};
