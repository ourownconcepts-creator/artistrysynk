import { useEffect, useState } from 'react';

interface BlobProps {
  className?: string;
  color: string;
  delay?: number;
  duration?: number;
}

const Blob = ({ className, color, delay = 0, duration = 8 }: BlobProps) => {
  const [path, setPath] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setPath(prev => (prev + 1) % 4);
    }, duration * 1000);
    
    return () => clearInterval(interval);
  }, [duration]);

  const paths = [
    "M440,320Q420,400,340,420Q260,440,180,420Q100,400,80,320Q60,240,100,180Q140,120,220,100Q300,80,360,120Q420,160,440,240Q460,320,440,320Z",
    "M460,300Q440,380,360,400Q280,420,200,400Q120,380,100,300Q80,220,120,160Q160,100,240,80Q320,60,380,100Q440,140,460,220Q480,300,460,300Z",
    "M420,340Q400,420,320,440Q240,460,160,440Q80,420,80,340Q80,260,120,200Q160,140,240,120Q320,100,380,140Q440,180,440,260Q440,340,420,340Z",
    "M480,300Q460,360,400,380Q340,400,260,400Q180,400,120,360Q60,320,60,240Q60,160,120,120Q180,80,260,80Q340,80,400,120Q460,160,480,240Q500,320,480,300Z"
  ];

  return (
    <div 
      className={`absolute ${className}`}
      style={{ 
        animationDelay: `${delay}s`,
      }}
    >
      <svg 
        viewBox="0 0 560 560" 
        className="w-full h-full"
        style={{ filter: 'blur(60px)' }}
      >
        <path
          fill={color}
          className="transition-all duration-[4000ms] ease-in-out"
          d={paths[path]}
        />
      </svg>
    </div>
  );
};

export const MorphingBlobs = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <Blob 
        className="w-[600px] h-[600px] -top-32 -left-32 opacity-30"
        color="hsl(var(--primary))"
        delay={0}
        duration={10}
      />
      <Blob 
        className="w-[500px] h-[500px] -bottom-32 -right-32 opacity-25"
        color="hsl(var(--secondary))"
        delay={2}
        duration={12}
      />
      <Blob 
        className="w-[400px] h-[400px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20"
        color="hsl(var(--accent))"
        delay={4}
        duration={8}
      />
    </div>
  );
};
