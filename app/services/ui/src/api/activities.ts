import { apiDelete, apiGet, apiPost, apiPut } from '../utils/apiClient';
import { API_URL } from '../config/constants';
import { Activity as ActivityClass } from '../types/activity';
import type { ActivityData, ActivitySelectedTimeslot } from '../types/activity';

export interface CreateActivityRequest {
  institution_id: string;
  course_id: string;
  activity_type: string;
  group_id: string;
  professor_id?: string | null;
  duration_slots: number;
  required_room_features: string[];
  frequency: string;
  selected_timeslot?: ActivitySelectedTimeslot | null;
}

export interface UpdateActivityRequest {
  course_id?: string;
  activity_type?: string;
  group_id?: string;
  professor_id?: string | null;
  duration_slots?: number;
  required_room_features?: string[];
  frequency?: string;
  selected_timeslot?: ActivitySelectedTimeslot | null;
}

function buildAuthHeaders(): Record<string, string> {
  const authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  const headers: Record<string, string> = {};
  if (authToken) headers.Authorization = authToken;
  return headers;
}

function normalizeActivities(res: unknown): ActivityData[] {
  if (Array.isArray(res)) return res as ActivityData[];
  if (res && typeof res === 'object' && Array.isArray((res as Record<string, unknown>).activities)) {
    return (res as { activities: ActivityData[] }).activities;
  }
  return [];
}

export async function getActivities(): Promise<ActivityClass[]> {
  const url = `${API_URL}/api/v1/activities/`;
  const headers = buildAuthHeaders();
  const res = await apiGet<unknown>(url, headers);
  return normalizeActivities(res).map((activity) => ActivityClass.from(activity));
}

export async function getActivityById(activityId: string): Promise<ActivityClass> {
  const url = `${API_URL}/api/v1/activities/${activityId}`;
  const headers = buildAuthHeaders();
  const res = await apiGet<any>(url, headers);
  const activityData: ActivityData = res?.activity ?? res;
  return ActivityClass.from(activityData);
}

export async function createActivity(payload: CreateActivityRequest): Promise<ActivityClass> {
  const url = `${API_URL}/api/v1/activities/`;
  const headers = buildAuthHeaders();
  const res = await apiPost<any>(url, payload, headers);
  const activityData: ActivityData = res?.activity ?? res;
  return ActivityClass.from(activityData);
}

export async function updateActivity(activityId: string, payload: UpdateActivityRequest): Promise<ActivityClass> {
  const url = `${API_URL}/api/v1/activities/${activityId}`;
  const headers = buildAuthHeaders();
  const res = await apiPut<any>(url, payload, headers);
  const activityData: ActivityData = res?.activity ?? res;
  return ActivityClass.from(activityData);
}

export async function deleteActivity(activityId: string): Promise<void> {
  const url = `${API_URL}/api/v1/activities/${activityId}`;
  const headers = buildAuthHeaders();
  await apiDelete<void>(url, headers);
}

