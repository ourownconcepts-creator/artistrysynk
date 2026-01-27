import { motion } from 'framer-motion';
import { Music, Headphones, Mic2, Piano, Disc3, Guitar } from 'lucide-react';

const musicIcons = [
  { Icon: Music, angle: 0 },
  { Icon: Headphones, angle: 60 },
  { Icon: Mic2, angle: 120 },
  { Icon: Piano, angle: 180 },
  { Icon: Disc3, angle: 240 },
  { Icon: Guitar, angle: 300 },
];

export const SyncPulse = () => {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
      {/* Central sync pulse rings */}
      {[1, 2, 3, 4, 5].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border-2"
          style={{
            borderColor: i % 2 === 0 
              ? 'hsl(var(--secondary) / 0.3)' 
              : 'hsl(var(--primary) / 0.2)',
            width: 100 + i * 150,
            height: 100 + i * 150,
          }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.3, 0, 0.3],
          }}
          transition={{
            duration: 4 + i * 0.5,
            repeat: Infinity,
            delay: i * 0.8,
            ease: "easeInOut"
          }}
        />
      ))}

      {/* Orbiting music icons */}
      <motion.div
        className="absolute w-[320px] h-[320px]"
        animate={{ rotate: 360 }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      >
        {musicIcons.map(({ Icon, angle }, index) => (
          <motion.div
            key={index}
            className="absolute"
            style={{
              left: '50%',
              top: '50%',
              transform: `rotate(${angle}deg) translateX(140px) rotate(-${angle}deg)`,
              marginLeft: '-16px',
              marginTop: '-16px',
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 + 0.5 }}
          >
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: index * 0.3,
                ease: "easeInOut"
              }}
              className="p-2 rounded-full bg-gradient-to-br from-secondary/30 to-primary/20 backdrop-blur-sm border border-secondary/30"
            >
              <Icon className="w-6 h-6 text-secondary" />
            </motion.div>
          </motion.div>
        ))}
      </motion.div>

      {/* Rotating arcs with music note patterns */}
      <motion.div
        className="absolute w-[400px] h-[400px]"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      >
        <svg viewBox="0 0 400 400" className="w-full h-full">
          <defs>
            <linearGradient id="arcGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
              <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="arcGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.8" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {/* Arc 1 */}
          <motion.path
            d="M 200 50 A 150 150 0 0 1 350 200"
            fill="none"
            stroke="url(#arcGradient1)"
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: [0, 1, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          
          {/* Arc 2 */}
          <motion.path
            d="M 200 350 A 150 150 0 0 1 50 200"
            fill="none"
            stroke="url(#arcGradient2)"
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: [0, 1, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          />
        </svg>
      </motion.div>

      {/* Counter-rotating equalizer bars ring */}
      <motion.div
        className="absolute w-[220px] h-[220px]"
        animate={{ rotate: -360 }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      >
        {[...Array(24)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 origin-bottom"
            style={{
              transform: `rotate(${i * 15}deg) translateY(-90px)`,
              width: '3px',
              marginLeft: '-1.5px',
            }}
          >
            <motion.div
              className="w-full bg-gradient-to-t from-secondary/60 to-primary/40 rounded-full"
              animate={{
                height: [8, 20 + Math.random() * 15, 8],
              }}
              transition={{
                duration: 0.4 + Math.random() * 0.3,
                repeat: Infinity,
                delay: i * 0.05,
                ease: "easeInOut"
              }}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Central vinyl record style core */}
      <motion.div
        className="absolute w-28 h-28 rounded-full"
        style={{
          background: `
            radial-gradient(circle at center, 
              hsl(var(--secondary)) 0%, 
              hsl(var(--secondary) / 0.8) 15%,
              transparent 16%,
              transparent 20%,
              hsl(var(--primary) / 0.3) 21%,
              transparent 22%,
              transparent 30%,
              hsl(var(--secondary) / 0.2) 31%,
              transparent 32%,
              transparent 40%,
              hsl(var(--primary) / 0.15) 41%,
              transparent 42%,
              hsl(var(--primary) / 0.1) 100%
            )
          `,
          boxShadow: '0 0 60px hsl(var(--secondary) / 0.4), inset 0 0 30px hsl(var(--primary) / 0.3)',
        }}
        animate={{ rotate: 360 }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      
      {/* Inner glowing core with music note */}
      <motion.div
        className="absolute w-14 h-14 rounded-full flex items-center justify-center"
        style={{
          background: 'radial-gradient(circle, hsl(var(--secondary)) 0%, hsl(var(--primary)) 70%)',
          boxShadow: '0 0 40px hsl(var(--secondary) / 0.6)',
        }}
        animate={{
          scale: [1, 1.15, 1],
          boxShadow: [
            '0 0 40px hsl(var(--secondary) / 0.6)',
            '0 0 60px hsl(var(--secondary) / 0.8)',
            '0 0 40px hsl(var(--secondary) / 0.6)',
          ],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <Music className="w-6 h-6 text-white" />
      </motion.div>

      {/* Floating musical notes */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={`note-${i}`}
          className="absolute text-secondary/40 text-2xl font-bold"
          initial={{
            x: Math.cos((i / 6) * Math.PI * 2) * 180,
            y: Math.sin((i / 6) * Math.PI * 2) * 180,
            opacity: 0,
          }}
          animate={{
            y: [
              Math.sin((i / 6) * Math.PI * 2) * 180,
              Math.sin((i / 6) * Math.PI * 2) * 180 - 30,
              Math.sin((i / 6) * Math.PI * 2) * 180,
            ],
            opacity: [0.3, 0.7, 0.3],
            scale: [0.8, 1.1, 0.8],
          }}
          transition={{
            duration: 3 + i * 0.5,
            repeat: Infinity,
            delay: i * 0.4,
            ease: "easeInOut"
          }}
        >
          ♪
        </motion.div>
      ))}
    </div>
  );
};
