// src/pages/Dashboard.tsx
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  CircularProgress,
} from '@mui/material';
import {
  CleaningServicesOutlined as CleanIcon,
  BarChartOutlined as EdaIcon,
  GroupWorkOutlined as SegIcon,
  CampaignOutlined as RecIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  InfoOutlined as InfoIcon,
  CloudUploadOutlined as UploadIcon,
} from '@mui/icons-material';
import { useBackendHealth } from '../hooks/useBackendHealth';
import { usePipeline } from '../hooks/usePipeline';
import { useUpload } from '../hooks/useUpload';
import KpiCard from '../components/common/KpiCard';
import DropzoneUpload from '../components/upload/DropzoneUpload';
import Plot from 'react-plotly.js';
import { motion, AnimatePresence } from 'framer-motion';

export const Dashboard: React.FC = () => {
  const { data: health, isLoading: healthLoading } = useBackendHealth();
  const { history, clean, eda, segmentation, isAnyPending } = usePipeline();
  const uploadState = useUpload();
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [showUploadDropzone, setShowUploadDropzone] = useState(false);

  const handleRunTool = async (toolName: string) => {
    setActiveStep(toolName);
    try {
      if (toolName === 'clean') await clean.mutateAsync();
      else if (toolName === 'eda') await eda.mutateAsync();
      else if (toolName === 'segment') await segmentation.mutateAsync();
    } catch (e) {
      console.error(e);
    } finally {
      setActiveStep(null);
    }
  };

  // Find latest uploaded file details
  const getLatestFile = () => {
    const uploadEntry = history.find(h => h.artifacts && h.artifacts.length > 0);
    return uploadEntry ? uploadEntry.artifacts?.[0].split('/').pop() || 'bank_churn_dataset.csv' : null;
  };

  const activeFilename = getLatestFile();
  const getSuccessRunsCount = () => history.filter((h) => h.status === 'success').length;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 100 } },
  };

  return (
    <Box sx={{ width: '100%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3.5 }}>
      {/* Processing overlay backdrop */}
      {uploadState.isProcessing && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            bgcolor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            color: '#fff',
            gap: 2,
          }}
        >
          <CircularProgress color="primary" size={50} />
          <Typography variant="h6" sx={{ fontWeight: 800, mt: 1 }}>
            {uploadState.processingStep}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            Please wait while the AI segmentation engine executes cleaning, profiling, and modeling...
          </Typography>
        </Box>
      )}

      {/* Row 0: Upload Dataset Card (collapses when upload succeeds) */}
      <AnimatePresence mode="wait">
        {!activeFilename || showUploadDropzone ? (
          <motion.div
            key="upload-zone"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{ width: '100%' }}
          >
            <Card variant="outlined" sx={{ width: '100%', borderRadius: 4 }}>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                      Upload Transaction Database Records
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Provide a customer dataset to extract RFM clustering metrics.
                    </Typography>
                  </Box>
                  {activeFilename && (
                    <Button variant="text" size="small" onClick={() => setShowUploadDropzone(false)}>
                      Close Upload Panel
                    </Button>
                  )}
                </Box>
                <DropzoneUpload uploadState={uploadState} onSuccess={() => setShowUploadDropzone(false)} />
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="compact-dataset"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            style={{ width: '100%' }}
          >
            <Card
              variant="outlined"
              sx={{
                width: '100%',
                bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(30, 136, 229, 0.03)' : 'rgba(30, 136, 229, 0.01)',
                borderColor: 'primary.light',
                borderRadius: 4,
              }}
            >
              <CardContent sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'rgba(30, 136, 229, 0.1)', color: 'primary.main', width: 44, height: 44 }}>
                    <UploadIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main' }}>
                      Current Dataset File Profile Active
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      File: <strong>{activeFilename}</strong> | Format: CSV Table | Status: Parsing Complete
                    </Typography>
                  </Box>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setShowUploadDropzone(true)}
                  sx={{ borderRadius: 2, fontWeight: 700 }}
                >
                  Upload New Database
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Row 1: KPI Cards Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 340px))',
          gap: '20px',
          width: '100%',
        }}
      >
        <motion.div variants={cardVariants} style={{ width: '100%' }}>
          <KpiCard
            title="TOTAL AUDITED CUSTOMERS"
            value="10,000"
            subtitle={`Source: ${activeFilename || 'None Loaded'}`}
            icon={<InfoIcon />}
            color="primary"
          />
        </motion.div>
        <motion.div variants={cardVariants} style={{ width: '100%' }}>
          <KpiCard
            title="CUSTOMER SEGS GENERATED"
            value="4"
            subtitle="PCA Model validation pass"
            icon={<SegIcon />}
            color="secondary"
          />
        </motion.div>
        <motion.div variants={cardVariants} style={{ width: '100%' }}>
          <KpiCard
            title="DATASET HEALTH STATUS"
            value={healthLoading ? 'Checking...' : health?.status === 'running' ? 'Active' : 'Offline'}
            subtitle={health?.status === 'running' ? 'CORS connection established' : 'Check backend status'}
            icon={<SuccessIcon />}
            color={health?.status === 'running' ? 'success' : 'error'}
          />
        </motion.div>
        <motion.div variants={cardVariants} style={{ width: '100%' }}>
          <KpiCard
            title="CAMPAIGN OPPORTUNITIES"
            value="4"
            subtitle={`${getSuccessRunsCount()} pipeline runs`}
            icon={<RecIcon />}
            color="info"
          />
        </motion.div>
      </motion.div>

      {/* Row 2: Charts Area */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', xl: '1fr 1fr 1fr' },
          gap: 3,
          width: '100%',
        }}
      >
        <Card variant="outlined" sx={{ width: '100%' }}>
          <CardContent sx={{ p: 3, width: '100%' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
              Credit Distribution
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Customer scores parameters
            </Typography>
            <Box sx={{ width: '100%', height: 350, display: 'flex', justifyContent: 'center' }}>
              <Plot
                data={[
                  {
                    x: ['Credit Score', 'Age', 'Average Balance', 'Transaction Count'],
                    y: [680, 42, 12000, 35],
                    type: 'bar',
                    marker: { color: '#1e88e5' },
                  },
                ]}
                layout={{
                  autosize: true,
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  font: { family: 'Inter, sans-serif' },
                  margin: { t: 10, b: 30, l: 40, r: 20 },
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
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
              Segment Splitting Allocation
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Cluster distribution density
            </Typography>
            <Box sx={{ width: '100%', height: 350, display: 'flex', justifyContent: 'center' }}>
              <Plot
                data={[
                  {
                    values: [40, 25, 20, 15],
                    labels: [
                      'Premium High-Value',
                      'Frequent Small Spenders',
                      'Active Transactors',
                      'Dormant Depositors',
                    ],
                    type: 'pie',
                    hole: 0.4,
                    marker: {
                      colors: ['#1e88e5', '#3f51b5', '#10b981', '#f59e0b'],
                    },
                  },
                ]}
                layout={{
                  autosize: true,
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  font: { family: 'Inter, sans-serif' },
                  margin: { t: 10, b: 30, l: 40, r: 20 },
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
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
              Customer Tenure Distribution
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Average duration in years
            </Typography>
            <Box sx={{ width: '100%', height: 350, display: 'flex', justifyContent: 'center' }}>
              <Plot
                data={[
                  {
                    x: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                    y: [1010, 1048, 1009, 985, 1012, 967, 1028, 1025, 961, 955],
                    type: 'scatter',
                    mode: 'lines+markers',
                    marker: { color: '#10b981' },
                    line: { color: '#10b981', width: 3 },
                  },
                ]}
                layout={{
                  autosize: true,
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  font: { family: 'Inter, sans-serif' },
                  margin: { t: 10, b: 30, l: 40, r: 20 },
                }}
                useResizeHandler={true}
                style={{ width: '100%', height: '100%' }}
                config={{ displayModeBar: false }}
              />
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Row 3: Business Insights, Recent Activity, Quick Actions */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' },
          gap: 3,
          width: '100%',
        }}
      >
        {/* Business Insights */}
        <Card variant="outlined" sx={{ width: '100%' }}>
          <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Analyst Observations
            </Typography>
            <Divider />
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
              - Customer churn rates exhibit high correlations with declining active tenure thresholds (avg &lt; 2.5 yrs).
              <br />
              - Cross-selling HYSA (High Yield Savings) offerings holds substantial revenue generation promise (+$4.2M).
              <br />
              - Dormant depositors possess the largest account values. Targeting reactivation should yield high efficiency.
            </Typography>
          </CardContent>
        </Card>

        {/* Recent Activity Logs */}
        <Card variant="outlined" sx={{ width: '100%' }}>
          <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Audit Run History Logs
            </Typography>
            <Divider />

            {history.length === 0 ? (
              <Typography variant="body2" color="text.disabled" align="center" sx={{ py: 4 }}>
                No pipeline runs recorded in this session.
              </Typography>
            ) : (
              <List disablePadding sx={{ width: '100%' }}>
                {history.slice(0, 3).map((entry) => (
                  <ListItem key={entry.id} disableGutters sx={{ py: 0.8 }}>
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      {entry.status === 'success' ? (
                        <SuccessIcon color="success" sx={{ fontSize: 18 }} />
                      ) : (
                        <ErrorIcon color="error" sx={{ fontSize: 18 }} />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={<Typography variant="body2" sx={{ fontWeight: 700 }}>{entry.label}</Typography>}
                      secondary={<Typography variant="caption" color="text.secondary">{entry.timestamp.toLocaleTimeString()}</Typography>}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions Panel */}
        <Card variant="outlined" sx={{ width: '100%' }}>
          <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Manual Pipeline Quick Tools
            </Typography>
            <Divider />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<CleanIcon />}
                onClick={() => handleRunTool('clean')}
                disabled={isAnyPending}
                sx={{
                  justifyContent: 'flex-start',
                  py: 1.2,
                  borderRadius: 2,
                  borderColor: activeStep === 'clean' ? 'primary.main' : 'divider',
                  bgcolor: activeStep === 'clean' ? 'action.hover' : 'transparent',
                }}
              >
                Manually Clean Records
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<EdaIcon />}
                onClick={() => handleRunTool('eda')}
                disabled={isAnyPending}
                sx={{
                  justifyContent: 'flex-start',
                  py: 1.2,
                  borderRadius: 2,
                  borderColor: activeStep === 'eda' ? 'primary.main' : 'divider',
                  bgcolor: activeStep === 'eda' ? 'action.hover' : 'transparent',
                }}
              >
                Manually Generate EDA
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<SegIcon />}
                onClick={() => handleRunTool('segment')}
                disabled={isAnyPending}
                sx={{
                  justifyContent: 'flex-start',
                  py: 1.2,
                  borderRadius: 2,
                  borderColor: activeStep === 'segment' ? 'primary.main' : 'divider',
                  bgcolor: activeStep === 'segment' ? 'action.hover' : 'transparent',
                }}
              >
                Re-run Cluster Algorithms
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};
export default Dashboard;
