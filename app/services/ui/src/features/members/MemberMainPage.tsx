import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import PersonIcon from '@mui/icons-material/Person';
import EventNoteIcon from '@mui/icons-material/EventNote';
import LabelIcon from '@mui/icons-material/Label';
import PageContainer from '../layout/PageContainer';
import EntityStatCard from '../../components/EntityStatCard';
import EditMemberRolesDialog from '../../components/EditMemberRolesDialog';
import { getCurrentUserData, isInstitutionAdmin } from '../../utils/institutionAdmin';
import { activityRoute, institutionRoute } from '../../config/routes';
import { compareAlphabetical, toTitleLabel } from '../../utils/text';
import { clickableEntitySx } from '../../utils/clickableEntity';
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

function resolveInstitutionId(search: string): string | undefined {
  const params = new URLSearchParams(search);
  return params.get('institutionId') ?? undefined;
}

function getSelectedInstitutionIdFromStorage(): string | undefined {
  try {
    const value = localStorage.getItem('selectedInstitutionId');
    return value ? String(value) : undefined;
  } catch {
    return undefined;
  }
}

function getMemberRolesForInstitution(user: User | null, institutionId?: string): InstitutionRole[] {
  if (!user || !institutionId) return [];
  const roles = user.user_roles?.[institutionId] ?? user.user_roles?.[String(institutionId)] ?? [];
  return Array.isArray(roles) ? (roles as InstitutionRole[]) : [];
}

