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
import EventNoteIcon from '@mui/icons-material/EventNote';
import TimerIcon from '@mui/icons-material/Timer';
import ChecklistIcon from '@mui/icons-material/Checklist';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import SchoolIcon from '@mui/icons-material/School';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import PageContainer from '../layout/PageContainer';
import { compareAlphabetical, toTitleLabel } from '../../utils/text';
import { parseFeatures, featuresToInput } from '../../utils/roomFeatures';
import { deleteActivity, getActivityById, updateActivity } from '../../api/activities';
import type { Activity } from '../../types/activity';
import { getInstitutionCourses, getInstitutionGroups, getInstitutionUsers } from '../../api/institutions';
import type { InstitutionCourse, InstitutionGroup, InstitutionUser } from '../../api/institutions';
import { courseRoute, groupRoute, institutionRoute, memberRoute, INSTITUTIONS_ROUTE } from '../../config/routes';
import { getCurrentUserData, isInstitutionAdmin } from '../../utils/institutionAdmin';
import { useInstitutionSync } from '../../utils/useInstitutionSync';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

const ACTIVITY_TYPE_OPTIONS = ['course', 'seminar', 'laboratory', 'other'];
const FREQUENCY_OPTIONS = ['weekly', 'biweekly', 'biweekly_odd', 'biweekly_even'];

