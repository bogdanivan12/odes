import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import TablePagination from '@mui/material/TablePagination';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import MeetingRoomRoundedIcon from '@mui/icons-material/MeetingRoomRounded';
import PageContainer from '../layout/PageContainer';
import {
  getInstitutionById,
  getInstitutionRooms,
  getInstitutionUsers,
} from '../../api/institutions';
import type { InstitutionRoom, InstitutionUser } from '../../api/institutions';
import {
  getReservations,
  createReservation,
  checkReservationConflict,
  approveReservation,
  refuseReservation,
  deleteReservation,
} from '../../api/reservations';
import type { Reservation, ConflictCheckResult } from '../../types/reservation';
import type { Institution as InstitutionClass } from '../../types/institution';
import { getCurrentUserData, isInstitutionAdmin } from '../../utils/institutionAdmin';
import { compareAlphabetical } from '../../utils/text';
import { addDaysIso, weekRangeLabel, formatDayMonthYear } from '../../utils/calendarWeeks';

const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const idOf = (o: { id?: string; _id?: string }) => String(o.id ?? o._id ?? '');
const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

function statusColor(s: string): 'warning' | 'success' | 'error' | 'default' {
  if (s === 'approved') return 'success';
  if (s === 'refused') return 'error';
  if (s === 'pending') return 'warning';
  return 'default';
}

