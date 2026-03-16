import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
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
import PageContainer from '../layout/PageContainer';
import { compareAlphabetical } from '../../utils/text';
import { parseFeatures, featuresToInput } from '../../utils/roomFeatures';
import { createRoom, deleteRoom, updateRoom } from '../../api/rooms';
import { getInstitutionActivities, getInstitutionRooms } from '../../api/institutions';
import type { InstitutionActivity, InstitutionRoom, InstitutionUser } from '../../api/institutions';
import { roomRoute } from '../../config/routes';
import { getCurrentUserData, isInstitutionAdmin } from '../../utils/institutionAdmin';


export default function InstitutionRooms() {
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
    if (!institutionId) {
      setError('Missing institution id in route.');
      setLoading(false);
      return;
    }

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

  useEffect(() => {
    loadRooms();
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
    if (!canManageInstitution) return;
    if (!institutionId) return;

    const name = createName.trim();
    const capacity = Number(createCapacity);
    const features = parseFeatures(createFeatures);

    if (!name) {
      setCreateError('Room name is required.');
      return;
    }

    if (!Number.isFinite(capacity) || capacity < 1) {
      setCreateError('Capacity must be a positive number.');
      return;
    }

    setCreateLoading(true);
    setCreateError(null);
    try {
      await createRoom({ institution_id: institutionId, name, capacity, features });
      setIsCreateOpen(false);
      setCreateName('');
      setCreateCapacity('30');
      setCreateFeatures('');
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

    if (!name) {
      setEditError('Room name is required.');
      return;
    }

    if (!Number.isFinite(capacity) || capacity < 1) {
      setEditError('Capacity must be a positive number.');
      return;
    }

    setEditLoading(true);
    setEditError(null);
    try {
      await updateRoom(roomId, { name, capacity, features });
      setRoomToEdit(null);
      setEditName('');
      setEditCapacity('30');
      setEditFeatures('');
      await loadRooms();
    } catch (err) {
      setEditError((err as Error).message || 'Failed to update room.');
    } finally {
      setEditLoading(false);
    }
  };

  const isDeleting = useMemo(() => deletingId !== null, [deletingId]);

  const availableRequiredFeatures = useMemo(() => {
    const features = new Set<string>();

    // Prefer course/activity-required features, but also include existing room features
    // so the filter is still usable even when requirement metadata is missing.
    activities.forEach((activity) => {
      ((activity as { required_room_features?: string[] }).required_room_features ?? []).forEach((feature) => {
        const trimmed = String(feature).trim();
        if (trimmed) features.add(trimmed);
      });
    });

    rooms.forEach((room) => {
      (room.features ?? []).forEach((feature) => {
        const trimmed = String(feature).trim();
        if (trimmed) features.add(trimmed);
      });
    });

    return Array.from(features).sort(compareAlphabetical);
  }, [activities, rooms]);

  const filteredRooms = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const parsedMinCapacity = Number(minCapacityFilter);
    const minCapacity = Number.isFinite(parsedMinCapacity) && parsedMinCapacity > 0 ? parsedMinCapacity : null;
    const required = new Set(selectedRequiredFeatures.map((feature) => feature.toLowerCase()));

    return rooms.filter((room) => {
      if (query && !(room.name ?? '').toLowerCase().includes(query)) return false;

      if (minCapacity !== null && room.capacity < minCapacity) return false;

      if (required.size > 0) {
        const roomFeatures = new Set((room.features ?? []).map((feature) => feature.toLowerCase()));
        for (const feature of required) {
          if (!roomFeatures.has(feature)) return false;
        }
      }

      return true;
    });
  }, [rooms, searchQuery, minCapacityFilter, selectedRequiredFeatures]);

  if (loading || currentUserLoading) {
    return (
      <PageContainer alignItems="center">
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={24} />
          <Typography>Loading rooms...</Typography>
        </Stack>
      </PageContainer>
    );
  }

  return (
    <PageContainer alignItems="flex-start">
      <Box sx={{ width: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Rooms</Typography>
          {canManageInstitution && (
            <Button
              variant="contained"
              onClick={() => {
                setCreateError(null);
                setCreateName('');
                setCreateCapacity('30');
                setCreateFeatures('');
                setIsCreateOpen(true);
              }}
              disabled={!institutionId}
            >
              Create room
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
                label="Search rooms"
                placeholder="Type room name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <TextField
                size="small"
                type="number"
                label="Min capacity"
                value={minCapacityFilter}
                onChange={(e) => setMinCapacityFilter(e.target.value)}
                sx={{ minWidth: { xs: '100%', md: 160 } }}
                slotProps={{ htmlInput: { min: 1 } }}
              />
              <TextField
                select
                size="small"
                label="Features"
                value={selectedRequiredFeatures}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedRequiredFeatures(Array.isArray(value) ? value : String(value).split(','));
                }}
                sx={{ minWidth: { xs: '100%', md: 160 } }}
                SelectProps={{
                  multiple: true,
                  renderValue: (selected) => (selected as string[]).join(', '),
                }}
              >
                {availableRequiredFeatures.length === 0 && (
                  <MenuItem disabled>No features available</MenuItem>
                )}
                {availableRequiredFeatures.map((feature) => (
                  <MenuItem key={feature} value={feature}>{feature}</MenuItem>
                ))}
              </TextField>
              <Button
                variant="outlined"
                onClick={() => {
                  setSearchQuery('');
                  setMinCapacityFilter('');
                  setSelectedRequiredFeatures([]);
                }}
              >
                Reset
              </Button>
            </Stack>
          </Paper>
        )}

        {!error && rooms.length === 0 && (
          <Typography color="text.secondary">No rooms found for this institution.</Typography>
        )}

        {!error && rooms.length > 0 && filteredRooms.length === 0 && (
          <Typography color="text.secondary">No rooms match the current search/filter.</Typography>
        )}

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' } }}>
          {filteredRooms.map((room) => {
            const roomId = String(room.id ?? room._id ?? '');
            return (
              <Card key={roomId || room.name} variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flex: '1 1 auto' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{room.name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Capacity: {room.capacity}
                  </Typography>
                  <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                    {(room.features ?? []).length === 0 ? (
                      <Typography variant="caption" color="text.secondary">No features</Typography>
                    ) : (
                      (room.features ?? []).sort(compareAlphabetical).map((feature) => (
                        <Chip key={`${roomId}-${feature}`} label={feature} size="small" variant="outlined" />
                      ))
                    )}
                  </Stack>
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" onClick={() => roomId && navigate(roomRoute(roomId))}>Open</Button>
                    {canManageInstitution && (
                      <Button
                        size="small"
                        onClick={() => {
                          setEditError(null);
                          setRoomToEdit(room);
                          setEditName(room.name);
                          setEditCapacity(String(room.capacity));
                          setEditFeatures(featuresToInput(room.features));
                        }}
                      >
                        Edit
                      </Button>
                    )}
                  </Stack>
                  {canManageInstitution && (
                    <Button
                      size="small"
                      color="error"
                      onClick={() => {
                        setDeleteError(null);
                        setRoomToDelete(room);
                      }}
                    >
                      Delete
                    </Button>
                  )}
                </CardActions>
              </Card>
            );
          })}
        </Box>

        <Dialog open={Boolean(roomToDelete) && canManageInstitution} onClose={() => !isDeleting && setRoomToDelete(null)} maxWidth="xs" fullWidth>
          <DialogTitle>Delete room?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete <strong>{roomToDelete?.name ?? 'this room'}</strong>? This action cannot be undone.
            </DialogContentText>
            {deleteError && <Alert severity="error" sx={{ mt: 2 }}>{deleteError}</Alert>}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRoomToDelete(null)} disabled={isDeleting}>Cancel</Button>
            <Button onClick={handleDelete} color="error" variant="contained" disabled={isDeleting}>
              {isDeleting ? <CircularProgress size={18} color="inherit" /> : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={isCreateOpen && canManageInstitution} onClose={() => !createLoading && setIsCreateOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Create room</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <TextField
                label="Room name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                fullWidth
                disabled={createLoading}
              />
              <TextField
                label="Capacity"
                type="number"
                value={createCapacity}
                onChange={(e) => setCreateCapacity(e.target.value)}
                fullWidth
                disabled={createLoading}
                slotProps={{ htmlInput: { min: 1 } }}
              />
              <TextField
                label="Features"
                placeholder="projector, whiteboard"
                value={createFeatures}
                onChange={(e) => setCreateFeatures(e.target.value)}
                fullWidth
                disabled={createLoading}
              />
            </Stack>
            {createError && <Alert severity="error" sx={{ mt: 2 }}>{createError}</Alert>}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsCreateOpen(false)} disabled={createLoading}>Cancel</Button>
            <Button onClick={handleCreateRoom} variant="contained" disabled={createLoading}>
              {createLoading ? <CircularProgress size={18} color="inherit" /> : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={Boolean(roomToEdit) && canManageInstitution} onClose={() => !editLoading && setRoomToEdit(null)} maxWidth="sm" fullWidth>
          <DialogTitle>Update room</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <TextField
                label="Room name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                fullWidth
                disabled={editLoading}
              />
              <TextField
                label="Capacity"
                type="number"
                value={editCapacity}
                onChange={(e) => setEditCapacity(e.target.value)}
                fullWidth
                disabled={editLoading}
                slotProps={{ htmlInput: { min: 1 } }}
              />
              <TextField
                label="Features"
                placeholder="projector, whiteboard"
                value={editFeatures}
                onChange={(e) => setEditFeatures(e.target.value)}
                fullWidth
                disabled={editLoading}
              />
            </Stack>
            {editError && <Alert severity="error" sx={{ mt: 2 }}>{editError}</Alert>}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRoomToEdit(null)} disabled={editLoading}>Cancel</Button>
            <Button onClick={handleUpdateRoom} variant="contained" disabled={editLoading}>
              {editLoading ? <CircularProgress size={18} color="inherit" /> : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageContainer>
  );
}






