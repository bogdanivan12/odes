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
import MenuItem from '@mui/material/MenuItem';
import Grid from '@mui/material/Grid';
import EventNoteIcon from '@mui/icons-material/EventNote';
import TimerIcon from '@mui/icons-material/Timer';
import ChecklistIcon from '@mui/icons-material/Checklist';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import SchoolIcon from '@mui/icons-material/School';
import PageContainer from '../layout/PageContainer';
import EntityStatCard from '../../components/EntityStatCard';
import { clickableEntitySx } from '../../utils/clickableEntity';
import { compareAlphabetical, toTitleLabel } from '../../utils/text';
import { parseFeatures, featuresToInput } from '../../utils/roomFeatures';
import { deleteActivity, getActivityById, updateActivity } from '../../api/activities';
import type { Activity } from '../../types/activity';
import { getInstitutionCourses, getInstitutionGroups, getInstitutionUsers } from '../../api/institutions';
import type { InstitutionCourse, InstitutionGroup, InstitutionUser } from '../../api/institutions';
import { courseRoute, groupRoute, institutionRoute, memberRoute, INSTITUTIONS_ROUTE } from '../../config/routes';
import { getCurrentUserData, isInstitutionAdmin } from '../../utils/institutionAdmin';

const ACTIVITY_TYPE_OPTIONS = ['course', 'seminar', 'laboratory', 'other'];
const FREQUENCY_OPTIONS = ['weekly', 'biweekly', 'biweekly_odd', 'biweekly_even'];

