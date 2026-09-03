// src/pages/Profile.tsx
import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  SettingsApplications as SettingsIcon,
} from '@mui/icons-material';

export const Profile: React.FC = () => {
  return (
    <Box sx={{ width: '100%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Page Title */}
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: '-1px', mb: 0.5 }}>
          User Profile & Configurations
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage system variables, parameters, and bank credentials.
        </Typography>
      </Box>

      {/* Grid: 2 Columns */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1.2fr 1.8fr' },
          gap: 3,
          width: '100%',
        }}
      >
        {/* Left Card: User Info */}
        <Card variant="outlined" sx={{ width: '100%' }}>
          <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2.5, width: '100%' }}>
            <Avatar
              sx={{
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                width: 80,
                height: 80,
                fontSize: '2rem',
                fontWeight: 800,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            >
              JD
            </Avatar>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                John Doe
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Lead Analytics Specialist
              </Typography>
            </Box>
            <Divider sx={{ width: '100%' }} />

            <List disablePadding sx={{ width: '100%' }}>
              <ListItem sx={{ px: 0, py: 1 }}>
                <ListItemText primary="Institution" secondary="Global Sovereign Bank Corp" />
              </ListItem>
              <ListItem sx={{ px: 0, py: 1 }}>
                <ListItemText primary="Department" secondary="Retail Deposits & Credit Intelligence" />
              </ListItem>
              <ListItem sx={{ px: 0, py: 1 }}>
                <ListItemText primary="Clearance Rank" secondary="System Administrator (Level 3)" />
              </ListItem>
              <ListItem sx={{ px: 0, py: 1 }}>
                <ListItemText primary="E-mail Access" secondary="j.doe@sovereignbank.com" />
              </ListItem>
            </List>
          </CardContent>
        </Card>

        {/* Right Card: Configs */}
        <Card variant="outlined" sx={{ height: '100%', width: '100%' }}>
          <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <SettingsIcon color="secondary" />
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                Clustering & Classification Configurations
              </Typography>
            </Box>
            <Divider />

            <Box sx={{ width: '100%' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, display: 'block', mb: 1, letterSpacing: '0.5px' }}>
                CLUSTERING PARAMETER COEFFICIENTS
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, width: '100%' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Optimal K clusters</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>4 (Auto-detected)</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">K-Means Seed</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>42</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Silhouette Threshold</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>&gt; 0.50 (Pass)</Typography>
                </Box>
              </Box>
            </Box>

            <Box sx={{ width: '100%' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, display: 'block', mb: 1, letterSpacing: '0.5px' }}>
                DATABASE CONNECTIVITY STATUS
              </Typography>
              <List disablePadding sx={{ width: '100%' }}>
                <ListItem sx={{ px: 0, py: 1 }}>
                  <ListItemText primary="Primary Bank Core Server" secondary="Connected — API Port 8000" />
                </ListItem>
                <ListItem sx={{ px: 0, py: 1 }}>
                  <ListItemText primary="Customer Master Catalog File" secondary="Loaded — /uploads/bank_churn_dataset.csv" />
                </ListItem>
              </List>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};
export default Profile;
