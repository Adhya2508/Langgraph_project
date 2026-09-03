// src/components/common/KpiCard.tsx
import React from 'react';
import { Card, CardContent, Typography, Box, Avatar } from '@mui/material';

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
}

export const KpiCard: React.FC<KpiCardProps> = ({ title, value, subtitle, icon, color = 'primary' }) => {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '1px' }}>
            {title}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', wordBreak: 'break-all' }}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Avatar
          sx={{
            bgcolor: `${color}.main`,
            color: `${color}.contrastText`,
            width: 42,
            height: 42,
            borderRadius: 2,
          }}
        >
          {icon}
        </Avatar>
      </CardContent>
    </Card>
  );
};
export default KpiCard;
