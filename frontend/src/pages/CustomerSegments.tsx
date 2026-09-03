// src/pages/CustomerSegments.tsx
import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Alert,
  Avatar,
  CardActionArea,
  Divider,
  CircularProgress,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  GroupWorkOutlined as ClusterIcon,
  StarsOutlined as ScoreIcon,
  TimelineOutlined as QualityIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendIcon,
} from '@mui/icons-material';
import useSegmentation from '../hooks/useSegmentation';
import Plot from 'react-plotly.js';

export const CustomerSegments: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    clusterSummary,
    evaluationReport,
    segmentMapping,
    cleanedData,
    clusterExplanations,
    explainData,
    isLoading,
    isError,
    error,
    refetch,
  } = useSegmentation();

  const selectedCluster = Number(searchParams.get('cluster') || '0');

  // Scatter plot axis selects state
  const [xAxis, setXAxis] = useState('transactionspermonth');
  const [yAxis, setYAxis] = useState('balance');

  const handleSelectCluster = (id: number) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('cluster', String(id));
    setSearchParams(nextParams);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 2 }}>
        <CircularProgress size={50} />
        <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
          Analyzing customer clusters and model fit metrics...
        </Typography>
      </Box>
    );
  }

  if (isError || !clusterSummary || clusterSummary.length === 0) {
    return (
      <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 600, mx: 'auto', textAlign: 'center' }}>
        <Alert severity="warning" sx={{ borderRadius: 3, textAlign: 'left' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Clustering Data Unavailable</Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            {error?.message || 'Please upload a bank transaction database on the dashboard to run clustering.'}
          </Typography>
        </Alert>
        <Button variant="contained" color="primary" startIcon={<RefreshIcon />} onClick={() => refetch()} sx={{ alignSelf: 'center', borderRadius: 2 }}>
          Retry Fetching Segments
        </Button>
      </Box>
    );
  }

  const silhouette = evaluationReport?.best_silhouette_score ?? 0;
  const numClusters = evaluationReport?.number_of_clusters ?? clusterSummary.length;
  const dbIndex = evaluationReport?.metrics?.davies_bouldin_score ?? 0;
  const chIndex = evaluationReport?.metrics?.calinski_harabasz_score ?? 0;
  const algorithm = evaluationReport?.algorithm_used ?? 'K-Means Clustering';

  const qualityLabel = silhouette > 0.45 ? 'Excellent Fit' : silhouette > 0.3 ? 'Moderate Fit' : 'Weak Fit';


  // Get available numeric features for axis selections
  const numericFeatures = cleanedData && cleanedData.length > 0
    ? Object.keys(cleanedData[0]).filter(k => 
        k !== 'customerid' && k !== 'customer_id' && k !== 'cluster_id' && k !== 'business_label' && k !== 'likelysegment' &&
        typeof cleanedData[0][k] !== 'string'
      )
    : ['age', 'annualincome', 'balance', 'creditscore', 'tenureyears', 'productsowned', 'transactionspermonth', 'avgtransactionamount', 'loanamount'];

  // Map segment mappings into Plotly dataset
  const getPlotData = () => {
    if (!cleanedData || !segmentMapping) return [];
    
    const mapping = new Map<string, number>();
    segmentMapping.forEach((m: any) => {
      const cid = String(m.customer_id || '').trim().toUpperCase();
      mapping.set(cid, Number(m.cluster_id));
    });
    
    // Sample first 500 records
    const sample = cleanedData.slice(0, 500);
    const xCoords: number[] = [];
    const yCoords: number[] = [];
    const colors: number[] = [];
    const hoverTexts: string[] = [];
    
    sample.forEach((s: any) => {
      const cid = String(s.customerid || '').trim().toUpperCase();
      const clusterId = mapping.get(cid) ?? 0;
      const xVal = Number(s[xAxis]);
      const yVal = Number(s[yAxis]);
      
      xCoords.push(isNaN(xVal) ? 0 : xVal);
      yCoords.push(isNaN(yVal) ? 0 : yVal);
      colors.push(clusterId);
      hoverTexts.push(
        `Customer ID: ${s.customerid}<br>Cluster ID: ${clusterId}<br>${xAxis.toUpperCase()}: ${xVal.toLocaleString()}<br>${yAxis.toUpperCase()}: ${yVal.toLocaleString()}`
      );
    });
    
    return [
      {
        x: xCoords,
        y: yCoords,
        mode: 'markers' as const,
        type: 'scatter' as const,
        text: hoverTexts,
        hovertemplate: '%{text}<extra></extra>',
        marker: {
          color: colors,
          colorscale: 'Portland',
          size: 10,
          opacity: 0.8,
        },
      }
    ];
  };

  const getPiePlotData = () => {
    return [
      {
        labels: clusterSummary.map((c: any) => c.business_label),
        values: clusterSummary.map((c: any) => c.customer_count),
        type: 'pie' as const,
        textinfo: 'percent+label',
        hole: 0.4,
      }
    ];
  };

  const getBarPlotData = () => {
    return [
      {
        x: clusterSummary.map((c: any) => c.business_label),
        y: clusterSummary.map((c: any) => c.customer_count),
        type: 'bar' as const,
        marker: { color: '#3f51b5' },
      }
    ];
  };

  return (
    <Box sx={{ width: '100%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3.5 }}>
      {/* Model Summary Row via Box Grid (Auto-fill layout) */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 2.5,
          width: '100%',
        }}
      >
        <Card variant="outlined" sx={{ width: '100%' }}>
          <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'rgba(30, 136, 229, 0.1)', color: 'primary.main' }}>
              <ClusterIcon />
            </Avatar>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>CLUSTERS GENERATED</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>{numClusters}</Typography>
              <Typography variant="caption" color="text.secondary">{algorithm}</Typography>
            </Box>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ width: '100%' }}>
          <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)', color: 'success.main' }}>
              <ScoreIcon />
            </Avatar>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>SILHOUETTE SCORE</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>{silhouette.toFixed(4)}</Typography>
              <Typography variant="caption" color="text.secondary">{qualityLabel}</Typography>
            </Box>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ width: '100%' }}>
          <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'rgba(63, 81, 181, 0.1)', color: 'secondary.main' }}>
              <QualityIcon />
            </Avatar>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>DAVIES-BOULDIN INDEX</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>{dbIndex.toFixed(2)}</Typography>
              <Typography variant="caption" color="text.secondary">Lower is better</Typography>
            </Box>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ width: '100%' }}>
          <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'rgba(156, 39, 176, 0.1)', color: 'purple' }}>
              <TrendIcon />
            </Avatar>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>CALINSKI-HARABASZ</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>{chIndex.toFixed(0)}</Typography>
              <Typography variant="caption" color="text.secondary">Higher is better</Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Cluster Cards Selection */}
      <Box sx={{ width: '100%' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
          Customer Segments List
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 300px))',
            gap: 2,
            width: '100%',
          }}
        >
          {clusterSummary.map((cluster: any) => {
            const isSelected = selectedCluster === cluster.cluster_id;
            return (
              <Card
                key={cluster.cluster_id}
                variant="outlined"
                sx={{
                  width: '100%',
                  borderWidth: isSelected ? '2px' : '1px',
                  borderColor: isSelected ? 'primary.main' : 'divider',
                  bgcolor: isSelected ? 'rgba(30, 136, 229, 0.02)' : 'background.paper',
                  boxShadow: isSelected ? '0 4px 20px rgba(30, 136, 229, 0.08)' : 'none',
                  borderRadius: 3,
                }}
              >
                <CardActionArea onClick={() => handleSelectCluster(cluster.cluster_id)} sx={{ p: 2, width: '100%' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, height: 40, overflow: 'hidden' }}>
                    {cluster.business_label}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      {cluster.customer_count.toLocaleString()}
                    </Typography>
                    <Chip
                      label={`${cluster.percentage.toFixed(1)}%`}
                      size="small"
                      color={isSelected ? 'primary' : 'default'}
                      sx={{ fontWeight: 700 }}
                    />
                  </Box>
                </CardActionArea>
              </Card>
            );
          })}
        </Box>
      </Box>

      {/* Interactive Scatter Plot */}
      <Card variant="outlined" sx={{ width: '100%' }}>
        <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Interactive Cluster Allocation Map
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel id="x-axis-label">X-Axis</InputLabel>
                <Select
                  labelId="x-axis-label"
                  value={xAxis}
                  label="X-Axis"
                  onChange={(e) => setXAxis(e.target.value)}
                >
                  {numericFeatures.map(f => (
                    <MenuItem key={f} value={f}>{f.toUpperCase()}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel id="y-axis-label">Y-Axis</InputLabel>
                <Select
                  labelId="y-axis-label"
                  value={yAxis}
                  label="Y-Axis"
                  onChange={(e) => setYAxis(e.target.value)}
                >
                  {numericFeatures.map(f => (
                    <MenuItem key={f} value={f}>{f.toUpperCase()}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>

          <Box sx={{ width: '100%', height: 400, display: 'flex', justifyContent: 'center' }}>
            <Plot
              data={getPlotData()}
              layout={{
                autosize: true,
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { family: 'Inter, sans-serif' },
                margin: { t: 10, b: 30, l: 40, r: 20 },
                xaxis: { title: xAxis.toUpperCase() },
                yaxis: { title: yAxis.toUpperCase() },
              }}
              useResizeHandler={true}
              style={{ width: '100%', height: '100%' }}
              config={{ displayModeBar: false }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Grid: Charts + Active Detail Explanations */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          gap: 3,
          width: '100%',
        }}
      >
        <Card variant="outlined" sx={{ width: '100%' }}>
          <CardContent sx={{ p: 3, width: '100%' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
              Segment Proportion (Pie Chart)
            </Typography>
            <Box sx={{ width: '100%', height: 320, display: 'flex', justifyContent: 'center' }}>
              <Plot
                data={getPiePlotData()}
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
              Segment Counts (Distribution Bar Chart)
            </Typography>
            <Box sx={{ width: '100%', height: 320, display: 'flex', justifyContent: 'center' }}>
              <Plot
                data={getBarPlotData()}
                layout={{
                  autosize: true,
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  font: { family: 'Inter, sans-serif' },
                  margin: { t: 10, b: 40, l: 45, r: 20 },
                }}
                useResizeHandler={true}
                style={{ width: '100%', height: '100%' }}
                config={{ displayModeBar: false }}
              />
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Cluster Summary Table */}
      <Card variant="outlined" sx={{ width: '100%' }}>
        <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Cluster Cohorts Summary Table</Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ border: 'none', borderRadius: 3 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Cluster ID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Business Label</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Cohort Size</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Percentage</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Avg Balance</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Avg Spend</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {clusterSummary.map((c: any) => (
                  <TableRow key={c.cluster_id}>
                    <TableCell sx={{ fontWeight: 700 }}>{c.cluster_id}</TableCell>
                    <TableCell>{c.business_label}</TableCell>
                    <TableCell>{c.customer_count?.toLocaleString()}</TableCell>
                    <TableCell>{c.percentage?.toFixed(2)}%</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>${c.average_balance?.toLocaleString(undefined, {maximumFractionDigits:0})}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>${c.average_spending?.toLocaleString(undefined, {maximumFractionDigits:0})}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Explainability Engine Segment Cards */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Explainability Profiles & Business Interpretations</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
          {clusterSummary.map((c: any) => {
            const exp = clusterExplanations?.[String(c.cluster_id)] || {};
            return (
              <Card key={c.cluster_id} variant="outlined" sx={{ borderRadius: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
                <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main' }}>
                      {c.business_label}
                    </Typography>
                    <Chip label={`${c.percentage?.toFixed(1)}% of population`} size="small" />
                  </Box>
                  <Divider />
                  
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>NATURAL LANGUAGE PROFILE</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                      {exp.natural_language_explanation || `This segment holds ${c.customer_count?.toLocaleString()} active customers, averaging a balance of $${c.average_balance?.toLocaleString(undefined, {maximumFractionDigits:0})} across products.`}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>DISTINGUISHING METRICS</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {exp.key_distinguishing_features?.map((f: string, i: number) => (
                        <Chip key={i} label={f.replace(/_/g, ' ')} size="small" variant="outlined" />
                      )) || c.top_characteristics?.map((f: string, i: number) => (
                        <Chip key={i} label={f.replace(/_/g, ' ')} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </Box>

                  <Box sx={{ mt: 'auto', pt: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>COHORT ACTIONS</Typography>
                    <Alert severity="info" sx={{ borderRadius: 2, py: 0.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        {c.cluster_id === 0 
                          ? 'Target with core fee discount offers, high yield savings, and mobile app push tools.' 
                          : 'Target with premium visa credit card invites, secure portals, and customized RM calls.'
                        }
                      </Typography>
                    </Alert>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      </Box>

      {/* General Business Summary */}
      <Card variant="outlined" sx={{ width: '100%' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>
            Business Segment Intelligence Explanations
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line', lineHeight: 1.7 }}>
            {explainData?.business_summary || 'No explainability summaries registered yet.'}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};
export default CustomerSegments;
