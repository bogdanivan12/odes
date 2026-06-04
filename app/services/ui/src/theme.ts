import { createTheme, type PaletteMode } from '@mui/material/styles';
import Grow from '@mui/material/Grow';

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
            transition: 'transform 120ms ease, box-shadow 150ms ease, background-color 150ms ease, border-color 150ms ease',
            '&:active': { transform: 'scale(0.97)' },
          },
          contained: {
            '&:hover': { boxShadow: `0 4px 14px ${isDark ? 'rgba(0,0,0,0.4)' : 'rgba(99,102,241,0.28)'}`, transform: 'translateY(-1px)' },
            '&:active': { transform: 'translateY(0) scale(0.98)' },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            // Smooth color crossfade when toggling dark/light.
            transition: 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease',
          },
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
          root: {
            borderRadius: 8,
            transition: 'transform 120ms ease, background-color 150ms ease, color 150ms ease',
            '&:active': { transform: 'scale(0.9)' },
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: { transition: 'background-color 120ms ease' },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: { transition: 'background-color 120ms ease, color 120ms ease' },
        },
      },
      MuiDialog: {
        defaultProps: {
          // Dialogs zoom in instead of a plain fade.
          TransitionComponent: Grow,
        },
        styleOverrides: {
          paper: { borderRadius: 16 },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 8 },
        },
      },
      MuiTablePagination: {
        styleOverrides: {
          // Wrap on small screens and drop the "Rows per page" selector on
          // phones so the controls never overflow horizontally.
          toolbar: { flexWrap: 'wrap', rowGap: 4, paddingLeft: 8 },
          selectLabel: { '@media (max-width:600px)': { display: 'none' } },
          input: { '@media (max-width:600px)': { display: 'none' } },
        },
      },
    },
  });
}
