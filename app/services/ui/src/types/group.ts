export interface GroupData {
  id?: string;
  _id?: string;
  institution_id: string;
  name: string;
  parent_group_id?: string | null;
}

export interface GroupShape {
  id: string;
  institution_id: string;
  name: string;
  parent_group_id?: string | null;
}

export class Group implements GroupShape {
  id: string;
  institution_id: string;
  name: string;
  parent_group_id?: string | null;

  constructor(data: GroupData) {
    this.id = data.id ?? data._id ?? '';
    this.institution_id = data.institution_id;
    this.name = data.name;
    this.parent_group_id = data.parent_group_id ?? null;
  }

  static from(data: GroupData): Group {
    return new Group(data);
  }
}

