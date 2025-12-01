import { apiGet } from '../utils/apiClient';
import { API_INSTITUTIONS_PATH, API_URL } from '../config/constants';
import { Institution as InstitutionClass } from '../types/institution';
import type { InstitutionData } from '../types/institution';

export async function getInstitutions(): Promise<InstitutionClass[]> {
  const url = `${API_URL}${API_INSTITUTIONS_PATH}`;

  // read auth token stored by SignIn (key: authToken)
  const authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  const headers: Record<string, string> = {};
  if (authToken) headers['Authorization'] = authToken;

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
  const authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  const headers: Record<string, string> = {};
  if (authToken) headers['Authorization'] = authToken;
  return apiGet<any>(url, headers);
}
