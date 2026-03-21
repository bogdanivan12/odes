import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EventNoteIcon from '@mui/icons-material/EventNote';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import SchoolIcon from '@mui/icons-material/School';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import PageContainer from '../layout/PageContainer';
import { createActivity, deleteActivity, updateActivity } from '../../api/activities';
import { getInstitutionActivities, getInstitutionCourses, getInstitutionGroups, getInstitutionUsers } from '../../api/institutions';
import type { InstitutionCourse, InstitutionGroup, InstitutionUser } from '../../api/institutions';
import type { Activity } from '../../types/activity';
import { activityRoute, courseRoute, groupRoute, memberRoute } from '../../config/routes';
import { compareAlphabetical, toTitleLabel } from '../../utils/text';
import { parseFeatures } from '../../utils/roomFeatures';
import { clickableSecondaryEntitySx } from '../../utils/clickableEntity';
import { getCurrentUserData, isInstitutionAdmin } from '../../utils/institutionAdmin';

const ACTIVITY_TYPE_OPTIONS = ['course', 'seminar', 'laboratory', 'other'];
const FREQUENCY_OPTIONS = ['weekly', 'biweekly', 'biweekly_odd', 'biweekly_even'];

export default function InstitutionActivities() {
  const { institutionId } = useParams();
  const navigate = useNavigate();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [courses, setCourses] = useState<InstitutionCourse[]>([]);
  const [groups, setGroups] = useState<InstitutionGroup[]>([]);
  const [users, setUsers] = useState<InstitutionUser[]>([]);
  const [currentUser, setCurrentUser] = useState<InstitutionUser | null>(null);
  const [currentUserLoading, setCurrentUserLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [groupSectionQuery, setGroupSectionQuery] = useState('');
  const [professorSectionQuery, setProfessorSectionQuery] = useState('');
  const [courseSectionQuery, setCourseSectionQuery] = useState('');

  const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [activityToEdit, setActivityToEdit] = useState<Activity | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [formCourseId, setFormCourseId] = useState('');
  const [formGroupId, setFormGroupId] = useState('');
  const [formProfessorId, setFormProfessorId] = useState('');
  const [formActivityType, setFormActivityType] = useState('course');
  const [formFrequency, setFormFrequency] = useState('weekly');
  const [formDurationSlots, setFormDurationSlots] = useState('2');
  const [formRequiredFeatures, setFormRequiredFeatures] = useState('');

  const resetForm = () => {
    setFormCourseId('');
    setFormGroupId('');
    setFormProfessorId('');
    setFormActivityType('course');
    setFormFrequency('weekly');
    setFormDurationSlots('2');
    setFormRequiredFeatures('');
  };

  const loadData = async () => {
    if (!institutionId) {
      setError('Missing institution id in route.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [institutionActivities, institutionCourses, institutionGroups, institutionUsers] = await Promise.all([
        getInstitutionActivities(institutionId),
        getInstitutionCourses(institutionId),
        getInstitutionGroups(institutionId),
        getInstitutionUsers(institutionId),
      ]);

      const normalizedActivities = institutionActivities.map((activity) => ({
        ...activity,
        id: String(activity.id ?? activity._id ?? ''),
      })) as Activity[];

      const sortedActivities = [...normalizedActivities].sort((a, b) => {
        const aName = String(a.course_id);
        const bName = String(b.course_id);
        return compareAlphabetical(aName, bName);
      });

      setActivities(sortedActivities);
      setCourses([...institutionCourses].sort((a, b) => compareAlphabetical(a.name, b.name)));
      setGroups([...institutionGroups].sort((a, b) => compareAlphabetical(a.name, b.name)));
      setUsers([...institutionUsers].sort((a, b) => compareAlphabetical(a.name ?? '', b.name ?? '')));
    } catch (err) {
      setError((err as Error).message || 'Failed to load activities.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [institutionId]);

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

  const canManageInstitution = useMemo(() => isInstitutionAdmin(currentUser, institutionId), [currentUser, institutionId]);

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

  const filteredActivities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return activities;

    return activities.filter((activity) => {
      const courseName = coursesById.get(String(activity.course_id))?.name ?? 'Unknown course';
      const groupName = groupsById.get(String(activity.group_id))?.name ?? 'Unknown group';
      const professor = activity.professor_id ? usersById.get(String(activity.professor_id)) : undefined;
      const professorName = professor?.name ?? 'Unassigned';
      const text = `${courseName} ${groupName} ${professorName} ${activity.activity_type} ${activity.frequency}`.toLowerCase();
      return text.includes(q);
    });
  }, [activities, searchQuery, coursesById, groupsById, usersById]);

  const getActivitySearchText = (activity: Activity): string => {
    const courseName = coursesById.get(String(activity.course_id))?.name ?? 'Unknown course';
    const groupName = groupsById.get(String(activity.group_id))?.name ?? 'Unknown group';
    const professor = activity.professor_id ? usersById.get(String(activity.professor_id)) : undefined;
    const professorName = professor?.name ?? 'Unassigned';
    return `${courseName} ${groupName} ${professorName} ${activity.activity_type} ${activity.frequency}`.toLowerCase();
  };

  const getActivityId = (activity: Activity): string => String(activity.id ?? '');

  const groupChildrenByParent = useMemo(() => {
    const map = new Map<string | null, string[]>();
    groups.forEach((group) => {
      const id = String(group.id ?? group._id ?? '');
      if (!id) return;
      const parentId = group.parent_group_id ? String(group.parent_group_id) : null;
      if (!map.has(parentId)) map.set(parentId, []);
      map.get(parentId)!.push(id);
    });

    map.forEach((ids) => {
      ids.sort((a, b) => compareAlphabetical(groupsById.get(a)?.name ?? a, groupsById.get(b)?.name ?? b));
    });

    return map;
  }, [groups, groupsById]);

  const groupSectionActivities = useMemo(() => {
    const q = groupSectionQuery.trim().toLowerCase();
    if (!q) return filteredActivities;
    return filteredActivities.filter((activity) => {
      const groupName = groupsById.get(String(activity.group_id))?.name ?? 'Unknown group';
      return groupName.toLowerCase().includes(q) || getActivitySearchText(activity).includes(q);
    });
  }, [filteredActivities, groupSectionQuery, groupsById]);

  const activitiesByGroupId = useMemo(() => {
    const map = new Map<string, Activity[]>();
    groupSectionActivities.forEach((activity) => {
      const key = String(activity.group_id);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(activity);
    });
    map.forEach((rows) => rows.sort((a, b) => compareAlphabetical(getActivityId(a), getActivityId(b))));
    return map;
  }, [groupSectionActivities]);

  const displayedGroupTreeIds = useMemo(() => {
    const included = new Set<string>(Array.from(activitiesByGroupId.keys()));
    const q = groupSectionQuery.trim().toLowerCase();

    if (q) {
      groups.forEach((group) => {
        const id = String(group.id ?? group._id ?? '');
        if (!id) return;
        if ((group.name ?? '').toLowerCase().includes(q)) included.add(id);
      });
    }

    Array.from(included).forEach((groupId) => {
      let current = groupsById.get(groupId);
      while (current?.parent_group_id) {
        const parentId = String(current.parent_group_id);
        if (included.has(parentId)) break;
        included.add(parentId);
        current = groupsById.get(parentId);
      }
    });

    return included;
  }, [activitiesByGroupId, groups, groupsById, groupSectionQuery]);

  const displayedRootGroupIds = useMemo(() => {
    const roots = groupChildrenByParent.get(null) ?? [];
    return roots.filter((id) => displayedGroupTreeIds.has(id));
  }, [groupChildrenByParent, displayedGroupTreeIds]);

  const activitiesByProfessor = useMemo(() => {
    const map = new Map<string, Activity[]>();
    filteredActivities.forEach((activity) => {
      const key = String(activity.professor_id ?? 'unassigned');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(activity);
    });

    const q = professorSectionQuery.trim().toLowerCase();

    return Array.from(map.entries())
      .sort(([aId], [bId]) => {
        const aName = aId === 'unassigned' ? 'Unassigned' : (usersById.get(aId)?.name ?? 'Unknown professor');
        const bName = bId === 'unassigned' ? 'Unassigned' : (usersById.get(bId)?.name ?? 'Unknown professor');
        return compareAlphabetical(aName, bName);
      })
      .map(([professorId, rows]) => {
        const user = usersById.get(professorId);
        const name = professorId === 'unassigned' ? 'Unassigned' : (user?.name ?? 'Unknown professor');
        const email = user?.email;
        const label = email ? `${name} (${email})` : name;
        const rowActivities = [...rows].sort((a, b) => compareAlphabetical(getActivityId(a), getActivityId(b)));
        if (q && !label.toLowerCase().includes(q) && !rowActivities.some((a) => getActivitySearchText(a).includes(q))) return null;
        return {
          key: professorId,
          label,
          activities: rowActivities,
        };
      })
      .filter(Boolean) as Array<{ key: string; label: string; activities: Activity[] }>;
  }, [filteredActivities, usersById, professorSectionQuery]);

  const activitiesByCourse = useMemo(() => {
    const map = new Map<string, Activity[]>();
    filteredActivities.forEach((activity) => {
      const key = String(activity.course_id);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(activity);
    });

    const q = courseSectionQuery.trim().toLowerCase();

    return Array.from(map.entries())
      .sort(([aId], [bId]) => compareAlphabetical(coursesById.get(aId)?.name ?? 'Unknown course', coursesById.get(bId)?.name ?? 'Unknown course'))
      .map(([courseId, rows]) => {
        const label = coursesById.get(courseId)?.name ?? 'Unknown course';
        const rowActivities = [...rows].sort((a, b) => compareAlphabetical(getActivityId(a), getActivityId(b)));
        if (q && !label.toLowerCase().includes(q) && !rowActivities.some((a) => getActivitySearchText(a).includes(q))) return null;
        return {
          key: courseId,
          label,
          activities: rowActivities,
        };
      })
      .filter(Boolean) as Array<{ key: string; label: string; activities: Activity[] }>;
  }, [filteredActivities, coursesById, courseSectionQuery]);

  const renderActivityCard = (activity: Activity) => {
    const activityId = getActivityId(activity);
    const canOpenActivity = Boolean(activityId);
    const courseName = coursesById.get(String(activity.course_id))?.name ?? 'Unknown course';
    const groupName = groupsById.get(String(activity.group_id))?.name ?? 'Unknown group';
    const professor = activity.professor_id ? usersById.get(String(activity.professor_id)) : undefined;
    const professorName = professor?.name ?? 'Unassigned';
    const professorEmail = professor?.email;

    return (
      <Box key={activityId || `${activity.course_id}-${activity.group_id}-${activity.activity_type}`} sx={{ p: 1.1, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
          <Stack direction="row" spacing={0.8} alignItems="center">
            <EventNoteIcon fontSize="small" color="action" />
            <Typography
              variant="body2"
              sx={{
                fontWeight: 700,
                cursor: canOpenActivity ? 'pointer' : 'default',
                '&:hover': canOpenActivity ? { textDecoration: 'underline' } : undefined,
              }}
              onClick={() => canOpenActivity && navigate(activityRoute(activityId))}
            >
              {`${courseName} ${toTitleLabel(activity.activity_type)} (${toTitleLabel(activity.frequency)})`}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.4}>
            <Button size="small" sx={{ minWidth: 0, px: 0.8 }} disabled={!canOpenActivity} onClick={() => canOpenActivity && navigate(activityRoute(activityId))}>Open</Button>
          </Stack>
        </Box>
        <Stack spacing={0.2} sx={{ mt: 0.35 }}>
          <Typography
            variant="caption"
            sx={{ ...clickableSecondaryEntitySx, display: 'block', width: 'fit-content' }}
            onClick={() => navigate(courseRoute(String(activity.course_id)))}
          >
            {`Course: ${courseName}`}
          </Typography>
          <Typography
            variant="caption"
            sx={{ ...clickableSecondaryEntitySx, display: 'block', width: 'fit-content' }}
            onClick={() => navigate(groupRoute(String(activity.group_id)))}
          >
            {`Group: ${groupName}`}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              ...(activity.professor_id ? clickableSecondaryEntitySx : {}),
              display: 'block',
              width: 'fit-content',
              cursor: activity.professor_id ? 'pointer' : 'default',
            }}
            onClick={() => activity.professor_id && navigate(memberRoute(String(activity.professor_id)))}
          >
            {`Professor: ${professorName}${professorEmail ? ` (${professorEmail})` : ''}`}
          </Typography>
        </Stack>
      </Box>
    );
  };

  const renderGroupedSection = (
    title: string,
    grouped: Array<{ key: string; label: string; activities: Activity[] }>,
    query: string,
    setQuery: (value: string) => void,
    placeholder: string,
  ) => (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.2 }}>
        {title === 'By professor' ? <SchoolIcon color="primary" /> : <MenuBookIcon color="primary" />}
        <Typography variant="h6" sx={{ fontWeight: 700 }}>{title}</Typography>
      </Stack>
      <TextField
        size="small"
        fullWidth
        label="Search in section"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        sx={{ mb: 1.2 }}
      />
      <Divider sx={{ mb: 1.2 }} />
      {grouped.length === 0 ? (
        <Typography color="text.secondary" variant="body2">No activities in this section.</Typography>
      ) : (
        <Stack spacing={1}>
          {grouped.map((entity) => (
            <Accordion key={`${title}-${entity.key}`} disableGutters>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{entity.label}</Typography>
                  <Chip size="small" label={`${entity.activities.length} activities`} />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={1}>
                  {entity.activities.map((item) => renderActivityCard(item))}
                </Stack>
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>
      )}
    </Paper>
  );

  const renderGroupNode = (groupId: string): React.ReactNode => {
    if (!displayedGroupTreeIds.has(groupId)) return null;

    const group = groupsById.get(groupId);
    const children = (groupChildrenByParent.get(groupId) ?? []).filter((id) => displayedGroupTreeIds.has(id));
    const groupActivities = activitiesByGroupId.get(groupId) ?? [];

    return (
      <Accordion key={`group-${groupId}`} disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{group?.name ?? 'Unknown group'}</Typography>
            <Chip size="small" label={`${groupActivities.length} activities`} />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {groupActivities.length > 0 && (
            <Stack spacing={1} sx={{ mb: children.length > 0 ? 1.2 : 0 }}>
              {groupActivities.map((item) => renderActivityCard(item))}
            </Stack>
          )}
          {children.length === 0 && groupActivities.length === 0 ? (
            <Typography color="text.secondary" variant="body2">No activities in this group.</Typography>
          ) : (
            <Stack spacing={1}>
              {children.map((childId) => renderGroupNode(childId))}
            </Stack>
          )}
        </AccordionDetails>
      </Accordion>
    );
  };

  const renderGroupSection = () => (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.2 }}>
        <Diversity3Icon color="primary" />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>By group</Typography>
      </Stack>
      <TextField
        size="small"
        fullWidth
        label="Search in section"
        placeholder="Type group or activity details..."
        value={groupSectionQuery}
        onChange={(e) => setGroupSectionQuery(e.target.value)}
        sx={{ mb: 1.2 }}
      />
      <Divider sx={{ mb: 1.2 }} />
      {displayedRootGroupIds.length === 0 ? (
        <Typography color="text.secondary" variant="body2">No activities in this section.</Typography>
      ) : (
        <Stack spacing={1}>
          {displayedRootGroupIds.map((groupId) => renderGroupNode(groupId))}
        </Stack>
      )}
    </Paper>
  );

  const validateForm = () => {
    const duration = Number(formDurationSlots);
    if (!formCourseId) return 'Course is required.';
    if (!formGroupId) return 'Group is required.';
    if (!Number.isFinite(duration) || duration < 1) return 'Duration slots must be a positive number.';
    return null;
  };

  const handleCreate = async () => {
    if (!canManageInstitution || !institutionId) return;

    const validationError = validateForm();
    if (validationError) {
      setCreateError(validationError);
      return;
    }

    setCreateLoading(true);
    setCreateError(null);
    try {
      await createActivity({
        institution_id: institutionId,
        course_id: formCourseId,
        group_id: formGroupId,
        professor_id: formProfessorId || null,
        activity_type: formActivityType,
        frequency: formFrequency,
        duration_slots: Number(formDurationSlots),
        required_room_features: parseFeatures(formRequiredFeatures),
        selected_timeslot: null,
      });
      setIsCreateOpen(false);
      resetForm();
      await loadData();
    } catch (err) {
      setCreateError((err as Error).message || 'Failed to create activity.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!canManageInstitution || !activityToEdit) return;

    const validationError = validateForm();
    if (validationError) {
      setEditError(validationError);
      return;
    }

    setEditLoading(true);
    setEditError(null);
    try {
      await updateActivity(activityToEdit.id, {
        course_id: formCourseId,
        group_id: formGroupId,
        professor_id: formProfessorId || null,
        activity_type: formActivityType,
        frequency: formFrequency,
        duration_slots: Number(formDurationSlots),
        required_room_features: parseFeatures(formRequiredFeatures),
      });
      setActivityToEdit(null);
      resetForm();
      await loadData();
    } catch (err) {
      setEditError((err as Error).message || 'Failed to update activity.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!canManageInstitution || !activityToDelete) return;

    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteActivity(activityToDelete.id);
      setActivityToDelete(null);
      await loadData();
    } catch (err) {
      setDeleteError((err as Error).message || 'Failed to delete activity.');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading || currentUserLoading) {
    return (
      <PageContainer alignItems="center">
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={24} />
          <Typography>Loading activities...</Typography>
        </Stack>
      </PageContainer>
    );
  }

  return (
    <PageContainer alignItems="flex-start">
      <Box sx={{ width: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, gap: 2, flexWrap: 'wrap' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <EventNoteIcon color="primary" />
            <Typography variant="h4" sx={{ fontWeight: 700 }}>Activities</Typography>
          </Stack>
          {canManageInstitution && (
            <Button
              variant="contained"
              onClick={() => {
                setCreateError(null);
                resetForm();
                setIsCreateOpen(true);
              }}
            >
              Create activity
            </Button>
          )}
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {!error && (
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, mb: 2 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
              <TextField
                size="small"
                fullWidth
                label="Search activities"
                placeholder="Type course/group/professor/type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button variant="outlined" onClick={() => setSearchQuery('')}>Reset</Button>
            </Stack>
          </Paper>
        )}

        {!error && activities.length === 0 && (
          <Typography color="text.secondary">No activities found for this institution.</Typography>
        )}

        {!error && activities.length > 0 && filteredActivities.length === 0 && (
          <Typography color="text.secondary">No activities match the current search/filter.</Typography>
        )}

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: 4 }}>
            {renderGroupSection()}
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }}>
            {renderGroupedSection(
              'By professor',
              activitiesByProfessor,
              professorSectionQuery,
              setProfessorSectionQuery,
              'Type professor or activity details...',
            )}
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }}>
            {renderGroupedSection(
              'By course',
              activitiesByCourse,
              courseSectionQuery,
              setCourseSectionQuery,
              'Type course or activity details...',
            )}
          </Grid>
        </Grid>

        <Dialog open={Boolean(activityToDelete) && canManageInstitution} onClose={() => !deleteLoading && setActivityToDelete(null)} maxWidth="xs" fullWidth>
          <DialogTitle>Delete activity?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete this activity? This action cannot be undone.
            </DialogContentText>
            {deleteError && <Alert severity="error" sx={{ mt: 2 }}>{deleteError}</Alert>}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setActivityToDelete(null)} disabled={deleteLoading}>Cancel</Button>
            <Button onClick={handleDelete} color="error" variant="contained" disabled={deleteLoading}>
              {deleteLoading ? <CircularProgress size={18} color="inherit" /> : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={isCreateOpen && canManageInstitution} onClose={() => !createLoading && setIsCreateOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Create activity</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <TextField select label="Course" value={formCourseId} onChange={(e) => setFormCourseId(e.target.value)} fullWidth disabled={createLoading}>
                {courses.map((course) => {
                  const id = String(course.id ?? course._id ?? '');
                  return <MenuItem key={id} value={id}>{course.name}</MenuItem>;
                })}
              </TextField>
              <TextField select label="Group" value={formGroupId} onChange={(e) => setFormGroupId(e.target.value)} fullWidth disabled={createLoading}>
                {groups.map((group) => {
                  const id = String(group.id ?? group._id ?? '');
                  return <MenuItem key={id} value={id}>{group.name}</MenuItem>;
                })}
              </TextField>
              <TextField select label="Professor" value={formProfessorId} onChange={(e) => setFormProfessorId(e.target.value)} fullWidth disabled={createLoading}>
                <MenuItem value="">Unassigned</MenuItem>
                {users.map((user) => {
                  const id = String(user.id ?? user._id ?? '');
                  const label = `${user.name ?? 'Unknown'}${user.email ? ` (${user.email})` : ''}`;
                  return <MenuItem key={id} value={id}>{label}</MenuItem>;
                })}
              </TextField>
              <TextField select label="Activity type" value={formActivityType} onChange={(e) => setFormActivityType(e.target.value)} fullWidth disabled={createLoading}>
                {ACTIVITY_TYPE_OPTIONS.map((value) => <MenuItem key={value} value={value}>{toTitleLabel(value)}</MenuItem>)}
              </TextField>
              <TextField select label="Frequency" value={formFrequency} onChange={(e) => setFormFrequency(e.target.value)} fullWidth disabled={createLoading}>
                {FREQUENCY_OPTIONS.map((value) => <MenuItem key={value} value={value}>{toTitleLabel(value)}</MenuItem>)}
              </TextField>
              <TextField
                label="Duration slots"
                type="number"
                value={formDurationSlots}
                onChange={(e) => setFormDurationSlots(e.target.value)}
                fullWidth
                disabled={createLoading}
                slotProps={{ htmlInput: { min: 1 } }}
              />
              <TextField
                label="Required room features"
                placeholder="projector, whiteboard"
                value={formRequiredFeatures}
                onChange={(e) => setFormRequiredFeatures(e.target.value)}
                fullWidth
                disabled={createLoading}
              />
            </Stack>
            {createError && <Alert severity="error" sx={{ mt: 2 }}>{createError}</Alert>}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsCreateOpen(false)} disabled={createLoading}>Cancel</Button>
            <Button onClick={handleCreate} variant="contained" disabled={createLoading}>
              {createLoading ? <CircularProgress size={18} color="inherit" /> : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={Boolean(activityToEdit) && canManageInstitution} onClose={() => !editLoading && setActivityToEdit(null)} maxWidth="sm" fullWidth>
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
            <Button onClick={() => setActivityToEdit(null)} disabled={editLoading}>Cancel</Button>
            <Button onClick={handleUpdate} variant="contained" disabled={editLoading}>
              {editLoading ? <CircularProgress size={18} color="inherit" /> : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageContainer>
  );
}















