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
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import EventNoteIcon from '@mui/icons-material/EventNote';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import PageContainer from '../layout/PageContainer';
import EntityStatCard from '../../components/EntityStatCard';
import { compareAlphabetical, toTitleLabel } from '../../utils/text';
import { parseFeatures, featuresToInput } from '../../utils/roomFeatures';
import { clickableEntitySx, clickableSecondaryEntitySx } from '../../utils/clickableEntity';
import { deleteRoom, getRoomById, updateRoom } from '../../api/rooms';
import type { Room } from '../../types/room';
import { getInstitutionActivities, getInstitutionCourses, getInstitutionGroups, getInstitutionUsers } from '../../api/institutions';
import type { InstitutionActivity, InstitutionCourse, InstitutionGroup, InstitutionUser } from '../../api/institutions';
import { activityRoute, courseRoute, groupRoute, institutionRoute, memberRoute, INSTITUTIONS_ROUTE } from '../../config/routes';
import { getCurrentUserData, isInstitutionAdmin } from '../../utils/institutionAdmin';

const activityTypePriority: Record<string, number> = { course: 0, seminar: 1, laboratory: 2 };

const compareActivityTypes = (a: string, b: string) => {
  const aKey = a.trim().toLowerCase();
  const bKey = b.trim().toLowerCase();
  const aRank = activityTypePriority[aKey] ?? Number.MAX_SAFE_INTEGER;
  const bRank = activityTypePriority[bKey] ?? Number.MAX_SAFE_INTEGER;
  if (aRank !== bRank) return aRank - bRank;
  return compareAlphabetical(a, b);
};

