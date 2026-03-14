export const USER_REGISTER_ROUTE = '/register';
export const USER_LOGIN_ROUTE = '/login';
export const HOME_ROUTE = '/';
export const INSTITUTIONS_ROUTE = '/institutions';
export const INSTITUTIONS_CREATE_ROUTE = '/institutions/new';
export const INSTITUTION_UPDATE_ROUTE = '/institutions/:institutionId/edit';
export const INSTITUTION_ROUTE = '/institutions/:institutionId';
export const INSTITUTION_MEMBERS_ROUTE = '/institutions/:institutionId/users';
export const INSTITUTION_GROUPS_ROUTE = '/institutions/:institutionId/groups';
export const INSTITUTION_COURSES_ROUTE = '/institutions/:institutionId/courses';
export const INSTITUTION_ROOMS_ROUTE = '/institutions/:institutionId/rooms';
export const INSTITUTION_ACTIVITIES_ROUTE = '/institutions/:institutionId/activities';
export const INSTITUTION_SCHEDULES_ROUTE = '/institutions/:institutionId/schedules';

export const institutionRoute = (institutionId: string) => `/institutions/${institutionId}`;
export const institutionUpdateRoute = (institutionId: string) => `/institutions/${institutionId}/edit`;

export const memberRoute = (memberId: string) => `/users/${memberId}`;
export const groupRoute = (groupId: string) => `/groups/${groupId}`;
export const courseRoute = (courseId: string) => `/courses/${courseId}`;
export const roomRoute = (roomId: string) => `/rooms/${roomId}`;
export const activityRoute = (activityId: string) => `/activities/${activityId}`;
export const scheduleRoute = (scheduleId: string) => `/schedules/${scheduleId}`;
