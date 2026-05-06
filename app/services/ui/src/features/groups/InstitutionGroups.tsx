import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
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
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Diversity3RoundedIcon from '@mui/icons-material/Diversity3Rounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchIcon from '@mui/icons-material/Search';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import PageContainer from '../layout/PageContainer';
import { compareAlphabetical } from '../../utils/text';
import { getInstitutionGroups } from '../../api/institutions';
import type { InstitutionGroup, InstitutionUser } from '../../api/institutions';
import { createGroup, deleteGroup, updateGroup } from '../../api/groups';
import { groupRoute } from '../../config/routes';
import { getCurrentUserData, isInstitutionAdmin } from '../../utils/institutionAdmin';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

export default function InstitutionGroups() {
  const theme = useTheme();
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
    if (!institutionId) { setError('Missing institution id in route.'); setLoading(false); return; }
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

  useEffect(() => { loadGroups(); }, [institutionId]);

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
      (childrenByParent.get(current) ?? []).forEach((childId) => stack.push(childId));
    }
    return descendants;
  };

  const handleDelete = async () => {
    if (!isCurrentUserAdmin || !groupToDelete) return;
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
    if (!isCurrentUserAdmin || !institutionId) return;
    const name = createName.trim();
    if (!name) { setCreateError('Group name is required.'); return; }
    setCreateLoading(true);
    setCreateError(null);
    try {
      await createGroup({ institution_id: institutionId, name, parent_group_id: createParentGroupId || null });
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
    if (!isCurrentUserAdmin || !groupToEdit) return;
    const groupId = String(groupToEdit.id ?? groupToEdit._id ?? '');
    if (!groupId) return;
    const name = editName.trim();
    if (!name) { setEditError('Group name is required.'); return; }
    const descendants = getDescendantIds(groupId);
    if (editParentGroupId && (editParentGroupId === groupId || descendants.has(editParentGroupId))) {
      setEditError('A group cannot be parented to itself or one of its descendants.');
      return;
    }
    setEditLoading(true);
    setEditError(null);
    try {
      await updateGroup(groupId, { name, parent_group_id: editParentGroupId || null });
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
    const childCount = (childrenByParent.get(groupId) ?? []).length;

    const rowContent = (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: 1 }}>
        <Box
          sx={{
            width: 30, height: 30, borderRadius: 1.5, flexShrink: 0,
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            color: 'primary.main',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Diversity3RoundedIcon sx={{ fontSize: '0.9rem' }} />
        </Box>
        <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {group.name}
        </Typography>
        {childCount > 0 && (
          <Chip size="small" label={childCount} sx={{ height: 18, fontSize: '0.7rem', ml: 0.5 }} />
        )}
      </Box>
    );

    const actionButtons = (
      <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
        <Tooltip title="Open">
          <IconButton size="small" onClick={() => navigate(groupRoute(groupId))} sx={{ borderRadius: 1.5 }}>
            <OpenInNewRoundedIcon sx={{ fontSize: '0.9rem' }} />
          </IconButton>
        </Tooltip>
        {isCurrentUserAdmin && (
          <Tooltip title="Edit">
            <IconButton
              size="small"
              sx={{ borderRadius: 1.5 }}
              onClick={() => {
                setEditError(null);
                setGroupToEdit(group);
                setEditName(group.name);
                setEditParentGroupId(group.parent_group_id ? String(group.parent_group_id) : '');
              }}
            >
              <EditRoundedIcon sx={{ fontSize: '0.9rem' }} />
            </IconButton>
          </Tooltip>
        )}
        {isCurrentUserAdmin && (
          <Tooltip title="Delete">
            <IconButton
              size="small"
              color="error"
              sx={{ borderRadius: 1.5 }}
              onClick={() => { setDeleteError(null); setGroupToDelete(group); }}
            >
              <DeleteOutlineRoundedIcon sx={{ fontSize: '0.9rem' }} />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    );

    if (children.length === 0) {
      return (
        <Box
          key={groupId}
          sx={{
            ml: depth > 0 ? 2.5 : 0,
            borderLeft: depth > 0 ? `2px solid ${alpha(theme.palette.primary.main, 0.15)}` : 'none',
            pl: depth > 0 ? 1.5 : 0,
          }}
        >
          <Box
            sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1,
              px: 1.5, py: 1,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              transition: 'border-color 150ms ease, background 150ms ease',
              '&:hover': { borderColor: 'primary.light', bgcolor: alpha(theme.palette.primary.main, 0.03) },
            }}
          >
            {rowContent}
            {actionButtons}
          </Box>
        </Box>
      );
    }

    return (
      <Box
        key={groupId}
        sx={{
          ml: depth > 0 ? 2.5 : 0,
          borderLeft: depth > 0 ? `2px solid ${alpha(theme.palette.primary.main, 0.15)}` : 'none',
          pl: depth > 0 ? 1.5 : 0,
        }}
      >
        <Accordion
          disableGutters
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            overflow: 'hidden',
            '&:before': { display: 'none' },
            '&.Mui-expanded': { borderColor: alpha(theme.palette.primary.main, 0.4) },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />}
            sx={{ px: 1.5, py: 0.5, minHeight: 44, '& .MuiAccordionSummary-content': { my: 0.5 } }}
          >
            <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, pr: 1 }}>
              {rowContent}
              {actionButtons}
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 1.5, pb: 1.5, pt: 0 }}>
            <Stack spacing={1}>
              {children.map((childId) => renderGroupNode(childId, depth + 1))}
            </Stack>
          </AccordionDetails>
        </Accordion>
      </Box>
    );
  };

  if (loading || currentUserLoading) {
    return (
      <PageContainer alignItems="center">
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={22} />
          <Typography color="text.secondary">Loading groups...</Typography>
        </Stack>
      </PageContainer>
    );
  }

  return (
    <PageContainer alignItems="flex-start">
      <Box sx={{ width: '100%', maxWidth: 900, mx: 'auto' }}>
      <Stack spacing={3}>

        {/* Page header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>Groups</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {groups.length} group{groups.length !== 1 ? 's' : ''} in this institution
            </Typography>
          </Box>
          {isCurrentUserAdmin && (
            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={() => { setCreateError(null); setCreateName(''); setCreateParentGroupId(''); setIsCreateOpen(true); }}
              disabled={!institutionId}
              sx={{ borderRadius: 2 }}
            >
              New group
            </Button>
          )}
        </Box>

        {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}

        {/* Search */}
        {!error && (
          <TextField
            size="small"
            fullWidth
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: { startAdornment: <SearchIcon sx={{ fontSize: '1rem', mr: 0.75, color: 'text.disabled' }} /> },
            }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        )}

        {/* Empty states */}
        {!error && groups.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Box sx={{ display: 'inline-flex', p: 2, borderRadius: 4, bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main', mb: 2 }}>
              <Diversity3RoundedIcon sx={{ fontSize: '2.5rem' }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>No groups yet</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Create your first group to start organising students.
            </Typography>
            {isCurrentUserAdmin && (
              <Button
                variant="contained"
                startIcon={<AddRoundedIcon />}
                onClick={() => { setCreateError(null); setCreateName(''); setCreateParentGroupId(''); setIsCreateOpen(true); }}
                sx={{ borderRadius: 2 }}
              >
                New group
              </Button>
            )}
          </Box>
        )}

        {!error && groups.length > 0 && filteredGroupIds.size === 0 && (
          <Typography variant="body2" color="text.secondary">
            No groups match &ldquo;{searchQuery}&rdquo;.
          </Typography>
        )}

        {/* Group tree */}
        {!error && displayedRootGroupIds.length > 0 && (
          <Stack spacing={1}>
            {displayedRootGroupIds.map((groupId) => renderGroupNode(groupId))}
          </Stack>
        )}
      </Stack>
      </Box>

      {/* Delete dialog */}
      <Dialog open={Boolean(groupToDelete) && isCurrentUserAdmin} onClose={() => !deleteLoading && setGroupToDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete group?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{groupToDelete?.name ?? 'this group'}</strong>? This action cannot be undone.
          </DialogContentText>
          {deleteError && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{deleteError}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setGroupToDelete(null)} disabled={deleteLoading} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={deleteLoading} sx={{ borderRadius: 2 }}>
            {deleteLoading ? <CircularProgress size={18} color="inherit" /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={isCreateOpen && isCurrentUserAdmin} onClose={() => !createLoading && setIsCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>New group</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 0.5 }}>
            <TextField
              label="Group name"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              fullWidth
              autoFocus
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
                const gId = String(group.id ?? group._id ?? '');
                return <MenuItem key={gId} value={gId}>{group.name}</MenuItem>;
              })}
            </TextField>
            {createError && <Alert severity="error" sx={{ borderRadius: 2 }}>{createError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setIsCreateOpen(false)} disabled={createLoading} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleCreate} variant="contained" disabled={createLoading} sx={{ borderRadius: 2 }}>
            {createLoading ? <CircularProgress size={18} color="inherit" /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={Boolean(groupToEdit) && isCurrentUserAdmin} onClose={() => !editLoading && setGroupToEdit(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit group</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 0.5 }}>
            <TextField
              label="Group name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              fullWidth
              autoFocus
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
                  const gId = String(group.id ?? group._id ?? '');
                  return <MenuItem key={gId} value={gId}>{group.name}</MenuItem>;
                })}
            </TextField>
            {editError && <Alert severity="error" sx={{ borderRadius: 2 }}>{editError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setGroupToEdit(null)} disabled={editLoading} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleUpdate} variant="contained" disabled={editLoading} sx={{ borderRadius: 2 }}>
            {editLoading ? <CircularProgress size={18} color="inherit" /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
