// src/components/layout/Sidebar.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
  Divider,
  useTheme,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  InsertChartOutlined as AnalysisIcon,
  GroupWorkOutlined as SegmentsIcon,
  CampaignOutlined as RecommendationsIcon,
  AccountBoxOutlined as ProfileIcon,
  ChevronLeft as ExpandIcon,
  ChevronRight as ShrinkIcon,
} from '@mui/icons-material';

const EXPANDED_WIDTH = 280;
const COLLAPSED_WIDTH = 72;

interface SidebarProps {
  mobileOpen: boolean;
  onDrawerToggle: () => void;
  collapsed: boolean;
  onCollapseToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  mobileOpen,
  onDrawerToggle,
  collapsed,
  onCollapseToggle,
}) => {
  const theme = useTheme();

  const menuItems = [
    { text: 'Dashboard', path: '/', icon: <DashboardIcon /> },
    { text: 'Dataset Analysis', path: '/analysis', icon: <AnalysisIcon /> },
    { text: 'Customer Segments', path: '/segments', icon: <SegmentsIcon /> },
    { text: 'Recommendations', path: '/recommendations', icon: <RecommendationsIcon /> },
    { text: 'Profile', path: '/profile', icon: <ProfileIcon /> },
  ];

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
      {/* Header / Logo */}
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', minHeight: 70 }}>
        {!collapsed ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 2,
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography sx={{ color: 'primary.contrastText', fontWeight: 900, fontSize: '1rem' }}>I</Typography>
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 900, letterSpacing: '-0.5px' }}>
              Insight360
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 2,
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography sx={{ color: 'primary.contrastText', fontWeight: 900, fontSize: '1rem' }}>I</Typography>
          </Box>
        )}

        {!collapsed && (
          <IconButton
            onClick={onCollapseToggle}
            sx={{
              display: { xs: 'none', md: 'inline-flex' },
              p: 0.5,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 2,
            }}
          >
            <ExpandIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
      <Divider />

      {/* Navigation List */}
      <Box sx={{ flexGrow: 1, px: collapsed ? 1 : 2, py: 3 }}>
        <List sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                component={NavLink}
                to={item.path}
                onClick={mobileOpen ? onDrawerToggle : undefined}
                title={collapsed ? item.text : undefined}
                sx={{
                  borderRadius: 2.5,
                  px: collapsed ? 0 : 2,
                  py: 1.4,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  color: 'text.secondary',
                  '&.active': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '& .MuiListItemIcon-root': {
                      color: 'primary.contrastText',
                    },
                  },
                  '&:hover:not(.active)': {
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: collapsed ? 0 : 36, color: 'inherit', justifyContent: 'center' }}>
                  {item.icon}
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText
                    primary={
                      <Typography sx={{ fontSize: '0.92rem', fontWeight: 700 }}>
                        {item.text}
                      </Typography>
                    }
                  />
                )}
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Footer Collapse Button (When collapsed) */}
      {collapsed && (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <IconButton
            onClick={onCollapseToggle}
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 2,
            }}
          >
            <ShrinkIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
    </Box>
  );

  const activeWidth = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  return (
    <Box
      component="nav"
      sx={{
        width: { md: activeWidth },
        flexShrink: { md: 0 },
        transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Mobile temporary drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: EXPANDED_WIDTH, border: 'none' },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop permanent drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: activeWidth,
            borderRight: `1px solid ${theme.palette.divider}`,
            bgcolor: 'background.paper',
            transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            overflowX: 'hidden',
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};
export default Sidebar;
