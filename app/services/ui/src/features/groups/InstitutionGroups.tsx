import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PageContainer from '../layout/PageContainer';
import { compareAlphabetical } from '../../utils/text';
import { getInstitutionGroups } from '../../api/institutions';
import type { InstitutionGroup, InstitutionUser } from '../../api/institutions';
import { createGroup, deleteGroup, updateGroup } from '../../api/groups';
import { groupRoute } from '../../config/routes';
import { getCurrentUserData, isInstitutionAdmin } from '../../utils/institutionAdmin';

export default function InstitutionGroups() {
  const { institutionId } = useParams();
  const navigate = useNavigate();

  const [groups, setGroups] = useState<InstitutionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [groupToDelete, setGroupToDelete] = useState<InstitutionGroup | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createParentGroupId, setCreateParentGroupId] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [groupToEdit, setGroupToEdit] = useState<InstitutionGroup | null>(null);
  const [editName, setEditName] = useState('');
  const [editParentGroupId, setEditParentGroupId] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<InstitutionUser | null>(null);
  const [currentUserLoading, setCurrentUserLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');

  const loadGroups = async () => {
    if (!institutionId) {
      setError('Missing institution id in route.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const items = await getInstitutionGroups(institutionId);
      setGroups([...items].sort((a, b) => compareAlphabetical(a.name, b.name)));
    } catch (err) {
      setError((err as Error).message || 'Failed to load groups.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
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

  const isCurrentUserAdmin = useMemo(() => isInstitutionAdmin(currentUser, institutionId), [currentUser, institutionId]);

  const groupsById = useMemo(() => {
    const map = new Map<string, InstitutionGroup>();
    groups.forEach((group) => {
      const id = String(group.id ?? group._id ?? '');
      if (id) map.set(id, group);
    });
    return map;
  }, [groups]);

  const childrenByParent = useMemo(() => {
    const map = new Map<string | null, string[]>();
    groups.forEach((group) => {
      const groupId = String(group.id ?? group._id ?? '');
      if (!groupId) return;
      const parentId = group.parent_group_id ? String(group.parent_group_id) : null;
      if (!map.has(parentId)) map.set(parentId, []);
      map.get(parentId)!.push(groupId);
    });

    map.forEach((childIds) => {
      childIds.sort((a, b) => compareAlphabetical(groupsById.get(a)?.name ?? a, groupsById.get(b)?.name ?? b));
    });

    return map;
  }, [groups, groupsById]);

  const rootGroupIds = useMemo(() => childrenByParent.get(null) ?? [], [childrenByParent]);

  const filteredGroupIds = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return new Set(
      groups
        .filter((group) => (group.name ?? '').toLowerCase().includes(query))
        .map((group) => String(group.id ?? group._id ?? ''))
        .filter(Boolean),
    );
  }, [groups, searchQuery]);

  const displayedTreeGroupIds = useMemo(() => {
    const included = new Set<string>(filteredGroupIds);
    filteredGroupIds.forEach((id) => {
      let current = groupsById.get(id);
      while (current?.parent_group_id) {
        const parentId = String(current.parent_group_id);
        if (included.has(parentId)) break;
        included.add(parentId);
        current = groupsById.get(parentId);
      }
    });
    return included;
  }, [filteredGroupIds, groupsById]);

  const displayedRootGroupIds = useMemo(
    () => rootGroupIds.filter((groupId) => displayedTreeGroupIds.has(groupId)),
    [rootGroupIds, displayedTreeGroupIds],
  );

  const getDescendantIds = (groupId: string): Set<string> => {
    const descendants = new Set<string>();
    const stack = [...(childrenByParent.get(groupId) ?? [])];

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (descendants.has(current)) continue;
      descendants.add(current);
      const children = childrenByParent.get(current) ?? [];
      children.forEach((childId) => stack.push(childId));
    }

    return descendants;
  };

  const handleDelete = async () => {
    if (!isCurrentUserAdmin) return;
    if (!groupToDelete) return;
    const groupId = String(groupToDelete.id ?? groupToDelete._id ?? '');
    if (!groupId) return;

    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteGroup(groupId);
      setGroupToDelete(null);
      await loadGroups();
    } catch (err) {
      setDeleteError((err as Error).message || 'Failed to delete group.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!isCurrentUserAdmin) return;
    if (!institutionId) return;
    const name = createName.trim();
    if (!name) {
      setCreateError('Group name is required.');
      return;
    }

    setCreateLoading(true);
    setCreateError(null);
    try {
      await createGroup({
        institution_id: institutionId,
        name,
        parent_group_id: createParentGroupId || null,
      });
      setIsCreateOpen(false);
      setCreateName('');
      setCreateParentGroupId('');
      await loadGroups();
    } catch (err) {
      setCreateError((err as Error).message || 'Failed to create group.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!isCurrentUserAdmin) return;
    if (!groupToEdit) return;
    const groupId = String(groupToEdit.id ?? groupToEdit._id ?? '');
    if (!groupId) return;

    const name = editName.trim();
    if (!name) {
      setEditError('Group name is required.');
      return;
    }

    const descendants = getDescendantIds(groupId);
    if (editParentGroupId && (editParentGroupId === groupId || descendants.has(editParentGroupId))) {
      setEditError('A group cannot be parented to itself or one of its descendants.');
      return;
    }

    setEditLoading(true);
    setEditError(null);
    try {
      await updateGroup(groupId, {
        name,
        parent_group_id: editParentGroupId || null,
      });
      setGroupToEdit(null);
      setEditName('');
      setEditParentGroupId('');
      await loadGroups();
    } catch (err) {
      setEditError((err as Error).message || 'Failed to update group.');
    } finally {
      setEditLoading(false);
    }
  };

  const renderGroupNode = (groupId: string, depth = 0): React.ReactNode => {
    if (!displayedTreeGroupIds.has(groupId)) return null;
    const group = groupsById.get(groupId);
    if (!group) return null;
    const children = (childrenByParent.get(groupId) ?? []).filter((childId) => displayedTreeGroupIds.has(childId));

    const actions = (
      <Stack direction="row" spacing={1}>
        <Button
          size="small"
          onClick={(event) => {
            event.stopPropagation();
            navigate(groupRoute(groupId));
          }}
        >
          Open
        </Button>
        {isCurrentUserAdmin && (
          <Button
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              setEditError(null);
              setGroupToEdit(group);
              setEditName(group.name);
              setEditParentGroupId(group.parent_group_id ? String(group.parent_group_id) : '');
            }}
          >
            Edit
          </Button>
        )}
        {isCurrentUserAdmin && (
          <Button
            size="small"
            color="error"
            onClick={(event) => {
              event.stopPropagation();
              setDeleteError(null);
              setGroupToDelete(group);
            }}
          >
            Delete
          </Button>
        )}
      </Stack>
    );

    if (children.length === 0) {
      return (
        <Paper key={groupId} variant="outlined" sx={{ ml: depth > 0 ? 2 : 0, p: 1.5, borderRadius: 2 }}>
          <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{group.name}</Typography>
            </Stack>
            {actions}
          </Box>
        </Paper>
      );
    }

    return (
      <Accordion key={groupId} disableGutters sx={{ ml: depth > 0 ? 2 : 0 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, pr: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{group.name}</Typography>
            </Stack>
            {actions}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1}>
            {children.map((childId) => renderGroupNode(childId, depth + 1))}
          </Stack>
        </AccordionDetails>
      </Accordion>
    );
  };

  if (loading || currentUserLoading) {
    return (
      <PageContainer alignItems="center">
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={24} />
          <Typography>Loading groups...</Typography>
        </Stack>
      </PageContainer>
    );
  }

  return (
    <PageContainer alignItems="flex-start">
      <Box sx={{ width: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Groups</Typography>
          {isCurrentUserAdmin && (
            <Button
              variant="contained"
              onClick={() => {
                setCreateError(null);
                setCreateName('');
                setCreateParentGroupId('');
                setIsCreateOpen(true);
              }}
              disabled={!institutionId}
            >
              Create group
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
                label="Search groups"
                placeholder="Type group name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button
                variant="outlined"
                onClick={() => {
                  setSearchQuery('');
                }}
              >
                Reset
              </Button>
            </Stack>
          </Paper>
        )}

        {!error && groups.length === 0 && (
          <Typography color="text.secondary">No groups found for this institution.</Typography>
        )}

        {!error && groups.length > 0 && filteredGroupIds.size === 0 && (
          <Typography color="text.secondary">No groups match the current search/filter.</Typography>
        )}

        {!error && displayedRootGroupIds.length > 0 && (
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
            <Stack spacing={1.2}>
              {displayedRootGroupIds.map((groupId) => renderGroupNode(groupId))}
            </Stack>
          </Paper>
        )}

        <Dialog open={Boolean(groupToDelete) && isCurrentUserAdmin} onClose={() => !deleteLoading && setGroupToDelete(null)} maxWidth="xs" fullWidth>
          <DialogTitle>Delete group?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete <strong>{groupToDelete?.name ?? 'this group'}</strong>? This action cannot be undone.
            </DialogContentText>
            {deleteError && <Alert severity="error" sx={{ mt: 2 }}>{deleteError}</Alert>}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setGroupToDelete(null)} disabled={deleteLoading}>Cancel</Button>
            <Button onClick={handleDelete} color="error" variant="contained" disabled={deleteLoading}>
              {deleteLoading ? <CircularProgress size={18} color="inherit" /> : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={isCreateOpen && isCurrentUserAdmin} onClose={() => !createLoading && setIsCreateOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Create group</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <TextField
                label="Group name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                fullWidth
                disabled={createLoading}
              />
              <TextField
                label="Parent group"
                value={createParentGroupId}
                onChange={(e) => setCreateParentGroupId(e.target.value)}
                select
                fullWidth
                disabled={createLoading}
              >
                <MenuItem value="">No parent (root group)</MenuItem>
                {groups.map((group) => {
                  const groupId = String(group.id ?? group._id ?? '');
                  return (
                    <MenuItem key={groupId} value={groupId}>{group.name}</MenuItem>
                  );
                })}
              </TextField>
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

        <Dialog open={Boolean(groupToEdit) && isCurrentUserAdmin} onClose={() => !editLoading && setGroupToEdit(null)} maxWidth="xs" fullWidth>
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
                {groups
                  .filter((group) => String(group.id ?? group._id ?? '') !== String(groupToEdit?.id ?? groupToEdit?._id ?? ''))
                  .map((group) => {
                    const groupId = String(group.id ?? group._id ?? '');
                    return (
                      <MenuItem key={groupId} value={groupId}>{group.name}</MenuItem>
                    );
                  })}
              </TextField>
            </Stack>
            {editError && <Alert severity="error" sx={{ mt: 2 }}>{editError}</Alert>}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setGroupToEdit(null)} disabled={editLoading}>Cancel</Button>
            <Button onClick={handleUpdate} variant="contained" disabled={editLoading}>
              {editLoading ? <CircularProgress size={18} color="inherit" /> : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageContainer>
  );
}



