/**
 * Single source of truth for all in-app help/onboarding content.
 *
 * The Help Center page (and any future contextual help or guided tour) reads
 * from this module so every concept is explained once and stays consistent.
 */

export type HelpRole = 'admin' | 'professor' | 'student';

export type HelpSectionId = 'start' | 'blocks' | 'scheduling' | 'account';

export interface HelpSection {
  id: HelpSectionId;
  title: string;
  subtitle: string;
}

export interface HelpConcept {
  /** Stable id - also used as the anchor and by HelpTips/tour to reference it. */
  id: string;
  title: string;
  section: HelpSectionId;
  /** Roles this concept matters most to. Empty = everyone. */
  roles: HelpRole[];
  /** One-line summary - reused by tooltips and search. */
  short: string;
  /** Full explanation, one entry per paragraph. */
  body: string[];
  /** Optional ordered how-to steps. */
  steps?: string[];
  /** Related concept ids (rendered as quick links). */
  related?: string[];
  /** Optional in-app route this concept maps to (deep link). */
  route?: string;
}

export const HELP_SECTIONS: HelpSection[] = [
  { id: 'start', title: 'Getting started', subtitle: 'The big picture and who does what.' },
  { id: 'blocks', title: 'Building blocks', subtitle: 'The pieces you set up before scheduling.' },
  { id: 'scheduling', title: 'Scheduling', subtitle: 'Turning your data into timetables.' },
  { id: 'account', title: 'Your account', subtitle: 'Signing in and managing your profile.' },
];

