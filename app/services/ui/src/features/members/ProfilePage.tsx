import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import PageContainer from '../layout/PageContainer';
import { getCurrentUserProfile, updateCurrentUserProfile } from '../../api/users';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

function getInitials(name?: string): string {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function ProfilePage() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const me = await getCurrentUserProfile();
        if (!mounted) return;
        setName(me.name ?? '');
        setEmail(me.email ?? '');
      } catch (err) {
        if (!mounted) return;
        setError((err as Error).message || 'Failed to load profile.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) { setError('Name is required.'); return; }
    if (!trimmedEmail) { setError('Email is required.'); return; }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await updateCurrentUserProfile({
        name: trimmedName,
        email: trimmedEmail,
        ...(password.trim() ? { password: password.trim() } : {}),
      });
      setName(updated.name ?? trimmedName);
      setEmail(updated.email ?? trimmedEmail);
      setPassword('');
      setSuccess('Profile updated successfully.');
    } catch (err) {
      setError((err as Error).message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageContainer alignItems="center">
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={22} />
          <Typography color="text.secondary">Loading profile...</Typography>
        </Stack>
      </PageContainer>
    );
  }

  return (
    <PageContainer alignItems="flex-start">
      <Box sx={{ width: '100%', maxWidth: 680, mx: 'auto' }}>
        <Stack spacing={3}>

          {/* Header card */}
          <Paper
            variant="outlined"
            sx={{
              borderRadius: 4,
              overflow: 'hidden',
              boxShadow: `0 4px 24px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.3 : 0.06)}`,
            }}
          >
            <Box sx={{ height: 3, background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})` }} />
            <Box sx={{ p: { xs: 3, md: 4 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                <Avatar
                  sx={{
                    width: 64, height: 64, borderRadius: 3,
                    bgcolor: alpha(theme.palette.primary.main, 0.12),
                    color: 'primary.main',
                    fontSize: '1.4rem',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {getInitials(name)}
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                    {name || 'Your profile'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {email || 'No email set'}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Paper>

          {/* Edit form card */}
          <Paper
            variant="outlined"
            sx={{
              borderRadius: 4,
              overflow: 'hidden',
              boxShadow: `0 4px 24px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.3 : 0.06)}`,
            }}
          >
            <Box sx={{ p: { xs: 3, md: 4 } }}>
              {/* Section header */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
                <Box
                  sx={{
                    width: 40, height: 40, borderRadius: 2.5,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: 'primary.main',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <PersonRoundedIcon />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Account details</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Update your name, email address, or password.
              </Typography>

              <Divider sx={{ mb: 3 }} />

              <Stack spacing={2.5}>
                <TextField
                  label="Full name"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setSuccess(null); }}
                  fullWidth
                  disabled={saving}
                  autoComplete="name"
                />

                <TextField
                  label="Email address"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setSuccess(null); }}
                  fullWidth
                  disabled={saving}
                  autoComplete="email"
                />

                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 1.5 }}>
                    Change password
                  </Typography>
                  <TextField
                    label="New password"
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setSuccess(null); }}
                    fullWidth
                    disabled={saving}
                    placeholder="Leave empty to keep current password"
                    autoComplete="new-password"
                    helperText="Only fill in if you want to change your password"
                  />
                </Box>

                {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ borderRadius: 2 }}>{success}</Alert>}

                <Stack direction="row" justifyContent="flex-end" sx={{ pt: 0.5 }}>
                  <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={saving}
                    sx={{ borderRadius: 2 }}
                  >
                    {saving ? <CircularProgress size={20} color="inherit" /> : 'Save changes'}
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </Paper>

        </Stack>
      </Box>
    </PageContainer>
  );
}
