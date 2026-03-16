export interface ActivitySelectedTimeslot {
  start_timeslot: number;
  active_weeks: number[];
}

export interface ActivityData {
  id?: string;
  _id?: string;
  institution_id: string;
  course_id: string;
  activity_type: string;
  group_id: string;
  professor_id?: string | null;
  duration_slots: number;
  required_room_features?: string[];
  frequency: string;
  selected_timeslot?: ActivitySelectedTimeslot | null;
}

export interface ActivityShape {
  id: string;
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

export class Activity implements ActivityShape {
  id: string;
  institution_id: string;
  course_id: string;
  activity_type: string;
  group_id: string;
  professor_id?: string | null;
  duration_slots: number;
  required_room_features: string[];
  frequency: string;
  selected_timeslot?: ActivitySelectedTimeslot | null;

  constructor(data: ActivityData) {
    this.id = data.id ?? data._id ?? '';
    this.institution_id = data.institution_id;
    this.course_id = data.course_id;
    this.activity_type = data.activity_type;
    this.group_id = data.group_id;
    this.professor_id = data.professor_id ?? null;
    this.duration_slots = data.duration_slots;
    this.required_room_features = data.required_room_features ?? [];
    this.frequency = data.frequency;
    this.selected_timeslot = data.selected_timeslot ?? null;
  }

  static from(data: ActivityData): Activity {
    return new Activity(data);
  }
}

