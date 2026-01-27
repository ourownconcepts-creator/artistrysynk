import { motion } from 'framer-motion';
import { Music } from 'lucide-react';

// Import artistic music images
import heroSynth from '@/assets/hero-synth.jpg';
import heroMic from '@/assets/hero-mic.jpg';
import heroDj from '@/assets/hero-dj.jpg';
import heroGuitar from '@/assets/hero-guitar.jpg';
import heroHeadphones from '@/assets/hero-headphones.jpg';
import heroPiano from '@/assets/hero-piano.jpg';

const artisticImages = [
  { src: heroSynth, angle: 0, label: 'Producer' },
  { src: heroMic, angle: 60, label: 'Vocalist' },
  { src: heroDj, angle: 120, label: 'DJ' },
  { src: heroGuitar, angle: 180, label: 'Musician' },
  { src: heroHeadphones, angle: 240, label: 'Studio' },
  { src: heroPiano, angle: 300, label: 'Artist' },
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

      {/* Orbiting artistic image cards */}
      <motion.div
        className="absolute w-[400px] h-[400px]"
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      >
        {artisticImages.map(({ src, angle, label }, index) => (
          <motion.div
            key={index}
            className="absolute"
            style={{
              left: '50%',
              top: '50%',
              transform: `rotate(${angle}deg) translateX(180px) rotate(-${angle}deg)`,
              marginLeft: '-40px',
              marginTop: '-40px',
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.15 + 0.3 }}
          >
            <motion.div
              animate={{
                scale: [1, 1.08, 1],
                boxShadow: [
                  '0 0 20px hsl(var(--secondary) / 0.3)',
                  '0 0 40px hsl(var(--secondary) / 0.5)',
                  '0 0 20px hsl(var(--secondary) / 0.3)',
                ],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: index * 0.4,
                ease: "easeInOut"
              }}
              className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-secondary/50 shadow-lg"
            >
              <img 
                src={src} 
                alt={label}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <span className="absolute bottom-1 left-0 right-0 text-center text-[10px] font-semibold text-white/90">
                {label}
              </span>
            </motion.div>
          </motion.div>
        ))}
      </motion.div>

      {/* Rotating arcs with music patterns */}
      <motion.div
        className="absolute w-[320px] h-[320px]"
        animate={{ rotate: -360 }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      >
        <svg viewBox="0 0 320 320" className="w-full h-full">
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
          
          <motion.path
            d="M 160 40 A 120 120 0 0 1 280 160"
            fill="none"
            stroke="url(#arcGradient1)"
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: [0, 1, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          
          <motion.path
            d="M 160 280 A 120 120 0 0 1 40 160"
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

      {/* Equalizer bars ring */}
      <motion.div
        className="absolute w-[200px] h-[200px]"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      >
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 origin-bottom"
            style={{
              transform: `rotate(${i * 18}deg) translateY(-80px)`,
              width: '3px',
              marginLeft: '-1.5px',
            }}
          >
            <motion.div
              className="w-full bg-gradient-to-t from-secondary/70 to-primary/50 rounded-full"
              animate={{
                height: [6, 16 + Math.random() * 12, 6],
              }}
              transition={{
                duration: 0.3 + Math.random() * 0.3,
                repeat: Infinity,
                delay: i * 0.04,
                ease: "easeInOut"
              }}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Central vinyl record style core */}
      <motion.div
        className="absolute w-24 h-24 rounded-full"
        style={{
          background: `
            radial-gradient(circle at center, 
              hsl(var(--secondary)) 0%, 
              hsl(var(--secondary) / 0.8) 12%,
              transparent 13%,
              transparent 18%,
              hsl(var(--primary) / 0.4) 19%,
              transparent 20%,
              transparent 28%,
              hsl(var(--secondary) / 0.25) 29%,
              transparent 30%,
              transparent 38%,
              hsl(var(--primary) / 0.2) 39%,
              transparent 40%,
              hsl(var(--primary) / 0.1) 100%
            )
          `,
          boxShadow: '0 0 50px hsl(var(--secondary) / 0.4), inset 0 0 25px hsl(var(--primary) / 0.3)',
        }}
        animate={{ rotate: 360 }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      
      {/* Inner glowing core with music icon */}
      <motion.div
        className="absolute w-12 h-12 rounded-full flex items-center justify-center"
        style={{
          background: 'radial-gradient(circle, hsl(var(--secondary)) 0%, hsl(var(--primary)) 80%)',
          boxShadow: '0 0 35px hsl(var(--secondary) / 0.7)',
        }}
        animate={{
          scale: [1, 1.12, 1],
          boxShadow: [
            '0 0 35px hsl(var(--secondary) / 0.7)',
            '0 0 55px hsl(var(--secondary) / 0.9)',
            '0 0 35px hsl(var(--secondary) / 0.7)',
          ],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <Music className="w-5 h-5 text-white" />
      </motion.div>

      {/* Floating musical notes */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={`note-${i}`}
          className="absolute text-secondary/50 text-xl font-bold"
          initial={{
            x: Math.cos((i / 8) * Math.PI * 2) * 220,
            y: Math.sin((i / 8) * Math.PI * 2) * 220,
            opacity: 0,
          }}
          animate={{
            y: [
              Math.sin((i / 8) * Math.PI * 2) * 220,
              Math.sin((i / 8) * Math.PI * 2) * 220 - 25,
              Math.sin((i / 8) * Math.PI * 2) * 220,
            ],
            opacity: [0.2, 0.6, 0.2],
            scale: [0.9, 1.15, 0.9],
          }}
          transition={{
            duration: 2.5 + i * 0.3,
            repeat: Infinity,
            delay: i * 0.3,
            ease: "easeInOut"
          }}
        >
          {i % 2 === 0 ? '♪' : '♫'}
        </motion.div>
      ))}
    </div>
  );
};
