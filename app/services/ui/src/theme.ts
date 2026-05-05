import { createTheme, type PaletteMode } from '@mui/material/styles';

export function getTheme(mode: PaletteMode) {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: '#6366F1',
        light: '#818CF8',
        dark: '#4F46E5',
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: '#06B6D4',
        light: '#22D3EE',
        dark: '#0891B2',
        contrastText: '#FFFFFF',
      },
      error: {
        main: '#EF4444',
        light: '#F87171',
        dark: '#DC2626',
      },
      warning: {
        main: '#F59E0B',
        light: '#FCD34D',
        dark: '#D97706',
      },
      success: {
        main: '#10B981',
        light: '#34D399',
        dark: '#059669',
      },
      background: {
        default: isDark ? '#0F172A' : '#F1F5F9',
        paper: isDark ? '#1E293B' : '#FFFFFF',
      },
      text: {
        primary: isDark ? '#F1F5F9' : '#0F172A',
        secondary: isDark ? '#94A3B8' : '#64748B',
      },
      divider: isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(15, 23, 42, 0.08)',
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica Neue", "Arial", sans-serif',
      h4: { fontWeight: 700 },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 600 },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600 },
      button: {
        fontWeight: 500,
        textTransform: 'none',
      },
    },
    shape: {
      borderRadius: 10,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            borderRadius: 8,
            boxShadow: 'none',
            '&:hover': { boxShadow: 'none' },
          },
          contained: {
            '&:hover': { boxShadow: 'none' },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            fontWeight: 500,
            fontSize: '0.72rem',
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: { borderRadius: 8 },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: { borderRadius: 8 },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: { borderRadius: 16 },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 8 },
        },
      },
    },
  });
}
