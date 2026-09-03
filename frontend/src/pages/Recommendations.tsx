// src/pages/Recommendations.tsx
import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  Avatar,
  TablePagination,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Stars as StarIcon,
  TrendingUp as RevenueIcon,
  CampaignOutlined as CampaignIcon,
  AssignmentTurnedIn as CompleteIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import useRecommendations from '../hooks/useRecommendations';
import Plot from 'react-plotly.js';

export const Recommendations: React.FC = () => {
  const [searchParams] = useSearchParams();
  const priorityFilter = searchParams.get('priority') || 'All';
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const {
    statsData,
    segmentRecsData,
    customerRecsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useRecommendations();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 2 }}>
        <CircularProgress size={50} />
        <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
          Generating campaign models and prioritizing customer targets...
        </Typography>
      </Box>
    );
  }

  if (isError || !statsData) {
    return (
      <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 600, mx: 'auto', textAlign: 'center' }}>
        <Alert severity="warning" sx={{ borderRadius: 3, textAlign: 'left' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Recommendations Unavailable</Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            {error?.message || 'Please upload a bank transaction database on the dashboard to build segments first.'}
          </Typography>
        </Alert>
        <Button variant="contained" color="primary" startIcon={<RefreshIcon />} onClick={() => refetch()} sx={{ alignSelf: 'center', borderRadius: 2 }}>
          Retry Fetching Campaigns
        </Button>
      </Box>
    );
  }

  const processedCount = statsData?.total_customers ?? 0;
  const highPriorityCount = statsData?.high_priority_customers_count ?? 0;

  // Convert segmentRecsData object to offerings cards list
  const segmentOfferings = Object.entries(segmentRecsData || {}).map(([segmentName, details]: [string, any], idx) => {
    let priority: 'Very High' | 'High' | 'Medium' = 'Medium';
    if (details.percentage < 15) priority = 'Very High';
    else if (details.percentage < 40) priority = 'High';

    return {
      id: idx + 1,
      product: details.products?.join(', ') || 'Premium Savings Upgrade',
      segment: segmentName,
      priority,
      incentive: details.recommendation,
      channel: details.products?.includes('Basic Credit Card Upgrade') ? 'Secure Mobile App Push' : 'Relationship Manager Call',
      expectedImpact: details.expected_benefit,
    };
  });

  const filteredOfferings = segmentOfferings.filter(
    (o) => priorityFilter === 'All' || o.priority === priorityFilter
  );

  // Individual customer recommendations records
  const customerList = customerRecsData || [];

  const filteredCustomers = customerList.filter((c: any) => {
    if (priorityFilter === 'All') return true;
    return c.priority?.toLowerCase().includes(priorityFilter.toLowerCase());
  });

  const handleExportCSV = () => {
    if (customerList.length === 0) return;
    
    const headers = 'Customer ID,Cluster ID,Business Label,Priority,Recommendation,Expected Benefit,Recommended Products';
    const csvRows = customerList.map((c: any) => 
      `"${c.customer_id}","${c.cluster_id}","${c.business_label}","${c.priority}","${c.recommendation}","${c.expected_benefit}","${c.recommended_products}"`
    );
    
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...csvRows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'targeted_leads_campaign_matrix.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Compile Priority distributions for Pie Chart
  const getPriorityPieData = () => {
    if (!customerList || customerList.length === 0) return [];
    
    const freq: Record<string, number> = {};
    customerList.forEach((c: any) => {
      const p = c.priority || 'Medium';
      freq[p] = (freq[p] || 0) + 1;
    });
    
    return [
      {
        labels: Object.keys(freq),
        values: Object.values(freq),
        type: 'pie' as const,
        hole: 0.4,
        textinfo: 'percent+label',
      }
    ];
  };

  // Compile Product distributions for Bar Chart
  const getProductBarData = () => {
    if (!customerList || customerList.length === 0) return [];
    
    const freq: Record<string, number> = {};
    customerList.forEach((c: any) => {
      const products = String(c.recommended_products || '').split(',').map(x => x.trim());
      products.forEach(p => {
        if (p) {
          freq[p] = (freq[p] || 0) + 1;
        }
      });
    });
    
    return [
      {
        x: Object.keys(freq),
        y: Object.values(freq),
        type: 'bar' as const,
        marker: { color: '#009688' },
      }
    ];
  };

  return (
    <Box sx={{ width: '100%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3.5 }}>
      {/* KPI Cards Row */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 340px))',
          gap: 2.5,
          width: '100%',
        }}
      >
        <Card variant="outlined" sx={{ width: '100%' }}>
          <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'rgba(30, 136, 229, 0.1)', color: 'primary.main' }}>
              <CompleteIcon />
            </Avatar>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>AUDITED RECORDS</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>{processedCount.toLocaleString()}</Typography>
            </Box>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ width: '100%' }}>
          <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'rgba(63, 81, 181, 0.1)', color: 'secondary.main' }}>
              <CampaignIcon />
            </Avatar>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>CAMPAIGN OFFERINGS</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>{segmentOfferings.length}</Typography>
            </Box>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ width: '100%' }}>
          <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', color: 'error.main' }}>
              <StarIcon />
            </Avatar>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>HIGH PRIORITY LEADS</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>{highPriorityCount.toLocaleString()}</Typography>
            </Box>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ width: '100%' }}>
          <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)', color: 'success.main' }}>
              <RevenueIcon />
            </Avatar>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>ESTIMATED IMPACT</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>High Efficiency</Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Segment-wise Recommendation Cards */}
      <Box sx={{ width: '100%' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
          Product Offerings & Segment-Wise Campaigns
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 340px))',
            gap: 3,
            width: '100%',
          }}
        >
          {filteredOfferings.map((rec) => (
            <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', width: '100%' }} key={rec.id}>
              <CardContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, height: 44, overflow: 'hidden' }}>
                    {rec.product}
                  </Typography>
                  <Chip
                    label={rec.priority}
                    size="small"
                    color={rec.priority === 'Very High' || rec.priority === 'High' ? 'error' : 'warning'}
                    sx={{ fontWeight: 700 }}
                  />
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>TARGET COHORT</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{rec.segment}</Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>PROMOTIONAL OFFER</Typography>
                  <Typography variant="body2" color="text.secondary">{rec.incentive}</Typography>
                </Box>

                <Box sx={{ mt: 'auto', pt: 2, display: 'flex', justifyContent: 'space-between', borderTop: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ maxWidth: '60%' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>EXPECTED IMPACT</Typography>
                    <Typography variant="subtitle2" color="success.main" sx={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {rec.expectedImpact}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>CHANNEL</Typography>
                    <Typography variant="subtitle2" color="primary.main" sx={{ fontWeight: 700 }}>
                      {rec.channel.split(' ').pop()}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>

      {/* Dynamic charts row */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1.2fr' },
          gap: 3.5,
          width: '100%',
        }}
      >
        <Card variant="outlined" sx={{ width: '100%' }}>
          <CardContent sx={{ p: 3, width: '100%' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
              Campaign Priority Allocation (Pie Chart)
            </Typography>
            <Box sx={{ width: '100%', height: 300, display: 'flex', justifyContent: 'center' }}>
              <Plot
                data={getPriorityPieData()}
                layout={{
                  autosize: true,
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  font: { family: 'Inter, sans-serif' },
                  margin: { t: 10, b: 30, l: 30, r: 20 },
                }}
                useResizeHandler={true}
                style={{ width: '100%', height: '100%' }}
                config={{ displayModeBar: false }}
              />
            </Box>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ width: '100%' }}>
          <CardContent sx={{ p: 3, width: '100%' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
              Recommended Products Distribution (Bar Chart)
            </Typography>
            <Box sx={{ width: '100%', height: 300, display: 'flex', justifyContent: 'center' }}>
              <Plot
                data={getProductBarData()}
                layout={{
                  autosize: true,
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  font: { family: 'Inter, sans-serif' },
                  margin: { t: 10, b: 40, l: 50, r: 20 },
                }}
                useResizeHandler={true}
                style={{ width: '100%', height: '100%' }}
                config={{ displayModeBar: false }}
              />
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Interactive Table with search, pagination and exporting */}
      <Card variant="outlined" sx={{ width: '100%' }}>
        <CardContent sx={{ p: 3, width: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Campaign Matrix Summary (Targeted Leads List)</Typography>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportCSV} sx={{ borderRadius: 2 }}>
              Export Matrix
            </Button>
          </Box>

          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, border: 'none', width: '100%' }}>
            <Table size="small" sx={{ width: '100%' }}>
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Customer ID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Target Cohort</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Priority</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Incentive Offer</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Target Products</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCustomers
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((c: any) => (
                    <TableRow key={c.customer_id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell sx={{ fontWeight: 700 }}>{c.customer_id}</TableCell>
                      <TableCell>{c.business_label}</TableCell>
                      <TableCell>
                        <Chip
                          label={c.priority}
                          size="small"
                          color={c.priority?.toLowerCase().includes('high') ? 'error' : 'default'}
                          variant="outlined"
                          sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>{c.recommendation}</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>{c.recommended_products}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredCustomers.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
          />
        </CardContent>
      </Card>
    </Box>
  );
};
export default Recommendations;
