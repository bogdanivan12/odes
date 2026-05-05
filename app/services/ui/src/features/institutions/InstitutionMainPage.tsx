import { useEffect, useMemo, useState, type FormEvent } from 'react';
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
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CalendarViewWeekIcon from '@mui/icons-material/CalendarViewWeek';
import TodayIcon from '@mui/icons-material/Today';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SpeedIcon from '@mui/icons-material/Speed';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import PageContainer from '../layout/PageContainer';
import EntityStatCard from '../../components/EntityStatCard';
import EditMemberRolesDialog from '../../components/EditMemberRolesDialog';
import { compareAlphabetical, toTitleLabel } from '../../utils/text';
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
import { apiGet, apiPost, apiPut } from '../../utils/apiClient';
import { getCurrentUserData, isInstitutionAdmin } from '../../utils/institutionAdmin';
import { alpha, useTheme } from '@mui/material/styles';

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

type InstitutionRole = 'student' | 'professor' | 'admin';

const ALL_INSTITUTION_ROLES: InstitutionRole[] = ['admin', 'professor', 'student'];

function getAuthHeaders(): Record<string, string> {
  const authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  const headers: Record<string, string> = {};
  if (authToken) headers.Authorization = authToken;
  return headers;
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

type EditFormValues = {
  name: string;
  weeks: string;
  days: string;
  timeslotsPerDay: string;
  maxTimeslotsPerDayPerGroup: string;
};

async function updateInstitutionData(
  institutionId: string,
  payload: { name: string; time_grid_config: { weeks: number; days: number; timeslots_per_day: number; max_timeslots_per_day_per_group: number } },
) {
  const res = await apiPut<any>(`${API_URL}${API_INSTITUTIONS_PATH}/${institutionId}`, payload, getAuthHeaders());
  return (res?.institution ?? res) as Institution;
}

function getInstitutionRoles(user: InstitutionUser, institutionId: string): InstitutionRole[] {
  const roles = user.user_roles?.[institutionId] ?? user.user_roles?.[String(institutionId)] ?? [];
  return Array.isArray(roles) ? (roles as InstitutionRole[]) : [];
}

function formatCreatedAt(timestamp?: string): string | undefined {
  if (!timestamp) return undefined;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  const datePart = date.toLocaleDateString();
  const timePart = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return `Created on ${datePart} at ${timePart}`;
}

function roleChipColor(role: string): 'primary' | 'warning' | 'success' | 'default' {
  if (role === 'admin') return 'primary';
  if (role === 'professor') return 'warning';
  if (role === 'student') return 'success';
  return 'default';
}

// ── Section divider ────────────────────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Typography
        variant="overline"
        sx={{ color: 'text.disabled', fontSize: '0.68rem', letterSpacing: '0.1em', fontWeight: 600, whiteSpace: 'nowrap' }}
      >
        {label}
      </Typography>
      <Divider sx={{ flex: 1 }} />
    </Box>
  );
}

// ── Searchable list ────────────────────────────────────────────────────────────

type SearchableListProps = {
  title: string;
  items: ListItem[];
  emptyText: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
  emptyAction?: React.ReactNode;
  loading: boolean;
  error: string | null;
  headerAction?: React.ReactNode;
  navigationRoute?: string;
};

