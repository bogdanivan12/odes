import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from '../utils/apiClient';
import { API_INSTITUTIONS_PATH, API_URL } from '../config/constants';
import { Institution as InstitutionClass } from '../types/institution';
import type { InstitutionData } from '../types/institution';

export interface InstitutionUser {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  user_roles?: Record<string, string[]>;
  group_ids?: string[];
}

export type InstitutionRole = 'student' | 'professor' | 'admin';

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
  institution_id?: string;
  status?: string;
  timestamp?: string;
  error_message?: string | null;
}

export interface ScheduledActivityRecord {
  id?: string;
  _id?: string;
  schedule_id: string;
  activity_id: string;
  room_id: string;
  start_timeslot: number;
  active_weeks: number[];
}

export interface CreateInstitutionRequest {
  name: string;
  time_grid_config: {
    weeks: number;
    days: number;
    timeslots_per_day: number;
    max_timeslots_per_day_per_group: number;
    start_hour: number;
    start_minute: number;
    timeslot_duration_minutes: number;
    start_day: number;
  };
}

export interface UpdateInstitutionRequest {
  name: string;
  time_grid_config: {
    weeks: number;
    days: number;
    timeslots_per_day: number;
    max_timeslots_per_day_per_group: number;
    start_hour: number;
    start_minute: number;
    timeslot_duration_minutes: number;
    start_day: number;
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

export async function triggerScheduleGeneration(institutionId: string): Promise<InstitutionSchedule> {
  const url = `${API_URL}/api/v1/schedules/`;
  const headers = buildAuthHeaders();
  const res = await apiPost<any>(url, { institution_id: institutionId }, headers);
  return (res?.schedule ?? res) as InstitutionSchedule;
}

export async function deleteSchedule(scheduleId: string): Promise<void> {
  const url = `${API_URL}/api/v1/schedules/${scheduleId}`;
  const headers = buildAuthHeaders();
  await apiDelete<void>(url, headers);
}

export async function getScheduleById(scheduleId: string): Promise<InstitutionSchedule> {
  const url = `${API_URL}/api/v1/schedules/${scheduleId}`;
  const headers = buildAuthHeaders();
  const res = await apiGet<any>(url, headers);
  return (res?.schedule ?? res) as InstitutionSchedule;
}

export async function getInstitutionSchedules(institutionId: string): Promise<InstitutionSchedule[]> {
  const url = `${API_URL}${API_INSTITUTIONS_PATH}/${institutionId}/schedules`;
  const headers = buildAuthHeaders();
  const res = await apiGet<unknown>(url, headers);
  return normalizeCollection<InstitutionSchedule>(res, 'schedules');
}

export async function getScheduleActivities(scheduleId: string): Promise<ScheduledActivityRecord[]> {
  const url = `${API_URL}/api/v1/schedules/${scheduleId}/scheduled-activities`;
  const headers = buildAuthHeaders();
  const res = await apiGet<unknown>(url, headers);
  return normalizeCollection<ScheduledActivityRecord>(res, 'scheduled_activities');
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

export async function assignRoleToUser(institutionId: string, userId: string, role: InstitutionRole): Promise<void> {
  const url = `${API_URL}${API_INSTITUTIONS_PATH}/${institutionId}/users/${userId}/roles/${role}`;
  const headers = buildAuthHeaders();
  await apiPost<void>(url, undefined, headers);
}

export async function removeRoleFromUser(institutionId: string, userId: string, role: InstitutionRole): Promise<void> {
  const url = `${API_URL}${API_INSTITUTIONS_PATH}/${institutionId}/users/${userId}/roles/${role}`;
  const headers = buildAuthHeaders();
  await apiDelete<void>(url, headers);
}

export async function setActiveSchedule(institutionId: string, scheduleId: string | null): Promise<InstitutionClass> {
  const url = `${API_URL}${API_INSTITUTIONS_PATH}/${institutionId}/active-schedule`;
  const headers = buildAuthHeaders();
  const res = await apiPut<any>(url, { schedule_id: scheduleId }, headers);
  const institutionData: InstitutionData = res?.institution ?? res;
  return InstitutionClass.from(institutionData);
}

// ── Schedule editing ──────────────────────────────────────────────────────────

const API_SCHEDULES_PATH = '/api/v1/schedules';

export interface ScheduleChangeItem {
  record_id: string;
  new_start_timeslot: number;
  new_room_id: string;
}

export interface ConflictItem {
  type: 'room' | 'professor' | 'group';
  conflicting_record_id: string;
  description: string;
}

export interface RecordConflicts {
  record_id: string;
  conflicts: ConflictItem[];
}

export async function checkScheduleConflicts(
  scheduleId: string,
  changes: ScheduleChangeItem[],
): Promise<RecordConflicts[]> {
  const url = `${API_URL}${API_SCHEDULES_PATH}/${scheduleId}/check-conflicts`;
  const headers = buildAuthHeaders();
  const res = await apiPost<{ results: RecordConflicts[] }>(url, { changes }, headers);
  return res?.results ?? [];
}

export async function batchUpdateScheduleRecords(
  scheduleId: string,
  changes: ScheduleChangeItem[],
  force: boolean,
): Promise<ScheduledActivityRecord[]> {
  const url = `${API_URL}${API_SCHEDULES_PATH}/${scheduleId}/records`;
  const headers = buildAuthHeaders();
  const res = await apiPatch<{ scheduled_activities: any[] }>(url, { changes, force }, headers);
  return (res?.scheduled_activities ?? []) as ScheduledActivityRecord[];
}


