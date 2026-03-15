import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Avatar from '@mui/material/Avatar';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import GroupIcon from '@mui/icons-material/Group';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import EventNoteIcon from '@mui/icons-material/EventNote';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import PageContainer from '../layout/PageContainer';
import {
  activityRoute,
  courseRoute,
  groupRoute,
  INSTITUTIONS_ROUTE,
  memberRoute,
  roomRoute,
  scheduleRoute,
} from '../../config/routes';
import {
  deleteInstitution,
  getInstitutionActivities,
  getInstitutionById,
  getInstitutionCourses,
  getInstitutionGroups,
  getInstitutionRooms,
  getInstitutionSchedules,
  getInstitutionUsers,
  removeUserFromInstitution,
} from '../../api/institutions';
import type {
  InstitutionActivity,
  InstitutionCourse,
  InstitutionGroup,
  InstitutionRoom,
  InstitutionSchedule,
  InstitutionUser,
} from '../../api/institutions';
import { Institution } from '../../types/institution';
import { API_INSTITUTIONS_PATH, API_URL } from '../../config/constants';
import { apiGet, apiPost } from '../../utils/apiClient';

type RelatedState<T> = {
  data: T[];
  loading: boolean;
  error: string | null;
};

type ListItem = {
  key: string;
  primary: string;
  secondary?: string;
  to?: string;
  roles?: string[];
  rowAction?: React.ReactNode;
};

type StatCardProps = {
  icon: React.ReactNode;
  label: string;
  value: number;
  loading?: boolean;
};

type InstitutionRole = 'student' | 'professor' | 'admin';

const ALL_INSTITUTION_ROLES: InstitutionRole[] = ['admin', 'professor', 'student'];

const compareAlphabetical = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' });

function getAuthHeaders(): Record<string, string> {
  const authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  const headers: Record<string, string> = {};
  if (authToken) headers.Authorization = authToken;
  return headers;
}

async function getCurrentUserData(): Promise<InstitutionUser> {
  const res = await apiGet<any>(`${API_URL}/api/v1/users/me`, getAuthHeaders());
  return (res?.user ?? res) as InstitutionUser;
}

async function assignRoleToUser(institutionId: string, userId: string, role: InstitutionRole): Promise<void> {
  await apiPost<void>(`${API_URL}${API_INSTITUTIONS_PATH}/${institutionId}/users/${userId}/roles/${role}`, undefined, getAuthHeaders());
}

