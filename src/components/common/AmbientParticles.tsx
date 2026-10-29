import React, { useMemo } from 'react';
import { motion } from 'motion/react';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
  deltaX: number;
  deltaY: number;
}

export const AmbientParticles: React.FC = () => {
  const particles = useMemo<Particle[]>(() => {
    const colors = [
      'rgba(139, 92, 246, 0.45)', // Violet
      'rgba(6, 182, 212, 0.4)',   // Cyan
      'rgba(16, 185, 129, 0.35)',  // Emerald
      'rgba(167, 139, 250, 0.5)'  // Lavender
    ];
    return Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 6 + 3,
      color: colors[i % colors.length],
      duration: Math.random() * 8 + 10,
      delay: Math.random() * 4,
      deltaX: (Math.random() - 0.5) * 40,
      deltaY: (Math.random() - 0.5) * 50
    }));
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1,
        overflow: 'hidden'
      }}
    >
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{
            x: `${p.x}vw`,
            y: `${p.y}vh`,
            opacity: 0.2,
            scale: 0.8
          }}
          animate={{
            x: [`${p.x}vw`, `${p.x + p.deltaX / 10}vw`, `${p.x}vw`],
            y: [`${p.y}vh`, `${p.y + p.deltaY / 10}vh`, `${p.y}vh`],
            opacity: [0.2, 0.7, 0.2],
            scale: [0.8, 1.25, 0.8]
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
            delay: p.delay
          }}
          style={{
            position: 'absolute',
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: '50%',
            backgroundColor: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
            filter: 'blur(1px)'
          }}
        />
      ))}
    </div>
  );
};
