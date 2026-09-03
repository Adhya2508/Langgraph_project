// src/components/common/ErrorBoundary.tsx
import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { ErrorOutlined as ErrorIcon } from '@mui/icons-material';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', p: 3, bgcolor: 'background.default' }}>
          <Paper variant="outlined" sx={{ p: 4, maxWidth: 500, textAlign: 'center', borderRadius: 4 }}>
            <ErrorIcon color="error" sx={{ fontSize: 56, mb: 2 }} />
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
              Something went wrong.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {this.state.error?.message || 'An unexpected rendering error occurred inside the workspace UI.'}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => window.location.reload()}
              sx={{ fontWeight: 600 }}
            >
              Reload Platform
            </Button>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
