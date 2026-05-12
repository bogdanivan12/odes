import { apiDelete, apiGet, apiPost, apiPut } from '../utils/apiClient';
import { API_URL } from '../config/constants';
import { Group as GroupClass } from '../types/group';
import type { GroupData } from '../types/group';
import type { TimeslotPreference } from '../types/user';

export interface CreateGroupRequest {
  institution_id: string;
  name: string;
  parent_group_id?: string | null;
}

export interface UpdateGroupRequest {
  name?: string;
  parent_group_id?: string | null;
}

export interface GroupActivity {
  id?: string;
  _id?: string;
  institution_id?: string;
  activity_type: string;
  course_id: string;
  duration_slots: number;
  group_id: string;
  professor_id?: string | null;
  required_room_features?: string[];
  frequency: string;
}

function buildAuthHeaders(): Record<string, string> {
  const authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  const headers: Record<string, string> = {};
  if (authToken) headers.Authorization = authToken;
  return headers;
}

function normalizeGroups(res: unknown): GroupData[] {
  if (Array.isArray(res)) return res as GroupData[];
  if (res && typeof res === 'object' && Array.isArray((res as Record<string, unknown>).groups)) {
    return (res as { groups: GroupData[] }).groups;
  }
  return [];
}

export async function getGroups(): Promise<GroupClass[]> {
  const url = `${API_URL}/api/v1/groups/`;
  const headers = buildAuthHeaders();
  const res = await apiGet<unknown>(url, headers);
  return normalizeGroups(res).map((g) => GroupClass.from(g));
}

export async function getGroupById(groupId: string): Promise<GroupClass> {
  const url = `${API_URL}/api/v1/groups/${groupId}`;
  const headers = buildAuthHeaders();
  const res = await apiGet<any>(url, headers);
  const groupData: GroupData = res?.group ?? res;
  return GroupClass.from(groupData);
}

export async function getGroupActivities(groupId: string): Promise<GroupActivity[]> {
  const url = `${API_URL}/api/v1/groups/${groupId}/activities`;
  const headers = buildAuthHeaders();
  const res = await apiGet<any>(url, headers);
  if (Array.isArray(res)) return res as GroupActivity[];
  return Array.isArray(res?.activities) ? (res.activities as GroupActivity[]) : [];
}

export async function createGroup(payload: CreateGroupRequest): Promise<GroupClass> {
  const url = `${API_URL}/api/v1/groups/`;
  const headers = buildAuthHeaders();
  const res = await apiPost<any>(url, payload, headers);
  const groupData: GroupData = res?.group ?? res;
  return GroupClass.from(groupData);
}

export async function updateGroup(groupId: string, payload: UpdateGroupRequest): Promise<GroupClass> {
  const url = `${API_URL}/api/v1/groups/${groupId}`;
  const headers = buildAuthHeaders();
  const res = await apiPut<any>(url, payload, headers);
  const groupData: GroupData = res?.group ?? res;
  return GroupClass.from(groupData);
}

export async function deleteGroup(groupId: string): Promise<void> {
  const url = `${API_URL}/api/v1/groups/${groupId}`;
  const headers = buildAuthHeaders();
  await apiDelete<void>(url, headers);
}

export async function updateGroupTimeslotPreferences(
  groupId: string,
  preferences: TimeslotPreference[],
): Promise<GroupClass> {
  const url = `${API_URL}/api/v1/groups/${groupId}/timeslot-preferences`;
  const headers = buildAuthHeaders();
  const res = await apiPut<any>(url, { preferences }, headers);
  const groupData: GroupData = res?.group ?? res;
  return GroupClass.from(groupData);
}

// Lightweight student record shape — mirrors a subset of the User model.
// We don't need every field; only what the group page renders.
export interface GroupStudent {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
}

export async function getGroupStudents(groupId: string): Promise<GroupStudent[]> {
  const url = `${API_URL}/api/v1/groups/${groupId}/students`;
  const headers = buildAuthHeaders();
  const res = await apiGet<any>(url, headers);
  const list = res?.students ?? res ?? [];
  return Array.isArray(list) ? list : [];
}

export async function addStudentToGroup(
  groupId: string,
  userId: string,
): Promise<GroupStudent> {
  const url = `${API_URL}/api/v1/groups/${groupId}/students/${userId}`;
  const headers = buildAuthHeaders();
  const res = await apiPost<any>(url, {}, headers);
  return (res?.user ?? res) as GroupStudent;
}

export async function removeStudentFromGroup(
  groupId: string,
  userId: string,
): Promise<void> {
  const url = `${API_URL}/api/v1/groups/${groupId}/students/${userId}`;
  const headers = buildAuthHeaders();
  await apiDelete<void>(url, headers);
}

