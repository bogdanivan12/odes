import { useEffect, useMemo, useState } from 'react';
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
import Collapse from '@mui/material/Collapse';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import RemoveCircleOutlineRoundedIcon from '@mui/icons-material/RemoveCircleOutlineRounded';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import PageContainer from '../layout/PageContainer';
import { getCurrentUserProfile, updateCurrentUserProfile, updateTimeslotPreferences } from '../../api/users';
import { getInstitutionById } from '../../api/institutions';
import { getDayName, slotToTime } from '../schedules/CalendarGrid';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import type { TimeslotPreferenceValue } from '../../types/user';
import type { Institution } from '../../types/institution';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name?: string): string {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

// ─── Preference config ───────────────────────────────────────────────────────

// No "unset" — cycle wraps around between the three states
const PREF_CYCLE: TimeslotPreferenceValue[] = ['desired', 'not_ideal', 'unavailable'];

const PREF_CONFIG: Record<TimeslotPreferenceValue, { label: string; bg: string; border: string; text: string }> = {
  desired:     { label: 'Desired',     bg: '#dcfce7', border: '#86efac', text: '#15803d' },
  not_ideal:   { label: 'Not ideal',   bg: '#fef9c3', border: '#fde047', text: '#a16207' },
  unavailable: { label: 'Unavailable', bg: '#fee2e2', border: '#fca5a5', text: '#b91c1c' },
};

function buildDefaultPrefs(days: number, tpd: number): Record<number, TimeslotPreferenceValue> {
  const prefs: Record<number, TimeslotPreferenceValue> = {};
  for (let i = 0; i < days * tpd; i++) prefs[i] = 'desired';
  return prefs;
}

// ─── Availability grid ────────────────────────────────────────────────────────

interface AvailabilityGridProps {
  institution: Institution;
  initialPrefs: Record<number, TimeslotPreferenceValue>;
}

function AvailabilityGrid({ institution, initialPrefs }: AvailabilityGridProps) {
  const theme = useTheme();
  const tgc = institution.time_grid_config;
  const days = tgc.days;
  const tpd = tgc.timeslots_per_day;
  const startHour = tgc.start_hour ?? 8;
  const startMinute = tgc.start_minute ?? 0;
  const slotDuration = tgc.timeslot_duration_minutes ?? 60;
  const startDay = tgc.start_day ?? 0;

  // Default: all slots desired if no saved prefs
  const defaultPrefs = useMemo(
    () => buildDefaultPrefs(days, tpd),
    [days, tpd],
  );

  const [prefs, setPrefs] = useState<Record<number, TimeslotPreferenceValue>>(
    Object.keys(initialPrefs).length > 0 ? initialPrefs : defaultPrefs,
  );
  const [savedPrefs, setSavedPrefs] = useState<Record<number, TimeslotPreferenceValue>>(
    Object.keys(initialPrefs).length > 0 ? initialPrefs : defaultPrefs,
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const isDirty = useMemo(
    () => JSON.stringify(prefs) !== JSON.stringify(savedPrefs),
    [prefs, savedPrefs],
  );

  const handleCellClick = (day: number, slotInDay: number) => {
    const absSlot = day * tpd + slotInDay;
    const current = prefs[absSlot] ?? 'desired';
    const idx = PREF_CYCLE.indexOf(current);
    const next = PREF_CYCLE[(idx + 1) % PREF_CYCLE.length];
    setPrefs((prev) => ({ ...prev, [absSlot]: next }));
    setSaveSuccess(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    const instId = String((institution as any).id ?? (institution as any)._id ?? '');
    const preferences = Object.entries(prefs).map(([slot, preference]) => ({
      slot: parseInt(slot, 10),
      preference,
    }));
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await updateTimeslotPreferences(instId, preferences);
      setSavedPrefs({ ...prefs });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      setSaveError((err as Error).message || 'Failed to save preferences.');
    } finally {
      setSaving(false);
    }
  };

  // Cell width: fit tpd columns + 72px day label in a ~820px container, min 28px
  const DAY_COL_W = 72;
  const cellW = Math.max(28, Math.min(52, Math.floor((820 - DAY_COL_W) / tpd)));
  const cellH = 32;
  const borderColor = theme.palette.divider;

  return (
    <Box>
      {/* Legend */}
      <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mb: 2 }} alignItems="center">
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Click to cycle:</Typography>
        {PREF_CYCLE.map((k) => (
          <Stack key={k} direction="row" spacing={0.5} alignItems="center">
            <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: PREF_CONFIG[k].bg, border: `1px solid ${PREF_CONFIG[k].border}`, flexShrink: 0 }} />
            <Typography variant="caption" color="text.secondary">{PREF_CONFIG[k].label}</Typography>
          </Stack>
        ))}
      </Stack>

      {/* Grid — table-like: single DOM tree so header and body columns are identical */}
      <Box sx={{ overflowX: 'auto' }}>
        <Box sx={{ display: 'inline-block', minWidth: 'min-content' }}>

          {/* ── Header row (time labels) ── */}
          <Box sx={{ display: 'flex', alignItems: 'flex-end', mb: '2px' }}>
            {/* Day label column spacer */}
            <Box sx={{ width: DAY_COL_W, flexShrink: 0 }} />

            {/* One label per timeslot, exactly cellW wide — no margin, no padding */}
            {Array.from({ length: tpd }, (_, i) => (
              <Box
                key={i}
                sx={{
                  width: cellW,
                  flexShrink: 0,
                  textAlign: 'center',
                  fontSize: '0.6rem',
                  lineHeight: 1,
                  color: 'text.secondary',
                  fontWeight: 600,
                  overflow: 'hidden',
                  // Align label to the left edge of each cell
                  display: 'flex',
                  justifyContent: 'flex-start',
                  pl: '2px',
                }}
              >
                {slotToTime(i, startHour, slotDuration, startMinute)}
              </Box>
            ))}
          </Box>

          {/* ── Day rows ── */}
          {Array.from({ length: days }, (_, dayIdx) => (
            <Box
              key={dayIdx}
              sx={{
                display: 'flex',
                alignItems: 'stretch',
                borderTop: `1px solid ${borderColor}`,
                '&:last-child': { borderBottom: `1px solid ${borderColor}` },
              }}
            >
              {/* Day name */}
              <Box
                sx={{
                  width: DAY_COL_W,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'text.secondary',
                  pl: 0.5,
                  borderRight: `1px solid ${borderColor}`,
                }}
              >
                {getDayName(startDay + dayIdx)}
              </Box>

              {/* Cells */}
              {Array.from({ length: tpd }, (_, slotIdx) => {
                const absSlot = dayIdx * tpd + slotIdx;
                const pref = prefs[absSlot] ?? 'desired';
                const cfg = PREF_CONFIG[pref];
                return (
                  <Tooltip
                    key={slotIdx}
                    title={`${cfg.label} — click to change`}
                    placement="top"
                    arrow
                    disableInteractive
                  >
                    <Box
                      onClick={() => handleCellClick(dayIdx, slotIdx)}
                      sx={{
                        width: cellW,
                        height: cellH,
                        flexShrink: 0,
                        cursor: 'pointer',
                        bgcolor: cfg.bg,
                        borderRight: `1px solid ${borderColor}`,
                        transition: 'filter 0.1s ease',
                        '&:hover': { filter: 'brightness(0.9)' },
                      }}
                    />
                  </Tooltip>
                );
              })}
            </Box>
          ))}

        </Box>
      </Box>

      {/* Save / discard */}
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 2 }}>
        <Button
          variant="contained"
          size="small"
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveRoundedIcon />}
          onClick={handleSave}
          disabled={saving || !isDirty}
          sx={{ borderRadius: 2 }}
        >
          {saving ? 'Saving…' : 'Save preferences'}
        </Button>
        {isDirty && (
          <Button
            variant="text"
            size="small"
            onClick={() => { setPrefs(savedPrefs); setSaveError(null); setSaveSuccess(false); }}
            disabled={saving}
            sx={{ borderRadius: 2, color: 'text.secondary' }}
          >
            Discard
          </Button>
        )}
        {saveSuccess && (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <CheckCircleOutlineRoundedIcon sx={{ fontSize: '1rem', color: 'success.main' }} />
            <Typography variant="caption" color="success.main">Saved</Typography>
          </Stack>
        )}
        {saveError && (
          <Typography variant="caption" color="error">{saveError}</Typography>
        )}
      </Stack>
    </Box>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProfilePage() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [professorInstitutions, setProfessorInstitutions] = useState<
    { institution: Institution; initialPrefs: Record<number, TimeslotPreferenceValue> }[]
  >([]);

  // Collapsed by default — track which institution IDs are expanded
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const toggleExpanded = (instId: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(instId)) next.delete(instId); else next.add(instId);
      return next;
    });

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

        const professorInstIds = Object.entries(me.user_roles ?? {})
          .filter(([, roles]) => roles.includes('professor'))
          .map(([instId]) => instId);

        if (professorInstIds.length > 0) {
          const institutions = await Promise.all(
            professorInstIds.map((id) => getInstitutionById(id).catch(() => null)),
          );
          if (!mounted) return;

          const items = institutions
            .filter((inst): inst is Institution => inst !== null)
            .map((inst) => {
              const instId = String((inst as any).id ?? (inst as any)._id ?? '');
              const savedPrefs = me.timeslot_preferences?.[instId] ?? [];
              const initialPrefs: Record<number, TimeslotPreferenceValue> = {};
              savedPrefs.forEach((p) => { initialPrefs[p.slot] = p.preference; });
              return { institution: inst, initialPrefs };
            });
          setProfessorInstitutions(items);
        }
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
      <Box sx={{ width: '100%', maxWidth: 860, mx: 'auto' }}>
        <Stack spacing={3}>

          {/* ── Header card ── */}
          <Paper
            variant="outlined"
            sx={{
              borderRadius: 4, overflow: 'hidden',
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
                    color: 'primary.main', fontSize: '1.4rem', fontWeight: 700, flexShrink: 0,
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

          {/* ── Account details card ── */}
          <Paper
            variant="outlined"
            sx={{
              borderRadius: 4, overflow: 'hidden',
              boxShadow: `0 4px 24px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.3 : 0.06)}`,
            }}
          >
            <Box sx={{ p: { xs: 3, md: 4 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
                <Box sx={{ width: 40, height: 40, borderRadius: 2.5, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PersonRoundedIcon />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Account details</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Update your name, email address, or password.
              </Typography>
              <Divider sx={{ mb: 3 }} />
              <Stack spacing={2.5}>
                <TextField label="Full name" value={name} onChange={(e) => { setName(e.target.value); setSuccess(null); }} fullWidth disabled={saving} autoComplete="name" />
                <TextField label="Email address" value={email} onChange={(e) => { setEmail(e.target.value); setSuccess(null); }} fullWidth disabled={saving} autoComplete="email" />
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 1.5 }}>
                    Change password
                  </Typography>
                  <TextField
                    label="New password" type="password" value={password}
                    onChange={(e) => { setPassword(e.target.value); setSuccess(null); }}
                    fullWidth disabled={saving} placeholder="Leave empty to keep current password"
                    autoComplete="new-password" helperText="Only fill in if you want to change your password"
                  />
                </Box>
                {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ borderRadius: 2 }}>{success}</Alert>}
                <Stack direction="row" justifyContent="flex-end" sx={{ pt: 0.5 }}>
                  <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ borderRadius: 2 }}>
                    {saving ? <CircularProgress size={20} color="inherit" /> : 'Save changes'}
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </Paper>

          {/* ── Professor work hour preferences — one card per institution ── */}
          {professorInstitutions.map(({ institution, initialPrefs }) => {
            const instId = String((institution as any).id ?? (institution as any)._id ?? '');
            const instName = (institution as any).name ?? 'Institution';
            const isExpanded = expandedIds.has(instId);

            return (
              <Paper
                key={instId}
                variant="outlined"
                sx={{
                  borderRadius: 4, overflow: 'hidden',
                  boxShadow: `0 4px 24px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.3 : 0.06)}`,
                }}
              >
                {/* Clickable header */}
                <Box
                  onClick={() => toggleExpanded(instId)}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5,
                    px: { xs: 3, md: 4 }, py: 2.5,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: alpha(theme.palette.secondary.main, 0.04) },
                    transition: 'background-color 0.15s',
                  }}
                >
                  <Box sx={{ width: 40, height: 40, borderRadius: 2.5, flexShrink: 0, bgcolor: alpha(theme.palette.secondary.main, 0.1), color: 'secondary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AccessTimeRoundedIcon />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Work hour preferences</Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>{instName}</Typography>
                  </Box>
                  <IconButton size="small" sx={{ color: 'text.secondary', flexShrink: 0 }}>
                    {isExpanded ? <ExpandLessRoundedIcon /> : <ExpandMoreRoundedIcon />}
                  </IconButton>
                </Box>

                {/* Expandable body */}
                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                  <Divider />
                  <Box sx={{ px: { xs: 3, md: 4 }, pt: 2.5, pb: 3 }}>
                    {/* Description + icon legend */}
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      Click a timeslot to cycle through your preference. The scheduler uses these when generating a schedule.
                    </Typography>
                    <Stack direction="row" spacing={2} sx={{ mb: 2.5 }} flexWrap="wrap" useFlexGap>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <CheckCircleOutlineRoundedIcon sx={{ fontSize: '1rem', color: '#15803d' }} />
                        <Typography variant="caption" color="text.secondary">Desired — strongly prefer</Typography>
                      </Stack>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <RemoveCircleOutlineRoundedIcon sx={{ fontSize: '1rem', color: '#a16207' }} />
                        <Typography variant="caption" color="text.secondary">Not ideal — can work, not preferred</Typography>
                      </Stack>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <CancelOutlinedIcon sx={{ fontSize: '1rem', color: '#b91c1c' }} />
                        <Typography variant="caption" color="text.secondary">Unavailable — cannot attend</Typography>
                      </Stack>
                    </Stack>

                    <AvailabilityGrid institution={institution} initialPrefs={initialPrefs} />
                  </Box>
                </Collapse>
              </Paper>
            );
          })}

        </Stack>
      </Box>
    </PageContainer>
  );
}
