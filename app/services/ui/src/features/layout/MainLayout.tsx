import React from 'react';
import Box from '@mui/material/Box';
import { Outlet } from 'react-router-dom';
import ResponsiveAppBar from '../navbar/ResponsiveAppBar';

// Main layout that shows the navbar on every protected page
export const MainLayout: React.FC = () => {
  return (
    <Box sx={{ display: 'block' }}>
      <ResponsiveAppBar />
      {/* Add top padding so content isn't hidden behind fixed AppBar */}
      <Box component="main" sx={{ pt: 10 }}>
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout;

