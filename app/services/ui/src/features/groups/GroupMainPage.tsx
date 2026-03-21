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
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EventNoteIcon from '@mui/icons-material/EventNote';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import PageContainer from '../layout/PageContainer';
import EntityStatCard from '../../components/EntityStatCard';
import { compareAlphabetical, toTitleLabel } from '../../utils/text';
import { clickableEntitySx, clickableSecondaryEntitySx } from '../../utils/clickableEntity';
import { deleteGroup, getGroupActivities, getGroupById, updateGroup } from '../../api/groups';
import type { GroupActivity } from '../../api/groups';
import { getInstitutionCourses, getInstitutionGroups, getInstitutionUsers } from '../../api/institutions';
import type { InstitutionCourse, InstitutionGroup, InstitutionUser } from '../../api/institutions';
import type { Group } from '../../types/group';
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

export default function GroupMainPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();

  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editParentGroupId, setEditParentGroupId] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [activities, setActivities] = useState<GroupActivity[]>([]);
  const [allGroups, setAllGroups] = useState<InstitutionGroup[]>([]);
  const [courses, setCourses] = useState<InstitutionCourse[]>([]);
  const [users, setUsers] = useState<InstitutionUser[]>([]);
  const [currentUser, setCurrentUser] = useState<InstitutionUser | null>(null);
  const [currentUserLoading, setCurrentUserLoading] = useState(true);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [relatedError, setRelatedError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    if (!groupId) {
      setLoading(false);
      setError('Missing group id in route.');
      return () => {
        mounted = false;
      };
    }

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getGroupById(groupId);
        if (!mounted) return;
        setGroup(data);
        setEditName(data.name);
        setEditParentGroupId(data.parent_group_id ? String(data.parent_group_id) : '');
      } catch (err) {
        if (!mounted) return;
        setError((err as Error).message || 'Failed to load group.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [groupId]);

  useEffect(() => {
    let mounted = true;

    if (!group?.id || !group.institution_id) {
      return () => {
        mounted = false;
      };
    }

    (async () => {
      setRelatedLoading(true);
      setRelatedError(null);
      try {
        const [groupActivities, institutionGroups, institutionCourses, institutionUsers] = await Promise.all([
          getGroupActivities(group.id),
          getInstitutionGroups(group.institution_id),
          getInstitutionCourses(group.institution_id),
          getInstitutionUsers(group.institution_id),
        ]);

        if (!mounted) return;
        setActivities(groupActivities);
        setAllGroups(institutionGroups);
        setCourses(institutionCourses);
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
  }, [group?.id, group?.institution_id]);

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

  const isCurrentUserAdmin = useMemo(() => isInstitutionAdmin(currentUser, group?.institution_id), [currentUser, group?.institution_id]);

  const groupsById = useMemo(() => {
    const map = new Map<string, InstitutionGroup>();
    allGroups.forEach((item) => {
      const id = String(item.id ?? item._id ?? '');
      if (id) map.set(id, item);
    });
    return map;
  }, [allGroups]);

  const coursesById = useMemo(() => {
    const map = new Map<string, InstitutionCourse>();
    courses.forEach((item) => {
      const id = String(item.id ?? item._id ?? '');
      if (id) map.set(id, item);
    });
    return map;
  }, [courses]);

  const usersById = useMemo(() => {
    const map = new Map<string, InstitutionUser>();
    users.forEach((item) => {
      const id = String(item.id ?? item._id ?? '');
      if (id) map.set(id, item);
    });
    return map;
  }, [users]);

  const childrenByParent = useMemo(() => {
    const map = new Map<string | null, string[]>();
    allGroups.forEach((item) => {
      const id = String(item.id ?? item._id ?? '');
      if (!id) return;
      const parentId = item.parent_group_id ? String(item.parent_group_id) : null;
      if (!map.has(parentId)) map.set(parentId, []);
      map.get(parentId)!.push(id);
    });

    map.forEach((ids) => ids.sort((a, b) => compareAlphabetical(groupsById.get(a)?.name ?? a, groupsById.get(b)?.name ?? b)));
    return map;
  }, [allGroups, groupsById]);

  const getDescendantIds = (rootId: string): string[] => {
    const result: string[] = [];
    const stack = [...(childrenByParent.get(rootId) ?? [])];
    while (stack.length > 0) {
      const current = stack.pop()!;
      result.push(current);
      const children = childrenByParent.get(current) ?? [];
      children.forEach((childId) => stack.push(childId));
    }
    return result;
  };

  const directChildGroupIds = useMemo(() => {
    if (!group?.id) return [];
    return childrenByParent.get(group.id) ?? [];
  }, [childrenByParent, group?.id]);

  const descendantGroupIds = useMemo(() => {
    if (!group?.id) return [];
    return getDescendantIds(group.id);
  }, [group?.id, childrenByParent]);

  const ancestryChain = useMemo(() => {
    if (!group?.id) return [];
    const chain: string[] = [];
    let current = groupsById.get(group.id);
    while (current?.parent_group_id) {
      const parentId = String(current.parent_group_id);
      chain.unshift(parentId);
      current = groupsById.get(parentId);
    }
    return chain;
  }, [group?.id, groupsById]);

  const sortedActivities = useMemo(() => [...activities].sort((a, b) => {
    const typeCompare = compareActivityTypes(a.activity_type, b.activity_type);
    if (typeCompare !== 0) return typeCompare;

    const courseCompare = compareAlphabetical(coursesById.get(String(a.course_id))?.name ?? 'Unknown course', coursesById.get(String(b.course_id))?.name ?? 'Unknown course');
    if (courseCompare !== 0) return courseCompare;

    const frequencyCompare = compareAlphabetical(a.frequency, b.frequency);
    if (frequencyCompare !== 0) return frequencyCompare;

    return compareAlphabetical(String(a.id ?? a._id ?? ''), String(b.id ?? b._id ?? ''));
  }), [activities, coursesById]);

  const renderSubTreeNode = (currentId: string): React.ReactNode => {
    const current = groupsById.get(currentId);
    if (!current) return null;
    const children = childrenByParent.get(currentId) ?? [];

    const actions = (
      <Button
        size="small"
        onClick={(event) => {
          event.stopPropagation();
          navigate(groupRoute(currentId));
        }}
      >
        Open
      </Button>
    );

    if (children.length === 0) {
      return (
        <Paper key={currentId} variant="outlined" sx={{ p: 1.2, borderRadius: 2 }}>
          <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{current.name}</Typography>
            {actions}
          </Box>
        </Paper>
      );
    }

    return (
      <Accordion key={currentId} disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, pr: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{current.name}</Typography>
            {actions}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1}>
            {children.map((childId) => renderSubTreeNode(childId))}
          </Stack>
        </AccordionDetails>
      </Accordion>
    );
  };

  const handleUpdate = async () => {
    if (!isCurrentUserAdmin) return;
    if (!group) return;

    const name = editName.trim();
    if (!name) {
      setEditError('Group name is required.');
      return;
    }

    const descendants = new Set(getDescendantIds(group.id));
    if (editParentGroupId && (editParentGroupId === group.id || descendants.has(editParentGroupId))) {
      setEditError('A group cannot be parented to itself or one of its descendants.');
      return;
    }

    setEditLoading(true);
    setEditError(null);
    try {
      const updated = await updateGroup(group.id, {
        name,
        parent_group_id: editParentGroupId || null,
      });
      setGroup(updated);
      setEditOpen(false);
    } catch (err) {
      setEditError((err as Error).message || 'Failed to update group.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!isCurrentUserAdmin) return;
    if (!group) return;

    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteGroup(group.id);
      navigate(group.institution_id ? `${institutionRoute(group.institution_id)}/groups` : INSTITUTIONS_ROUTE, { replace: true });
    } catch (err) {
      setDeleteError((err as Error).message || 'Failed to delete group.');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading || currentUserLoading) {
    return (
      <PageContainer alignItems="center">
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={24} />
          <Typography>Loading group...</Typography>
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

  if (!group) {
    return (
      <PageContainer alignItems="flex-start">
        <Alert severity="warning" sx={{ width: '100%' }}>Group data is unavailable.</Alert>
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
            <Typography variant="h4" sx={{ fontWeight: 800 }}>{group.name}</Typography>
            {isCurrentUserAdmin && (
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setEditError(null);
                    setEditName(group.name);
                    setEditParentGroupId(group.parent_group_id ? String(group.parent_group_id) : '');
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
        </Paper>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <EntityStatCard icon={<EventNoteIcon fontSize="small" />} label="Activities" value={activities.length} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <EntityStatCard icon={<AccountTreeIcon fontSize="small" />} label="Direct child groups" value={directChildGroupIds.length} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <EntityStatCard icon={<CallSplitIcon fontSize="small" />} label="Total descendants" value={descendantGroupIds.length} />
          </Grid>
        </Grid>

        {relatedLoading && (
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <CircularProgress size={18} />
              <Typography>Loading group dashboard data...</Typography>
            </Stack>
          </Paper>
        )}
        {relatedError && <Alert severity="error">{relatedError}</Alert>}

        {!relatedLoading && !relatedError && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                  Group hierarchy
                </Typography>
                <Divider sx={{ mb: 1.5 }} />

                {ancestryChain.length > 0 && (
                  <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap" sx={{ mb: 1.2 }}>
                    {ancestryChain.map((ancestorId) => (
                      <Chip
                        key={ancestorId}
                        label={groupsById.get(ancestorId)?.name ?? 'Unknown group'}
                        size="small"
                        clickable
                        onClick={() => navigate(groupRoute(ancestorId))}
                      />
                    ))}
                  </Stack>
                )}

                {directChildGroupIds.length === 0 ? (
                  <Typography color="text.secondary" variant="body2">No child groups under this group.</Typography>
                ) : (
                  <Stack spacing={1}>
                    {directChildGroupIds.map((childId) => renderSubTreeNode(childId))}
                  </Stack>
                )}
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                  Activities
                </Typography>
                <Divider sx={{ mb: 1.5 }} />

                {sortedActivities.length === 0 ? (
                  <Typography color="text.secondary" variant="body2">No activities assigned to this group.</Typography>
                ) : (
                  <Stack spacing={1}>
                    {sortedActivities.map((activity) => {
                      const activityId = String(activity.id ?? activity._id ?? `${activity.course_id}-${activity.activity_type}`);
                      const courseName = coursesById.get(String(activity.course_id))?.name ?? 'Unknown course';
                      const professor = activity.professor_id ? usersById.get(String(activity.professor_id)) : undefined;
                      const professorName = professor?.name ?? 'Unassigned';
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

                          {professorEmail ? (
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
                              {`Professor: ${professorName} (${professorEmail})`}
                            </Typography>
                          ) : (
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
                              {`Professor: ${professorName}`}
                            </Typography>
                          )}
                        </Box>
                      );
                    })}
                  </Stack>
                )}
              </Paper>
            </Grid>
          </Grid>
        )}
      </Stack>

      <Dialog open={deleteOpen && isCurrentUserAdmin} onClose={() => !deleteLoading && setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete group?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{group.name}</strong>? This action cannot be undone.
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

      <Dialog open={editOpen && isCurrentUserAdmin} onClose={() => !editLoading && setEditOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Update group</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField
              label="Group name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              fullWidth
              disabled={editLoading}
            />
            <TextField
              label="Parent group"
              value={editParentGroupId}
              onChange={(e) => setEditParentGroupId(e.target.value)}
              select
              fullWidth
              disabled={editLoading}
            >
              <MenuItem value="">No parent (root group)</MenuItem>
              {allGroups
                .filter((item) => String(item.id ?? item._id ?? '') !== group.id)
                .map((item) => {
                  const itemId = String(item.id ?? item._id ?? '');
                  return (
                    <MenuItem key={itemId} value={itemId}>{item.name}</MenuItem>
                  );
                })}
            </TextField>
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





