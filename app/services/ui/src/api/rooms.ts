import { apiDelete, apiGet, apiPost, apiPut } from '../utils/apiClient';
import { API_URL } from '../config/constants';
import { Room as RoomClass } from '../types/room';
import type { RoomData } from '../types/room';

export interface CreateRoomRequest {
  institution_id: string;
  name: string;
  capacity: number;
  features: string[];
}

export interface UpdateRoomRequest {
  name?: string;
  capacity?: number;
  features?: string[];
}

function normalizeRooms(res: unknown): RoomData[] {
  if (Array.isArray(res)) return res as RoomData[];
  if (res && typeof res === 'object' && Array.isArray((res as Record<string, unknown>).rooms)) {
	return (res as { rooms: RoomData[] }).rooms;
  }
  return [];
}

export async function getRooms(): Promise<RoomClass[]> {
  const url = `${API_URL}/api/v1/rooms/`;
  const res = await apiGet<unknown>(url);
  return normalizeRooms(res).map((room) => RoomClass.from(room));
}

export async function getRoomById(roomId: string): Promise<RoomClass> {
  const url = `${API_URL}/api/v1/rooms/${roomId}`;
  const res = await apiGet<any>(url);
  const roomData: RoomData = res?.room ?? res;
  return RoomClass.from(roomData);
}

export async function createRoom(payload: CreateRoomRequest): Promise<RoomClass> {
  const url = `${API_URL}/api/v1/rooms/`;
  const res = await apiPost<any>(url, payload);
  const roomData: RoomData = res?.room ?? res;
  return RoomClass.from(roomData);
}

export async function updateRoom(roomId: string, payload: UpdateRoomRequest): Promise<RoomClass> {
  const url = `${API_URL}/api/v1/rooms/${roomId}`;
  const res = await apiPut<any>(url, payload);
  const roomData: RoomData = res?.room ?? res;
  return RoomClass.from(roomData);
}

export async function deleteRoom(roomId: string): Promise<void> {
  const url = `${API_URL}/api/v1/rooms/${roomId}`;
  await apiDelete<void>(url);
}

