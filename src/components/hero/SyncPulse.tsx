import { motion } from 'framer-motion';

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

      {/* Rotating arcs */}
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

      {/* Counter-rotating inner arcs */}
      <motion.div
        className="absolute w-[280px] h-[280px]"
        animate={{ rotate: -360 }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
      >
        <svg viewBox="0 0 280 280" className="w-full h-full">
          <defs>
            <linearGradient id="innerArcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--secondary))" stopOpacity="0.6" />
              <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          <motion.path
            d="M 140 30 A 110 110 0 0 1 250 140"
            fill="none"
            stroke="url(#innerArcGradient)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="5,5"
            animate={{ strokeDashoffset: [0, -20] }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          
          <motion.path
            d="M 140 250 A 110 110 0 0 1 30 140"
            fill="none"
            stroke="url(#innerArcGradient)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="5,5"
            animate={{ strokeDashoffset: [0, -20] }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </svg>
      </motion.div>

      {/* Central energy core */}
      <motion.div
        className="absolute w-20 h-20 rounded-full"
        style={{
          background: 'radial-gradient(circle, hsl(var(--secondary)) 0%, hsl(var(--primary)) 50%, transparent 70%)',
        }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.6, 0.9, 0.6],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      {/* Inner glow */}
      <motion.div
        className="absolute w-12 h-12 rounded-full bg-secondary"
        style={{ filter: 'blur(8px)' }}
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.8, 1, 0.8],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </div>
  );
};
