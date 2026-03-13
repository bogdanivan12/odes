import { apiGet, apiPost } from '../utils/apiClient';
import { API_INSTITUTIONS_PATH, API_URL } from '../config/constants';
import { Institution as InstitutionClass } from '../types/institution';
import type { InstitutionData } from '../types/institution';

export interface CreateInstitutionRequest {
  name: string;
  time_grid_config: {
    weeks: number;
    days: number;
    timeslots_per_day: number;
    max_timeslots_per_day_per_group: number;
  };
}

function buildAuthHeaders(): Record<string, string> {
  const authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  const headers: Record<string, string> = {};
  if (authToken) headers['Authorization'] = authToken;
  return headers;
}

export async function getInstitutions(): Promise<InstitutionClass[]> {
  const url = `${API_URL}${API_INSTITUTIONS_PATH}`;
  const headers = buildAuthHeaders();

  const res = await apiGet<any>(url, headers);

  // normalize array vs { institutions: [...] }
  const items: InstitutionData[] = Array.isArray(res)
    ? (res as InstitutionData[])
    : (res?.institutions && Array.isArray(res.institutions))
      ? (res.institutions as InstitutionData[])
      : [];

  return items.map(i => InstitutionClass.from(i));
}

export async function getInstitutionUsers(institutionId: string) {
  const url = `${API_URL}${API_INSTITUTIONS_PATH}/${institutionId}/users`;
  const headers = buildAuthHeaders();
  return apiGet<any>(url, headers);
}

export async function createInstitution(payload: CreateInstitutionRequest): Promise<InstitutionClass> {
  const url = `${API_URL}${API_INSTITUTIONS_PATH}/`;
  const headers = buildAuthHeaders();
  const res = await apiPost<any>(url, payload, headers);
  const institutionData: InstitutionData = res?.institution ?? res;
  return InstitutionClass.from(institutionData);
}

