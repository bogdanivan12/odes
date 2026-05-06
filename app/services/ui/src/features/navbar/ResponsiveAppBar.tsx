import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import Container from '@mui/material/Container';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import MenuIcon from '@mui/icons-material/Menu';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import AccountCircleRoundedIcon from '@mui/icons-material/AccountCircleRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { institutionRoute, PROFILE_ROUTE, USER_LOGIN_ROUTE } from '../../config/routes';
import { getInstitutions } from '../../api/institutions';
import TextField from '@mui/material/TextField';
import Divider from '@mui/material/Divider';
import SearchIcon from '@mui/icons-material/Search';
import { Institution as InstitutionClass } from '../../types/institution';
import Popper from '@mui/material/Popper';
import Paper from '@mui/material/Paper';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Grow from '@mui/material/Grow';
import Collapse from '@mui/material/Collapse';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ListItemIcon from '@mui/material/ListItemIcon';
import { compareAlphabetical } from '../../utils/text';
import { ColorModeContext } from '../../context/ColorModeContext';
import { alpha, useTheme } from '@mui/material/styles';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CircularProgress from '@mui/material/CircularProgress';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { INSTITUTIONS_ROUTE, INSTITUTIONS_CREATE_ROUTE } from '../../config/routes';

type Institution = InstitutionClass;

const NAV_PAGES = [
  { key: '', label: 'Overview' },
  { key: 'members', label: 'Members' },
  { key: 'groups', label: 'Groups' },
  { key: 'courses', label: 'Courses' },
  { key: 'rooms', label: 'Rooms' },
  { key: 'activities', label: 'Activities' },
  { key: 'schedules', label: 'Schedules' },
] as const;

