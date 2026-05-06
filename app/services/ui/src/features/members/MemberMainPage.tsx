import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import EventNoteRoundedIcon from '@mui/icons-material/EventNoteRounded';
import LabelRoundedIcon from '@mui/icons-material/LabelRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import PageContainer from '../layout/PageContainer';
import EntityStatCard from '../../components/EntityStatCard';
import EditMemberRolesDialog from '../../components/EditMemberRolesDialog';
import { getCurrentUserData, isInstitutionAdmin } from '../../utils/institutionAdmin';
import { activityRoute, institutionRoute, INSTITUTION_MEMBERS_ROUTE } from '../../config/routes';
import { compareAlphabetical, toTitleLabel } from '../../utils/text';
import { getUserById, getProfessorActivities } from '../../api/users';
import {
  assignRoleToUser,
  getInstitutionCourses,
  getInstitutionGroups,
  getInstitutions,
  removeRoleFromUser,
  type InstitutionCourse,
  type InstitutionGroup,
  type InstitutionRole,
  type InstitutionUser,
} from '../../api/institutions';
import type { User } from '../../types/user';
import type { Activity } from '../../types/activity';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

function resolveInstitutionId(search: string): string | undefined {
  return new URLSearchParams(search).get('institutionId') ?? undefined;
}

function getSelectedInstitutionIdFromStorage(): string | undefined {
  try { return localStorage.getItem('selectedInstitutionId') ?? undefined; } catch { return undefined; }
}

function getMemberRolesForInstitution(user: User | null, institutionId?: string): InstitutionRole[] {
  if (!user || !institutionId) return [];
  const roles = user.user_roles?.[institutionId] ?? user.user_roles?.[String(institutionId)] ?? [];
  return Array.isArray(roles) ? (roles as InstitutionRole[]) : [];
}

