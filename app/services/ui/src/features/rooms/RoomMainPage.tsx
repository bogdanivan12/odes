import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import MeetingRoomRoundedIcon from '@mui/icons-material/MeetingRoomRounded';
import EventNoteRoundedIcon from '@mui/icons-material/EventNoteRounded';
import Diversity3RoundedIcon from '@mui/icons-material/Diversity3Rounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import PageContainer from '../layout/PageContainer';
import EntityStatCard from '../../components/EntityStatCard';
import { compareAlphabetical, toTitleLabel } from '../../utils/text';
import { parseFeatures, featuresToInput } from '../../utils/roomFeatures';
import { deleteRoom, getRoomById, updateRoom } from '../../api/rooms';
import type { Room } from '../../types/room';
import { getInstitutionActivities, getInstitutionCourses, getInstitutionGroups, getInstitutionUsers } from '../../api/institutions';
import type { InstitutionActivity, InstitutionCourse, InstitutionGroup, InstitutionUser } from '../../api/institutions';
import { activityRoute, courseRoute, groupRoute, institutionRoute, memberRoute, INSTITUTIONS_ROUTE } from '../../config/routes';
import { getCurrentUserData, isInstitutionAdmin } from '../../utils/institutionAdmin';
import { useInstitutionSync } from '../../utils/useInstitutionSync';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

const activityTypePriority: Record<string, number> = { course: 0, seminar: 1, laboratory: 2 };
const compareActivityTypes = (a: string, b: string) => {
  const aRank = activityTypePriority[a.trim().toLowerCase()] ?? Number.MAX_SAFE_INTEGER;
  const bRank = activityTypePriority[b.trim().toLowerCase()] ?? Number.MAX_SAFE_INTEGER;
  return aRank !== bRank ? aRank - bRank : compareAlphabetical(a, b);
};

