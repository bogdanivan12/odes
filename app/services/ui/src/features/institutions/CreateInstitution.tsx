import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../layout/PageContainer';
import { createInstitution } from '../../api/institutions';
import { INSTITUTIONS_ROUTE } from '../../config/routes';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

type FormValues = {
  name: string;
  weeks: string;
  days: string;
  timeslotsPerDay: string;
  maxTimeslotsPerDayPerGroup: string;
};

const initialValues: FormValues = {
  name: '',
  weeks: '2',
  days: '5',
  timeslotsPerDay: '12',
  maxTimeslotsPerDayPerGroup: '8',
};

export default function CreateInstitution() {
  const theme = useTheme();
  const [values, setValues] = useState<FormValues>(initialValues);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  const numericValues = useMemo(() => ({
    weeks: parseInt(values.weeks, 10),
    days: parseInt(values.days, 10),
    timeslotsPerDay: parseInt(values.timeslotsPerDay, 10),
    maxTimeslotsPerDayPerGroup: parseInt(values.maxTimeslotsPerDayPerGroup, 10),
  }), [values]);

  const validate = (): string | null => {
    if (!values.name.trim()) return 'Institution name is required.';
    if (!Number.isInteger(numericValues.weeks) || numericValues.weeks <= 0) return 'Weeks must be a positive integer.';
    if (!Number.isInteger(numericValues.days) || numericValues.days <= 0) return 'Days must be a positive integer.';
    if (!Number.isInteger(numericValues.timeslotsPerDay) || numericValues.timeslotsPerDay <= 0) return 'Timeslots/day must be a positive integer.';
    if (!Number.isInteger(numericValues.maxTimeslotsPerDayPerGroup) || numericValues.maxTimeslotsPerDayPerGroup <= 0) return 'Max timeslots/day/group must be a positive integer.';
    if (numericValues.maxTimeslotsPerDayPerGroup > numericValues.timeslotsPerDay) return 'Max timeslots/group cannot exceed timeslots per day.';
    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    try {
      const created = await createInstitution({
        name: values.name.trim(),
        time_grid_config: {
          weeks: numericValues.weeks,
          days: numericValues.days,
          timeslots_per_day: numericValues.timeslotsPerDay,
          max_timeslots_per_day_per_group: numericValues.maxTimeslotsPerDayPerGroup,
        },
      });
      try { localStorage.setItem('selectedInstitutionId', String(created.id)); } catch { /* ignore */ }
      try { window.dispatchEvent(new CustomEvent('institutionsChanged', { detail: { type: 'created', institutionId: created.id } })); } catch { /* ignore */ }
      setSuccess(`Institution "${created.name}" created.`);
      setValues(initialValues);
      setTimeout(() => { navigate(INSTITUTIONS_ROUTE); }, 600);
    } catch (err) {
      setError((err as Error).message || 'Failed to create institution.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer alignItems="flex-start">
      <Box sx={{ width: '100%', maxWidth: 680, mx: 'auto' }}>

        {/* Back link */}
        <Button
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => navigate(INSTITUTIONS_ROUTE)}
          sx={{ mb: 2.5, color: 'text.secondary', borderRadius: 2, '&:hover': { color: 'text.primary' } }}
        >
          Institutions
        </Button>

        <Paper
          variant="outlined"
          sx={{
            borderRadius: 4,
            overflow: 'hidden',
            boxShadow: `0 4px 24px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.3 : 0.06)}`,
          }}
        >
          {/* Accent bar */}
          <Box sx={{ height: 3, background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})` }} />

          <Box sx={{ p: { xs: 3, md: 4 } }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
              <Box
                sx={{
                  width: 40, height: 40, borderRadius: 2.5,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: 'primary.main',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <AccountBalanceRoundedIcon />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>New institution</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Set the institution name and configure the scheduling time grid.
            </Typography>

            <Divider sx={{ mb: 3 }} />

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Stack spacing={2.5}>
                <TextField
                  label="Institution name"
                  value={values.name}
                  onChange={(e) => setValues((prev) => ({ ...prev, name: e.target.value }))}
                  required
                  fullWidth
                  autoFocus
                  disabled={loading}
                  placeholder="e.g. Faculty of Computer Science"
                />

                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 1.5 }}>
                    Time grid configuration
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label="Week rotation"
                      type="number"
                      value={values.weeks}
                      onChange={(e) => setValues((prev) => ({ ...prev, weeks: e.target.value }))}
                      slotProps={{ htmlInput: { min: 1 } }}
                      required
                      fullWidth
                      disabled={loading}
                      helperText="Distinct week patterns"
                    />
                    <TextField
                      label="Days per week"
                      type="number"
                      value={values.days}
                      onChange={(e) => setValues((prev) => ({ ...prev, days: e.target.value }))}
                      slotProps={{ htmlInput: { min: 1 } }}
                      required
                      fullWidth
                      disabled={loading}
                    />
                  </Stack>
                </Box>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Timeslots per day"
                    type="number"
                    value={values.timeslotsPerDay}
                    onChange={(e) => setValues((prev) => ({ ...prev, timeslotsPerDay: e.target.value }))}
                    slotProps={{ htmlInput: { min: 1 } }}
                    required
                    fullWidth
                    disabled={loading}
                  />
                  <TextField
                    label="Max timeslots / group / day"
                    type="number"
                    value={values.maxTimeslotsPerDayPerGroup}
                    onChange={(e) => setValues((prev) => ({ ...prev, maxTimeslotsPerDayPerGroup: e.target.value }))}
                    slotProps={{ htmlInput: { min: 1 } }}
                    required
                    fullWidth
                    disabled={loading}
                    helperText="Cannot exceed timeslots per day"
                  />
                </Stack>

                {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ borderRadius: 2 }}>{success}</Alert>}

                <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ pt: 0.5 }}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate(INSTITUTIONS_ROUTE)}
                    disabled={loading}
                    sx={{ borderRadius: 2 }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading}
                    sx={{ borderRadius: 2 }}
                  >
                    {loading ? <CircularProgress size={20} color="inherit" /> : 'Create institution'}
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </Box>
        </Paper>
      </Box>
    </PageContainer>
  );
}
