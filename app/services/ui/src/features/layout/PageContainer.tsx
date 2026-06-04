import React from 'react';
import Box from '@mui/material/Box';

export interface PageContainerProps {
  children: React.ReactNode;
  maxWidth?: number | string;
  padding?: any; // allow MUI responsive padding object
  alignItems?: 'center' | 'flex-start' | 'flex-end';
}

export default function PageContainer({ children, maxWidth = 2000, padding = { xs: 4, md: 8 }, alignItems = 'center' }: PageContainerProps) {
  const centered = alignItems === 'center';
  return (
    <Box sx={(theme) => ({
      // Flows inside MainLayout (whose top padding clears the fixed navbar);
      // on the public landing (no navbar) it simply starts at the top.
      width: '100%',
      // Fill the viewport below the navbar without forcing extra scroll.
      minHeight: 'calc(100vh - 80px)',
      m: 0,
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      alignItems: alignItems === 'flex-end' ? 'flex-end' : 'center', // horizontal
      backgroundColor: theme.palette.background.default,
      color: theme.palette.text.primary,
      transition: 'background-color 0.3s ease, color 0.3s ease',
    })}>
      <Box
        sx={{
          width: '100%',
          maxWidth: maxWidth,
          p: padding,
          // Auto top/bottom margins center short content vertically but collapse
          // to 0 when content is tall, so the top never overflows under the navbar.
          ...(centered ? { my: 'auto' } : {}),
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