export const HELP_CONCEPTS: HelpConcept[] = [
  // ── Getting started ──────────────────────────────────────────────────────
  {
    id: 'roles',
    title: 'Roles & permissions',
    section: 'start',
    roles: [],
    short: 'Admins build and run the schedule, professors set their availability, students view their timetable.',
    body: [
      'ODES has three roles, assigned per institution. The same person can have different roles in different institutions.',
      'Admin - manages everything: members, groups, courses, rooms and activities, generates and edits schedules, and handles room reservations.',
      'Professor - sets personal availability and preferences, sees the activities they teach, and can request room reservations.',
      'Student - views their group’s schedule and their own personal timetable.',
    ],
    related: ['institution', 'members'],
  },
  {
    id: 'institution',
    title: 'Institution',
    section: 'start',
    roles: [],
    short: 'The top-level workspace - a faculty or university whose schedule you manage.',
    body: [
      'Everything in ODES lives inside an institution. You pick the active one from the institution selector in the navbar.',
      'Each institution has its own members, groups, courses, rooms, activities, schedules and a time-grid configuration (its weekly structure). Data never mixes between institutions.',
    ],
    steps: [
      'Open the institution selector in the navbar.',
      'Choose an existing institution, or click “New institution” to create one.',
      'Set its time grid (days, timeslots, start hour, week rotation) when prompted.',
    ],
    related: ['roles', 'time-grid'],
    route: '/institutions',
  },

  // ── Building blocks ──────────────────────────────────────────────────────
  {
    id: 'members',
    title: 'Members',
    section: 'blocks',
    roles: ['admin'],
    short: 'The people in an institution and the role each one has.',
    body: [
      'Members are the users that belong to an institution. Each member has one or more roles here (student, professor, admin).',
      'Professors can be assigned to teach activities; students are placed into groups so they inherit that group’s schedule.',
    ],
    related: ['roles', 'groups'],
    route: '/institutions',
  },
  {
    id: 'groups',
    title: 'Groups',
    section: 'blocks',
    roles: ['admin'],
    short: 'Student cohorts, organized hierarchically (e.g. a year → series → semigroups).',
    body: [
      'Groups represent the student populations that attend activities. They can nest: a large series can contain smaller subgroups/semigroups.',
      'Typically a lecture is taught to a whole series, while seminars and laboratories are taught to the smaller subgroups. A schedule can be viewed for any single group.',
    ],
    related: ['members', 'activities'],
    route: '/institutions',
  },
  {
    id: 'courses',
    title: 'Courses',
    section: 'blocks',
    roles: ['admin'],
    short: 'The subjects taught, e.g. “Algorithms” or “Linear Algebra”.',
    body: [
      'A course is simply a subject. On its own it has no time or room.',
      'You bring a course onto the timetable by creating activities - a lecture, seminar or lab - that link the course to groups and a professor.',
    ],
    related: ['activities'],
    route: '/institutions',
  },
  {
    id: 'rooms',
    title: 'Rooms',
    section: 'blocks',
    roles: ['admin'],
    short: 'Physical spaces with a capacity and features (e.g. a lab with computers).',
    body: [
      'Rooms have a capacity and a list of features (such as a projector, or “laborator” for computer labs).',
      'When generating a schedule, ODES places each activity in a room that is big enough for the attending group and provides the features that activity requires.',
    ],
    related: ['activities', 'generation'],
    route: '/institutions',
  },
  {
    id: 'activities',
    title: 'Activities',
    section: 'blocks',
    roles: ['admin'],
    short: 'The schedulable unit: a course taught to specific groups by a professor.',
    body: [
      'An activity is the core thing the scheduler places. It ties together a course, a type (lecture/seminar/laboratory), the group(s) attending, a professor, a duration, a frequency, and any required room features.',
      'Create all your activities before generating a schedule - the generator assigns each one a timeslot and a room.',
    ],
    steps: [
      'Pick the course.',
      'Choose the type: Lecture, Seminar or Laboratory.',
      'Select the group(s) that attend.',
      'Assign the professor.',
      'Set the duration (in timeslots) and the frequency.',
      'Add any required room features (e.g. computers).',
      'Optionally pin it to a fixed timeslot.',
    ],
    related: ['activity-types', 'frequency', 'courses', 'rooms', 'generation'],
    route: '/institutions',
  },
  {
    id: 'activity-types',
    title: 'Lecture, Seminar & Laboratory',
    section: 'blocks',
    roles: [],
    short: 'The three activity formats - lecture for whole-series teaching, seminar/lab for smaller groups.',
    body: [
      'Lecture - the main teaching session, usually delivered to a whole series.',
      'Seminar - a smaller, interactive session for a subgroup.',
      'Laboratory - a hands-on session, typically needing a room with computers.',
      '“Other” covers anything that doesn’t fit the above.',
    ],
    related: ['activities'],
  },
  {
    id: 'frequency',
    title: 'Frequency (weekly / biweekly)',
    section: 'blocks',
    roles: [],
    short: 'How often an activity repeats across the week rotation.',
    body: [
      'Weekly activities happen every week. Biweekly activities alternate - they run on either the odd or even weeks of the rotation.',
      'This matters when your institution’s time grid uses a multi-week rotation.',
    ],
    related: ['activities', 'time-grid'],
  },

  // ── Scheduling ───────────────────────────────────────────────────────────
  {
    id: 'time-grid',
    title: 'Time grid',
    section: 'scheduling',
    roles: ['admin'],
    short: 'The weekly structure: which days, how many timeslots per day, slot length and week rotation.',
    body: [
      'Each institution defines its time grid: the number of teaching days, timeslots per day, the start hour, the slot duration, and how many weeks make up the rotation.',
      'Schedules and professor availability are all expressed in these slots. Real calendar weeks can be mapped to rotation weeks for accurate calendar export.',
    ],
    related: ['institution', 'frequency', 'schedules'],
  },
  {
    id: 'timeslot-preferences',
    title: 'Availability & preferences',
    section: 'scheduling',
    roles: ['professor'],
    short: 'Professors mark each slot as desired, not ideal, or unavailable - the solver respects them.',
    body: [
      'On your profile, professors paint a weekly grid with three states: Desired (prefer to teach), Not ideal (can teach, but avoid), and Unavailable (cannot teach).',
      'You can also cap the maximum number of teaching slots per day. The scheduler builds a timetable that respects “unavailable” slots and honors your preferences wherever possible.',
    ],
    related: ['generation', 'my-schedule'],
    route: '/profile',
  },
  {
    id: 'generation',
    title: 'Generating a schedule',
    section: 'scheduling',
    roles: ['admin'],
    short: 'The optimizer assigns every activity a timeslot and room with no clashes.',
    body: [
      'When you generate a schedule, a constraint solver places all activities so that no group, professor or room is double-booked, room capacity and features fit, and professor availability is respected - optimizing for everyone’s preferences.',
      'You can pin specific activities to fixed slots beforehand, and re-generate at any time after changing activities or preferences.',
    ],
    related: ['activities', 'timeslot-preferences', 'rooms', 'schedules'],
    route: '/institutions',
  },
  {
    id: 'schedules',
    title: 'Schedules',
    section: 'scheduling',
    roles: ['admin', 'professor', 'student'],
    short: 'The generated timetables - viewable per group, professor or room, editable and exportable.',
    body: [
      'A schedule is the result of generation. View it filtered by group, professor or room, fine-tune it on the editable grid, and export it to PDF.',
      'Re-generate whenever your data changes - each run produces a fresh, clash-free timetable.',
    ],
    related: ['generation', 'my-schedule'],
    route: '/institutions',
  },
  {
    id: 'my-schedule',
    title: 'My Schedule',
    section: 'scheduling',
    roles: ['professor', 'student'],
    short: 'Your personal timetable across institutions, with calendar (iCal) export.',
    body: [
      'My Schedule gathers everything that concerns you - the activities you teach (professor) or attend (student) - into one personal calendar.',
      'Export it as an .ics file to subscribe in Google, Apple or Outlook Calendar and keep it in sync.',
    ],
    related: ['schedules'],
    route: '/my-schedule',
  },
  {
    id: 'reservations',
    title: 'Reservations',
    section: 'scheduling',
    roles: ['admin', 'professor'],
    short: 'Request a room for a one-off booking; ODES checks for conflicts.',
    body: [
      'Beyond the recurring schedule, members can request to reserve a room at a specific time.',
      'ODES checks the room isn’t already taken by the schedule or another reservation, and an admin approves or declines the request. Track requests and confirmed reservations from the Reservations tab.',
    ],
    related: ['rooms', 'schedules'],
  },

  // ── Account ──────────────────────────────────────────────────────────────
  {
    id: 'account',
    title: 'Your account & sign-in',
    section: 'account',
    roles: [],
    short: 'Sign in with email, Google or Microsoft; reset your password; manage your profile.',
    body: [
      'You can register with an email and password, or sign in with your Google or Microsoft account - no separate password needed for those.',
      'Forgot your password? Use the “Forgot password?” link on the sign-in page (this applies to password accounts only). You’ll get a reset link by email that expires in 30 minutes.',
      'Your profile holds your name, email, password (if you have one), and - for professors - your availability preferences.',
    ],
    related: ['timeslot-preferences'],
    route: '/profile',
  },
];

