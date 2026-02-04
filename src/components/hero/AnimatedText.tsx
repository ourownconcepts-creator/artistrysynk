import React, { ReactNode, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface AnimatedTextProps {
  children: string;
  className?: string;
  delay?: number;
}

export const AnimatedText = ({ children, className = '', delay = 0 }: AnimatedTextProps) => {
  const words = children.split(' ');
  
  return (
    <motion.span className={className}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          className="inline-block mr-[0.25em]"
          initial={{ opacity: 0, y: 20, rotateX: -90 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{
            duration: 0.5,
            delay: delay + i * 0.1,
            ease: [0.25, 0.46, 0.45, 0.94]
          }}
        >
          {word}
        </motion.span>
      ))}
    </motion.span>
  );
};

interface GlowTextProps {
  children: ReactNode;
  className?: string;
}

export const GlowText = ({ children, className = '' }: GlowTextProps) => {
  return (
    <span className={`relative inline-block ${className}`}>
      {/* Glow layer */}
      <span 
        className={`absolute inset-0 blur-2xl opacity-50 ${className}`}
        aria-hidden="true"
      >
        {children}
      </span>
      {/* Main text - inherit gradient */}
      <span className={`relative ${className}`}>{children}</span>
    </span>
  );
};

interface TypewriterTextProps {
  text: string;
  className?: string;
  delay?: number;
  speed?: number;
}

export const TypewriterText = ({ text, className = '', delay = 0, speed = 50 }: TypewriterTextProps) => {
  return (
    <motion.span className={className}>
      {text.split('').map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: 0.05,
            delay: delay + (i * speed) / 1000
          }}
        >
          {char}
        </motion.span>
      ))}
    </motion.span>
  );
};

interface CountUpProps {
  end: number;
  suffix?: string;
  duration?: number;
  delay?: number;
  className?: string;
}

export const CountUp = ({ end, suffix = '', duration = 2, delay = 0, className = '' }: CountUpProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    
    const timeout = setTimeout(() => {
      let startTime: number;
      const animateCount = (currentTime: number) => {
        if (!startTime) startTime = currentTime;
        const progress = Math.min((currentTime - startTime) / (duration * 1000), 1);
        const value = Math.floor(end * easeOutExpo(progress));
        node.textContent = value.toString() + suffix;
        if (progress < 1) {
          requestAnimationFrame(animateCount);
        }
      };
      requestAnimationFrame(animateCount);
    }, delay * 1000);
    
    return () => clearTimeout(timeout);
  }, [end, suffix, duration, delay]);
  
  return (
    <motion.span
      ref={ref}
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
    >
      0{suffix}
    </motion.span>
  );
};

const easeOutExpo = (x: number): number => {
  return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
};
