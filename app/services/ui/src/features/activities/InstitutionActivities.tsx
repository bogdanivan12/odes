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
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EventNoteIcon from '@mui/icons-material/EventNote';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import SchoolIcon from '@mui/icons-material/School';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchIcon from '@mui/icons-material/Search';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import PageContainer from '../layout/PageContainer';
import { createActivity, deleteActivity, updateActivity } from '../../api/activities';
import { getInstitutionActivities, getInstitutionCourses, getInstitutionGroups, getInstitutionUsers } from '../../api/institutions';
import type { InstitutionCourse, InstitutionGroup, InstitutionUser } from '../../api/institutions';
import type { Activity } from '../../types/activity';
import { activityRoute } from '../../config/routes';
import { compareAlphabetical, toTitleLabel } from '../../utils/text';
import { parseFeatures, featuresToInput } from '../../utils/roomFeatures';
import { getCurrentUserData, isInstitutionAdmin } from '../../utils/institutionAdmin';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

const ACTIVITY_TYPE_OPTIONS = ['course', 'seminar', 'laboratory', 'other'];
const FREQUENCY_OPTIONS = ['weekly', 'biweekly', 'biweekly_odd', 'biweekly_even'];

export default function InstitutionActivities() {
  const theme = useTheme();
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

  const populateEditForm = (a: Activity) => {
    setFormCourseId(String(a.course_id));
    setFormGroupId(String(a.group_id));
    setFormProfessorId(a.professor_id ? String(a.professor_id) : '');
    setFormActivityType(a.activity_type);
    setFormFrequency(a.frequency);
    setFormDurationSlots(String(a.duration_slots));
    setFormRequiredFeatures(featuresToInput(a.required_room_features ?? []));
  };

  const loadData = async () => {
    if (!institutionId) { setError('Missing institution id in route.'); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const [institutionActivities, institutionCourses, institutionGroups, institutionUsers] = await Promise.all([
        getInstitutionActivities(institutionId),
        getInstitutionCourses(institutionId),
        getInstitutionGroups(institutionId),
        getInstitutionUsers(institutionId),
      ]);
      const normalized = institutionActivities.map((a) => ({ ...a, id: String(a.id ?? a._id ?? '') })) as Activity[];
      setActivities([...normalized].sort((a, b) => compareAlphabetical(String(a.course_id), String(b.course_id))));
      setCourses([...institutionCourses].sort((a, b) => compareAlphabetical(a.name, b.name)));
      setGroups([...institutionGroups].sort((a, b) => compareAlphabetical(a.name, b.name)));
      setUsers([...institutionUsers].sort((a, b) => compareAlphabetical(a.name ?? '', b.name ?? '')));
    } catch (err) {
      setError((err as Error).message || 'Failed to load activities.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [institutionId]);

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

  const canManageInstitution = useMemo(() => isInstitutionAdmin(currentUser, institutionId), [currentUser, institutionId]);

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

  const getActivityId = (a: Activity): string => String(a.id ?? '');

  const getActivitySearchText = (a: Activity): string => {
    const courseName = coursesById.get(String(a.course_id))?.name ?? '';
    const groupName = groupsById.get(String(a.group_id))?.name ?? '';
    const professor = a.professor_id ? usersById.get(String(a.professor_id)) : undefined;
    return `${courseName} ${groupName} ${professor?.name ?? ''} ${a.activity_type} ${a.frequency}`.toLowerCase();
  };

  const filteredActivities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return activities;
    return activities.filter((a) => getActivitySearchText(a).includes(q));
  }, [activities, searchQuery, coursesById, groupsById, usersById]);

  const groupChildrenByParent = useMemo(() => {
    const map = new Map<string | null, string[]>();
    groups.forEach((g) => {
      const id = String(g.id ?? g._id ?? '');
      if (!id) return;
      const parentId = g.parent_group_id ? String(g.parent_group_id) : null;
      if (!map.has(parentId)) map.set(parentId, []);
      map.get(parentId)!.push(id);
    });
    map.forEach((ids) => ids.sort((a, b) => compareAlphabetical(groupsById.get(a)?.name ?? a, groupsById.get(b)?.name ?? b)));
    return map;
  }, [groups, groupsById]);

  const groupSectionActivities = useMemo(() => {
    const q = groupSectionQuery.trim().toLowerCase();
    if (!q) return filteredActivities;
    return filteredActivities.filter((a) => {
      const groupName = groupsById.get(String(a.group_id))?.name ?? '';
      return groupName.toLowerCase().includes(q) || getActivitySearchText(a).includes(q);
    });
  }, [filteredActivities, groupSectionQuery, groupsById]);

  const activitiesByGroupId = useMemo(() => {
    const map = new Map<string, Activity[]>();
    groupSectionActivities.forEach((a) => {
      const key = String(a.group_id);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    return map;
  }, [groupSectionActivities]);

  const displayedGroupTreeIds = useMemo(() => {
    const included = new Set<string>(Array.from(activitiesByGroupId.keys()));
    const q = groupSectionQuery.trim().toLowerCase();
    if (q) {
      groups.forEach((g) => {
        const id = String(g.id ?? g._id ?? '');
        if (id && (g.name ?? '').toLowerCase().includes(q)) included.add(id);
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
    filteredActivities.forEach((a) => {
      const key = String(a.professor_id ?? 'unassigned');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    const q = professorSectionQuery.trim().toLowerCase();
    return Array.from(map.entries())
      .sort(([aId], [bId]) => {
        const aName = aId === 'unassigned' ? 'Unassigned' : (usersById.get(aId)?.name ?? '');
        const bName = bId === 'unassigned' ? 'Unassigned' : (usersById.get(bId)?.name ?? '');
        return compareAlphabetical(aName, bName);
      })
      .map(([professorId, rows]) => {
        const user = usersById.get(professorId);
        const name = professorId === 'unassigned' ? 'Unassigned' : (user?.name ?? 'Unknown professor');
        const email = user?.email;
        const label = name.length > 24 ? `${name.slice(0, 24)}…` : name;
        const sublabel = email;
        const rowActivities = [...rows].sort((a, b) => compareAlphabetical(getActivityId(a), getActivityId(b)));
        if (q && !name.toLowerCase().includes(q) && !(email ?? '').toLowerCase().includes(q) && !rowActivities.some((a) => getActivitySearchText(a).includes(q))) return null;
        return { key: professorId, label, sublabel, activities: rowActivities };
      })
      .filter(Boolean) as Array<{ key: string; label: string; sublabel?: string; activities: Activity[] }>;
  }, [filteredActivities, usersById, professorSectionQuery]);

  const activitiesByCourse = useMemo(() => {
    const map = new Map<string, Activity[]>();
    filteredActivities.forEach((a) => {
      const key = String(a.course_id);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    const q = courseSectionQuery.trim().toLowerCase();
    return Array.from(map.entries())
      .sort(([aId], [bId]) => compareAlphabetical(coursesById.get(aId)?.name ?? '', coursesById.get(bId)?.name ?? ''))
      .map(([courseId, rows]) => {
        const label = coursesById.get(courseId)?.name ?? 'Unknown course';
        const rowActivities = [...rows].sort((a, b) => compareAlphabetical(getActivityId(a), getActivityId(b)));
        if (q && !label.toLowerCase().includes(q) && !rowActivities.some((a) => getActivitySearchText(a).includes(q))) return null;
        return { key: courseId, label, activities: rowActivities };
      })
      .filter(Boolean) as Array<{ key: string; label: string; sublabel?: string; activities: Activity[] }>;
  }, [filteredActivities, coursesById, courseSectionQuery]);

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
    if (validationError) { setCreateError(validationError); return; }
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
    if (validationError) { setEditError(validationError); return; }
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

  const accordionSx = {
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: 2,
    overflow: 'hidden',
    '&:before': { display: 'none' },
    '&.Mui-expanded': { borderColor: alpha(theme.palette.primary.main, 0.4) },
  };

  const summarySx = {
    px: 1.5, py: 0.5, minHeight: 40,
    '& .MuiAccordionSummary-content': { my: 0.5 },
  };

  const renderActivityRow = (activity: Activity): React.ReactNode => {
    const id = getActivityId(activity);
    const courseName = coursesById.get(String(activity.course_id))?.name ?? 'Unknown course';
    const groupName = groupsById.get(String(activity.group_id))?.name ?? 'Unknown group';
    const professor = activity.professor_id ? usersById.get(String(activity.professor_id)) : undefined;
    const professorName = professor?.name ?? 'Unassigned';

    return (
      <Box
        key={id || `${activity.course_id}-${activity.group_id}-${activity.activity_type}`}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 0.9,
          border: '1px solid', borderColor: 'divider', borderRadius: 2,
          transition: 'border-color 150ms ease',
          '&:hover': { borderColor: 'primary.light' },
        }}
      >
        <Box sx={{
          width: 28, height: 28, borderRadius: 1.5, flexShrink: 0,
          bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <EventNoteIcon sx={{ fontSize: '0.85rem' }} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: id ? 'pointer' : 'default', '&:hover': id ? { color: 'primary.main' } : {} }}
            onClick={() => id && navigate(activityRoute(id))}
          >
            {toTitleLabel(activity.activity_type)} · {toTitleLabel(activity.frequency)}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
            {courseName} · {groupName} · {professorName}
          </Typography>
        </Box>
        {canManageInstitution && (
          <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
            <Tooltip title="Edit">
              <IconButton size="small" sx={{ borderRadius: 1.5 }} onClick={() => { setEditError(null); setActivityToEdit(activity); populateEditForm(activity); }}>
                <EditRoundedIcon sx={{ fontSize: '0.85rem' }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton size="small" color="error" sx={{ borderRadius: 1.5 }} onClick={() => { setDeleteError(null); setActivityToDelete(activity); }}>
                <DeleteOutlineRoundedIcon sx={{ fontSize: '0.85rem' }} />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      </Box>
    );
  };

  const renderGroupNode = (groupId: string, depth = 0): React.ReactNode => {
    if (!displayedGroupTreeIds.has(groupId)) return null;
    const group = groupsById.get(groupId);
    const children = (groupChildrenByParent.get(groupId) ?? []).filter((id) => displayedGroupTreeIds.has(id));
    const groupActivities = activitiesByGroupId.get(groupId) ?? [];

    return (
      <Box
        key={`group-${groupId}`}
        sx={{
          ml: depth > 0 ? 2 : 0,
          borderLeft: depth > 0 ? `2px solid ${alpha(theme.palette.primary.main, 0.15)}` : 'none',
          pl: depth > 0 ? 1.5 : 0,
        }}
      >
        <Accordion disableGutters elevation={0} sx={accordionSx}>
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />} sx={summarySx}>
            <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, pr: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {group?.name ?? 'Unknown group'}
              </Typography>
              <Chip size="small" label={groupActivities.length} sx={{ height: 18, fontSize: '0.7rem', flexShrink: 0 }} />
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 1, pb: 1, pt: 0 }}>
            {groupActivities.length === 0 && children.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 0.5, pl: 0.5 }}>No activities.</Typography>
            ) : (
              <Stack spacing={0.5}>
                {groupActivities.map(renderActivityRow)}
                {children.map((childId) => renderGroupNode(childId, depth + 1))}
              </Stack>
            )}
          </AccordionDetails>
        </Accordion>
      </Box>
    );
  };

  const iconBox = (icon: React.ReactNode) => (
    <Box sx={{
      width: 28, height: 28, borderRadius: 1.5, flexShrink: 0,
      bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {icon}
    </Box>
  );

  const renderSection = (
    title: string,
    icon: React.ReactNode,
    query: string,
    setQuery: (v: string) => void,
    placeholder: string,
    content: React.ReactNode,
  ) => (
    <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
      <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        {iconBox(icon)}
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{title}</Typography>
      </Box>
      <Box sx={{ px: 1.5, py: 1.25, borderBottom: '1px solid', borderColor: 'divider' }}>
        <TextField
          size="small" fullWidth placeholder={placeholder} value={query}
          onChange={(e) => setQuery(e.target.value)}
          slotProps={{ input: { startAdornment: <SearchIcon sx={{ fontSize: '0.9rem', mr: 0.75, color: 'text.disabled' }} /> } }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />
      </Box>
      <Box sx={{ p: 1.5 }}>{content}</Box>
    </Paper>
  );

  const renderGroupedList = (grouped: Array<{ key: string; label: string; sublabel?: string; activities: Activity[] }>) => {
    if (grouped.length === 0) return <Typography variant="body2" color="text.secondary">No activities in this section.</Typography>;
    return (
      <Stack spacing={0.75}>
        {grouped.map((entity) => (
          <Accordion key={entity.key} disableGutters elevation={0} sx={accordionSx}>
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />} sx={{ ...summarySx, minHeight: entity.sublabel ? 48 : 40 }}>
              <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, pr: 1 }}>
                <Box sx={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entity.label}
                  </Typography>
                  {entity.sublabel && (
                    <Typography variant="caption" color="text.secondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                      {entity.sublabel}
                    </Typography>
                  )}
                </Box>
                <Chip size="small" label={entity.activities.length} sx={{ height: 18, fontSize: '0.7rem', flexShrink: 0 }} />
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 1, pb: 1, pt: 0 }}>
              <Stack spacing={0.5}>
                {entity.activities.map(renderActivityRow)}
              </Stack>
            </AccordionDetails>
          </Accordion>
        ))}
      </Stack>
    );
  };

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

  if (loading || currentUserLoading) {
    return (
      <PageContainer alignItems="center">
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={22} />
          <Typography color="text.secondary">Loading activities...</Typography>
        </Stack>
      </PageContainer>
    );
  }

  return (
    <PageContainer alignItems="flex-start">
      <Box sx={{ width: '100%', maxWidth: 1100, mx: 'auto' }}>
        <Stack spacing={3}>

          {/* Page header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>Activities</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {activities.length} activit{activities.length !== 1 ? 'ies' : 'y'} in this institution
              </Typography>
            </Box>
            {canManageInstitution && (
              <Button
                variant="contained"
                startIcon={<AddRoundedIcon />}
                onClick={() => { setCreateError(null); resetForm(); setIsCreateOpen(true); }}
                sx={{ borderRadius: 2 }}
              >
                New activity
              </Button>
            )}
          </Box>

          {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}

          {/* Global search */}
          {!error && (
            <TextField
              size="small" fullWidth
              placeholder="Search by course, group, professor or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              slotProps={{ input: { startAdornment: <SearchIcon sx={{ fontSize: '1rem', mr: 0.75, color: 'text.disabled' }} /> } }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          )}

          {/* Empty state */}
          {!error && activities.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Box sx={{ display: 'inline-flex', p: 2, borderRadius: 4, bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main', mb: 2 }}>
                <EventNoteIcon sx={{ fontSize: '2.5rem' }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>No activities yet</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Create activities to start building the schedule.
              </Typography>
              {canManageInstitution && (
                <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => { setCreateError(null); resetForm(); setIsCreateOpen(true); }} sx={{ borderRadius: 2 }}>
                  New activity
                </Button>
              )}
            </Box>
          )}

          {!error && activities.length > 0 && filteredActivities.length === 0 && (
            <Typography variant="body2" color="text.secondary">No activities match &ldquo;{searchQuery}&rdquo;.</Typography>
          )}

          {/* Sections */}
          {!error && activities.length > 0 && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, lg: 4 }}>
                {renderSection(
                  'By group',
                  <Diversity3Icon sx={{ fontSize: '0.9rem' }} />,
                  groupSectionQuery,
                  setGroupSectionQuery,
                  'Search groups or activities...',
                  displayedRootGroupIds.length === 0
                    ? <Typography variant="body2" color="text.secondary">No activities in this section.</Typography>
                    : <Stack spacing={0.75}>{displayedRootGroupIds.map((id) => renderGroupNode(id))}</Stack>,
                )}
              </Grid>
              <Grid size={{ xs: 12, lg: 4 }}>
                {renderSection(
                  'By professor',
                  <SchoolIcon sx={{ fontSize: '0.9rem' }} />,
                  professorSectionQuery,
                  setProfessorSectionQuery,
                  'Search professors or activities...',
                  renderGroupedList(activitiesByProfessor),
                )}
              </Grid>
              <Grid size={{ xs: 12, lg: 4 }}>
                {renderSection(
                  'By course',
                  <MenuBookIcon sx={{ fontSize: '0.9rem' }} />,
                  courseSectionQuery,
                  setCourseSectionQuery,
                  'Search courses or activities...',
                  renderGroupedList(activitiesByCourse),
                )}
              </Grid>
            </Grid>
          )}

        </Stack>
      </Box>

      {/* Delete dialog */}
      <Dialog open={Boolean(activityToDelete) && canManageInstitution} onClose={() => !deleteLoading && setActivityToDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete activity?</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure you want to delete this activity? This action cannot be undone.</DialogContentText>
          {deleteError && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{deleteError}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setActivityToDelete(null)} disabled={deleteLoading} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={deleteLoading} sx={{ borderRadius: 2 }}>
            {deleteLoading ? <CircularProgress size={18} color="inherit" /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={isCreateOpen && canManageInstitution} onClose={() => !createLoading && setIsCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>New activity</DialogTitle>
        <DialogContent>
          {formFields(createLoading)}
          {createError && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{createError}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setIsCreateOpen(false)} disabled={createLoading} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleCreate} variant="contained" disabled={createLoading} sx={{ borderRadius: 2 }}>
            {createLoading ? <CircularProgress size={18} color="inherit" /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={Boolean(activityToEdit) && canManageInstitution} onClose={() => !editLoading && setActivityToEdit(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit activity</DialogTitle>
        <DialogContent>
          {formFields(editLoading)}
          {editError && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{editError}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setActivityToEdit(null)} disabled={editLoading} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleUpdate} variant="contained" disabled={editLoading} sx={{ borderRadius: 2 }}>
            {editLoading ? <CircularProgress size={18} color="inherit" /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
