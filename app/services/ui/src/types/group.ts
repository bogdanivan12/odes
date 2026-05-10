import type { TimeslotPreference } from './user';

export interface GroupData {
  id?: string;
  _id?: string;
  institution_id: string;
  name: string;
  parent_group_id?: string | null;
  timeslot_preferences?: TimeslotPreference[];
}

export interface GroupShape {
  id: string;
  institution_id: string;
  name: string;
  parent_group_id?: string | null;
  timeslot_preferences: TimeslotPreference[];
}

export class Group implements GroupShape {
  id: string;
  institution_id: string;
  name: string;
  parent_group_id?: string | null;
  timeslot_preferences: TimeslotPreference[];

  constructor(data: GroupData) {
    this.id = data.id ?? data._id ?? '';
    this.institution_id = data.institution_id;
    this.name = data.name;
    this.parent_group_id = data.parent_group_id ?? null;
    this.timeslot_preferences = data.timeslot_preferences ?? [];
  }

  static from(data: GroupData): Group {
    return new Group(data);
  }
}
