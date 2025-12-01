import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import { getInstitutions, getInstitutionUsers } from '../../api/institutions';
import { Institution } from '../../types/institution';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../layout/PageContainer';

export default function Institutions() {
  const [items, setItems] = useState<Institution[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [usersMap, setUsersMap] = useState<Record<string, { loading: boolean; membersCount?: number; admins?: string[] }>>({});
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const inst = await getInstitutions();
        if (mounted) setItems(inst);
        // initialize users map for loading state
        if (mounted) {
          const initMap: Record<string, { loading: boolean }> = {};
          inst.forEach(i => { initMap[i.id] = { loading: true }; });
          setUsersMap(initMap);
        }
        // fetch users for all institutions in parallel
        try {
          const promises = inst.map(i => getInstitutionUsers(i.id).then(res => ({ id: i.id, res })).catch(err => ({ id: i.id, err })));
          const results = await Promise.all(promises);
          const nextMap: Record<string, { loading: false; membersCount?: number; admins?: string[] }> = {};
          results.forEach(r => {
            if ('err' in r) {
              nextMap[r.id] = { loading: false, membersCount: 0, admins: [] };
            } else {
              const data = r.res;
              // normalize: data may be array of users or { users: [...] }
              const users = Array.isArray(data) ? data : (Array.isArray(data?.users) ? data.users : []);
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
              }).map((u: any) => (u.name ?? u.username ?? u.email ?? '—'));
              nextMap[r.id] = { loading: false, membersCount, admins };
            }
          });
          if (mounted) setUsersMap(prev => ({ ...prev, ...nextMap }));
        } catch (err) {
          console.error('Failed fetching institution users', err);
        }
      } catch (err) {
        console.error('Failed to load institutions', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, []);

  return (
    <PageContainer alignItems="flex-start">
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>Institutions</Typography>

      {loading && <Typography>Loading institutions...</Typography>}

      {!loading && items.length === 0 && (
        <Typography color="text.secondary">No institutions found.</Typography>
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
        {items.map(inst => {
          const entry = usersMap[inst.id];
          const admins = entry?.admins;
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
                      <Typography variant="body2" color="text.secondary">
                        Admins: {admins && admins.length > 0 ? admins.join(', ') : '—'}
                      </Typography>
                    </>
                  )}

                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Button size="small" onClick={() => navigate(`/institutions/${inst.id}`)}>View</Button>
                  <Typography variant="caption" color="text.secondary">ID: {inst.id}</Typography>
                </CardActions>
              </Card>
            </Box>
          );
        })}
      </Box>
    </PageContainer>
  );
}
