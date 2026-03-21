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
import MenuBookIcon from '@mui/icons-material/MenuBook';
import PageContainer from '../layout/PageContainer';
import { compareAlphabetical } from '../../utils/text';
import { createCourse, deleteCourse, getInstitutionCourses, updateCourse } from '../../api/courses';
import type { Course } from '../../types/course';
import { courseRoute } from '../../config/routes';
import { getCurrentUserData, isInstitutionAdmin } from '../../utils/institutionAdmin';
import type { InstitutionUser } from '../../api/institutions';


export default function InstitutionCourses() {
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
    if (!institutionId) {
      setError('Missing institution id in route.');
      setLoading(false);
      return;
    }

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

  useEffect(() => {
    loadCourses();
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
    if (!courseToDelete) return;
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
    if (!canManageInstitution) return;
    if (!institutionId) return;
    const name = createName.trim();
    if (!name) {
      setCreateError('Course name is required.');
      return;
    }

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
    if (!canManageInstitution) return;
    if (!courseToEdit) return;
    const name = editName.trim();
    if (!name) {
      setEditError('Course name is required.');
      return;
    }

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

  const isDeleting = useMemo(() => deletingId !== null, [deletingId]);

  const filteredCourses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return courses.filter((course) => (course.name ?? '').toLowerCase().includes(query));
  }, [courses, searchQuery]);

  if (loading || currentUserLoading) {
    return (
      <PageContainer alignItems="center">
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={24} />
          <Typography>Loading courses...</Typography>
        </Stack>
      </PageContainer>
    );
  }

  return (
    <PageContainer alignItems="flex-start">
      <Box sx={{ width: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, gap: 2, flexWrap: 'wrap' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <MenuBookIcon color="primary" />
            <Typography variant="h4" sx={{ fontWeight: 700 }}>Courses</Typography>
          </Stack>
          {canManageInstitution && (
            <Button
              variant="contained"
              onClick={() => {
                setCreateError(null);
                setCreateName('');
                setIsCreateOpen(true);
              }}
              disabled={!institutionId}
            >
              Create course
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
                label="Search courses"
                placeholder="Type course name..."
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

        {!error && courses.length === 0 && (
          <Typography color="text.secondary">No courses found for this institution.</Typography>
        )}

        {!error && courses.length > 0 && filteredCourses.length === 0 && (
          <Typography color="text.secondary">No courses match the current search/filter.</Typography>
        )}

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' } }}>
          {filteredCourses.map((course) => (
            <Card key={course.id} variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flex: '1 1 auto' }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <MenuBookIcon fontSize="small" color="action" />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{course.name}</Typography>
                  </Stack>
              </CardContent>
              <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                <Stack direction="row" spacing={1}>
                  <Button size="small" onClick={() => navigate(courseRoute(course.id))}>Open</Button>
                  {canManageInstitution && (
                    <Button
                      size="small"
                      onClick={() => {
                        setEditError(null);
                        setCourseToEdit(course);
                        setEditName(course.name);
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
                      setCourseToDelete(course);
                    }}
                  >
                    Delete
                  </Button>
                )}
              </CardActions>
            </Card>
          ))}
        </Box>

        <Dialog open={Boolean(courseToDelete) && canManageInstitution} onClose={() => !isDeleting && setCourseToDelete(null)} maxWidth="xs" fullWidth>
          <DialogTitle>Delete course?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete <strong>{courseToDelete?.name ?? 'this course'}</strong>? This action cannot be undone.
            </DialogContentText>
            {deleteError && <Alert severity="error" sx={{ mt: 2 }}>{deleteError}</Alert>}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCourseToDelete(null)} disabled={isDeleting}>Cancel</Button>
            <Button onClick={handleDelete} color="error" variant="contained" disabled={isDeleting}>
              {isDeleting ? <CircularProgress size={18} color="inherit" /> : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={isCreateOpen && canManageInstitution} onClose={() => !createLoading && setIsCreateOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Create course</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <TextField
                label="Course name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                fullWidth
                disabled={createLoading}
              />
            </Stack>
            {createError && <Alert severity="error" sx={{ mt: 2 }}>{createError}</Alert>}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsCreateOpen(false)} disabled={createLoading}>Cancel</Button>
            <Button onClick={handleCreateCourse} variant="contained" disabled={createLoading}>
              {createLoading ? <CircularProgress size={18} color="inherit" /> : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={Boolean(courseToEdit) && canManageInstitution} onClose={() => !editLoading && setCourseToEdit(null)} maxWidth="xs" fullWidth>
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
            <Button onClick={() => setCourseToEdit(null)} disabled={editLoading}>Cancel</Button>
            <Button onClick={handleUpdateCourse} variant="contained" disabled={editLoading}>
              {editLoading ? <CircularProgress size={18} color="inherit" /> : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageContainer>
  );
}
