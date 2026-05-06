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
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchIcon from '@mui/icons-material/Search';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import PageContainer from '../layout/PageContainer';
import { compareAlphabetical } from '../../utils/text';
import { createCourse, deleteCourse, getInstitutionCourses, updateCourse } from '../../api/courses';
import type { Course } from '../../types/course';
import { courseRoute } from '../../config/routes';
import { getCurrentUserData, isInstitutionAdmin } from '../../utils/institutionAdmin';
import type { InstitutionUser } from '../../api/institutions';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

export default function InstitutionCourses() {
  const theme = useTheme();
  const { institutionId } = useParams();
  const navigate = useNavigate();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [courseToEdit, setCourseToEdit] = useState<Course | null>(null);
  const [editName, setEditName] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<InstitutionUser | null>(null);
  const [currentUserLoading, setCurrentUserLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');

  const loadCourses = async () => {
    if (!institutionId) { setError('Missing institution id in route.'); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const list = await getInstitutionCourses(institutionId);
      setCourses([...list].sort((a, b) => compareAlphabetical(a.name, b.name)));
    } catch (err) {
      setError((err as Error).message || 'Failed to load courses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCourses(); }, [institutionId]);

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
    if (!canManageInstitution || !courseToDelete) return;
    setDeletingId(courseToDelete.id);
    setDeleteError(null);
    try {
      await deleteCourse(courseToDelete.id);
      setCourseToDelete(null);
      await loadCourses();
    } catch (err) {
      setDeleteError((err as Error).message || 'Failed to delete course.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateCourse = async () => {
    if (!canManageInstitution || !institutionId) return;
    const name = createName.trim();
    if (!name) { setCreateError('Course name is required.'); return; }
    setCreateLoading(true);
    setCreateError(null);
    try {
      await createCourse({ institution_id: institutionId, name });
      setIsCreateOpen(false);
      setCreateName('');
      await loadCourses();
    } catch (err) {
      setCreateError((err as Error).message || 'Failed to create course.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdateCourse = async () => {
    if (!canManageInstitution || !courseToEdit) return;
    const name = editName.trim();
    if (!name) { setEditError('Course name is required.'); return; }
    setEditLoading(true);
    setEditError(null);
    try {
      await updateCourse(courseToEdit.id, { name });
      setCourseToEdit(null);
      setEditName('');
      await loadCourses();
    } catch (err) {
      setEditError((err as Error).message || 'Failed to update course.');
    } finally {
      setEditLoading(false);
    }
  };

  const filteredCourses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return courses.filter((c) => (c.name ?? '').toLowerCase().includes(query));
  }, [courses, searchQuery]);

  if (loading || currentUserLoading) {
    return (
      <PageContainer alignItems="center">
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={22} />
          <Typography color="text.secondary">Loading courses...</Typography>
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
              <Typography variant="h5" sx={{ fontWeight: 700 }}>Courses</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {courses.length} course{courses.length !== 1 ? 's' : ''} in this institution
              </Typography>
            </Box>
            {canManageInstitution && (
              <Button
                variant="contained"
                startIcon={<AddRoundedIcon />}
                onClick={() => { setCreateError(null); setCreateName(''); setIsCreateOpen(true); }}
                disabled={!institutionId}
                sx={{ borderRadius: 2 }}
              >
                New course
              </Button>
            )}
          </Box>

          {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}

          {/* Search */}
          {!error && (
            <TextField
              size="small"
              fullWidth
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              slotProps={{
                input: { startAdornment: <SearchIcon sx={{ fontSize: '1rem', mr: 0.75, color: 'text.disabled' }} /> },
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          )}

          {/* Empty states */}
          {!error && courses.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Box sx={{ display: 'inline-flex', p: 2, borderRadius: 4, bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main', mb: 2 }}>
                <MenuBookRoundedIcon sx={{ fontSize: '2.5rem' }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>No courses yet</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Create your first course to start assigning activities.
              </Typography>
              {canManageInstitution && (
                <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => { setCreateError(null); setCreateName(''); setIsCreateOpen(true); }} sx={{ borderRadius: 2 }}>
                  New course
                </Button>
              )}
            </Box>
          )}

          {!error && courses.length > 0 && filteredCourses.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No courses match &ldquo;{searchQuery}&rdquo;.
            </Typography>
          )}

          {/* Course list */}
          {!error && filteredCourses.length > 0 && (
            <Stack spacing={1}>
              {filteredCourses.map((course) => (
                <Paper
                  key={course.id}
                  variant="outlined"
                  onClick={() => navigate(courseRoute(course.id))}
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
                      <MenuBookRoundedIcon sx={{ fontSize: '1.1rem' }} />
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {course.name}
                    </Typography>
                    {canManageInstitution && (
                      <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="Edit">
                          <IconButton size="small" sx={{ borderRadius: 1.5 }} onClick={() => { setEditError(null); setCourseToEdit(course); setEditName(course.name); }}>
                            <EditRoundedIcon sx={{ fontSize: '0.9rem' }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" sx={{ borderRadius: 1.5 }} onClick={() => { setDeleteError(null); setCourseToDelete(course); }}>
                            <DeleteOutlineRoundedIcon sx={{ fontSize: '0.9rem' }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    )}
                  </Box>
                </Paper>
              ))}
            </Stack>
          )}
        </Stack>
      </Box>

      {/* Delete dialog */}
      <Dialog open={Boolean(courseToDelete) && canManageInstitution} onClose={() => !isDeleting && setCourseToDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete course?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{courseToDelete?.name ?? 'this course'}</strong>? This action cannot be undone.
          </DialogContentText>
          {deleteError && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{deleteError}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCourseToDelete(null)} disabled={isDeleting} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={isDeleting} sx={{ borderRadius: 2 }}>
            {isDeleting ? <CircularProgress size={18} color="inherit" /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={isCreateOpen && canManageInstitution} onClose={() => !createLoading && setIsCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>New course</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 0.5 }}>
            <TextField label="Course name" value={createName} onChange={(e) => setCreateName(e.target.value)} fullWidth autoFocus disabled={createLoading} />
            {createError && <Alert severity="error" sx={{ borderRadius: 2 }}>{createError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setIsCreateOpen(false)} disabled={createLoading} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleCreateCourse} variant="contained" disabled={createLoading} sx={{ borderRadius: 2 }}>
            {createLoading ? <CircularProgress size={18} color="inherit" /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={Boolean(courseToEdit) && canManageInstitution} onClose={() => !editLoading && setCourseToEdit(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit course</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 0.5 }}>
            <TextField label="Course name" value={editName} onChange={(e) => setEditName(e.target.value)} fullWidth autoFocus disabled={editLoading} />
            {editError && <Alert severity="error" sx={{ borderRadius: 2 }}>{editError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCourseToEdit(null)} disabled={editLoading} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleUpdateCourse} variant="contained" disabled={editLoading} sx={{ borderRadius: 2 }}>
            {editLoading ? <CircularProgress size={18} color="inherit" /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
