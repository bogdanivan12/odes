import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import type { TimeGridConfig } from '../../types/institution';
import type { ActivitySelectedTimeslot } from '../../types/activity';
import { dayLabel, slotTimeLabel, validStartSlots } from '../../utils/timeslot';

interface Props {
  timeGrid: TimeGridConfig | null;
  durationSlots: number;
  value: ActivitySelectedTimeslot | null;
  onChange: (value: ActivitySelectedTimeslot | null) => void;
  disabled?: boolean;
}

/**
 * Optional "pin this activity to a fixed timeslot" control.  Shows a day + start
 * time picker (the time is derived from the institution's grid config, so it
 * reads as "Monday 12:00 – 14:00", not a raw slot number).  The week pattern is
 * governed by the activity's frequency, so weeks are not surfaced here - the
 * value always spans every week.
 */
export default function PinnedTimeslotField({ timeGrid, durationSlots, value, onChange, disabled }: Props) {
  if (!timeGrid) return null;

  const tpd = timeGrid.timeslots_per_day;
  const dur = Math.max(1, durationSlots || 1);
  const slots = validStartSlots(timeGrid, durationSlots);
  const allWeeks = Array.from({ length: timeGrid.weeks }, (_, i) => i);

  const enabled = value !== null;
  const day = value ? Math.floor(value.start_timeslot / tpd) : 0;
  const slot = value ? value.start_timeslot % tpd : (slots[0] ?? 0);

  const emit = (d: number, s: number) => onChange({ start_timeslot: d * tpd + s, active_weeks: allWeeks });

  return (
    <>
      <FormControlLabel
        control={
          <Checkbox
            checked={enabled}
            disabled={disabled}
            onChange={(e) => (e.target.checked ? emit(0, slots[0] ?? 0) : onChange(null))}
          />
        }
        label="Pin to a specific timeslot"
      />
      {enabled && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            select
            label="Day"
            value={String(day)}
            disabled={disabled}
            onChange={(e) => emit(Number(e.target.value), slots.includes(slot) ? slot : (slots[0] ?? 0))}
            fullWidth
          >
            {Array.from({ length: timeGrid.days }, (_, d) => (
              <MenuItem key={d} value={String(d)}>{dayLabel(d, timeGrid)}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Start time"
            value={slots.includes(slot) ? String(slot) : ''}
            disabled={disabled}
            onChange={(e) => emit(day, Number(e.target.value))}
            fullWidth
            helperText="Honoured as a hard constraint during generation"
          >
            {slots.map((s) => (
              <MenuItem key={s} value={String(s)}>
                {slotTimeLabel(s, timeGrid)} – {slotTimeLabel(s + dur, timeGrid)}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      )}
    </>
  );
}
