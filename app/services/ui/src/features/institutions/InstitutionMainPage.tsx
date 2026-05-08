import { useEffect, useMemo, useState, type FormEvent } from 'react';
import React from 'react';
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
import Tooltip from '@mui/material/Tooltip';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
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
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CalendarViewWeekIcon from '@mui/icons-material/CalendarViewWeek';
import TodayIcon from '@mui/icons-material/Today';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SpeedIcon from '@mui/icons-material/Speed';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import Diversity3RoundedIcon from '@mui/icons-material/Diversity3Rounded';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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
  institutionMyScheduleRoute,
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
  triggerScheduleGeneration,
  deleteSchedule,
} from '../../api/institutions';
import { createCourse, updateCourse, deleteCourse } from '../../api/courses';
import { createRoom, updateRoom, deleteRoom } from '../../api/rooms';
import { createGroup, updateGroup, deleteGroup } from '../../api/groups';
import { createActivity, updateActivity, deleteActivity } from '../../api/activities';
import { parseFeatures, featuresToInput } from '../../utils/roomFeatures';
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

function scheduleStatusColor(status: string): 'success' | 'warning' | 'error' | 'default' {
  const s = status.toLowerCase();
  if (s === 'completed') return 'success';
  if (s === 'running') return 'warning';
  if (s === 'failed') return 'error';
  return 'default';
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

  // ── Course CRUD state ──────────────────────────────────────────────────────
  const [isCourseCreateOpen, setIsCourseCreateOpen] = useState(false);
  const [courseCreateName, setCourseCreateName] = useState('');
  const [courseCreateLoading, setCourseCreateLoading] = useState(false);
  const [courseCreateError, setCourseCreateError] = useState<string | null>(null);

  const [courseToEdit, setCourseToEdit] = useState<InstitutionCourse | null>(null);
  const [courseEditName, setCourseEditName] = useState('');
  const [courseEditLoading, setCourseEditLoading] = useState(false);
  const [courseEditError, setCourseEditError] = useState<string | null>(null);

  const [courseToDelete, setCourseToDelete] = useState<InstitutionCourse | null>(null);
  const [courseDeleteLoading, setCourseDeleteLoading] = useState(false);
  const [courseDeleteError, setCourseDeleteError] = useState<string | null>(null);

  // ── Room CRUD state ────────────────────────────────────────────────────────
  const [isRoomCreateOpen, setIsRoomCreateOpen] = useState(false);
  const [roomCreateName, setRoomCreateName] = useState('');
  const [roomCreateCapacity, setRoomCreateCapacity] = useState('30');
  const [roomCreateFeatures, setRoomCreateFeatures] = useState('');
  const [roomCreateLoading, setRoomCreateLoading] = useState(false);
  const [roomCreateError, setRoomCreateError] = useState<string | null>(null);

  const [roomToEdit, setRoomToEdit] = useState<InstitutionRoom | null>(null);
  const [roomEditName, setRoomEditName] = useState('');
  const [roomEditCapacity, setRoomEditCapacity] = useState('30');
  const [roomEditFeatures, setRoomEditFeatures] = useState('');
  const [roomEditLoading, setRoomEditLoading] = useState(false);
  const [roomEditError, setRoomEditError] = useState<string | null>(null);

  const [roomToDelete, setRoomToDelete] = useState<InstitutionRoom | null>(null);
  const [roomDeleteLoading, setRoomDeleteLoading] = useState(false);
  const [roomDeleteError, setRoomDeleteError] = useState<string | null>(null);

  // ── Group CRUD state ───────────────────────────────────────────────────────
  const [isGroupCreateOpen, setIsGroupCreateOpen] = useState(false);
  const [groupCreateName, setGroupCreateName] = useState('');
  const [groupCreateParentId, setGroupCreateParentId] = useState('');
  const [groupCreateLoading, setGroupCreateLoading] = useState(false);
  const [groupCreateError, setGroupCreateError] = useState<string | null>(null);

  const [groupToEdit, setGroupToEdit] = useState<InstitutionGroup | null>(null);
  const [groupEditName, setGroupEditName] = useState('');
  const [groupEditParentId, setGroupEditParentId] = useState('');
  const [groupEditLoading, setGroupEditLoading] = useState(false);
  const [groupEditError, setGroupEditError] = useState<string | null>(null);

  const [groupToDelete, setGroupToDelete] = useState<InstitutionGroup | null>(null);
  const [groupDeleteLoading, setGroupDeleteLoading] = useState(false);
  const [groupDeleteError, setGroupDeleteError] = useState<string | null>(null);

  // ── Activity CRUD state ────────────────────────────────────────────────────
  const ACTIVITY_TYPE_OPTIONS = ['course', 'seminar', 'laboratory', 'other'];
  const FREQUENCY_OPTIONS = ['weekly', 'biweekly', 'biweekly_odd', 'biweekly_even'];

  const [isActivityCreateOpen, setIsActivityCreateOpen] = useState(false);
  const [actCreateCourseId, setActCreateCourseId] = useState('');
  const [actCreateGroupId, setActCreateGroupId] = useState('');
  const [actCreateProfId, setActCreateProfId] = useState('');
  const [actCreateType, setActCreateType] = useState('course');
  const [actCreateFrequency, setActCreateFrequency] = useState('weekly');
  const [actCreateDuration, setActCreateDuration] = useState('2');
  const [actCreateFeatures, setActCreateFeatures] = useState('');
  const [actCreateLoading, setActCreateLoading] = useState(false);
  const [actCreateError, setActCreateError] = useState<string | null>(null);

  const [activityToEdit, setActivityToEdit] = useState<InstitutionActivity | null>(null);
  const [actEditCourseId, setActEditCourseId] = useState('');
  const [actEditGroupId, setActEditGroupId] = useState('');
  const [actEditProfId, setActEditProfId] = useState('');
  const [actEditType, setActEditType] = useState('course');
  const [actEditFrequency, setActEditFrequency] = useState('weekly');
  const [actEditDuration, setActEditDuration] = useState('2');
  const [actEditFeatures, setActEditFeatures] = useState('');
  const [actEditLoading, setActEditLoading] = useState(false);
  const [actEditError, setActEditError] = useState<string | null>(null);

  const [activityToDelete, setActivityToDelete] = useState<InstitutionActivity | null>(null);
  const [actDeleteLoading, setActDeleteLoading] = useState(false);
  const [actDeleteError, setActDeleteError] = useState<string | null>(null);

  const [scheduleToDelete, setScheduleToDelete] = useState<InstitutionSchedule | null>(null);
  const [scheduleDeleteLoading, setScheduleDeleteLoading] = useState(false);
  const [scheduleDeleteError, setScheduleDeleteError] = useState<string | null>(null);

  const [groupSearchQuery, setGroupSearchQuery] = useState('');

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

  const handleGenerateSchedule = async () => {
    if (!institutionId) return;
    setSchedulesState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await triggerScheduleGeneration(institutionId);
      const updated = await getInstitutionSchedules(institutionId);
      setSchedulesState({ data: updated, loading: false, error: null });
    } catch (err) {
      setSchedulesState((prev) => ({ ...prev, loading: false, error: (err as Error).message || 'Failed to generate schedule.' }));
    }
  };

  // ── Course handlers ────────────────────────────────────────────────────────
  const handleCourseCreate = async () => {
    if (!institutionId) return;
    const name = courseCreateName.trim();
    if (!name) { setCourseCreateError('Course name is required.'); return; }
    setCourseCreateLoading(true); setCourseCreateError(null);
    try {
      await createCourse({ institution_id: institutionId, name });
      const updated = await getInstitutionCourses(institutionId);
      setCoursesState({ data: updated, loading: false, error: null });
      setIsCourseCreateOpen(false); setCourseCreateName('');
    } catch (err) { setCourseCreateError((err as Error).message || 'Failed to create course.'); }
    finally { setCourseCreateLoading(false); }
  };

  const handleCourseEdit = async () => {
    if (!courseToEdit) return;
    const name = courseEditName.trim();
    if (!name) { setCourseEditError('Course name is required.'); return; }
    const id = String(courseToEdit.id ?? courseToEdit._id ?? '');
    setCourseEditLoading(true); setCourseEditError(null);
    try {
      await updateCourse(id, { name });
      const updated = await getInstitutionCourses(institutionId!);
      setCoursesState({ data: updated, loading: false, error: null });
      setCourseToEdit(null);
    } catch (err) { setCourseEditError((err as Error).message || 'Failed to update course.'); }
    finally { setCourseEditLoading(false); }
  };

  const handleCourseDelete = async () => {
    if (!courseToDelete) return;
    const id = String(courseToDelete.id ?? courseToDelete._id ?? '');
    setCourseDeleteLoading(true); setCourseDeleteError(null);
    try {
      await deleteCourse(id);
      const updated = await getInstitutionCourses(institutionId!);
      setCoursesState({ data: updated, loading: false, error: null });
      setCourseToDelete(null);
    } catch (err) { setCourseDeleteError((err as Error).message || 'Failed to delete course.'); }
    finally { setCourseDeleteLoading(false); }
  };

  // ── Room handlers ──────────────────────────────────────────────────────────
  const handleRoomCreate = async () => {
    if (!institutionId) return;
    const name = roomCreateName.trim();
    const capacity = Number(roomCreateCapacity);
    if (!name) { setRoomCreateError('Room name is required.'); return; }
    if (!Number.isFinite(capacity) || capacity < 1) { setRoomCreateError('Capacity must be a positive number.'); return; }
    setRoomCreateLoading(true); setRoomCreateError(null);
    try {
      await createRoom({ institution_id: institutionId, name, capacity, features: parseFeatures(roomCreateFeatures) });
      const updated = await getInstitutionRooms(institutionId);
      setRoomsState({ data: updated, loading: false, error: null });
      setIsRoomCreateOpen(false); setRoomCreateName(''); setRoomCreateCapacity('30'); setRoomCreateFeatures('');
    } catch (err) { setRoomCreateError((err as Error).message || 'Failed to create room.'); }
    finally { setRoomCreateLoading(false); }
  };

  const handleRoomEdit = async () => {
    if (!roomToEdit) return;
    const name = roomEditName.trim();
    const capacity = Number(roomEditCapacity);
    if (!name) { setRoomEditError('Room name is required.'); return; }
    if (!Number.isFinite(capacity) || capacity < 1) { setRoomEditError('Capacity must be a positive number.'); return; }
    const id = String(roomToEdit.id ?? roomToEdit._id ?? '');
    setRoomEditLoading(true); setRoomEditError(null);
    try {
      await updateRoom(id, { name, capacity, features: parseFeatures(roomEditFeatures) });
      const updated = await getInstitutionRooms(institutionId!);
      setRoomsState({ data: updated, loading: false, error: null });
      setRoomToEdit(null);
    } catch (err) { setRoomEditError((err as Error).message || 'Failed to update room.'); }
    finally { setRoomEditLoading(false); }
  };

  const handleRoomDelete = async () => {
    if (!roomToDelete) return;
    const id = String(roomToDelete.id ?? roomToDelete._id ?? '');
    setRoomDeleteLoading(true); setRoomDeleteError(null);
    try {
      await deleteRoom(id);
      const updated = await getInstitutionRooms(institutionId!);
      setRoomsState({ data: updated, loading: false, error: null });
      setRoomToDelete(null);
    } catch (err) { setRoomDeleteError((err as Error).message || 'Failed to delete room.'); }
    finally { setRoomDeleteLoading(false); }
  };

  // ── Group handlers ─────────────────────────────────────────────────────────
  const handleGroupCreate = async () => {
    if (!institutionId) return;
    const name = groupCreateName.trim();
    if (!name) { setGroupCreateError('Group name is required.'); return; }
    setGroupCreateLoading(true); setGroupCreateError(null);
    try {
      await createGroup({ institution_id: institutionId, name, parent_group_id: groupCreateParentId || null });
      const updated = await getInstitutionGroups(institutionId);
      setGroupsState({ data: updated, loading: false, error: null });
      setIsGroupCreateOpen(false); setGroupCreateName(''); setGroupCreateParentId('');
    } catch (err) { setGroupCreateError((err as Error).message || 'Failed to create group.'); }
    finally { setGroupCreateLoading(false); }
  };

  const handleGroupEdit = async () => {
    if (!groupToEdit) return;
    const name = groupEditName.trim();
    if (!name) { setGroupEditError('Group name is required.'); return; }
    const id = String(groupToEdit.id ?? groupToEdit._id ?? '');
    setGroupEditLoading(true); setGroupEditError(null);
    try {
      await updateGroup(id, { name, parent_group_id: groupEditParentId || null });
      const updated = await getInstitutionGroups(institutionId!);
      setGroupsState({ data: updated, loading: false, error: null });
      setGroupToEdit(null);
    } catch (err) { setGroupEditError((err as Error).message || 'Failed to update group.'); }
    finally { setGroupEditLoading(false); }
  };

  const handleGroupDelete = async () => {
    if (!groupToDelete) return;
    const id = String(groupToDelete.id ?? groupToDelete._id ?? '');
    setGroupDeleteLoading(true); setGroupDeleteError(null);
    try {
      await deleteGroup(id);
      const updated = await getInstitutionGroups(institutionId!);
      setGroupsState({ data: updated, loading: false, error: null });
      setGroupToDelete(null);
    } catch (err) { setGroupDeleteError((err as Error).message || 'Failed to delete group.'); }
    finally { setGroupDeleteLoading(false); }
  };

  // ── Activity handlers ──────────────────────────────────────────────────────
  const handleActivityCreate = async () => {
    if (!institutionId) return;
    if (!actCreateCourseId) { setActCreateError('Course is required.'); return; }
    if (!actCreateGroupId) { setActCreateError('Group is required.'); return; }
    const duration = Number(actCreateDuration);
    if (!Number.isInteger(duration) || duration < 1) { setActCreateError('Duration must be a positive integer.'); return; }
    setActCreateLoading(true); setActCreateError(null);
    try {
      await createActivity({
        institution_id: institutionId,
        course_id: actCreateCourseId,
        group_id: actCreateGroupId,
        professor_id: actCreateProfId || null,
        activity_type: actCreateType,
        frequency: actCreateFrequency,
        duration_slots: duration,
        required_room_features: parseFeatures(actCreateFeatures),
      });
      const updated = await getInstitutionActivities(institutionId);
      setActivitiesState({ data: updated, loading: false, error: null });
      setIsActivityCreateOpen(false);
      setActCreateCourseId(''); setActCreateGroupId(''); setActCreateProfId('');
      setActCreateType('course'); setActCreateFrequency('weekly');
      setActCreateDuration('2'); setActCreateFeatures('');
    } catch (err) { setActCreateError((err as Error).message || 'Failed to create activity.'); }
    finally { setActCreateLoading(false); }
  };

  const handleActivityEdit = async () => {
    if (!activityToEdit) return;
    if (!actEditCourseId) { setActEditError('Course is required.'); return; }
    if (!actEditGroupId) { setActEditError('Group is required.'); return; }
    const duration = Number(actEditDuration);
    if (!Number.isInteger(duration) || duration < 1) { setActEditError('Duration must be a positive integer.'); return; }
    const id = String(activityToEdit.id ?? activityToEdit._id ?? '');
    setActEditLoading(true); setActEditError(null);
    try {
      await updateActivity(id, {
        course_id: actEditCourseId,
        group_id: actEditGroupId,
        professor_id: actEditProfId || null,
        activity_type: actEditType,
        frequency: actEditFrequency,
        duration_slots: duration,
        required_room_features: parseFeatures(actEditFeatures),
      });
      const updated = await getInstitutionActivities(institutionId!);
      setActivitiesState({ data: updated, loading: false, error: null });
      setActivityToEdit(null);
    } catch (err) { setActEditError((err as Error).message || 'Failed to update activity.'); }
    finally { setActEditLoading(false); }
  };

  const handleActivityDelete = async () => {
    if (!activityToDelete) return;
    const id = String(activityToDelete.id ?? activityToDelete._id ?? '');
    setActDeleteLoading(true); setActDeleteError(null);
    try {
      await deleteActivity(id);
      const updated = await getInstitutionActivities(institutionId!);
      setActivitiesState({ data: updated, loading: false, error: null });
      setActivityToDelete(null);
    } catch (err) { setActDeleteError((err as Error).message || 'Failed to delete activity.'); }
    finally { setActDeleteLoading(false); }
  };

  const handleScheduleDelete = async () => {
    if (!scheduleToDelete) return;
    const id = String(scheduleToDelete.id ?? scheduleToDelete._id ?? '');
    setScheduleDeleteLoading(true); setScheduleDeleteError(null);
    try {
      await deleteSchedule(id);
      const updated = await getInstitutionSchedules(institutionId!);
      setSchedulesState({ data: updated, loading: false, error: null });
      setScheduleToDelete(null);
    } catch (err) { setScheduleDeleteError((err as Error).message || 'Failed to delete schedule.'); }
    finally { setScheduleDeleteLoading(false); }
  };

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
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Tooltip title="Edit roles">
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
                sx={{ borderRadius: 1.5 }}
              >
                <EditRoundedIcon sx={{ fontSize: '0.85rem' }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Remove">
              <IconButton
                size="small"
                aria-label="Remove member"
                color="error"
                disabled={isRemoving || isDeleting || isAddingMember}
                onClick={(event) => {
                  event.stopPropagation();
                  handleRemoveMember(userId);
                }}
                sx={{ borderRadius: 1.5 }}
              >
                {isRemoving ? <CircularProgress size={12} color="inherit" /> : <DeleteOutlineRoundedIcon sx={{ fontSize: '0.85rem' }} />}
              </IconButton>
            </Tooltip>
          </Stack>
        ) : undefined,
      };
    }).sort((a, b) => compareAlphabetical(a.primary, b.primary));
  }, [usersState.data, institutionId, canManageInstitution, removingMemberId, isDeleting, isAddingMember]);

  const adminCount = useMemo(() => {
    if (!institutionId) return 0;
    return usersState.data.filter((user) => isInstitutionAdmin(user, institutionId)).length;
  }, [usersState.data, institutionId]);

  const groupsById = useMemo(() => {
    const map = new Map<string, InstitutionGroup>();
    groupsState.data.forEach((g) => {
      const id = String(g.id ?? g._id ?? '');
      if (id) map.set(id, g);
    });
    return map;
  }, [groupsState.data]);

  const childrenByParent = useMemo(() => {
    const map = new Map<string | null, string[]>();
    groupsState.data.forEach((g) => {
      const gId = String(g.id ?? g._id ?? '');
      if (!gId) return;
      const parentId = g.parent_group_id ? String(g.parent_group_id) : null;
      if (!map.has(parentId)) map.set(parentId, []);
      map.get(parentId)!.push(gId);
    });
    map.forEach((ids) => ids.sort((a, b) => compareAlphabetical(groupsById.get(a)?.name ?? a, groupsById.get(b)?.name ?? b)));
    return map;
  }, [groupsState.data, groupsById]);

  const rootGroupIds = useMemo(() => childrenByParent.get(null) ?? [], [childrenByParent]);

  const filteredGroupIds = useMemo(() => {
    const q = groupSearchQuery.trim().toLowerCase();
    return new Set(
      groupsState.data
        .filter((g) => (g.name ?? '').toLowerCase().includes(q))
        .map((g) => String(g.id ?? g._id ?? ''))
        .filter(Boolean),
    );
  }, [groupsState.data, groupSearchQuery]);

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
    () => rootGroupIds.filter((id) => displayedTreeGroupIds.has(id)),
    [rootGroupIds, displayedTreeGroupIds],
  );

  const coursesList = useMemo(() => coursesState.data.map((course) => ({
    key: String(course.id ?? course._id ?? course.name),
    primary: course.name,
    to: courseRoute(String(course.id ?? course._id ?? course.name)),
    rowAction: canManageInstitution ? (
      <Stack direction="row" spacing={0.5}>
        <Tooltip title="Edit"><IconButton size="small" sx={{ borderRadius: 1.5 }} onClick={(e) => { e.stopPropagation(); setCourseEditName(course.name); setCourseToEdit(course); }}><EditRoundedIcon sx={{ fontSize: '0.85rem' }} /></IconButton></Tooltip>
        <Tooltip title="Delete"><IconButton size="small" color="error" sx={{ borderRadius: 1.5 }} onClick={(e) => { e.stopPropagation(); setCourseToDelete(course); }}><DeleteOutlineRoundedIcon sx={{ fontSize: '0.85rem' }} /></IconButton></Tooltip>
      </Stack>
    ) : undefined,
  })).sort((a, b) => compareAlphabetical(a.primary, b.primary)), [coursesState.data, canManageInstitution]);

  const roomsList = useMemo(() => roomsState.data.map((room) => ({
    key: String(room.id ?? room._id ?? room.name),
    primary: room.name,
    secondary: `${room.capacity} seats`,
    to: roomRoute(String(room.id ?? room._id ?? room.name)),
    rowAction: canManageInstitution ? (
      <Stack direction="row" spacing={0.5}>
        <Tooltip title="Edit"><IconButton size="small" sx={{ borderRadius: 1.5 }} onClick={(e) => { e.stopPropagation(); setRoomEditName(room.name); setRoomEditCapacity(String(room.capacity)); setRoomEditFeatures(featuresToInput(room.features ?? [])); setRoomToEdit(room); }}><EditRoundedIcon sx={{ fontSize: '0.85rem' }} /></IconButton></Tooltip>
        <Tooltip title="Delete"><IconButton size="small" color="error" sx={{ borderRadius: 1.5 }} onClick={(e) => { e.stopPropagation(); setRoomToDelete(room); }}><DeleteOutlineRoundedIcon sx={{ fontSize: '0.85rem' }} /></IconButton></Tooltip>
      </Stack>
    ) : undefined,
  })).sort((a, b) => compareAlphabetical(a.primary, b.primary)), [roomsState.data, canManageInstitution]);

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
      rowAction: canManageInstitution ? (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Edit"><IconButton size="small" sx={{ borderRadius: 1.5 }} onClick={(e) => { e.stopPropagation(); setActEditCourseId(String(activity.course_id)); setActEditGroupId(String(activity.group_id)); setActEditProfId(activity.professor_id ? String(activity.professor_id) : ''); setActEditType(activity.activity_type); setActEditFrequency(activity.frequency); setActEditDuration(String(activity.duration_slots)); setActEditFeatures(featuresToInput(activity.required_room_features ?? [])); setActivityToEdit(activity); }}><EditRoundedIcon sx={{ fontSize: '0.85rem' }} /></IconButton></Tooltip>
          <Tooltip title="Delete"><IconButton size="small" color="error" sx={{ borderRadius: 1.5 }} onClick={(e) => { e.stopPropagation(); setActivityToDelete(activity); }}><DeleteOutlineRoundedIcon sx={{ fontSize: '0.85rem' }} /></IconButton></Tooltip>
        </Stack>
      ) : undefined,
    };
  }).sort((a, b) => compareAlphabetical(a.primary, b.primary)), [activitiesState.data, groupNameById, courseNameById, canManageInstitution]);

  const schedulesList = useMemo(() => {
    const sorted = [...schedulesState.data].sort((a, b) => {
      const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return tb - ta;
    });
    return sorted.map((schedule, index) => {
      const scheduleId = String(schedule.id ?? schedule._id ?? schedule.timestamp ?? 'schedule');
      const num = sorted.length - index;
      return {
        key: scheduleId,
        primary: `Schedule #${num}`,
        secondary: formatCreatedAt(schedule.timestamp),
        to: scheduleRoute(scheduleId),
        rowAction: (
          <Stack direction="row" spacing={0.5} alignItems="center">
            {schedule.status && (
              <Chip
                label={schedule.status}
                size="small"
                color={scheduleStatusColor(schedule.status)}
                sx={{ borderRadius: 1.5, fontSize: '0.7rem', height: 20 }}
              />
            )}
            {canManageInstitution && (
              <Tooltip title="Delete">
                <IconButton size="small" color="error" sx={{ borderRadius: 1.5 }} onClick={(e) => { e.stopPropagation(); setScheduleDeleteError(null); setScheduleToDelete(schedule); }}>
                  <DeleteOutlineRoundedIcon sx={{ fontSize: '0.85rem' }} />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        ),
      };
    });
  }, [schedulesState.data]);

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

  // ── Group tree renderer ────────────────────────────────────────────────────

  const renderGroupTreeNode = (groupId: string, depth = 0): React.ReactNode => {
    if (!displayedTreeGroupIds.has(groupId)) return null;
    const group = groupsById.get(groupId);
    if (!group) return null;
    const children = (childrenByParent.get(groupId) ?? []).filter((cId) => displayedTreeGroupIds.has(cId));
    const childCount = (childrenByParent.get(groupId) ?? []).length;

    const rowContent = (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
        <Box sx={{ width: 28, height: 28, borderRadius: 1.5, flexShrink: 0, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Diversity3RoundedIcon sx={{ fontSize: '0.85rem' }} />
        </Box>
        <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {group.name}
        </Typography>
        {childCount > 0 && <Chip size="small" label={childCount} sx={{ height: 18, fontSize: '0.7rem', ml: 0.5 }} />}
      </Box>
    );

    const actionButtons = (
      <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
        <Tooltip title="Open">
          <IconButton size="small" onClick={() => navigate(groupRoute(groupId))} sx={{ borderRadius: 1.5 }}>
            <OpenInNewRoundedIcon sx={{ fontSize: '0.85rem' }} />
          </IconButton>
        </Tooltip>
        {canManageInstitution && (
          <Tooltip title="Edit">
            <IconButton size="small" sx={{ borderRadius: 1.5 }} onClick={() => { setGroupEditError(null); setGroupEditName(group.name); setGroupEditParentId(group.parent_group_id ? String(group.parent_group_id) : ''); setGroupToEdit(group); }}>
              <EditRoundedIcon sx={{ fontSize: '0.85rem' }} />
            </IconButton>
          </Tooltip>
        )}
        {canManageInstitution && (
          <Tooltip title="Delete">
            <IconButton size="small" color="error" sx={{ borderRadius: 1.5 }} onClick={() => { setGroupDeleteError(null); setGroupToDelete(group); }}>
              <DeleteOutlineRoundedIcon sx={{ fontSize: '0.85rem' }} />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    );

    const wrapperSx = {
      ml: depth > 0 ? 1.5 : 0,
      borderLeft: depth > 0 ? `2px solid ${alpha(theme.palette.primary.main, 0.15)}` : 'none',
      pl: depth > 0 ? 1 : 0,
    };

    if (children.length === 0) {
      return (
        <Box key={groupId} sx={wrapperSx}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, px: 1, py: 0.75, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', transition: 'border-color 150ms ease, background 150ms ease', '&:hover': { borderColor: 'primary.light', bgcolor: alpha(theme.palette.primary.main, 0.03) } }}>
            {rowContent}
            {actionButtons}
          </Box>
        </Box>
      );
    }

    return (
      <Box key={groupId} sx={wrapperSx}>
        <Accordion disableGutters elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '6px !important', overflow: 'hidden', '&:before': { display: 'none' }, '&.Mui-expanded': { borderColor: alpha(theme.palette.primary.main, 0.4) } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />} sx={{ px: 1, py: 0.25, minHeight: 40, '& .MuiAccordionSummary-content': { my: 0.5 } }}>
            <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, pr: 1 }}>
              {rowContent}
              {actionButtons}
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 1, pb: 1, pt: 0 }}>
            <Stack spacing={0.75}>
              {children.map((cId) => renderGroupTreeNode(cId, depth + 1))}
            </Stack>
          </AccordionDetails>
        </Accordion>
      </Box>
    );
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
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {canManageInstitution && (
                  <>
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
                  </>
                )}
              </Stack>
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

        {/* ── My Schedule banner ── */}
        <Paper
          variant="outlined"
          onClick={() => institutionId && navigate(institutionMyScheduleRoute(institutionId))}
          sx={{
            borderRadius: 3,
            overflow: 'hidden',
            cursor: 'pointer',
            borderColor: institution.active_schedule_id
              ? alpha(theme.palette.primary.main, 0.5)
              : 'divider',
            background: institution.active_schedule_id
              ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.07)} 0%, transparent 70%)`
              : undefined,
            transition: 'box-shadow 150ms ease, border-color 150ms ease',
            '&:hover': {
              boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.25)}`,
              borderColor: 'primary.main',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2.5, py: 2 }}>
            <Box
              sx={{
                width: 48, height: 48, borderRadius: 2, flexShrink: 0,
                bgcolor: institution.active_schedule_id
                  ? alpha(theme.palette.primary.main, 0.15)
                  : alpha(theme.palette.text.secondary, 0.08),
                color: institution.active_schedule_id ? 'primary.main' : 'text.secondary',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <ScheduleIcon sx={{ fontSize: '1.6rem' }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                My Schedule
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {institution.active_schedule_id
                  ? 'View your personal timetable for the active schedule'
                  : 'No active schedule yet — an admin needs to activate one first'}
              </Typography>
            </Box>
            <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
              {institution.active_schedule_id && (
                <Chip
                  label="Active"
                  size="small"
                  color="primary"
                  sx={{ borderRadius: 1.5, fontSize: '0.70rem', height: 20 }}
                />
              )}
              <ArrowForwardRoundedIcon sx={{ fontSize: '1.1rem', color: 'text.disabled' }} />
            </Box>
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
              headerAction={canManageInstitution ? (
                <Button size="small" variant="contained" startIcon={<AddRoundedIcon />} onClick={() => { setRoomCreateName(''); setRoomCreateCapacity('30'); setRoomCreateFeatures(''); setIsRoomCreateOpen(true); }} sx={{ borderRadius: 2, fontSize: '0.8rem', py: 0.5 }}>
                  Create
                </Button>
              ) : undefined}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Paper variant="outlined" sx={{ borderRadius: 3, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Header */}
              <Box sx={{ px: 2.5, py: 1.75, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                  <Typography
                    variant="subtitle1"
                    onClick={() => navigate(`${institutionBase}/groups`)}
                    sx={{ fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 0.4, transition: 'color 150ms', '&:hover': { color: 'primary.main' } }}
                  >
                    Groups
                    <ArrowForwardRoundedIcon sx={{ fontSize: '0.85rem', opacity: 0.5 }} />
                  </Typography>
                  {!groupsState.loading && (
                    <Box sx={{ px: 0.75, py: 0.1, borderRadius: 1, bgcolor: 'action.selected', lineHeight: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.72rem' }}>{groupsState.data.length}</Typography>
                    </Box>
                  )}
                </Box>
                {canManageInstitution && (
                  <Button size="small" variant="contained" startIcon={<AddRoundedIcon />} onClick={() => { setGroupCreateName(''); setGroupCreateParentId(''); setGroupCreateError(null); setIsGroupCreateOpen(true); }} sx={{ borderRadius: 2, fontSize: '0.8rem', py: 0.5 }}>
                    Create
                  </Button>
                )}
              </Box>
              {/* Search */}
              <Box sx={{ px: 2, pt: 1.5, pb: 1, flexShrink: 0 }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Search groups..."
                  value={groupSearchQuery}
                  onChange={(e) => setGroupSearchQuery(e.target.value)}
                  slotProps={{ input: { startAdornment: <SearchIcon sx={{ fontSize: '1rem', mr: 0.75, color: 'text.disabled' }} /> } }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.875rem' } }}
                />
              </Box>
              {/* Content */}
              <Box sx={{ flexGrow: 1, overflow: 'hidden', px: 1.5, pb: 1.5 }}>
                {groupsState.loading ? (
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1, py: 1.5 }}>
                    <CircularProgress size={16} />
                    <Typography variant="caption" color="text.secondary">Loading...</Typography>
                  </Stack>
                ) : groupsState.error ? (
                  <Alert severity="error" sx={{ mx: 0.5, mt: 0.5 }}>{groupsState.error}</Alert>
                ) : groupsState.data.length === 0 ? (
                  <Box sx={{ py: 3.5, px: 1, textAlign: 'center' }}>
                    <Box sx={{ display: 'inline-flex', p: 1.5, borderRadius: 3, bgcolor: 'action.hover', color: 'text.disabled', mb: 1.5, '& svg': { fontSize: '1.5rem' } }}>
                      <Diversity3Icon />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>No groups yet</Typography>
                    <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5, lineHeight: 1.5 }}>
                      Organize students into groups to assign them activities and schedules.
                    </Typography>
                  </Box>
                ) : displayedRootGroupIds.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 1.5 }}>
                    No results for &ldquo;{groupSearchQuery}&rdquo;
                  </Typography>
                ) : (
                  <Box sx={{ maxHeight: 248, overflowY: 'auto', '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 2 }, '&::-webkit-scrollbar-track': { bgcolor: 'transparent' } }}>
                    <Stack spacing={0.75}>
                      {displayedRootGroupIds.map((id) => renderGroupTreeNode(id))}
                    </Stack>
                  </Box>
                )}
              </Box>
            </Paper>
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
              headerAction={canManageInstitution ? (
                <Button size="small" variant="contained" startIcon={<AddRoundedIcon />} onClick={() => { setCourseCreateName(''); setIsCourseCreateOpen(true); }} sx={{ borderRadius: 2, fontSize: '0.8rem', py: 0.5 }}>
                  Create
                </Button>
              ) : undefined}
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
              headerAction={canManageInstitution ? (
                <Button size="small" variant="contained" startIcon={<AddRoundedIcon />} onClick={() => { setActCreateCourseId(''); setActCreateGroupId(''); setActCreateProfId(''); setActCreateType('course'); setActCreateFrequency('weekly'); setActCreateDuration('2'); setActCreateFeatures(''); setIsActivityCreateOpen(true); }} sx={{ borderRadius: 2, fontSize: '0.8rem', py: 0.5 }}>
                  Create
                </Button>
              ) : undefined}
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
                <Button size="small" variant="contained" onClick={handleGenerateSchedule} sx={{ borderRadius: 2 }}>
                  Generate schedule
                </Button>
              ) : undefined}
              headerAction={canManageInstitution ? (
                <Button size="small" variant="contained" onClick={handleGenerateSchedule} sx={{ borderRadius: 2, flexShrink: 0 }}>
                  Generate
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

      {/* ── Create course dialog ── */}
      <Dialog open={isCourseCreateOpen} onClose={() => { if (!courseCreateLoading) { setIsCourseCreateOpen(false); setCourseCreateError(null); } }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>New course</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <TextField
              label="Course name"
              value={courseCreateName}
              onChange={(e) => setCourseCreateName(e.target.value)}
              fullWidth
              autoFocus
              disabled={courseCreateLoading}
            />
            {courseCreateError && <Alert severity="error">{courseCreateError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => { if (!courseCreateLoading) { setIsCourseCreateOpen(false); setCourseCreateError(null); } }} disabled={courseCreateLoading} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleCourseCreate} variant="contained" disabled={courseCreateLoading} sx={{ borderRadius: 2 }}>
            {courseCreateLoading ? <CircularProgress size={18} color="inherit" /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Edit course dialog ── */}
      <Dialog open={!!courseToEdit} onClose={() => { if (!courseEditLoading) { setCourseToEdit(null); setCourseEditError(null); } }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit course</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <TextField
              label="Course name"
              value={courseEditName}
              onChange={(e) => setCourseEditName(e.target.value)}
              fullWidth
              autoFocus
              disabled={courseEditLoading}
            />
            {courseEditError && <Alert severity="error">{courseEditError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => { if (!courseEditLoading) { setCourseToEdit(null); setCourseEditError(null); } }} disabled={courseEditLoading} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleCourseEdit} variant="contained" disabled={courseEditLoading} sx={{ borderRadius: 2 }}>
            {courseEditLoading ? <CircularProgress size={18} color="inherit" /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete course dialog ── */}
      <Dialog open={!!courseToDelete} onClose={() => { if (!courseDeleteLoading) { setCourseToDelete(null); setCourseDeleteError(null); } }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete course?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{courseToDelete?.name}</strong>? This action cannot be undone.
          </DialogContentText>
          {courseDeleteError && <Alert severity="error" sx={{ mt: 2 }}>{courseDeleteError}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => { if (!courseDeleteLoading) { setCourseToDelete(null); setCourseDeleteError(null); } }} disabled={courseDeleteLoading} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleCourseDelete} color="error" variant="contained" disabled={courseDeleteLoading} sx={{ borderRadius: 2 }}>
            {courseDeleteLoading ? <CircularProgress size={18} color="inherit" /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Create room dialog ── */}
      <Dialog open={isRoomCreateOpen} onClose={() => { if (!roomCreateLoading) { setIsRoomCreateOpen(false); setRoomCreateError(null); } }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>New room</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <TextField
              label="Room name"
              value={roomCreateName}
              onChange={(e) => setRoomCreateName(e.target.value)}
              fullWidth
              autoFocus
              disabled={roomCreateLoading}
            />
            <TextField
              label="Capacity"
              type="number"
              value={roomCreateCapacity}
              onChange={(e) => setRoomCreateCapacity(e.target.value)}
              fullWidth
              disabled={roomCreateLoading}
              slotProps={{ htmlInput: { min: 1 } }}
            />
            <TextField
              label="Features"
              value={roomCreateFeatures}
              onChange={(e) => setRoomCreateFeatures(e.target.value)}
              fullWidth
              disabled={roomCreateLoading}
              helperText="Comma-separated list of room features"
            />
            {roomCreateError && <Alert severity="error">{roomCreateError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => { if (!roomCreateLoading) { setIsRoomCreateOpen(false); setRoomCreateError(null); } }} disabled={roomCreateLoading} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleRoomCreate} variant="contained" disabled={roomCreateLoading} sx={{ borderRadius: 2 }}>
            {roomCreateLoading ? <CircularProgress size={18} color="inherit" /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Edit room dialog ── */}
      <Dialog open={!!roomToEdit} onClose={() => { if (!roomEditLoading) { setRoomToEdit(null); setRoomEditError(null); } }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit room</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <TextField
              label="Room name"
              value={roomEditName}
              onChange={(e) => setRoomEditName(e.target.value)}
              fullWidth
              autoFocus
              disabled={roomEditLoading}
            />
            <TextField
              label="Capacity"
              type="number"
              value={roomEditCapacity}
              onChange={(e) => setRoomEditCapacity(e.target.value)}
              fullWidth
              disabled={roomEditLoading}
              slotProps={{ htmlInput: { min: 1 } }}
            />
            <TextField
              label="Features"
              value={roomEditFeatures}
              onChange={(e) => setRoomEditFeatures(e.target.value)}
              fullWidth
              disabled={roomEditLoading}
              helperText="Comma-separated list of room features"
            />
            {roomEditError && <Alert severity="error">{roomEditError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => { if (!roomEditLoading) { setRoomToEdit(null); setRoomEditError(null); } }} disabled={roomEditLoading} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleRoomEdit} variant="contained" disabled={roomEditLoading} sx={{ borderRadius: 2 }}>
            {roomEditLoading ? <CircularProgress size={18} color="inherit" /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete room dialog ── */}
      <Dialog open={!!roomToDelete} onClose={() => { if (!roomDeleteLoading) { setRoomToDelete(null); setRoomDeleteError(null); } }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete room?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{roomToDelete?.name}</strong>? This action cannot be undone.
          </DialogContentText>
          {roomDeleteError && <Alert severity="error" sx={{ mt: 2 }}>{roomDeleteError}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => { if (!roomDeleteLoading) { setRoomToDelete(null); setRoomDeleteError(null); } }} disabled={roomDeleteLoading} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleRoomDelete} color="error" variant="contained" disabled={roomDeleteLoading} sx={{ borderRadius: 2 }}>
            {roomDeleteLoading ? <CircularProgress size={18} color="inherit" /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Create group dialog ── */}
      <Dialog open={isGroupCreateOpen} onClose={() => { if (!groupCreateLoading) { setIsGroupCreateOpen(false); setGroupCreateError(null); } }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>New group</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <TextField
              label="Group name"
              value={groupCreateName}
              onChange={(e) => setGroupCreateName(e.target.value)}
              fullWidth
              autoFocus
              disabled={groupCreateLoading}
            />
            <TextField
              label="Parent group"
              select
              value={groupCreateParentId}
              onChange={(e) => setGroupCreateParentId(e.target.value)}
              fullWidth
              disabled={groupCreateLoading}
            >
              <MenuItem value="">(None)</MenuItem>
              {groupsState.data.map((g) => (
                <MenuItem key={String(g.id ?? g._id)} value={String(g.id ?? g._id)}>{g.name}</MenuItem>
              ))}
            </TextField>
            {groupCreateError && <Alert severity="error">{groupCreateError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => { if (!groupCreateLoading) { setIsGroupCreateOpen(false); setGroupCreateError(null); } }} disabled={groupCreateLoading} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleGroupCreate} variant="contained" disabled={groupCreateLoading} sx={{ borderRadius: 2 }}>
            {groupCreateLoading ? <CircularProgress size={18} color="inherit" /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Edit group dialog ── */}
      <Dialog open={!!groupToEdit} onClose={() => { if (!groupEditLoading) { setGroupToEdit(null); setGroupEditError(null); } }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit group</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <TextField
              label="Group name"
              value={groupEditName}
              onChange={(e) => setGroupEditName(e.target.value)}
              fullWidth
              autoFocus
              disabled={groupEditLoading}
            />
            <TextField
              label="Parent group"
              select
              value={groupEditParentId}
              onChange={(e) => setGroupEditParentId(e.target.value)}
              fullWidth
              disabled={groupEditLoading}
            >
              <MenuItem value="">(None)</MenuItem>
              {groupsState.data
                .filter((g) => String(g.id ?? g._id) !== String(groupToEdit?.id ?? groupToEdit?._id))
                .map((g) => (
                  <MenuItem key={String(g.id ?? g._id)} value={String(g.id ?? g._id)}>{g.name}</MenuItem>
                ))}
            </TextField>
            {groupEditError && <Alert severity="error">{groupEditError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => { if (!groupEditLoading) { setGroupToEdit(null); setGroupEditError(null); } }} disabled={groupEditLoading} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleGroupEdit} variant="contained" disabled={groupEditLoading} sx={{ borderRadius: 2 }}>
            {groupEditLoading ? <CircularProgress size={18} color="inherit" /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete group dialog ── */}
      <Dialog open={!!groupToDelete} onClose={() => { if (!groupDeleteLoading) { setGroupToDelete(null); setGroupDeleteError(null); } }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete group?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{groupToDelete?.name}</strong>? This action cannot be undone.
          </DialogContentText>
          {groupDeleteError && <Alert severity="error" sx={{ mt: 2 }}>{groupDeleteError}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => { if (!groupDeleteLoading) { setGroupToDelete(null); setGroupDeleteError(null); } }} disabled={groupDeleteLoading} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleGroupDelete} color="error" variant="contained" disabled={groupDeleteLoading} sx={{ borderRadius: 2 }}>
            {groupDeleteLoading ? <CircularProgress size={18} color="inherit" /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Create activity dialog ── */}
      <Dialog open={isActivityCreateOpen} onClose={() => { if (!actCreateLoading) { setIsActivityCreateOpen(false); setActCreateError(null); } }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>New activity</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <TextField
              label="Course"
              select
              value={actCreateCourseId}
              onChange={(e) => setActCreateCourseId(e.target.value)}
              fullWidth
              disabled={actCreateLoading}
            >
              {coursesState.data.map((c) => (
                <MenuItem key={String(c.id ?? c._id)} value={String(c.id ?? c._id)}>{c.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Group"
              select
              value={actCreateGroupId}
              onChange={(e) => setActCreateGroupId(e.target.value)}
              fullWidth
              disabled={actCreateLoading}
            >
              {groupsState.data.map((g) => (
                <MenuItem key={String(g.id ?? g._id)} value={String(g.id ?? g._id)}>{g.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Professor (optional)"
              select
              value={actCreateProfId}
              onChange={(e) => setActCreateProfId(e.target.value)}
              fullWidth
              disabled={actCreateLoading}
            >
              <MenuItem value="">(None)</MenuItem>
              {usersState.data.map((u) => (
                <MenuItem key={String(u.id ?? u._id)} value={String(u.id ?? u._id)}>{u.name ?? u.email ?? 'Unknown'}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Activity type"
              select
              value={actCreateType}
              onChange={(e) => setActCreateType(e.target.value)}
              fullWidth
              disabled={actCreateLoading}
            >
              {ACTIVITY_TYPE_OPTIONS.map((opt) => (
                <MenuItem key={opt} value={opt}>{toTitleLabel(opt)}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Frequency"
              select
              value={actCreateFrequency}
              onChange={(e) => setActCreateFrequency(e.target.value)}
              fullWidth
              disabled={actCreateLoading}
            >
              {FREQUENCY_OPTIONS.map((opt) => (
                <MenuItem key={opt} value={opt}>{toTitleLabel(opt)}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Duration slots"
              type="number"
              value={actCreateDuration}
              onChange={(e) => setActCreateDuration(e.target.value)}
              fullWidth
              disabled={actCreateLoading}
              slotProps={{ htmlInput: { min: 1 } }}
            />
            <TextField
              label="Required features"
              value={actCreateFeatures}
              onChange={(e) => setActCreateFeatures(e.target.value)}
              fullWidth
              disabled={actCreateLoading}
              helperText="Comma-separated list of room features"
            />
            {actCreateError && <Alert severity="error">{actCreateError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => { if (!actCreateLoading) { setIsActivityCreateOpen(false); setActCreateError(null); } }} disabled={actCreateLoading} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleActivityCreate} variant="contained" disabled={actCreateLoading} sx={{ borderRadius: 2 }}>
            {actCreateLoading ? <CircularProgress size={18} color="inherit" /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Edit activity dialog ── */}
      <Dialog open={!!activityToEdit} onClose={() => { if (!actEditLoading) { setActivityToEdit(null); setActEditError(null); } }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit activity</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <TextField
              label="Course"
              select
              value={actEditCourseId}
              onChange={(e) => setActEditCourseId(e.target.value)}
              fullWidth
              disabled={actEditLoading}
            >
              {coursesState.data.map((c) => (
                <MenuItem key={String(c.id ?? c._id)} value={String(c.id ?? c._id)}>{c.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Group"
              select
              value={actEditGroupId}
              onChange={(e) => setActEditGroupId(e.target.value)}
              fullWidth
              disabled={actEditLoading}
            >
              {groupsState.data.map((g) => (
                <MenuItem key={String(g.id ?? g._id)} value={String(g.id ?? g._id)}>{g.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Professor (optional)"
              select
              value={actEditProfId}
              onChange={(e) => setActEditProfId(e.target.value)}
              fullWidth
              disabled={actEditLoading}
            >
              <MenuItem value="">(None)</MenuItem>
              {usersState.data.map((u) => (
                <MenuItem key={String(u.id ?? u._id)} value={String(u.id ?? u._id)}>{u.name ?? u.email ?? 'Unknown'}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Activity type"
              select
              value={actEditType}
              onChange={(e) => setActEditType(e.target.value)}
              fullWidth
              disabled={actEditLoading}
            >
              {ACTIVITY_TYPE_OPTIONS.map((opt) => (
                <MenuItem key={opt} value={opt}>{toTitleLabel(opt)}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Frequency"
              select
              value={actEditFrequency}
              onChange={(e) => setActEditFrequency(e.target.value)}
              fullWidth
              disabled={actEditLoading}
            >
              {FREQUENCY_OPTIONS.map((opt) => (
                <MenuItem key={opt} value={opt}>{toTitleLabel(opt)}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Duration slots"
              type="number"
              value={actEditDuration}
              onChange={(e) => setActEditDuration(e.target.value)}
              fullWidth
              disabled={actEditLoading}
              slotProps={{ htmlInput: { min: 1 } }}
            />
            <TextField
              label="Required features"
              value={actEditFeatures}
              onChange={(e) => setActEditFeatures(e.target.value)}
              fullWidth
              disabled={actEditLoading}
              helperText="Comma-separated list of room features"
            />
            {actEditError && <Alert severity="error">{actEditError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => { if (!actEditLoading) { setActivityToEdit(null); setActEditError(null); } }} disabled={actEditLoading} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleActivityEdit} variant="contained" disabled={actEditLoading} sx={{ borderRadius: 2 }}>
            {actEditLoading ? <CircularProgress size={18} color="inherit" /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete activity dialog ── */}
      <Dialog open={!!activityToDelete} onClose={() => { if (!actDeleteLoading) { setActivityToDelete(null); setActDeleteError(null); } }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete activity?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this activity? This action cannot be undone.
          </DialogContentText>
          {actDeleteError && <Alert severity="error" sx={{ mt: 2 }}>{actDeleteError}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => { if (!actDeleteLoading) { setActivityToDelete(null); setActDeleteError(null); } }} disabled={actDeleteLoading} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleActivityDelete} color="error" variant="contained" disabled={actDeleteLoading} sx={{ borderRadius: 2 }}>
            {actDeleteLoading ? <CircularProgress size={18} color="inherit" /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!scheduleToDelete} onClose={() => { if (!scheduleDeleteLoading) { setScheduleToDelete(null); setScheduleDeleteError(null); } }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete schedule?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this schedule? This action cannot be undone.
          </DialogContentText>
          {scheduleDeleteError && <Alert severity="error" sx={{ mt: 2 }}>{scheduleDeleteError}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => { if (!scheduleDeleteLoading) { setScheduleToDelete(null); setScheduleDeleteError(null); } }} disabled={scheduleDeleteLoading} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleScheduleDelete} color="error" variant="contained" disabled={scheduleDeleteLoading} sx={{ borderRadius: 2 }}>
            {scheduleDeleteLoading ? <CircularProgress size={18} color="inherit" /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
