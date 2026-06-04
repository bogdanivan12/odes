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
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../../api/auth.ts';
import { USER_LOGIN_ROUTE } from '../../config/routes.ts';
import { useTheme, alpha } from '@mui/material/styles';

const MIN_PASSWORD_LENGTH = 8;

export function ResetPassword() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const password = (form.get('password') as string) || '';
    const confirm = (form.get('confirmPassword') as string) || '';

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate(USER_LOGIN_ROUTE, { replace: true }), 2500);
    } catch (err) {
      setError((err as Error).message || 'Could not reset your password.');
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
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Choose a new password</Typography>
        </Box>

        <Paper
          variant="outlined"
          sx={{
            p: { xs: 3, sm: 4 }, borderRadius: 4,
            boxShadow: `0 8px 40px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.4 : 0.08)}`,
          }}
        >
          {!token ? (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              This reset link is invalid or incomplete. Please request a new one.
            </Alert>
          ) : done ? (
            <Box sx={{ textAlign: 'center', py: 1 }}>
              <CheckCircleRoundedIcon sx={{ fontSize: '2.5rem', color: 'success.main', mb: 1 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>Password updated</Typography>
              <Typography variant="body2" color="text.secondary">
                Redirecting you to sign in…
              </Typography>
            </Box>
          ) : (
            <Box component="form" noValidate onSubmit={handleSubmit}>
              <Stack spacing={2.5}>
                <TextField
                  required fullWidth name="password" label="New password" type="password"
                  id="password" autoComplete="new-password" autoFocus disabled={loading}
                  helperText={`At least ${MIN_PASSWORD_LENGTH} characters`}
                />
                <TextField
                  required fullWidth name="confirmPassword" label="Confirm new password" type="password"
                  id="confirmPassword" autoComplete="new-password" disabled={loading}
                />
                {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}
                <Button
                  type="submit" fullWidth variant="contained" size="large" disabled={loading}
                  sx={{ borderRadius: 2, py: 1.25, mt: 0.5 }}
                >
                  {loading ? <CircularProgress size={22} color="inherit" /> : 'Reset password'}
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
