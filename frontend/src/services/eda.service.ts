// src/services/eda.service.ts
import apiClient from './axios';
import type { EDAResponse } from '../types/api';

export const runEDA = async (): Promise<EDAResponse> => {
  const { data } = await apiClient.post<EDAResponse>('/eda');
  return data;
};

export const getEDA = async (): Promise<EDAResponse> => {
  const { data } = await apiClient.get<EDAResponse>('/eda');
  return data;
};
