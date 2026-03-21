import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import PersonIcon from '@mui/icons-material/Person';
import MailIcon from '@mui/icons-material/Mail';
import LockIcon from '@mui/icons-material/Lock';
import Grid from '@mui/material/Grid';
import PageContainer from '../layout/PageContainer';
import EntityStatCard from '../../components/EntityStatCard';
import { getCurrentUserProfile, updateCurrentUserProfile } from '../../api/users';

export default function ProfilePage() {
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

    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setError('Name is required.');
      return;
    }
    if (!trimmedEmail) {
      setError('Email is required.');
      return;
    }

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
          <CircularProgress size={24} />
          <Typography>Loading profile...</Typography>
        </Stack>
      </PageContainer>
    );
  }

  return (
    <PageContainer alignItems="flex-start">
      <Stack spacing={2.5} sx={{ width: '100%' }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, md: 3 },
            borderRadius: 4,
            border: '1px solid',
            borderColor: 'divider',
            background: 'linear-gradient(120deg, rgba(33,150,243,0.16) 0%, rgba(33,203,243,0.08) 45%, rgba(0,0,0,0) 100%)',
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 800 }}>My profile</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.6 }}>
            Manage your account details.
          </Typography>
        </Paper>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <EntityStatCard icon={<PersonIcon fontSize="small" />} label="Name" value={name || 'Not set'} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <EntityStatCard icon={<MailIcon fontSize="small" />} label="Email" value={email || 'Not set'} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <EntityStatCard icon={<LockIcon fontSize="small" />} label="Password" value="Set" />
          </Grid>
        </Grid>

        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}

            <TextField
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              disabled={saving}
            />

            <TextField
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              disabled={saving}
            />

            <TextField
              label="New password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              disabled={saving}
              placeholder="Leave empty to keep current password"
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="contained" onClick={handleSave} disabled={saving}>
                {saving ? <CircularProgress size={18} color="inherit" /> : 'Save changes'}
              </Button>
            </Box>
          </Stack>
        </Paper>
      </Stack>
    </PageContainer>
  );
}

