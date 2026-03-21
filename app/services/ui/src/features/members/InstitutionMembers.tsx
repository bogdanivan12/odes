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
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import PersonIcon from '@mui/icons-material/Person';
import PageContainer from '../layout/PageContainer';
import EditMemberRolesDialog from '../../components/EditMemberRolesDialog';
import {
  assignRoleToUser,
  getInstitutionUsers,
  removeRoleFromUser,
  type InstitutionRole,
  type InstitutionUser,
} from '../../api/institutions';
import { memberRoute } from '../../config/routes';
import { compareAlphabetical, toTitleLabel } from '../../utils/text';
import { getCurrentUserData, isInstitutionAdmin } from '../../utils/institutionAdmin';

function getRolesForInstitution(user: InstitutionUser, institutionId?: string): InstitutionRole[] {
  if (!institutionId) return [];
  const roles = user.user_roles?.[institutionId] ?? user.user_roles?.[String(institutionId)] ?? [];
  return Array.isArray(roles) ? (roles as InstitutionRole[]) : [];
}

function getMemberId(user: InstitutionUser): string {
  return String(user.id ?? user._id ?? '');
}

export default function InstitutionMembers() {
  const ALL_INSTITUTION_ROLES: InstitutionRole[] = ['admin', 'professor', 'student'];

  const { institutionId } = useParams();
  const navigate = useNavigate();

  const [members, setMembers] = useState<InstitutionUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<InstitutionUser | null>(null);
  const [currentUserLoading, setCurrentUserLoading] = useState(true);
  const [memberToEditRoles, setMemberToEditRoles] = useState<InstitutionUser | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<InstitutionRole[]>([]);
  const [rolesSaving, setRolesSaving] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!institutionId) {
        setError('Missing institution id in route.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const users = await getInstitutionUsers(institutionId);
        if (!mounted) return;
        const sorted = [...users].sort((a, b) => compareAlphabetical(a.name ?? '', b.name ?? ''));
        setMembers(sorted);
      } catch (err) {
        if (!mounted) return;
        setError((err as Error).message || 'Failed to load members.');
      } finally {
        if (mounted) setLoading(false);
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

  const canManageMembers = useMemo(() => isInstitutionAdmin(currentUser, institutionId), [currentUser, institutionId]);

  const handleOpenEditRoles = (member: InstitutionUser) => {
    setRolesError(null);
    setMemberToEditRoles(member);
    setSelectedRoles(getRolesForInstitution(member, institutionId).sort(compareAlphabetical));
  };

  const handleSaveRoles = async () => {
    const editingMember = memberToEditRoles;
    const editingMemberId = editingMember ? getMemberId(editingMember) : '';
    if (!canManageMembers || !institutionId || !editingMember || !editingMemberId) return;
    if (selectedRoles.length === 0) {
      setRolesError('Select at least one role.');
      return;
    }

    const currentRoles = getRolesForInstitution(editingMember, institutionId).sort(compareAlphabetical);
    const nextRoles = Array.from(new Set(selectedRoles));
    const toAdd = nextRoles.filter((role) => !currentRoles.includes(role));
    const toRemove = currentRoles.filter((role) => !nextRoles.includes(role));

    setRolesSaving(true);
    setRolesError(null);
    try {
      await Promise.all([
        ...toAdd.map((role) => assignRoleToUser(institutionId, editingMemberId, role)),
        ...toRemove.map((role) => removeRoleFromUser(institutionId, editingMemberId, role)),
      ]);

      setMembers((prev) => prev.map((member) => {
        const id = getMemberId(member);
        if (id !== editingMemberId) return member;
        return {
          ...member,
          user_roles: {
            ...(member.user_roles ?? {}),
            [institutionId]: nextRoles,
          },
        };
      }));

      setMemberToEditRoles(null);
    } catch (err) {
      setRolesError((err as Error).message || 'Failed to update member roles.');
    } finally {
      setRolesSaving(false);
    }
  };

  const filteredMembers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return members;
    return members.filter((member) => {
      const roles = getRolesForInstitution(member, institutionId).join(' ');
      const haystack = `${member.name ?? ''} ${member.email ?? ''} ${roles}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [members, searchQuery, institutionId]);

  if (loading || currentUserLoading) {
    return (
      <PageContainer alignItems="center">
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={24} />
          <Typography>Loading members...</Typography>
        </Stack>
      </PageContainer>
    );
  }

  return (
    <PageContainer alignItems="flex-start">
      <Box sx={{ width: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, gap: 2, flexWrap: 'wrap' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <PersonIcon color="primary" />
            <Typography variant="h4" sx={{ fontWeight: 700 }}>Members</Typography>
          </Stack>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {!error && (
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, mb: 2 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
              <TextField
                size="small"
                fullWidth
                label="Search members"
                placeholder="Type name, email or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button variant="outlined" onClick={() => setSearchQuery('')}>Reset</Button>
            </Stack>
          </Paper>
        )}

        {!error && members.length === 0 && (
          <Typography color="text.secondary">No members found for this institution.</Typography>
        )}

        {!error && members.length > 0 && filteredMembers.length === 0 && (
          <Typography color="text.secondary">No members match the current search.</Typography>
        )}

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' } }}>
          {filteredMembers.map((member) => {
            const memberId = getMemberId(member);
            const roles = getRolesForInstitution(member, institutionId).sort(compareAlphabetical);
            return (
              <Card key={memberId} variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flex: '1 1 auto' }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <PersonIcon fontSize="small" color="action" />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{member.name ?? 'Unknown user'}</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">{member.email ?? 'No email'}</Typography>
                  <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 1.25 }}>
                    {roles.length > 0
                      ? roles.map((role) => <Chip key={`${memberId}-${role}`} size="small" label={toTitleLabel(role)} variant="outlined" />)
                      : <Chip size="small" label="No role" variant="outlined" />}
                  </Stack>
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Button size="small" onClick={() => navigate(`${memberRoute(memberId)}?institutionId=${institutionId ?? ''}`)}>Open</Button>
                  {canManageMembers && (
                    <Button
                      size="small"
                      onClick={() => handleOpenEditRoles(member)}
                    >
                      Edit roles
                    </Button>
                  )}
                </CardActions>
              </Card>
            );
          })}
        </Box>

        <EditMemberRolesDialog
          open={Boolean(memberToEditRoles) && canManageMembers}
          memberLabel={memberToEditRoles ? `${memberToEditRoles.name ?? 'Unknown user'} (${memberToEditRoles.email ?? 'No email'})` : ''}
          selectedRoles={selectedRoles}
          roleOptions={ALL_INSTITUTION_ROLES}
          loading={rolesSaving}
          error={rolesError}
          onClose={() => setMemberToEditRoles(null)}
          onRolesChange={(roles) => setSelectedRoles(roles)}
          onSubmit={handleSaveRoles}
        />
      </Box>
    </PageContainer>
  );
}

