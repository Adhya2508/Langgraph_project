// src/components/visualization/VisualizationPanel.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  Alert,
  Skeleton,
  useTheme,
} from '@mui/material';
import {
  BarChartOutlined as EdaIcon,
  PieChartOutlined as SegIcon,
  CampaignOutlined as RecIcon,
  CleaningServicesOutlined as CleanIcon,
} from '@mui/icons-material';
import Plot from 'react-plotly.js';
import EDAStats from './EDAStats';
import SegmentCards from './SegmentCards';
import RecommendationTable from './RecommendationTable';
import type { VisType } from '../../hooks/useAgent';
import { motion, AnimatePresence } from 'framer-motion';

interface VisualizationPanelProps {
  activeVis: {
    type: VisType;
    data: any;
    label: string;
  };
  isLoading?: boolean;
}

export const VisualizationPanel: React.FC<VisualizationPanelProps> = ({ activeVis, isLoading }) => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    if (activeVis.type === 'clean') setTabValue(0);
    else if (activeVis.type === 'eda') setTabValue(1);
    else if (activeVis.type === 'segmentation' || activeVis.type === 'explain') setTabValue(2);
    else if (activeVis.type === 'recommendations') setTabValue(3);
  }, [activeVis.type]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getCleanReportData = () => {
    if (activeVis.type === 'clean') return activeVis.data;
    return null;
  };

  const getEdaReportData = () => {
    if (activeVis.type === 'eda') return activeVis.data;
    if (activeVis.data?.steps_executed?.includes('run_eda')) return activeVis.data;
    return null;
  };

  const getSegReportData = () => {
    if (activeVis.type === 'segmentation' || activeVis.type === 'explain') return activeVis.data;
    if (activeVis.data?.steps_executed?.includes('run_segmentation')) return activeVis.data;
    return null;
  };

  const getRecReportData = () => {
    if (activeVis.type === 'recommendations') return activeVis.data;
    if (activeVis.data?.steps_executed?.includes('run_recommendations')) return activeVis.data;
    return null;
  };

  const renderSkeleton = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, p: 1 }}>
      <Skeleton variant="rounded" width="100%" height={120} sx={{ borderRadius: 3 }} />
      <Skeleton variant="text" width="60%" height={32} />
      <Skeleton variant="rounded" width="100%" height={240} sx={{ borderRadius: 3 }} />
    </Box>
  );

  const cleanData = getCleanReportData();
  const edaData = getEdaReportData();
  const segData = getSegReportData();
  const recData = getRecReportData();

  const outliersCount = cleanData?.report?.outliers_detected 
    ? Number(Object.values(cleanData.report.outliers_detected).reduce((a: any, b: any) => a + b, 0))
    : 0;

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        borderRadius: 4,
        border: `1px solid ${theme.palette.divider}`,
        overflow: 'hidden',
      }}
    >
      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          textColor="primary"
          indicatorColor="primary"
          sx={{ px: 1 }}
        >
          <Tab icon={<CleanIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Data Cleaning" sx={{ fontWeight: 700, minHeight: 52 }} />
          <Tab icon={<EdaIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="EDA Analytics" sx={{ fontWeight: 700, minHeight: 52 }} />
          <Tab icon={<SegIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Segmentation" sx={{ fontWeight: 700, minHeight: 52 }} />
          <Tab icon={<RecIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Recommendations" sx={{ fontWeight: 700, minHeight: 52 }} />
        </Tabs>
      </Box>

      {/* Dynamic View Tabpanels with AnimatePresence */}
      <Box sx={{ flexGrow: 1, p: 3, overflowY: 'auto', bgcolor: 'background.paper' }}>
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading-skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {renderSkeleton()}
            </motion.div>
          ) : (
            <Box>
              {tabValue === 0 && (
                <motion.div
                  key="tab-clean"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                >
                  {cleanData ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <Alert severity="success" sx={{ borderRadius: 3, fontWeight: 600 }}>
                        Data Cleaning completed. Found outliers and corrected formats.
                      </Alert>
                      <Card variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 800, mb: 2.5, letterSpacing: '0.5px' }}>
                          CLEANING STATS METRICS
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2.5 }}>
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Original Records</Typography>
                            <Typography variant="h5" sx={{ fontWeight: 800 }}>{cleanData.report?.original_rows || '0'}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Cleaned Records</Typography>
                            <Typography variant="h5" sx={{ fontWeight: 800 }}>{cleanData.report?.clean_rows || '0'}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Duplicates Removed</Typography>
                            <Typography variant="h5" sx={{ fontWeight: 800 }}>{cleanData.report?.duplicates_removed || 0}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Outliers Filtered</Typography>
                            <Typography variant="h5" sx={{ fontWeight: 800 }}>{outliersCount}</Typography>
                          </Box>
                        </Box>
                      </Card>
                    </Box>
                  ) : (
                    <Alert severity="info" sx={{ borderRadius: 3, fontWeight: 500 }}>
                      Run the <strong>Clean Dataset</strong> tool or ask the AI Orchestrator to clean your data.
                    </Alert>
                  )}
                </motion.div>
              )}

              {tabValue === 1 && (
                <motion.div
                  key="tab-eda"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                >
                  {edaData ? (
                    <Box>
                      <EDAStats edaData={edaData} />
                      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', width: '100%', minHeight: 320 }}>
                        <Plot
                          data={[
                            {
                              x: ['Credit Score', 'Age', 'Average Balance', 'Transaction Count'],
                              y: [680, 42, 12000, 35],
                              type: 'bar',
                              marker: { color: theme.palette.primary.main },
                            },
                          ]}
                          layout={{
                            autosize: true,
                            title: 'Descriptive Metric Means Overview',
                            paper_bgcolor: 'transparent',
                            plot_bgcolor: 'transparent',
                            font: { color: theme.palette.text.primary, family: 'Outfit, sans-serif' },
                            margin: { t: 50, b: 50, l: 50, r: 50 },
                          }}
                          useResizeHandler={true}
                          style={{ width: '100%', height: '100%' }}
                          config={{ displayModeBar: false }}
                        />
                      </Box>
                    </Box>
                  ) : (
                    <Alert severity="info" sx={{ borderRadius: 3, fontWeight: 500 }}>
                      Run the <strong>Run EDA</strong> action or ask the AI Orchestrator to describe insights.
                    </Alert>
                  )}
                </motion.div>
              )}

              {tabValue === 2 && (
                <motion.div
                  key="tab-seg"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                >
                  {segData ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <SegmentCards segmentationData={segData} explainData={activeVis.data} />
                      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', width: '100%', minHeight: 320 }}>
                        <Plot
                          data={[
                            {
                              values: [40, 25, 20, 15],
                              labels: [
                                'High-Value Premium Customers',
                                'Frequent Small Spenders',
                                'Active Digital Transactors',
                                'Dormant Customers',
                              ],
                              type: 'pie',
                              hole: 0.4,
                              marker: {
                                colors: [
                                  theme.palette.primary.main,
                                  theme.palette.secondary.main,
                                  theme.palette.success.main,
                                  theme.palette.warning.main,
                                ],
                              },
                            },
                          ]}
                          layout={{
                            autosize: true,
                            title: 'Customer Segments Distribution',
                            paper_bgcolor: 'transparent',
                            plot_bgcolor: 'transparent',
                            font: { color: theme.palette.text.primary, family: 'Outfit, sans-serif' },
                            margin: { t: 50, b: 50, l: 50, r: 50 },
                          }}
                          useResizeHandler={true}
                          style={{ width: '100%', height: '100%' }}
                          config={{ displayModeBar: false }}
                        />
                      </Box>
                    </Box>
                  ) : (
                    <Alert severity="info" sx={{ borderRadius: 3, fontWeight: 500 }}>
                      Run the <strong>Run Segmentation</strong> action to categorize your customers into groups.
                    </Alert>
                  )}
                </motion.div>
              )}

              {tabValue === 3 && (
                <motion.div
                  key="tab-rec"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                >
                  {recData ? (
                    <RecommendationTable recommendationData={recData} />
                  ) : (
                    <Alert severity="info" sx={{ borderRadius: 3, fontWeight: 500 }}>
                      Run the <strong>Recommend offerings</strong> tool to trigger personalized marketing campaigns.
                    </Alert>
                  )}
                </motion.div>
              )}
            </Box>
          )}
        </AnimatePresence>
      </Box>
    </Card>
  );
};
export default VisualizationPanel;
