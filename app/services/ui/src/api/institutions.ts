import { apiDelete, apiGet, apiPost } from '../utils/apiClient';
import { API_INSTITUTIONS_PATH, API_URL } from '../config/constants';
import { Institution as InstitutionClass } from '../types/institution';
import type { InstitutionData } from '../types/institution';

export interface InstitutionUser {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  user_roles?: Record<string, string[]>;
}

export interface InstitutionGroup {
  id?: string;
  _id?: string;
  name: string;
  parent_group_id?: string | null;
}

export interface InstitutionCourse {
  id?: string;
  _id?: string;
  name: string;
}

export interface InstitutionRoom {
  id?: string;
  _id?: string;
  name: string;
  capacity: number;
  features?: string[];
}

export interface InstitutionActivity {
  id?: string;
  _id?: string;
  activity_type: string;
  course_id: string;
  duration_slots: number;
  group_id: string;
  professor_id?: string | null;
  required_room_features?: string[];
  frequency: string;
}

export interface InstitutionSchedule {
  id?: string;
  _id?: string;
  status?: string;
  timestamp?: string;
  error_message?: string | null;
}

export interface CreateInstitutionRequest {
  name: string;
  time_grid_config: {
    weeks: number;
    days: number;
    timeslots_per_day: number;
    max_timeslots_per_day_per_group: number;
  };
}

export interface UpdateInstitutionRequest {
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

function normalizeCollection<T>(res: unknown, key: string): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res && typeof res === 'object' && Array.isArray((res as Record<string, unknown>)[key])) {
    return (res as Record<string, T[]>)[key];
  }
  return [];
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
  const res = await apiGet<unknown>(url, headers);
  return normalizeCollection<InstitutionUser>(res, 'users');
}

export async function getInstitutionById(institutionId: string): Promise<InstitutionClass> {
  const url = `${API_URL}${API_INSTITUTIONS_PATH}/${institutionId}`;
  const headers = buildAuthHeaders();
  const res = await apiGet<any>(url, headers);
  const institutionData: InstitutionData = res?.institution ?? res;
  return InstitutionClass.from(institutionData);
}

export async function getInstitutionGroups(institutionId: string): Promise<InstitutionGroup[]> {
  const url = `${API_URL}${API_INSTITUTIONS_PATH}/${institutionId}/groups`;
  const headers = buildAuthHeaders();
  const res = await apiGet<unknown>(url, headers);
  return normalizeCollection<InstitutionGroup>(res, 'groups');
}

export async function getInstitutionCourses(institutionId: string): Promise<InstitutionCourse[]> {
  const url = `${API_URL}${API_INSTITUTIONS_PATH}/${institutionId}/courses`;
  const headers = buildAuthHeaders();
  const res = await apiGet<unknown>(url, headers);
  return normalizeCollection<InstitutionCourse>(res, 'courses');
}

export async function getInstitutionRooms(institutionId: string): Promise<InstitutionRoom[]> {
  const url = `${API_URL}${API_INSTITUTIONS_PATH}/${institutionId}/rooms`;
  const headers = buildAuthHeaders();
  const res = await apiGet<unknown>(url, headers);
  return normalizeCollection<InstitutionRoom>(res, 'rooms');
}

export async function getInstitutionActivities(institutionId: string): Promise<InstitutionActivity[]> {
  const url = `${API_URL}${API_INSTITUTIONS_PATH}/${institutionId}/activities`;
  const headers = buildAuthHeaders();
  const res = await apiGet<unknown>(url, headers);
  return normalizeCollection<InstitutionActivity>(res, 'activities');
}

export async function getInstitutionSchedules(institutionId: string): Promise<InstitutionSchedule[]> {
  const url = `${API_URL}${API_INSTITUTIONS_PATH}/${institutionId}/schedules`;
  const headers = buildAuthHeaders();
  const res = await apiGet<unknown>(url, headers);
  return normalizeCollection<InstitutionSchedule>(res, 'schedules');
}

export async function createInstitution(payload: CreateInstitutionRequest): Promise<InstitutionClass> {
  const url = `${API_URL}${API_INSTITUTIONS_PATH}/`;
  const headers = buildAuthHeaders();
  const res = await apiPost<any>(url, payload, headers);
  const institutionData: InstitutionData = res?.institution ?? res;
  return InstitutionClass.from(institutionData);
}

export async function deleteInstitution(institutionId: string): Promise<void> {
  const url = `${API_URL}${API_INSTITUTIONS_PATH}/${institutionId}`;
  const headers = buildAuthHeaders();
  await apiDelete<void>(url, headers);
}

export async function removeUserFromInstitution(institutionId: string, userId: string): Promise<void> {
  const url = `${API_URL}${API_INSTITUTIONS_PATH}/${institutionId}/users/${userId}`;
  const headers = buildAuthHeaders();
  await apiDelete<void>(url, headers);
}


