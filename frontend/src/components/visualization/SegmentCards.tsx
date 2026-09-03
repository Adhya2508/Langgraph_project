// src/components/visualization/SegmentCards.tsx
import React from 'react';
import { Box, Card, CardContent, Typography, Avatar } from '@mui/material';
import {
  People as ClusterIcon,
  Tag as SizeIcon,
  Stars as SilhouetteIcon,
  Psychology as FeatureIcon,
} from '@mui/icons-material';

interface SegmentData {
  cluster: number;
  label: string;
  size: number;
  percentage: number;
  characteristics: string[];
}

interface SegmentCardsProps {
  segmentationData: {
    algorithm_used?: string;
    number_of_clusters?: number;
    best_silhouette_score?: number;
    generated_artifacts?: Record<string, string>;
  };
  explainData?: {
    clusters_explained?: number;
    business_summary?: string;
    clusters?: SegmentData[];
  };
}

export const SegmentCards: React.FC<SegmentCardsProps> = ({ segmentationData, explainData }) => {
  const businessSummary = explainData?.business_summary || '';
  const score = segmentationData.best_silhouette_score ?? 0;
  const numClusters = segmentationData.number_of_clusters ?? 0;
  const algo = segmentationData.algorithm_used ?? 'K-Means';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Overview Cards Row using CSS Grid */}
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
        <Card variant="outlined" sx={{ display: 'flex', alignItems: 'center', p: 1.5, gap: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', width: 44, height: 44 }}>
            <ClusterIcon />
          </Avatar>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              ALGORITHM
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
              {algo}
            </Typography>
          </Box>
        </Card>

        <Card variant="outlined" sx={{ display: 'flex', alignItems: 'center', p: 1.5, gap: 2 }}>
          <Avatar sx={{ bgcolor: 'secondary.main', color: 'secondary.contrastText', width: 44, height: 44 }}>
            <SizeIcon />
          </Avatar>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              CLUSTERS GENERATED
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {numClusters}
            </Typography>
          </Box>
        </Card>

        <Card variant="outlined" sx={{ display: 'flex', alignItems: 'center', p: 1.5, gap: 2 }}>
          <Avatar sx={{ bgcolor: 'success.main', color: 'success.contrastText', width: 44, height: 44 }}>
            <SilhouetteIcon />
          </Avatar>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              SILHOUETTE SCORE
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {score.toFixed(4)}
            </Typography>
          </Box>
        </Card>
      </Box>

      {/* Executive Summary Card */}
      {businessSummary && (
        <Card variant="outlined">
          <CardContent sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <FeatureIcon color="primary" /> Executive Summary
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                whiteSpace: 'pre-line',
                lineHeight: 1.7,
                fontSize: '0.9rem',
              }}
            >
              {businessSummary}
            </Typography>
          </CardContent>
        </Card>
      )}

      {!explainData?.clusters && (
        <Typography variant="caption" color="text.secondary" align="center" sx={{ display: 'block', mt: 1, fontWeight: 500 }}>
          Z-Score cluster characteristics can be viewed in detail in the artifacts directory.
        </Typography>
      )}
    </Box>
  );
};
export default SegmentCards;
