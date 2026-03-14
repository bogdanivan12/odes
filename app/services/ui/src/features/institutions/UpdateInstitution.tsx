import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import PageContainer from '../layout/PageContainer';
import { getInstitutionById } from '../../api/institutions';
import { institutionRoute, INSTITUTIONS_ROUTE } from '../../config/routes';
import { apiPut } from '../../utils/apiClient';
import { API_INSTITUTIONS_PATH, API_URL } from '../../config/constants';

type FormValues = {
  name: string;
  weeks: string;
  days: string;
  timeslotsPerDay: string;
  maxTimeslotsPerDayPerGroup: string;
};

function toPositiveInt(value: string): number {
  return Number.parseInt(value, 10);
}

function getAuthHeaders(): Record<string, string> {
  const authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  const headers: Record<string, string> = {};
  if (authToken) headers.Authorization = authToken;
  return headers;
}

async function updateInstitutionData(institutionId: string, payload: {
  name: string;
  time_grid_config: {
    weeks: number;
    days: number;
    timeslots_per_day: number;
    max_timeslots_per_day_per_group: number;
  };
}) {
  const res = await apiPut<any>(`${API_URL}${API_INSTITUTIONS_PATH}/${institutionId}`, payload, getAuthHeaders());
  return (res?.institution ?? res) as { name?: string };
}

export default function UpdateInstitution() {
  const { institutionId } = useParams();
  const navigate = useNavigate();

  const [values, setValues] = useState<FormValues>({
    name: '',
    weeks: '2',
    days: '5',
    timeslotsPerDay: '12',
    maxTimeslotsPerDayPerGroup: '8',
  });
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    if (!institutionId) {
      setLoadingInitial(false);
      setError('Missing institution id in route.');
      return () => {
        mounted = false;
      };
    }

    (async () => {
      setLoadingInitial(true);
      setError(null);
      try {
        const institution = await getInstitutionById(institutionId);
        if (!mounted) return;
        setValues({
          name: institution.name,
          weeks: String(institution.time_grid_config.weeks),
          days: String(institution.time_grid_config.days),
          timeslotsPerDay: String(institution.time_grid_config.timeslots_per_day),
          maxTimeslotsPerDayPerGroup: String(institution.time_grid_config.max_timeslots_per_day_per_group),
        });
      } catch (err) {
        if (!mounted) return;
        setError((err as Error).message || 'Failed to load institution.');
      } finally {
        if (mounted) setLoadingInitial(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [institutionId]);

  const numericValues = useMemo(() => ({
    weeks: toPositiveInt(values.weeks),
    days: toPositiveInt(values.days),
    timeslotsPerDay: toPositiveInt(values.timeslotsPerDay),
    maxTimeslotsPerDayPerGroup: toPositiveInt(values.maxTimeslotsPerDayPerGroup),
  }), [values]);

  const validate = (): string | null => {
    if (!values.name.trim()) return 'Institution name is required.';
    if (!Number.isInteger(numericValues.weeks) || numericValues.weeks <= 0) return 'Different weeks must be a positive integer.';
    if (!Number.isInteger(numericValues.days) || numericValues.days <= 0) return 'Days per week must be a positive integer.';
    if (!Number.isInteger(numericValues.timeslotsPerDay) || numericValues.timeslotsPerDay <= 0) return 'Timeslots per day must be a positive integer.';
    if (!Number.isInteger(numericValues.maxTimeslotsPerDayPerGroup) || numericValues.maxTimeslotsPerDayPerGroup <= 0) {
      return 'Max timeslots per day per group must be a positive integer.';
    }
    if (numericValues.maxTimeslotsPerDayPerGroup > numericValues.timeslotsPerDay) {
      return 'Max timeslots per day per group cannot exceed timeslots per day.';
    }
    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!institutionId) {
      setError('Missing institution id in route.');
      return;
    }

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const updated = await updateInstitutionData(institutionId, {
        name: values.name.trim(),
        time_grid_config: {
          weeks: numericValues.weeks,
          days: numericValues.days,
          timeslots_per_day: numericValues.timeslotsPerDay,
          max_timeslots_per_day_per_group: numericValues.maxTimeslotsPerDayPerGroup,
        },
      });

      setSuccess(`Institution "${updated.name ?? values.name.trim()}" updated successfully.`);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('institutionsChanged'));
      }
      setTimeout(() => {
        navigate(institutionRoute(institutionId));
      }, 500);
    } catch (err) {
      setError((err as Error).message || 'Failed to update institution.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingInitial) {
    return (
      <PageContainer alignItems="center">
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={24} />
          <Typography>Loading institution...</Typography>
        </Stack>
      </PageContainer>
    );
  }

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
            Update Institution
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
                  slotProps={{ htmlInput: { min: 1 } }}
                  required
                  fullWidth
                />
                <TextField
                  label="Days per week"
                  type="number"
                  value={values.days}
                  onChange={(e) => setValues((prev) => ({ ...prev, days: e.target.value }))}
                  slotProps={{ htmlInput: { min: 1 } }}
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
                  slotProps={{ htmlInput: { min: 1 } }}
                  required
                  fullWidth
                />
                <TextField
                  label="Max timeslots per day per group"
                  type="number"
                  value={values.maxTimeslotsPerDayPerGroup}
                  onChange={(e) => setValues((prev) => ({ ...prev, maxTimeslotsPerDayPerGroup: e.target.value }))}
                  slotProps={{ htmlInput: { min: 1 } }}
                  required
                  fullWidth
                />
              </Stack>

              {error && <Alert severity="error">{error}</Alert>}
              {success && <Alert severity="success">{success}</Alert>}

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  onClick={() => navigate(institutionId ? institutionRoute(institutionId) : INSTITUTIONS_ROUTE)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="contained" disabled={loading}>
                  {loading ? <CircularProgress size={20} color="inherit" /> : 'Save changes'}
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Paper>
      </Box>
    </PageContainer>
  );
}

