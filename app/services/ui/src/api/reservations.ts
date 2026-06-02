import { apiGet, apiPost, apiDelete } from '../utils/apiClient';
import { API_URL } from '../config/constants';
import type { Reservation, ConflictCheckResult } from '../types/reservation';

const base = (institutionId: string) => `${API_URL}/api/v1/institutions/${institutionId}/reservations`;

export interface CreateReservationPayload {
  room_id: string;
  date: string;
  start_minute: number;
  end_minute: number;
  reason: string;
}

export async function getReservations(institutionId: string): Promise<Reservation[]> {
  const res = await apiGet<any>(base(institutionId));
  return (res?.reservations ?? res ?? []) as Reservation[];
}

export async function createReservation(
  institutionId: string,
  payload: CreateReservationPayload,
): Promise<Reservation> {
  const res = await apiPost<any>(base(institutionId), payload);
  return (res?.reservation ?? res) as Reservation;
}

export async function checkReservationConflict(
  institutionId: string,
  payload: Omit<CreateReservationPayload, 'reason'>,
): Promise<ConflictCheckResult> {
  return await apiPost<ConflictCheckResult>(`${base(institutionId)}/check-conflict`, payload);
}

export async function approveReservation(reservationId: string): Promise<Reservation> {
  const res = await apiPost<any>(`${API_URL}/api/v1/reservations/${reservationId}/approve`);
  return (res?.reservation ?? res) as Reservation;
}

export async function refuseReservation(reservationId: string, reason?: string): Promise<Reservation> {
  const res = await apiPost<any>(`${API_URL}/api/v1/reservations/${reservationId}/refuse`, { reason: reason ?? null });
  return (res?.reservation ?? res) as Reservation;
}

export async function deleteReservation(reservationId: string): Promise<void> {
  await apiDelete<void>(`${API_URL}/api/v1/reservations/${reservationId}`);
}
