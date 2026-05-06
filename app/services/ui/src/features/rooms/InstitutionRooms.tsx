import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import MeetingRoomRoundedIcon from '@mui/icons-material/MeetingRoomRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchIcon from '@mui/icons-material/Search';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import PageContainer from '../layout/PageContainer';
import { compareAlphabetical } from '../../utils/text';
import { parseFeatures, featuresToInput } from '../../utils/roomFeatures';
import { createRoom, deleteRoom, updateRoom } from '../../api/rooms';
import { getInstitutionActivities, getInstitutionRooms } from '../../api/institutions';
import type { InstitutionActivity, InstitutionRoom, InstitutionUser } from '../../api/institutions';
import { roomRoute } from '../../config/routes';
import { getCurrentUserData, isInstitutionAdmin } from '../../utils/institutionAdmin';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

export default function InstitutionRooms() {
  const theme = useTheme();
  const { institutionId } = useParams();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState<InstitutionRoom[]>([]);
  const [activities, setActivities] = useState<InstitutionActivity[]>([]);
  const [currentUser, setCurrentUser] = useState<InstitutionUser | null>(null);
  const [currentUserLoading, setCurrentUserLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [roomToDelete, setRoomToDelete] = useState<InstitutionRoom | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createCapacity, setCreateCapacity] = useState('30');
  const [createFeatures, setCreateFeatures] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [roomToEdit, setRoomToEdit] = useState<InstitutionRoom | null>(null);
  const [editName, setEditName] = useState('');
  const [editCapacity, setEditCapacity] = useState('30');
  const [editFeatures, setEditFeatures] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [minCapacityFilter, setMinCapacityFilter] = useState('');
  const [selectedRequiredFeatures, setSelectedRequiredFeatures] = useState<string[]>([]);

  const loadRooms = async () => {
    if (!institutionId) { setError('Missing institution id in route.'); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const [list, institutionActivities] = await Promise.all([
        getInstitutionRooms(institutionId),
        getInstitutionActivities(institutionId),
      ]);
      setRooms([...list].sort((a, b) => compareAlphabetical(a.name, b.name)));
      setActivities(institutionActivities);
    } catch (err) {
      setError((err as Error).message || 'Failed to load rooms.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRooms(); }, [institutionId]);

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
  const isDeleting = useMemo(() => deletingId !== null, [deletingId]);

  const handleDelete = async () => {
    if (!canManageInstitution) return;
    const roomId = String(roomToDelete?.id ?? roomToDelete?._id ?? '');
    if (!roomId) return;
    setDeletingId(roomId);
    setDeleteError(null);
    try {
      await deleteRoom(roomId);
      setRoomToDelete(null);
      await loadRooms();
    } catch (err) {
      setDeleteError((err as Error).message || 'Failed to delete room.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateRoom = async () => {
    if (!canManageInstitution || !institutionId) return;
    const name = createName.trim();
    const capacity = Number(createCapacity);
    const features = parseFeatures(createFeatures);
    if (!name) { setCreateError('Room name is required.'); return; }
    if (!Number.isFinite(capacity) || capacity < 1) { setCreateError('Capacity must be a positive number.'); return; }
    setCreateLoading(true);
    setCreateError(null);
    try {
      await createRoom({ institution_id: institutionId, name, capacity, features });
      setIsCreateOpen(false);
      setCreateName(''); setCreateCapacity('30'); setCreateFeatures('');
      await loadRooms();
    } catch (err) {
      setCreateError((err as Error).message || 'Failed to create room.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdateRoom = async () => {
    if (!canManageInstitution) return;
    const roomId = String(roomToEdit?.id ?? roomToEdit?._id ?? '');
    if (!roomId) return;
    const name = editName.trim();
    const capacity = Number(editCapacity);
    const features = parseFeatures(editFeatures);
    if (!name) { setEditError('Room name is required.'); return; }
    if (!Number.isFinite(capacity) || capacity < 1) { setEditError('Capacity must be a positive number.'); return; }
    setEditLoading(true);
    setEditError(null);
    try {
      await updateRoom(roomId, { name, capacity, features });
      setRoomToEdit(null);
      setEditName(''); setEditCapacity('30'); setEditFeatures('');
      await loadRooms();
    } catch (err) {
      setEditError((err as Error).message || 'Failed to update room.');
    } finally {
      setEditLoading(false);
    }
  };

  const availableRequiredFeatures = useMemo(() => {
    const features = new Set<string>();
    activities.forEach((activity) => {
      ((activity as { required_room_features?: string[] }).required_room_features ?? []).forEach((f) => {
        const t = String(f).trim();
        if (t) features.add(t);
      });
    });
    rooms.forEach((room) => {
      (room.features ?? []).forEach((f) => { const t = String(f).trim(); if (t) features.add(t); });
    });
    return Array.from(features).sort(compareAlphabetical);
  }, [activities, rooms]);

  const filteredRooms = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const parsedMin = Number(minCapacityFilter);
    const minCapacity = Number.isFinite(parsedMin) && parsedMin > 0 ? parsedMin : null;
    const required = new Set(selectedRequiredFeatures.map((f) => f.toLowerCase()));

    return rooms.filter((room) => {
      if (query && !(room.name ?? '').toLowerCase().includes(query)) return false;
      if (minCapacity !== null && room.capacity < minCapacity) return false;
      if (required.size > 0) {
        const roomFeatures = new Set((room.features ?? []).map((f) => f.toLowerCase()));
        for (const f of required) { if (!roomFeatures.has(f)) return false; }
      }
      return true;
    });
  }, [rooms, searchQuery, minCapacityFilter, selectedRequiredFeatures]);

  const hasActiveFilters = searchQuery || minCapacityFilter || selectedRequiredFeatures.length > 0;

  if (loading || currentUserLoading) {
    return (
      <PageContainer alignItems="center">
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={22} />
          <Typography color="text.secondary">Loading rooms...</Typography>
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
              <Typography variant="h5" sx={{ fontWeight: 700 }}>Rooms</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {rooms.length} room{rooms.length !== 1 ? 's' : ''} in this institution
              </Typography>
            </Box>
            {canManageInstitution && (
              <Button
                variant="contained"
                startIcon={<AddRoundedIcon />}
                onClick={() => { setCreateError(null); setCreateName(''); setCreateCapacity('30'); setCreateFeatures(''); setIsCreateOpen(true); }}
                disabled={!institutionId}
                sx={{ borderRadius: 2 }}
              >
                New room
              </Button>
            )}
          </Box>

          {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}

          {/* Filters */}
          {!error && (
            <Stack spacing={1.5}>
              <TextField
                size="small"
                fullWidth
                placeholder="Search rooms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                slotProps={{ input: { startAdornment: <SearchIcon sx={{ fontSize: '1rem', mr: 0.75, color: 'text.disabled' }} /> } }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                <TextField
                  size="small"
                  type="number"
                  label="Min capacity"
                  value={minCapacityFilter}
                  onChange={(e) => setMinCapacityFilter(e.target.value)}
                  slotProps={{ htmlInput: { min: 1 } }}
                  sx={{ width: 140, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
                <TextField
                  select
                  size="small"
                  label="Required features"
                  value={selectedRequiredFeatures}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedRequiredFeatures(Array.isArray(value) ? value : String(value).split(','));
                  }}
                  sx={{ width: 220, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  SelectProps={{ multiple: true, renderValue: (selected) => (selected as string[]).join(', ') }}
                >
                  {availableRequiredFeatures.length === 0 && <MenuItem disabled>No features available</MenuItem>}
                  {availableRequiredFeatures.map((feature) => (
                    <MenuItem key={feature} value={feature}>{feature}</MenuItem>
                  ))}
                </TextField>
                {hasActiveFilters && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => { setSearchQuery(''); setMinCapacityFilter(''); setSelectedRequiredFeatures([]); }}
                    sx={{ borderRadius: 2, whiteSpace: 'nowrap' }}
                  >
                    Clear filters
                  </Button>
                )}
              </Stack>
            </Stack>
          )}

          {/* Empty states */}
          {!error && rooms.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Box sx={{ display: 'inline-flex', p: 2, borderRadius: 4, bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main', mb: 2 }}>
                <MeetingRoomRoundedIcon sx={{ fontSize: '2.5rem' }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>No rooms yet</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Add rooms to start scheduling activities in specific locations.
              </Typography>
              {canManageInstitution && (
                <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => { setCreateError(null); setCreateName(''); setCreateCapacity('30'); setCreateFeatures(''); setIsCreateOpen(true); }} sx={{ borderRadius: 2 }}>
                  New room
                </Button>
              )}
            </Box>
          )}

          {!error && rooms.length > 0 && filteredRooms.length === 0 && (
            <Typography variant="body2" color="text.secondary">No rooms match the current filters.</Typography>
          )}

          {/* Room list */}
          {!error && filteredRooms.length > 0 && (
            <Stack spacing={1}>
              {filteredRooms.map((room) => {
                const roomId = String(room.id ?? room._id ?? '');
                return (
                  <Paper
                    key={roomId || room.name}
                    variant="outlined"
                    onClick={() => roomId && navigate(roomRoute(roomId))}
                    sx={{
                      borderRadius: 2.5, cursor: 'pointer',
                      transition: 'border-color 150ms ease, box-shadow 150ms ease',
                      '&:hover': {
                        borderColor: 'primary.light',
                        boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.08)}`,
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1.5 }}>
                      <Box sx={{
                        width: 36, height: 36, borderRadius: 2, flexShrink: 0,
                        bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <MeetingRoomRoundedIcon sx={{ fontSize: '1.1rem' }} />
                      </Box>

                      {/* Name + capacity */}
                      <Box sx={{ minWidth: 0, flex: '0 1 200px' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {room.name}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                          <PeopleAltRoundedIcon sx={{ fontSize: '0.75rem', color: 'text.disabled' }} />
                          <Typography variant="caption" color="text.secondary">{room.capacity}</Typography>
                        </Box>
                      </Box>

                      {/* Feature chips */}
                      <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ flex: 1 }}>
                        {(room.features ?? []).length === 0 ? (
                          <Typography variant="caption" color="text.disabled">No features</Typography>
                        ) : (
                          (room.features ?? []).sort(compareAlphabetical).map((feature) => (
                            <Chip key={`${roomId}-${feature}`} label={feature} size="small" variant="outlined" sx={{ fontSize: '0.68rem', height: 20 }} />
                          ))
                        )}
                      </Stack>

                      {/* Admin actions */}
                      {canManageInstitution && (
                        <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              sx={{ borderRadius: 1.5 }}
                              onClick={() => {
                                setEditError(null);
                                setRoomToEdit(room);
                                setEditName(room.name);
                                setEditCapacity(String(room.capacity));
                                setEditFeatures(featuresToInput(room.features));
                              }}
                            >
                              <EditRoundedIcon sx={{ fontSize: '0.9rem' }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              sx={{ borderRadius: 1.5 }}
                              onClick={() => { setDeleteError(null); setRoomToDelete(room); }}
                            >
                              <DeleteOutlineRoundedIcon sx={{ fontSize: '0.9rem' }} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      )}
                    </Box>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Stack>
      </Box>

      {/* Delete dialog */}
      <Dialog open={Boolean(roomToDelete) && canManageInstitution} onClose={() => !isDeleting && setRoomToDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete room?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{roomToDelete?.name ?? 'this room'}</strong>? This action cannot be undone.
          </DialogContentText>
          {deleteError && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{deleteError}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRoomToDelete(null)} disabled={isDeleting} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={isDeleting} sx={{ borderRadius: 2 }}>
            {isDeleting ? <CircularProgress size={18} color="inherit" /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={isCreateOpen && canManageInstitution} onClose={() => !createLoading && setIsCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>New room</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 0.5 }}>
            <TextField label="Room name" value={createName} onChange={(e) => setCreateName(e.target.value)} fullWidth autoFocus disabled={createLoading} />
            <TextField label="Capacity" type="number" value={createCapacity} onChange={(e) => setCreateCapacity(e.target.value)} fullWidth disabled={createLoading} slotProps={{ htmlInput: { min: 1 } }} />
            <TextField label="Features" placeholder="projector, whiteboard" value={createFeatures} onChange={(e) => setCreateFeatures(e.target.value)} fullWidth disabled={createLoading} helperText="Comma-separated list of features" />
            {createError && <Alert severity="error" sx={{ borderRadius: 2 }}>{createError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setIsCreateOpen(false)} disabled={createLoading} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleCreateRoom} variant="contained" disabled={createLoading} sx={{ borderRadius: 2 }}>
            {createLoading ? <CircularProgress size={18} color="inherit" /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={Boolean(roomToEdit) && canManageInstitution} onClose={() => !editLoading && setRoomToEdit(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit room</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 0.5 }}>
            <TextField label="Room name" value={editName} onChange={(e) => setEditName(e.target.value)} fullWidth autoFocus disabled={editLoading} />
            <TextField label="Capacity" type="number" value={editCapacity} onChange={(e) => setEditCapacity(e.target.value)} fullWidth disabled={editLoading} slotProps={{ htmlInput: { min: 1 } }} />
            <TextField label="Features" placeholder="projector, whiteboard" value={editFeatures} onChange={(e) => setEditFeatures(e.target.value)} fullWidth disabled={editLoading} helperText="Comma-separated list of features" />
            {editError && <Alert severity="error" sx={{ borderRadius: 2 }}>{editError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRoomToEdit(null)} disabled={editLoading} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleUpdateRoom} variant="contained" disabled={editLoading} sx={{ borderRadius: 2 }}>
            {editLoading ? <CircularProgress size={18} color="inherit" /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
