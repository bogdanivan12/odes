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
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EventNoteRoundedIcon from '@mui/icons-material/EventNoteRounded';
import Diversity3RoundedIcon from '@mui/icons-material/Diversity3Rounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import PageContainer from '../layout/PageContainer';
import EntityStatCard from '../../components/EntityStatCard';
import { compareAlphabetical, toTitleLabel } from '../../utils/text';
import { deleteCourse, getCourseActivities, getCourseById, updateCourse } from '../../api/courses';
import type { CourseActivity } from '../../api/courses';
import { getInstitutionGroups, getInstitutionUsers } from '../../api/institutions';
import type { InstitutionGroup, InstitutionUser } from '../../api/institutions';
import type { Course } from '../../types/course';
import { activityRoute, groupRoute, institutionRoute, memberRoute, INSTITUTIONS_ROUTE } from '../../config/routes';
import { getCurrentUserData, isInstitutionAdmin } from '../../utils/institutionAdmin';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

const activityTypePriority: Record<string, number> = { course: 0, seminar: 1, laboratory: 2 };
const compareActivityTypes = (a: string, b: string) => {
  const aRank = activityTypePriority[a.trim().toLowerCase()] ?? Number.MAX_SAFE_INTEGER;
  const bRank = activityTypePriority[b.trim().toLowerCase()] ?? Number.MAX_SAFE_INTEGER;
  return aRank !== bRank ? aRank - bRank : compareAlphabetical(a, b);
};

