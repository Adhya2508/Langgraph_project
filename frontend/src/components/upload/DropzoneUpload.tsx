// src/components/upload/DropzoneUpload.tsx
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Typography,
  LinearProgress,
  IconButton,
  Button,
  useTheme,
  Card,
  Avatar,
  CircularProgress,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Close as CloseIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  DescriptionOutlined as FileIcon,
} from '@mui/icons-material';
import { useUpload } from '../../hooks/useUpload';
import { motion, AnimatePresence } from 'framer-motion';

interface DropzoneUploadProps {
  uploadState: ReturnType<typeof useUpload>;
  onSuccess?: () => void;
}

export const DropzoneUpload: React.FC<DropzoneUploadProps> = ({ uploadState, onSuccess }) => {
  const theme = useTheme();
  const { mutate: upload, isPending, isSuccess, isError, error, progress, data, resetUpload, isProcessing, processingStep } = uploadState;
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
    }
  }, []);

  const handleUploadSubmit = () => {
    if (selectedFile) {
      upload(selectedFile);
    }
  };

  const handleCancelFile = () => {
    setSelectedFile(null);
    resetUpload();
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    disabled: isPending || isProcessing,
  });

  return (
    <Box sx={{ width: '100%', minHeight: 180, position: 'relative' }}>
      <AnimatePresence mode="wait">
        {/* State 1: Dropzone area */}
        {!selectedFile && !isPending && !isProcessing && !isSuccess && !isError && (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Box
              {...getRootProps()}
              sx={{
                border: `2px dashed ${
                  isDragActive ? theme.palette.primary.main : theme.palette.divider
                }`,
                borderRadius: 4,
                p: 5,
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                bgcolor: isDragActive ? 'rgba(99, 102, 241, 0.04)' : 'transparent',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)',
                },
              }}
            >
              <input {...getInputProps()} />
              <UploadIcon color="primary" sx={{ fontSize: 52, mb: 2 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                {isDragActive ? 'Drop your CSV file here' : 'Drag & drop bank dataset'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Upload bank CSV records to build clusters
              </Typography>
            </Box>
          </motion.div>
        )}

        {/* State 2: Selected file preview before upload */}
        {selectedFile && !isPending && !isProcessing && !isSuccess && !isError && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <Card variant="outlined" sx={{ p: 3, borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'rgba(99, 102, 241, 0.1)', color: 'primary.main', width: 48, height: 48 }}>
                  <FileIcon />
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>
                    {selectedFile.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Type: CSV Document | Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </Typography>
                </Box>
                <IconButton onClick={handleCancelFile} size="small" color="error">
                  <CloseIcon />
                </IconButton>
              </Box>

              <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
                <Button variant="outlined" color="inherit" onClick={handleCancelFile}>
                  Cancel
                </Button>
                <Button variant="contained" color="primary" onClick={handleUploadSubmit}>
                  Upload File
                </Button>
              </Box>
            </Card>
          </motion.div>
        )}

        {/* State 3: Upload or processing in progress */}
        {(isPending || isProcessing) && (
          <motion.div
            key="progress"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Box sx={{ p: 4, border: `1px solid ${theme.palette.divider}`, borderRadius: 4, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <CircularProgress size={40} />
              <Typography variant="body1" sx={{ fontWeight: 700 }}>
                {processingStep || 'Uploading transaction records...'}
              </Typography>
              {progress > 0 && progress < 100 && (
                <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                  <Box sx={{ flexGrow: 1, position: 'relative' }}>
                    <LinearProgress
                      variant="determinate"
                      value={progress}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: theme.palette.mode === 'dark' ? '#1e293b' : '#e2e8f0',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 4,
                          background: 'linear-gradient(90deg, #818cf8 0%, #c084fc 100%)',
                        },
                      }}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                    {progress}%
                  </Typography>
                </Box>
              )}
            </Box>
          </motion.div>
        )}

        {/* State 4: Upload Success */}
        {isSuccess && data && !isProcessing && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', damping: 15 }}
          >
            <Box
              sx={{
                p: 3,
                border: `1.5px solid ${theme.palette.success.main}`,
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.03)' : 'rgba(16, 185, 129, 0.01)',
                borderRadius: 4,
                position: 'relative',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'success.main', color: 'success.contrastText', width: 44, height: 44 }}>
                  <SuccessIcon />
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'success.main' }}>
                    Successfully Uploaded & Processed!
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    File: <strong>{data.filename}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Size: <strong>{data.file_size}</strong> | Rows: <strong>{data.rows}</strong> | Columns: <strong>{data.columns}</strong>
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ mt: 2.5, display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
                <Button size="small" variant="outlined" color="primary" onClick={handleCancelFile}>
                  Upload Another
                </Button>
                {onSuccess && (
                  <Button size="small" variant="contained" color="primary" onClick={onSuccess}>
                    Continue Workspace
                  </Button>
                )}
              </Box>
            </Box>
          </motion.div>
        )}

        {/* State 5: Upload Error */}
        {isError && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', damping: 15 }}
          >
            <Box
              sx={{
                p: 3,
                border: `1.5px solid ${theme.palette.error.main}`,
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.03)' : 'rgba(239, 68, 68, 0.01)',
                borderRadius: 4,
                position: 'relative',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'error.main', color: 'error.contrastText', width: 44, height: 44 }}>
                  <ErrorIcon />
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'error.main' }}>
                    File Upload Failed
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {error?.message ?? 'An unknown error occurred during validation.'}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ mt: 2.5, display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
                <Button size="small" variant="contained" color="error" onClick={handleCancelFile}>
                  Try Again
                </Button>
              </Box>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
};
export default DropzoneUpload;
