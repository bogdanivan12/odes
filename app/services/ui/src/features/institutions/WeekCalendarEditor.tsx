import { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import type { CalendarWeekMapping } from '../../types/institution';
import { snapToWeekStart, weekRangeLabel, generateWeeks } from '../../utils/calendarWeeks';

interface Props {
  weeks: number;        // number of distinct week patterns in the rotation
  days: number;         // days per week (for the range label)
  startDay: number;     // 0 = Monday … 6 = Sunday
  value: CalendarWeekMapping[];
  onChange: (value: CalendarWeekMapping[]) => void;
  disabled?: boolean;
}

/**
 * Lets an admin map real calendar weeks to the rotation's week patterns.
 * Picking any date snaps to the start of that real week, so selecting a day
 * selects the whole week.  "Auto-fill" generates consecutive weeks cycling the
 * pattern (1, 2, 1, 2, …); individual weeks can then be re-assigned or removed.
 */
export default function WeekCalendarEditor({ weeks, days, startDay, value, onChange, disabled }: Props) {
  const [firstDate, setFirstDate] = useState('');
  const [count, setCount] = useState('14');
  const [addDate, setAddDate] = useState('');

  // Edit rows by index so a row stays put while its date is being changed.
  const handleAutoFill = () => {
    if (!firstDate) return;
    const n = Math.max(1, Math.min(60, Number(count) || 0));
    onChange(generateWeeks(firstDate, n, weeks, startDay));
  };

  const handleAddWeek = () => {
    if (!addDate) return;
    onChange([...value, { start_date: snapToWeekStart(addDate, startDay), week_number: 1 }]);
    setAddDate('');
  };

  const handleDate = (index: number, iso: string) => {
    if (!iso) return;
    const snapped = snapToWeekStart(iso, startDay);
    onChange(value.map((w, i) => (i === index ? { ...w, start_date: snapped } : w)));
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleWeekNumber = (index: number, weekNumber: number) => {
    onChange(value.map((w, i) => (i === index ? { ...w, week_number: weekNumber } : w)));
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: '0.875rem' }}>
        Calendar mapping {' '}
        <Typography component="span" variant="caption" color="text.secondary">
          (optional — needed for personal-calendar export)
        </Typography>
      </Typography>

      {/* Auto-fill */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'flex-end' }} sx={{ mb: 1.5 }}>
        <TextField
          type="date"
          label="First week"
          value={firstDate}
          onChange={(e) => setFirstDate(e.target.value)}
          disabled={disabled}
          size="small"
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          type="number"
          label="How many weeks"
          value={count}
          onChange={(e) => setCount(e.target.value)}
          disabled={disabled}
          size="small"
          slotProps={{ htmlInput: { min: 1, max: 60 } }}
          sx={{ width: { xs: '100%', sm: 160 } }}
        />
        <Button variant="outlined" onClick={handleAutoFill} disabled={disabled || !firstDate} sx={{ borderRadius: 2, whiteSpace: 'nowrap' }}>
          Auto-fill
        </Button>
      </Stack>

      {weeks > 1 && value.length > 0 && (
        <Alert severity="info" sx={{ borderRadius: 2, mb: 1.5, py: 0.25 }}>
          Auto-fill alternates patterns 1–{weeks}. Adjust any week below if your rotation differs.
        </Alert>
      )}

      {/* Mapped weeks list — each row's date is editable and shows the full week */}
      {value.length > 0 && (
        <Stack spacing={1} sx={{ mb: 1.5 }}>
          {value.map((w, i) => (
            <Stack key={i} direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} sx={{ pb: { xs: 1, sm: 0 }, borderBottom: { xs: '1px solid', sm: 'none' }, borderColor: 'divider' }}>
              <TextField
                type="date"
                label="Week start"
                value={w.start_date}
                onChange={(e) => handleDate(i, e.target.value)}
                disabled={disabled}
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ width: { xs: '100%', sm: 175 } }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ flex: 1, minWidth: 0 }}>
                {weekRangeLabel(w.start_date, days)}
              </Typography>
              <TextField
                select
                label="Pattern"
                value={String(w.week_number)}
                onChange={(e) => handleWeekNumber(i, Number(e.target.value))}
                disabled={disabled}
                size="small"
                sx={{ width: { xs: '100%', sm: 130 } }}
              >
                {Array.from({ length: Math.max(1, weeks) }, (_, n) => n + 1).map((n) => (
                  <MenuItem key={n} value={String(n)}>Week {n}</MenuItem>
                ))}
              </TextField>
              <IconButton onClick={() => handleRemove(i)} disabled={disabled} size="small" aria-label="Remove week">
                <DeleteOutlineRoundedIcon fontSize="small" />
              </IconButton>
            </Stack>
          ))}
        </Stack>
      )}

      {/* Add a single week */}
      <Stack direction="row" spacing={1.5} alignItems="flex-end">
        <TextField
          type="date"
          label="Add a week"
          value={addDate}
          onChange={(e) => setAddDate(e.target.value)}
          disabled={disabled}
          size="small"
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <Button startIcon={<AddRoundedIcon />} onClick={handleAddWeek} disabled={disabled || !addDate} sx={{ borderRadius: 2 }}>
          Add
        </Button>
      </Stack>
    </Box>
  );
}
