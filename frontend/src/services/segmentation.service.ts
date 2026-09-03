// src/services/segmentation.service.ts
import apiClient from './axios';
import type { SegmentResponse, ExplainResponse } from '../types/api';

export const runSegmentation = async (): Promise<SegmentResponse> => {
  const { data } = await apiClient.post<SegmentResponse>('/segment');
  return data;
};

export const runExplainability = async (): Promise<ExplainResponse> => {
  const { data } = await apiClient.post<ExplainResponse>('/explain');
  return data;
};

export const getSegmentation = async (): Promise<SegmentResponse> => {
  const { data } = await apiClient.get<SegmentResponse>('/segment');
  return data;
};

export const getExplainability = async (): Promise<ExplainResponse> => {
  const { data } = await apiClient.get<ExplainResponse>('/explain');
  return data;
};
