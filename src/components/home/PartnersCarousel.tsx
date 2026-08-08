import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Users } from "lucide-react";

export const PartnersCarousel = () => {
  const [countries, setCountries] = useState<string[]>([]);
  const [userCount, setUserCount] = useState(0);

  useEffect(() => {
    loadCommunityData();
  }, []);

  const loadCommunityData = async () => {
    const { data, error } = await supabase.rpc("get_platform_stats");
    if (error || !data) return;

    const d = data as Record<string, number>;
    setUserCount(d.users || 0);

    // Fetch distinct countries separately
    const { data: locationData } = await supabase
      .from("profiles")
      .select("country")
      .not("country", "is", null);

    if (locationData) {
      const uniqueCountries = [...new Set(locationData.map(p => p.country).filter(Boolean))] as string[];
      setCountries(uniqueCountries);
    }
  };

  // If no countries data, show a simpler community banner
  if (userCount === 0) return null;

  if (countries.length === 0) {
    return (
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">
                {userCount} Creative{userCount !== 1 ? "s" : ""} and Growing
              </h2>
            </div>
            <p className="text-muted-foreground text-sm">
              Join our community of creative professionals collaborating worldwide
            </p>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 bg-muted/30 overflow-hidden">
      <div className="container mx-auto px-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">
              Creatives from {countries.length} {countries.length === 1 ? "Country" : "Countries"}
            </h2>
          </div>
          <p className="text-muted-foreground text-sm">
            A growing global community of {userCount} creative professionals
          </p>
        </motion.div>
      </div>

      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-muted/30 to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-muted/30 to-transparent z-10" />

        <motion.div
          className="flex gap-4 py-4"
          animate={{ x: [0, -(countries.length * 180)] }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: Math.max(countries.length * 3, 15),
              ease: "linear",
            },
          }}
        >
          {[...countries, ...countries, ...countries].map((country, index) => (
            <motion.div
              key={`${country}-${index}`}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-card/50 backdrop-blur-xs rounded-lg border border-border/50 hover:border-primary/50 transition-colors"
              whileHover={{ scale: 1.05 }}
            >
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground whitespace-nowrap">
                {country}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
