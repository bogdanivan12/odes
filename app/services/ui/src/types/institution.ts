// Type definitions for Institution model (matches app.libs.db.models.Institution)

export interface TimeGridConfig {
  weeks: number;
  days: number;
  timeslots_per_day: number;
  max_timeslots_per_day_per_group: number;
}

export interface InstitutionData {
  // backend may use `_id`; frontend prefers `id`
  id?: string;
  _id?: string;
  name: string;
  time_grid_config: TimeGridConfig;
  active_schedule_id?: string | null;
}

export interface InstitutionShape {
  id: string;
  name: string;
  time_grid_config: TimeGridConfig;
  active_schedule_id?: string | null;
}

export class Institution implements InstitutionShape {
  id: string;
  name: string;
  time_grid_config: TimeGridConfig;
  active_schedule_id?: string | null;

  constructor(data: InstitutionData) {
    this.id = data.id ?? data._id ?? '';
    this.name = data.name;
    this.time_grid_config = data.time_grid_config;
    this.active_schedule_id = data.active_schedule_id ?? null;
  }

  static from(data: InstitutionData): Institution {
    return new Institution(data);
  }

  toJSON(): InstitutionShape {
    return {
      id: this.id,
      name: this.name,
      time_grid_config: this.time_grid_config,
      active_schedule_id: this.active_schedule_id,
    };
  }
}
