import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

interface ThemeToggleProps {
  className?: string;
  style?: React.CSSProperties;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className, style }) => {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div
      role="group"
      aria-label="Theme Selector"
      className={`theme-toggle-group ${className || ''}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px',
        padding: '3px',
        borderRadius: '10px',
        border: '1px solid var(--border)',
        backgroundColor: isDark ? 'var(--bg-input)' : 'var(--bg-subtle)',
        ...style,
      }}
    >
      <button
        type="button"
        onClick={() => setTheme('light')}
        aria-pressed={!isDark}
        title="Activate Light Mode"
        className={`theme-mode-option ${!isDark ? 'active' : ''}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '5px 10px',
          borderRadius: '7px',
          border: 'none',
          backgroundColor: !isDark ? 'var(--bg-card)' : 'transparent',
          color: !isDark ? 'var(--text-primary)' : 'var(--text-light)',
          boxShadow: !isDark ? 'var(--shadow-xs)' : 'none',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: !isDark ? 700 : 500,
          transition: 'all 0.15s ease',
        }}
      >
        <Sun size={14} style={{ color: !isDark ? '#f59e0b' : '#94a3b8' }} />
        <span>Light</span>
      </button>

      <button
        type="button"
        onClick={() => setTheme('dark')}
        aria-pressed={isDark}
        title="Activate Dark Mode"
        className={`theme-mode-option ${isDark ? 'active' : ''}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '5px 10px',
          borderRadius: '7px',
          border: 'none',
          backgroundColor: isDark ? 'var(--bg-subtle)' : 'transparent',
          color: isDark ? 'var(--text-primary)' : 'var(--text-light)',
          boxShadow: isDark ? 'var(--shadow-sm)' : 'none',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: isDark ? 700 : 500,
          transition: 'all 0.15s ease',
        }}
      >
        <Moon size={14} style={{ color: isDark ? '#60a5fa' : '#64748b' }} />
        <span>Dark</span>
      </button>
    </div>
  );
};

export default ThemeToggle;
