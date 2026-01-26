import { motion } from "framer-motion";

const partners = [
  { name: "Sony Music", logo: "🎵" },
  { name: "Universal", logo: "🌐" },
  { name: "Spotify", logo: "🎧" },
  { name: "Apple Music", logo: "🍎" },
  { name: "YouTube", logo: "▶️" },
  { name: "TikTok", logo: "🎬" },
  { name: "Netflix", logo: "🎥" },
  { name: "Warner Bros", logo: "🎞️" },
  { name: "Amazon Music", logo: "📦" },
  { name: "Deezer", logo: "🎶" },
];

export const PartnersCarousel = () => {
  return (
    <section className="py-16 bg-muted/30 overflow-hidden">
      <div className="container mx-auto px-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Trusted by Industry Leaders
          </h2>
          <p className="text-muted-foreground">
            Join thousands of creatives collaborating with top brands
          </p>
        </motion.div>
      </div>

      <div className="relative">
        {/* Gradient overlays */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-muted/30 to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-muted/30 to-transparent z-10" />

        {/* Scrolling container */}
        <motion.div
          className="flex gap-12 py-8"
          animate={{
            x: [0, -1920],
          }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: 30,
              ease: "linear",
            },
          }}
        >
          {/* Double the partners for seamless loop */}
          {[...partners, ...partners, ...partners].map((partner, index) => (
            <motion.div
              key={`${partner.name}-${index}`}
              className="flex-shrink-0 flex items-center gap-3 px-6 py-4 bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 hover:border-primary/50 transition-colors"
              whileHover={{ scale: 1.05 }}
            >
              <span className="text-4xl">{partner.logo}</span>
              <span className="text-lg font-semibold text-foreground whitespace-nowrap">
                {partner.name}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
