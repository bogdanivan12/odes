import { apiGet, apiPut } from '../utils/apiClient';
import { API_URL } from '../config/constants';
import { User } from '../types/user';
import type { TimeslotPreference } from '../types/user';
import { Activity } from '../types/activity';

export type UpdateCurrentUserRequest = {
  name?: string;
  email?: string;
  password?: string;
};

function buildAuthHeaders(): Record<string, string> {
  const authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  const headers: Record<string, string> = {};
  if (authToken) headers.Authorization = authToken;
  return headers;
}

function normalizeCollection<T>(res: unknown, key: string): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res && typeof res === 'object' && Array.isArray((res as Record<string, unknown>)[key])) {
    return (res as Record<string, T[]>)[key];
  }
  return [];
}

export async function getUsers(): Promise<User[]> {
  const res = await apiGet<unknown>(`${API_URL}/api/v1/users/`, buildAuthHeaders());
  return normalizeCollection<any>(res, 'users').map((item) => User.from(item));
}

export async function getUserById(userId: string): Promise<User> {
  const res = await apiGet<any>(`${API_URL}/api/v1/users/${userId}`, buildAuthHeaders());
  return User.from((res?.user ?? res) as any);
}

export async function getCurrentUserProfile(): Promise<User> {
  const res = await apiGet<any>(`${API_URL}/api/v1/users/me`, buildAuthHeaders());
  return User.from((res?.user ?? res) as any);
}

export async function updateCurrentUserProfile(payload: UpdateCurrentUserRequest): Promise<User> {
  const res = await apiPut<any>(`${API_URL}/api/v1/users/me`, payload, buildAuthHeaders());
  return User.from((res?.user ?? res) as any);
}

export async function getProfessorActivities(userId: string): Promise<Activity[]> {
  const res = await apiGet<unknown>(`${API_URL}/api/v1/users/${userId}/activities`, buildAuthHeaders());
  return normalizeCollection<any>(res, 'activities').map((item) => Activity.from(item));
}

export async function updateTimeslotPreferences(
  institutionId: string,
  preferences: TimeslotPreference[],
): Promise<User> {
  const res = await apiPut<any>(
    `${API_URL}/api/v1/users/me/timeslot-preferences/${institutionId}`,
    { preferences },
    buildAuthHeaders(),
  );
  return User.from((res?.user ?? res) as any);
}

