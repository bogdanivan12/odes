import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import MarkEmailReadRoundedIcon from '@mui/icons-material/MarkEmailReadRounded';
import { Link as RouterLink } from 'react-router-dom';
import { forgotPassword } from '../../api/auth.ts';
import { USER_LOGIN_ROUTE } from '../../config/routes.ts';
import { useTheme, alpha } from '@mui/material/styles';

export function ForgotPassword() {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const email = ((new FormData(e.currentTarget).get('email') as string) || '').trim();
    if (!email) { setError('Please enter your email address.'); return; }

    setLoading(true);
    try {
      await forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      // The endpoint doesn't reveal whether the email exists; only surface real
      // (e.g. network) failures.
      setError((err as Error).message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        width: '100%', minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default',
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
                fontWeight: 800, fontSize: '1.5rem', letterSpacing: '0.08em',
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}
            >
              ODES
            </Typography>
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Forgot your password?</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, textAlign: 'center' }}>
            Enter your email and we'll send you a reset link
          </Typography>
        </Box>

        <Paper
          variant="outlined"
          sx={{
            p: { xs: 3, sm: 4 }, borderRadius: 4,
            boxShadow: `0 8px 40px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.4 : 0.08)}`,
          }}
        >
          {submitted ? (
            <Box sx={{ textAlign: 'center', py: 1 }}>
              <MarkEmailReadRoundedIcon sx={{ fontSize: '2.5rem', color: 'primary.main', mb: 1 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>Check your inbox</Typography>
              <Typography variant="body2" color="text.secondary">
                If an account exists for that email, a password-reset link is on its way.
                The link expires in 30 minutes.
              </Typography>
            </Box>
          ) : (
            <Box component="form" noValidate onSubmit={handleSubmit}>
              <Stack spacing={2.5}>
                <TextField
                  required fullWidth id="email" label="Email address" name="email"
                  autoComplete="email" autoFocus disabled={loading}
                />
                {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}
                <Button
                  type="submit" fullWidth variant="contained" size="large" disabled={loading}
                  sx={{ borderRadius: 2, py: 1.25, mt: 0.5 }}
                >
                  {loading ? <CircularProgress size={22} color="inherit" /> : 'Send reset link'}
                </Button>
              </Stack>
            </Box>
          )}
        </Paper>

        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2.5 }}>
          <RouterLink
            to={USER_LOGIN_ROUTE}
            style={{ color: theme.palette.primary.main, fontWeight: 600, textDecoration: 'none' }}
          >
            Back to sign in
          </RouterLink>
        </Typography>
      </Box>
    </Box>
  );
}
