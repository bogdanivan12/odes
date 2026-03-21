export interface UserData {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  user_roles?: Record<string, string[]>;
  group_ids?: string[];
}

export class User {
  id: string;
  name: string;
  email: string;
  user_roles: Record<string, string[]>;
  group_ids: string[];

  constructor(data: UserData) {
    this.id = data.id ?? data._id ?? '';
    this.name = data.name ?? 'Unknown';
    this.email = data.email ?? '';
    this.user_roles = data.user_roles ?? {};
    this.group_ids = data.group_ids ?? [];
  }

  static from(data: UserData): User {
    return new User(data);
  }
}

