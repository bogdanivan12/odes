import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import StarOutlineRoundedIcon from '@mui/icons-material/StarOutlineRounded';
import PageContainer from '../layout/PageContainer';
import {
  getInstitutionSchedules,
  getInstitutionById,
  triggerScheduleGeneration,
  deleteSchedule,
  setActiveSchedule,
  getScheduleEta,
} from '../../api/institutions';
import type { InstitutionSchedule, InstitutionUser, ScheduleEta } from '../../api/institutions';
import type { Institution } from '../../types/institution';
import { scheduleRoute } from '../../config/routes';
import { getCurrentUserData, isInstitutionAdmin } from '../../utils/institutionAdmin';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import { parseServerTimestamp, parseServerTimestampMs, formatDuration } from '../../utils/time';

function scheduleStatusColor(status?: string): 'success' | 'warning' | 'error' | 'default' {
  if (!status) return 'default';
  const s = status.toLowerCase();
  if (s === 'completed') return 'success';
  if (s === 'running') return 'warning';
  if (s === 'failed') return 'error';
  return 'default';
}

function formatScheduleLabel(
  schedule: InstitutionSchedule,
  fallbackIndex: number,
): { primary: string; secondary?: string } {
  // Prefer the server-assigned monotonic name; fall back to sort-index for
  // legacy schedules that pre-date the name field.
  const primary = schedule.name ?? `Schedule #${fallbackIndex + 1}`;
  if (schedule.timestamp) {
    // Parse as UTC — backend emits UTC and may omit trailing Z.
    const date = parseServerTimestamp(schedule.timestamp);
    if (!date) return { primary };
    const formatted = date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    return { primary, secondary: formatted };
  }
  return { primary };
}