export default function RoomMainPage() {
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

    if (!roomId) {
      setLoading(false);
      setError('Missing room id in route.');
      return () => {
        mounted = false;
      };
    }

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

    return () => {
      mounted = false;
    };
  }, [roomId]);

  useEffect(() => {
    let mounted = true;

    if (!room?.institution_id) {
      return () => {
        mounted = false;
      };
    }

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

    return () => {
      mounted = false;
    };
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

    return () => {
      mounted = false;
    };
  }, []);

  const canManageRoom = useMemo(() => isInstitutionAdmin(currentUser, room?.institution_id), [currentUser, room?.institution_id]);

  const coursesById = useMemo(() => {
    const map = new Map<string, InstitutionCourse>();
    courses.forEach((item) => {
      const id = String(item.id ?? item._id ?? '');
      if (id) map.set(id, item);
    });
    return map;
  }, [courses]);

  const groupsById = useMemo(() => {
    const map = new Map<string, InstitutionGroup>();
    groups.forEach((item) => {
      const id = String(item.id ?? item._id ?? '');
      if (id) map.set(id, item);
    });
    return map;
  }, [groups]);

  const usersById = useMemo(() => {
    const map = new Map<string, InstitutionUser>();
    users.forEach((item) => {
      const id = String(item.id ?? item._id ?? '');
      if (id) map.set(id, item);
    });
    return map;
  }, [users]);

  const compatibleActivities = useMemo(() => {
    if (!room) return [];
    const featureSet = new Set((room.features ?? []).map((feature) => feature.toLowerCase()));

    return activities
      .filter((activity) => {
        const required = ((activity as { required_room_features?: string[] }).required_room_features ?? [])
          .map((feature: string) => feature.toLowerCase());
        return required.every((requiredFeature: string) => featureSet.has(requiredFeature));
      })
      .sort((a, b) => {
        const courseCompare = compareAlphabetical(
          coursesById.get(String(a.course_id))?.name ?? String(a.course_id),
          coursesById.get(String(b.course_id))?.name ?? String(b.course_id),
        );
        if (courseCompare !== 0) return courseCompare;

        const typeCompare = compareActivityTypes(a.activity_type, b.activity_type);
        if (typeCompare !== 0) return typeCompare;

        const frequencyCompare = compareAlphabetical(a.frequency, b.frequency);
        if (frequencyCompare !== 0) return frequencyCompare;

        return compareAlphabetical(String(a.id ?? a._id ?? ''), String(b.id ?? b._id ?? ''));
      });
  }, [activities, room, coursesById]);

  const relatedCoursesCount = useMemo(() => {
    const ids = new Set(compatibleActivities.map((activity) => String(activity.course_id)));
    return ids.size;
  }, [compatibleActivities]);

  const handleUpdate = async () => {
    if (!canManageRoom) return;
    if (!room) return;

    const name = editName.trim();
    const capacity = Number(editCapacity);
    const features = parseFeatures(editFeatures);

    if (!name) {
      setEditError('Room name is required.');
      return;
    }

    if (!Number.isFinite(capacity) || capacity < 1) {
      setEditError('Capacity must be a positive number.');
      return;
    }

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
    if (!canManageRoom) return;
    if (!room) return;

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

  if (loading || currentUserLoading) {
    return (
      <PageContainer alignItems="center">
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={24} />
          <Typography>Loading room...</Typography>
        </Stack>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer alignItems="flex-start">
        <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>
      </PageContainer>
    );
  }

  if (!room) {
    return (
      <PageContainer alignItems="flex-start">
        <Alert severity="warning" sx={{ width: '100%' }}>Room data is unavailable.</Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer alignItems="flex-start">
      <Stack spacing={2.5} sx={{ width: '100%' }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, md: 3 },
            borderRadius: 4,
            border: '1px solid',
            borderColor: 'divider',
            background: 'linear-gradient(120deg, rgba(33,150,243,0.16) 0%, rgba(33,203,243,0.08) 45%, rgba(0,0,0,0) 100%)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>{room.name}</Typography>
            {canManageRoom && (
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setEditError(null);
                    setEditName(room.name);
                    setEditCapacity(String(room.capacity));
                    setEditFeatures(featuresToInput(room.features));
                    setEditOpen(true);
                  }}
                >
                  Edit
                </Button>
                <Button variant="outlined" color="error" onClick={() => { setDeleteError(null); setDeleteOpen(true); }}>
                  Delete
                </Button>
              </Stack>
            )}
          </Box>
          <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
            <Chip label={`Capacity: ${room.capacity}`} size="small" />
            {(room.features ?? []).length === 0 ? (
              <Chip label="No features" size="small" variant="outlined" />
            ) : (
              (room.features ?? []).sort(compareAlphabetical).map((feature) => (
                <Chip key={feature} label={feature} size="small" variant="outlined" />
              ))
            )}
          </Stack>
        </Paper>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <EntityStatCard icon={<MeetingRoomIcon fontSize="small" />} label="Features" value={(room.features ?? []).length} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <EntityStatCard icon={<EventNoteIcon fontSize="small" />} label="Compatible activities" value={compatibleActivities.length} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <EntityStatCard icon={<Diversity3Icon fontSize="small" />} label="Related courses" value={relatedCoursesCount} />
          </Grid>
        </Grid>

        {relatedLoading && (
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <CircularProgress size={18} />
              <Typography>Loading room dashboard data...</Typography>
            </Stack>
          </Paper>
        )}

        {relatedError && <Alert severity="error">{relatedError}</Alert>}

        {!relatedLoading && !relatedError && (
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
              Compatible activities
            </Typography>
            <Divider sx={{ mb: 1.5 }} />

            {compatibleActivities.length === 0 ? (
              <Typography color="text.secondary" variant="body2">No activities currently fit this room's feature set.</Typography>
            ) : (
              <Stack spacing={1}>
                {compatibleActivities.map((activity) => {
                  const activityId = String(activity.id ?? activity._id ?? `${activity.course_id}-${activity.group_id}-${activity.activity_type}`);
                  const courseName = coursesById.get(String(activity.course_id))?.name ?? String(activity.course_id);
                  const groupName = groupsById.get(String(activity.group_id))?.name ?? String(activity.group_id);
                  const professor = activity.professor_id ? usersById.get(String(activity.professor_id)) : undefined;
                  const professorName = professor?.name ?? String(activity.professor_id ?? 'Unassigned');
                  const professorEmail = professor?.email;

                  return (
                    <Box key={activityId} sx={{ p: 1.2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                      <Typography
                        variant="body2"
                        sx={{ ...clickableEntitySx, display: 'flex', fontWeight: 700 }}
                        onClick={() => navigate(activityRoute(activityId))}
                      >
                        {`${courseName} ${toTitleLabel(activity.activity_type)} (${toTitleLabel(activity.frequency)})`}
                      </Typography>

                      <Typography
                        variant="caption"
                        sx={{ ...clickableSecondaryEntitySx, display: 'flex', mt: 0.4 }}
                        onClick={() => navigate(courseRoute(String(activity.course_id)))}
                      >
                        {`Course: ${courseName}`}
                      </Typography>

                      <Typography
                        variant="caption"
                        sx={{ ...clickableSecondaryEntitySx, display: 'flex', mt: 0.4 }}
                        onClick={() => navigate(groupRoute(String(activity.group_id)))}
                      >
                        {`Group: ${groupName}`}
                      </Typography>

                      <Typography
                        variant="caption"
                        sx={{
                          ...(activity.professor_id ? clickableSecondaryEntitySx : {}),
                          display: 'flex',
                          mt: 0.4,
                          cursor: activity.professor_id ? 'pointer' : 'default',
                        }}
                        onClick={() => activity.professor_id && navigate(memberRoute(String(activity.professor_id)))}
                      >
                        {`Professor: ${professorName}${professorEmail ? ` (${professorEmail})` : ''}`}
                      </Typography>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Paper>
        )}
      </Stack>

      <Dialog open={deleteOpen && canManageRoom} onClose={() => !deleteLoading && setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete room?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{room.name}</strong>? This action cannot be undone.
          </DialogContentText>
          {deleteError && <Alert severity="error" sx={{ mt: 2 }}>{deleteError}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)} disabled={deleteLoading}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={deleteLoading}>
            {deleteLoading ? <CircularProgress size={18} color="inherit" /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editOpen && canManageRoom} onClose={() => !editLoading && setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update room</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField
              label="Room name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              fullWidth
              disabled={editLoading}
            />
            <TextField
              label="Capacity"
              type="number"
              value={editCapacity}
              onChange={(e) => setEditCapacity(e.target.value)}
              fullWidth
              disabled={editLoading}
              slotProps={{ htmlInput: { min: 1 } }}
            />
            <TextField
              label="Features"
              placeholder="projector, whiteboard"
              value={editFeatures}
              onChange={(e) => setEditFeatures(e.target.value)}
              fullWidth
              disabled={editLoading}
            />
          </Stack>
          {editError && <Alert severity="error" sx={{ mt: 2 }}>{editError}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)} disabled={editLoading}>Cancel</Button>
          <Button onClick={handleUpdate} variant="contained" disabled={editLoading}>
            {editLoading ? <CircularProgress size={18} color="inherit" /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}




