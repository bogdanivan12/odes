import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import OutlinedInput from '@mui/material/OutlinedInput';
import Select from '@mui/material/Select';
import Chip from '@mui/material/Chip';
import type { SelectChangeEvent } from '@mui/material/Select';
import PageContainer from '../layout/PageContainer';
import { getCurrentUserData, isInstitutionAdmin } from '../../utils/institutionAdmin';
import { assignRoleToUser, removeRoleFromUser, type InstitutionRole, type InstitutionUser } from '../../api/institutions';
import { getUserById } from '../../api/users';
import { memberRoute } from '../../config/routes';
import { compareAlphabetical, toTitleLabel } from '../../utils/text';
import type { User } from '../../types/user';

const AVAILABLE_ROLES: InstitutionRole[] = ['admin', 'professor', 'student'];

function resolveInstitutionId(search: string): string | undefined {
  const params = new URLSearchParams(search);
  return params.get('institutionId') ?? undefined;
}

function getRoles(user: User | null, institutionId?: string): InstitutionRole[] {
  if (!user || !institutionId) return [];
  const roles = user.user_roles?.[institutionId] ?? user.user_roles?.[String(institutionId)] ?? [];
  return Array.isArray(roles) ? (roles as InstitutionRole[]) : [];
}

export default function UpdateMemberRoles() {
  const { memberId } = useParams();
  const { search } = useLocation();
  const navigate = useNavigate();

  const institutionId = useMemo(() => resolveInstitutionId(search), [search]);

  const [member, setMember] = useState<User | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<InstitutionRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<InstitutionUser | null>(null);
  const [currentUserLoading, setCurrentUserLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!memberId) {
        setError('Missing member id in route.');
        setLoading(false);
        return;
      }
      if (!institutionId) {
        setError('Missing institution context.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const user = await getUserById(memberId);
        if (!mounted) return;
        setMember(user);
        setSelectedRoles(getRoles(user, institutionId).sort(compareAlphabetical));
      } catch (err) {
        if (!mounted) return;
        setError((err as Error).message || 'Failed to load member.');
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

  const currentRoles = useMemo(
    () => getRoles(member, institutionId).sort(compareAlphabetical),
    [member, institutionId],
  );

  const handleRolesChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    const next = (typeof value === 'string' ? value.split(',') : value) as InstitutionRole[];
    setSelectedRoles(next.sort(compareAlphabetical));
  };

  const handleSave = async () => {
    if (!memberId || !institutionId || !canEditRoles) return;

    const uniqueSelected = Array.from(new Set(selectedRoles));
    const toAdd = uniqueSelected.filter((role) => !currentRoles.includes(role));
    const toRemove = currentRoles.filter((role) => !uniqueSelected.includes(role));

    setSaving(true);
    setError(null);
    try {
      await Promise.all([
        ...toAdd.map((role) => assignRoleToUser(institutionId, memberId, role)),
        ...toRemove.map((role) => removeRoleFromUser(institutionId, memberId, role)),
      ]);
      navigate(`${memberRoute(memberId)}?institutionId=${institutionId}`);
    } catch (err) {
      setError((err as Error).message || 'Failed to update member roles.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || currentUserLoading) {
    return (
      <PageContainer alignItems="center">
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={24} />
          <Typography>Loading role editor...</Typography>
        </Stack>
      </PageContainer>
    );
  }

  return (
    <PageContainer alignItems="flex-start">
      <Paper variant="outlined" sx={{ width: '100%', p: { xs: 2.5, md: 3 }, borderRadius: 3 }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>Update member roles</Typography>
            <Typography color="text.secondary">{member?.name ?? 'Unknown member'}{member?.email ? ` - ${member.email}` : ''}</Typography>
          </Box>

          {!institutionId && <Alert severity="error">Institution context is missing.</Alert>}
          {institutionId && !canEditRoles && <Alert severity="warning">Only institution admins can edit member roles.</Alert>}
          {error && <Alert severity="error">{error}</Alert>}

          <FormControl fullWidth disabled={!institutionId || !canEditRoles || saving}>
            <InputLabel id="member-roles-label">Roles</InputLabel>
            <Select
              labelId="member-roles-label"
              multiple
              value={selectedRoles}
              onChange={handleRolesChange}
              input={<OutlinedInput label="Roles" />}
              renderValue={(selected) => (
                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                  {(selected as string[]).map((role) => (
                    <Chip key={role} size="small" label={toTitleLabel(role)} variant="outlined" />
                  ))}
                </Stack>
              )}
            >
              {AVAILABLE_ROLES.map((role) => (
                <MenuItem key={role} value={role}>
                  <Checkbox checked={selectedRoles.includes(role)} />
                  {toTitleLabel(role)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button
              variant="outlined"
              onClick={() => navigate(`${memberRoute(memberId ?? '')}?institutionId=${institutionId ?? ''}`)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSave} disabled={saving || !institutionId || !canEditRoles}>
              {saving ? <CircularProgress size={18} color="inherit" /> : 'Save'}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </PageContainer>
  );
}