export default function RoomMainPage() {
  const theme = useTheme();
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCapacity, setEditCapacity] = useState('30');
  const [editFeatures, setEditFeatures] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [activities, setActivities] = useState<InstitutionActivity[]>([]);
  const [courses, setCourses] = useState<InstitutionCourse[]>([]);
  const [groups, setGroups] = useState<InstitutionGroup[]>([]);
  const [users, setUsers] = useState<InstitutionUser[]>([]);
  const [currentUser, setCurrentUser] = useState<InstitutionUser | null>(null);
  const [currentUserLoading, setCurrentUserLoading] = useState(true);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [relatedError, setRelatedError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!roomId) { setLoading(false); setError('Missing room id in route.'); return () => { mounted = false; }; }
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getRoomById(roomId);
        if (!mounted) return;
        setRoom(data);
        setEditName(data.name);
        setEditCapacity(String(data.capacity));
        setEditFeatures(featuresToInput(data.features));
      } catch (err) {
        if (!mounted) return;
        setError((err as Error).message || 'Failed to load room.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [roomId]);

  useEffect(() => {
    let mounted = true;
    if (!room?.institution_id) return () => { mounted = false; };
    (async () => {
      setRelatedLoading(true);
      setRelatedError(null);
      try {
        const [institutionActivities, institutionCourses, institutionGroups, institutionUsers] = await Promise.all([
          getInstitutionActivities(room.institution_id),
          getInstitutionCourses(room.institution_id),
          getInstitutionGroups(room.institution_id),
          getInstitutionUsers(room.institution_id),
        ]);
        if (!mounted) return;
        setActivities(institutionActivities);
        setCourses(institutionCourses);
        setGroups(institutionGroups);
        setUsers(institutionUsers);
      } catch (err) {
        if (!mounted) return;
        setRelatedError((err as Error).message || 'Failed to load related entities.');
      } finally {
        if (mounted) setRelatedLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [room?.institution_id]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await getCurrentUserData();
        if (!mounted) return;
        setCurrentUser(me);
      } catch {
        if (!mounted) return;
        setCurrentUser(null);
      } finally {
        if (mounted) setCurrentUserLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const canManageRoom = useMemo(() => isInstitutionAdmin(currentUser, room?.institution_id), [currentUser, room?.institution_id]);
  useInstitutionSync(room?.institution_id);

  const coursesById = useMemo(() => {
    const map = new Map<string, InstitutionCourse>();
    courses.forEach((item) => { const id = String(item.id ?? item._id ?? ''); if (id) map.set(id, item); });
    return map;
  }, [courses]);

  const groupsById = useMemo(() => {
    const map = new Map<string, InstitutionGroup>();
    groups.forEach((item) => { const id = String(item.id ?? item._id ?? ''); if (id) map.set(id, item); });
    return map;
  }, [groups]);

  const usersById = useMemo(() => {
    const map = new Map<string, InstitutionUser>();
    users.forEach((item) => { const id = String(item.id ?? item._id ?? ''); if (id) map.set(id, item); });
    return map;
  }, [users]);

  const compatibleActivities = useMemo(() => {
    if (!room) return [];
    const featureSet = new Set((room.features ?? []).map((f) => f.toLowerCase()));
    return activities
      .filter((activity) => {
        const required = ((activity as { required_room_features?: string[] }).required_room_features ?? []).map((f: string) => f.toLowerCase());
        return required.every((f: string) => featureSet.has(f));
      })
      .sort((a, b) => {
        const byCourse = compareAlphabetical(coursesById.get(String(a.course_id))?.name ?? '', coursesById.get(String(b.course_id))?.name ?? '');
        if (byCourse !== 0) return byCourse;
        const byType = compareActivityTypes(a.activity_type, b.activity_type);
        if (byType !== 0) return byType;
        return compareAlphabetical(a.frequency, b.frequency);
      });
  }, [activities, room, coursesById]);

  const relatedCoursesCount = useMemo(() => new Set(compatibleActivities.map((a) => String(a.course_id))).size, [compatibleActivities]);

  const handleUpdate = async () => {
    if (!canManageRoom || !room) return;
    const name = editName.trim();
    const capacity = Number(editCapacity);
    const features = parseFeatures(editFeatures);
    if (!name) { setEditError('Room name is required.'); return; }
    if (!Number.isFinite(capacity) || capacity < 1) { setEditError('Capacity must be a positive number.'); return; }
    setEditLoading(true);
    setEditError(null);
    try {
      const updated = await updateRoom(room.id, { name, capacity, features });
      setRoom(updated);
      setEditOpen(false);
    } catch (err) {
      setEditError((err as Error).message || 'Failed to update room.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!canManageRoom || !room) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteRoom(room.id);
      navigate(room.institution_id ? `${institutionRoute(room.institution_id)}/rooms` : INSTITUTIONS_ROUTE, { replace: true });
    } catch (err) {
      setDeleteError((err as Error).message || 'Failed to delete room.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const backRoute = room?.institution_id ? `${institutionRoute(room.institution_id)}/rooms` : INSTITUTIONS_ROUTE;

  if (loading || currentUserLoading) {
    return (
      <PageContainer alignItems="center">
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={22} />
          <Typography color="text.secondary">Loading room...</Typography>
        </Stack>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer alignItems="flex-start">
        <Alert severity="error" sx={{ width: '100%', borderRadius: 2 }}>{error}</Alert>
      </PageContainer>
    );
  }

  if (!room) {
    return (
      <PageContainer alignItems="flex-start">
        <Alert severity="warning" sx={{ width: '100%', borderRadius: 2 }}>Room data is unavailable.</Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer alignItems="flex-start">
      <Box sx={{ width: '100%', maxWidth: 960, mx: 'auto' }}>

        {/* Back link */}
        <Button
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => navigate(backRoute)}
          sx={{ mb: 2.5, color: 'text.secondary', borderRadius: 2, '&:hover': { color: 'text.primary' } }}
        >
          Rooms
        </Button>

        <Stack spacing={3}>
          {/* Header card */}
          <Paper
            variant="outlined"
            sx={{
              borderRadius: 4, overflow: 'hidden',
              boxShadow: `0 4px 24px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.3 : 0.06)}`,
            }}
          >
            <Box sx={{ height: 3, background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})` }} />
            <Box sx={{ p: { xs: 3, md: 4 } }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{
                    width: 48, height: 48, borderRadius: 3, flexShrink: 0,
                    bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <MeetingRoomRoundedIcon />
                  </Box>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2 }}>{room.name}</Typography>
                    {room.institution_id && (
                      <Typography variant="body2" color="primary.main" sx={{ cursor: 'pointer', fontWeight: 500, mt: 0.25 }} onClick={() => navigate(institutionRoute(room.institution_id))}>
                        View institution
                      </Typography>
                    )}
                  </Box>
                </Box>
                {canManageRoom && (
                  <Stack direction="row" spacing={1}>
                    <Button variant="outlined" startIcon={<EditRoundedIcon />} onClick={() => { setEditError(null); setEditName(room.name); setEditCapacity(String(room.capacity)); setEditFeatures(featuresToInput(room.features)); setEditOpen(true); }} sx={{ borderRadius: 2 }}>
                      Edit
                    </Button>
                    <Button variant="outlined" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => { setDeleteError(null); setDeleteOpen(true); }} sx={{ borderRadius: 2 }}>
                      Delete
                    </Button>
                  </Stack>
                )}
              </Box>

              {/* Capacity + features */}
              <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 2, alignItems: 'center' }}>
                <Chip
                  icon={<PeopleAltRoundedIcon sx={{ fontSize: '0.85rem !important' }} />}
                  label={`Capacity: ${room.capacity}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
                {(room.features ?? []).length === 0 ? (
                  <Typography variant="caption" color="text.disabled" sx={{ ml: 0.5 }}>No features</Typography>
                ) : (
                  (room.features ?? []).sort(compareAlphabetical).map((feature) => (
                    <Chip key={feature} label={feature} size="small" variant="outlined" sx={{ fontSize: '0.72rem', height: 24 }} />
                  ))
                )}
              </Stack>
            </Box>
          </Paper>

          {/* Stat cards */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <EntityStatCard icon={<TuneRoundedIcon fontSize="small" />} label="Features" value={(room.features ?? []).length} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <EntityStatCard icon={<EventNoteRoundedIcon fontSize="small" />} label="Compatible activities" value={compatibleActivities.length} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <EntityStatCard icon={<Diversity3RoundedIcon fontSize="small" />} label="Related courses" value={relatedCoursesCount} />
            </Grid>
          </Grid>

          {/* Section divider */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="overline" color="text.disabled" sx={{ fontWeight: 700, letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>Details</Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>

          {relatedLoading && (
            <Stack direction="row" spacing={1.5} alignItems="center">
              <CircularProgress size={18} />
              <Typography variant="body2" color="text.secondary">Loading details...</Typography>
            </Stack>
          )}
          {relatedError && <Alert severity="error" sx={{ borderRadius: 2 }}>{relatedError}</Alert>}

          {!relatedLoading && !relatedError && (
            <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <Box sx={{ height: 3, background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})` }} />
              <Box sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Compatible activities</Typography>
                  <Typography variant="caption" color="text.secondary">{compatibleActivities.length} total</Typography>
                </Box>
                {compatibleActivities.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <EventNoteRoundedIcon sx={{ fontSize: '2rem', color: 'text.disabled', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">No activities currently fit this room's feature set.</Typography>
                  </Box>
                ) : (
                  <Stack
                    spacing={1}
                    sx={{
                      maxHeight: 480, overflowY: 'auto', pr: 0.5,
                      scrollbarWidth: 'thin',
                      scrollbarColor: `${alpha(theme.palette.primary.main, 0.4)} transparent`,
                    }}
                  >
                    {compatibleActivities.map((activity) => {
                      const activityId = String(activity.id ?? activity._id ?? `${activity.course_id}-${activity.group_id}-${activity.activity_type}`);
                      const courseName = coursesById.get(String(activity.course_id))?.name ?? 'Unknown course';
                      const groupName = groupsById.get(String(activity.group_id))?.name ?? 'Unknown group';
                      const professor = activity.professor_id ? usersById.get(String(activity.professor_id)) : undefined;
                      const professorName = professor?.name ?? 'Unassigned';

                      return (
                        <Box
                          key={activityId}
                          sx={{
                            p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider',
                            cursor: 'pointer',
                            transition: 'border-color 150ms ease, background 150ms ease',
                            '&:hover': { borderColor: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.04) },
                          }}
                          onClick={() => navigate(activityRoute(activityId))}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                            {`${courseName} ${toTitleLabel(activity.activity_type)} · ${toTitleLabel(activity.frequency)}`}
                          </Typography>
                          <Stack direction="row" spacing={1.5} flexWrap="wrap">
                            <Typography
                              variant="caption"
                              color="primary.main"
                              sx={{ cursor: 'pointer' }}
                              onClick={(e) => { e.stopPropagation(); navigate(courseRoute(String(activity.course_id))); }}
                            >
                              {courseName}
                            </Typography>
                            <Typography variant="caption" color="text.disabled">·</Typography>
                            <Typography
                              variant="caption"
                              color="primary.main"
                              sx={{ cursor: 'pointer' }}
                              onClick={(e) => { e.stopPropagation(); navigate(groupRoute(String(activity.group_id))); }}
                            >
                              {groupName}
                            </Typography>
                            <Typography variant="caption" color="text.disabled">·</Typography>
                            <Typography
                              variant="caption"
                              color={activity.professor_id ? 'primary.main' : 'text.secondary'}
                              sx={{ cursor: activity.professor_id ? 'pointer' : 'default' }}
                              onClick={(e) => { if (activity.professor_id) { e.stopPropagation(); navigate(memberRoute(String(activity.professor_id))); } }}
                            >
                              {professorName}{professor?.email ? ` (${professor.email})` : ''}
                            </Typography>
                          </Stack>
                        </Box>
                      );
                    })}
                  </Stack>
                )}
              </Box>
            </Paper>
          )}
        </Stack>
      </Box>

      {/* Delete dialog */}
      <Dialog open={deleteOpen && canManageRoom} onClose={() => !deleteLoading && setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete room?</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure you want to delete <strong>{room.name}</strong>? This action cannot be undone.</DialogContentText>
          {deleteError && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{deleteError}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteOpen(false)} disabled={deleteLoading} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={deleteLoading} sx={{ borderRadius: 2 }}>
            {deleteLoading ? <CircularProgress size={18} color="inherit" /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen && canManageRoom} onClose={() => !editLoading && setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit room</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 0.5 }}>
            <TextField label="Room name" value={editName} onChange={(e) => setEditName(e.target.value)} fullWidth autoFocus disabled={editLoading} />
            <TextField label="Capacity" type="number" value={editCapacity} onChange={(e) => setEditCapacity(e.target.value)} fullWidth disabled={editLoading} slotProps={{ htmlInput: { min: 1 } }} />
            <TextField label="Features" placeholder="projector, whiteboard" value={editFeatures} onChange={(e) => setEditFeatures(e.target.value)} fullWidth disabled={editLoading} helperText="Comma-separated list of features" />
            {editError && <Alert severity="error" sx={{ borderRadius: 2 }}>{editError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditOpen(false)} disabled={editLoading} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleUpdate} variant="contained" disabled={editLoading} sx={{ borderRadius: 2 }}>
            {editLoading ? <CircularProgress size={18} color="inherit" /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
