import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import TablePagination from '@mui/material/TablePagination';
import SearchIcon from '@mui/icons-material/Search';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import CalendarViewWeekIcon from '@mui/icons-material/CalendarViewWeek';
import TodayIcon from '@mui/icons-material/Today';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { getInstitutions, getInstitutionUsers } from '../../api/institutions';
import { Institution } from '../../types/institution';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../layout/PageContainer';
import { institutionRoute, INSTITUTIONS_CREATE_ROUTE } from '../../config/routes';
import { compareAlphabetical } from '../../utils/text';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

export default function Institutions() {
  const theme = useTheme();
  const [items, setItems] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [usersMap, setUsersMap] = useState<Record<string, { loading: boolean; membersCount?: number }>>({});
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const navigate = useNavigate();

  const handleViewInstitution = (inst: Institution) => {
    try { localStorage.setItem('selectedInstitutionId', String(inst.id)); } catch { /* ignore */ }
    try {
      window.dispatchEvent(new CustomEvent('institutionSelected', { detail: inst }));
      window.dispatchEvent(new Event('institutionsChanged'));
    } catch { /* ignore */ }
    navigate(institutionRoute(inst.id));
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setError(null);
        const inst = await getInstitutions();
        const sorted = [...inst].sort((a, b) => compareAlphabetical(a.name, b.name));
        if (mounted) {
          setItems(sorted);
          const initMap: Record<string, { loading: boolean }> = {};
          sorted.forEach((i) => { initMap[i.id] = { loading: true }; });
          setUsersMap(initMap);
        }
        const promises = sorted.map((i) =>
          getInstitutionUsers(i.id).then((res) => ({ id: i.id, count: res.length })).catch(() => ({ id: i.id, count: 0 })),
        );
        const results = await Promise.all(promises);
        if (mounted) {
          const nextMap: Record<string, { loading: false; membersCount: number }> = {};
          results.forEach((r) => { nextMap[r.id] = { loading: false, membersCount: r.count }; });
          setUsersMap((prev) => ({ ...prev, ...nextMap }));
        }
      } catch (err) {
        if (mounted) setError((err as Error).message || 'Failed to load institutions.');
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

  useEffect(() => { setPage(0); }, [filteredInstitutions]);

  const paginatedInstitutions = useMemo(
    () => filteredInstitutions.slice(page * rowsPerPage, (page + 1) * rowsPerPage),
    [filteredInstitutions, page, rowsPerPage],
  );

  if (loading) {
    return (
      <PageContainer alignItems="center">
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={22} />
          <Typography color="text.secondary">Loading institutions...</Typography>
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
              <Typography variant="h5" sx={{ fontWeight: 700 }}>Institutions</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {items.length} institution{items.length !== 1 ? 's' : ''} available
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={() => navigate(INSTITUTIONS_CREATE_ROUTE)}
              sx={{ borderRadius: 2 }}
            >
              New institution
            </Button>
          </Box>

          {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}

          {/* Search */}
          {!error && (
            <TextField
              size="small"
              fullWidth
              placeholder="Search institutions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              slotProps={{
                input: { startAdornment: <SearchIcon sx={{ fontSize: '1rem', mr: 0.75, color: 'text.disabled' }} /> },
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          )}

          {/* Empty states */}
          {!error && items.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Box sx={{ display: 'inline-flex', p: 2, borderRadius: 4, bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main', mb: 2 }}>
                <AccountBalanceRoundedIcon sx={{ fontSize: '2.5rem' }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>No institutions yet</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Create your first institution to start managing schedules.
              </Typography>
              <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => navigate(INSTITUTIONS_CREATE_ROUTE)} sx={{ borderRadius: 2 }}>
                Create institution
              </Button>
            </Box>
          )}

          {!error && items.length > 0 && filteredInstitutions.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No institutions match &ldquo;{searchQuery}&rdquo;.
            </Typography>
          )}

          {/* Institution list */}
          {!error && filteredInstitutions.length > 0 && (
            <Stack spacing={1}>
              {paginatedInstitutions.map((inst) => {
                const entry = usersMap[inst.id];
                return (
                  <Paper
                    key={inst.id}
                    variant="outlined"
                    onClick={() => handleViewInstitution(inst)}
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
                      <Box sx={{
                        width: 36, height: 36, borderRadius: 2, flexShrink: 0,
                        bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <AccountBalanceRoundedIcon sx={{ fontSize: '1.1rem' }} />
                      </Box>

                      {/* Name */}
                      <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {inst.name}
                      </Typography>

                      {/* Grid config */}
                      <Stack direction="row" spacing={2} sx={{ flexShrink: 0 }}>
                        {[
                          { icon: <CalendarViewWeekIcon sx={{ fontSize: '0.8rem' }} />, label: `${inst.time_grid_config.weeks}w` },
                          { icon: <TodayIcon sx={{ fontSize: '0.8rem' }} />, label: `${inst.time_grid_config.days}d` },
                          { icon: <AccessTimeIcon sx={{ fontSize: '0.8rem' }} />, label: `${inst.time_grid_config.timeslots_per_day} slots` },
                        ].map((item) => (
                          <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                            {item.icon}
                            <Typography variant="caption" sx={{ fontWeight: 500 }}>{item.label}</Typography>
                          </Box>
                        ))}
                      </Stack>

                      {/* Members */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0, minWidth: 80 }}>
                        <GroupRoundedIcon sx={{ fontSize: '0.9rem', color: 'text.disabled' }} />
                        {entry?.loading ? (
                          <CircularProgress size={12} />
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            {entry?.membersCount ?? 0} member{(entry?.membersCount ?? 0) !== 1 ? 's' : ''}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Paper>
                );
              })}
                              <TablePagination
                  component="div"
                  count={filteredInstitutions.length}
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
    </PageContainer>
  );
}
