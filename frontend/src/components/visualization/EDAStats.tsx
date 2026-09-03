// src/components/visualization/EDAStats.tsx
import React from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Card,
  Chip,
} from '@mui/material';
import {
  DatasetOutlined as DataIcon,
  TableChartOutlined as ColIcon,
  HelpOutlined as NullIcon,
} from '@mui/icons-material';

interface EDAStatsProps {
  edaData: {
    status?: string;
    summary?: Record<string, any>;
    generated_reports?: string[];
    visualizations?: string[];
  };
}

export const EDAStats: React.FC<EDAStatsProps> = ({ edaData }) => {
  const summary = edaData.summary || {};
  
  const totalRows = summary.shape?.[0] || 'Unknown';
  const totalCols = summary.shape?.[1] || 'Unknown';
  const totalNulls = summary.total_missing || 0;
  const columnsList = summary.columns || {};

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* General Dataset Info using CSS Grid */}
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
          <DataIcon color="primary" sx={{ fontSize: 36 }} />
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              TOTAL RECORDS
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {totalRows.toLocaleString()}
            </Typography>
          </Box>
        </Card>

        <Card variant="outlined" sx={{ display: 'flex', alignItems: 'center', p: 2, gap: 2 }}>
          <ColIcon color="secondary" sx={{ fontSize: 36 }} />
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              COLUMNS
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {totalCols}
            </Typography>
          </Box>
        </Card>

        <Card variant="outlined" sx={{ display: 'flex', alignItems: 'center', p: 2, gap: 2 }}>
          <NullIcon color="warning" sx={{ fontSize: 36 }} />
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              MISSING DATA POINTS
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {totalNulls.toLocaleString()}
            </Typography>
          </Box>
        </Card>
      </Box>

      {/* Column Specifications Table */}
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 1 }}>
        Dataset Variables Summary
      </Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Column Name</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Data Type</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Null Count</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Unique Values</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Mean / Mode</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(columnsList).map(([colName, colMeta]: [string, any]) => (
              <TableRow key={colName} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell sx={{ fontWeight: 600 }}>{colName}</TableCell>
                <TableCell>
                  <Chip
                    label={colMeta.type || 'unknown'}
                    size="small"
                    variant="outlined"
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.7rem',
                      height: 20,
                    }}
                  />
                </TableCell>
                <TableCell sx={{ color: colMeta.null_count > 0 ? 'warning.main' : 'text.primary' }}>
                  {colMeta.null_count?.toLocaleString() || 0}
                </TableCell>
                <TableCell>{colMeta.unique_count?.toLocaleString() || 0}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                  {typeof colMeta.mean === 'number' 
                    ? colMeta.mean.toFixed(2) 
                    : String(colMeta.mean || colMeta.mode || '-')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Artifact paths generated */}
      {edaData.visualizations && edaData.visualizations.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 700 }}>
            EXPORTED PLOTLY VISUALIZATIONS
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {edaData.visualizations.map((path) => (
              <Typography key={path} variant="caption" color="primary" sx={{ display: 'block', wordBreak: 'break-all', fontWeight: 600 }}>
                🔗 {path.split('/').pop() || path}
              </Typography>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};
export default EDAStats;
