import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

interface ThemeToggleProps {
  className?: string;
  style?: React.CSSProperties;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className, style }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
      title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
      className={`theme-toggle-btn ${className || ''}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '7px 12px',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        backgroundColor: isDark ? '#1e293b' : '#f8fafc',
        color: isDark ? '#f59e0b' : '#475569',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: 600,
        transition: 'all 0.2s ease',
        ...style,
      }}
    >
      {isDark ? (
        <>
          <Sun size={17} style={{ color: '#f59e0b' }} />
          <span style={{ fontSize: '12px', color: '#f8fafc' }}>Light</span>
        </>
      ) : (
        <>
          <Moon size={17} style={{ color: '#6366f1' }} />
          <span style={{ fontSize: '12px', color: '#475569' }}>Dark</span>
        </>
      )}
    </button>
  );
};

export default ThemeToggle;
