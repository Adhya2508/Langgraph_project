// src/contexts/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within a ThemeContextProvider');
  }
  return context;
};

export const ThemeContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme-mode');
    return (saved as ThemeMode) || 'dark'; // Premium dark mode by default
  });

  const toggleTheme = () => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  useEffect(() => {
    localStorage.setItem('theme-mode', mode);
  }, [mode]);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: mode === 'dark' ? '#818cf8' : '#4f46e5', // Sleek indigo
            light: '#a5b4fc',
            dark: '#3730a3',
          },
          secondary: {
            main: mode === 'dark' ? '#c084fc' : '#9333ea', // Sleek purple
          },
          background: {
            default: mode === 'dark' ? '#090d16' : '#f8fafc', // Linear/Vercel slate background
            paper: mode === 'dark' ? '#101725' : '#ffffff',   // Sleek card dark
          },
          text: {
            primary: mode === 'dark' ? '#f1f5f9' : '#0f172a',
            secondary: mode === 'dark' ? '#94a3b8' : '#475569',
          },
          divider: mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
        },
        typography: {
          fontFamily: '"Outfit", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
          h1: { fontWeight: 800, letterSpacing: '-0.025em' },
          h2: { fontWeight: 800, letterSpacing: '-0.02em' },
          h3: { fontWeight: 700, letterSpacing: '-0.015em' },
          h4: { fontWeight: 700, letterSpacing: '-0.015em' },
          h5: { fontWeight: 600, letterSpacing: '-0.01em' },
          h6: { fontWeight: 600, letterSpacing: '-0.01em' },
          body1: { lineHeight: 1.625 },
          body2: { lineHeight: 1.575 },
          button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0.01em' },
        },
        shape: {
          borderRadius: 16, // Softer curves for premium UI
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              body: {
                scrollbarColor: mode === 'dark' ? '#1e293b #090d16' : '#cbd5e1 #f8fafc',
                '&::-webkit-scrollbar': {
                  width: '8px',
                  height: '8px',
                },
                '&::-webkit-scrollbar-track': {
                  background: mode === 'dark' ? '#090d16' : '#f8fafc',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: mode === 'dark' ? '#1e293b' : '#cbd5e1',
                  borderRadius: '10px',
                  border: `2px solid ${mode === 'dark' ? '#090d16' : '#f8fafc'}`,
                },
                '&::-webkit-scrollbar-thumb:hover': {
                  background: mode === 'dark' ? '#334155' : '#94a3b8',
                },
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: 12,
                padding: '10px 20px',
                fontWeight: 600,
                fontSize: '0.875rem',
                boxShadow: 'none',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-1.5px)',
                  boxShadow: mode === 'dark' 
                    ? '0 6px 20px rgba(129, 140, 248, 0.2)' 
                    : '0 6px 20px rgba(79, 70, 229, 0.15)',
                },
                '&:active': {
                  transform: 'translateY(0px)',
                },
              },
              contained: {
                background: mode === 'dark' 
                  ? 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)' 
                  : 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 18,
                boxShadow: mode === 'dark' 
                  ? '0 8px 30px rgba(0, 0, 0, 0.35)' 
                  : '0 8px 30px rgba(0, 0, 0, 0.04)',
                border: mode === 'dark' 
                  ? '1px solid rgba(255, 255, 255, 0.05)' 
                  : '1px solid rgba(0, 0, 0, 0.04)',
                backdropFilter: 'blur(16px)', // Soft glassmorphism where transparent bg is used
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              outlined: {
                border: mode === 'dark' 
                  ? '1px solid rgba(255, 255, 255, 0.05)' 
                  : '1px solid rgba(0, 0, 0, 0.04)',
              },
            },
          },
        },
      }),
    [mode]
  );

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};
export default ThemeContextProvider;