async function removeRoleFromUser(institutionId: string, userId: string, role: InstitutionRole): Promise<void> {
  await fetch(`${API_URL}${API_INSTITUTIONS_PATH}/${institutionId}/users/${userId}/roles/${role}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  }).then(async (res) => {
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Failed to remove role.');
    }
  });
}

function getInstitutionRoles(user: InstitutionUser, institutionId: string): InstitutionRole[] {
  const roles = user.user_roles?.[institutionId] ?? user.user_roles?.[String(institutionId)] ?? [];
  return Array.isArray(roles) ? (roles as InstitutionRole[]) : [];
}

function toTitleLabel(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function isAdmin(user: InstitutionUser, institutionId: string): boolean {
  const roles = user.user_roles?.[institutionId] ?? user.user_roles?.[String(institutionId)];
  return Array.isArray(roles) && roles.includes('admin');
}

function formatCreatedAt(timestamp?: string): string | undefined {
  if (!timestamp) return undefined;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;

  const datePart = date.toLocaleDateString();
  const timePart = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return `Created on ${datePart} at ${timePart}`;
}

function StatCard({ icon, label, value, loading = false }: StatCardProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        height: '100%',
        borderRadius: 3,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Avatar sx={{ bgcolor: 'primary.main', width: 34, height: 34 }}>{icon}</Avatar>
        <Box>
          <Typography variant="caption" color="text.secondary">{label}</Typography>
          {loading ? <CircularProgress size={18} /> : <Typography variant="h6" sx={{ lineHeight: 1.1, fontWeight: 700 }}>{value}</Typography>}
        </Box>
      </Stack>
    </Paper>
  );
}

type SearchableListProps = {
  title: string;
  items: ListItem[];
  emptyText: string;
  loading: boolean;
  error: string | null;
  headerAction?: React.ReactNode;
};

function SearchableList({ title, items, emptyText, loading, error, headerAction }: SearchableListProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => `${item.primary} ${item.secondary ?? ''} ${(item.roles ?? []).join(' ')}`.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>{title}</Typography>
        {headerAction}
      </Box>
      <Divider sx={{ mb: 1.5 }} />
      <TextField
        size="small"
        fullWidth
        placeholder={`Search ${title.toLowerCase()}...`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        sx={{ mb: 1.5 }}
        slotProps={{
          input: {
            startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />,
          },
        }}
      />

      {loading ? (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={18} />
          <Typography color="text.secondary" variant="body2">Loading...</Typography>
        </Stack>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : filteredItems.length === 0 ? (
        <Typography color="text.secondary" variant="body2">{emptyText}</Typography>
      ) : (
        <Box
          sx={{
            maxHeight: 260,
            overflowY: 'scroll',
            pr: 0.5,
            scrollbarWidth: 'auto',
            scrollbarColor: 'rgba(33,150,243,0.7) rgba(255,255,255,0.08)',
            '&::-webkit-scrollbar': { width: 10 },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(33,150,243,0.7)',
              borderRadius: 8,
              border: '2px solid rgba(255,255,255,0.08)',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'rgba(255,255,255,0.08)',
              borderRadius: 8,
            },
          }}
        >
          <Stack spacing={1}>
            {filteredItems.map((item) => (
              <Box
                key={item.key}
                onClick={item.to ? () => navigate(item.to as string) : undefined}
                sx={{
                  px: 1,
                  py: 0.75,
                  borderRadius: 1.5,
                  cursor: item.to ? 'pointer' : 'default',
                  '&:hover': item.to ? { backgroundColor: 'action.hover' } : undefined,
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                  <Typography variant="body2">{item.primary}</Typography>
                  <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" justifyContent="flex-end" alignItems="center">
                    {item.roles && item.roles.map((role) => (
                      <Chip key={`${item.key}-${role}`} label={toTitleLabel(role)} size="small" variant="outlined" />
                    ))}
                    {item.rowAction}
                  </Stack>
                </Stack>
                {item.secondary && <Typography variant="caption" color="text.secondary">{item.secondary}</Typography>}
              </Box>
            ))}
          </Stack>
        </Box>
      )}
    </Paper>
  );
}

export default function InstitutionMainPage() {
  const { institutionId } = useParams();
  const navigate = useNavigate();
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [institutionLoading, setInstitutionLoading] = useState(true);
  const [institutionError, setInstitutionError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<InstitutionUser | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isMemberRolesDialogOpen, setIsMemberRolesDialogOpen] = useState(false);
  const [memberDialogMode, setMemberDialogMode] = useState<'add' | 'edit'>('add');
  const [selectedUserToAdd, setSelectedUserToAdd] = useState<InstitutionUser | null>(null);
  const [editingMember, setEditingMember] = useState<InstitutionUser | null>(null);
  const [selectedMemberRoles, setSelectedMemberRoles] = useState<InstitutionRole[]>(['student']);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [removeMemberError, setRemoveMemberError] = useState<string | null>(null);
  const [availableUsers, setAvailableUsers] = useState<InstitutionUser[]>([]);
  const [availableUsersLoading, setAvailableUsersLoading] = useState(false);
  const [availableUsersError, setAvailableUsersError] = useState<string | null>(null);

  const [usersState, setUsersState] = useState<RelatedState<InstitutionUser>>({ data: [], loading: false, error: null });
  const [groupsState, setGroupsState] = useState<RelatedState<InstitutionGroup>>({ data: [], loading: false, error: null });
  const [coursesState, setCoursesState] = useState<RelatedState<InstitutionCourse>>({ data: [], loading: false, error: null });
  const [roomsState, setRoomsState] = useState<RelatedState<InstitutionRoom>>({ data: [], loading: false, error: null });
  const [activitiesState, setActivitiesState] = useState<RelatedState<InstitutionActivity>>({ data: [], loading: false, error: null });
  const [schedulesState, setSchedulesState] = useState<RelatedState<InstitutionSchedule>>({ data: [], loading: false, error: null });

  useEffect(() => {
    let mounted = true;

    if (!institutionId) {
      setInstitutionLoading(false);
      setInstitutionError('Missing institution id in route.');
      return () => {
        mounted = false;
      };
    }

    (async () => {
      setInstitutionLoading(true);
      setInstitutionError(null);
      try {
        const institutionData = await getInstitutionById(institutionId);
        if (!mounted) return;
        setInstitution(institutionData);
      } catch (err) {
        if (!mounted) return;
        setInstitutionError((err as Error).message || 'Failed to load institution page.');
      } finally {
        if (mounted) setInstitutionLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [institutionId]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const me = await getCurrentUserData();
        if (!mounted) return;
        setCurrentUser(me);
      } catch (err) {
        if (!mounted) return;
        setCurrentUser(null);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    if (!institutionId || !institution || institutionError) {
      return () => {
        mounted = false;
      };
    }

    const loadUsers = async () => {
      setUsersState({ data: [], loading: true, error: null });
      try {
        const users = await getInstitutionUsers(institutionId);
        if (!mounted) return;
        setUsersState({ data: users, loading: false, error: null });
      } catch (err) {
        if (!mounted) return;
        setUsersState({ data: [], loading: false, error: (err as Error).message || 'Failed to load members.' });
      }
    };

    const loadGroups = async () => {
      setGroupsState({ data: [], loading: true, error: null });
      try {
        const groups = await getInstitutionGroups(institutionId);
        if (!mounted) return;
        setGroupsState({ data: groups, loading: false, error: null });
      } catch (err) {
        if (!mounted) return;
        setGroupsState({ data: [], loading: false, error: (err as Error).message || 'Failed to load groups.' });
      }
    };

    const loadCourses = async () => {
      setCoursesState({ data: [], loading: true, error: null });
      try {
        const courses = await getInstitutionCourses(institutionId);
        if (!mounted) return;
        setCoursesState({ data: courses, loading: false, error: null });
      } catch (err) {
        if (!mounted) return;
        setCoursesState({ data: [], loading: false, error: (err as Error).message || 'Failed to load courses.' });
      }
    };

    const loadRooms = async () => {
      setRoomsState({ data: [], loading: true, error: null });
      try {
        const rooms = await getInstitutionRooms(institutionId);
        if (!mounted) return;
        setRoomsState({ data: rooms, loading: false, error: null });
      } catch (err) {
        if (!mounted) return;
        setRoomsState({ data: [], loading: false, error: (err as Error).message || 'Failed to load rooms.' });
      }
    };

    const loadActivities = async () => {
      setActivitiesState({ data: [], loading: true, error: null });
      try {
        const activities = await getInstitutionActivities(institutionId);
        if (!mounted) return;
        setActivitiesState({ data: activities, loading: false, error: null });
      } catch (err) {
        if (!mounted) return;
        setActivitiesState({ data: [], loading: false, error: (err as Error).message || 'Failed to load activities.' });
      }
    };

    const loadSchedules = async () => {
      setSchedulesState({ data: [], loading: true, error: null });
      try {
        const schedules = await getInstitutionSchedules(institutionId);
        if (!mounted) return;
        setSchedulesState({ data: schedules, loading: false, error: null });
      } catch (err) {
        if (!mounted) return;
        setSchedulesState({ data: [], loading: false, error: (err as Error).message || 'Failed to load schedules.' });
      }
    };

    loadUsers();
    loadGroups();
    loadCourses();
    loadRooms();
    loadActivities();
    loadSchedules();

    return () => {
      mounted = false;
    };
  }, [institutionId, institution, institutionError]);

  const handleRemoveMember = async (userId: string) => {
    if (!institutionId || !canManageInstitution) return;
    setRemovingMemberId(userId);
    setRemoveMemberError(null);
    try {
      await removeUserFromInstitution(institutionId, userId);
      const users = await getInstitutionUsers(institutionId);
      setUsersState({ data: users, loading: false, error: null });
    } catch (err) {
      setRemoveMemberError((err as Error).message || 'Failed to remove member.');
    } finally {
      setRemovingMemberId(null);
    }
  };

  const canManageInstitution = useMemo(() => {
    if (!institutionId || !currentUser) return false;
    const roles = currentUser.user_roles?.[institutionId] ?? currentUser.user_roles?.[String(institutionId)] ?? [];
    return Array.isArray(roles) && roles.includes('admin');
  }, [currentUser, institutionId]);

  const membersList = useMemo(() => {
    if (!institutionId) return [];
    return usersState.data.map((user) => {
      const name = user.name ?? user.email ?? 'Unknown user';
      const userId = String(user.id ?? user._id ?? user.email ?? name);
      const roles = [...getInstitutionRoles(user, institutionId)].sort(compareAlphabetical);
      const isRemoving = removingMemberId === userId;
      return {
        key: userId,
        primary: name,
        secondary: user.email,
        to: memberRoute(userId),
        roles,
        rowAction: canManageInstitution ? (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <IconButton
              size="small"
              aria-label="Edit roles"
              disabled={isRemoving || isDeleting || isAddingMember}
              onClick={(event) => {
                event.stopPropagation();
                setAddMemberError(null);
                setAvailableUsersError(null);
                setEditingMember(user);
                setSelectedUserToAdd(null);
                setSelectedMemberRoles(roles.length > 0 ? roles : ['student']);
                setMemberDialogMode('edit');
                setIsMemberRolesDialogOpen(true);
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              color="error"
              aria-label="Remove member"
              disabled={isRemoving || isDeleting || isAddingMember}
              onClick={(event) => {
                event.stopPropagation();
                handleRemoveMember(userId);
              }}
            >
              {isRemoving ? <CircularProgress size={14} color="inherit" /> : <CloseIcon fontSize="small" />}
            </IconButton>
          </Stack>
        ) : undefined,
      };
    }).sort((a, b) => compareAlphabetical(a.primary, b.primary));
  }, [usersState.data, institutionId, canManageInstitution, removingMemberId, isDeleting, isAddingMember]);

  const adminCount = useMemo(() => {
    if (!institutionId) return 0;
    return usersState.data.filter((user) => isAdmin(user, institutionId)).length;
  }, [usersState.data, institutionId]);

  const groupsList = useMemo(() => groupsState.data.map((group) => ({
    key: String(group.id ?? group._id ?? group.name),
    primary: group.name,
    to: groupRoute(String(group.id ?? group._id ?? group.name)),
  })).sort((a, b) => compareAlphabetical(a.primary, b.primary)), [groupsState.data, institutionId]);

  const coursesList = useMemo(() => coursesState.data.map((course) => ({
    key: String(course.id ?? course._id ?? course.name),
    primary: course.name,
    to: courseRoute(String(course.id ?? course._id ?? course.name)),
  })).sort((a, b) => compareAlphabetical(a.primary, b.primary)), [coursesState.data, institutionId]);

  const roomsList = useMemo(() => roomsState.data.map((room) => ({
    key: String(room.id ?? room._id ?? room.name),
    primary: room.name,
    secondary: `${room.capacity} seats`,
    to: roomRoute(String(room.id ?? room._id ?? room.name)),
  })).sort((a, b) => compareAlphabetical(a.primary, b.primary)), [roomsState.data, institutionId]);

  const groupNameById = useMemo(() => {
    const map: Record<string, string> = {};
    groupsState.data.forEach((group) => {
      const key = String(group.id ?? group._id ?? '');
      if (key) map[key] = group.name;
    });
    return map;
  }, [groupsState.data]);

  const courseNameById = useMemo(() => {
    const map: Record<string, string> = {};
    coursesState.data.forEach((course) => {
      const key = String(course.id ?? course._id ?? '');
      if (key) map[key] = course.name;
    });
    return map;
  }, [coursesState.data]);

  const activitiesList = useMemo(() => activitiesState.data.map((activity) => {
    const groupName = groupNameById[String(activity.group_id)] ?? activity.group_id;
    const activityCourseId = (activity as { course_id?: string }).course_id;
    const courseName = courseNameById[String(activityCourseId ?? '')] ?? String(activityCourseId ?? 'Unknown course');
    const activityId = String(activity.id ?? activity._id ?? `${activity.activity_type}-${activity.group_id}`);
    const activityTypeLabel = toTitleLabel(activity.activity_type);
    const frequencyLabel = toTitleLabel(activity.frequency);
    return {
      key: activityId,
      primary: `${groupName} ${courseName} ${activityTypeLabel}`,
      secondary: `Frequency: ${frequencyLabel} · Duration: ${activity.duration_slots}`,
      to: activityRoute(activityId),
    };
  }).sort((a, b) => compareAlphabetical(a.primary, b.primary)), [activitiesState.data, groupNameById, courseNameById, institutionId]);

  const schedulesList = useMemo(() => schedulesState.data.map((schedule) => {
    const scheduleId = String(schedule.id ?? schedule._id ?? schedule.timestamp ?? 'schedule');
    return {
      key: scheduleId,
      primary: String(schedule.status ?? 'unknown').toUpperCase(),
      secondary: formatCreatedAt(schedule.timestamp),
      to: scheduleRoute(scheduleId),
    };
  }).sort((a, b) => {
    const byPrimary = compareAlphabetical(a.primary, b.primary);
    if (byPrimary !== 0) return byPrimary;
    return compareAlphabetical(a.secondary ?? '', b.secondary ?? '');
  }), [schedulesState.data, institutionId]);

  const openDeleteDialog = () => {
    setDeleteError(null);
    setIsDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    if (isDeleting) return;
    setIsDeleteDialogOpen(false);
    setDeleteError(null);
  };

  const handleDeleteInstitution = async () => {
    if (!institutionId) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteInstitution(institutionId);
      try {
        const selectedId = localStorage.getItem('selectedInstitutionId');
        if (selectedId && String(selectedId) === String(institutionId)) {
          localStorage.removeItem('selectedInstitutionId');
        }
      } catch (e) {
        // Ignore local storage errors.
      }
      try {
        window.dispatchEvent(new CustomEvent('institutionsChanged', { detail: { deletedInstitutionId: institutionId } }));
      } catch (e) {
        // Ignore cross-window event errors.
      }
      navigate(INSTITUTIONS_ROUTE, { replace: true });
    } catch (err) {
      setDeleteError((err as Error).message || 'Failed to delete institution.');
    } finally {
      setIsDeleting(false);
    }
  };

  const openAddMemberDialog = async () => {
    setAddMemberError(null);
    setSelectedUserToAdd(null);
    setEditingMember(null);
    setSelectedMemberRoles(['student']);
    setAvailableUsers([]);
    setAvailableUsersError(null);
    setMemberDialogMode('add');
    setIsMemberRolesDialogOpen(true);

    setAvailableUsersLoading(true);
    try {
      const res = await apiGet<any>(`${API_URL}/api/v1/users`, getAuthHeaders());
      const users = Array.isArray(res?.users) ? (res.users as InstitutionUser[]) : [];
      const existingIds = new Set(usersState.data.map((u) => String(u.id ?? u._id ?? '')));
      const candidates = users
        .filter((u) => !existingIds.has(String(u.id ?? u._id ?? '')))
        .sort((a, b) => compareAlphabetical(a.name ?? a.email ?? '', b.name ?? b.email ?? ''));
      setAvailableUsers(candidates);
    } catch (err) {
      setAvailableUsersError((err as Error).message || 'Failed to load users list.');
    } finally {
      setAvailableUsersLoading(false);
    }
  };

  const closeAddMemberDialog = () => {
    if (isAddingMember) return;
    setIsMemberRolesDialogOpen(false);
    setAddMemberError(null);
  };

  const handleAddMember = async () => {
    if (!institutionId) return;
    const selectedUserId = String(selectedUserToAdd?.id ?? selectedUserToAdd?._id ?? '').trim();
    if (!selectedUserId) {
      setAddMemberError('Please select a user.');
      return;
    }
    if (selectedMemberRoles.length === 0) {
      setAddMemberError('Select at least one role.');
      return;
    }

    setIsAddingMember(true);
    setAddMemberError(null);
    try {
      for (const role of selectedMemberRoles) {
        await assignRoleToUser(institutionId, selectedUserId, role);
      }
      const users = await getInstitutionUsers(institutionId);
      setUsersState({ data: users, loading: false, error: null });
      setIsMemberRolesDialogOpen(false);
      setSelectedUserToAdd(null);
      setEditingMember(null);
      setSelectedMemberRoles(['student']);
    } catch (err) {
      setAddMemberError((err as Error).message || 'Failed to add member.');
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleUpdateMemberRoles = async () => {
    if (!institutionId || !editingMember) return;
    const userId = String(editingMember.id ?? editingMember._id ?? '').trim();
    if (!userId) {
      setAddMemberError('Invalid member selected.');
      return;
    }
    if (selectedMemberRoles.length === 0) {
      setAddMemberError('Select at least one role.');
      return;
    }

    const currentRoles = getInstitutionRoles(editingMember, institutionId);
    const rolesToAdd = selectedMemberRoles.filter((role) => !currentRoles.includes(role));
    const rolesToRemove = currentRoles.filter((role) => !selectedMemberRoles.includes(role));

    if (rolesToAdd.length === 0 && rolesToRemove.length === 0) {
      setIsMemberRolesDialogOpen(false);
      setEditingMember(null);
      setSelectedMemberRoles(['student']);
      return;
    }

    setIsAddingMember(true);
    setAddMemberError(null);
    try {
      for (const role of rolesToAdd) {
        await assignRoleToUser(institutionId, userId, role);
      }
      for (const role of rolesToRemove) {
        await removeRoleFromUser(institutionId, userId, role);
      }
      const users = await getInstitutionUsers(institutionId);
      setUsersState({ data: users, loading: false, error: null });
      setIsMemberRolesDialogOpen(false);
      setEditingMember(null);
      setSelectedMemberRoles(['student']);
    } catch (err) {
      setAddMemberError((err as Error).message || 'Failed to update member roles.');
    } finally {
      setIsAddingMember(false);
    }
  };

  if (institutionLoading) {
    return (
      <PageContainer alignItems="center">
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={24} />
          <Typography>Loading institution...</Typography>
        </Stack>
      </PageContainer>
    );
  }

  if (institutionError) {
    return (
      <PageContainer alignItems="flex-start">
        <Alert severity="error" sx={{ width: '100%' }}>{institutionError}</Alert>
      </PageContainer>
    );
  }

  if (!institution) {
    return (
      <PageContainer alignItems="flex-start">
        <Alert severity="warning" sx={{ width: '100%' }}>Institution data is unavailable.</Alert>
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
            <Typography variant="h4" sx={{ fontWeight: 800 }}>{institution.name}</Typography>
            {canManageInstitution && (
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" onClick={() => navigate(`/institutions/${institution.id}/edit`)} disabled={isDeleting || isAddingMember}>
                  Edit institution
                </Button>
                <Button variant="outlined" color="error" onClick={openDeleteDialog} disabled={isDeleting || isAddingMember}>
                  Delete institution
                </Button>
              </Stack>
            )}
          </Box>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip label={`Different weeks: ${institution.time_grid_config.weeks}`} size="small" />
            <Chip label={`Days per week: ${institution.time_grid_config.days}`} size="small" />
            <Chip label={`Timeslots per day: ${institution.time_grid_config.timeslots_per_day}`} size="small" />
            <Chip label={`Max timeslots/day/group: ${institution.time_grid_config.max_timeslots_per_day_per_group}`} size="small" />
          </Stack>
        </Paper>

        <Grid container spacing={2}>
          <Grid size={{ xs: 6, md: 3 }}><StatCard icon={<GroupIcon fontSize="small" />} label="Members" value={usersState.data.length} loading={usersState.loading} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><StatCard icon={<AdminPanelSettingsIcon fontSize="small" />} label="Admins" value={adminCount} loading={usersState.loading} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><StatCard icon={<Diversity3Icon fontSize="small" />} label="Groups" value={groupsState.data.length} loading={groupsState.loading} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><StatCard icon={<MenuBookIcon fontSize="small" />} label="Courses" value={coursesState.data.length} loading={coursesState.loading} /></Grid>
          <Grid size={{ xs: 6, md: 4 }}><StatCard icon={<MeetingRoomIcon fontSize="small" />} label="Rooms" value={roomsState.data.length} loading={roomsState.loading} /></Grid>
          <Grid size={{ xs: 6, md: 4 }}><StatCard icon={<EventNoteIcon fontSize="small" />} label="Activities" value={activitiesState.data.length} loading={activitiesState.loading} /></Grid>
          <Grid size={{ xs: 12, md: 4 }}><StatCard icon={<ScheduleIcon fontSize="small" />} label="Schedules" value={schedulesState.data.length} loading={schedulesState.loading} /></Grid>
        </Grid>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <SearchableList
              title="Members"
              items={membersList}
              loading={usersState.loading}
              error={usersState.error ?? removeMemberError}
              emptyText="No members found."
              headerAction={canManageInstitution ? (
                <Button size="small" variant="outlined" onClick={openAddMemberDialog} disabled={isAddingMember || isDeleting}>
                  Add member
                </Button>
              ) : undefined}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}><SearchableList title="Rooms" items={roomsList} loading={roomsState.loading} error={roomsState.error} emptyText="No rooms found." /></Grid>
          <Grid size={{ xs: 12, md: 6 }}><SearchableList title="Groups" items={groupsList} loading={groupsState.loading} error={groupsState.error} emptyText="No groups found." /></Grid>
          <Grid size={{ xs: 12, md: 6 }}><SearchableList title="Courses" items={coursesList} loading={coursesState.loading} error={coursesState.error} emptyText="No courses found." /></Grid>
          <Grid size={{ xs: 12, md: 6 }}><SearchableList title="Activities" items={activitiesList} loading={activitiesState.loading} error={activitiesState.error} emptyText="No activities found." /></Grid>
          <Grid size={{ xs: 12, md: 6 }}><SearchableList title="Schedules" items={schedulesList} loading={schedulesState.loading} error={schedulesState.error} emptyText="No schedules found." /></Grid>
        </Grid>

        <Dialog open={isDeleteDialogOpen} onClose={closeDeleteDialog} maxWidth="xs" fullWidth>
          <DialogTitle>Delete institution?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete <strong>{institution.name}</strong>? This action cannot be undone.
            </DialogContentText>
            {deleteError && <Alert severity="error" sx={{ mt: 2 }}>{deleteError}</Alert>}
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDeleteDialog} disabled={isDeleting}>Cancel</Button>
            <Button onClick={handleDeleteInstitution} color="error" variant="contained" disabled={isDeleting}>
              {isDeleting ? <CircularProgress size={18} color="inherit" /> : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={isMemberRolesDialogOpen} onClose={closeAddMemberDialog} maxWidth="xs" fullWidth>
          <DialogTitle>{memberDialogMode === 'add' ? 'Add member' : 'Edit member roles'}</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              {memberDialogMode === 'add'
                ? 'Select a user by name or email and choose one or more roles.'
                : 'Update the roles assigned to this member in the institution.'}
            </DialogContentText>
            <Stack spacing={2}>
              {memberDialogMode === 'add' ? (
                <>
                  <Autocomplete
                    options={availableUsers}
                    loading={availableUsersLoading}
                    value={selectedUserToAdd}
                    onChange={(_event, value) => setSelectedUserToAdd(value)}
                    getOptionLabel={(option) => {
                      const name = option.name ?? 'Unknown user';
                      const email = option.email ?? 'No email';
                      return `${name} (${email})`;
                    }}
                    isOptionEqualToValue={(option, value) => String(option.id ?? option._id) === String(value.id ?? value._id)}
                    disabled={isAddingMember}
                    renderOption={(props, option) => (
                      <Box component="li" {...props} key={String(option.id ?? option._id ?? option.email)}>
                        <Stack spacing={0}>
                          <Typography variant="body2">{option.name ?? 'Unknown user'}</Typography>
                          <Typography variant="caption" color="text.secondary">{option.email ?? 'No email'}</Typography>
                        </Stack>
                      </Box>
                    )}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="User"
                        placeholder="Search by name or email"
                        fullWidth
                      />
                    )}
                  />
                  {availableUsersError && <Alert severity="error">{availableUsersError}</Alert>}
                </>
              ) : (
                <TextField
                  label="Member"
                  value={editingMember ? `${editingMember.name ?? 'Unknown user'} (${editingMember.email ?? 'No email'})` : ''}
                  fullWidth
                  disabled
                />
              )}
              <FormControl fullWidth>
                <InputLabel id="new-member-role-label">Role</InputLabel>
                <Select
                  multiple
                  labelId="new-member-role-label"
                  label="Role"
                  value={selectedMemberRoles}
                  onChange={(e) => setSelectedMemberRoles(e.target.value as InstitutionRole[])}
                  renderValue={(selected) => (
                    <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                      {(selected as InstitutionRole[]).map((role) => (
                        <Chip key={role} label={toTitleLabel(role)} size="small" />
                      ))}
                    </Stack>
                  )}
                  disabled={isAddingMember}
                >
                  {ALL_INSTITUTION_ROLES.map((role) => (
                    <MenuItem key={role} value={role}>{toTitleLabel(role)}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            {addMemberError && <Alert severity="error" sx={{ mt: 2 }}>{addMemberError}</Alert>}
          </DialogContent>
          <DialogActions>
            <Button onClick={closeAddMemberDialog} disabled={isAddingMember}>Cancel</Button>
            <Button
              onClick={memberDialogMode === 'add' ? handleAddMember : handleUpdateMemberRoles}
              variant="contained"
              disabled={isAddingMember}
            >
              {isAddingMember ? <CircularProgress size={18} color="inherit" /> : memberDialogMode === 'add' ? 'Add member' : 'Save roles'}
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </PageContainer>
  );
}
