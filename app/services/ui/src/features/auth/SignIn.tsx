import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { SignInRequest } from './types';
import { signIn } from '../../api/auth.ts';
import { AuthToken } from '../../types/token.ts';
import { USER_REGISTER_ROUTE } from '../../config/routes.ts';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

export function SignIn() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.removeItem('authToken');
      localStorage.removeItem('selectedInstitutionId');
    } catch { /* ignore */ }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const email = (form.get('email') as string) || '';
    const password = (form.get('password') as string) || '';

    let request: SignInRequest;
    try {
      request = new SignInRequest({ email, password });
      request.validate();
    } catch (err) {
      setError((err as Error).message || 'Invalid input');
      return;
    }

    setLoading(true);
    try {
      const data = await signIn(request);
      const token = AuthToken.fromApi(data);
      localStorage.setItem('authToken', token.getTokenString());
      navigate('/', { replace: true });
    } catch (err) {
      setError((err as Error).message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        width: '100vw',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        background: `radial-gradient(ellipse at 50% -20%, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.2 : 0.1)} 0%, transparent 65%), ${theme.palette.background.default}`,
        p: 2,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <CalendarMonthIcon sx={{ color: 'primary.main', fontSize: '2rem' }} />
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: '1.5rem',
                letterSpacing: '0.08em',
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              ODES
            </Typography>
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Welcome back
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Sign in to your account to continue
          </Typography>
        </Box>

        {/* Card */}
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: 4,
            boxShadow: `0 8px 40px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.4 : 0.08)}`,
          }}
        >
          <Box component="form" noValidate onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
              <TextField
                required
                fullWidth
                id="email"
                label="Email address"
                name="email"
                autoComplete="email"
                autoFocus
                disabled={loading}
              />
              <TextField
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="current-password"
                disabled={loading}
              />

              {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ borderRadius: 2, py: 1.25, mt: 0.5 }}
              >
                {loading ? <CircularProgress size={22} color="inherit" /> : 'Sign in'}
              </Button>
            </Stack>
          </Box>
        </Paper>

        {/* Footer link */}
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2.5 }}>
          Don&apos;t have an account?{' '}
          <RouterLink
            to={USER_REGISTER_ROUTE}
            style={{ color: theme.palette.primary.main, fontWeight: 600, textDecoration: 'none' }}
          >
            Create one
          </RouterLink>
        </Typography>
      </Box>
    </Box>
  );
}
