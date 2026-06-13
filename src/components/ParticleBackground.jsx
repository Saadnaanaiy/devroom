import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial } from '@react-three/drei';

function FloatingShape({ position, rotation, scale, color, speed, distort, type }) {
  const meshRef = useRef();
  const initialPos = useRef(position);
  const phase = useRef(Math.random() * Math.PI * 2);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    const p = phase.current;
    const mx = state.pointer.x * 0.4;
    const my = state.pointer.y * 0.4;

    meshRef.current.rotation.x = rotation[0] + Math.sin(t * speed * 0.3 + p) * 0.5;
    meshRef.current.rotation.y = rotation[1] + Math.cos(t * speed * 0.4 + p) * 0.6;
    meshRef.current.rotation.z = Math.sin(t * speed * 0.2 + p * 1.3) * 0.2;

    meshRef.current.position.x = initialPos.current[0] + Math.sin(t * speed * 0.5 + p) * 0.5 + mx;
    meshRef.current.position.y = initialPos.current[1] + Math.cos(t * speed * 0.4 + p * 0.7) * 0.5 + my;
    meshRef.current.position.z = initialPos.current[2] + Math.sin(t * speed * 0.15 + p * 1.1) * 0.4;
  });

  const geometry = useMemo(() => {
    switch (type) {
      case 'icosahedron': return <icosahedronGeometry args={[scale, 0]} />;
      case 'octahedron': return <octahedronGeometry args={[scale, 0]} />;
      case 'torus': return <torusGeometry args={[scale * 0.8, scale * 0.3, 16, 32]} />;
      case 'dodecahedron': return <dodecahedronGeometry args={[scale, 0]} />;
      default: return <icosahedronGeometry args={[scale, 0]} />;
    }
  }, [type, scale]);

  return (
    <Float speed={speed * 0.3} floatIntensity={1.2} rotationIntensity={0.3}>
      <mesh ref={meshRef} position={position}>
        {geometry}
        <MeshDistortMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.2}
          roughness={0.2}
          metalness={0.6}
          distort={distort}
          speed={3}
          transparent
          opacity={0.4}
          wireframe={false}
        />
      </mesh>
    </Float>
  );
}

function MicroParticles() {
  const particles = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 80; i++) {
      arr.push({
        position: [
          (Math.random() - 0.5) * 22,
          (Math.random() - 0.5) * 16,
          (Math.random() - 0.5) * 15 - 5
        ],
        size: Math.random() * 1.5 + 0.3,
        speed: Math.random() * 0.15 + 0.03,
        opacity: Math.random() * 0.25 + 0.05,
      });
    }
    return arr;
  }, []);

  return (
    <group>
      {particles.map((p, i) => (
        <FloatingDot key={i} {...p} />
      ))}
    </group>
  );
}

function FloatingDot({ position, size, speed, opacity }) {
  const ref = useRef();
  const phase = useRef(Math.random() * Math.PI * 2);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime();
    ref.current.position.x = position[0] + Math.sin(t * speed * 0.5 + phase.current) * 0.6;
    ref.current.position.y = position[1] + Math.cos(t * speed * 0.3 + phase.current * 1.2) * 0.6;
    ref.current.position.z = position[2] + Math.sin(t * speed * 0.2 + phase.current * 0.8) * 0.3;
    ref.current.material.opacity = opacity * (0.4 + 0.6 * Math.sin(t * speed * 0.4 + phase.current));
  });

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[size * 0.04, 6, 6]} />
      <meshBasicMaterial color="#a3a3a3" transparent opacity={opacity} />
    </mesh>
  );
}

function Shapes() {
  const shapes = useMemo(() => [
    { position: [-6, 3, -5], rotation: [0.5, 0.8, 0.2], scale: 1.1, color: '#a3a3a3', speed: 0.2, distort: 0.25, type: 'icosahedron' },
    { position: [7, -2, -7], rotation: [0.3, 0.6, 0.9], scale: 0.9, color: '#808080', speed: 0.15, distort: 0.3, type: 'octahedron' },
    { position: [-4, -4, -10], rotation: [0.7, 0.2, 0.4], scale: 0.7, color: '#666666', speed: 0.25, distort: 0.2, type: 'torus' },
    { position: [5, 4, -6], rotation: [0.1, 0.9, 0.3], scale: 0.8, color: '#a3a3a3', speed: 0.18, distort: 0.35, type: 'dodecahedron' },
    { position: [-2, -5, -12], rotation: [0.4, 0.1, 0.7], scale: 1.0, color: '#595959', speed: 0.12, distort: 0.28, type: 'icosahedron' },
    { position: [3, 5, -8], rotation: [0.8, 0.3, 0.1], scale: 0.65, color: '#8a8a8a', speed: 0.22, distort: 0.3, type: 'octahedron' },
    { position: [-7, -1, -15], rotation: [0.2, 0.7, 0.5], scale: 1.3, color: '#525252', speed: 0.1, distort: 0.2, type: 'dodecahedron' },
    { position: [6, -4, -14], rotation: [0.6, 0.4, 0.8], scale: 0.75, color: '#808080', speed: 0.2, distort: 0.25, type: 'torus' },
  ], []);

  return (
    <group>
      {shapes.map((props, i) => (
        <FloatingShape key={i} {...props} />
      ))}
    </group>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={0.9} />
      <directionalLight position={[-5, -5, -5]} intensity={0.4} color="#ffffff" />
      <pointLight position={[0, 0, 0]} intensity={0.3} color="#ffffff" />
      <Shapes />
      <MicroParticles />
    </>
  );
}

const ParticleBackground = ({ className = '' }) => {
  return (
    <div className={`absolute inset-0 -z-10 ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true,
        }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            console.warn('[WebGL] Context lost — attempting recovery');
          });
        }}
        style={{ background: 'transparent' }}
      >
        <Scene />
      </Canvas>
    </div>
  );
};

export default ParticleBackground;
