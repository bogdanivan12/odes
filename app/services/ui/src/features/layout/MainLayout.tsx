import React, { useEffect } from 'react';
import Box from '@mui/material/Box';
import Fab from '@mui/material/Fab';
import Tooltip from '@mui/material/Tooltip';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import ResponsiveAppBar from '../navbar/ResponsiveAppBar';
import { HELP_ROUTE } from '../../config/routes';
import { maybeAutoStartTour } from '../help/tour';

// Main layout that shows the navbar on every protected page.
// Accepts optional children for standalone use (e.g. the root "/" route);
// falls back to React Router <Outlet /> when used as a route element.
export const MainLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Show the guided tour once, on a user's first authenticated visit.
  useEffect(() => { maybeAutoStartTour(); }, []);

  return (
    <Box sx={{ display: 'block' }}>
      <ResponsiveAppBar />
      {/* Add top padding so content isn't hidden behind fixed AppBar.
          Keyed by route so each navigation fade-slides the new page in. */}
      <Box component="main" key={location.pathname} sx={{ pt: 10, animation: 'fadeInUp 0.35s ease both' }}>
        {children ?? <Outlet />}
      </Box>

      {/* Floating help button - quick access to the guide from anywhere. */}
      {location.pathname !== HELP_ROUTE && (
        <Tooltip title="Help & guide" placement="left">
          <Fab
            data-tour="help-button"
            color="primary" size="medium" aria-label="Help and guide"
            onClick={() => navigate(HELP_ROUTE)}
            sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1200 }}
          >
            <HelpOutlineRoundedIcon />
          </Fab>
        </Tooltip>
      )}
    </Box>
  );
};

export default MainLayout;
