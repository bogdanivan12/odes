export interface RoomData {
  id?: string;
  _id?: string;
  institution_id: string;
  name: string;
  capacity: number;
  features?: string[];
}

export interface RoomShape {
  id: string;
  institution_id: string;
  name: string;
  capacity: number;
  features: string[];
}

export class Room implements RoomShape {
  id: string;
  institution_id: string;
  name: string;
  capacity: number;
  features: string[];

  constructor(data: RoomData) {
    this.id = data.id ?? data._id ?? '';
    this.institution_id = data.institution_id;
    this.name = data.name;
    this.capacity = data.capacity;
    this.features = data.features ?? [];
  }

  static from(data: RoomData): Room {
    return new Room(data);
  }
}

