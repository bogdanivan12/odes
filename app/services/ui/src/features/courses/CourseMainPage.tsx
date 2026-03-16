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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EventNoteIcon from '@mui/icons-material/EventNote';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import SchoolIcon from '@mui/icons-material/School';
import PageContainer from '../layout/PageContainer';
import EntityStatCard from '../../components/EntityStatCard';
import { compareAlphabetical, toTitleLabel } from '../../utils/text';
import { clickableEntitySx, clickableSecondaryEntitySx } from '../../utils/clickableEntity';
import { deleteCourse, getCourseActivities, getCourseById, updateCourse } from '../../api/courses';
import type { CourseActivity } from '../../api/courses';
import { getInstitutionGroups, getInstitutionUsers } from '../../api/institutions';
import type { InstitutionGroup, InstitutionUser } from '../../api/institutions';
import type { Course } from '../../types/course';
import { activityRoute, groupRoute, institutionRoute, memberRoute, INSTITUTIONS_ROUTE } from '../../config/routes';
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

export default function CourseMainPage() {
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

    if (!courseId) {
      setLoading(false);
      setError('Missing course id in route.');
      return () => {
        mounted = false;
      };
    }

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

    return () => {
      mounted = false;
    };
  }, [courseId]);

  useEffect(() => {
    let mounted = true;

    if (!course?.id || !course.institution_id) {
      return () => {
        mounted = false;
      };
    }

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

    return () => {
      mounted = false;
    };
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

    return () => {
      mounted = false;
    };
  }, []);

  const canManageCourse = useMemo(() => isInstitutionAdmin(currentUser, course?.institution_id), [currentUser, course?.institution_id]);

  const groupsById = useMemo(() => {
    const map = new Map<string, InstitutionGroup>();
    groups.forEach((group) => map.set(String(group.id ?? group._id ?? ''), group));
    return map;
  }, [groups]);

  const usersById = useMemo(() => {
    const map = new Map<string, { name?: string; email?: string }>();
    users.forEach((user) => map.set(String(user.id ?? user._id ?? ''), { name: user.name, email: user.email }));
    return map;
  }, [users]);

  const relatedGroups = useMemo(() => Array.from(new Set(activities.map((a) => String(a.group_id))))
    .map((groupId) => ({
      id: groupId,
      name: groupsById.get(groupId)?.name ?? groupId,
    }))
    .sort((a, b) => compareAlphabetical(a.name, b.name)), [activities, groupsById]);

  const relatedProfessors = useMemo(() => Array.from(new Set(activities.map((a) => String(a.professor_id ?? '')).filter(Boolean)))
    .map((profId) => {
      const user = usersById.get(profId);
      return {
        id: profId,
        name: user?.name ?? 'Unknown professor',
        email: user?.email,
      };
    })
    .sort((a, b) => compareAlphabetical(a.name, b.name)), [activities, usersById]);

  const professorsByActivityType = useMemo(() => {
    const map = new Map<string, Map<string, { professorName: string; professorEmail?: string; groupIds: Set<string> }>>();

    activities.forEach((activity) => {
      const type = activity.activity_type;
      const profId = String(activity.professor_id ?? 'unassigned');
      const user = activity.professor_id ? usersById.get(String(activity.professor_id)) : undefined;
      const professorName = user?.name ?? (activity.professor_id ? String(activity.professor_id) : 'Unassigned');
      const professorEmail = user?.email;

      if (!map.has(type)) map.set(type, new Map());
      const byProfessor = map.get(type)!;
      if (!byProfessor.has(profId)) {
        byProfessor.set(profId, { professorName, professorEmail, groupIds: new Set() });
      }
      byProfessor.get(profId)!.groupIds.add(String(activity.group_id));
    });

    return Array.from(map.entries())
      .sort(([aType], [bType]) => compareActivityTypes(aType, bType))
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
    map.forEach((groupRows) => {
      groupRows.sort((a, b) => {
        const typeCompare = compareActivityTypes(a.activity_type, b.activity_type);
        if (typeCompare !== 0) return typeCompare;
        const frequencyCompare = compareAlphabetical(a.frequency, b.frequency);
        if (frequencyCompare !== 0) return frequencyCompare;
        return compareAlphabetical(String(a.id ?? a._id ?? ''), String(b.id ?? b._id ?? ''));
      });
    });
    return map;
  }, [activities]);

  const groupChildrenByParent = useMemo(() => {
    const map = new Map<string | null, string[]>();
    groups.forEach((group) => {
      const groupId = String(group.id ?? group._id ?? '');
      if (!groupId) return;
      const parent = group.parent_group_id ? String(group.parent_group_id) : null;
      if (!map.has(parent)) map.set(parent, []);
      map.get(parent)!.push(groupId);
    });

    map.forEach((ids) => {
      ids.sort((a, b) => {
        const aName = groupsById.get(a)?.name ?? a;
        const bName = groupsById.get(b)?.name ?? b;
        return aName.localeCompare(bName);
      });
    });

    return map;
  }, [groups, groupsById]);

  const relatedGroupTreeIds = useMemo(() => {
    const included = new Set<string>(relatedGroups.map((group) => group.id));

    // Include ancestors so related groups can be displayed in a proper hierarchy.
    relatedGroups.forEach((group) => {
      let current = groupsById.get(group.id);
      while (current?.parent_group_id) {
        const parentId = String(current.parent_group_id);
        if (included.has(parentId)) break;
        included.add(parentId);
        current = groupsById.get(parentId);
      }
    });

    return included;
  }, [relatedGroups, groupsById]);

  const rootGroupIds = useMemo(() => {
    const roots = groupChildrenByParent.get(null) ?? [];
    return roots.filter((groupId) => relatedGroupTreeIds.has(groupId));
  }, [groupChildrenByParent, relatedGroupTreeIds]);

  const renderGroupNode = (groupId: string): React.ReactNode => {
    if (!relatedGroupTreeIds.has(groupId)) return null;
    const group = groupsById.get(groupId);
    const children = (groupChildrenByParent.get(groupId) ?? []).filter((childId) => relatedGroupTreeIds.has(childId));
    const groupRows = groupActivities.get(groupId) ?? [];

    return (
      <Accordion key={groupId} disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {group?.name ?? groupId}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={(event) => {
                event.stopPropagation();
                navigate(groupRoute(groupId));
              }}
            >
              View
            </Button>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {groupRows.length === 0 ? (
            <Typography color="text.secondary" variant="body2">No activities for this group.</Typography>
          ) : (
            <Stack spacing={1} sx={{ mb: children.length > 0 ? 1.5 : 0 }}>
              {groupRows.map((activity) => {
                const activityId = String(activity.id ?? activity._id ?? `${activity.group_id}-${activity.activity_type}`);
                const prof = activity.professor_id ? usersById.get(String(activity.professor_id)) : undefined;
                const professorName = prof?.name ?? String(activity.professor_id ?? 'Unassigned');
                const professorEmail = prof?.email;
                const professorId = activity.professor_id ? String(activity.professor_id) : '';
                return (
                  <Box key={activityId} sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        ...clickableEntitySx,
                        display: 'flex',
                        fontWeight: 700,
                      }}
                      onClick={() => navigate(activityRoute(activityId))}
                    >
                      {`${toTitleLabel(activity.activity_type)} (${toTitleLabel(activity.frequency)})`}
                    </Typography>
                    {professorEmail ? (
                      <Typography
                        variant="caption"
                        sx={{
                          ...(professorId ? clickableSecondaryEntitySx : {}),
                          display: 'flex',
                          mt: 0.4,
                          cursor: professorId ? 'pointer' : 'default',
                        }}
                        onClick={() => professorId && navigate(memberRoute(professorId))}
                      >
                        {`Professor: ${professorName} (${professorEmail})`}
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {`Professor: ${professorName}`}
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Stack>
          )}

          {children.length > 0 && (
            <Stack spacing={1}>
              {children.map((childId) => renderGroupNode(childId))}
            </Stack>
          )}
        </AccordionDetails>
      </Accordion>
    );
  };

  const handleUpdate = async () => {
    if (!canManageCourse) return;
    if (!course) return;
    const name = editName.trim();
    if (!name) {
      setEditError('Course name is required.');
      return;
    }

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
    if (!canManageCourse) return;
    if (!course) return;
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

  if (loading || currentUserLoading) {
    return (
      <PageContainer alignItems="center">
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={24} />
          <Typography>Loading course...</Typography>
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

  if (!course) {
    return (
      <PageContainer alignItems="flex-start">
        <Alert severity="warning" sx={{ width: '100%' }}>Course data is unavailable.</Alert>
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
            <Typography variant="h4" sx={{ fontWeight: 800 }}>{course.name}</Typography>
            {canManageCourse && (
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" onClick={() => { setEditError(null); setEditName(course.name); setEditOpen(true); }}>Edit</Button>
                <Button variant="outlined" color="error" onClick={() => { setDeleteError(null); setDeleteOpen(true); }}>
                  Delete
                </Button>
              </Stack>
            )}
          </Box>
        </Paper>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <EntityStatCard icon={<EventNoteIcon fontSize="small" />} label="Activities" value={activities.length} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <EntityStatCard icon={<Diversity3Icon fontSize="small" />} label="Groups" value={relatedGroups.length} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <EntityStatCard icon={<SchoolIcon fontSize="small" />} label="Professors" value={relatedProfessors.length} />
          </Grid>
        </Grid>

        {relatedLoading && (
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <CircularProgress size={18} />
              <Typography>Loading course dashboard data...</Typography>
            </Stack>
          </Paper>
        )}
        {relatedError && <Alert severity="error">{relatedError}</Alert>}

        {!relatedLoading && !relatedError && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                  Professors by activity type
                </Typography>
                <Divider sx={{ mb: 1.5 }} />
                {professorsByActivityType.length === 0 ? (
                  <Typography color="text.secondary" variant="body2">No professor activity assignments found.</Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {professorsByActivityType.map((entry) => (
                      <Box key={entry.activityType} sx={{ p: 1.2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.8 }}>{toTitleLabel(entry.activityType)}</Typography>
                        <Stack spacing={0.8}>
                          {entry.professors.map((professor) => (
                            <Box key={`${entry.activityType}-${professor.professorId}`}>
                              {professor.professorEmail ? (
                                <Typography
                                  variant="body2"
                                  onClick={() => professor.professorId !== 'unassigned' && navigate(memberRoute(professor.professorId))}
                                  sx={{
                                    ...(professor.professorId !== 'unassigned' ? clickableEntitySx : {}),
                                    cursor: professor.professorId !== 'unassigned' ? 'pointer' : 'default',
                                  }}
                                >
                                  {`${professor.professorName} (${professor.professorEmail})`}
                                </Typography>
                              ) : (
                                <Typography
                                  variant="body2"
                                  onClick={() => professor.professorId !== 'unassigned' && navigate(memberRoute(professor.professorId))}
                                  sx={{
                                    ...(professor.professorId !== 'unassigned' ? clickableEntitySx : {}),
                                    cursor: professor.professorId !== 'unassigned' ? 'pointer' : 'default',
                                  }}
                                >
                                  {professor.professorName}
                                </Typography>
                              )}
                              <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap" sx={{ mt: 0.3 }}>
                                {professor.groupIds.map((groupId) => (
                                  <Chip
                                    key={`${entry.activityType}-${professor.professorId}-${groupId}`}
                                    label={groupsById.get(groupId)?.name ?? groupId}
                                    size="small"
                                    clickable
                                    onClick={() => navigate(groupRoute(groupId))}
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
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                  Groups
                </Typography>
                <Divider sx={{ mb: 1.5 }} />
                {relatedGroups.length === 0 ? (
                  <Typography color="text.secondary" variant="body2">No groups linked to this course.</Typography>
                ) : (
                  <Stack spacing={1}>
                    {rootGroupIds.map((groupId) => renderGroupNode(groupId))}
                  </Stack>
                )}
              </Paper>
            </Grid>
          </Grid>
        )}
      </Stack>

      <Dialog open={deleteOpen && canManageCourse} onClose={() => !deleteLoading && setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete course?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{course.name}</strong>? This action cannot be undone.
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

      <Dialog open={editOpen && canManageCourse} onClose={() => !editLoading && setEditOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Update course</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField
              label="Course name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
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
