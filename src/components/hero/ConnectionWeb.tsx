import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, animate } from 'framer-motion';
import { allRoles } from '@/lib/creativeRoles';

interface Node {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  label: string;
}

interface Connection {
  from: number;
  to: number;
  strength: number;
}

const creativeLabels = allRoles.map((r) => r.label);

const colors = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--accent))',
];

interface ConnectionWebProps {
  query?: string;
  isPro?: boolean;
  highlightedCount?: number;
  totalMatches?: number;
}

export const ConnectionWeb = ({ query = '', isPro = true, highlightedCount = 1, totalMatches = 0 }: ConnectionWebProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });
  const [nodes, setNodes] = useState<Node[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activeNode, setActiveNode] = useState<number | null>(null);
  const [hoveredMatch, setHoveredMatch] = useState<number | null>(null);
  const animationRef = useRef<number>();

  const normalizedQuery = query.trim().toLowerCase();
  const isMatch = (label: string) =>
    normalizedQuery.length > 0 && label.toLowerCase().includes(normalizedQuery);

  // Initialize nodes
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    const { width, height } = dimensions;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Create nodes in a circular pattern with some randomness
    const newNodes: Node[] = creativeLabels.map((label, i) => {
      const angle = (i / creativeLabels.length) * Math.PI * 2;
      const radius = Math.min(width, height) * 0.3;
      const variance = 0.2;
      
      return {
        id: i,
        x: centerX + Math.cos(angle) * radius * (1 + (Math.random() - 0.5) * variance),
        y: centerY + Math.sin(angle) * radius * (1 + (Math.random() - 0.5) * variance),
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: 28 + Math.random() * 10,
        color: colors[i % colors.length],
        label
      };
    });

    // Create connections between nodes
    const newConnections: Connection[] = [];
    for (let i = 0; i < newNodes.length; i++) {
      // Connect to 2-3 nearby nodes
      const connectCount = 2 + Math.floor(Math.random() * 2);
      for (let j = 0; j < connectCount; j++) {
        const targetIndex = (i + j + 1) % newNodes.length;
        if (!newConnections.find(c => 
          (c.from === i && c.to === targetIndex) || 
          (c.from === targetIndex && c.to === i)
        )) {
          newConnections.push({
            from: i,
            to: targetIndex,
            strength: 0.3 + Math.random() * 0.7
          });
        }
      }
    }

    setNodes(newNodes);
    setConnections(newConnections);
  }, [dimensions]);

  // Animate nodes
  useEffect(() => {
    if (nodes.length === 0) return;

    const animateNodes = () => {
      setNodes(prevNodes => {
        const { width, height } = dimensions;
        return prevNodes.map(node => {
          let newX = node.x + node.vx;
          let newY = node.y + node.vy;

          // Bounce off edges with padding
          const padding = 80;
          if (newX < padding || newX > width - padding) {
            node.vx *= -1;
            newX = Math.max(padding, Math.min(width - padding, newX));
          }
          if (newY < padding || newY > height - padding) {
            node.vy *= -1;
            newY = Math.max(padding, Math.min(height - padding, newY));
          }

          // Slow drift with occasional speed changes
          if (Math.random() < 0.01) {
            node.vx = (Math.random() - 0.5) * 0.8;
            node.vy = (Math.random() - 0.5) * 0.8;
          }

          return { ...node, x: newX, y: newY };
        });
      });

      animationRef.current = requestAnimationFrame(animateNodes);
    };

    animationRef.current = requestAnimationFrame(animateNodes);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [nodes.length, dimensions]);

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
    >
      <svg 
        width={dimensions.width} 
        height={dimensions.height}
        className="absolute inset-0"
      >
        <defs>
          {/* Gradient definitions */}
          <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
            <stop offset="50%" stopColor="hsl(var(--secondary))" stopOpacity="0.6" />
            <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.3" />
          </linearGradient>
          
          {/* Glow filter */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          {/* Pulse animation filter */}
          <filter id="pulse">
            <feGaussianBlur stdDeviation="2">
              <animate 
                attributeName="stdDeviation" 
                values="2;4;2" 
                dur="2s" 
                repeatCount="indefinite"
              />
            </feGaussianBlur>
          </filter>
        </defs>

        {/* Connection lines */}
        {connections.map((conn, i) => {
          const fromNode = nodes[conn.from];
          const toNode = nodes[conn.to];
          if (!fromNode || !toNode) return null;

          const isActive = activeNode === conn.from || activeNode === conn.to;
          
          return (
            <motion.path
              key={i}
              d={`M ${fromNode.x} ${fromNode.y} Q ${(fromNode.x + toNode.x) / 2 + (Math.random() - 0.5) * 20} ${(fromNode.y + toNode.y) / 2 + (Math.random() - 0.5) * 20} ${toNode.x} ${toNode.y}`}
              stroke="url(#connectionGradient)"
              strokeWidth={isActive ? 3 : 1.5}
              fill="none"
              strokeDasharray="8,4"
              filter={isActive ? "url(#glow)" : undefined}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ 
                pathLength: 1, 
                opacity: conn.strength * (isActive ? 1 : 0.5),
                strokeDashoffset: [0, -24]
              }}
              transition={{ 
                pathLength: { duration: 2, delay: i * 0.1 },
                opacity: { duration: 1 },
                strokeDashoffset: { 
                  duration: 2, 
                  repeat: Infinity, 
                  ease: "linear" 
                }
              }}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node, i) => (
          <g key={node.id} style={{ opacity: normalizedQuery && !isMatch(node.label) ? 0.2 : 1, transition: 'opacity 0.3s' }}>
            {/* Outer glow ring */}
            <motion.circle
              cx={node.x}
              cy={node.y}
              r={node.radius + (isMatch(node.label) ? 18 : 10)}
              fill="none"
              stroke={node.color}
              strokeWidth={isMatch(node.label) ? 3 : 2}
              opacity={isMatch(node.label) ? 0.8 : 0.3}
              initial={{ scale: 0 }}
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3]
              }}
              transition={{
                duration: 3,
                delay: i * 0.2,
                repeat: Infinity
              }}
            />
            
            {/* Main node circle */}
            <motion.circle
              cx={node.x}
              cy={node.y}
              r={node.radius}
              fill={`${node.color.replace(')', ' / 0.15)')}`}
              stroke={node.color}
              strokeWidth={2}
              filter="url(#glow)"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ 
                type: "spring",
                stiffness: 100,
                delay: i * 0.1 
              }}
              style={{ cursor: 'pointer' }}
              className="pointer-events-auto"
              onMouseEnter={() => {
                setActiveNode(node.id);
                if (isMatch(node.label) && !isPro) setHoveredMatch(node.id);
              }}
              onMouseLeave={() => {
                setActiveNode(null);
                setHoveredMatch((curr) => (curr === node.id ? null : curr));
              }}
            />
            
            {/* Label */}
            <motion.text
              x={node.x}
              y={node.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#ffffff"
              fontSize={9}
              fontWeight={600}
              className="pointer-events-none select-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.9 }}
              transition={{ delay: i * 0.1 + 0.5 }}
            >
              {node.label}
            </motion.text>

            {/* Free-tier "1 of N highlights" badge */}
            {isMatch(node.label) && !isPro && (
              <foreignObject
                x={node.x + node.radius - 8}
                y={node.y - node.radius - 20}
                width={90}
                height={22}
                className="pointer-events-auto overflow-visible"
              >
                <a
                  href="/pricing?source=badge"
                  title="Upgrade to Pro to highlight all matches"
                  className="inline-flex items-center justify-center rounded-full border bg-background/95 px-2 py-0.5 text-[9px] font-semibold text-foreground shadow-sm hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                  style={{ borderColor: node.color }}
                >
                  {highlightedCount} of {Math.max(totalMatches, highlightedCount)} highlights →
                </a>
              </foreignObject>
            )}

            {/* Free-tier hover tooltip with upgrade link */}
            {isMatch(node.label) && !isPro && hoveredMatch === node.id && (
              <foreignObject
                x={node.x - 110}
                y={node.y + node.radius + 8}
                width={220}
                height={70}
                className="pointer-events-auto"
              >
                <div
                  className="rounded-md border border-border/60 bg-popover/95 backdrop-blur-sm px-3 py-2 text-[11px] text-popover-foreground shadow-lg"
                >
                  <div>Free preview: only the top match highlights</div>
                  <a
                    href="/pricing?source=tooltip"
                    className="mt-1 inline-block text-primary font-semibold hover:underline"
                  >
                    Upgrade to Pro →
                  </a>
                </div>
              </foreignObject>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
};