export default function MemberMainPage() {
  const ALL_INSTITUTION_ROLES: InstitutionRole[] = ['admin', 'professor', 'student'];

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
      if (!memberId) {
        setError('Missing member id in route.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const [userData, myInstitutions] = await Promise.all([
          getUserById(memberId),
          getInstitutions(),
        ]);

        let profActivities: Activity[] = [];
        try {
          // Profile remains accessible for non-professors even if activities endpoint denies access.
          profActivities = await getProfessorActivities(memberId);
        } catch {
          profActivities = [];
        }

        const scopedActivities = institutionId
          ? profActivities.filter((activity) => String(activity.institution_id) === String(institutionId))
          : profActivities;

        const institutionIdsToLoad = institutionId
          ? [institutionId]
          : Array.from(new Set(scopedActivities.map((activity) => String(activity.institution_id)).filter(Boolean)));

        let institutionCourses: InstitutionCourse[] = [];
        let institutionGroups: InstitutionGroup[] = [];
        if (institutionIdsToLoad.length > 0) {
          const relatedData = await Promise.allSettled(
            institutionIdsToLoad.map(async (instId) => {
              const [instCourses, instGroups] = await Promise.all([
                getInstitutionCourses(instId),
                getInstitutionGroups(instId),
              ]);
              return { instCourses, instGroups };
            }),
          );

          institutionCourses = relatedData
            .filter((result): result is PromiseFulfilledResult<{ instCourses: InstitutionCourse[]; instGroups: InstitutionGroup[] }> => result.status === 'fulfilled')
            .flatMap((result) => result.value.instCourses);

          institutionGroups = relatedData
            .filter((result): result is PromiseFulfilledResult<{ instCourses: InstitutionCourse[]; instGroups: InstitutionGroup[] }> => result.status === 'fulfilled')
            .flatMap((result) => result.value.instGroups);
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

    return () => {
      mounted = false;
    };
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

    return () => {
      mounted = false;
    };
  }, []);

  const canEditRoles = useMemo(() => isInstitutionAdmin(currentUser, institutionId), [currentUser, institutionId]);

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
    if (selectedRoles.length === 0) {
      setRolesError('Select at least one role.');
      return;
    }

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
        return {
          ...prev,
          user_roles: {
            ...(prev.user_roles ?? {}),
            [institutionId]: nextRoles,
          },
        };
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
    courses.forEach((course) => {
      const id = String(course.id ?? course._id ?? '');
      if (id) map.set(id, course.name);
    });
    return map;
  }, [courses]);

  const groupsById = useMemo(() => {
    const map = new Map<string, string>();
    groups.forEach((group) => {
      const id = String(group.id ?? group._id ?? '');
      if (id) map.set(id, group.name);
    });
    return map;
  }, [groups]);

  const sortedActivities = useMemo(() => {
    return [...activities].sort((a, b) => {
      const aCourse = coursesById.get(String(a.course_id)) ?? 'Unknown course';
      const bCourse = coursesById.get(String(b.course_id)) ?? 'Unknown course';
      const byCourse = compareAlphabetical(aCourse, bCourse);
      if (byCourse !== 0) return byCourse;

      const byType = compareAlphabetical(toTitleLabel(a.activity_type), toTitleLabel(b.activity_type));
      if (byType !== 0) return byType;

      const byFrequency = compareAlphabetical(toTitleLabel(a.frequency), toTitleLabel(b.frequency));
      if (byFrequency !== 0) return byFrequency;

      const aGroup = groupsById.get(String(a.group_id)) ?? 'Unknown group';
      const bGroup = groupsById.get(String(b.group_id)) ?? 'Unknown group';
      return compareAlphabetical(aGroup, bGroup);
    });
  }, [activities, coursesById, groupsById]);

  if (loading || currentUserLoading) {
    return (
      <PageContainer alignItems="center">
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={24} />
          <Typography>Loading member...</Typography>
        </Stack>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer alignItems="flex-start">
        <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>
      </PageContainer>
    );
  }

  if (!member) {
    return (
      <PageContainer alignItems="flex-start">
        <Alert severity="warning" sx={{ width: '100%' }}>Member data is unavailable.</Alert>
      </PageContainer>
    );
  }

  const hasInstitutionContext = Boolean(institutionId);
  const rolesEntries = Object.entries(member.user_roles ?? {}).sort(([a], [b]) => compareAlphabetical(a, b));

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
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>{member.name}</Typography>
              <Typography variant="body1" color="text.secondary">{member.email}</Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              {canEditRoles && (
                <Button variant="outlined" onClick={handleOpenRolesDialog}>
                  Edit roles
                </Button>
              )}
            </Stack>
          </Box>

          <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap" sx={{ mt: 1.5 }}>
            {hasInstitutionContext ? (
              rolesForCurrentInstitution.length > 0
                ? rolesForCurrentInstitution.map((role) => (
                  <Chip key={role} label={toTitleLabel(role)} size="small" variant="outlined" />
                ))
                : <Chip label="No role in selected institution" size="small" variant="outlined" />
            ) : (
              <Chip label="Select an institution context for role editing" size="small" variant="outlined" />
            )}
          </Stack>
        </Paper>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <EntityStatCard icon={<PersonIcon fontSize="small" />} label="Institutions" value={rolesEntries.length} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <EntityStatCard icon={<LabelIcon fontSize="small" />} label="Roles (current institution)" value={rolesForCurrentInstitution.length} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <EntityStatCard icon={<EventNoteIcon fontSize="small" />} label="Activities" value={activities.length} />
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.25 }}>Roles by institution</Typography>
              {rolesEntries.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No institution roles assigned.</Typography>
              ) : (
                <Stack spacing={1}>
                  {rolesEntries.map(([instId, roles]) => (
                    <Box key={instId} sx={{ p: 1.25, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                      <Typography
                        variant="body2"
                        sx={{ ...clickableEntitySx, display: 'inline-flex', fontWeight: 700, px: 0, py: 0 }}
                        onClick={() => navigate(institutionRoute(instId))}
                      >
                        {institutionNamesById.get(instId) ?? 'Institution'}
                      </Typography>
                      <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 0.8 }}>
                        {(roles ?? []).length > 0
                          ? roles.map((role) => <Chip key={`${instId}-${role}`} size="small" label={toTitleLabel(role)} variant="outlined" />)
                          : <Chip size="small" label="No role" variant="outlined" />}
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 7 }}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.25 }}>Activities</Typography>
              {activities.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No activities assigned to this member.</Typography>
              ) : (
                <Stack
                  spacing={1}
                  sx={{
                    maxHeight: 360,
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
                  {sortedActivities.map((activity) => {
                    const id = String(activity.id ?? '').trim();
                    const canOpen = Boolean(id);
                    const courseName = coursesById.get(String(activity.course_id)) ?? 'Unknown course';
                    const groupName = groupsById.get(String(activity.group_id)) ?? 'Unknown group';
                    const institutionName = institutionNamesById.get(String(activity.institution_id)) ?? 'Institution';
                    return (
                      <Box key={id} sx={{ p: 1.2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            cursor: canOpen ? 'pointer' : 'default',
                            '&:hover': canOpen ? { textDecoration: 'underline' } : undefined,
                          }}
                          onClick={() => canOpen && navigate(activityRoute(id))}
                        >
                          {`${courseName} ${toTitleLabel(activity.activity_type)} (${toTitleLabel(activity.frequency)})`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {institutionId ? groupName : `${groupName} · ${institutionName}`}
                        </Typography>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Stack>

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




