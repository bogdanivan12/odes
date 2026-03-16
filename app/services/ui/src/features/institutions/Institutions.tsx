import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { getInstitutions, getInstitutionUsers } from '../../api/institutions';
import { Institution } from '../../types/institution';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../layout/PageContainer';
import { institutionRoute, INSTITUTIONS_CREATE_ROUTE } from '../../config/routes';
import { compareAlphabetical } from '../../utils/text';

export default function Institutions() {
  const [items, setItems] = useState<Institution[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [usersMap, setUsersMap] = useState<Record<string, { loading: boolean; membersCount?: number; admins?: string[] }>>({});
  const navigate = useNavigate();

  const handleViewInstitution = (inst: Institution) => {
    try {
      localStorage.setItem('selectedInstitutionId', String(inst.id));
    } catch (e) {
      // Ignore local storage errors and still navigate.
    }
    try {
      window.dispatchEvent(new CustomEvent('institutionSelected', { detail: inst }));
      window.dispatchEvent(new Event('institutionsChanged'));
    } catch (e) {
      // Ignore cross-window/custom event errors and still navigate.
    }
    navigate(institutionRoute(inst.id));
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setError(null);
        const inst = await getInstitutions();
        const sortedInstitutions = [...inst].sort((a, b) => compareAlphabetical(a.name, b.name));
        if (mounted) setItems(sortedInstitutions);
        // initialize users map for loading state
        if (mounted) {
          const initMap: Record<string, { loading: boolean }> = {};
          sortedInstitutions.forEach(i => { initMap[i.id] = { loading: true }; });
          setUsersMap(initMap);
        }
        // fetch users for all institutions in parallel
        try {
          const promises = sortedInstitutions.map(i => getInstitutionUsers(i.id).then(res => ({ id: i.id, res })).catch(err => ({ id: i.id, err })));
          const results = await Promise.all(promises);
          const nextMap: Record<string, { loading: false; membersCount?: number; admins?: string[] }> = {};
          results.forEach(r => {
            if ('err' in r) {
              nextMap[r.id] = { loading: false, membersCount: 0, admins: [] };
            } else {
              const users = r.res;
              const membersCount = users.length;
              const admins = users.filter((u: any) => {
                let isAdmin = false;
                // 1) primary check: user_roles may be an object mapping institutionId -> [roles]
                try {
                  if (u.user_roles && typeof u.user_roles === 'object') {
                    // support numeric or string keys
                    const rolesForInst = u.user_roles[r.id] ?? u.user_roles[String(r.id)];
                    if (Array.isArray(rolesForInst) && rolesForInst.includes('admin')) {
                      isAdmin = true;
                    }
                  }
                } catch (e) {
                  // ignore and try other checks
                }

                // 2) fallback checks for older schemas (kept for compatibility)
                if (!isAdmin) {
                  if (u.role && (u.role === 'admin' || u.role === 'owner')) isAdmin = true;
                  else isAdmin = !!(u.is_admin || u.is_superuser);
                }

                return isAdmin;
              }).map((u: any) => (u.name ?? u.username ?? u.email ?? '—')).sort(compareAlphabetical);
              nextMap[r.id] = { loading: false, membersCount, admins };
            }
          });
          if (mounted) setUsersMap(prev => ({ ...prev, ...nextMap }));
        } catch (err) {
          console.error('Failed fetching institution users', err);
        }
      } catch (err) {
        setError((err as Error).message || 'Failed to load institutions.');
        console.error('Failed to load institutions', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, []);

  const filteredInstitutions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((inst) => (inst.name ?? '').toLowerCase().includes(q));
  }, [items, searchQuery]);

  if (loading) {
    return (
      <PageContainer alignItems="center">
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={24} />
          <Typography>Loading institutions...</Typography>
        </Stack>
      </PageContainer>
    );
  }

  return (
    <PageContainer alignItems="flex-start">
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Institutions</Typography>
        <Button variant="contained" onClick={() => navigate(INSTITUTIONS_CREATE_ROUTE)}>
          Create institution
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!error && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, mb: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
            <TextField
              size="small"
              fullWidth
              label="Search institutions"
              placeholder="Type institution name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button variant="outlined" onClick={() => setSearchQuery('')}>Reset</Button>
          </Stack>
        </Paper>
      )}

      {!error && items.length === 0 && (
        <Typography color="text.secondary">No institutions found.</Typography>
      )}

      {!error && items.length > 0 && filteredInstitutions.length === 0 && (
        <Typography color="text.secondary">No institutions match the current search/filter.</Typography>
      )}

      <Box sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: {
          xs: '1fr',
          sm: '1fr',
          md: 'repeat(2, 1fr)',
          lg: 'repeat(3, 1fr)'
        }
      }}>
        {filteredInstitutions.map(inst => {
          const entry = usersMap[inst.id];
          return (
            <Box key={inst.id}>
              <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flex: '1 1 auto' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{inst.name}</Typography>

                  <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                    <Chip label={`Weeks: ${inst.time_grid_config.weeks}`} size="small" />
                    <Chip label={`Days: ${inst.time_grid_config.days}`} size="small" />
                    <Chip label={`Slots/day: ${inst.time_grid_config.timeslots_per_day}`} size="small" />
                  </Stack>

                  {/* Members and admins fetched from API */}
                  {entry?.loading ? (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Loading members...</Typography>
                  ) : (
                    <>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        Members: {entry?.membersCount ?? '—'}
                      </Typography>
                    </>
                  )}

                </CardContent>
                <CardActions sx={{ px: 2, pb: 2 }}>
                  <Button size="small" onClick={() => handleViewInstitution(inst)}>Open</Button>
                </CardActions>
              </Card>
            </Box>
          );
        })}
      </Box>
    </PageContainer>
  );
}
