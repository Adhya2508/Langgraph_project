// src/App.tsx
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeContextProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import AppLayout from './components/layout/AppLayout';
import { Box, LinearProgress } from '@mui/material';

// Lazy load pages for chunk splitting and optimized startup speeds
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DatasetAnalysis = lazy(() => import('./pages/DatasetAnalysis'));
const CustomerSegments = lazy(() => import('./pages/CustomerSegments'));
const Recommendations = lazy(() => import('./pages/Recommendations'));
const Profile = lazy(() => import('./pages/Profile'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

// Premium loader overlay for Suspense fallback
const LoadingFallback = () => (
  <Box sx={{ width: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1200 }}>
    <LinearProgress
      sx={{
        height: 3,
        bgcolor: 'transparent',
        '& .MuiLinearProgress-bar': {
          background: 'linear-gradient(90deg, #1e88e5 0%, #3f51b5 100%)',
        },
      }}
    />
  </Box>
);

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeContextProvider>
          <BrowserRouter>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                {/* Shell Layout with sidebar */}
                <Route path="/" element={<AppLayout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="analysis" element={<DatasetAnalysis />} />
                  <Route path="segments" element={<CustomerSegments />} />
                  <Route path="recommendations" element={<Recommendations />} />
                  <Route path="profile" element={<Profile />} />
                </Route>
                {/* Fallback redirect */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ThemeContextProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};
export default App;
