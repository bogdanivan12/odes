import { StrictMode, useState, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, CssBaseline } from '@mui/material';
import './index.css';
import App from './App.tsx';
import { getTheme } from './theme.ts';
import { ColorModeContext } from './context/ColorModeContext.tsx';

function Root() {
  const [mode, setMode] = useState<'light' | 'dark'>(() => {
    try {
      const stored = localStorage.getItem('colorMode');
      if (stored === 'light' || stored === 'dark') return stored;
    } catch {
      // ignore
    }
    return 'light';
  });

  const colorMode = useMemo(
    () => ({
      mode,
      toggleColorMode: () => {
        setMode((prev) => {
          const next = prev === 'light' ? 'dark' : 'light';
          try {
            localStorage.setItem('colorMode', next);
          } catch {
            // ignore
          }
          return next;
        });
      },
    }),
    [mode],
  );

  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
