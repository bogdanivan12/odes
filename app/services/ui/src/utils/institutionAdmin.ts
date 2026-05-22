import { apiGet } from './apiClient';
import { API_URL } from '../config/constants';
import type { InstitutionUser } from '../api/institutions';

export async function getCurrentUserData(): Promise<InstitutionUser> {
  const res = await apiGet<any>(`${API_URL}/api/v1/users/me`);
  return (res?.user ?? res) as InstitutionUser;
}

export function isInstitutionAdmin(user: InstitutionUser | null, institutionId?: string): boolean {
  if (!user || !institutionId) return false;
  const roles = user.user_roles?.[institutionId] ?? user.user_roles?.[String(institutionId)];
  return Array.isArray(roles) && roles.includes('admin');
}

