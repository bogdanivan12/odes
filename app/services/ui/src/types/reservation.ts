export type ReservationStatus = 'pending' | 'approved' | 'refused';

export interface Reservation {
  id?: string;
  _id?: string;
  institution_id: string;
  room_id: string;
  requester_id: string;
  date: string;            // "YYYY-MM-DD"
  start_minute: number;    // minutes from midnight
  end_minute: number;
  reason: string;
  status: ReservationStatus;
  decided_by?: string | null;
  decision_reason?: string | null;
  created_at?: string;
  decided_at?: string | null;
}

export interface ReservationConflict {
  type: 'schedule' | 'reservation';
  description: string;
}

export interface ConflictCheckResult {
  ok: boolean;
  conflicts: ReservationConflict[];
}
