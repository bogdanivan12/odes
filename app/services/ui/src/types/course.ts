export interface CourseData {
  id?: string;
  _id?: string;
  institution_id: string;
  name: string;
}

export interface CourseShape {
  id: string;
  institution_id: string;
  name: string;
}

export class Course implements CourseShape {
  id: string;
  institution_id: string;
  name: string;

  constructor(data: CourseData) {
    this.id = data.id ?? data._id ?? '';
    this.institution_id = data.institution_id;
    this.name = data.name;
  }

  static from(data: CourseData): Course {
    return new Course(data);
  }
}