export default function CourseMainPage() {
  const theme = useTheme();
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [activities, setActivities] = useState<CourseActivity[]>([]);
  const [groups, setGroups] = useState<InstitutionGroup[]>([]);
  const [users, setUsers] = useState<InstitutionUser[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [relatedError, setRelatedError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<InstitutionUser | null>(null);
  const [currentUserLoading, setCurrentUserLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    if (!courseId) { setLoading(false); setError('Missing course id in route.'); return () => { mounted = false; }; }
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getCourseById(courseId);
        if (!mounted) return;
        setCourse(data);
        setEditName(data.name);
      } catch (err) {
        if (!mounted) return;
        setError((err as Error).message || 'Failed to load course.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [courseId]);

  useEffect(() => {
    let mounted = true;
    if (!course?.id || !course.institution_id) return () => { mounted = false; };
    (async () => {
      setRelatedLoading(true);
      setRelatedError(null);
      try {
        const [courseActivities, institutionGroups, institutionUsers] = await Promise.all([
          getCourseActivities(course.id),
          getInstitutionGroups(course.institution_id),
          getInstitutionUsers(course.institution_id),
        ]);
        if (!mounted) return;
        setActivities(courseActivities);
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
  }, [course?.id, course?.institution_id]);

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

  const canManageCourse = useMemo(() => isInstitutionAdmin(currentUser, course?.institution_id), [currentUser, course?.institution_id]);

  const groupsById = useMemo(() => {
    const map = new Map<string, InstitutionGroup>();
    groups.forEach((g) => map.set(String(g.id ?? g._id ?? ''), g));
    return map;
  }, [groups]);

  const usersById = useMemo(() => {
    const map = new Map<string, { name?: string; email?: string }>();
    users.forEach((u) => map.set(String(u.id ?? u._id ?? ''), { name: u.name, email: u.email }));
    return map;
  }, [users]);

  const relatedGroups = useMemo(() => Array.from(new Set(activities.map((a) => String(a.group_id))))
    .map((gId) => ({ id: gId, name: groupsById.get(gId)?.name ?? 'Unknown group' }))
    .sort((a, b) => compareAlphabetical(a.name, b.name)), [activities, groupsById]);

  const relatedProfessors = useMemo(() => Array.from(new Set(activities.map((a) => String(a.professor_id ?? '')).filter(Boolean)))
    .map((profId) => {
      const u = usersById.get(profId);
      return { id: profId, name: u?.name ?? 'Unknown professor', email: u?.email };
    })
    .sort((a, b) => compareAlphabetical(a.name, b.name)), [activities, usersById]);

  const professorsByActivityType = useMemo(() => {
    const map = new Map<string, Map<string, { professorName: string; professorEmail?: string; groupIds: Set<string> }>>();
    activities.forEach((activity) => {
      const type = activity.activity_type;
      const profId = String(activity.professor_id ?? 'unassigned');
      const u = activity.professor_id ? usersById.get(String(activity.professor_id)) : undefined;
      const professorName = u?.name ?? (activity.professor_id ? String(activity.professor_id) : 'Unassigned');
      if (!map.has(type)) map.set(type, new Map());
      const byProfessor = map.get(type)!;
      if (!byProfessor.has(profId)) byProfessor.set(profId, { professorName, professorEmail: u?.email, groupIds: new Set() });
      byProfessor.get(profId)!.groupIds.add(String(activity.group_id));
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => compareActivityTypes(a, b))
      .map(([activityType, byProfessor]) => ({
        activityType,
        professors: Array.from(byProfessor.entries())
          .map(([professorId, value]) => ({
            professorId,
            professorName: value.professorName,
            professorEmail: value.professorEmail,
            groupIds: Array.from(value.groupIds).sort((a, b) => compareAlphabetical(groupsById.get(a)?.name ?? a, groupsById.get(b)?.name ?? b)),
          }))
          .sort((a, b) => compareAlphabetical(a.professorName, b.professorName)),
      }));
  }, [activities, usersById, groupsById]);

  const groupActivities = useMemo(() => {
    const map = new Map<string, CourseActivity[]>();
    activities.forEach((activity) => {
      const key = String(activity.group_id);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(activity);
    });
    map.forEach((rows) => rows.sort((a, b) => {
      const t = compareActivityTypes(a.activity_type, b.activity_type);
      return t !== 0 ? t : compareAlphabetical(a.frequency, b.frequency);
    }));
    return map;
  }, [activities]);

  const groupChildrenByParent = useMemo(() => {
    const map = new Map<string | null, string[]>();
    groups.forEach((g) => {
      const gId = String(g.id ?? g._id ?? '');
      if (!gId) return;
      const parent = g.parent_group_id ? String(g.parent_group_id) : null;
      if (!map.has(parent)) map.set(parent, []);
      map.get(parent)!.push(gId);
    });
    map.forEach((ids) => ids.sort((a, b) => compareAlphabetical(groupsById.get(a)?.name ?? a, groupsById.get(b)?.name ?? b)));
    return map;
  }, [groups, groupsById]);

  const relatedGroupTreeIds = useMemo(() => {
    const included = new Set<string>(relatedGroups.map((g) => g.id));
    relatedGroups.forEach((g) => {
      let current = groupsById.get(g.id);
      while (current?.parent_group_id) {
        const parentId = String(current.parent_group_id);
        if (included.has(parentId)) break;
        included.add(parentId);
        current = groupsById.get(parentId);
      }
    });
    return included;
  }, [relatedGroups, groupsById]);

  const rootGroupIds = useMemo(() => (groupChildrenByParent.get(null) ?? []).filter((gId) => relatedGroupTreeIds.has(gId)), [groupChildrenByParent, relatedGroupTreeIds]);

  const renderGroupNode = (groupId: string): React.ReactNode => {
    if (!relatedGroupTreeIds.has(groupId)) return null;
    const group = groupsById.get(groupId);
    const children = (groupChildrenByParent.get(groupId) ?? []).filter((childId) => relatedGroupTreeIds.has(childId));
    const groupRows = groupActivities.get(groupId) ?? [];

    const label = (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Diversity3RoundedIcon sx={{ fontSize: '0.85rem', color: 'primary.main' }} />
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{group?.name ?? 'Unknown group'}</Typography>
      </Box>
    );

    const viewBtn = (
      <Button
        size="small"
        startIcon={<OpenInNewRoundedIcon sx={{ fontSize: '0.8rem !important' }} />}
        onClick={(e) => { e.stopPropagation(); navigate(groupRoute(groupId)); }}
        sx={{ borderRadius: 1.5, fontSize: '0.75rem', flexShrink: 0 }}
      >
        Open
      </Button>
    );

    const activityRows = groupRows.length === 0 ? (
      <Typography variant="body2" color="text.secondary">No activities for this group.</Typography>
    ) : (
      <Stack spacing={1}>
        {groupRows.map((activity) => {
          const activityId = String(activity.id ?? activity._id ?? `${activity.group_id}-${activity.activity_type}`);
          const prof = activity.professor_id ? usersById.get(String(activity.professor_id)) : undefined;
          const professorName = prof?.name ?? 'Unassigned';
          const professorId = activity.professor_id ? String(activity.professor_id) : '';
          return (
            <Box
              key={activityId}
              onClick={() => navigate(activityRoute(activityId))}
              sx={{
                p: 1.25, borderRadius: 2, border: '1px solid', borderColor: 'divider', cursor: 'pointer',
                transition: 'border-color 150ms ease, background 150ms ease',
                '&:hover': { borderColor: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.04) },
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {`${toTitleLabel(activity.activity_type)} · ${toTitleLabel(activity.frequency)}`}
              </Typography>
              <Typography
                variant="caption"
                color={professorId ? 'primary.main' : 'text.secondary'}
                sx={{ cursor: professorId ? 'pointer' : 'default' }}
                onClick={(e) => { if (professorId) { e.stopPropagation(); navigate(memberRoute(professorId)); } }}
              >
                {professorName}{prof?.email ? ` (${prof.email})` : ''}
              </Typography>
            </Box>
          );
        })}
      </Stack>
    );

    return (
      <Accordion
        key={groupId}
        disableGutters
        elevation={0}
        sx={{
          border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden',
          '&:before': { display: 'none' },
          '&.Mui-expanded': { borderColor: alpha(theme.palette.primary.main, 0.3) },
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon sx={{ fontSize: '1rem' }} />}
          sx={{ px: 1.5, py: 0.5, minHeight: 40, '& .MuiAccordionSummary-content': { my: 0.5 } }}
        >
          <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, pr: 1 }}>
            {label}
            {viewBtn}
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 1.5, pb: 1.5, pt: 0 }}>
          <Stack spacing={1.5}>
            {activityRows}
            {children.length > 0 && (
              <Stack spacing={1}>
                {children.map((childId) => renderGroupNode(childId))}
              </Stack>
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>
    );
  };

  const handleUpdate = async () => {
    if (!canManageCourse || !course) return;
    const name = editName.trim();
    if (!name) { setEditError('Course name is required.'); return; }
    setEditLoading(true);
    setEditError(null);
    try {
      const updated = await updateCourse(course.id, { name });
      setCourse(updated);
      setEditOpen(false);
    } catch (err) {
      setEditError((err as Error).message || 'Failed to update course.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!canManageCourse || !course) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteCourse(course.id);
      navigate(course.institution_id ? institutionRoute(course.institution_id) : INSTITUTIONS_ROUTE, { replace: true });
    } catch (err) {
      setDeleteError((err as Error).message || 'Failed to delete course.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const backRoute = course?.institution_id ? `${institutionRoute(course.institution_id)}/courses` : INSTITUTIONS_ROUTE;

  if (loading || currentUserLoading) {
    return (
      <PageContainer alignItems="center">
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={22} />
          <Typography color="text.secondary">Loading course...</Typography>
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

  if (!course) {
    return (
      <PageContainer alignItems="flex-start">
        <Alert severity="warning" sx={{ width: '100%', borderRadius: 2 }}>Course data is unavailable.</Alert>
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
          Courses
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
                    <MenuBookRoundedIcon />
                  </Box>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2 }}>{course.name}</Typography>
                    {course.institution_id && (
                      <Typography
                        variant="body2" color="primary.main"
                        sx={{ cursor: 'pointer', fontWeight: 500, mt: 0.25 }}
                        onClick={() => navigate(institutionRoute(course.institution_id))}
                      >
                        View institution
                      </Typography>
                    )}
                  </Box>
                </Box>
                {canManageCourse && (
                  <Stack direction="row" spacing={1}>
                    <Button variant="outlined" startIcon={<EditRoundedIcon />} onClick={() => { setEditError(null); setEditName(course.name); setEditOpen(true); }} sx={{ borderRadius: 2 }}>
                      Edit
                    </Button>
                    <Button variant="outlined" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => { setDeleteError(null); setDeleteOpen(true); }} sx={{ borderRadius: 2 }}>
                      Delete
                    </Button>
                  </Stack>
                )}
              </Box>
            </Box>
          </Paper>

          {/* Stat cards */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <EntityStatCard icon={<EventNoteRoundedIcon fontSize="small" />} label="Activities" value={activities.length} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <EntityStatCard icon={<Diversity3RoundedIcon fontSize="small" />} label="Groups" value={relatedGroups.length} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <EntityStatCard icon={<SchoolRoundedIcon fontSize="small" />} label="Professors" value={relatedProfessors.length} />
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
            <Grid container spacing={2.5}>
              {/* Professors by activity type */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', height: '100%' }}>
                  <Box sx={{ height: 3, background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})` }} />
                  <Box sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Professors by type</Typography>
                      <Typography variant="caption" color="text.secondary">{relatedProfessors.length} total</Typography>
                    </Box>
                    {professorsByActivityType.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 3 }}>
                        <SchoolRoundedIcon sx={{ fontSize: '2rem', color: 'text.disabled', mb: 1 }} />
                        <Typography variant="body2" color="text.secondary">No professor assignments found.</Typography>
                      </Box>
                    ) : (
                      <Stack spacing={1.5}>
                        {professorsByActivityType.map((entry) => (
                          <Box key={entry.activityType} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                            <Chip label={toTitleLabel(entry.activityType)} size="small" color="primary" variant="outlined" sx={{ mb: 1, fontSize: '0.72rem', height: 22 }} />
                            <Stack spacing={0.75}>
                              {entry.professors.map((professor) => (
                                <Box key={`${entry.activityType}-${professor.professorId}`}>
                                  <Typography
                                    variant="body2"
                                    sx={{ fontWeight: 500, cursor: professor.professorId !== 'unassigned' ? 'pointer' : 'default', color: professor.professorId !== 'unassigned' ? 'primary.main' : 'text.primary' }}
                                    onClick={() => professor.professorId !== 'unassigned' && navigate(memberRoute(professor.professorId))}
                                  >
                                    {professor.professorName}{professor.professorEmail ? ` (${professor.professorEmail})` : ''}
                                  </Typography>
                                  <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mt: 0.5 }}>
                                    {professor.groupIds.map((groupId) => (
                                      <Chip
                                        key={`${entry.activityType}-${professor.professorId}-${groupId}`}
                                        label={groupsById.get(groupId)?.name ?? 'Unknown'}
                                        size="small"
                                        variant="outlined"
                                        clickable
                                        onClick={() => navigate(groupRoute(groupId))}
                                        sx={{ fontSize: '0.68rem', height: 20 }}
                                      />
                                    ))}
                                  </Stack>
                                </Box>
                              ))}
                            </Stack>
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </Box>
                </Paper>
              </Grid>

              {/* Groups tree */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', height: '100%' }}>
                  <Box sx={{ height: 3, background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})` }} />
                  <Box sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Groups</Typography>
                      <Typography variant="caption" color="text.secondary">{relatedGroups.length} total</Typography>
                    </Box>
                    {relatedGroups.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 3 }}>
                        <Diversity3RoundedIcon sx={{ fontSize: '2rem', color: 'text.disabled', mb: 1 }} />
                        <Typography variant="body2" color="text.secondary">No groups linked to this course.</Typography>
                      </Box>
                    ) : (
                      <Stack spacing={1}>
                        {rootGroupIds.map((groupId) => renderGroupNode(groupId))}
                      </Stack>
                    )}
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          )}
        </Stack>
      </Box>

      {/* Delete dialog */}
      <Dialog open={deleteOpen && canManageCourse} onClose={() => !deleteLoading && setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete course?</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure you want to delete <strong>{course.name}</strong>? This action cannot be undone.</DialogContentText>
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
      <Dialog open={editOpen && canManageCourse} onClose={() => !editLoading && setEditOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit course</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 0.5 }}>
            <TextField label="Course name" value={editName} onChange={(e) => setEditName(e.target.value)} fullWidth autoFocus disabled={editLoading} />
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