export default function ActivityMainPage() {
  const theme = useTheme();
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
    if (!activityId) { setLoading(false); setError('Missing activity id in route.'); return () => { mounted = false; }; }
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
    if (!activity?.institution_id) { setRelatedLoading(true); setRelatedError(null); return () => { mounted = false; }; }
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
        setRelatedError((err as Error).message || 'Failed to load related entities.');
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
  useInstitutionSync(activity?.institution_id);

  const coursesById = useMemo(() => {
    const map = new Map<string, InstitutionCourse>();
    courses.forEach((c) => { const id = String(c.id ?? c._id ?? ''); if (id) map.set(id, c); });
    return map;
  }, [courses]);

  const groupsById = useMemo(() => {
    const map = new Map<string, InstitutionGroup>();
    groups.forEach((g) => { const id = String(g.id ?? g._id ?? ''); if (id) map.set(id, g); });
    return map;
  }, [groups]);

  const usersById = useMemo(() => {
    const map = new Map<string, InstitutionUser>();
    users.forEach((u) => { const id = String(u.id ?? u._id ?? ''); if (id) map.set(id, u); });
    return map;
  }, [users]);

  const hasResolvedRelations = useMemo(() => {
    if (!activity) return false;
    return (
      Boolean(coursesById.get(String(activity.course_id))) &&
      Boolean(groupsById.get(String(activity.group_id))) &&
      (!activity.professor_id || Boolean(usersById.get(String(activity.professor_id))))
    );
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
    if (validationError) { setEditError(validationError); return; }
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
          <CircularProgress size={22} />
          <Typography color="text.secondary">Loading activity...</Typography>
        </Stack>
      </PageContainer>
    );
  }

  if (error || !activity) {
    return (
      <PageContainer alignItems="flex-start">
        <Alert severity="error" sx={{ width: '100%', borderRadius: 2 }}>{error ?? 'Activity data is unavailable.'}</Alert>
      </PageContainer>
    );
  }

  if (relatedError) {
    return (
      <PageContainer alignItems="flex-start">
        <Alert severity="error" sx={{ width: '100%', borderRadius: 2 }}>{relatedError}</Alert>
      </PageContainer>
    );
  }

  const backRoute = activity.institution_id
    ? `${institutionRoute(activity.institution_id)}/activities`
    : INSTITUTIONS_ROUTE;

  const courseName = coursesById.get(String(activity.course_id))?.name ?? 'Unknown course';
  const groupName = groupsById.get(String(activity.group_id))?.name ?? 'Unknown group';
  const professor = activity.professor_id ? usersById.get(String(activity.professor_id)) : undefined;
  const professorName = professor?.name ?? (activity.professor_id ? 'Unknown professor' : 'Unassigned');
  const professorEmail = professor?.email;

  const entityCard = (
    icon: React.ReactNode,
    label: string,
    name: string,
    subtitle: string | undefined,
    onClick?: () => void,
  ) => (
    <Paper
      variant="outlined"
      onClick={onClick}
      sx={{
        p: 2, borderRadius: 2.5, flex: 1, display: 'flex', alignItems: 'center', gap: 1.5,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 150ms ease',
        '&:hover': onClick ? { borderColor: 'primary.light' } : {},
      }}
    >
      <Box sx={{ color: 'primary.main', display: 'flex' }}>{icon}</Box>
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Typography>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>{name}</Typography>
        {subtitle && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{subtitle}</Typography>}
      </Box>
    </Paper>
  );

  const formFields = (disabled: boolean) => (
    <Stack spacing={2.5} sx={{ mt: 0.5 }}>
      <TextField select label="Course" value={formCourseId} onChange={(e) => setFormCourseId(e.target.value)} fullWidth disabled={disabled}>
        {courses.map((c) => { const id = String(c.id ?? c._id ?? ''); return <MenuItem key={id} value={id}>{c.name}</MenuItem>; })}
      </TextField>
      <TextField select label="Group" value={formGroupId} onChange={(e) => setFormGroupId(e.target.value)} fullWidth disabled={disabled}>
        {groups.map((g) => { const id = String(g.id ?? g._id ?? ''); return <MenuItem key={id} value={id}>{g.name}</MenuItem>; })}
      </TextField>
      <TextField select label="Professor" value={formProfessorId} onChange={(e) => setFormProfessorId(e.target.value)} fullWidth disabled={disabled}>
        <MenuItem value="">Unassigned</MenuItem>
        {users.map((u) => { const id = String(u.id ?? u._id ?? ''); return <MenuItem key={id} value={id}>{u.name ?? 'Unknown'}{u.email ? ` (${u.email})` : ''}</MenuItem>; })}
      </TextField>
      <TextField select label="Activity type" value={formActivityType} onChange={(e) => setFormActivityType(e.target.value)} fullWidth disabled={disabled}>
        {ACTIVITY_TYPE_OPTIONS.map((v) => <MenuItem key={v} value={v}>{toTitleLabel(v)}</MenuItem>)}
      </TextField>
      <TextField select label="Frequency" value={formFrequency} onChange={(e) => setFormFrequency(e.target.value)} fullWidth disabled={disabled}>
        {FREQUENCY_OPTIONS.map((v) => <MenuItem key={v} value={v}>{toTitleLabel(v)}</MenuItem>)}
      </TextField>
      <TextField label="Duration slots" type="number" value={formDurationSlots} onChange={(e) => setFormDurationSlots(e.target.value)} fullWidth disabled={disabled} slotProps={{ htmlInput: { min: 1 } }} />
      <TextField label="Required room features" placeholder="projector, whiteboard" value={formRequiredFeatures} onChange={(e) => setFormRequiredFeatures(e.target.value)} fullWidth disabled={disabled} helperText="Comma-separated list" />
    </Stack>
  );

  return (
    <PageContainer alignItems="flex-start">
      <Box sx={{ width: '100%', maxWidth: 960, mx: 'auto' }}>
        <Stack spacing={3}>

          {/* Back */}
          <Box>
            <Button
              startIcon={<ArrowBackRoundedIcon />}
              onClick={() => navigate(backRoute)}
              sx={{ borderRadius: 2, color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
            >
              Activities
            </Button>
          </Box>

          {/* Header card */}
          <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{ height: 3, background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})` }} />
            <Box sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
                  <Box sx={{
                    width: 48, height: 48, borderRadius: 2.5, flexShrink: 0,
                    bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <EventNoteIcon sx={{ fontSize: '1.5rem' }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                      {courseName} — {toTitleLabel(activity.activity_type)}
                    </Typography>
                    <Stack direction="row" spacing={0.75} sx={{ mt: 0.75 }} useFlexGap flexWrap="wrap">
                      <Chip size="small" label={toTitleLabel(activity.frequency)} color="primary" variant="outlined" sx={{ fontSize: '0.7rem', height: 22 }} />
                      <Chip size="small" label={`${activity.duration_slots} slot${activity.duration_slots !== 1 ? 's' : ''}`} variant="outlined" sx={{ fontSize: '0.7rem', height: 22 }} />
                      {(activity.required_room_features ?? []).sort(compareAlphabetical).map((f) => (
                        <Chip key={f} size="small" label={f} variant="outlined" sx={{ fontSize: '0.7rem', height: 22 }} />
                      ))}
                    </Stack>
                  </Box>
                </Box>
                {canManageActivity && (
                  <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                    <Button variant="outlined" size="small" sx={{ borderRadius: 2 }} onClick={() => { setEditError(null); populateForm(activity); setEditOpen(true); }}>Edit</Button>
                    <Button variant="outlined" color="error" size="small" sx={{ borderRadius: 2 }} onClick={() => { setDeleteError(null); setDeleteOpen(true); }}>Delete</Button>
                  </Stack>
                )}
              </Box>
            </Box>
          </Paper>

          {/* Stats row */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, flex: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ color: 'primary.main', display: 'flex' }}><EventNoteIcon /></Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Frequency</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{toTitleLabel(activity.frequency)}</Typography>
              </Box>
            </Paper>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, flex: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ color: 'primary.main', display: 'flex' }}><TimerIcon /></Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Duration</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{activity.duration_slots} slot{activity.duration_slots !== 1 ? 's' : ''}</Typography>
              </Box>
            </Paper>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, flex: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ color: 'primary.main', display: 'flex' }}><ChecklistIcon /></Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Required features</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{(activity.required_room_features ?? []).length}</Typography>
              </Box>
            </Paper>
          </Stack>

          {/* Linked entities */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            {entityCard(
              <MenuBookIcon sx={{ fontSize: '1rem' }} />,
              'Course', courseName, undefined,
              () => navigate(courseRoute(String(activity.course_id))),
            )}
            {entityCard(
              <Diversity3Icon sx={{ fontSize: '1rem' }} />,
              'Group', groupName, undefined,
              () => navigate(groupRoute(String(activity.group_id))),
            )}
            {entityCard(
              <SchoolIcon sx={{ fontSize: '1rem' }} />,
              'Professor', professorName, professorEmail,
              activity.professor_id ? () => navigate(memberRoute(String(activity.professor_id))) : undefined,
            )}
          </Stack>

          {/* Timeslot */}
          {activity.selected_timeslot && (
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Selected Timeslot</Typography>
              <Stack spacing={0.5}>
                <Typography variant="body2" color="text.secondary">
                  Start slot:{' '}
                  <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>
                    {activity.selected_timeslot.start_timeslot}
                  </Typography>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Weeks:{' '}
                  <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>
                    {activity.selected_timeslot.active_weeks.join(', ') || 'none'}
                  </Typography>
                </Typography>
              </Stack>
            </Paper>
          )}

        </Stack>
      </Box>

      {/* Delete dialog */}
      <Dialog open={deleteOpen && canManageActivity} onClose={() => !deleteLoading && setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete activity?</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure you want to delete this activity? This action cannot be undone.</DialogContentText>
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
      <Dialog open={editOpen && canManageActivity} onClose={() => !editLoading && setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit activity</DialogTitle>
        <DialogContent>
          {formFields(editLoading)}
          {editError && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{editError}</Alert>}
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
