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
import { useNavigate } from 'react-router-dom';
import PageContainer from '../layout/PageContainer';
import { createInstitution } from '../../api/institutions';
import { INSTITUTIONS_ROUTE } from '../../config/routes';

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

function toPositiveInt(value: string): number {
  return Number.parseInt(value, 10);
}

export default function CreateInstitution() {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  const numericValues = useMemo(() => ({
    weeks: toPositiveInt(values.weeks),
    days: toPositiveInt(values.days),
    timeslotsPerDay: toPositiveInt(values.timeslotsPerDay),
    maxTimeslotsPerDayPerGroup: toPositiveInt(values.maxTimeslotsPerDayPerGroup),
  }), [values]);

  const validate = (): string | null => {
    if (!values.name.trim()) return 'Institution name is required.';
    if (!Number.isInteger(numericValues.weeks) || numericValues.weeks <= 0) return 'Weeks must be a positive integer.';
    if (!Number.isInteger(numericValues.days) || numericValues.days <= 0) return 'Days must be a positive integer.';
    if (!Number.isInteger(numericValues.timeslotsPerDay) || numericValues.timeslotsPerDay <= 0) return 'Timeslots/day must be a positive integer.';
    if (!Number.isInteger(numericValues.maxTimeslotsPerDayPerGroup) || numericValues.maxTimeslotsPerDayPerGroup <= 0) {
      return 'Max timeslots/day/group must be a positive integer.';
    }
    if (numericValues.maxTimeslotsPerDayPerGroup > numericValues.timeslotsPerDay) {
      return 'Max timeslots/day/group cannot exceed timeslots/day.';
    }
    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

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

      try {
        localStorage.setItem('selectedInstitutionId', String(created.id));
      } catch (e) {
        // Ignore localStorage restrictions in private browsers.
      }

      setSuccess(`Institution "${created.name}" created successfully.`);
      setValues(initialValues);

      setTimeout(() => {
        navigate(INSTITUTIONS_ROUTE);
      }, 600);
    } catch (err) {
      setError((err as Error).message || 'Failed to create institution.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer alignItems="flex-start">
      <Box sx={{ width: '100%', maxWidth: 760, mx: 'auto' }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: 4,
            border: '1px solid',
            borderColor: 'divider',
            background: 'linear-gradient(180deg, rgba(33,150,243,0.08) 0%, rgba(33,203,243,0.04) 30%, rgba(0,0,0,0) 100%)',
            backdropFilter: 'blur(2px)',
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Create Institution
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Set the institution name and its scheduling time grid.
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
              />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Different weeks"
                  type="number"
                  value={values.weeks}
                  onChange={(e) => setValues((prev) => ({ ...prev, weeks: e.target.value }))}
                  inputProps={{ min: 1 }}
                  required
                  fullWidth
                />
                <TextField
                  label="Days per week"
                  type="number"
                  value={values.days}
                  onChange={(e) => setValues((prev) => ({ ...prev, days: e.target.value }))}
                  inputProps={{ min: 1 }}
                  required
                  fullWidth
                />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Timeslots per day"
                  type="number"
                  value={values.timeslotsPerDay}
                  onChange={(e) => setValues((prev) => ({ ...prev, timeslotsPerDay: e.target.value }))}
                  inputProps={{ min: 1 }}
                  required
                  fullWidth
                />
                <TextField
                  label="Max timeslots per day per group"
                  type="number"
                  value={values.maxTimeslotsPerDayPerGroup}
                  onChange={(e) => setValues((prev) => ({ ...prev, maxTimeslotsPerDayPerGroup: e.target.value }))}
                  inputProps={{ min: 1 }}
                  required
                  fullWidth
                />
              </Stack>

              {error && <Alert severity="error">{error}</Alert>}
              {success && <Alert severity="success">{success}</Alert>}

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="flex-end">
                <Button variant="outlined" onClick={() => navigate(INSTITUTIONS_ROUTE)} disabled={loading}>
                  Cancel
                </Button>
                <Button type="submit" variant="contained" disabled={loading}>
                  {loading ? <CircularProgress size={20} color="inherit" /> : 'Create institution'}
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Paper>
      </Box>
    </PageContainer>
  );
}


