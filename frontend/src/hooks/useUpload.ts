// src/hooks/useUpload.ts
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadDataset } from '../api/endpoints';
import { queryKeys } from '../api/queryKeys';
import type { UploadResponse } from '../types/api';
import { usePipeline } from './usePipeline';

export const useUpload = () => {
  const queryClient = useQueryClient();
  const { clean, eda, features, segmentation, explain, recommend } = usePipeline();
  const [progress, setProgress] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');

  const mutation = useMutation<UploadResponse, Error, File>({
    mutationFn: (file: File) => {
      setProgress(0);
      setIsProcessing(true);
      setProcessingStep('Uploading Dataset');
      return uploadDataset(file, (progressEvent) => {
        const total = progressEvent.total ?? 1;
        const current = progressEvent.loaded;
        const percentCompleted = Math.round((current * 100) / total);
        setProgress(percentCompleted);
      });
    },
    onSuccess: async (data) => {
      queryClient.setQueryData(queryKeys.upload, data);
      queryClient.invalidateQueries({ queryKey: queryKeys.health });

      try {
        // Kick off sequential pipeline triggers
        setProcessingStep('Cleaning Data');
        await clean.mutateAsync();

        setProcessingStep('Analyzing Dataset');
        await eda.mutateAsync();

        setProcessingStep('Generating Features');
        await features.mutateAsync();

        setProcessingStep('Creating Customer Segments');
        await segmentation.mutateAsync();

        setProcessingStep('Generating Recommendations');
        await explain.mutateAsync();
        await recommend.mutateAsync();

        setProcessingStep('Preparing Dashboard');
        queryClient.invalidateQueries();
      } catch (err) {
        console.error('Pipeline execution error:', err);
      } finally {
        setIsProcessing(false);
        setProgress(0);
      }
    },
    onError: (err) => {
      console.error('Upload failed:', err);
      setIsProcessing(false);
      setProgress(0);
    }
  });

  return {
    ...mutation,
    progress,
    isProcessing,
    processingStep,
    resetUpload: () => {
      mutation.reset();
      setProgress(0);
      setIsProcessing(false);
      setProcessingStep('');
    },
  };
};

export default useUpload;
