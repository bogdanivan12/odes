export type TimeslotPreferenceValue = 'desired' | 'not_ideal' | 'unavailable';

export interface TimeslotPreference {
  slot: number;
  preference: TimeslotPreferenceValue;
}

export interface UserData {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  user_roles?: Record<string, string[]>;
  group_ids?: string[];
  timeslot_preferences?: Record<string, TimeslotPreference[]>;
}

export class User {
  id: string;
  name: string;
  email: string;
  user_roles: Record<string, string[]>;
  group_ids: string[];
  timeslot_preferences: Record<string, TimeslotPreference[]>;

  constructor(data: UserData) {
    this.id = data.id ?? data._id ?? '';
    this.name = data.name ?? 'Unknown';
    this.email = data.email ?? '';
    this.user_roles = data.user_roles ?? {};
    this.group_ids = data.group_ids ?? [];
    this.timeslot_preferences = data.timeslot_preferences ?? {};
  }

  static from(data: UserData): User {
    return new User(data);
  }
}

