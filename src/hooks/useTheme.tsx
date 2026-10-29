import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const applyThemeToDOM = (theme: Theme) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const body = document.body;

  root.setAttribute('data-theme', theme);
  root.style.colorScheme = theme;
  if (body) {
    body.setAttribute('data-theme', theme);
    body.style.colorScheme = theme;
  }

  if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
    if (body) {
      body.classList.add('dark');
      body.classList.remove('light');
    }
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
    if (body) {
      body.classList.add('light');
      body.classList.remove('dark');
    }
  }
};

const getInitialTheme = (): Theme => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('ipts_theme');
      if (saved === 'dark' || saved === 'light') {
        applyThemeToDOM(saved);
        return saved;
      }
    } catch {
      // fallback
    }
  }
  applyThemeToDOM('light');
  return 'light';
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  // Synchronously apply data-theme before paint to prevent FOUC
  useLayoutEffect(() => {
    applyThemeToDOM(theme);
    try {
      localStorage.setItem('ipts_theme', theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);


  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'ipts_theme' && (e.newValue === 'light' || e.newValue === 'dark')) {
        setThemeState(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const toggleTheme = () => {
    setThemeState((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      applyThemeToDOM(next);
      return next;
    });
  };

  const setTheme = (t: Theme) => {
    applyThemeToDOM(t);
    setThemeState(t);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
