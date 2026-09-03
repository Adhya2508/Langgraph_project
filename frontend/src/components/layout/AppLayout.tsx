// src/components/layout/AppLayout.tsx
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import CopilotDrawer from '../chat/CopilotDrawer';

export const AppLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        width: '100vw',
        height: '100vh',
        bgcolor: 'background.default',
        overflow: 'hidden',
      }}
    >
      {/* Sidebar Navigation */}
      <Sidebar
        mobileOpen={mobileOpen}
        onDrawerToggle={handleDrawerToggle}
        collapsed={collapsed}
        onCollapseToggle={() => setCollapsed(!collapsed)}
      />

      {/* Main Content Area */}
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: '100%',
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        <Topbar onDrawerToggle={handleDrawerToggle} />

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3, // dense spacing
            overflowY: 'auto', // ONLY this area scrolls
            bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#090d16' : '#f8fafc'),
            width: '100%',
            height: '100%',
            boxSizing: 'border-box',
          }}
        >
          <Box sx={{ width: '100%', minWidth: 0 }}>
            <Outlet />
          </Box>
        </Box>
      </Box>

      {/* Floating Copilot Drawer FAB */}
      <CopilotDrawer />
    </Box>
  );
};
export default AppLayout;
