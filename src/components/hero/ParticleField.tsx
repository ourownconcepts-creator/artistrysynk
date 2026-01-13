import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

function Stars() {
  const ref = useRef<THREE.Points>(null);
  
  const particles = useMemo(() => {
    const positions = new Float32Array(2000 * 3);
    for (let i = 0; i < 2000; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return positions;
  }, []);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = state.clock.elapsedTime * 0.02;
      ref.current.rotation.y = state.clock.elapsedTime * 0.03;
    }
  });

  return (
    <Points ref={ref} positions={particles} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#ffd700"
        size={0.02}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.6}
      />
    </Points>
  );
}

function FloatingOrbs() {
  const orb1Ref = useRef<THREE.Mesh>(null);
  const orb2Ref = useRef<THREE.Mesh>(null);
  const orb3Ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    
    if (orb1Ref.current) {
      orb1Ref.current.position.x = Math.sin(t * 0.3) * 2 - 3;
      orb1Ref.current.position.y = Math.cos(t * 0.4) * 1.5 + 1;
      orb1Ref.current.scale.setScalar(1 + Math.sin(t * 0.5) * 0.2);
    }
    
    if (orb2Ref.current) {
      orb2Ref.current.position.x = Math.cos(t * 0.2) * 2 + 3;
      orb2Ref.current.position.y = Math.sin(t * 0.3) * 1.5 - 1;
      orb2Ref.current.scale.setScalar(1 + Math.cos(t * 0.4) * 0.3);
    }
    
    if (orb3Ref.current) {
      orb3Ref.current.position.x = Math.sin(t * 0.25) * 1.5;
      orb3Ref.current.position.y = Math.cos(t * 0.35) * 1;
      orb3Ref.current.scale.setScalar(1.2 + Math.sin(t * 0.3) * 0.25);
    }
  });

  return (
    <>
      <mesh ref={orb1Ref} position={[-3, 1, -5]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#ff6b35" transparent opacity={0.15} />
      </mesh>
      <mesh ref={orb2Ref} position={[3, -1, -5]}>
        <sphereGeometry args={[1.2, 32, 32]} />
        <meshBasicMaterial color="#ffd700" transparent opacity={0.12} />
      </mesh>
      <mesh ref={orb3Ref} position={[0, 0, -6]}>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshBasicMaterial color="#ff4757" transparent opacity={0.1} />
      </mesh>
    </>
  );
}

export const ParticleField = () => {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} />
        <Stars />
        <FloatingOrbs />
      </Canvas>
    </div>
  );
};