function getInitials(name?: string): string {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

function roleChipColor(role: string): 'primary' | 'warning' | 'success' | 'default' {
  if (role === 'admin') return 'primary';
  if (role === 'professor') return 'warning';
  if (role === 'student') return 'success';
  return 'default';
}

export default function MemberMainPage() {
  const ALL_INSTITUTION_ROLES: InstitutionRole[] = ['admin', 'professor', 'student'];

  const theme = useTheme();
  const { memberId } = useParams();
  const { search } = useLocation();
  const navigate = useNavigate();

  const institutionId = useMemo(() => resolveInstitutionId(search) ?? getSelectedInstitutionIdFromStorage(), [search]);

  const [member, setMember] = useState<User | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [courses, setCourses] = useState<InstitutionCourse[]>([]);
  const [groups, setGroups] = useState<InstitutionGroup[]>([]);
  const [institutionNamesById, setInstitutionNamesById] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<InstitutionUser | null>(null);
  const [currentUserLoading, setCurrentUserLoading] = useState(true);
  const [isRolesDialogOpen, setIsRolesDialogOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<InstitutionRole[]>([]);
  const [rolesSaving, setRolesSaving] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!memberId) { setError('Missing member id in route.'); setLoading(false); return; }
      setLoading(true);
      setError(null);
      try {
        const [userData, myInstitutions] = await Promise.all([getUserById(memberId), getInstitutions()]);

        let profActivities: Activity[] = [];
        try { profActivities = await getProfessorActivities(memberId); } catch { profActivities = []; }

        const scopedActivities = institutionId
          ? profActivities.filter((a) => String(a.institution_id) === String(institutionId))
          : profActivities;

        const institutionIdsToLoad = institutionId
          ? [institutionId]
          : Array.from(new Set(scopedActivities.map((a) => String(a.institution_id)).filter(Boolean)));

        let institutionCourses: InstitutionCourse[] = [];
        let institutionGroups: InstitutionGroup[] = [];
        if (institutionIdsToLoad.length > 0) {
          const relatedData = await Promise.allSettled(
            institutionIdsToLoad.map(async (instId) => {
              const [instCourses, instGroups] = await Promise.all([getInstitutionCourses(instId), getInstitutionGroups(instId)]);
              return { instCourses, instGroups };
            }),
          );
          type Fulfilled = PromiseFulfilledResult<{ instCourses: InstitutionCourse[]; instGroups: InstitutionGroup[] }>;
          institutionCourses = relatedData.filter((r): r is Fulfilled => r.status === 'fulfilled').flatMap((r) => r.value.instCourses);
          institutionGroups = relatedData.filter((r): r is Fulfilled => r.status === 'fulfilled').flatMap((r) => r.value.instGroups);
        }

        if (!mounted) return;
        setMember(userData);
        setInstitutionNamesById(new Map(myInstitutions.map((inst) => [String(inst.id), inst.name])));
        setActivities(scopedActivities);
        setCourses(institutionCourses);
        setGroups(institutionGroups);
      } catch (err) {
        if (!mounted) return;
        setError((err as Error).message || 'Failed to load member page.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [memberId, institutionId]);

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

  const canEditRoles = useMemo(() => isInstitutionAdmin(currentUser, institutionId), [currentUser, institutionId]);
  const hasInstitutionContext = Boolean(institutionId);

  const rolesForCurrentInstitution = useMemo(
    () => getMemberRolesForInstitution(member, institutionId).sort(compareAlphabetical),
    [member, institutionId],
  );

  const handleOpenRolesDialog = () => {
    setRolesError(null);
    setSelectedRoles([...rolesForCurrentInstitution]);
    setIsRolesDialogOpen(true);
  };

  const handleSaveRoles = async () => {
    if (!memberId || !institutionId || !canEditRoles) return;
    if (selectedRoles.length === 0) { setRolesError('Select at least one role.'); return; }

    const nextRoles = Array.from(new Set(selectedRoles));
    const toAdd = nextRoles.filter((role) => !rolesForCurrentInstitution.includes(role));
    const toRemove = rolesForCurrentInstitution.filter((role) => !nextRoles.includes(role));

    setRolesSaving(true);
    setRolesError(null);
    try {
      await Promise.all([
        ...toAdd.map((role) => assignRoleToUser(institutionId, memberId, role)),
        ...toRemove.map((role) => removeRoleFromUser(institutionId, memberId, role)),
      ]);
      setMember((prev) => {
        if (!prev || !institutionId) return prev;
        return { ...prev, user_roles: { ...(prev.user_roles ?? {}), [institutionId]: nextRoles } };
      });
      setIsRolesDialogOpen(false);
    } catch (err) {
      setRolesError((err as Error).message || 'Failed to update member roles.');
    } finally {
      setRolesSaving(false);
    }
  };

  const coursesById = useMemo(() => {
    const map = new Map<string, string>();
    courses.forEach((c) => { const id = String(c.id ?? c._id ?? ''); if (id) map.set(id, c.name); });
    return map;
  }, [courses]);

  const groupsById = useMemo(() => {
    const map = new Map<string, string>();
    groups.forEach((g) => { const id = String(g.id ?? g._id ?? ''); if (id) map.set(id, g.name); });
    return map;
  }, [groups]);

  const sortedActivities = useMemo(() => [...activities].sort((a, b) => {
    const aCourse = coursesById.get(String(a.course_id)) ?? '';
    const bCourse = coursesById.get(String(b.course_id)) ?? '';
    const byCourse = compareAlphabetical(aCourse, bCourse);
    if (byCourse !== 0) return byCourse;
    const byType = compareAlphabetical(toTitleLabel(a.activity_type), toTitleLabel(b.activity_type));
    if (byType !== 0) return byType;
    return compareAlphabetical(
      groupsById.get(String(a.group_id)) ?? '',
      groupsById.get(String(b.group_id)) ?? '',
    );
  }), [activities, coursesById, groupsById]);

  const rolesEntries = useMemo(
    () => Object.entries(member?.user_roles ?? {}).sort(([a], [b]) => compareAlphabetical(a, b)),
    [member],
  );

  const backRoute = institutionId
    ? INSTITUTION_MEMBERS_ROUTE.replace(':institutionId', institutionId)
    : '/institutions';

  if (loading || currentUserLoading) {
    return (
      <PageContainer alignItems="center">
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={22} />
          <Typography color="text.secondary">Loading member...</Typography>
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

  if (!member) {
    return (
      <PageContainer alignItems="flex-start">
        <Alert severity="warning" sx={{ width: '100%', borderRadius: 2 }}>Member data is unavailable.</Alert>
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
          Members
        </Button>

        <Stack spacing={3}>
          {/* Header card */}
          <Paper
            variant="outlined"
            sx={{ borderRadius: 4, overflow: 'hidden', boxShadow: `0 4px 24px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.3 : 0.06)}` }}
          >
            <Box sx={{ height: 3, background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})` }} />
            <Box sx={{ p: { xs: 3, md: 4 } }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar
                    sx={{
                      width: 56, height: 56, borderRadius: 3,
                      bgcolor: alpha(theme.palette.primary.main, 0.12),
                      color: 'primary.main',
                      fontSize: '1.25rem',
                      fontWeight: 700,
                    }}
                  >
                    {getInitials(member.name)}
                  </Avatar>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2 }}>{member.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{member.email}</Typography>
                  </Box>
                </Box>
                {canEditRoles && hasInstitutionContext && (
                  <Button
                    variant="outlined"
                    startIcon={<EditRoundedIcon />}
                    onClick={handleOpenRolesDialog}
                    sx={{ borderRadius: 2 }}
                  >
                    Edit roles
                  </Button>
                )}
              </Box>

              {/* Role chips */}
              <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 2 }}>
                {hasInstitutionContext ? (
                  rolesForCurrentInstitution.length > 0
                    ? rolesForCurrentInstitution.map((role) => (
                      <Chip key={role} label={toTitleLabel(role)} size="small" color={roleChipColor(role)} sx={{ fontWeight: 600 }} />
                    ))
                    : <Chip label="No role in this institution" size="small" variant="outlined" />
                ) : (
                  <Chip label="No institution context" size="small" variant="outlined" />
                )}
              </Stack>
            </Box>
          </Paper>

          {/* Stat cards */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <EntityStatCard icon={<PersonRoundedIcon fontSize="small" />} label="Institutions" value={rolesEntries.length} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <EntityStatCard icon={<LabelRoundedIcon fontSize="small" />} label="Roles (this institution)" value={rolesForCurrentInstitution.length} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <EntityStatCard icon={<EventNoteRoundedIcon fontSize="small" />} label="Activities" value={activities.length} />
            </Grid>
          </Grid>

          {/* Section divider */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="overline" color="text.disabled" sx={{ fontWeight: 700, letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
              Details
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>

          {/* Roles + Activities */}
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, md: 5 }}>
              <Paper
                variant="outlined"
                sx={{ borderRadius: 3, overflow: 'hidden', height: '100%' }}
              >
                <Box sx={{ height: 3, background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})` }} />
                <Box sx={{ p: 2.5 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>Roles by institution</Typography>
                  {rolesEntries.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                      <LabelRoundedIcon sx={{ fontSize: '2rem', color: 'text.disabled', mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">No institution roles assigned.</Typography>
                    </Box>
                  ) : (
                    <Stack spacing={1}>
                      {rolesEntries.map(([instId, roles]) => (
                        <Box
                          key={instId}
                          sx={{
                            p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider',
                            transition: 'border-color 150ms ease',
                            '&:hover': { borderColor: 'primary.main' },
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 700, cursor: 'pointer', color: 'primary.main', mb: 0.75 }}
                            onClick={() => navigate(institutionRoute(instId))}
                          >
                            {institutionNamesById.get(instId) ?? 'Institution'}
                          </Typography>
                          <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                            {(roles ?? []).length > 0
                              ? (roles as InstitutionRole[]).map((role) => (
                                <Chip key={`${instId}-${role}`} size="small" label={toTitleLabel(role)} color={roleChipColor(role)} variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />
                              ))
                              : <Chip size="small" label="No role" variant="outlined" />}
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Box>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 7 }}>
              <Paper
                variant="outlined"
                sx={{ borderRadius: 3, overflow: 'hidden', height: '100%' }}
              >
                <Box sx={{ height: 3, background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})` }} />
                <Box sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Activities</Typography>
                    <Typography variant="caption" color="text.secondary">{activities.length} total</Typography>
                  </Box>
                  {sortedActivities.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                      <EventNoteRoundedIcon sx={{ fontSize: '2rem', color: 'text.disabled', mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">No activities assigned to this member.</Typography>
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
                        const id = String(activity.id ?? '').trim();
                        const canOpen = Boolean(id);
                        const courseName = coursesById.get(String(activity.course_id)) ?? 'Unknown course';
                        const groupName = groupsById.get(String(activity.group_id)) ?? 'Unknown group';
                        const institutionName = institutionNamesById.get(String(activity.institution_id)) ?? 'Institution';
                        return (
                          <Box
                            key={id}
                            onClick={() => canOpen && navigate(activityRoute(id))}
                            sx={{
                              p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider',
                              cursor: canOpen ? 'pointer' : 'default',
                              transition: 'border-color 150ms ease, background 150ms ease',
                              '&:hover': canOpen ? { borderColor: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.04) } : undefined,
                            }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                              {`${courseName} ${toTitleLabel(activity.activity_type)}`}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {toTitleLabel(activity.frequency)} · {institutionId ? groupName : `${groupName} · ${institutionName}`}
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
        </Stack>
      </Box>

      <EditMemberRolesDialog
        open={isRolesDialogOpen && canEditRoles && hasInstitutionContext}
        memberLabel={`${member.name ?? 'Unknown user'} (${member.email ?? 'No email'})`}
        selectedRoles={selectedRoles}
        roleOptions={ALL_INSTITUTION_ROLES}
        loading={rolesSaving}
        error={rolesError}
        onClose={() => setIsRolesDialogOpen(false)}
        onRolesChange={(roles) => setSelectedRoles(roles)}
        onSubmit={handleSaveRoles}
      />
    </PageContainer>
  );
}