export default function ResponsiveAppBar() {
  const theme = useTheme();
  const { mode, toggleColorMode } = React.useContext(ColorModeContext);
  const location = useLocation();

  const [anchorElNav, setAnchorElNav] = React.useState<null | HTMLElement>(null);
  const [anchorElUser, setAnchorElUser] = React.useState<null | HTMLElement>(null);
  const [anchorElInstitutions, setAnchorElInstitutions] = React.useState<null | HTMLElement>(null);
  const mobileSearchRef = React.useRef<HTMLInputElement | null>(null);
  const desktopSearchRef = React.useRef<HTMLInputElement | null>(null);
  const [institutions, setInstitutions] = React.useState<Institution[]>([]);
  const [institutionsLoading, setInstitutionsLoading] = React.useState(false);
  const [institutionsError, setInstitutionsError] = React.useState<string | null>(null);
  const [selectedInstitution, setSelectedInstitution] = React.useState<Institution | null>(null);
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const navigate = useNavigate();
  const [mobileSelectInstOpen, setMobileSelectInstOpen] = React.useState(false);

  const activePageKey = React.useMemo(() => {
    if (!selectedInstitution) return null;
    const segments = location.pathname.split('/').filter(Boolean);
    if (segments[0] === 'institutions' && String(segments[1]) === String(selectedInstitution.id)) {
      return segments[2] ?? '';
    }
    return null;
  }, [location.pathname, selectedInstitution]);

  const handleOpenNavMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElNav(event.currentTarget);
  };
  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget);
  };
  const handleOpenInstitutionsMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElInstitutions(event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
    setMobileSelectInstOpen(false);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };
  const handleCloseInstitutionsMenu = () => {
    setAnchorElInstitutions(null);
    setSearchQuery('');
  };

  const handleLogout = () => {
    try { localStorage.removeItem('authToken'); } catch (e) { /* ignore */ }
    setSelectedInstitution(null);
    setInstitutions([]);
    setSearchQuery('');
    setInstitutionsError(null);
    try { localStorage.removeItem('selectedInstitutionId'); } catch (e) { /* ignore */ }
    setAnchorElUser(null);
    setAnchorElInstitutions(null);
    setAnchorElNav(null);
    try { navigate(USER_LOGIN_ROUTE, { replace: true }); } catch (e) { /* ignore */ }
  };

  const handleOpenProfile = () => {
    handleCloseUserMenu();
    navigate(PROFILE_ROUTE);
  };

  const handleSelectInstitution = (inst: Institution) => {
    setSelectedInstitution(inst);
    try { localStorage.setItem('selectedInstitutionId', String(inst.id)); } catch (e) { /* ignore */ }
    try { window.dispatchEvent(new CustomEvent('institutionSelected', { detail: inst })); } catch (e) { /* ignore */ }
    handleCloseInstitutionsMenu();
    setSearchQuery('');
    setAnchorElNav(null);
    try { navigate(institutionRoute(String(inst.id))); } catch (e) { /* ignore */ }
  };

  const handlePageClick = (page: string) => {
    if (!selectedInstitution) return;
    const base = `/institutions/${selectedInstitution.id}`;
    const path = page ? `${base}/${page}` : base;
    handleCloseNavMenu();
    handleCloseInstitutionsMenu();
    try { navigate(path); } catch (e) { /* ignore */ }
  };

  const sortedInstitutions = React.useMemo(
    () => [...institutions].sort((a, b) => compareAlphabetical(a.name ?? '', b.name ?? '')),
    [institutions],
  );

  const displayedInstitutions = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedInstitutions;
    return sortedInstitutions.filter((i) => (i.name || '').toLowerCase().includes(q));
  }, [sortedInstitutions, searchQuery]);

  const syncSelectedInstitutionFromStorage = React.useCallback((sourceInstitutions?: Institution[]) => {
    try {
      const storedId = localStorage.getItem('selectedInstitutionId');
      if (!storedId) { setSelectedInstitution(null); return; }
      const fromList = (sourceInstitutions ?? institutions).find((i) => String(i.id) === String(storedId));
      if (fromList) setSelectedInstitution(fromList);
    } catch (e) { /* ignore */ }
  }, [institutions]);

  const fetchInstitutions = React.useCallback(async () => {
    setInstitutionsLoading(true);
    setInstitutionsError(null);
    try {
      const instances = await getInstitutions();
      const sorted = [...instances].sort((a, b) => compareAlphabetical(a.name ?? '', b.name ?? ''));
      setInstitutions(sorted);
      try {
        const storedId = localStorage.getItem('selectedInstitutionId');
        if (storedId) {
          const found = sorted.find((i) => String(i.id) === String(storedId));
          if (found) {
            setSelectedInstitution(found);
            try { window.dispatchEvent(new CustomEvent('institutionSelected', { detail: found })); } catch (e) { /* ignore */ }
          } else {
            setSelectedInstitution(null);
            try { localStorage.removeItem('selectedInstitutionId'); } catch (e) { /* ignore */ }
          }
        } else {
          setSelectedInstitution(null);
        }
      } catch (e) { /* ignore */ }
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      if (status === 401 || status === 403) { handleLogout(); return; }
      setInstitutionsError(err?.message || 'Failed to load institutions');
    } finally {
      setInstitutionsLoading(false);
    }
  }, [navigate]);

  React.useEffect(() => { fetchInstitutions(); }, [fetchInstitutions]);

  React.useEffect(() => {
    const onInstitutionsChanged = () => { fetchInstitutions(); };
    window.addEventListener('institutionsChanged', onInstitutionsChanged as EventListener);
    return () => { window.removeEventListener('institutionsChanged', onInstitutionsChanged as EventListener); };
  }, [fetchInstitutions]);

  React.useEffect(() => {
    const onInstitutionSelected = (event: Event) => {
      const selectedEvent = event as CustomEvent<Institution | { id?: string; _id?: string } | undefined>;
      const detail = selectedEvent.detail;
      const selectedId = detail ? String((detail as any).id ?? (detail as any)._id ?? '') : '';
      if (selectedId) {
        const fromList = institutions.find((i) => String(i.id) === selectedId);
        if (fromList) { setSelectedInstitution(fromList); return; }
      }
      syncSelectedInstitutionFromStorage();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'selectedInstitutionId') syncSelectedInstitutionFromStorage();
    };
    window.addEventListener('institutionSelected', onInstitutionSelected as EventListener);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('institutionSelected', onInstitutionSelected as EventListener);
      window.removeEventListener('storage', onStorage);
    };
  }, [institutions, syncSelectedInstitutionFromStorage]);

  React.useEffect(() => {
    syncSelectedInstitutionFromStorage(institutions);
  }, [institutions, syncSelectedInstitutionFromStorage]);

  React.useEffect(() => {
    if (anchorElNav) {
      const t = setTimeout(() => {
        const el = mobileSearchRef.current;
        if (el) { el.focus({ preventScroll: true }); try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) { /* ignore */ } }
      }, 120);
      return () => clearTimeout(t);
    }
    return;
  }, [anchorElNav]);

  React.useEffect(() => {
    if (anchorElNav) {
      setMobileSelectInstOpen(!selectedInstitution);
      if (!selectedInstitution) {
        const t = setTimeout(() => mobileSearchRef.current?.focus(), 140);
        return () => clearTimeout(t);
      }
    }
    return;
  }, [anchorElNav, selectedInstitution]);

  React.useEffect(() => {
    if (!mobileSelectInstOpen) setSearchQuery('');
  }, [mobileSelectInstOpen]);

  const navbarBg = mode === 'dark'
    ? alpha(theme.palette.background.paper, 0.85)
    : alpha(theme.palette.background.paper, 0.9);

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        bgcolor: navbarBg,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid',
        borderColor: 'divider',
        color: 'text.primary',
      }}
    >
      <Container maxWidth={false} disableGutters>
        <Toolbar disableGutters sx={{ px: { xs: 2, md: 3 }, minHeight: '64px !important', gap: 0.5 }}>

          {/* ── Logo ── */}
          <Box
            component={RouterLink}
            to="/"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              textDecoration: 'none',
              mr: 1,
            }}
          >
            <CalendarMonthIcon sx={{ color: 'primary.main', width: 22, height: 22 }} />
            <Typography
              sx={{
                fontFamily: '"Inter", sans-serif',
                fontWeight: 800,
                fontSize: '1rem',
                letterSpacing: '0.08em',
                color: 'text.primary',
              }}
            >
              ODES
            </Typography>
          </Box>

          {/* ── Desktop divider ── */}
          <Divider orientation="vertical" flexItem sx={{ mx: 1, my: 1.5, display: { xs: 'none', md: 'block' } }} />

          {/* ── Institution selector ── */}
          <Button
            onClick={handleOpenInstitutionsMenu}
            endIcon={
              institutionsLoading
                ? <CircularProgress size={14} color="inherit" />
                : <KeyboardArrowDownRoundedIcon sx={{ fontSize: '1.1rem', transition: 'transform 200ms', transform: Boolean(anchorElInstitutions) ? 'rotate(180deg)' : 'none' }} />
            }
            sx={{
              display: { xs: 'none', md: 'inline-flex' },
              color: selectedInstitution ? 'text.primary' : 'text.secondary',
              fontWeight: selectedInstitution ? 600 : 400,
              fontSize: '0.875rem',
              borderRadius: 2,
              px: 1.5,
              py: 0.75,
              bgcolor: Boolean(anchorElInstitutions) ? 'action.selected' : 'transparent',
              '&:hover': { bgcolor: 'action.hover' },
              maxWidth: 200,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedInstitution?.name || 'Select institution'}
            </Box>
          </Button>

          {/* ── Institution Popper (desktop) ── */}
          <Popper
            open={Boolean(anchorElInstitutions)}
            anchorEl={anchorElInstitutions}
            placement="bottom-start"
            transition
            disablePortal
            sx={{ zIndex: 1300 }}
          >
            {({ TransitionProps }) => (
              <Grow {...TransitionProps} style={{ transformOrigin: 'top left' }}>
                <Paper
                  elevation={0}
                  sx={{
                    mt: 0.5,
                    minWidth: 280,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 3,
                    overflow: 'hidden',
                    boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, mode === 'dark' ? 0.5 : 0.12)}`,
                  }}
                >
                  <ClickAwayListener onClickAway={handleCloseInstitutionsMenu}>
                    <Box>
                      {/* Search */}
                      <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <TextField
                          size="small"
                          placeholder="Search institutions..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { e.stopPropagation(); }}
                          onKeyUp={(e: React.KeyboardEvent<HTMLInputElement>) => { e.stopPropagation(); }}
                          inputRef={desktopSearchRef}
                          fullWidth
                          slotProps={{
                            input: {
                              startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.disabled' }} />,
                            },
                          }}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.875rem' } }}
                        />
                      </Box>

                      {/* Actions */}
                      <Box sx={{ px: 1, pt: 1 }}>
                        <MenuItem
                          component={RouterLink}
                          to={INSTITUTIONS_ROUTE}
                          onClick={() => { handleCloseInstitutionsMenu(); setAnchorElNav(null); }}
                          sx={{ borderRadius: 1.5, fontSize: '0.875rem', py: 0.75 }}
                        >
                          View all institutions
                        </MenuItem>
                        <MenuItem
                          component={RouterLink}
                          to={INSTITUTIONS_CREATE_ROUTE}
                          onClick={() => { handleCloseInstitutionsMenu(); setAnchorElNav(null); }}
                          sx={{ borderRadius: 1.5, fontSize: '0.875rem', py: 0.75 }}
                        >
                          <ListItemIcon sx={{ minWidth: 28 }}><AddRoundedIcon fontSize="small" /></ListItemIcon>
                          New institution
                        </MenuItem>
                      </Box>

                      <Divider sx={{ my: 1 }} />

                      {/* List */}
                      <Box sx={{ px: 1, pb: 1, maxHeight: 280, overflowY: 'auto' }}>
                        {institutionsError && (
                          <Typography variant="caption" color="error" sx={{ px: 1 }}>{institutionsError}</Typography>
                        )}
                        {!institutionsError && !institutionsLoading && displayedInstitutions.length === 0 && (
                          <Typography variant="caption" color="text.secondary" sx={{ px: 1, py: 0.5, display: 'block' }}>No institutions found</Typography>
                        )}
                        {displayedInstitutions.map((inst) => {
                          const isSelected = String(inst.id) === String(selectedInstitution?.id);
                          return (
                            <MenuItem
                              key={inst.id}
                              onClick={() => handleSelectInstitution(inst)}
                              sx={{
                                borderRadius: 1.5,
                                fontSize: '0.875rem',
                                py: 0.75,
                                fontWeight: isSelected ? 600 : 400,
                                color: isSelected ? 'primary.main' : 'text.primary',
                                display: 'flex',
                                justifyContent: 'space-between',
                              }}
                            >
                              {inst.name}
                              {isSelected && <CheckRoundedIcon sx={{ fontSize: '1rem', color: 'primary.main' }} />}
                            </MenuItem>
                          );
                        })}
                      </Box>
                    </Box>
                  </ClickAwayListener>
                </Paper>
              </Grow>
            )}
          </Popper>

          {/* ── Desktop nav buttons ── */}
          {selectedInstitution && (
            <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'stretch', ml: 0.5 }}>
              {NAV_PAGES.map((page) => {
                const isActive = activePageKey === page.key;
                return (
                  <Button
                    key={page.key}
                    onClick={() => handlePageClick(page.key)}
                    sx={{
                      fontSize: '0.875rem',
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? 'primary.main' : 'text.secondary',
                      borderRadius: 0,
                      px: 1.5,
                      py: 0,
                      minHeight: 64,
                      borderBottom: isActive ? '2px solid' : '2px solid transparent',
                      borderColor: isActive ? 'primary.main' : 'transparent',
                      '&:hover': {
                        bgcolor: 'action.hover',
                        color: 'text.primary',
                      },
                    }}
                  >
                    {page.label}
                  </Button>
                );
              })}
            </Box>
          )}

          {/* ── Spacer ── */}
          <Box sx={{ flexGrow: 1 }} />

          {/* ── Theme toggle ── */}
          <Tooltip title={mode === 'dark' ? 'Light mode' : 'Dark mode'}>
            <IconButton
              onClick={toggleColorMode}
              size="small"
              sx={{
                color: 'text.secondary',
                '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
              }}
            >
              {mode === 'dark' ? <LightModeRoundedIcon fontSize="small" /> : <DarkModeRoundedIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

          {/* ── Mobile hamburger ── */}
          <IconButton
            size="small"
            onClick={handleOpenNavMenu}
            sx={{ display: { xs: 'flex', md: 'none' }, color: 'text.secondary', ml: 0.5 }}
          >
            <MenuIcon fontSize="small" />
          </IconButton>

          {/* ── User avatar ── */}
          <Tooltip title="Account">
            <IconButton onClick={handleOpenUserMenu} sx={{ ml: 0.5, p: 0.5 }}>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: alpha(theme.palette.primary.main, 0.15),
                  color: 'primary.main',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                }}
              />
            </IconButton>
          </Tooltip>

          {/* ── User menu ── */}
          <Menu
            anchorEl={anchorElUser}
            open={Boolean(anchorElUser)}
            onClose={handleCloseUserMenu}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            slotProps={{
              paper: {
                elevation: 0,
                sx: {
                  mt: 0.5,
                  minWidth: 180,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 3,
                  overflow: 'hidden',
                  boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, mode === 'dark' ? 0.5 : 0.12)}`,
                  '& .MuiMenuItem-root': { borderRadius: 1.5, mx: 0.75, my: 0.25, fontSize: '0.875rem', py: 0.75 },
                },
              },
            }}
          >
            <Box sx={{ px: 2, py: 1.25, borderBottom: '1px solid', borderColor: 'divider', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">Account</Typography>
            </Box>
            <MenuItem onClick={handleOpenProfile}>
              <ListItemIcon><AccountCircleRoundedIcon fontSize="small" /></ListItemIcon>
              Profile
            </MenuItem>
            <Divider sx={{ my: 0.5 }} />
            <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
              <ListItemIcon><LogoutRoundedIcon fontSize="small" sx={{ color: 'error.main' }} /></ListItemIcon>
              Sign out
            </MenuItem>
          </Menu>

          {/* ── Mobile nav menu ── */}
          <Menu
            id="menu-appbar"
            anchorEl={anchorElNav}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            keepMounted
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            disableAutoFocusItem
            disableEnforceFocus
            disableRestoreFocus
            open={Boolean(anchorElNav)}
            onClose={handleCloseNavMenu}
            sx={{ display: { xs: 'block', md: 'none' } }}
            slotProps={{
              paper: {
                elevation: 0,
                sx: {
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 3,
                  boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, mode === 'dark' ? 0.5 : 0.12)}`,
                },
              },
            }}
          >
            <Box sx={{ px: 1.5, py: 1, minWidth: 220 }}>
              {selectedInstitution && (
                <>
                  <Box sx={{ px: 1, pb: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {selectedInstitution.name}
                    </Typography>
                  </Box>
                  {NAV_PAGES.map((page) => (
                    <MenuItem
                      key={page.key}
                      onClick={() => handlePageClick(page.key)}
                      selected={activePageKey === page.key}
                      sx={{ borderRadius: 1.5, fontSize: '0.875rem', py: 0.75, mb: 0.25 }}
                    >
                      {page.label}
                    </MenuItem>
                  ))}
                  <Divider sx={{ my: 1 }} />
                </>
              )}

              {!selectedInstitution && (
                <MenuItem disabled sx={{ fontSize: '0.875rem' }}>No institution selected</MenuItem>
              )}

              <MenuItem
                onClick={() => {
                  setMobileSelectInstOpen((prev) => !prev);
                  if (!mobileSelectInstOpen) setTimeout(() => mobileSearchRef.current?.focus(), 120);
                }}
                sx={{ borderRadius: 1.5, fontSize: '0.875rem', py: 0.75, display: 'flex', justifyContent: 'space-between' }}
              >
                {selectedInstitution ? 'Switch institution' : 'Choose institution'}
                <ExpandMoreIcon sx={{ fontSize: '1.1rem', transform: mobileSelectInstOpen ? 'rotate(180deg)' : 'none', transition: '200ms' }} />
              </MenuItem>

              <Collapse in={mobileSelectInstOpen} timeout="auto" unmountOnExit>
                <Box sx={{ py: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <SearchIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                    <TextField
                      size="small"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { e.stopPropagation(); }}
                      onKeyUp={(e: React.KeyboardEvent<HTMLInputElement>) => { e.stopPropagation(); }}
                      inputRef={mobileSearchRef}
                      fullWidth
                      sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.875rem' } }}
                    />
                  </Box>
                  <MenuItem
                    component={RouterLink}
                    to={INSTITUTIONS_ROUTE}
                    onClick={() => { setSearchQuery(''); handleCloseNavMenu(); }}
                    sx={{ borderRadius: 1.5, fontSize: '0.875rem', py: 0.75 }}
                  >
                    View all institutions
                  </MenuItem>
                  <Divider sx={{ my: 0.5 }} />
                  {displayedInstitutions.map((inst) => (
                    <MenuItem
                      key={inst.id}
                      onClick={() => { setSearchQuery(''); handleSelectInstitution(inst); setMobileSelectInstOpen(false); }}
                      selected={String(inst.id) === String(selectedInstitution?.id)}
                      sx={{ borderRadius: 1.5, fontSize: '0.875rem', py: 0.75 }}
                    >
                      {inst.name}
                    </MenuItem>
                  ))}
                </Box>
              </Collapse>
            </Box>
          </Menu>

        </Toolbar>
      </Container>
    </AppBar>
  );
}
