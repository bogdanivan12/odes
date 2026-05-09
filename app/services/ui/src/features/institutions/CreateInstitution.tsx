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
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import Chip from '@mui/material/Chip';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../layout/PageContainer';
import { createInstitution } from '../../api/institutions';
import { INSTITUTIONS_ROUTE } from '../../config/routes';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

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

// ─── Form ─────────────────────────────────────────────────────────────────────

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

const initialValues: FormValues = {
  name: '',
  weeks: '2',
  scheduleType: '5',
  startHour: '8',
  startMinute: '0',
  endHour: '20',
  endMinute: '0',
  slotDuration: '60',
  maxTimeslotsPerDayPerGroup: '8',
};

function fmtTime(hour: string, minute: string) {
  return `${String(parseInt(hour) || 0).padStart(2, '0')}:${String(parseInt(minute) || 0).padStart(2, '0')}`;
}

export default function CreateInstitution() {
  const theme = useTheme();
  const [values, setValues] = useState<FormValues>(initialValues);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

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

    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    const { days, startDay } = SCHEDULE_TYPE_CONFIG[values.scheduleType];
    setLoading(true);
    try {
      const created = await createInstitution({
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
          <Box sx={{ height: 3, background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})` }} />

          <Box sx={{ p: { xs: 3, md: 4 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
              <Box sx={{ width: 40, height: 40, borderRadius: 2.5, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                  required fullWidth autoFocus disabled={loading}
                  placeholder="e.g. Faculty of Computer Science"
                />

                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 1.5 }}>
                    Time grid configuration
                  </Typography>
                  <Stack spacing={2}>

                    <TextField
                      label="Week rotation"
                      type="number"
                      value={values.weeks}
                      onChange={(e) => setValues((prev) => ({ ...prev, weeks: e.target.value }))}
                      slotProps={{ htmlInput: { min: 1 } }}
                      required fullWidth disabled={loading}
                      helperText="Distinct week patterns (e.g. 2 for alternating weeks)"
                    />

                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: '0.875rem' }}>
                        Days per week
                      </Typography>
                      <ToggleButtonGroup
                        value={values.scheduleType}
                        exclusive
                        onChange={(_, v) => { if (v) setValues((prev) => ({ ...prev, scheduleType: v as ScheduleType })); }}
                        disabled={loading}
                        size="small"
                        sx={{ '& .MuiToggleButton-root': { borderRadius: 2, px: 2 } }}
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
                        hour={values.startHour}
                        minute={values.startMinute}
                        onHourChange={(h) => setValues((prev) => ({ ...prev, startHour: h }))}
                        onMinuteChange={(m) => setValues((prev) => ({ ...prev, startMinute: m }))}
                        disabled={loading}
                      />
                      <TimePicker
                        label="End time"
                        hour={values.endHour}
                        minute={values.endMinute}
                        onHourChange={(h) => setValues((prev) => ({ ...prev, endHour: h }))}
                        onMinuteChange={(m) => setValues((prev) => ({ ...prev, endMinute: m }))}
                        disabled={loading}
                      />
                    </Stack>

                    {/* Slot duration */}
                    <FormControl fullWidth disabled={loading}>
                      <InputLabel>Slot duration</InputLabel>
                      <Select
                        value={values.slotDuration}
                        label="Slot duration"
                        onChange={(e) => setValues((prev) => ({ ...prev, slotDuration: e.target.value as string }))}
                        sx={{ borderRadius: 2 }}
                      >
                        {SLOT_DURATION_OPTIONS.map(({ value, label }) => (
                          <MenuItem key={value} value={String(value)}>{label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {/* Computed result */}
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
                      label="Max timeslots / group / day"
                      type="number"
                      value={values.maxTimeslotsPerDayPerGroup}
                      onChange={(e) => setValues((prev) => ({ ...prev, maxTimeslotsPerDayPerGroup: e.target.value }))}
                      slotProps={{ htmlInput: { min: 1 } }}
                      required fullWidth disabled={loading}
                      helperText={timeslotsPerDay > 0 ? `Cannot exceed ${timeslotsPerDay} timeslots per day` : undefined}
                    />
                  </Stack>
                </Box>

                {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ borderRadius: 2 }}>{success}</Alert>}

                <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ pt: 0.5 }}>
                  <Button variant="outlined" onClick={() => navigate(INSTITUTIONS_ROUTE)} disabled={loading} sx={{ borderRadius: 2 }}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="contained" disabled={loading} sx={{ borderRadius: 2 }}>
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
