import { apiDelete, apiGet, apiPost, apiPut } from '../utils/apiClient';
import { API_INSTITUTIONS_PATH, API_URL } from '../config/constants';
import { Course as CourseClass } from '../types/course';
import type { CourseData } from '../types/course';

export interface CreateCourseRequest {
  institution_id: string;
  name: string;
}

export interface UpdateCourseRequest {
  name: string;
}

export interface CourseActivity {
  id?: string;
  _id?: string;
  course_id: string;
  group_id: string;
  professor_id?: string | null;
  activity_type: string;
  frequency: string;
  duration_slots: number;
}

function buildAuthHeaders(): Record<string, string> {
  const authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  const headers: Record<string, string> = {};
  if (authToken) headers.Authorization = authToken;
  return headers;
}

function normalizeCourses(res: unknown): CourseData[] {
  if (Array.isArray(res)) return res as CourseData[];
  if (res && typeof res === 'object' && Array.isArray((res as Record<string, unknown>).courses)) {
    return (res as { courses: CourseData[] }).courses;
  }
  return [];
}

export async function getInstitutionCourses(institutionId: string): Promise<CourseClass[]> {
  const url = `${API_URL}${API_INSTITUTIONS_PATH}/${institutionId}/courses`;
  const headers = buildAuthHeaders();
  const res = await apiGet<unknown>(url, headers);
  return normalizeCourses(res).map((c) => CourseClass.from(c));
}

export async function getCourseById(courseId: string): Promise<CourseClass> {
  const url = `${API_URL}/api/v1/courses/${courseId}`;
  const headers = buildAuthHeaders();
  const res = await apiGet<any>(url, headers);
  const courseData: CourseData = res?.course ?? res;
  return CourseClass.from(courseData);
}

export async function getCourseActivities(courseId: string): Promise<CourseActivity[]> {
  const url = `${API_URL}/api/v1/courses/${courseId}/activities`;
  const headers = buildAuthHeaders();
  const res = await apiGet<any>(url, headers);
  if (Array.isArray(res)) return res as CourseActivity[];
  return Array.isArray(res?.activities) ? (res.activities as CourseActivity[]) : [];
}

export async function createCourse(payload: CreateCourseRequest): Promise<CourseClass> {
  const url = `${API_URL}/api/v1/courses/`;
  const headers = buildAuthHeaders();
  const res = await apiPost<any>(url, payload, headers);
  const courseData: CourseData = res?.course ?? res;
  return CourseClass.from(courseData);
}

export async function updateCourse(courseId: string, payload: UpdateCourseRequest): Promise<CourseClass> {
  const url = `${API_URL}/api/v1/courses/${courseId}`;
  const headers = buildAuthHeaders();
  const res = await apiPut<any>(url, payload, headers);
  const courseData: CourseData = res?.course ?? res;
  return CourseClass.from(courseData);
}

export async function deleteCourse(courseId: string): Promise<void> {
  const url = `${API_URL}/api/v1/courses/${courseId}`;
  const headers = buildAuthHeaders();
  await apiDelete<void>(url, headers);
}


