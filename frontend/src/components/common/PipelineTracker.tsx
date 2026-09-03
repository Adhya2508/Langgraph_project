// src/components/common/PipelineTracker.tsx
import React from 'react';
import { Box, Typography, Paper, useTheme } from '@mui/material';
import {
  CheckCircleRounded as SuccessIcon,
  ErrorRounded as ErrorIcon,
  HourglassEmptyRounded as PendingIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

export interface PipelineStage {
  id: string;
  label: string;
  description: string;
  status: 'idle' | 'running' | 'success' | 'error';
}

interface PipelineTrackerProps {
  stages: PipelineStage[];
}

export const PipelineTracker: React.FC<PipelineTrackerProps> = ({ stages }) => {
  const theme = useTheme();

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        borderRadius: 4,
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(16, 23, 37, 0.6)' : '#ffffff',
        backdropFilter: 'blur(12px)',
      }}
    >
      <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700, mb: 2.5, letterSpacing: '0.5px' }}>
        PIPELINE STAGE METRICS
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {stages.map((stage, idx) => {
          const isCompleted = stage.status === 'success';
          const isRunning = stage.status === 'running';
          const isError = stage.status === 'error';

          return (
            <Box
              key={stage.id}
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 2,
                position: 'relative',
              }}
            >
              {/* Connector line between steps */}
              {idx < stages.length - 1 && (
                <Box
                  sx={{
                    position: 'absolute',
                    left: 13,
                    top: 28,
                    bottom: -18,
                    width: 2,
                    bgcolor: isCompleted 
                      ? 'success.main' 
                      : isRunning 
                        ? 'primary.main' 
                        : 'divider',
                    opacity: 0.7,
                    zIndex: 0,
                    transition: 'all 0.4s ease',
                  }}
                />
              )}

              {/* Status Circle Indicator */}
              <Box sx={{ zIndex: 1, position: 'relative', mt: 0.2 }}>
                {isRunning ? (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                  >
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 12px rgba(99, 102, 241, 0.8)',
                      }}
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                        style={{ display: 'flex' }}
                      >
                        <PendingIcon sx={{ color: 'primary.contrastText', fontSize: 16 }} />
                      </motion.div>
                    </Box>
                  </motion.div>
                ) : isCompleted ? (
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      bgcolor: 'success.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <SuccessIcon sx={{ color: 'success.contrastText', fontSize: 18 }} />
                  </Box>
                ) : isError ? (
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      bgcolor: 'error.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 10px rgba(239, 68, 68, 0.4)',
                    }}
                  >
                    <ErrorIcon sx={{ color: 'error.contrastText', fontSize: 18 }} />
                  </Box>
                ) : (
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      border: `2.5px solid ${theme.palette.divider}`,
                      bgcolor: 'background.paper',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'text.disabled' }} />
                  </Box>
                )}
              </Box>

              {/* Title & Description */}
              <Box sx={{ flexGrow: 1 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    color: isCompleted ? 'success.main' : isRunning ? 'primary.main' : isError ? 'error.main' : 'text.primary',
                    transition: 'all 0.3s ease',
                  }}
                >
                  {stage.label}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2 }}>
                  {stage.description}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
};
export default PipelineTracker;
