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
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import Chip from '@mui/material/Chip';
import PageContainer from '../layout/PageContainer';
import { getInstitutionById } from '../../api/institutions';
import { institutionRoute, INSTITUTIONS_ROUTE } from '../../config/routes';
import { apiPut } from '../../utils/apiClient';
import { API_INSTITUTIONS_PATH, API_URL } from '../../config/constants';

type ScheduleType = '2' | '5' | '7';
const SCHEDULE_TYPE_CONFIG: Record<ScheduleType, { days: number; startDay: number }> = {
  '2': { days: 2, startDay: 5 },
  '5': { days: 5, startDay: 0 },
  '7': { days: 7, startDay: 0 },
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

const SLOT_DURATION_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 20, label: '20 min' },
  { value: 25, label: '25 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 50, label: '50 min' },
  { value: 60, label: '1 h' },
  { value: 75, label: '1 h 15 min' },
  { value: 90, label: '1 h 30 min' },
  { value: 100, label: '1 h 40 min' },
  { value: 120, label: '2 h' },
];

// ─── Time picker ──────────────────────────────────────────────────────────────

function TimePicker({
  label,
  hour,
  minute,
  onHourChange,
  onMinuteChange,
  disabled,
}: {
  label: string;
  hour: string;
  minute: string;
  onHourChange: (h: string) => void;
  onMinuteChange: (m: string) => void;
  disabled?: boolean;
}) {
  return (
    <Box sx={{ flex: 1 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75, fontSize: '0.8rem' }}>
        {label}
      </Typography>
      <Stack direction="row" spacing={0.5} alignItems="center">
        <FormControl size="small" disabled={disabled} sx={{ flex: 1 }}>
          <InputLabel sx={{ fontSize: '0.8rem' }}>hh</InputLabel>
          <Select
            value={hour}
            label="hh"
            onChange={(e) => onHourChange(e.target.value as string)}
            sx={{ borderRadius: 2, fontSize: '0.9rem' }}
          >
            {HOURS.map((h) => (
              <MenuItem key={h} value={String(h)} sx={{ fontSize: '0.875rem' }}>
                {String(h).padStart(2, '0')}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography sx={{ fontWeight: 700, color: 'text.secondary', userSelect: 'none' }}>:</Typography>
        <FormControl size="small" disabled={disabled} sx={{ flex: 1 }}>
          <InputLabel sx={{ fontSize: '0.8rem' }}>mm</InputLabel>
          <Select
            value={minute}
            label="mm"
            onChange={(e) => onMinuteChange(e.target.value as string)}
            sx={{ borderRadius: 2, fontSize: '0.9rem' }}
          >
            {MINUTES.map((m) => (
              <MenuItem key={m} value={String(m)} sx={{ fontSize: '0.875rem' }}>
                {String(m).padStart(2, '0')}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
    </Box>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type FormValues = {
  name: string;
  weeks: string;
  scheduleType: ScheduleType;
  startHour: string;
  startMinute: string;
  endHour: string;
  endMinute: string;
  slotDuration: string;
  maxTimeslotsPerDayPerGroup: string;
};

function getAuthHeaders(): Record<string, string> {
  const authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  const headers: Record<string, string> = {};
  if (authToken) headers.Authorization = authToken;
  return headers;
}

async function updateInstitutionData(institutionId: string, payload: {
  name: string;
  time_grid_config: {
    weeks: number; days: number; timeslots_per_day: number;
    max_timeslots_per_day_per_group: number; start_hour: number; start_minute: number;
    timeslot_duration_minutes: number; start_day: number;
  };
}) {
  const res = await apiPut<any>(`${API_URL}${API_INSTITUTIONS_PATH}/${institutionId}`, payload, getAuthHeaders());
  return (res?.institution ?? res) as { name?: string };
}

function nearestSlotDuration(value: number): number {
  return SLOT_DURATION_OPTIONS.reduce((prev, curr) =>
    Math.abs(curr.value - value) < Math.abs(prev.value - value) ? curr : prev
  ).value;
}

function nearestMinute(value: number): number {
  return MINUTES.reduce((prev, curr) =>
    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
  );
}

function fmtTime(hour: string, minute: string) {
  return `${String(parseInt(hour) || 0).padStart(2, '0')}:${String(parseInt(minute) || 0).padStart(2, '0')}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function UpdateInstitution() {
  const { institutionId } = useParams();
  const navigate = useNavigate();

  const [values, setValues] = useState<FormValues>({
    name: '', weeks: '2', scheduleType: '5',
    startHour: '8', startMinute: '0', endHour: '20', endMinute: '0',
    slotDuration: '60', maxTimeslotsPerDayPerGroup: '8',
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
      return () => { mounted = false; };
    }
    (async () => {
      setLoadingInitial(true);
      setError(null);
      try {
        const institution = await getInstitutionById(institutionId);
        if (!mounted) return;
        const tgc = institution.time_grid_config;
        const startHour = tgc.start_hour ?? 8;
        const startMinute = nearestMinute(tgc.start_minute ?? 0);
        const slotDuration = nearestSlotDuration(tgc.timeslot_duration_minutes ?? 60);
        const startDay = tgc.start_day ?? 0;

        let scheduleType: ScheduleType = '5';
        if (startDay >= 5) scheduleType = '2';
        else if (tgc.days >= 7) scheduleType = '7';

        // Compute end time from start + timeslots * duration
        const startTotalMins = startHour * 60 + startMinute;
        const endTotalMins = startTotalMins + tgc.timeslots_per_day * slotDuration;
        const endHour = Math.floor(endTotalMins / 60);
        const endMinute = nearestMinute(endTotalMins % 60);

        setValues({
          name: institution.name,
          weeks: String(tgc.weeks),
          scheduleType,
          startHour: String(startHour),
          startMinute: String(startMinute),
          endHour: String(endHour),
          endMinute: String(endMinute),
          slotDuration: String(slotDuration),
          maxTimeslotsPerDayPerGroup: String(tgc.max_timeslots_per_day_per_group),
        });
      } catch (err) {
        if (!mounted) return;
        setError((err as Error).message || 'Failed to load institution.');
      } finally {
        if (mounted) setLoadingInitial(false);
      }
    })();
    return () => { mounted = false; };
  }, [institutionId]);

  const timeslotsPerDay = useMemo(() => {
    const startMins = parseInt(values.startHour) * 60 + parseInt(values.startMinute || '0');
    const endMins = parseInt(values.endHour) * 60 + parseInt(values.endMinute || '0');
    const sd = parseInt(values.slotDuration);
    if (isNaN(startMins) || isNaN(endMins) || isNaN(sd) || sd <= 0 || endMins <= startMins) return 0;
    return Math.floor((endMins - startMins) / sd);
  }, [values.startHour, values.startMinute, values.endHour, values.endMinute, values.slotDuration]);

  const validate = (): string | null => {
    if (!values.name.trim()) return 'Institution name is required.';
    const weeks = parseInt(values.weeks, 10);
    if (!Number.isInteger(weeks) || weeks <= 0) return 'Weeks must be a positive integer.';
    if (timeslotsPerDay <= 0) return 'End time must be after start time.';
    const maxTpd = parseInt(values.maxTimeslotsPerDayPerGroup, 10);
    if (!Number.isInteger(maxTpd) || maxTpd <= 0) return 'Max timeslots/group must be a positive integer.';
    if (maxTpd > timeslotsPerDay) return 'Max timeslots/group cannot exceed timeslots per day.';
    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    if (!institutionId) { setError('Missing institution id in route.'); return; }
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    const { days, startDay } = SCHEDULE_TYPE_CONFIG[values.scheduleType];
    setLoading(true);
    try {
      const updated = await updateInstitutionData(institutionId, {
        name: values.name.trim(),
        time_grid_config: {
          weeks: parseInt(values.weeks, 10),
          days,
          timeslots_per_day: timeslotsPerDay,
          max_timeslots_per_day_per_group: parseInt(values.maxTimeslotsPerDayPerGroup, 10),
          start_hour: parseInt(values.startHour, 10),
          start_minute: parseInt(values.startMinute || '0', 10),
          timeslot_duration_minutes: parseInt(values.slotDuration, 10),
          start_day: startDay,
        },
      });
      setSuccess(`Institution "${updated.name ?? values.name.trim()}" updated successfully.`);
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('institutionsChanged'));
      setTimeout(() => { navigate(institutionRoute(institutionId)); }, 500);
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
      <Box sx={{ width: '100%', maxWidth: 680, mx: 'auto' }}>
        <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, border: '1px solid', borderColor: 'divider', background: 'linear-gradient(180deg, rgba(33,150,243,0.08) 0%, rgba(33,203,243,0.04) 30%, rgba(0,0,0,0) 100%)', backdropFilter: 'blur(2px)' }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>Update Institution</Typography>
          <Divider sx={{ mb: 3 }} />

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2.5}>
              <TextField
                label="Institution name" value={values.name}
                onChange={(e) => setValues((prev) => ({ ...prev, name: e.target.value }))}
                required fullWidth
              />

              <TextField
                label="Week rotation" type="number" value={values.weeks}
                onChange={(e) => setValues((prev) => ({ ...prev, weeks: e.target.value }))}
                slotProps={{ htmlInput: { min: 1 } }} required fullWidth
                helperText="Distinct week patterns"
              />

              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: '0.875rem' }}>
                  Days per week
                </Typography>
                <ToggleButtonGroup
                  value={values.scheduleType} exclusive
                  onChange={(_, v) => { if (v) setValues((prev) => ({ ...prev, scheduleType: v as ScheduleType })); }}
                  size="small" sx={{ '& .MuiToggleButton-root': { borderRadius: 2, px: 2 } }}
                >
                  <ToggleButton value="2">2 days (Weekend)</ToggleButton>
                  <ToggleButton value="5">5 days (Mon–Fri)</ToggleButton>
                  <ToggleButton value="7">7 days (Full week)</ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {/* Start + End time */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TimePicker
                  label="Start time"
                  hour={values.startHour} minute={values.startMinute}
                  onHourChange={(h) => setValues((prev) => ({ ...prev, startHour: h }))}
                  onMinuteChange={(m) => setValues((prev) => ({ ...prev, startMinute: m }))}
                />
                <TimePicker
                  label="End time"
                  hour={values.endHour} minute={values.endMinute}
                  onHourChange={(h) => setValues((prev) => ({ ...prev, endHour: h }))}
                  onMinuteChange={(m) => setValues((prev) => ({ ...prev, endMinute: m }))}
                />
              </Stack>

              <FormControl fullWidth>
                <InputLabel>Slot duration</InputLabel>
                <Select
                  value={values.slotDuration} label="Slot duration"
                  onChange={(e) => setValues((prev) => ({ ...prev, slotDuration: e.target.value as string }))}
                  sx={{ borderRadius: 2 }}
                >
                  {SLOT_DURATION_OPTIONS.map(({ value, label }) => (
                    <MenuItem key={value} value={String(value)}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Chip
                  label={timeslotsPerDay > 0 ? `${timeslotsPerDay} timeslots per day` : 'Invalid range'}
                  color={timeslotsPerDay > 0 ? 'primary' : 'error'}
                  variant="outlined" size="small" sx={{ borderRadius: 1.5 }}
                />
                {timeslotsPerDay > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    ({fmtTime(values.startHour, values.startMinute)} – {fmtTime(values.endHour, values.endMinute)}, {SLOT_DURATION_OPTIONS.find((o) => o.value === parseInt(values.slotDuration))?.label ?? `${values.slotDuration} min`} each)
                  </Typography>
                )}
              </Box>

              <TextField
                label="Max timeslots / group / day" type="number"
                value={values.maxTimeslotsPerDayPerGroup}
                onChange={(e) => setValues((prev) => ({ ...prev, maxTimeslotsPerDayPerGroup: e.target.value }))}
                slotProps={{ htmlInput: { min: 1 } }} required fullWidth
                helperText={timeslotsPerDay > 0 ? `Cannot exceed ${timeslotsPerDay} timeslots per day` : undefined}
              />

              {error && <Alert severity="error">{error}</Alert>}
              {success && <Alert severity="success">{success}</Alert>}

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="flex-end">
                <Button variant="outlined" onClick={() => navigate(institutionId ? institutionRoute(institutionId) : INSTITUTIONS_ROUTE)} disabled={loading}>
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
