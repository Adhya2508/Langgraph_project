// src/services/recommendation.service.ts
import apiClient from './axios';
import type { RecommendResponse } from '../types/api';

export const runRecommendations = async (): Promise<RecommendResponse> => {
  const { data } = await apiClient.post<RecommendResponse>('/recommend');
  return data;
};

export const getRecommendations = async (): Promise<RecommendResponse> => {
  const { data } = await apiClient.get<RecommendResponse>('/recommend');
  return data;
};
