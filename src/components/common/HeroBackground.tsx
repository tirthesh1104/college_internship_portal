import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

interface HeroBackgroundProps {
  mousePos?: { x: number; y: number };
  intensity?: 'subtle' | 'vivid';
  style?: React.CSSProperties;
}

export const HeroBackground: React.FC<HeroBackgroundProps> = ({ mousePos, style }) => {
  const [internalMouse, setInternalMouse] = useState({ x: 0, y: 0 });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (mousePos) return;
    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX - window.innerWidth / 2;
      const y = e.clientY - window.innerHeight / 2;
      setInternalMouse({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mousePos]);

  const activeMouse = mousePos || internalMouse;

  if (prefersReducedMotion) {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          background: 'radial-gradient(circle at 50% 30%, rgba(139, 92, 246, 0.15) 0%, rgba(6, 182, 212, 0.08) 50%, #030303 100%)',
          ...style
        }}
      />
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
        background: '#030303',
        ...style
      }}
    >
      {/* Primary Violet Ambient Glowing Orb */}
      <motion.div
        animate={{
          x: activeMouse.x * 0.03,
          y: activeMouse.y * 0.03 + [0, -20, 0][1],
          scale: [1, 1.08, 1]
        }}
        transition={{
          x: { type: 'spring', damping: 25, stiffness: 80 },
          y: { type: 'spring', damping: 25, stiffness: 80 },
          scale: { duration: 10, repeat: Infinity, ease: 'easeInOut' }
        }}
        style={{
          position: 'absolute',
          top: '-10%',
          left: '15%',
          width: '550px',
          height: '550px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.35) 0%, rgba(139, 92, 246, 0.08) 50%, transparent 70%)',
          filter: 'blur(90px)',
          opacity: 0.85
        }}
      />

      {/* Secondary Cyan Ambient Glowing Orb */}
      <motion.div
        animate={{
          x: activeMouse.x * -0.04,
          y: activeMouse.y * -0.04,
          scale: [1, 1.12, 1]
        }}
        transition={{
          x: { type: 'spring', damping: 25, stiffness: 80 },
          y: { type: 'spring', damping: 25, stiffness: 80 },
          scale: { duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 1 }
        }}
        style={{
          position: 'absolute',
          bottom: '-15%',
          right: '10%',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.3) 0%, rgba(6, 182, 212, 0.06) 50%, transparent 70%)',
          filter: 'blur(100px)',
          opacity: 0.8
        }}
      />

      {/* Central Soft Atmospheric Highlight */}
      <div
        style={{
          position: 'absolute',
          top: '35%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '700px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(167, 139, 250, 0.12) 0%, transparent 70%)',
          filter: 'blur(70px)'
        }}
      />

      {/* Floating Interactive 3D Particles */}
      <motion.div
        animate={{
          x: activeMouse.x * 0.05,
          y: activeMouse.y * 0.05,
          rotate: activeMouse.x * 0.02
        }}
        transition={{ type: 'spring', damping: 20, stiffness: 90 }}
        style={{
          position: 'absolute',
          top: '18%',
          left: '12%',
          width: '52px',
          height: '52px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.35), rgba(6, 182, 212, 0.2))',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 8px 32px rgba(139, 92, 246, 0.25)'
        }}
      />

      <motion.div
        animate={{
          x: activeMouse.x * -0.06,
          y: activeMouse.y * -0.06,
          rotate: activeMouse.x * -0.03
        }}
        transition={{ type: 'spring', damping: 20, stiffness: 90 }}
        style={{
          position: 'absolute',
          bottom: '22%',
          right: '14%',
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.4) 0%, rgba(139, 92, 246, 0.1) 70%)',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 12px 36px rgba(6, 182, 212, 0.3)'
        }}
      />

      <motion.div
        animate={{
          x: activeMouse.x * 0.07,
          y: activeMouse.y * 0.07
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 85 }}
        style={{
          position: 'absolute',
          top: '28%',
          right: '22%',
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.35), rgba(139, 92, 246, 0.2))',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          transform: 'rotate(45deg)',
          boxShadow: '0 0 20px rgba(6, 182, 212, 0.25)'
        }}
      />
    </div>
  );
};