export default function InstitutionSchedules() {
  const theme = useTheme();
  const { institutionId } = useParams();
  const navigate = useNavigate();

  const [schedules, setSchedules] = useState<InstitutionSchedule[]>([]);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [scheduleToDelete, setScheduleToDelete] = useState<InstitutionSchedule | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<InstitutionUser | null>(null);
  const [activeLoading, setActiveLoading] = useState<string | null>(null); // scheduleId being toggled
  const [activeError, setActiveError] = useState<string | null>(null);
  const [eta, setEta] = useState<ScheduleEta | null>(null);
  // Re-render once per second while a schedule is running so the progress
  // bar / remaining-time caption stay live.  Also poll the API every 5s to
  // pick up status transitions (running → completed/failed).
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!institutionId) {
        setError('Missing institution id in route.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const [data, inst, me, etaData] = await Promise.all([
          getInstitutionSchedules(institutionId),
          getInstitutionById(institutionId),
          getCurrentUserData().catch(() => null),
          getScheduleEta(institutionId).catch(() => null),
        ]);
        if (!mounted) return;
        if (me) setCurrentUser(me);
        if (etaData) setEta(etaData);
        setInstitution(inst);
        const sorted = [...data].sort((a, b) => {
          const ta = a.timestamp ? parseServerTimestampMs(a.timestamp) || 0 : 0;
          const tb = b.timestamp ? parseServerTimestampMs(b.timestamp) || 0 : 0;
          return tb - ta;
        });
        setSchedules(sorted);
      } catch (err) {
        if (!mounted) return;
        setError((err as Error).message || 'Failed to load schedules.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [institutionId]);

  // While at least one schedule is running, tick once per second (for the
  // progress bar) and poll the schedule list every 5 s (to detect completion).
  const hasRunningSchedule = useMemo(
    () => schedules.some((s) => s.status?.toLowerCase() === 'running'),
    [schedules],
  );

  useEffect(() => {
    if (!hasRunningSchedule) return;
    const tick = setInterval(() => setNowMs(Date.now()), 1000);
    const poll = setInterval(() => {
      if (!institutionId) return;
      // Quietly refresh the schedules list — ignore errors here, the main
      // load path handles them.
      getInstitutionSchedules(institutionId).then((data) => {
        const sorted = [...data].sort((a, b) => {
          const ta = a.timestamp ? parseServerTimestampMs(a.timestamp) || 0 : 0;
          const tb = b.timestamp ? parseServerTimestampMs(b.timestamp) || 0 : 0;
          return tb - ta;
        });
        setSchedules(sorted);
      }).catch(() => {});
    }, 5000);
    return () => { clearInterval(tick); clearInterval(poll); };
  }, [hasRunningSchedule, institutionId]);

  const canManage = useMemo(() => isInstitutionAdmin(currentUser, institutionId), [currentUser, institutionId]);

  const activeScheduleId = institution?.active_schedule_id ?? null;

  const reload = async () => {
    if (!institutionId) return;
    const [data, inst] = await Promise.all([
      getInstitutionSchedules(institutionId),
      getInstitutionById(institutionId),
    ]);
    setInstitution(inst);
    const sorted = [...data].sort((a, b) => {
      const ta = a.timestamp ? parseServerTimestampMs(a.timestamp) || 0 : 0;
      const tb = b.timestamp ? parseServerTimestampMs(b.timestamp) || 0 : 0;
      return tb - ta;
    });
    setSchedules(sorted);
  };

  const handleToggleActive = async (schedule: InstitutionSchedule) => {
    if (!institutionId) return;
    const id = String(schedule.id ?? schedule._id ?? '');
    const isAlreadyActive = activeScheduleId === id;
    setActiveLoading(id);
    setActiveError(null);
    try {
      await setActiveSchedule(institutionId, isAlreadyActive ? null : id);
      await reload();
    } catch (err) {
      setActiveError((err as Error).message || 'Failed to update active schedule.');
    } finally {
      setActiveLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!scheduleToDelete) return;
    const id = String(scheduleToDelete.id ?? scheduleToDelete._id ?? '');
    if (!id) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteSchedule(id);
      setScheduleToDelete(null);
      await reload();
    } catch (err) {
      setDeleteError((err as Error).message || 'Failed to delete schedule.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!institutionId) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      await triggerScheduleGeneration(institutionId);
      await reload();
    } catch (err) {
      setGenerateError((err as Error).message || 'Failed to generate schedule.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <PageContainer alignItems="center">
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={22} />
          <Typography color="text.secondary">Loading schedules...</Typography>
        </Stack>
      </PageContainer>
    );
  }

  return (
    <PageContainer alignItems="flex-start">
      <Box sx={{ width: '100%', maxWidth: 900, mx: 'auto' }}>
        <Stack spacing={3}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>Schedules</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {schedules.length} schedule{schedules.length !== 1 ? 's' : ''} generated
                {activeScheduleId && ' · 1 active'}
              </Typography>
            </Box>
            {canManage && (
              <Button
                variant="contained"
                startIcon={generating ? <CircularProgress size={16} color="inherit" /> : <AddRoundedIcon />}
                onClick={handleGenerate}
                disabled={generating}
                sx={{ borderRadius: 2 }}
              >
                {generating ? 'Generating…' : 'Generate new schedule'}
              </Button>
            )}
          </Box>

          {generateError && <Alert severity="error" sx={{ borderRadius: 2 }}>{generateError}</Alert>}
          {activeError && <Alert severity="error" sx={{ borderRadius: 2 }}>{activeError}</Alert>}
          {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}

          {/* Empty state */}
          {!error && schedules.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Box sx={{ display: 'inline-flex', p: 2, borderRadius: 4, bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main', mb: 2 }}>
                <CalendarMonthRoundedIcon sx={{ fontSize: '2.5rem' }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>No schedules yet</Typography>
              <Typography variant="body2" color="text.secondary">Run the scheduler to generate a timetable.</Typography>
            </Box>
          )}

          {/* Schedule list */}
          {!error && schedules.length > 0 && (
            <Stack spacing={1.5}>
              {schedules.map((schedule, index) => {
                const scheduleId = String(schedule.id ?? schedule._id ?? '');
                const num = schedules.length - index;
                const { primary, secondary } = formatScheduleLabel(schedule, num - 1);
                const statusColor = scheduleStatusColor(schedule.status);
                const isActive = scheduleId === activeScheduleId;
                const isToggling = activeLoading === scheduleId;
                const isCompleted = schedule.status?.toLowerCase() === 'completed';
                const isRunning = schedule.status?.toLowerCase() === 'running';

                // Compute progress + remaining time for running schedules.
                let progressPct: number | null = null;
                let remainingLabel: string | null = null;
                if (isRunning && eta && schedule.timestamp) {
                  const startedMs = parseServerTimestampMs(schedule.timestamp);
                  const elapsedSec = (nowMs - startedMs) / 1000;
                  const etaSec = Math.max(1, eta.eta_seconds);
                  // Cap visible progress at 95% so the bar doesn't sit at 100%
                  // while the worker is still finishing up.
                  progressPct = Math.min(95, Math.max(0, (elapsedSec / etaSec) * 100));
                  const remaining = etaSec - elapsedSec;
                  remainingLabel = remaining > 5
                    ? `~${formatDuration(remaining)} remaining`
                    : 'Almost done…';
                }

                return (
                  <Paper
                    key={scheduleId || index}
                    variant="outlined"
                    sx={{
                      borderRadius: 2.5,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1,
                      px: 2,
                      py: 1.25,
                      cursor: 'pointer',
                      borderColor: isActive ? 'primary.main' : undefined,
                      transition: 'border-color 150ms ease, box-shadow 150ms ease',
                      '&:hover': {
                        borderColor: isActive ? 'primary.main' : 'primary.light',
                        boxShadow: `0 0 0 1px ${alpha(theme.palette.primary.main, 0.15)}`,
                      },
                    }}
                    onClick={() => scheduleId && navigate(scheduleRoute(scheduleId))}
                  >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    {/* Icon box */}
                    <Box sx={{ width: 36, height: 36, borderRadius: 1.5, flexShrink: 0, bgcolor: isActive ? alpha(theme.palette.primary.main, 0.18) : alpha(theme.palette.primary.main, 0.1), color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CalendarMonthRoundedIcon sx={{ fontSize: '1.1rem' }} />
                    </Box>

                    {/* Labels */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" alignItems="center" spacing={0.75}>
                        <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {primary}
                        </Typography>
                        {isActive && (
                          <Chip label="Active" size="small" color="primary" sx={{ borderRadius: 1.5, fontSize: '0.68rem', height: 18 }} />
                        )}
                      </Stack>
                      {secondary && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {secondary}
                        </Typography>
                      )}
                    </Box>

                    {/* Status chip */}
                    {schedule.status && (
                      <Chip size="small" label={schedule.status} color={statusColor} sx={{ flexShrink: 0, borderRadius: 1.5, fontSize: '0.72rem', height: 22 }} />
                    )}

                    {/* Set/unset active — admins only, only on completed schedules */}
                    {canManage && isCompleted && (
                      <Tooltip title={isActive ? 'Unset as active' : 'Set as active'}>
                        <span>
                          <IconButton
                            size="small"
                            color={isActive ? 'primary' : 'default'}
                            sx={{ borderRadius: 1.5, flexShrink: 0 }}
                            disabled={isToggling}
                            onClick={(e) => { e.stopPropagation(); handleToggleActive(schedule); }}
                          >
                            {isToggling
                              ? <CircularProgress size={14} />
                              : isActive
                                ? <StarRoundedIcon sx={{ fontSize: '1rem' }} />
                                : <StarOutlineRoundedIcon sx={{ fontSize: '1rem' }} />
                            }
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}

                    {canManage && (
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          sx={{ borderRadius: 1.5, flexShrink: 0 }}
                          onClick={(e) => { e.stopPropagation(); setDeleteError(null); setScheduleToDelete(schedule); }}
                        >
                          <DeleteOutlineRoundedIcon sx={{ fontSize: '0.9rem' }} />
                        </IconButton>
                      </Tooltip>
                    )}

                    <ChevronRightRoundedIcon sx={{ fontSize: '1.1rem', color: 'text.disabled', flexShrink: 0 }} />
                  </Box>

                  {isRunning && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.25 }} onClick={(e) => e.stopPropagation()}>
                      <LinearProgress
                        variant={progressPct === null ? 'indeterminate' : 'determinate'}
                        value={progressPct ?? undefined}
                        sx={{ height: 4, borderRadius: 2 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {remainingLabel ?? 'Generating…'}
                        {eta && ` · estimated total ${formatDuration(eta.eta_seconds)} (${eta.num_activities} activities)`}
                      </Typography>
                    </Box>
                  )}
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Stack>
      </Box>

      {/* Delete dialog */}
      <Dialog open={Boolean(scheduleToDelete)} onClose={() => !deleteLoading && setScheduleToDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete schedule?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this schedule? This action cannot be undone.
          </DialogContentText>
          {deleteError && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{deleteError}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setScheduleToDelete(null)} disabled={deleteLoading} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={deleteLoading} sx={{ borderRadius: 2 }}>
            {deleteLoading ? <CircularProgress size={18} color="inherit" /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
