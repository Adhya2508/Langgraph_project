// src/hooks/usePipeline.ts
import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  cleanDataset,
  runEDA,
  runFeatures,
  runSegmentation,
  runExplainability,
  runRecommendations,
} from '../api/endpoints';
import type { PipelineEntry } from '../types/api';

export const usePipeline = () => {
  const queryClient = useQueryClient();
  const [history, setHistory] = useState<PipelineEntry[]>(() => {
    const saved = sessionStorage.getItem('pipeline-history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
      } catch {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    sessionStorage.setItem('pipeline-history', JSON.stringify(history));
  }, [history]);

  const addHistoryEntry = useCallback((entry: Omit<PipelineEntry, 'id' | 'timestamp'>) => {
    const newEntry: PipelineEntry = {
      ...entry,
      id: `pipeline-${Date.now()}`,
      timestamp: new Date(),
    };
    setHistory((prev) => [newEntry, ...prev]);
  }, []);

  const cleanMutation = useMutation({
    mutationFn: cleanDataset,
    onSuccess: (data) => {
      addHistoryEntry({
        step: 'clean_dataset',
        label: 'Data Cleaning',
        status: 'success',
        executionTime: data.report.execution_time,
        artifacts: [data.cleaned_dataset],
        response: data,
      });
      queryClient.invalidateQueries({ queryKey: ['health'] });
    },
    onError: (error: any) => {
      addHistoryEntry({
        step: 'clean_dataset',
        label: 'Data Cleaning',
        status: 'error',
        response: error.message,
      });
    },
  });

  const edaMutation = useMutation({
    mutationFn: runEDA,
    onSuccess: (data) => {
      addHistoryEntry({
        step: 'run_eda',
        label: 'Exploratory Data Analysis',
        status: 'success',
        artifacts: [...data.generated_reports, ...data.visualizations],
        response: data,
      });
      queryClient.invalidateQueries({ queryKey: ['health'] });
    },
    onError: (error: any) => {
      addHistoryEntry({
        step: 'run_eda',
        label: 'Exploratory Data Analysis',
        status: 'error',
        response: error.message,
      });
    },
  });

  const featuresMutation = useMutation({
    mutationFn: runFeatures,
    onSuccess: (data) => {
      addHistoryEntry({
        step: 'generate_customer_features',
        label: 'Feature Engineering',
        status: 'success',
        executionTime: data.report.execution_time,
        artifacts: [data.customer_features],
        response: data,
      });
      queryClient.invalidateQueries({ queryKey: ['health'] });
    },
    onError: (error: any) => {
      addHistoryEntry({
        step: 'generate_customer_features',
        label: 'Feature Engineering',
        status: 'error',
        response: error.message,
      });
    },
  });

  const segmentationMutation = useMutation({
    mutationFn: runSegmentation,
    onSuccess: (data) => {
      addHistoryEntry({
        step: 'run_segmentation',
        label: 'Customer Segmentation',
        status: 'success',
        artifacts: Object.values(data.generated_artifacts),
        response: data,
      });
      queryClient.invalidateQueries({ queryKey: ['health'] });
    },
    onError: (error: any) => {
      addHistoryEntry({
        step: 'run_segmentation',
        label: 'Customer Segmentation',
        status: 'error',
        response: error.message,
      });
    },
  });

  const explainMutation = useMutation({
    mutationFn: runExplainability,
    onSuccess: (data) => {
      addHistoryEntry({
        step: 'run_explainability',
        label: 'Explainability Engine',
        status: 'success',
        artifacts: data.generated_artifacts,
        response: data,
      });
      queryClient.invalidateQueries({ queryKey: ['health'] });
    },
    onError: (error: any) => {
      addHistoryEntry({
        step: 'run_explainability',
        label: 'Explainability Engine',
        status: 'error',
        response: error.message,
      });
    },
  });

  const recommendationsMutation = useMutation({
    mutationFn: runRecommendations,
    onSuccess: (data) => {
      addHistoryEntry({
        step: 'run_recommendations',
        label: 'Recommendation Engine',
        status: 'success',
        artifacts: Object.values(data.generated_artifacts),
        response: data,
      });
      queryClient.invalidateQueries({ queryKey: ['health'] });
    },
    onError: (error: any) => {
      addHistoryEntry({
        step: 'run_recommendations',
        label: 'Recommendation Engine',
        status: 'error',
        response: error.message,
      });
    },
  });

  const clearHistory = useCallback(() => {
    setHistory([]);
    sessionStorage.removeItem('pipeline-history');
  }, []);

  return {
    history,
    clearHistory,
    clean: cleanMutation,
    eda: edaMutation,
    features: featuresMutation,
    segmentation: segmentationMutation,
    explain: explainMutation,
    recommend: recommendationsMutation,
    isAnyPending:
      cleanMutation.isPending ||
      edaMutation.isPending ||
      featuresMutation.isPending ||
      segmentationMutation.isPending ||
      explainMutation.isPending ||
      recommendationsMutation.isPending,
  };
};
export default usePipeline;
