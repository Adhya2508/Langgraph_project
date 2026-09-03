// src/services/upload.service.ts
import apiClient from './axios';
import type { UploadResponse } from '../types/api';

export const uploadDataset = async (
  file: File,
  onUploadProgress?: (progressEvent: any) => void
): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post<UploadResponse>('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress,
  });
  return data;
};
