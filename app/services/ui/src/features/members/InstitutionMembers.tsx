import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Paper from '@mui/material/Paper';
import TablePagination from '@mui/material/TablePagination';
import SearchIcon from '@mui/icons-material/Search';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
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
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

function getRolesForInstitution(user: InstitutionUser, institutionId?: string): InstitutionRole[] {
  if (!institutionId) return [];
  const roles = user.user_roles?.[institutionId] ?? user.user_roles?.[String(institutionId)] ?? [];
  return Array.isArray(roles) ? (roles as InstitutionRole[]) : [];
}

function getMemberId(user: InstitutionUser): string {
  return String(user.id ?? user._id ?? '');
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

export default function InstitutionMembers() {
  const ALL_INSTITUTION_ROLES: InstitutionRole[] = ['admin', 'professor', 'student'];

  const theme = useTheme();
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
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!institutionId) { setError('Missing institution id in route.'); setLoading(false); return; }
      setLoading(true); setError(null);
      try {
        const users = await getInstitutionUsers(institutionId);
        if (!mounted) return;
        setMembers([...users].sort((a, b) => compareAlphabetical(a.name ?? '', b.name ?? '')));
      } catch (err) {
        if (!mounted) return;
        setError((err as Error).message || 'Failed to load members.');
      } finally {
        if (mounted) setLoading(false);
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

  const canManageMembers = useMemo(() => isInstitutionAdmin(currentUser, institutionId), [currentUser, institutionId]);

  const handleOpenEditRoles = (e: React.MouseEvent, member: InstitutionUser) => {
    e.stopPropagation();
    setRolesError(null);
    setMemberToEditRoles(member);
    setSelectedRoles(getRolesForInstitution(member, institutionId).sort(compareAlphabetical));
  };

  const handleSaveRoles = async () => {
    const editingMember = memberToEditRoles;
    const editingMemberId = editingMember ? getMemberId(editingMember) : '';
    if (!canManageMembers || !institutionId || !editingMember || !editingMemberId) return;
    if (selectedRoles.length === 0) { setRolesError('Select at least one role.'); return; }

    const currentRoles = getRolesForInstitution(editingMember, institutionId).sort(compareAlphabetical);
    const nextRoles = Array.from(new Set(selectedRoles));
    const toAdd = nextRoles.filter((role) => !currentRoles.includes(role));
    const toRemove = currentRoles.filter((role) => !nextRoles.includes(role));

    setRolesSaving(true); setRolesError(null);
    try {
      await Promise.all([
        ...toAdd.map((role) => assignRoleToUser(institutionId, editingMemberId, role)),
        ...toRemove.map((role) => removeRoleFromUser(institutionId, editingMemberId, role)),
      ]);
      setMembers((prev) => prev.map((member) => {
        if (getMemberId(member) !== editingMemberId) return member;
        return { ...member, user_roles: { ...(member.user_roles ?? {}), [institutionId]: nextRoles } };
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
      return `${member.name ?? ''} ${member.email ?? ''} ${roles}`.toLowerCase().includes(query);
    });
  }, [members, searchQuery, institutionId]);

  useEffect(() => { setPage(0); }, [filteredMembers]);

  const paginatedMembers = useMemo(
    () => filteredMembers.slice(page * rowsPerPage, (page + 1) * rowsPerPage),
    [filteredMembers, page, rowsPerPage],
  );

  if (loading || currentUserLoading) {
    return (
      <PageContainer alignItems="center">
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={22} />
          <Typography color="text.secondary">Loading members...</Typography>
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
              <Typography variant="h5" sx={{ fontWeight: 700 }}>Members</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {members.length} member{members.length !== 1 ? 's' : ''} in this institution
              </Typography>
            </Box>
          </Box>

          {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}

          {/* Search */}
          {!error && (
            <TextField
              size="small"
              fullWidth
              placeholder="Search by name, email or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              slotProps={{
                input: { startAdornment: <SearchIcon sx={{ fontSize: '1rem', mr: 0.75, color: 'text.disabled' }} /> },
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          )}

          {/* Empty states */}
          {!error && members.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Box sx={{ display: 'inline-flex', p: 2, borderRadius: 4, bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main', mb: 2 }}>
                <GroupRoundedIcon sx={{ fontSize: '2.5rem' }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>No members yet</Typography>
              <Typography variant="body2" color="text.secondary">
                No members have been added to this institution.
              </Typography>
            </Box>
          )}

          {!error && members.length > 0 && filteredMembers.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No members match &ldquo;{searchQuery}&rdquo;.
            </Typography>
          )}

          {/* Member list */}
          {!error && filteredMembers.length > 0 && (
            <Stack spacing={1}>
              {paginatedMembers.map((member) => {
                const memberId = getMemberId(member);
                const roles = getRolesForInstitution(member, institutionId).sort(compareAlphabetical);
                return (
                  <Paper
                    key={memberId}
                    variant="outlined"
                    onClick={() => navigate(`${memberRoute(memberId)}?institutionId=${institutionId ?? ''}`)}
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
                      {/* Avatar */}
                      <Avatar
                        sx={{
                          width: 40, height: 40, borderRadius: 2, flexShrink: 0,
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          color: 'primary.main', fontSize: '0.85rem', fontWeight: 700,
                        }}
                      >
                        {getInitials(member.name)}
                      </Avatar>

                      {/* Name + email */}
                      <Box sx={{ minWidth: 0, flex: '0 1 220px' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {member.name ?? 'Unknown user'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                          {member.email ?? 'No email'}
                        </Typography>
                      </Box>

                      {/* Role chips */}
                      <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ flex: 1 }}>
                        {roles.length > 0
                          ? roles.map((role) => (
                            <Chip
                              key={`${memberId}-${role}`}
                              size="small"
                              label={toTitleLabel(role)}
                              color={roleChipColor(role)}
                              variant="outlined"
                              sx={{ fontSize: '0.7rem', height: 22 }}
                            />
                          ))
                          : <Chip size="small" label="No role" variant="outlined" sx={{ fontSize: '0.7rem', height: 22 }} />}
                      </Stack>

                      {/* Edit roles button */}
                      {canManageMembers && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={(e) => handleOpenEditRoles(e, member)}
                          sx={{ borderRadius: 1.5, fontSize: '0.75rem', flexShrink: 0 }}
                        >
                          Edit roles
                        </Button>
                      )}
                    </Box>
                  </Paper>
                );
              })}
                              <TablePagination
                  component="div"
                  count={filteredMembers.length}
                  page={page}
                  onPageChange={(_, newPage) => setPage(newPage)}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                  rowsPerPageOptions={[5, 10, 25]}
                />

            </Stack>
          )}
        </Stack>
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
    </PageContainer>
  );
}
