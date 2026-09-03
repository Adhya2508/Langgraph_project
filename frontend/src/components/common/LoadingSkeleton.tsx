// src/components/common/LoadingSkeleton.tsx
import React from 'react';
import { Box, Skeleton, Card, CardContent } from '@mui/material';

export const LoadingSkeleton: React.FC = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
      {/* 3 Overview Skeletons using CSS Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: '1fr 1fr 1fr',
          },
          gap: 2,
        }}
      >
        {[0, 1, 2].map((i) => (
          <Card variant="outlined" sx={{ p: 2 }} key={i}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Skeleton variant="circular" width={40} height={40} />
              <Box sx={{ flexGrow: 1 }}>
                <Skeleton variant="text" width="60%" height={15} />
                <Skeleton variant="text" width="40%" height={24} />
              </Box>
            </Box>
          </Card>
        ))}
      </Box>

      {/* Main card description skeleton */}
      <Card variant="outlined">
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Skeleton variant="circular" width={24} height={24} />
            <Skeleton variant="text" width="20%" height={20} />
          </Box>
          <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2 }} />
        </CardContent>
      </Card>
    </Box>
  );
};
export default LoadingSkeleton;
