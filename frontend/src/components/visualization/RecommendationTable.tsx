// src/components/visualization/RecommendationTable.tsx
import React from 'react';
import {
  Box,
  Typography,
  Card,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
} from '@mui/material';
import {
  CampaignOutlined as CampaignIcon,
  CheckCircleOutlined as ProcessedIcon,
  PriorityHighOutlined as PriorityIcon,
  StarsOutlined as SparkIcon,
} from '@mui/icons-material';

interface RecommendationTableProps {
  recommendationData: {
    status?: string;
    customers_processed?: number;
    recommendations_generated?: number;
    high_priority_customers?: number;
    generated_artifacts?: Record<string, string>;
  };
}

export const RecommendationTable: React.FC<RecommendationTableProps> = ({ recommendationData }) => {
  const processed = recommendationData.customers_processed ?? 0;
  const generated = recommendationData.recommendations_generated ?? 0;
  const highPriority = recommendationData.high_priority_customers ?? 0;

  const offerings = [
    {
      product: 'High Yield Savings Account (HYSA)',
      segment: 'High Income Low Activity',
      priority: 'High',
      incentive: '1.5% APY bonus for 6 months on fresh deposits',
      channel: 'Email / Push Notification',
    },
    {
      product: 'Premium Infinite Credit Card',
      segment: 'High-Value Premium Customers',
      priority: 'Very High',
      incentive: '50,000 Reward Points + Waiver of first year annual fee',
      channel: 'Relationship Manager Call',
    },
    {
      product: 'Personal Loan & Debt Consolidation',
      segment: 'Frequent Small Spenders',
      priority: 'Medium',
      incentive: 'Pre-approved rate discount of 0.75%',
      channel: 'App Banner Advertisement',
    },
    {
      product: 'Digital Banking Activation',
      segment: 'Dormant Customers',
      priority: 'High',
      incentive: '$15 Cashback for completing 3 online bills pay transfers',
      channel: 'Direct SMS / App Alert',
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* KPI Cards using CSS Grid */}
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
        <Card variant="outlined" sx={{ display: 'flex', alignItems: 'center', p: 2, gap: 2 }}>
          <Avatar sx={{ bgcolor: 'info.main', color: 'info.contrastText', width: 44, height: 44 }}>
            <ProcessedIcon />
          </Avatar>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              CUSTOMERS PROCESSED
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {processed.toLocaleString()}
            </Typography>
          </Box>
        </Card>

        <Card variant="outlined" sx={{ display: 'flex', alignItems: 'center', p: 2, gap: 2 }}>
          <Avatar sx={{ bgcolor: 'success.main', color: 'success.contrastText', width: 44, height: 44 }}>
            <SparkIcon />
          </Avatar>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              CAMPAIGNS GENERATED
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {generated.toLocaleString()}
            </Typography>
          </Box>
        </Card>

        <Card variant="outlined" sx={{ display: 'flex', alignItems: 'center', p: 2, gap: 2 }}>
          <Avatar sx={{ bgcolor: 'error.main', color: 'error.contrastText', width: 44, height: 44 }}>
            <PriorityIcon />
          </Avatar>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              HIGH PRIORITY LEADS
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {highPriority.toLocaleString()}
            </Typography>
          </Box>
        </Card>
      </Box>

      {/* Offerings Table */}
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <CampaignIcon color="primary" /> Cross-Sell Offering Rules Matrix
      </Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Recommended Product</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Target Segment</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Priority</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Promotional Offer / Incentive</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Marketing Channel</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {offerings.map((offer, idx) => (
              <TableRow key={idx} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell sx={{ fontWeight: 700 }}>{offer.product}</TableCell>
                <TableCell>{offer.segment}</TableCell>
                <TableCell>
                  <Chip
                    label={offer.priority}
                    size="small"
                    color={offer.priority === 'Very High' || offer.priority === 'High' ? 'error' : 'warning'}
                    variant="outlined"
                    sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                  />
                </TableCell>
                <TableCell>{offer.incentive}</TableCell>
                <TableCell sx={{ fontWeight: 500, color: 'text.secondary' }}>{offer.channel}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Artifact paths generated */}
      {recommendationData.generated_artifacts && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 700 }}>
            RECOMMENDATION OUTPUT ARTIFACTS
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {Object.entries(recommendationData.generated_artifacts).map(([key, path]) => (
              <Typography key={key} variant="caption" color="primary" sx={{ display: 'block', wordBreak: 'break-all', fontWeight: 600 }}>
                🔗 {key}: {path.split('/').pop() || path}
              </Typography>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};
export default RecommendationTable;
