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
import { Link as RouterLink } from 'react-router-dom';
import { SignUpRequest } from './types';
import { signUp } from '../../api/auth.ts';
import { USER_LOGIN_ROUTE } from '../../config/routes.ts';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

export function SignUp() {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
    const name = (form.get('name') as string) || '';
    const email = (form.get('email') as string) || '';
    const password = (form.get('password') as string) || '';
    const confirmPassword = (form.get('confirmPassword') as string) || '';

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    let request: SignUpRequest;
    try {
      request = new SignUpRequest({ name, email, password });
      request.validate();
    } catch (err) {
      setError((err as Error).message || 'Invalid input');
      return;
    }

    setLoading(true);
    try {
      await signUp(request);
      setSuccess(true);
    } catch (err) {
      setError((err as Error).message || 'Sign up failed');
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
            Create your account
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, textAlign: 'center' }}>
            Start managing schedules for your institution
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
          {success ? (
            <Box sx={{ textAlign: 'center', py: 1 }}>
              <Alert severity="success" sx={{ borderRadius: 2, mb: 2 }}>
                Account created successfully!
              </Alert>
              <Typography variant="body2" color="text.secondary">
                You can now{' '}
                <RouterLink
                  to={USER_LOGIN_ROUTE}
                  style={{ color: theme.palette.primary.main, fontWeight: 600, textDecoration: 'none' }}
                >
                  sign in
                </RouterLink>
                .
              </Typography>
            </Box>
          ) : (
            <Box component="form" noValidate onSubmit={handleSubmit}>
              <Stack spacing={2.5}>
                <TextField
                  required
                  fullWidth
                  id="name"
                  label="Full name"
                  name="name"
                  autoComplete="name"
                  autoFocus
                  disabled={loading}
                />
                <TextField
                  required
                  fullWidth
                  id="email"
                  label="Email address"
                  name="email"
                  autoComplete="email"
                  disabled={loading}
                />
                <TextField
                  required
                  fullWidth
                  name="password"
                  label="Password"
                  type="password"
                  id="password"
                  autoComplete="new-password"
                  disabled={loading}
                />
                <TextField
                  required
                  fullWidth
                  name="confirmPassword"
                  label="Confirm password"
                  type="password"
                  id="confirmPassword"
                  autoComplete="new-password"
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
                  {loading ? <CircularProgress size={22} color="inherit" /> : 'Create account'}
                </Button>
              </Stack>
            </Box>
          )}
        </Paper>

        {/* Footer link */}
        {!success && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2.5 }}>
            Already have an account?{' '}
            <RouterLink
              to={USER_LOGIN_ROUTE}
              style={{ color: theme.palette.primary.main, fontWeight: 600, textDecoration: 'none' }}
            >
              Sign in
            </RouterLink>
          </Typography>
        )}
      </Box>
    </Box>
  );
}
