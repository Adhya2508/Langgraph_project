// src/components/layout/Topbar.tsx
import React from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  AppBar,
  Box,
  IconButton,
  Toolbar,
  Typography,
  Avatar,
  Tooltip,
  useTheme,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Menu as MenuIcon,
  NotificationsNone as NotificationsIcon,
  Brightness4 as DarkIcon,
  Brightness7 as LightIcon,
  AssessmentOutlined as LogoIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useAppTheme } from '../../contexts/ThemeContext';

interface TopbarProps {
  onDrawerToggle: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onDrawerToggle }) => {
  const theme = useTheme();
  const { mode, toggleTheme } = useAppTheme();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const path = location.pathname;
  const searchVal = searchParams.get('q') || '';
  const clusterVal = searchParams.get('cluster') || '0';
  const priorityVal = searchParams.get('priority') || 'All';

  const handleSearchChange = (val: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (val) {
      nextParams.set('q', val);
    } else {
      nextParams.delete('q');
    }
    setSearchParams(nextParams);
  };

  const handleClusterChange = (val: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('cluster', val);
    setSearchParams(nextParams);
  };

  const handlePriorityChange = (val: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('priority', val);
    setSearchParams(nextParams);
  };

  // Resolve Page titles and Filters based on pathname
  const getHeaderTitle = () => {
    switch (path) {
      case '/':
        return 'Executive Dashboard';
      case '/analysis':
        return 'Dataset Analysis & Profiles';
      case '/segments':
        return 'Customer Segments Exploration';
      case '/recommendations':
        return 'Marketing Campaign Recommendations';
      case '/profile':
        return 'User Profile & Configurations';
      default:
        return 'Insight360';
    }
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        borderBottom: `1px solid ${theme.palette.divider}`,
        color: 'text.primary',
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, md: 3 }, minHeight: 70 }}>
        {/* Left: Hamburger trigger, Title block */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={onDrawerToggle}
            sx={{ display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <LogoIcon color="primary" sx={{ fontSize: 28 }} />
            <Box>
              <Typography variant="body1" sx={{ fontWeight: 900, lineHeight: 1.2 }}>
                {getHeaderTitle()}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                Insight360 Platform
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Center: Dynamic Contextual Action Filters */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {path === '/analysis' && (
            <TextField
              size="small"
              placeholder="Search variables..."
              value={searchVal}
              onChange={(e) => handleSearchChange(e.target.value)}
              {...({
                InputProps: {
                  startAdornment: <SearchIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />,
                  sx: { borderRadius: 2, width: { xs: 150, sm: 260 } },
                }
              } as any)}
            />
          )}

          {path === '/segments' && (
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="select-cluster-label">Active Cohort</InputLabel>
              <Select
                labelId="select-cluster-label"
                id="select-cluster"
                value={clusterVal}
                label="Active Cohort"
                onChange={(e) => handleClusterChange(e.target.value as string)}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="0">Premium High-Value</MenuItem>
                <MenuItem value="1">Dormant High-Income</MenuItem>
                <MenuItem value="2">Frequent Small Spenders</MenuItem>
                <MenuItem value="3">At-Risk Churn Prospects</MenuItem>
              </Select>
            </FormControl>
          )}

          {path === '/recommendations' && (
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="select-priority-label">Priority Filter</InputLabel>
              <Select
                labelId="select-priority-label"
                id="select-priority"
                value={priorityVal}
                label="Priority Filter"
                onChange={(e) => handlePriorityChange(e.target.value as string)}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="All">All Priority Leads</MenuItem>
                <MenuItem value="Very High">Very High Priority</MenuItem>
                <MenuItem value="High">High Priority</MenuItem>
                <MenuItem value="Medium">Medium Priority</MenuItem>
              </Select>
            </FormControl>
          )}
        </Box>

        {/* Right: Notification, Avatar, Theme switches */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Tooltip title="Toggle light/dark mode">
            <IconButton onClick={toggleTheme} color="inherit" size="small">
              {mode === 'dark' ? <LightIcon /> : <DarkIcon />}
            </IconButton>
          </Tooltip>

          <Tooltip title="View notifications">
            <IconButton color="inherit" size="small">
              <NotificationsIcon />
            </IconButton>
          </Tooltip>

          <Box
            sx={{
              width: '1px',
              height: '20px',
              bgcolor: 'divider',
              mx: 0.5,
            }}
          />

          <Avatar
            sx={{
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              width: 36,
              height: 36,
              fontSize: '0.85rem',
              fontWeight: 700,
            }}
          >
            JD
          </Avatar>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Topbar;
