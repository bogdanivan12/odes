import React from 'react';
import Box from '@mui/material/Box';

export interface PageContainerProps {
  children: React.ReactNode;
  maxWidth?: number | string;
  padding?: any; // allow MUI responsive padding object
  alignItems?: 'center' | 'flex-start' | 'flex-end';
}

export default function PageContainer({ children, maxWidth = 2000, padding = { xs: 4, md: 8 }, alignItems = 'center' }: PageContainerProps) {
  return (
    <Box sx={(theme) => ({
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
      m: 0,
      p: 0,
      pt: 4,
      boxSizing: 'border-box',
      display: 'flex',
      alignItems: alignItems,
      justifyContent: 'center',
      backgroundColor: theme.palette.background.paper,
      color: theme.palette.text.primary,
      overflow: 'auto'
    })}>
      <Box sx={{ width: '100%', maxWidth: maxWidth, p: padding }}>
        {children}
      </Box>
    </Box>
  );
}