function SearchableList({
  title,
  items,
  emptyText,
  emptyDescription,
  emptyIcon,
  emptyAction,
  loading,
  error,
  headerAction,
  navigationRoute,
}: SearchableListProps) {
  const navigate = useNavigate();
  const theme = useTheme();
  const [query, setQuery] = useState('');

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      `${item.primary} ${item.secondary ?? ''} ${(item.roles ?? []).join(' ')}`.toLowerCase().includes(q),
    );
  }, [items, query]);

  return (
    <Paper
      variant="outlined"
      sx={{ borderRadius: 3, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {/* ── Header ── */}
      <Box
        sx={{
          px: 2.5,
          py: 1.75,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          flexShrink: 0,
        }}
      >
        {/* Title + count badge */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <Typography
            variant="subtitle1"
            onClick={navigationRoute ? () => navigate(navigationRoute) : undefined}
            sx={{
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: navigationRoute ? 'pointer' : 'default',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.4,
              transition: 'color 150ms',
              '&:hover': navigationRoute ? { color: 'primary.main' } : undefined,
            }}
          >
            {title}
            {navigationRoute && (
              <ArrowForwardRoundedIcon sx={{ fontSize: '0.85rem', opacity: 0.5 }} />
            )}
          </Typography>

          {/* Item count */}
          {!loading && (
            <Box
              sx={{
                px: 0.75,
                py: 0.1,
                borderRadius: 1,
                bgcolor: 'action.selected',
                lineHeight: 1,
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.72rem' }}>
                {items.length}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Right-side action */}
        {headerAction}
      </Box>

      {/* ── Search ── */}
      <Box sx={{ px: 2, pt: 1.5, pb: 1, flexShrink: 0 }}>
        <TextField
          size="small"
          fullWidth
          placeholder={`Search ${title.toLowerCase()}...`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          slotProps={{
            input: {
              startAdornment: <SearchIcon sx={{ fontSize: '1rem', mr: 0.75, color: 'text.disabled' }} />,
            },
          }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.875rem' } }}
        />
      </Box>

      {/* ── Content ── */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden', px: 1.5, pb: 1.5 }}>
        {loading ? (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1, py: 1.5 }}>
            <CircularProgress size={16} />
            <Typography variant="caption" color="text.secondary">Loading...</Typography>
          </Stack>
        ) : error ? (
          <Alert severity="error" sx={{ mx: 0.5, mt: 0.5 }}>{error}</Alert>
        ) : filteredItems.length === 0 ? (
          /* ── Empty state ── */
          <Box sx={{ py: 3.5, px: 1, textAlign: 'center' }}>
            {emptyIcon && (
              <Box
                sx={{
                  display: 'inline-flex',
                  p: 1.5,
                  borderRadius: 3,
                  bgcolor: 'action.hover',
                  color: 'text.disabled',
                  mb: 1.5,
                  '& svg': { fontSize: '1.5rem' },
                }}
              >
                {emptyIcon}
              </Box>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              {query ? `No results for "${query}"` : emptyText}
            </Typography>
            {!query && emptyDescription && (
              <Typography
                variant="caption"
                color="text.disabled"
                sx={{ display: 'block', mt: 0.5, lineHeight: 1.5, maxWidth: 220, mx: 'auto' }}
              >
                {emptyDescription}
              </Typography>
            )}
            {!query && emptyAction && (
              <Box sx={{ mt: 2 }}>{emptyAction}</Box>
            )}
          </Box>
        ) : (
          /* ── List ── */
          <Box
            sx={{
              maxHeight: 248,
              overflowY: 'auto',
              '&::-webkit-scrollbar': { width: 4 },
              '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 2 },
              '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
            }}
          >
            <Stack spacing={0.25}>
              {filteredItems.map((item) => (
                <Box
                  key={item.key}
                  onClick={item.to ? () => navigate(item.to as string) : undefined}
                  sx={{
                    px: 1.5,
                    py: 1,
                    borderRadius: 2,
                    cursor: item.to ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    borderLeft: '2px solid transparent',
                    transition: 'all 150ms ease',
                    '&:hover': item.to
                      ? { bgcolor: alpha(theme.palette.primary.main, 0.06), borderLeftColor: 'primary.main' }
                      : undefined,
                  }}
                >
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
                      {item.primary}
                    </Typography>
                    {item.secondary && (
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                        {item.secondary}
                      </Typography>
                    )}
                  </Box>
                  <Stack direction="row" spacing={0.5} alignItems="center" flexShrink={0}>
                    {item.roles?.map((role) => (
                      <Chip
                        key={`${item.key}-${role}`}
                        label={toTitleLabel(role)}
                        size="small"
                        color={roleChipColor(role)}
                        variant="outlined"
                      />
                    ))}
                    {item.rowAction}
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Box>
        )}
      </Box>
    </Paper>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function InstitutionMainPage() {
  const { institutionId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [institutionLoading, setInstitutionLoading] = useState(true);
  const [institutionError, setInstitutionError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<InstitutionUser | null>(null);
  const [currentUserLoading, setCurrentUserLoading] = useState(true);
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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editValues, setEditValues] = useState<EditFormValues>({ name: '', weeks: '2', days: '5', timeslotsPerDay: '12', maxTimeslotsPerDayPerGroup: '8' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [availableUsers, setAvailableUsers] = useState<InstitutionUser[]>([]);
  const [availableUsersLoading, setAvailableUsersLoading] = useState(false);
  const [availableUsersError, setAvailableUsersError] = useState<string | null>(null);

  const [usersState, setUsersState] = useState<RelatedState<InstitutionUser>>({ data: [], loading: false, error: null });
  const [groupsState, setGroupsState] = useState<RelatedState<InstitutionGroup>>({ data: [], loading: false, error: null });
  const [coursesState, setCoursesState] = useState<RelatedState<InstitutionCourse>>({ data: [], loading: false, error: null });
  const [roomsState, setRoomsState] = useState<RelatedState<InstitutionRoom>>({ data: [], loading: false, error: null });
  const [activitiesState, setActivitiesState] = useState<RelatedState<InstitutionActivity>>({ data: [], loading: false, error: null });
  const [schedulesState, setSchedulesState] = useState<RelatedState<InstitutionSchedule>>({ data: [], loading: false, error: null });

  const institutionBase = institutionId ? `/institutions/${institutionId}` : '';

  useEffect(() => {
    let mounted = true;
    if (!institutionId) {
      setInstitutionLoading(false);
      setInstitutionError('Missing institution id in route.');
      return () => { mounted = false; };
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
    return () => { mounted = false; };
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
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!institutionId || !institution || institutionError) return () => { mounted = false; };

    const load = async <T,>(
      setter: (s: RelatedState<T>) => void,
      fetcher: () => Promise<T[]>,
      errMsg: string,
    ) => {
      setter({ data: [], loading: true, error: null });
      try {
        const data = await fetcher();
        if (!mounted) return;
        setter({ data, loading: false, error: null });
      } catch (err) {
        if (!mounted) return;
        setter({ data: [], loading: false, error: (err as Error).message || errMsg });
      }
    };

    load(setUsersState, () => getInstitutionUsers(institutionId), 'Failed to load members.');
    load(setGroupsState, () => getInstitutionGroups(institutionId), 'Failed to load groups.');
    load(setCoursesState, () => getInstitutionCourses(institutionId), 'Failed to load courses.');
    load(setRoomsState, () => getInstitutionRooms(institutionId), 'Failed to load rooms.');
    load(setActivitiesState, () => getInstitutionActivities(institutionId), 'Failed to load activities.');
    load(setSchedulesState, () => getInstitutionSchedules(institutionId), 'Failed to load schedules.');

    return () => { mounted = false; };
  }, [institutionId, institution, institutionError]);

  const canManageInstitution = useMemo(
    () => isInstitutionAdmin(currentUser, institutionId),
    [currentUser, institutionId],
  );

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
          <Stack direction="row" spacing={0.25} alignItems="center">
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
              sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
            >
              <EditIcon sx={{ fontSize: '0.9rem' }} />
            </IconButton>
            <IconButton
              size="small"
              aria-label="Remove member"
              disabled={isRemoving || isDeleting || isAddingMember}
              onClick={(event) => {
                event.stopPropagation();
                handleRemoveMember(userId);
              }}
              sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
            >
              {isRemoving ? <CircularProgress size={12} color="inherit" /> : <CloseIcon sx={{ fontSize: '0.9rem' }} />}
            </IconButton>
          </Stack>
        ) : undefined,
      };
    }).sort((a, b) => compareAlphabetical(a.primary, b.primary));
  }, [usersState.data, institutionId, canManageInstitution, removingMemberId, isDeleting, isAddingMember]);

  const adminCount = useMemo(() => {
    if (!institutionId) return 0;
    return usersState.data.filter((user) => isInstitutionAdmin(user, institutionId)).length;
  }, [usersState.data, institutionId]);

  const groupsList = useMemo(() => groupsState.data.map((group) => ({
    key: String(group.id ?? group._id ?? group.name),
    primary: group.name,
    to: groupRoute(String(group.id ?? group._id ?? group.name)),
  })).sort((a, b) => compareAlphabetical(a.primary, b.primary)), [groupsState.data]);

  const coursesList = useMemo(() => coursesState.data.map((course) => ({
    key: String(course.id ?? course._id ?? course.name),
    primary: course.name,
    to: courseRoute(String(course.id ?? course._id ?? course.name)),
  })).sort((a, b) => compareAlphabetical(a.primary, b.primary)), [coursesState.data]);

  const roomsList = useMemo(() => roomsState.data.map((room) => ({
    key: String(room.id ?? room._id ?? room.name),
    primary: room.name,
    secondary: `${room.capacity} seats`,
    to: roomRoute(String(room.id ?? room._id ?? room.name)),
  })).sort((a, b) => compareAlphabetical(a.primary, b.primary)), [roomsState.data]);

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
    return {
      key: activityId,
      primary: `${groupName} · ${courseName} · ${toTitleLabel(activity.activity_type)}`,
      secondary: `${toTitleLabel(activity.frequency)} · ${activity.duration_slots} slots`,
      to: activityRoute(activityId),
    };
  }).sort((a, b) => compareAlphabetical(a.primary, b.primary)), [activitiesState.data, groupNameById, courseNameById]);

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
  }), [schedulesState.data]);

  const openEditDialog = () => {
    if (!institution) return;
    setEditValues({
      name: institution.name,
      weeks: String(institution.time_grid_config.weeks),
      days: String(institution.time_grid_config.days),
      timeslotsPerDay: String(institution.time_grid_config.timeslots_per_day),
      maxTimeslotsPerDayPerGroup: String(institution.time_grid_config.max_timeslots_per_day_per_group),
    });
    setEditError(null);
    setIsEditDialogOpen(true);
  };

  const closeEditDialog = () => {
    if (editLoading) return;
    setIsEditDialogOpen(false);
    setEditError(null);
  };

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!institutionId) return;

    const weeks = parseInt(editValues.weeks, 10);
    const days = parseInt(editValues.days, 10);
    const timeslotsPerDay = parseInt(editValues.timeslotsPerDay, 10);
    const maxTimeslotsPerDayPerGroup = parseInt(editValues.maxTimeslotsPerDayPerGroup, 10);

    if (!editValues.name.trim()) { setEditError('Institution name is required.'); return; }
    if (!Number.isInteger(weeks) || weeks <= 0) { setEditError('Weeks rotation must be a positive integer.'); return; }
    if (!Number.isInteger(days) || days <= 0) { setEditError('Days per week must be a positive integer.'); return; }
    if (!Number.isInteger(timeslotsPerDay) || timeslotsPerDay <= 0) { setEditError('Timeslots per day must be a positive integer.'); return; }
    if (!Number.isInteger(maxTimeslotsPerDayPerGroup) || maxTimeslotsPerDayPerGroup <= 0) { setEditError('Max timeslots per day per group must be a positive integer.'); return; }
    if (maxTimeslotsPerDayPerGroup > timeslotsPerDay) { setEditError('Max timeslots per group cannot exceed timeslots per day.'); return; }

    setEditLoading(true);
    setEditError(null);
    try {
      const updated = await updateInstitutionData(institutionId, {
        name: editValues.name.trim(),
        time_grid_config: { weeks, days, timeslots_per_day: timeslotsPerDay, max_timeslots_per_day_per_group: maxTimeslotsPerDayPerGroup },
      });
      setInstitution(updated);
      try { window.dispatchEvent(new Event('institutionsChanged')); } catch { /* ignore */ }
      setIsEditDialogOpen(false);
    } catch (err) {
      setEditError((err as Error).message || 'Failed to update institution.');
    } finally {
      setEditLoading(false);
    }
  };

  const openDeleteDialog = () => { setDeleteError(null); setIsDeleteDialogOpen(true); };
  const closeDeleteDialog = () => { if (isDeleting) return; setIsDeleteDialogOpen(false); setDeleteError(null); };

  const handleDeleteInstitution = async () => {
    if (!institutionId) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteInstitution(institutionId);
      try {
        const selectedId = localStorage.getItem('selectedInstitutionId');
        if (selectedId && String(selectedId) === String(institutionId)) localStorage.removeItem('selectedInstitutionId');
      } catch { /* ignore */ }
      try { window.dispatchEvent(new CustomEvent('institutionsChanged', { detail: { deletedInstitutionId: institutionId } })); } catch { /* ignore */ }
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
    if (!selectedUserId) { setAddMemberError('Please select a user.'); return; }
    if (selectedMemberRoles.length === 0) { setAddMemberError('Select at least one role.'); return; }
    setIsAddingMember(true);
    setAddMemberError(null);
    try {
      for (const role of selectedMemberRoles) await assignRoleToUser(institutionId, selectedUserId, role);
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
    if (!userId) { setAddMemberError('Invalid member selected.'); return; }
    if (selectedMemberRoles.length === 0) { setAddMemberError('Select at least one role.'); return; }

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
      for (const role of rolesToAdd) await assignRoleToUser(institutionId, userId, role);
      for (const role of rolesToRemove) await removeRoleFromUser(institutionId, userId, role);
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

  // ── Loading / error states ─────────────────────────────────────────────────

  if (institutionLoading || currentUserLoading) {
    return (
      <PageContainer alignItems="center">
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={22} />
          <Typography color="text.secondary">Loading institution...</Typography>
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

  const gridConfigItems = [
    { icon: <CalendarViewWeekIcon sx={{ fontSize: '0.9rem' }} />, value: institution.time_grid_config.weeks, label: 'week rotation' },
    { icon: <TodayIcon sx={{ fontSize: '0.9rem' }} />, value: institution.time_grid_config.days, label: 'days / week' },
    { icon: <AccessTimeIcon sx={{ fontSize: '0.9rem' }} />, value: institution.time_grid_config.timeslots_per_day, label: 'timeslots / day' },
    { icon: <SpeedIcon sx={{ fontSize: '0.9rem' }} />, value: institution.time_grid_config.max_timeslots_per_day_per_group, label: 'max slots / group / day' },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <PageContainer alignItems="flex-start">
      <Stack spacing={3} sx={{ width: '100%' }}>

        {/* ── Institution header ── */}
        <Paper variant="outlined" sx={{ borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
          <Box sx={{ height: 3, background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})` }} />
          <Box
            sx={{
              p: { xs: 2.5, md: 3 },
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.04)} 0%, transparent 60%)`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>{institution.name}</Typography>
              {canManageInstitution && (
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<EditOutlinedIcon />}
                    onClick={openEditDialog}
                    disabled={isDeleting || isAddingMember}
                    sx={{ borderRadius: 2 }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    startIcon={<DeleteOutlineIcon />}
                    onClick={openDeleteDialog}
                    disabled={isDeleting || isAddingMember}
                    sx={{ borderRadius: 2 }}
                  >
                    Delete
                  </Button>
                </Stack>
              )}
            </Box>
            <Stack direction="row" useFlexGap flexWrap="wrap" gap={1}>
              {gridConfigItems.map((cfg) => (
                <Box
                  key={cfg.label}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 1.5,
                    py: 0.625,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: alpha(theme.palette.primary.main, 0.2),
                    bgcolor: alpha(theme.palette.primary.main, 0.06),
                  }}
                >
                  <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center' }}>{cfg.icon}</Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>{cfg.value}</Typography>
                  <Typography variant="caption" color="text.secondary">{cfg.label}</Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        </Paper>

        {/* ── Section: Overview ── */}
        <SectionDivider label="OVERVIEW" />

        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <EntityStatCard icon={<GroupIcon fontSize="small" />} label="Members" value={usersState.data.length} loading={usersState.loading} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <EntityStatCard icon={<AdminPanelSettingsIcon fontSize="small" />} label="Admins" value={adminCount} loading={usersState.loading} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <EntityStatCard icon={<Diversity3Icon fontSize="small" />} label="Groups" value={groupsState.data.length} loading={groupsState.loading} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <EntityStatCard icon={<MenuBookIcon fontSize="small" />} label="Courses" value={coursesState.data.length} loading={coursesState.loading} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 4 }}>
            <EntityStatCard icon={<MeetingRoomIcon fontSize="small" />} label="Rooms" value={roomsState.data.length} loading={roomsState.loading} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 4 }}>
            <EntityStatCard icon={<EventNoteIcon fontSize="small" />} label="Activities" value={activitiesState.data.length} loading={activitiesState.loading} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4, md: 4 }}>
            <EntityStatCard icon={<ScheduleIcon fontSize="small" />} label="Schedules" value={schedulesState.data.length} loading={schedulesState.loading} />
          </Grid>
        </Grid>

        {/* ── Section: Resources ── */}
        <SectionDivider label="RESOURCES" />

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <SearchableList
              title="Members"
              items={membersList}
              loading={usersState.loading}
              error={usersState.error ?? removeMemberError}
              emptyText="No members yet"
              emptyDescription="Add people to this institution and assign them roles to get started."
              emptyIcon={<GroupIcon />}
              emptyAction={canManageInstitution ? (
                <Button size="small" variant="outlined" startIcon={<AddRoundedIcon />} onClick={openAddMemberDialog} sx={{ borderRadius: 2 }}>
                  Add first member
                </Button>
              ) : undefined}
              navigationRoute={`${institutionBase}/members`}
              headerAction={canManageInstitution ? (
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<AddRoundedIcon />}
                  onClick={openAddMemberDialog}
                  disabled={isAddingMember || isDeleting}
                  sx={{ borderRadius: 2, fontSize: '0.8rem', py: 0.5 }}
                >
                  Add
                </Button>
              ) : undefined}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <SearchableList
              title="Rooms"
              items={roomsList}
              loading={roomsState.loading}
              error={roomsState.error}
              emptyText="No rooms yet"
              emptyDescription="Define the physical spaces available for scheduling activities."
              emptyIcon={<MeetingRoomIcon />}
              emptyAction={canManageInstitution ? (
                <Button size="small" variant="outlined" onClick={() => navigate(`${institutionBase}/rooms`)} sx={{ borderRadius: 2 }}>
                  Manage rooms
                </Button>
              ) : undefined}
              navigationRoute={`${institutionBase}/rooms`}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <SearchableList
              title="Groups"
              items={groupsList}
              loading={groupsState.loading}
              error={groupsState.error}
              emptyText="No groups yet"
              emptyDescription="Organize students into groups to assign them activities and schedules."
              emptyIcon={<Diversity3Icon />}
              emptyAction={canManageInstitution ? (
                <Button size="small" variant="outlined" onClick={() => navigate(`${institutionBase}/groups`)} sx={{ borderRadius: 2 }}>
                  Manage groups
                </Button>
              ) : undefined}
              navigationRoute={`${institutionBase}/groups`}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <SearchableList
              title="Courses"
              items={coursesList}
              loading={coursesState.loading}
              error={coursesState.error}
              emptyText="No courses yet"
              emptyDescription="Add the academic courses that need to be scheduled at this institution."
              emptyIcon={<MenuBookIcon />}
              emptyAction={canManageInstitution ? (
                <Button size="small" variant="outlined" onClick={() => navigate(`${institutionBase}/courses`)} sx={{ borderRadius: 2 }}>
                  Manage courses
                </Button>
              ) : undefined}
              navigationRoute={`${institutionBase}/courses`}
            />
          </Grid>
        </Grid>

        {/* ── Section: Scheduling ── */}
        <SectionDivider label="SCHEDULING" />

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <SearchableList
              title="Activities"
              items={activitiesList}
              loading={activitiesState.loading}
              error={activitiesState.error}
              emptyText="No activities yet"
              emptyDescription="Activities link groups, courses and professors into scheduling requirements."
              emptyIcon={<EventNoteIcon />}
              emptyAction={canManageInstitution ? (
                <Button size="small" variant="outlined" onClick={() => navigate(`${institutionBase}/activities`)} sx={{ borderRadius: 2 }}>
                  Manage activities
                </Button>
              ) : undefined}
              navigationRoute={`${institutionBase}/activities`}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <SearchableList
              title="Schedules"
              items={schedulesList}
              loading={schedulesState.loading}
              error={schedulesState.error}
              emptyText="No schedules yet"
              emptyDescription="Once activities are configured, generate a schedule to see the result."
              emptyIcon={<ScheduleIcon />}
              emptyAction={canManageInstitution ? (
                <Button size="small" variant="outlined" onClick={() => navigate(`${institutionBase}/schedules`)} sx={{ borderRadius: 2 }}>
                  View schedules
                </Button>
              ) : undefined}
              navigationRoute={`${institutionBase}/schedules`}
            />
          </Grid>
        </Grid>

      </Stack>

      {/* ── Edit institution dialog ── */}
      <Dialog open={isEditDialogOpen} onClose={closeEditDialog} maxWidth="sm" fullWidth>
        <Box component="form" onSubmit={handleEditSubmit} noValidate>
          <DialogTitle sx={{ fontWeight: 700 }}>Edit institution</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 0.5 }}>
              <TextField
                label="Institution name"
                value={editValues.name}
                onChange={(e) => setEditValues((prev) => ({ ...prev, name: e.target.value }))}
                required
                fullWidth
                autoFocus
                disabled={editLoading}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Week rotation"
                  type="number"
                  value={editValues.weeks}
                  onChange={(e) => setEditValues((prev) => ({ ...prev, weeks: e.target.value }))}
                  slotProps={{ htmlInput: { min: 1 } }}
                  required
                  fullWidth
                  disabled={editLoading}
                  helperText="Number of distinct week patterns"
                />
                <TextField
                  label="Days per week"
                  type="number"
                  value={editValues.days}
                  onChange={(e) => setEditValues((prev) => ({ ...prev, days: e.target.value }))}
                  slotProps={{ htmlInput: { min: 1 } }}
                  required
                  fullWidth
                  disabled={editLoading}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Timeslots per day"
                  type="number"
                  value={editValues.timeslotsPerDay}
                  onChange={(e) => setEditValues((prev) => ({ ...prev, timeslotsPerDay: e.target.value }))}
                  slotProps={{ htmlInput: { min: 1 } }}
                  required
                  fullWidth
                  disabled={editLoading}
                />
                <TextField
                  label="Max timeslots / group / day"
                  type="number"
                  value={editValues.maxTimeslotsPerDayPerGroup}
                  onChange={(e) => setEditValues((prev) => ({ ...prev, maxTimeslotsPerDayPerGroup: e.target.value }))}
                  slotProps={{ htmlInput: { min: 1 } }}
                  required
                  fullWidth
                  disabled={editLoading}
                  helperText="Cannot exceed timeslots per day"
                />
              </Stack>
              {editError && <Alert severity="error">{editError}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={closeEditDialog} disabled={editLoading} sx={{ borderRadius: 2 }}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={editLoading} sx={{ borderRadius: 2 }}>
              {editLoading ? <CircularProgress size={18} color="inherit" /> : 'Save changes'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* ── Delete dialog ── */}
      <Dialog open={isDeleteDialogOpen} onClose={closeDeleteDialog} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete institution?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{institution.name}</strong>? This action cannot be undone.
          </DialogContentText>
          {deleteError && <Alert severity="error" sx={{ mt: 2 }}>{deleteError}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={closeDeleteDialog} disabled={isDeleting} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleDeleteInstitution} color="error" variant="contained" disabled={isDeleting} sx={{ borderRadius: 2 }}>
            {isDeleting ? <CircularProgress size={18} color="inherit" /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Add member dialog ── */}
      <Dialog open={isMemberRolesDialogOpen && memberDialogMode === 'add'} onClose={closeAddMemberDialog} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Add member</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Select a user and assign one or more roles.
          </DialogContentText>
          <Stack spacing={2.5}>
            <Autocomplete
              options={availableUsers}
              loading={availableUsersLoading}
              value={selectedUserToAdd}
              onChange={(_event, value) => setSelectedUserToAdd(value)}
              getOptionLabel={(option) => `${option.name ?? 'Unknown user'} (${option.email ?? 'No email'})`}
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
                <TextField {...params} label="User" placeholder="Search by name or email" fullWidth />
              )}
            />
            {availableUsersError && <Alert severity="error">{availableUsersError}</Alert>}
            <FormControl fullWidth>
              <InputLabel id="new-member-role-label">Roles</InputLabel>
              <Select
                multiple
                labelId="new-member-role-label"
                label="Roles"
                value={selectedMemberRoles}
                onChange={(e) => setSelectedMemberRoles(e.target.value as InstitutionRole[])}
                renderValue={(selected) => (
                  <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                    {(selected as InstitutionRole[]).map((role) => (
                      <Chip key={role} label={toTitleLabel(role)} size="small" color={roleChipColor(role)} variant="outlined" />
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
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={closeAddMemberDialog} disabled={isAddingMember} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleAddMember} variant="contained" disabled={isAddingMember} sx={{ borderRadius: 2 }}>
            {isAddingMember ? <CircularProgress size={18} color="inherit" /> : 'Add member'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Edit member roles dialog ── */}
      <EditMemberRolesDialog
        open={isMemberRolesDialogOpen && memberDialogMode === 'edit'}
        memberLabel={editingMember ? `${editingMember.name ?? 'Unknown user'} (${editingMember.email ?? 'No email'})` : ''}
        selectedRoles={selectedMemberRoles}
        roleOptions={ALL_INSTITUTION_ROLES}
        loading={isAddingMember}
        error={addMemberError}
        onClose={closeAddMemberDialog}
        onRolesChange={(roles) => setSelectedMemberRoles(roles)}
        onSubmit={handleUpdateMemberRoles}
      />
    </PageContainer>
  );
}