export default function ActivityMainPage() {
  const { activityId } = useParams();
  const navigate = useNavigate();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [courses, setCourses] = useState<InstitutionCourse[]>([]);
  const [groups, setGroups] = useState<InstitutionGroup[]>([]);
  const [users, setUsers] = useState<InstitutionUser[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(true);
  const [relatedError, setRelatedError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<InstitutionUser | null>(null);
  const [currentUserLoading, setCurrentUserLoading] = useState(true);

  const [formCourseId, setFormCourseId] = useState('');
  const [formGroupId, setFormGroupId] = useState('');
  const [formProfessorId, setFormProfessorId] = useState('');
  const [formActivityType, setFormActivityType] = useState('course');
  const [formFrequency, setFormFrequency] = useState('weekly');
  const [formDurationSlots, setFormDurationSlots] = useState('2');
  const [formRequiredFeatures, setFormRequiredFeatures] = useState('');

  const populateForm = (value: Activity) => {
    setFormCourseId(String(value.course_id));
    setFormGroupId(String(value.group_id));
    setFormProfessorId(value.professor_id ? String(value.professor_id) : '');
    setFormActivityType(value.activity_type);
    setFormFrequency(value.frequency);
    setFormDurationSlots(String(value.duration_slots));
    setFormRequiredFeatures(featuresToInput(value.required_room_features));
  };

  useEffect(() => {
    let mounted = true;

    if (!activityId) {
      setLoading(false);
      setError('Missing activity id in route.');
      return () => { mounted = false; };
    }

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getActivityById(activityId);
        if (!mounted) return;
        setActivity(data);
        populateForm(data);
      } catch (err) {
        if (!mounted) return;
        setError((err as Error).message || 'Failed to load activity.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [activityId]);

  useEffect(() => {
    let mounted = true;

    if (!activity?.institution_id) {
      if (mounted) {
        setRelatedLoading(true);
        setRelatedError(null);
      }
      return () => { mounted = false; };
    }

    (async () => {
      setRelatedLoading(true);
      setRelatedError(null);
      try {
        const [institutionCourses, institutionGroups, institutionUsers] = await Promise.all([
          getInstitutionCourses(activity.institution_id),
          getInstitutionGroups(activity.institution_id),
          getInstitutionUsers(activity.institution_id),
        ]);

        if (!mounted) return;
        setCourses([...institutionCourses].sort((a, b) => compareAlphabetical(a.name, b.name)));
        setGroups([...institutionGroups].sort((a, b) => compareAlphabetical(a.name, b.name)));
        setUsers([...institutionUsers].sort((a, b) => compareAlphabetical(a.name ?? '', b.name ?? '')));
      } catch (err) {
        if (!mounted) return;
        setRelatedError((err as Error).message || 'Failed to load related activity entities.');
      } finally {
        if (mounted) setRelatedLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [activity?.institution_id]);

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

  const canManageActivity = useMemo(() => isInstitutionAdmin(currentUser, activity?.institution_id), [currentUser, activity?.institution_id]);

  const coursesById = useMemo(() => {
    const map = new Map<string, InstitutionCourse>();
    courses.forEach((course) => {
      const id = String(course.id ?? course._id ?? '');
      if (id) map.set(id, course);
    });
    return map;
  }, [courses]);

  const groupsById = useMemo(() => {
    const map = new Map<string, InstitutionGroup>();
    groups.forEach((group) => {
      const id = String(group.id ?? group._id ?? '');
      if (id) map.set(id, group);
    });
    return map;
  }, [groups]);

  const usersById = useMemo(() => {
    const map = new Map<string, InstitutionUser>();
    users.forEach((user) => {
      const id = String(user.id ?? user._id ?? '');
      if (id) map.set(id, user);
    });
    return map;
  }, [users]);

  const hasResolvedRelations = useMemo(() => {
    if (!activity) return false;
    const hasCourse = Boolean(coursesById.get(String(activity.course_id)));
    const hasGroup = Boolean(groupsById.get(String(activity.group_id)));
    const hasProfessor = !activity.professor_id || Boolean(usersById.get(String(activity.professor_id)));
    return hasCourse && hasGroup && hasProfessor;
  }, [activity, coursesById, groupsById, usersById]);

  const validateForm = () => {
    const duration = Number(formDurationSlots);
    if (!formCourseId) return 'Course is required.';
    if (!formGroupId) return 'Group is required.';
    if (!Number.isFinite(duration) || duration < 1) return 'Duration slots must be a positive number.';
    return null;
  };

  const handleUpdate = async () => {
    if (!canManageActivity || !activity) return;

    const validationError = validateForm();
    if (validationError) {
      setEditError(validationError);
      return;
    }

    setEditLoading(true);
    setEditError(null);
    try {
      const updated = await updateActivity(activity.id, {
        course_id: formCourseId,
        group_id: formGroupId,
        professor_id: formProfessorId || null,
        activity_type: formActivityType,
        frequency: formFrequency,
        duration_slots: Number(formDurationSlots),
        required_room_features: parseFeatures(formRequiredFeatures),
      });
      setActivity(updated);
      setEditOpen(false);
    } catch (err) {
      setEditError((err as Error).message || 'Failed to update activity.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!canManageActivity || !activity) return;

    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteActivity(activity.id);
      navigate(activity.institution_id ? `${institutionRoute(activity.institution_id)}/activities` : INSTITUTIONS_ROUTE, { replace: true });
    } catch (err) {
      setDeleteError((err as Error).message || 'Failed to delete activity.');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading || currentUserLoading || relatedLoading || (!relatedError && !hasResolvedRelations)) {
    return (
      <PageContainer alignItems="center">
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={24} />
          <Typography>Loading activity...</Typography>
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

  if (!activity) {
    return (
      <PageContainer alignItems="flex-start">
        <Alert severity="warning" sx={{ width: '100%' }}>Activity data is unavailable.</Alert>
      </PageContainer>
    );
  }

  if (relatedError) {
    return (
      <PageContainer alignItems="flex-start">
        <Alert severity="error" sx={{ width: '100%' }}>{relatedError}</Alert>
      </PageContainer>
    );
  }

  const courseName = coursesById.get(String(activity.course_id))?.name ?? 'Unknown course';
  const groupName = groupsById.get(String(activity.group_id))?.name ?? 'Unknown group';
  const professor = activity.professor_id ? usersById.get(String(activity.professor_id)) : undefined;
  const professorName = professor?.name ?? (activity.professor_id ? 'Unknown professor' : 'Unassigned');
  const professorEmail = professor?.email;

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
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              {`${courseName} ${toTitleLabel(activity.activity_type)} (${toTitleLabel(activity.frequency)})`}
            </Typography>
            {canManageActivity && (
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setEditError(null);
                    populateForm(activity);
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
            {(activity.required_room_features ?? []).length === 0
              ? <Chip label="No required room features" size="small" variant="outlined" />
              : (activity.required_room_features ?? []).sort(compareAlphabetical).map((feature) => (
                <Chip key={feature} label={feature} size="small" variant="outlined" />
              ))}
          </Stack>
        </Paper>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <EntityStatCard icon={<EventNoteIcon fontSize="small" />} label="Frequency" value={toTitleLabel(activity.frequency)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <EntityStatCard icon={<TimerIcon fontSize="small" />} label="Duration slots" value={activity.duration_slots} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <EntityStatCard icon={<ChecklistIcon fontSize="small" />} label="Required features" value={(activity.required_room_features ?? []).length} />
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <EntityStatCard
              icon={<MenuBookIcon fontSize="small" />}
              label="Course"
              centerContent
              value={(
                <Typography
                  variant="h6"
                  sx={{ ...clickableEntitySx, display: 'inline-flex', fontWeight: 700, lineHeight: 1.1, px: 0, py: 0 }}
                  onClick={() => navigate(courseRoute(String(activity.course_id)))}
                >
                  {courseName}
                </Typography>
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <EntityStatCard
              icon={<Diversity3Icon fontSize="small" />}
              label="Group"
              centerContent
              value={(
                <Typography
                  variant="h6"
                  sx={{ ...clickableEntitySx, display: 'inline-flex', fontWeight: 700, lineHeight: 1.1, px: 0, py: 0 }}
                  onClick={() => navigate(groupRoute(String(activity.group_id)))}
                >
                  {groupName}
                </Typography>
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <EntityStatCard
              icon={<SchoolIcon fontSize="small" />}
              label="Professor"
              centerContent
              value={(
                <Box sx={{ display: 'flex', flexDirection: 'column', mt: 0.25 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      ...(activity.professor_id ? clickableEntitySx : {}),
                      display: 'inline-flex',
                      fontWeight: 700,
                      lineHeight: 1.1,
                      cursor: activity.professor_id ? 'pointer' : 'default',
                      px: 0,
                      py: 0,
                    }}
                    onClick={() => activity.professor_id && navigate(memberRoute(String(activity.professor_id)))}
                  >
                    {professorName}
                  </Typography>
                  {professorEmail && (
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.2, mt: 0.25 }}>
                      {professorEmail}
                    </Typography>
                  )}
                </Box>
              )}
            />
          </Grid>
        </Grid>

        {activity.selected_timeslot && (
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Selected Timeslot</Typography>
            <Typography variant="body2" color="text.secondary">
              {`Start slot: ${activity.selected_timeslot.start_timeslot}`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {`Weeks: ${activity.selected_timeslot.active_weeks.join(', ') || 'none'}`}
            </Typography>
          </Paper>
        )}
      </Stack>

      <Dialog open={deleteOpen && canManageActivity} onClose={() => !deleteLoading && setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete activity?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this activity? This action cannot be undone.
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

      <Dialog open={editOpen && canManageActivity} onClose={() => !editLoading && setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update activity</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField select label="Course" value={formCourseId} onChange={(e) => setFormCourseId(e.target.value)} fullWidth disabled={editLoading}>
              {courses.map((course) => {
                const id = String(course.id ?? course._id ?? '');
                return <MenuItem key={id} value={id}>{course.name}</MenuItem>;
              })}
            </TextField>
            <TextField select label="Group" value={formGroupId} onChange={(e) => setFormGroupId(e.target.value)} fullWidth disabled={editLoading}>
              {groups.map((group) => {
                const id = String(group.id ?? group._id ?? '');
                return <MenuItem key={id} value={id}>{group.name}</MenuItem>;
              })}
            </TextField>
            <TextField select label="Professor" value={formProfessorId} onChange={(e) => setFormProfessorId(e.target.value)} fullWidth disabled={editLoading}>
              <MenuItem value="">Unassigned</MenuItem>
              {users.map((user) => {
                const id = String(user.id ?? user._id ?? '');
                const label = `${user.name ?? 'Unknown'}${user.email ? ` (${user.email})` : ''}`;
                return <MenuItem key={id} value={id}>{label}</MenuItem>;
              })}
            </TextField>
            <TextField select label="Activity type" value={formActivityType} onChange={(e) => setFormActivityType(e.target.value)} fullWidth disabled={editLoading}>
              {ACTIVITY_TYPE_OPTIONS.map((value) => <MenuItem key={value} value={value}>{toTitleLabel(value)}</MenuItem>)}
            </TextField>
            <TextField select label="Frequency" value={formFrequency} onChange={(e) => setFormFrequency(e.target.value)} fullWidth disabled={editLoading}>
              {FREQUENCY_OPTIONS.map((value) => <MenuItem key={value} value={value}>{toTitleLabel(value)}</MenuItem>)}
            </TextField>
            <TextField
              label="Duration slots"
              type="number"
              value={formDurationSlots}
              onChange={(e) => setFormDurationSlots(e.target.value)}
              fullWidth
              disabled={editLoading}
              slotProps={{ htmlInput: { min: 1 } }}
            />
            <TextField
              label="Required room features"
              placeholder="projector, whiteboard"
              value={formRequiredFeatures}
              onChange={(e) => setFormRequiredFeatures(e.target.value)}
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






