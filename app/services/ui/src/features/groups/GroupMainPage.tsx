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
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EventNoteRoundedIcon from '@mui/icons-material/EventNoteRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import CallSplitRoundedIcon from '@mui/icons-material/CallSplitRounded';
import Diversity3RoundedIcon from '@mui/icons-material/Diversity3Rounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import NavigateNextRoundedIcon from '@mui/icons-material/NavigateNextRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import PageContainer from '../layout/PageContainer';
import EntityStatCard from '../../components/EntityStatCard';
import { compareAlphabetical, toTitleLabel } from '../../utils/text';
import { deleteGroup, getGroupActivities, getGroupById, updateGroup } from '../../api/groups';
import type { GroupActivity } from '../../api/groups';
import { getInstitutionCourses, getInstitutionGroups, getInstitutionUsers } from '../../api/institutions';
import type { InstitutionCourse, InstitutionGroup, InstitutionUser } from '../../api/institutions';
import type { Group } from '../../types/group';
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

export default function GroupMainPage() {
  const theme = useTheme();
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
    if (!groupId) { setLoading(false); setError('Missing group id in route.'); return () => { mounted = false; }; }
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
    return () => { mounted = false; };
  }, [groupId]);

  useEffect(() => {
    let mounted = true;
    if (!group?.id || !group.institution_id) return () => { mounted = false; };
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
    return () => { mounted = false; };
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
    return () => { mounted = false; };
  }, []);

  const isCurrentUserAdmin = useMemo(() => isInstitutionAdmin(currentUser, group?.institution_id), [currentUser, group?.institution_id]);

  const groupsById = useMemo(() => {
    const map = new Map<string, InstitutionGroup>();
    allGroups.forEach((item) => { const id = String(item.id ?? item._id ?? ''); if (id) map.set(id, item); });
    return map;
  }, [allGroups]);

  const coursesById = useMemo(() => {
    const map = new Map<string, InstitutionCourse>();
    courses.forEach((item) => { const id = String(item.id ?? item._id ?? ''); if (id) map.set(id, item); });
    return map;
  }, [courses]);

  const usersById = useMemo(() => {
    const map = new Map<string, InstitutionUser>();
    users.forEach((item) => { const id = String(item.id ?? item._id ?? ''); if (id) map.set(id, item); });
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
      (childrenByParent.get(current) ?? []).forEach((childId) => stack.push(childId));
    }
    return result;
  };

  const directChildGroupIds = useMemo(() => (group?.id ? childrenByParent.get(group.id) ?? [] : []), [childrenByParent, group?.id]);
  const descendantGroupIds = useMemo(() => (group?.id ? getDescendantIds(group.id) : []), [group?.id, childrenByParent]);

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
    const courseCompare = compareAlphabetical(coursesById.get(String(a.course_id))?.name ?? '', coursesById.get(String(b.course_id))?.name ?? '');
    if (courseCompare !== 0) return courseCompare;
    return compareAlphabetical(a.frequency, b.frequency);
  }), [activities, coursesById]);

  const renderSubTreeNode = (currentId: string): React.ReactNode => {
    const current = groupsById.get(currentId);
    if (!current) return null;
    const children = childrenByParent.get(currentId) ?? [];

    const label = (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Diversity3RoundedIcon sx={{ fontSize: '0.85rem', color: 'primary.main' }} />
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{current.name}</Typography>
      </Box>
    );

    const openBtn = (
      <Button
        size="small"
        startIcon={<OpenInNewRoundedIcon sx={{ fontSize: '0.8rem !important' }} />}
        onClick={(e) => { e.stopPropagation(); navigate(groupRoute(currentId)); }}
        sx={{ borderRadius: 1.5, fontSize: '0.75rem', flexShrink: 0 }}
      >
        Open
      </Button>
    );

    if (children.length === 0) {
      return (
        <Box
          key={currentId}
          sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1,
            px: 1.5, py: 1, borderRadius: 2, border: '1px solid', borderColor: 'divider',
            transition: 'border-color 150ms ease',
            '&:hover': { borderColor: 'primary.light' },
          }}
        >
          {label}
          {openBtn}
        </Box>
      );
    }

    return (
      <Accordion
        key={currentId}
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
            {openBtn}
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 1.5, pb: 1.5, pt: 0 }}>
          <Stack spacing={1}>
            {children.map((childId) => renderSubTreeNode(childId))}
          </Stack>
        </AccordionDetails>
      </Accordion>
    );
  };

  const handleUpdate = async () => {
    if (!isCurrentUserAdmin || !group) return;
    const name = editName.trim();
    if (!name) { setEditError('Group name is required.'); return; }
    const descendants = new Set(getDescendantIds(group.id));
    if (editParentGroupId && (editParentGroupId === group.id || descendants.has(editParentGroupId))) {
      setEditError('A group cannot be parented to itself or one of its descendants.');
      return;
    }
    setEditLoading(true);
    setEditError(null);
    try {
      const updated = await updateGroup(group.id, { name, parent_group_id: editParentGroupId || null });
      setGroup(updated);
      setEditOpen(false);
    } catch (err) {
      setEditError((err as Error).message || 'Failed to update group.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!isCurrentUserAdmin || !group) return;
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

  const backRoute = group?.institution_id
    ? `${institutionRoute(group.institution_id)}/groups`
    : INSTITUTIONS_ROUTE;

  if (loading || currentUserLoading) {
    return (
      <PageContainer alignItems="center">
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={22} />
          <Typography color="text.secondary">Loading group...</Typography>
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

  if (!group) {
    return (
      <PageContainer alignItems="flex-start">
        <Alert severity="warning" sx={{ width: '100%', borderRadius: 2 }}>Group data is unavailable.</Alert>
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
          Groups
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
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: 'primary.main',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Diversity3RoundedIcon />
                  </Box>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2 }}>{group.name}</Typography>
                    {group.institution_id && (
                      <Typography
                        variant="body2"
                        color="primary.main"
                        sx={{ cursor: 'pointer', fontWeight: 500, mt: 0.25 }}
                        onClick={() => navigate(institutionRoute(group.institution_id))}
                      >
                        View institution
                      </Typography>
                    )}
                  </Box>
                </Box>
                {isCurrentUserAdmin && (
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      startIcon={<EditRoundedIcon />}
                      onClick={() => { setEditError(null); setEditName(group.name); setEditParentGroupId(group.parent_group_id ? String(group.parent_group_id) : ''); setEditOpen(true); }}
                      sx={{ borderRadius: 2 }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteOutlineRoundedIcon />}
                      onClick={() => { setDeleteError(null); setDeleteOpen(true); }}
                      sx={{ borderRadius: 2 }}
                    >
                      Delete
                    </Button>
                  </Stack>
                )}
              </Box>

              {/* Ancestry breadcrumbs */}
              {ancestryChain.length > 0 && (
                <Stack direction="row" spacing={0.5} alignItems="center" useFlexGap flexWrap="wrap" sx={{ mt: 2 }}>
                  {ancestryChain.map((ancestorId, i) => (
                    <Box key={ancestorId} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Chip
                        label={groupsById.get(ancestorId)?.name ?? 'Group'}
                        size="small"
                        variant="outlined"
                        clickable
                        onClick={() => navigate(groupRoute(ancestorId))}
                        sx={{ fontSize: '0.72rem', height: 22 }}
                      />
                      {i < ancestryChain.length - 1 && <NavigateNextRoundedIcon sx={{ fontSize: '0.9rem', color: 'text.disabled' }} />}
                    </Box>
                  ))}
                  <NavigateNextRoundedIcon sx={{ fontSize: '0.9rem', color: 'text.disabled' }} />
                  <Chip label={group.name} size="small" color="primary" sx={{ fontSize: '0.72rem', height: 22 }} />
                </Stack>
              )}
            </Box>
          </Paper>

          {/* Stat cards */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <EntityStatCard icon={<EventNoteRoundedIcon fontSize="small" />} label="Activities" value={activities.length} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <EntityStatCard icon={<AccountTreeRoundedIcon fontSize="small" />} label="Direct child groups" value={directChildGroupIds.length} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <EntityStatCard icon={<CallSplitRoundedIcon fontSize="small" />} label="Total descendants" value={descendantGroupIds.length} />
            </Grid>
          </Grid>

          {/* Section divider */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="overline" color="text.disabled" sx={{ fontWeight: 700, letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
              Details
            </Typography>
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
              {/* Group hierarchy */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', height: '100%' }}>
                  <Box sx={{ height: 3, background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})` }} />
                  <Box sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Child groups</Typography>
                      <Typography variant="caption" color="text.secondary">{directChildGroupIds.length} direct</Typography>
                    </Box>
                    {directChildGroupIds.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 3 }}>
                        <AccountTreeRoundedIcon sx={{ fontSize: '2rem', color: 'text.disabled', mb: 1 }} />
                        <Typography variant="body2" color="text.secondary">No child groups.</Typography>
                      </Box>
                    ) : (
                      <Stack spacing={1}>
                        {directChildGroupIds.map((childId) => renderSubTreeNode(childId))}
                      </Stack>
                    )}
                  </Box>
                </Paper>
              </Grid>

              {/* Activities */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', height: '100%' }}>
                  <Box sx={{ height: 3, background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})` }} />
                  <Box sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Activities</Typography>
                      <Typography variant="caption" color="text.secondary">{activities.length} total</Typography>
                    </Box>
                    {sortedActivities.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 3 }}>
                        <EventNoteRoundedIcon sx={{ fontSize: '2rem', color: 'text.disabled', mb: 1 }} />
                        <Typography variant="body2" color="text.secondary">No activities assigned.</Typography>
                      </Box>
                    ) : (
                      <Stack
                        spacing={1}
                        sx={{
                          maxHeight: 360, overflowY: 'auto', pr: 0.5,
                          scrollbarWidth: 'thin',
                          scrollbarColor: `${alpha(theme.palette.primary.main, 0.4)} transparent`,
                        }}
                      >
                        {sortedActivities.map((activity) => {
                          const activityId = String(activity.id ?? activity._id ?? `${activity.course_id}-${activity.activity_type}`);
                          const courseName = coursesById.get(String(activity.course_id))?.name ?? 'Unknown course';
                          const professor = activity.professor_id ? usersById.get(String(activity.professor_id)) : undefined;
                          const professorName = professor?.name ?? 'Unassigned';
                          return (
                            <Box
                              key={activityId}
                              onClick={() => navigate(activityRoute(activityId))}
                              sx={{
                                p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider',
                                cursor: 'pointer',
                                transition: 'border-color 150ms ease, background 150ms ease',
                                '&:hover': { borderColor: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.04) },
                              }}
                            >
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {`${courseName} ${toTitleLabel(activity.activity_type)}`}
                              </Typography>
                              <Typography
                                variant="caption"
                                color={activity.professor_id ? 'primary.main' : 'text.secondary'}
                                sx={{ cursor: activity.professor_id ? 'pointer' : 'default' }}
                                onClick={(e) => { if (activity.professor_id) { e.stopPropagation(); navigate(memberRoute(String(activity.professor_id))); } }}
                              >
                                {`${toTitleLabel(activity.frequency)} · ${professorName}`}
                                {professor?.email ? ` (${professor.email})` : ''}
                              </Typography>
                            </Box>
                          );
                        })}
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
      <Dialog open={deleteOpen && isCurrentUserAdmin} onClose={() => !deleteLoading && setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete group?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{group.name}</strong>? This action cannot be undone.
          </DialogContentText>
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
      <Dialog open={editOpen && isCurrentUserAdmin} onClose={() => !editLoading && setEditOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit group</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 0.5 }}>
            <TextField label="Group name" value={editName} onChange={(e) => setEditName(e.target.value)} fullWidth autoFocus disabled={editLoading} />
            <TextField label="Parent group" value={editParentGroupId} onChange={(e) => setEditParentGroupId(e.target.value)} select fullWidth disabled={editLoading}>
              <MenuItem value="">No parent (root group)</MenuItem>
              {allGroups
                .filter((item) => String(item.id ?? item._id ?? '') !== group.id)
                .map((item) => {
                  const itemId = String(item.id ?? item._id ?? '');
                  return <MenuItem key={itemId} value={itemId}>{item.name}</MenuItem>;
                })}
            </TextField>
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
