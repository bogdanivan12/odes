import React from 'react';
import Box from '@mui/material/Box';
import { Outlet } from 'react-router-dom';
import ResponsiveAppBar from '../navbar/ResponsiveAppBar';

// Main layout that shows the navbar on every protected page.
// Accepts optional children for standalone use (e.g. the root "/" route);
// falls back to React Router <Outlet /> when used as a route element.
export const MainLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <Box sx={{ display: 'block' }}>
      <ResponsiveAppBar />
      {/* Add top padding so content isn't hidden behind fixed AppBar */}
      <Box component="main" sx={{ pt: 10 }}>
        {children ?? <Outlet />}
      </Box>
    </Box>
  );
};

export default MainLayout;