export default function InstitutionRequests() {
  const { institutionId } = useParams();

  const [institution, setInstitution] = useState<InstitutionClass | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<InstitutionRoom[]>([]);
  const [users, setUsers] = useState<InstitutionUser[]>([]);
  const [currentUser, setCurrentUser] = useState<InstitutionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [refuseTarget, setRefuseTarget] = useState<Reservation | null>(null);
  const [refuseReason, setRefuseReason] = useState('');
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const load = async () => {
    if (!institutionId) { setError('Missing institution id.'); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const [inst, res, rms, usrs, me] = await Promise.all([
        getInstitutionById(institutionId),
        getReservations(institutionId),
        getInstitutionRooms(institutionId),
        getInstitutionUsers(institutionId),
        getCurrentUserData().catch(() => null),
      ]);
      setInstitution(inst);
      setReservations(res);
      setRooms([...rms].sort((a, b) => compareAlphabetical(a.name, b.name)));
      setUsers(usrs);
      if (me) setCurrentUser(me);
    } catch (err) {
      setError((err as Error).message || 'Failed to load reservations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [institutionId]);

  const isAdmin = useMemo(() => isInstitutionAdmin(currentUser, institutionId), [currentUser, institutionId]);
  const myUserId = useMemo(() => idOf((currentUser ?? {}) as { id?: string; _id?: string }), [currentUser]);

  const roomName = (id: string) => rooms.find((r) => idOf(r) === id)?.name ?? id;
  const userName = (id: string) => users.find((u) => idOf(u) === id)?.name ?? users.find((u) => idOf(u) === id)?.email ?? 'Unknown';

  const sorted = useMemo(
    () => [...reservations].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '')),
    [reservations],
  );

  // Keep the current page in range when the list shrinks (e.g. after a delete).
  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(sorted.length / rowsPerPage) - 1);
    if (page > maxPage) setPage(maxPage);
  }, [sorted.length, rowsPerPage, page]);

  const paginated = useMemo(
    () => sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [sorted, page, rowsPerPage],
  );

  const handleApprove = async (r: Reservation) => {
    setActionBusy(idOf(r));
    try { await approveReservation(idOf(r)); await load(); }
    catch (err) { setError((err as Error).message); }
    finally { setActionBusy(null); }
  };

  const handleRefuse = async () => {
    if (!refuseTarget) return;
    setActionBusy(idOf(refuseTarget));
    try { await refuseReservation(idOf(refuseTarget), refuseReason.trim() || undefined); setRefuseTarget(null); setRefuseReason(''); await load(); }
    catch (err) { setError((err as Error).message); }
    finally { setActionBusy(null); }
  };

  const handleDelete = async (r: Reservation) => {
    setActionBusy(idOf(r));
    try { await deleteReservation(idOf(r)); await load(); }
    catch (err) { setError((err as Error).message); }
    finally { setActionBusy(null); }
  };

  if (loading) {
    return (
      <PageContainer alignItems="center">
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={22} />
          <Typography color="text.secondary">Loading reservations…</Typography>
        </Stack>
      </PageContainer>
    );
  }

  const calendarWeeks = institution?.time_grid_config?.calendar_weeks ?? [];

  return (
    <PageContainer alignItems="flex-start">
      <Box sx={{ width: '100%', maxWidth: 900, mx: 'auto' }}>
        <Stack spacing={2.5}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>Room requests</Typography>
              <Typography variant="body2" color="text.secondary">
                {institution?.name} · request a room and an admin will approve or refuse it.
              </Typography>
            </Box>
            <Tooltip title={calendarWeeks.length === 0 ? 'An admin must configure calendar weeks first.' : ''}>
              <span>
                <Button
                  variant="contained"
                  startIcon={<AddRoundedIcon />}
                  onClick={() => setCreateOpen(true)}
                  disabled={calendarWeeks.length === 0 || rooms.length === 0}
                  sx={{ borderRadius: 2 }}
                >
                  New reservation
                </Button>
              </span>
            </Tooltip>
          </Box>

          {error && <Alert severity="error" sx={{ borderRadius: 2 }} onClose={() => setError(null)}>{error}</Alert>}

          {sorted.length === 0 ? (
            <Paper variant="outlined" sx={{ borderRadius: 2.5, p: 5, textAlign: 'center' }}>
              <MeetingRoomRoundedIcon sx={{ fontSize: '2.5rem', color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">No reservations yet.</Typography>
            </Paper>
          ) : (
            <Stack spacing={1.25}>
              {paginated.map((r) => {
                const rid = idOf(r);
                const canDelete = isAdmin || (r.requester_id === myUserId && r.status === 'pending');
                return (
                  <Paper key={rid} variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                          <Typography sx={{ fontWeight: 700 }}>{roomName(r.room_id)}</Typography>
                          <Chip size="small" label={r.status} color={statusColor(r.status)} sx={{ borderRadius: 1, textTransform: 'capitalize' }} />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          {formatDayMonthYear(r.date)} · {hhmm(r.start_minute)}–{hhmm(r.end_minute)}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>{r.reason}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Requested by {userName(r.requester_id)}
                          {r.status === 'refused' && r.decision_reason ? ` · Refused: ${r.decision_reason}` : ''}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={0.5}>
                        {isAdmin && r.status === 'pending' && (
                          <>
                            <Tooltip title="Approve">
                              <span>
                                <IconButton color="success" disabled={actionBusy === rid} onClick={() => handleApprove(r)}>
                                  <CheckRoundedIcon />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Refuse">
                              <span>
                                <IconButton color="error" disabled={actionBusy === rid} onClick={() => { setRefuseTarget(r); setRefuseReason(''); }}>
                                  <CloseRoundedIcon />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </>
                        )}
                        {canDelete && (
                          <Tooltip title={r.requester_id === myUserId && !isAdmin ? 'Withdraw' : 'Delete'}>
                            <span>
                              <IconButton disabled={actionBusy === rid} onClick={() => handleDelete(r)}>
                                <DeleteOutlineRoundedIcon />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                      </Stack>
                    </Stack>
                  </Paper>
                );
              })}
              <TablePagination
                component="div"
                count={sorted.length}
                page={page}
                onPageChange={(_, p) => setPage(p)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                rowsPerPageOptions={[5, 10, 25, 50]}
              />
            </Stack>
          )}
        </Stack>
      </Box>

      {institution && (
        <NewReservationDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          institution={institution}
          rooms={rooms}
          onCreated={async () => { setCreateOpen(false); await load(); }}
        />
      )}

      {/* Refuse dialog */}
      <Dialog open={Boolean(refuseTarget)} onClose={() => setRefuseTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Refuse reservation</DialogTitle>
        <DialogContent>
          <TextField
            label="Reason (optional)"
            value={refuseReason}
            onChange={(e) => setRefuseReason(e.target.value)}
            fullWidth multiline minRows={2} sx={{ mt: 1 }}
            placeholder="Let the requester know why…"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRefuseTarget(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleRefuse} sx={{ borderRadius: 2 }}>Refuse</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}

// ── New reservation dialog ───────────────────────────────────────────────────

function NewReservationDialog({
  open, onClose, institution, rooms, onCreated,
}: {
  open: boolean;
  onClose: () => void;
  institution: InstitutionClass;
  rooms: InstitutionRoom[];
  onCreated: () => void;
}) {
  const tg = institution.time_grid_config;
  const weeks = useMemo(
    () => [...(tg.calendar_weeks ?? [])].sort((a, b) => a.start_date.localeCompare(b.start_date)),
    [tg.calendar_weeks],
  );

  const [roomId, setRoomId] = useState('');
  const [weekIdx, setWeekIdx] = useState('0');
  const [weekday, setWeekday] = useState(String(tg.start_day)); // 0 = Mon … 6 = Sun
  const [startHour, setStartHour] = useState('8');
  const [endHour, setEndHour] = useState('10');
  const [reason, setReason] = useState('');
  const [check, setCheck] = useState<ConflictCheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setRoomId(rooms[0] ? idOf(rooms[0]) : '');
      setWeekIdx('0'); setWeekday(String(tg.start_day)); setStartHour('8'); setEndHour('10');
      setReason(''); setCheck(null); setSubmitError(null);
    }
  }, [open, rooms, tg.start_day]);

  const selectedWeek = weeks[Number(weekIdx)] ?? weeks[0];
  // Monday of the selected calendar week's ISO week (the grid may start on any
  // weekday, e.g. Saturday for a weekend institution).
  const monday = selectedWeek ? addDaysIso(selectedWeek.start_date, -tg.start_day) : '';
  const date = monday ? addDaysIso(monday, Number(weekday)) : '';
  const startMinute = Number(startHour) * 60;
  const endMinute = Number(endHour) * 60;
  const timesValid = endMinute > startMinute;

  // Debounced conflict check
  useEffect(() => {
    if (!open || !roomId || !date || !timesValid) { setCheck(null); return; }
    let cancelled = false;
    setChecking(true);
    const t = setTimeout(async () => {
      try {
        const result = await checkReservationConflict(idOf(institution), {
          room_id: roomId, date, start_minute: startMinute, end_minute: endMinute,
        });
        if (!cancelled) setCheck(result);
      } catch {
        if (!cancelled) setCheck(null);
      } finally {
        if (!cancelled) setChecking(false);
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [open, roomId, date, startMinute, endMinute, timesValid, institution]);

  const canSubmit = !!roomId && !!date && timesValid && reason.trim().length > 0 && check?.ok === true && !checking;

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await createReservation(idOf(institution), {
        room_id: roomId, date, start_minute: startMinute, end_minute: endMinute, reason: reason.trim(),
      });
      onCreated();
    } catch (err) {
      setSubmitError((err as Error).message || 'Failed to create reservation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>New reservation</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 0.5 }}>
          <TextField select label="Room" value={roomId} onChange={(e) => setRoomId(e.target.value)} fullWidth>
            {rooms.map((r) => <MenuItem key={idOf(r)} value={idOf(r)}>{r.name}</MenuItem>)}
          </TextField>

          <TextField select label="Week" value={weekIdx} onChange={(e) => setWeekIdx(e.target.value)} fullWidth>
            {weeks.map((w, i) => (
              <MenuItem key={w.start_date} value={String(i)}>
                {weekRangeLabel(addDaysIso(w.start_date, -tg.start_day), 7)} · Week {w.week_number}
              </MenuItem>
            ))}
          </TextField>

          <TextField select label="Day" value={weekday} onChange={(e) => setWeekday(e.target.value)} fullWidth>
            {/* Natural Monday→Sunday week; dates are contiguous from that week's Monday. */}
            {WEEKDAY_NAMES.map((name, m) => {
              const iso = monday ? addDaysIso(monday, m) : '';
              return <MenuItem key={m} value={String(m)}>{name} · {iso ? formatDayMonthYear(iso) : ''}</MenuItem>;
            })}
          </TextField>
          <Stack direction="row" spacing={2}>
            <TextField select label="From" value={startHour} onChange={(e) => setStartHour(e.target.value)} fullWidth>
              {Array.from({ length: 24 }, (_, h) => <MenuItem key={h} value={String(h)}>{String(h).padStart(2, '0')}:00</MenuItem>)}
            </TextField>
            <TextField select label="To" value={endHour} onChange={(e) => setEndHour(e.target.value)} fullWidth>
              {Array.from({ length: 24 }, (_, h) => h + 1).map((h) => <MenuItem key={h} value={String(h)}>{String(h).padStart(2, '0')}:00</MenuItem>)}
            </TextField>
          </Stack>

          <TextField label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} fullWidth multiline minRows={2} placeholder="What is the room for?" />

          {!timesValid && <Alert severity="warning" sx={{ borderRadius: 2 }}>End time must be after start time.</Alert>}
          {timesValid && checking && (
            <Stack direction="row" spacing={1} alignItems="center"><CircularProgress size={16} /><Typography variant="body2" color="text.secondary">Checking availability…</Typography></Stack>
          )}
          {timesValid && !checking && check?.ok && (
            <Alert severity="success" sx={{ borderRadius: 2 }}>Room is available at this time.</Alert>
          )}
          {timesValid && !checking && check && !check.ok && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              Not available:
              <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                {check.conflicts.map((c, i) => <li key={i}>{c.description}</li>)}
              </ul>
            </Alert>
          )}
          {submitError && <Alert severity="error" sx={{ borderRadius: 2 }}>{submitError}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit || submitting} sx={{ borderRadius: 2 }}>
          {submitting ? <CircularProgress size={18} color="inherit" /> : 'Send request'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
