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
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { USER_LOGIN_ROUTE } from '../../config/routes';
import { getInstitutions } from '../../api/institutions';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
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

type Institution = InstitutionClass;

export default function ResponsiveAppBar() {
  const [anchorElNav, setAnchorElNav] = React.useState<null | HTMLElement>(null);
  const [anchorElUser, setAnchorElUser] = React.useState<null | HTMLElement>(null);
  const [anchorElInstitutions, setAnchorElInstitutions] = React.useState<null | HTMLElement>(null);
  // refs for search inputs so we can force-focus them when menus open
  const mobileSearchRef = React.useRef<HTMLInputElement | null>(null);
  const desktopSearchRef = React.useRef<HTMLInputElement | null>(null);
  const [institutions, setInstitutions] = React.useState<Institution[]>([]);
  const [institutionsLoading, setInstitutionsLoading] = React.useState(false);
  const [institutionsError, setInstitutionsError] = React.useState<string | null>(null);
  const [selectedInstitution, setSelectedInstitution] = React.useState<Institution | null>(null);
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const navigate = useNavigate();
  // whether the mobile "Choose institution" sub-menu is open
  const [mobileSelectInstOpen, setMobileSelectInstOpen] = React.useState(false);

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
    // clear search when institutions popper closes
    setSearchQuery('');
  };

  const handleLogout = () => {
    // remove stored token
    try { localStorage.removeItem('authToken'); } catch (e) { /* ignore */ }
    // reset UI state
    setSelectedInstitution(null);
    setInstitutions([]);
    setSearchQuery('');
    setInstitutionsError(null);
    // remove persisted selection
    try { localStorage.removeItem('selectedInstitutionId'); } catch (e) { /* ignore */ }
    // close menus
    setAnchorElUser(null);
    setAnchorElInstitutions(null);
    setAnchorElNav(null);
    // navigate to login
    try { navigate(USER_LOGIN_ROUTE, { replace: true }); } catch (e) { /* ignore */ }
  };

  const handleSelectInstitution = (inst: Institution) => {
    setSelectedInstitution(inst);
    // persist selection so it's available across pages and reloads
    try { localStorage.setItem('selectedInstitutionId', String(inst.id)); } catch (e) { /* ignore */ }
    // notify other parts of the app in the same window
    try { window.dispatchEvent(new CustomEvent('institutionSelected', { detail: inst })); } catch (e) { /* ignore */ }
    handleCloseInstitutionsMenu();
    setSearchQuery('');
    // also close mobile nav menu if open
    setAnchorElNav(null);
    // navigate to institution page
    // try {
    //   navigate(`/institutions/${inst.id}`);
    // } catch (e) {
    //   // ignore navigation errors in environments without router
    // }
  };

  // Navigate to a page for the currently selected institution
  const handlePageClick = (page: string) => {
    if (!selectedInstitution) return;
    const base = `/institutions/${selectedInstitution.id}`;

    const path = page ? `${base}/${page}` : base;

    // close any open menus
    handleCloseNavMenu();
    handleCloseInstitutionsMenu();
    try {
      navigate(path);
    } catch (e) {
      // ignore in non-router environments
    }
  };

  const displayedInstitutions = React.useMemo(() => {
    if (!searchQuery) return institutions;
    const q = searchQuery.trim().toLowerCase();
    return institutions.filter(i => (i.name || '').toLowerCase().includes(q));
  }, [institutions, searchQuery]);

  // Fetch institutions on mount using API helper
  React.useEffect(() => {
    let mounted = true;
    const fetchInstitutions = async () => {
      setInstitutionsLoading(true);
      setInstitutionsError(null);
      try {
        const instances = await getInstitutions();
        if (!mounted) return;
        setInstitutions(instances);
        // restore previously selected institution (persisted in localStorage), if any
        try {
          const storedId = localStorage.getItem('selectedInstitutionId');
          if (storedId) {
            const found = instances.find(i => String(i.id) === String(storedId));
            if (found) {
              setSelectedInstitution(found);
              // notify other parts of the app
              try { window.dispatchEvent(new CustomEvent('institutionSelected', { detail: found })); } catch (e) { /* ignore */ }
            }
          }
        } catch (e) {
          // ignore localStorage errors
        }
      } catch (err: any) {
        if (!mounted) return;
        setInstitutionsError(err?.message || 'Failed to load institutions');
      } finally {
        if (mounted) setInstitutionsLoading(false);
      }
    };

    fetchInstitutions();
    return () => {
      mounted = false;
    };
  }, []);

  // ensure the search input is focused when a menu opens (more robust than relying solely on autoFocus)
  React.useEffect(() => {
    if (anchorElNav) {
      // small timeout to allow the Menu to mount first
      const t = setTimeout(() => {
        const el = mobileSearchRef.current;
        if (el) {
          el.focus({ preventScroll: true });
          try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) { /* ignore */ }
        }
      }, 120);
      return () => clearTimeout(t);
    }
    return;
  }, [anchorElNav]);

  // open the choose-institution sub-menu automatically if no institution is selected
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

  // Clear search input when the mobile select sub-menu is closed
  React.useEffect(() => {
    if (!mobileSelectInstOpen) {
      setSearchQuery('');
    }
  }, [mobileSelectInstOpen]);

  return (
    <AppBar position="fixed" color={"primary"} sx={{ top: 0, left: 0, right: 0, px: 3 }}>
      <Container maxWidth={false} disableGutters>
        <Toolbar disableGutters>
          {/* combined icon+title link (desktop) */}
          <Box
            component={RouterLink}
            to="/"
            aria-label="home"
            sx={{
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              mr: 2,
              color: 'inherit',
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'color 150ms ease, opacity 150ms ease',
            }}
          >
            <CalendarMonthIcon className="logoIcon" sx={{ width: 32, height: 32, mr: 1 }} />
            <Typography
              variant="h6"
              noWrap
              className="logoText"
              sx={{
                fontFamily: 'monospace',
                fontWeight: 700,
                letterSpacing: '.3rem',
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              ODES
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleOpenNavMenu}
              color="inherit"
            >
              <MenuIcon />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorElNav}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
              }}
             // Disable all focus-related props to prevent the Menu from stealing focus from the search input when typing.
             // This ensures that opening the menu does not auto-focus the first MenuItem, enforce focus within the menu,
             // or restore focus to the menu, allowing uninterrupted typing in the search input.
             disableAutoFocusItem
             disableEnforceFocus
             disableRestoreFocus
              open={Boolean(anchorElNav)}
              onClose={handleCloseNavMenu}
              sx={{ display: { xs: 'block', md: 'none' } }}
            >
              {/* Mobile: show selected-institution pages first, and provide a collapsible "Choose institution" sub-menu */}
              <Box sx={{ px: 2, py: 1, minWidth: 200 }}>
                {/* Selected institution pages (top of mobile menu) */}
                {selectedInstitution ? (
                  <>
                    {/* Show selected institution name as a header on mobile */}
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{selectedInstitution.name}</Typography>
                      <Typography variant="caption" color="text.secondary">Selected institution</Typography>
                    </Box>
                    <MenuItem onClick={() => handlePageClick('')}>
                      <Typography>Institution</Typography>
                    </MenuItem>
                    <MenuItem onClick={() => handlePageClick('members')}>
                      <Typography>Members</Typography>
                    </MenuItem>
                    <MenuItem onClick={() => handlePageClick('groups')}>
                      <Typography>Groups</Typography>
                    </MenuItem>
                    <MenuItem onClick={() => handlePageClick('courses')}>
                      <Typography>Courses</Typography>
                    </MenuItem>
                    <MenuItem onClick={() => handlePageClick('rooms')}>
                      <Typography>Rooms</Typography>
                    </MenuItem>
                    <MenuItem onClick={() => handlePageClick('activities')}>
                      <Typography>Activities</Typography>
                    </MenuItem>
                    <MenuItem onClick={() => handlePageClick('schedules')}>
                      <Typography>Schedules</Typography>
                    </MenuItem>
                    <Divider sx={{ my: 1 }} />
                  </>
                ) : (
                  <MenuItem disabled>
                    <Typography>No institution selected</Typography>
                  </MenuItem>
                )}

                {/* Toggle to open the choose-institution sub-menu */}
                <MenuItem
                  onClick={() => {
                    setMobileSelectInstOpen(prev => !prev);
                    if (!mobileSelectInstOpen) setTimeout(() => mobileSearchRef.current?.focus(), 120);
                  }}
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}
                >
                  <Typography>{selectedInstitution ? 'Change institution' : 'Choose institution'}</Typography>
                  <ExpandMoreIcon sx={{ transform: mobileSelectInstOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: '200ms' }} />
                </MenuItem>
                <Collapse in={mobileSelectInstOpen} timeout="auto" unmountOnExit>
                  <Box sx={{ px: 0, py: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SearchIcon fontSize="small" />
                      <TextField
                        size="small"
                        placeholder="Search institutions"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { e.stopPropagation(); }}
                        onKeyUp={(e: React.KeyboardEvent<HTMLInputElement>) => { e.stopPropagation(); }}
                        inputRef={mobileSearchRef}
                        fullWidth
                      />
                    </Box>
                    <MenuItem
                      component={RouterLink}
                      to="/institutions"
                      onClick={() => { setSearchQuery(''); handleCloseNavMenu(); }}
                      sx={{ mt: 1 }}
                    >
                      <Typography>View all institutions</Typography>
                    </MenuItem>
                    <Divider sx={{ my: 1 }} />
                    {institutionsError && (
                      <MenuItem disabled>
                        <Typography color="error">{institutionsError}</Typography>
                      </MenuItem>
                    )}
                    {!institutionsError && !institutionsLoading && displayedInstitutions.length === 0 && (
                      <MenuItem disabled>
                        <Typography sx={{ textAlign: 'center' }}>No institutions</Typography>
                      </MenuItem>
                    )}
                    {displayedInstitutions.map((inst) => (
                      <MenuItem key={inst.id} onClick={() => { setSearchQuery(''); handleSelectInstitution(inst); setMobileSelectInstOpen(false); }}>
                        <Typography sx={{ textAlign: 'center' }}>{inst.name}</Typography>
                      </MenuItem>
                    ))}
                  </Box>
                </Collapse>
              </Box>
            </Menu>
          </Box>
          {/* combined icon+title link (mobile) */}
          <Box
            component={RouterLink}
            to="/"
            aria-label="home"
            sx={{
              display: { xs: 'flex', md: 'none' },
              alignItems: 'center',
              mr: 2,
              color: 'inherit',
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'color 150ms ease, opacity 150ms ease',
              flexGrow: 1,
            }}
          >
            <CalendarMonthIcon className="logoIcon" sx={{ width: 28, height: 28, mr: 1 }} />
            <Typography
              variant="h5"
              noWrap
              className="logoText"
              sx={{
                fontFamily: 'monospace',
                fontWeight: 700,
                letterSpacing: '.3rem',
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              ODES
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
            {/* Institutions dropdown as first item */}
            <>
              <Button
                id="institutions-button"
                aria-controls={Boolean(anchorElInstitutions) ? 'institutions-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={Boolean(anchorElInstitutions) ? 'true' : undefined}
                onClick={handleOpenInstitutionsMenu}
                sx={{ my: 2, color: 'white', display: 'inline-flex', alignItems: 'center' }}
                endIcon={<ArrowDropDownIcon sx={{ color: 'white' }} />}
              >
                {institutionsLoading ? 'Loading...' : selectedInstitution ? selectedInstitution.name : 'Institutions'}
              </Button>
              <Popper
                id="institutions-menu"
                open={Boolean(anchorElInstitutions)}
                anchorEl={anchorElInstitutions}
                placement="bottom-start"
                transition
                disablePortal
              >
                {({ TransitionProps }) => (
                  <Grow {...TransitionProps} style={{ transformOrigin: 'top left' }}>
                    <Paper elevation={3} sx={{ minWidth: 260 }}>
                      <ClickAwayListener onClickAway={handleCloseInstitutionsMenu}>
                        <Box sx={{ px: 2, py: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <SearchIcon fontSize="small" />
                            <TextField
                              size="small"
                              placeholder="Search institutions"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { e.stopPropagation(); }}
                              onKeyUp={(e: React.KeyboardEvent<HTMLInputElement>) => { e.stopPropagation(); }}
                              inputRef={desktopSearchRef}
                              fullWidth
                            />
                          </Box>
                          <MenuItem
                            component={RouterLink}
                            to="/institutions"
                            onClick={() => { handleCloseInstitutionsMenu(); setAnchorElNav(null); setSearchQuery(''); }}
                            sx={{ mt: 1 }}
                          >
                            <Typography>View all institutions</Typography>
                          </MenuItem>
                          <Divider />
                          {institutionsError && (
                            <MenuItem disabled>
                              <Typography color="error">{institutionsError}</Typography>
                            </MenuItem>
                          )}
                          {!institutionsError && !institutionsLoading && displayedInstitutions.length === 0 && (
                            <MenuItem disabled>
                              <Typography>No institutions</Typography>
                            </MenuItem>
                          )}
                          {displayedInstitutions.map((inst) => (
                            <MenuItem key={inst.id} onClick={() => handleSelectInstitution(inst)}>
                              <Typography>{inst.name}</Typography>
                            </MenuItem>
                          ))}
                        </Box>
                      </ClickAwayListener>
                    </Paper>
                  </Grow>
                )}
              </Popper>
            </>

            {/* Desktop: show top-level page buttons when an institution is selected (visible on md+) */}
            {selectedInstitution && (
              <>
                <Button onClick={() => handlePageClick('')} sx={{ my: 2, color: 'white', display: 'block' }}>Institution</Button>
                <Button onClick={() => handlePageClick('members')} sx={{ my: 2, color: 'white', display: 'block' }}>Members</Button>
                <Button onClick={() => handlePageClick('groups')} sx={{ my: 2, color: 'white', display: 'block' }}>Groups</Button>
                <Button onClick={() => handlePageClick('courses')} sx={{ my: 2, color: 'white', display: 'block' }}>Courses</Button>
                <Button onClick={() => handlePageClick('rooms')} sx={{ my: 2, color: 'white', display: 'block' }}>Rooms</Button>
                <Button onClick={() => handlePageClick('activities')} sx={{ my: 2, color: 'white', display: 'block' }}>Activities</Button>
                <Button onClick={() => handlePageClick('schedules')} sx={{ my: 2, color: 'white', display: 'block' }}>Schedules</Button>
              </>
            )}
          </Box>
          <Box sx={{ flexGrow: 0 }}>
            <Tooltip title="Open settings">
              <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                <Avatar />
              </IconButton>
            </Tooltip>
            <Menu
              sx={{ mt: '45px' }}
              id="menu-user"
              anchorEl={anchorElUser}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorElUser)}
              onClose={handleCloseUserMenu}
            >
              <MenuItem onClick={handleCloseUserMenu}>
                <Typography sx={{ textAlign: 'center' }}>Profile</Typography>
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <Typography sx={{ textAlign: 'center' }}>Logout</Typography>
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