/** Ordered setup path shown to admins on the Help Center. */
export const SETUP_ORDER: { label: string; conceptId: string }[] = [
  { label: 'Create an institution', conceptId: 'institution' },
  { label: 'Add members & roles', conceptId: 'members' },
  { label: 'Create groups', conceptId: 'groups' },
  { label: 'Add courses', conceptId: 'courses' },
  { label: 'Add rooms', conceptId: 'rooms' },
  { label: 'Create activities', conceptId: 'activities' },
  { label: 'Professors set availability', conceptId: 'timeslot-preferences' },
  { label: 'Generate the schedule', conceptId: 'generation' },
];

/** Quick-reference glossary. */
export const GLOSSARY: { term: string; definition: string }[] = [
  { term: 'Institution', definition: 'The top-level workspace (a faculty/university) holding all your data.' },
  { term: 'Member', definition: 'A user belonging to an institution, with one or more roles.' },
  { term: 'Role', definition: 'Admin, Professor or Student - determines what a member can do.' },
  { term: 'Group', definition: 'A student cohort; can nest into subgroups (series → semigroups).' },
  { term: 'Course', definition: 'A subject; scheduled via activities.' },
  { term: 'Room', definition: 'A space with a capacity and features.' },
  { term: 'Feature', definition: 'A room capability (e.g. computers, projector) an activity may require.' },
  { term: 'Activity', definition: 'A course taught to groups by a professor - the unit the solver schedules.' },
  { term: 'Lecture', definition: 'Main teaching session, usually to a whole series.' },
  { term: 'Seminar', definition: 'Smaller interactive session.' },
  { term: 'Laboratory', definition: 'Hands-on session, usually needing computers.' },
  { term: 'Frequency', definition: 'Weekly or biweekly repetition across the rotation.' },
  { term: 'Timeslot', definition: 'One cell of the time grid (e.g. 10:00–12:00 on Monday).' },
  { term: 'Time grid', definition: 'An institution’s weekly structure: days, slots, start hour, rotation.' },
  { term: 'Preference', definition: 'A professor’s rating of a slot: desired, not ideal, or unavailable.' },
  { term: 'Schedule', definition: 'A generated, clash-free timetable.' },
  { term: 'Solver', definition: 'The optimizer that assigns timeslots and rooms to activities.' },
  { term: 'Reservation', definition: 'A one-off room booking checked against conflicts.' },
  { term: 'iCal (.ics)', definition: 'Calendar file format for subscribing to your schedule.' },
];

export const conceptById = (id: string): HelpConcept | undefined =>
  HELP_CONCEPTS.find((c) => c.id === id);
