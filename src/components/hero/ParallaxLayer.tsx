import { useEffect, useState, ReactNode } from 'react';

interface ParallaxLayerProps {
  children: ReactNode;
  speed: number;
  className?: string;
}

export const ParallaxLayer = ({ children, speed, className = '' }: ParallaxLayerProps) => {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setOffset(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div 
      className={`will-change-transform ${className}`}
      style={{ 
        transform: `translateY(${offset * speed}px)`,
      }}
    >
      {children}
    </div>
  );
};

interface FloatingIconProps {
  icon: ReactNode;
  className?: string;
  animationDuration?: string;
  animationDelay?: string;
}

export const FloatingIcon = ({ 
  icon, 
  className = '', 
  animationDuration = '3s',
  animationDelay = '0s' 
}: FloatingIconProps) => {
  return (
    <div 
      className={`absolute ${className}`}
      style={{
        animation: `float ${animationDuration} ease-in-out infinite`,
        animationDelay,
      }}
    >
      {icon}
    </div>
  );
};
