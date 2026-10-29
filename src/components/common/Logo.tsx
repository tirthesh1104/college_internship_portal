import React from 'react';

interface LogoProps {
  width?: number | string;
  height?: number | string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Reusable logo component for the Internship Performance Tracking System (IPTS).
 * Uses the exact supplied badge PNG. Preserves aspect ratio with object-fit: contain.
 */
export const Logo: React.FC<LogoProps> = ({
  width = 120,
  height = 120,
  alt = 'Internship and Technical Opportunities',
  className,
  style,
}) => {
  return (
    <img
      src="/internship-technical-opportunities-badge.png"
      alt={alt}
      className={className}
      style={{
        width,
        height,
        objectFit: 'contain',
        display: 'block',
        ...style,
      }}
      decoding="async"
    />
  );
};

export default Logo;
