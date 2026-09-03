// src/pages/DatasetAnalysis.tsx
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
  TablePagination,
  Button,
  Alert,
  CircularProgress,
  TextField,
  InputAdornment,
  Drawer,
  IconButton,
  Divider,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Search as SearchIcon,
  AccountBox as ProfileIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  AssessmentOutlined as ChartIcon,
} from '@mui/icons-material';
import useEDA from '../hooks/useEDA';
import { getCustomerProfile } from '../api/endpoints';
import Plot from 'react-plotly.js';

export const DatasetAnalysis: React.FC = () => {
  const [searchParams] = useSearchParams();
  const search = searchParams.get('q') || '';
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // TanStack React Query cached hooks integration
  const {
    edaData,
    correlationData,
    cleanedData,
    isLoading,
    isError,
    error,
    refetch,
  } = useEDA();

  // Customer ID search state
  const [searchCustId, setSearchCustId] = useState('');
  const [custProfile, setCustProfile] = useState<any>(null);
  const [custLoading, setCustLoading] = useState(false);
  const [custError, setCustError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Interactivity selects state
  const [selectedNumericCol, setSelectedNumericCol] = useState('balance');
  const [selectedCategoricalCol, setSelectedCategoricalCol] = useState('occupation');

  const handleCustSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchCustId.trim()) return;
    setCustLoading(true);
    setCustError(null);
    try {
      const profile = await getCustomerProfile(searchCustId.trim());
      setCustProfile(profile);
      setDrawerOpen(true);
    } catch (err: any) {
      setCustError('Customer ID not found in the recommendations audit registry.');
    } finally {
      setCustLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 2 }}>
        <CircularProgress size={50} />
        <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
          Loading automated exploratory dataset profiling...
        </Typography>
      </Box>
    );
  }

  if (isError || !edaData) {
    return (
      <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 600, mx: 'auto', textAlign: 'center' }}>
        <Alert severity="warning" sx={{ borderRadius: 3, textAlign: 'left' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>No Dataset Analysis Available</Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            {error?.message || 'Please upload a bank transaction database on the dashboard to trigger automatic profiling.'}
          </Typography>
        </Alert>
        <Button variant="contained" color="primary" startIcon={<RefreshIcon />} onClick={() => refetch()} sx={{ alignSelf: 'center', borderRadius: 2 }}>
          Retry Fetching Data
        </Button>
      </Box>
    );
  }

  const summary = (edaData?.summary as any);
  const overview = (summary?.dataset_overview as any) || {};
  const rows = overview?.rows ?? 0;
  const cols = overview?.columns ?? 0;
  const duplicates = overview?.duplicate_count ?? 0;
  const fileSize = overview?.memory_usage_bytes ?? 0;

  const totalMissing =
    summary?.missing_value_analysis?.all_columns?.reduce(
      (sum: number, col: any) => sum + col.missing_count,
      0
    ) ?? 0;

  const columnTypes = overview?.column_datatypes ?? {};

  // Compute datatypes summary
  const datatypesSummary: Record<string, number> = {};
  Object.values(columnTypes).forEach((t: any) => {
    datatypesSummary[String(t)] = (datatypesSummary[String(t)] || 0) + 1;
  });

  const missingMap = Object.fromEntries(
    (summary?.missing_value_analysis?.all_columns ?? []).map((c: any) => [c.column, c])
  );

  const stats = (summary?.basic_statistics as any) || {};
  const numericColumns = Object.keys(stats);

  const categoricalAnalysis = (summary?.categorical_column_analysis as any) || {};
  const categoricalColumns = Object.keys(categoricalAnalysis);

  const columnsList = Object.entries(columnTypes).map(([name, type]) => ({
    name,
    type,
    null_count: (missingMap[name] as any)?.missing_count ?? 0,
    unique_count: (stats[name] as any)?.count ?? (categoricalAnalysis[name] as any)?.unique_values_count ?? null,
    mean: (stats[name] as any)?.mean ?? '-',
  }));

  const filteredColumns = columnsList.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDownloadReport = (name: string, filename: string) => {
    const content = edaData?.summary;
    if (!content) return;
    
    let encodedUri = '';
    if (name === 'json') {
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(content, null, 2))}`;
      encodedUri = jsonString;
    } else if (name === 'stats' && stats) {
      const csvContent = ["Variable,Count,Mean,Median,Min,Max,StdDev,25%,75%", 
        ...Object.entries(stats).map(([colName, s]: [string, any]) => 
          `"${colName}",${s.count},${s.mean},${s.median},${s.min},${s.max},${s.std},${s["25%"]},${s["75%"]}`
        )
      ].join("\n");
      encodedUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
    } else if (name === 'correlation' && correlationData) {
      const headers = Object.keys(correlationData[0] || {}).join(',');
      const rowsCsv = correlationData.map((r: any) => Object.values(r).join(',')).join('\n');
      encodedUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(`${headers}\n${rowsCsv}`);
    }

    if (!encodedUri) return;
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Plotly Heatmap builder
  const getCorrelationPlot = (corrData: any[]) => {
    if (!corrData || corrData.length === 0) return [];
    
    const variables = Object.keys(corrData[0]).filter(k => k !== 'index' && k !== 'Unnamed: 0');
    const x = variables;
    const y = variables;
    const z = y.map(rowVar => {
      const record = corrData.find((r: any) => (r.index || r['Unnamed: 0']) === rowVar) || {};
      return x.map(colVar => record[colVar] ?? 0);
    });
    
    return [
      {
        x,
        y,
        z,
        type: 'heatmap' as const,
        colorscale: 'RdBu' as const,
        zmin: -1,
        zmax: 1,
        hovertemplate: 'X: %{x}<br>Y: %{y}<br>Correlation: %{z:.3f}<extra></extra>',
      }
    ];
  };

  // Local Distribution (Histogram) and Box plots of the selected numeric column
  const getSelectedNumericPlots = () => {
    if (!cleanedData || cleanedData.length === 0) return { hist: [], box: [] };
    const values = cleanedData.map((r: any) => Number(r[selectedNumericCol])).filter((v: number) => !isNaN(v));
    
    const hist = [
      {
        x: values,
        type: 'histogram' as const,
        marker: { color: '#1e88e5' },
        name: selectedNumericCol,
      }
    ];
    
    const box = [
      {
        y: values,
        type: 'box' as const,
        marker: { color: '#ff9800' },
        name: selectedNumericCol,
      }
    ];
    
    return { hist, box };
  };

  // Local Distribution (Bar/Pie) of selected categorical column
  const getSelectedCategoricalPlots = () => {
    if (!cleanedData || cleanedData.length === 0) return { bar: [], pie: [] };
    
    const values = cleanedData.map((r: any) => String(r[selectedCategoricalCol] ?? ''));
    const freq: Record<string, number> = {};
    values.forEach((v: string) => { freq[v] = (freq[v] || 0) + 1; });
    
    const x = Object.keys(freq);
    const y = Object.values(freq);
    
    const bar = [
      {
        x,
        y,
        type: 'bar' as const,
        marker: { color: '#4caf50' },
      }
    ];
    
    const pie = [
      {
        labels: x,
        values: y,
        type: 'pie' as const,
        textinfo: 'percent+label',
        hole: 0.4,
      }
    ];
    
    return { bar, pie };
  };

  const { hist: localHist, box: localBox } = getSelectedNumericPlots();
  const { bar: localCatBar, pie: localCatPie } = getSelectedCategoricalPlots();

  const qualityScore = summary?.data_quality_score?.score ?? 100;
  const qualityRating = summary?.data_quality_score?.classification ?? 'Excellent';

  const selectedColStats = stats[selectedNumericCol] || {};
  const selectedCatStats = categoricalAnalysis[selectedCategoricalCol] || { top_five_frequent: [] };

  return (
    <Box sx={{ width: '100%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3.5 }}>
      
      {/* Customer Profile Search Header */}
      <Card variant="outlined" sx={{ width: '100%', borderRadius: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
            Customer Audit ID Lookup Explorer
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Retrieve segment allocations, churn indexes, and priority marketing campaigns directly from backend indices.
          </Typography>
          <Box component="form" onSubmit={handleCustSearch} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Enter Customer Account ID (e.g. 15634602)..."
              value={searchCustId}
              onChange={(e) => setSearchCustId(e.target.value)}
              sx={{ flexGrow: 1, maxWidth: 500 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }
              }}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={custLoading}
              sx={{ borderRadius: 2, fontWeight: 700 }}
            >
              {custLoading ? <CircularProgress size={20} color="inherit" /> : 'Search Profile'}
            </Button>
          </Box>
          {custError && (
            <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block', fontWeight: 600 }}>
              {custError}
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Dataset Summary Row */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 2.5,
          width: '100%',
        }}
      >
        <Card variant="outlined" sx={{ width: '100%' }}>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>ROWS</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>{rows.toLocaleString()}</Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ width: '100%' }}>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>COLUMNS</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>{cols}</Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ width: '100%' }}>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>MISSING VALUES</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: totalMissing > 0 ? 'warning.main' : 'text.primary' }}>
              {totalMissing.toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ width: '100%' }}>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>DUPLICATES</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>{duplicates}</Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ width: '100%' }}>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>FILE SIZE</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>{(fileSize / 1024 / 1024).toFixed(2)} MB</Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Grid: Data Quality + DataTypes summary */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1.2fr 1fr' },
          gap: 3.5,
          width: '100%',
        }}
      >
        <Card variant="outlined" sx={{ width: '100%' }}>
          <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Dataset Health & Quality Score</Typography>
              <Chip
                label={`${qualityRating} Rating`}
                color={qualityScore >= 80 ? 'success' : qualityScore >= 60 ? 'warning' : 'error'}
                sx={{ fontWeight: 800 }}
              />
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3.5 }}>
              <CircularProgress
                variant="determinate"
                value={qualityScore}
                size={80}
                thickness={5.5}
                color={qualityScore >= 80 ? 'success' : 'warning'}
              />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: 900 }}>{qualityScore}%</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  The overall score reflects checks on missing values, duplicate values, invalid columns, and outlier density ratios.
                </Typography>
              </Box>
            </Box>
            <Divider />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ minWidth: 120 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>COMPLETENESS</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {(((rows * cols - totalMissing) / (rows * cols)) * 100).toFixed(2)}%
                </Typography>
              </Box>
              <Box sx={{ minWidth: 120 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>DUPLICATES RATIO</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{(duplicates / rows * 100).toFixed(2)}%</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Data Types Summary */}
        <Card variant="outlined" sx={{ width: '100%' }}>
          <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Data Types Breakdown</Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ border: 'none', borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Columns Count</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(datatypesSummary).map(([type, count]) => (
                    <TableRow key={type}>
                      <TableCell sx={{ fontWeight: 600 }}>{type}</TableCell>
                      <TableCell>{count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Box>

      {/* Variables specifications list */}
      <Card variant="outlined" sx={{ width: '100%' }}>
        <CardContent sx={{ p: 3, width: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <ChartIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Variables Specifications & Summary</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" size="small" onClick={() => handleDownloadReport('json', 'eda_full_report.json')} sx={{ borderRadius: 2 }}>
                JSON Report
              </Button>
              <Button variant="outlined" size="small" onClick={() => handleDownloadReport('stats', 'statistics.csv')} sx={{ borderRadius: 2 }}>
                Statistics CSV
              </Button>
            </Box>
          </Box>

          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, border: 'none', width: '100%' }}>
            <Table size="small" sx={{ width: '100%' }}>
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Variable Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Data Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Missing Count</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Unique Values</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Mean / Frequency Mode</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredColumns
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((colMeta: any) => (
                    <TableRow key={colMeta.name} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell sx={{ fontWeight: 600 }}>{colMeta.name}</TableCell>
                      <TableCell>{colMeta.type || 'unknown'}</TableCell>
                      <TableCell sx={{ color: colMeta.null_count > 0 ? 'warning.main' : 'text.primary' }}>
                        {colMeta.null_count}
                      </TableCell>
                      <TableCell>{colMeta.unique_count ?? '-'}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                        {typeof colMeta.mean === 'number' ? colMeta.mean.toLocaleString(undefined, {maximumFractionDigits:2}) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredColumns.length}
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

      {/* Interactive Numerical Analysis */}
      <Card variant="outlined" sx={{ width: '100%' }}>
        <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Numerical Variable Explorer</Typography>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="numeric-col-label">Select Column</InputLabel>
              <Select
                labelId="numeric-col-label"
                value={selectedNumericCol}
                label="Select Column"
                onChange={(e) => setSelectedNumericCol(e.target.value)}
              >
                {numericColumns.map((col) => (
                  <MenuItem key={col} value={col}>{col.toUpperCase()}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Column Stats Grid */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 2, width: '100%' }}>
            <Box>
              <Typography variant="caption" color="text.secondary">MEAN</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{selectedColStats.mean?.toLocaleString() ?? '-'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">MEDIAN</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{selectedColStats.median?.toLocaleString() ?? '-'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">STD DEV</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{selectedColStats.std?.toFixed(2) ?? '-'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">MIN</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{selectedColStats.min?.toLocaleString() ?? '-'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">MAX</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{selectedColStats.max?.toLocaleString() ?? '-'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">25% (Q1)</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{selectedColStats['25%']?.toLocaleString() ?? '-'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">75% (Q3)</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{selectedColStats['75%']?.toLocaleString() ?? '-'}</Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr' }, gap: 3 }}>
            {/* Histogram Plot */}
            <Box sx={{ height: 350 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Distribution Histogram</Typography>
              <Plot
                data={localHist}
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
            {/* Box plot */}
            <Box sx={{ height: 350 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Box Plot Spread</Typography>
              <Plot
                data={localBox}
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
          </Box>
        </CardContent>
      </Card>

      {/* Interactive Categorical Analysis */}
      <Card variant="outlined" sx={{ width: '100%' }}>
        <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Categorical Variable Explorer</Typography>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="categorical-col-label">Select Column</InputLabel>
              <Select
                labelId="categorical-col-label"
                value={selectedCategoricalCol}
                label="Select Column"
                onChange={(e) => setSelectedCategoricalCol(e.target.value)}
              >
                {categoricalColumns.map((col) => (
                  <MenuItem key={col} value={col}>{col.toUpperCase()}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1.2fr 1.2fr' }, gap: 3.5 }}>
            {/* Frequency Table */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Frequency Table (Top 5)</Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ border: 'none', borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Value</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Count</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">%</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedCatStats.top_five_frequent?.map((f: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell sx={{ fontWeight: 600 }}>{f.value}</TableCell>
                        <TableCell>{f.count?.toLocaleString()}</TableCell>
                        <TableCell align="right">{f.percentage?.toFixed(1)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            {/* Bar Chart */}
            <Box sx={{ height: 320 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Frequency Bar Chart</Typography>
              <Plot
                data={localCatBar}
                layout={{
                  autosize: true,
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  font: { family: 'Inter, sans-serif' },
                  margin: { t: 10, b: 40, l: 40, r: 20 },
                }}
                useResizeHandler={true}
                style={{ width: '100%', height: '100%' }}
                config={{ displayModeBar: false }}
              />
            </Box>

            {/* Pie Chart */}
            <Box sx={{ height: 320 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Proportion Pie Chart</Typography>
              <Plot
                data={localCatPie}
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
          </Box>
        </CardContent>
      </Card>

      {/* Correlation & Heatmap */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1.2fr 1fr' },
          gap: 3.5,
          width: '100%',
        }}
      >
        <Card variant="outlined" sx={{ width: '100%' }}>
          <CardContent sx={{ p: 3, width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Pearson Correlation Heatmap</Typography>
              <Button variant="outlined" size="small" onClick={() => handleDownloadReport('correlation', 'correlation_matrix.csv')} sx={{ borderRadius: 2 }}>
                Export Matrix
              </Button>
            </Box>
            <Box sx={{ width: '100%', height: 350, display: 'flex', justifyContent: 'center' }}>
              <Plot
                data={getCorrelationPlot(correlationData || [])}
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

        {/* Outliers Summary list */}
        <Card variant="outlined" sx={{ width: '100%' }}>
          <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Outliers Summary (IQR Method)</Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ border: 'none', borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Variable</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Outliers Detected</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries((summary?.outliers_summary as any) || {}).map(([col, count]: [string, any]) => (
                    <TableRow key={col}>
                      <TableCell sx={{ fontWeight: 600 }}>{col}</TableCell>
                      <TableCell sx={{ color: count > 0 ? 'error.main' : 'text.primary', fontWeight: count > 0 ? 700 : 400 }}>
                        {count?.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Box>

      {/* Sliding Drawer Side Panel for Customer Profile */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        slotProps={{
          paper: {
            sx: { width: { xs: '100%', sm: 450 }, p: 3.5, display: 'flex', flexDirection: 'column', gap: 3 }
          }
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ProfileIcon color="primary" sx={{ fontSize: 28 }} />
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Customer Profile Audit</Typography>
          </Box>
          <IconButton onClick={() => setDrawerOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider />

        {custProfile && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
            {/* Main Details Card */}
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>ACCOUNT ID</Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.main', mt: 0.5 }}>{custProfile.customer_id}</Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>AGE</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{custProfile.Age ?? '-'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>TENURE</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{custProfile.Tenure ?? '-'} Years</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>BALANCE</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>${custProfile.Balance?.toLocaleString() ?? '-'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>CREDIT SCORE</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{custProfile.CreditScore ?? '-'}</Typography>
              </Box>
            </Box>

            <Divider />

            {/* Segment Info */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>ASSIGNED SEGMENT</Typography>
              <Chip label={custProfile.business_label} color="primary" sx={{ fontWeight: 800, alignSelf: 'flex-start' }} />
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                <strong>Characteristics Profile:</strong> {custProfile.reason}
              </Typography>
            </Box>

            <Divider />

            {/* Risk & Recommendation */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, display: 'block', mb: 0.5 }}>RISK / PRIORITY LEVEL</Typography>
                <Chip
                  label={custProfile.priority}
                  color={custProfile.priority?.toLowerCase().includes('high') ? 'error' : 'default'}
                  size="small"
                  sx={{ fontWeight: 800 }}
                />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, display: 'block', mb: 0.5 }}>CAMPAIGN STRATEGY</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>{custProfile.recommendation}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  <strong>Recommended Products:</strong> {custProfile.recommended_products}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
      </Drawer>
    </Box>
  );
};
export default DatasetAnalysis;