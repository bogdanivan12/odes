import * as fs from 'fs';
import * as path from 'path';

const API_BASE = 'http://localhost:8080';
const FIXTURES_PATH = path.join(__dirname, '.fixtures.json');

async function apiCall(
  method: string,
  endpoint: string,
  body?: Record<string, unknown> | string,
  token?: string,
  contentType?: string
): Promise<unknown> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let bodyStr: string | undefined;
  if (body !== undefined) {
    if (contentType === 'application/x-www-form-urlencoded') {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      bodyStr = typeof body === 'string' ? body : new URLSearchParams(body as Record<string, string>).toString();
    } else {
      headers['Content-Type'] = 'application/json';
      bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    }
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: bodyStr,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${method} ${endpoint} failed with ${res.status}: ${text}`);
  }

  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function login(email: string, password: string): Promise<string> {
  const data = await apiCall(
    'POST',
    '/api/v1/auth/token',
    `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
    undefined,
    'application/x-www-form-urlencoded'
  ) as { access_token: string };
  return data.access_token;
}

// ── Pre-cleanup ───────────────────────────────────────────────────────────────
// Runs before every setup to remove leftovers from a previous failed run.
// All errors are swallowed — if nothing exists yet, that's fine.

const TEST_INSTITUTION_NAMES = ['E2E Test University', 'E2E Complex University'];

const TEST_USERS: { email: string; password: string }[] = [
  { email: 'e2e-admin@test.odes',        password: 'E2eAdmin1234!'       },
  { email: 'e2e-prof@test.odes',         password: 'E2eProf1234!'        },
  { email: 'e2e-student@test.odes',      password: 'E2eStudent1234!'     },
  { email: 'e2e-prof-alpha@test.odes',   password: 'E2eProfAlpha1234!'   },
  { email: 'e2e-prof-beta@test.odes',    password: 'E2eProfBeta1234!'    },
  { email: 'e2e-prof-gamma@test.odes',   password: 'E2eProfGamma1234!'   },
  { email: 'e2e-student-y1a@test.odes',  password: 'E2eStudentY1a1234!'  },
  { email: 'e2e-student-y1b@test.odes',  password: 'E2eStudentY1b1234!'  },
  { email: 'e2e-student-y2a@test.odes',  password: 'E2eStudentY2a1234!'  },
  { email: 'e2e-student-y3a@test.odes',  password: 'E2eStudentY3a1234!'  },
];

async function preCleanup(): Promise<void> {
  console.log('[global-setup] Pre-cleanup: removing any leftover test data...');

  // Delete test institutions (requires admin token — do this first, before
  // deleting the admin user).
  try {
    const adminToken = await login('e2e-admin@test.odes', 'E2eAdmin1234!');
    const data = await apiCall('GET', '/api/v1/institutions', undefined, adminToken) as {
      institutions: Array<{ _id: string; name: string }>;
    };
    for (const inst of data.institutions) {
      if (TEST_INSTITUTION_NAMES.includes(inst.name)) {
        try {
          await apiCall('DELETE', `/api/v1/institutions/${inst._id}`, undefined, adminToken);
          console.log(`[global-setup] Deleted institution: ${inst.name}`);
        } catch { /* ignore */ }
      }
    }
  } catch { /* admin doesn't exist yet — nothing to clean up */ }

  // Delete every test user (each must be deleted via their own token).
  for (const { email, password } of TEST_USERS) {
    try {
      const token = await login(email, password);
      await apiCall('DELETE', '/api/v1/users/me', undefined, token);
      console.log(`[global-setup] Deleted user: ${email}`);
    } catch { /* user doesn't exist — nothing to do */ }
  }

  console.log('[global-setup] Pre-cleanup done.');
}

// All API responses are wrapped: POST /users → { user: {...} }, etc.
// Each helper unwraps the relevant nested object to return the entity id.

async function registerUser(name: string, email: string, password: string): Promise<string> {
  const data = await apiCall('POST', '/api/v1/users', { name, email, password }) as { user: { _id: string } };
  return data.user._id;
}

async function createInstitution(
  token: string,
  name: string,
  weeks: number,
  days: number,
  timeslotsPerDay: number,
  maxTimeslotsPerDayPerGroup: number,
  startHour: number,
  startMinute: number,
  timeslotDurationMinutes: number,
  startDay: number
): Promise<string> {
  const data = await apiCall('POST', '/api/v1/institutions', {
    name,
    time_grid_config: {
      weeks,
      days,
      timeslots_per_day: timeslotsPerDay,
      max_timeslots_per_day_per_group: maxTimeslotsPerDayPerGroup,
      start_hour: startHour,
      start_minute: startMinute,
      timeslot_duration_minutes: timeslotDurationMinutes,
      start_day: startDay,
    },
  }, token) as { institution: { _id: string } };
  return data.institution._id;
}

async function getUserId(token: string): Promise<string> {
  const data = await apiCall('GET', '/api/v1/users/me', undefined, token) as { user: { _id: string } };
  return data.user._id;
}

async function addUserToInstitution(token: string, institutionId: string, userId: string, role: string): Promise<void> {
  await apiCall('POST', `/api/v1/institutions/${institutionId}/users/${userId}/roles/${role}`, undefined, token);
}

async function createCourse(token: string, institutionId: string, name: string): Promise<string> {
  const data = await apiCall('POST', '/api/v1/courses', { institution_id: institutionId, name }, token) as { course: { _id: string } };
  return data.course._id;
}

async function createGroup(token: string, institutionId: string, name: string): Promise<string> {
  const data = await apiCall('POST', '/api/v1/groups', { institution_id: institutionId, name }, token) as { group: { _id: string } };
  return data.group._id;
}

async function addStudentToGroup(token: string, groupId: string, userId: string): Promise<void> {
  await apiCall('POST', `/api/v1/groups/${groupId}/students/${userId}`, undefined, token);
}

async function createRoom(token: string, institutionId: string, name: string, capacity: number, features: string[]): Promise<string> {
  const data = await apiCall('POST', '/api/v1/rooms', {
    institution_id: institutionId,
    name,
    capacity,
    features,
  }, token) as { room: { _id: string } };
  return data.room._id;
}

async function createActivity(
  token: string,
  institutionId: string,
  courseId: string,
  activityType: string,
  groupId: string,
  professorId: string,
  durationSlots: number,
  frequency: string,
  requiredRoomFeatures: string[]
): Promise<string> {
  const data = await apiCall('POST', '/api/v1/activities', {
    institution_id: institutionId,
    course_id: courseId,
    activity_type: activityType,
    group_id: groupId,
    professor_id: professorId,
    duration_slots: durationSlots,
    required_room_features: requiredRoomFeatures,
    frequency,
  }, token) as { activity: { _id: string } };
  return data.activity._id;
}

async function globalSetup(): Promise<void> {
  await preCleanup();
  console.log('[global-setup] Starting fixture creation...');

  // ── Register users ──────────────────────────────────────────────────────────
  console.log('[global-setup] Registering admin user...');
  const adminId = await registerUser('E2E Admin', 'e2e-admin@test.odes', 'E2eAdmin1234!');
  console.log(`[global-setup] Admin user created: ${adminId}`);

  console.log('[global-setup] Registering professor user...');
  const professorId = await registerUser('E2E Professor', 'e2e-prof@test.odes', 'E2eProf1234!');
  console.log(`[global-setup] Professor user created: ${professorId}`);

  console.log('[global-setup] Registering student user...');
  const studentId = await registerUser('E2E Student', 'e2e-student@test.odes', 'E2eStudent1234!');
  console.log(`[global-setup] Student user created: ${studentId}`);

  // ── Login admin ─────────────────────────────────────────────────────────────
  const adminToken = await login('e2e-admin@test.odes', 'E2eAdmin1234!');
  console.log('[global-setup] Admin logged in successfully');

  // ── Create simple institution ────────────────────────────────────────────────
  console.log('[global-setup] Creating simple institution...');
  const simpleInstitutionId = await createInstitution(
    adminToken,
    'E2E Test University',
    2, 5, 12, 8,
    8, 0, 60, 1
  );
  console.log(`[global-setup] Simple institution created: ${simpleInstitutionId}`);

  // Add professor and student to institution
  await addUserToInstitution(adminToken, simpleInstitutionId, professorId, 'professor');
  console.log('[global-setup] Professor added to simple institution');

  await addUserToInstitution(adminToken, simpleInstitutionId, studentId, 'student');
  console.log('[global-setup] Student added to simple institution');

  // ── Create courses ───────────────────────────────────────────────────────────
  console.log('[global-setup] Creating courses...');
  const mathId = await createCourse(adminToken, simpleInstitutionId, 'Mathematics');
  const csId = await createCourse(adminToken, simpleInstitutionId, 'Computer Science');
  const algoId = await createCourse(adminToken, simpleInstitutionId, 'Algorithms');
  const dbId = await createCourse(adminToken, simpleInstitutionId, 'Databases');
  const osId = await createCourse(adminToken, simpleInstitutionId, 'Operating Systems');
  console.log('[global-setup] Courses created');

  // ── Create groups ────────────────────────────────────────────────────────────
  console.log('[global-setup] Creating groups...');
  const groupAId = await createGroup(adminToken, simpleInstitutionId, 'Group A');
  const groupBId = await createGroup(adminToken, simpleInstitutionId, 'Group B');
  console.log('[global-setup] Groups created');

  await addStudentToGroup(adminToken, groupAId, studentId);
  console.log('[global-setup] Student added to Group A');

  // ── Create rooms ─────────────────────────────────────────────────────────────
  console.log('[global-setup] Creating rooms...');
  const lectureHallId = await createRoom(adminToken, simpleInstitutionId, 'Lecture Hall 101', 100, []);
  const labId = await createRoom(adminToken, simpleInstitutionId, 'Lab 201', 30, ['laborator']);
  console.log('[global-setup] Rooms created');

  // ── Create activities ────────────────────────────────────────────────────────
  console.log('[global-setup] Creating activities...');
  const mathLectureId = await createActivity(
    adminToken, simpleInstitutionId, mathId,
    'lecture', groupAId, professorId, 2, 'weekly', []
  );
  const csLabId = await createActivity(
    adminToken, simpleInstitutionId, csId,
    'laboratory', groupAId, professorId, 2, 'weekly', ['laborator']
  );
  console.log('[global-setup] Activities created');

  // ── Complex institution ──────────────────────────────────────────────────────
  console.log('[global-setup] Registering extra professors for complex institution...');
  const profAlphaId = await registerUser('Prof Alpha', 'e2e-prof-alpha@test.odes', 'E2eProfAlpha1234!');
  const profBetaId = await registerUser('Prof Beta', 'e2e-prof-beta@test.odes', 'E2eProfBeta1234!');
  const profGammaId = await registerUser('Prof Gamma', 'e2e-prof-gamma@test.odes', 'E2eProfGamma1234!');
  console.log('[global-setup] Extra professors registered');

  console.log('[global-setup] Registering students for complex institution...');
  const studentY1aId = await registerUser('Student Y1A', 'e2e-student-y1a@test.odes', 'E2eStudentY1a1234!');
  const studentY1bId = await registerUser('Student Y1B', 'e2e-student-y1b@test.odes', 'E2eStudentY1b1234!');
  const studentY2aId = await registerUser('Student Y2A', 'e2e-student-y2a@test.odes', 'E2eStudentY2a1234!');
  const studentY3aId = await registerUser('Student Y3A', 'e2e-student-y3a@test.odes', 'E2eStudentY3a1234!');
  console.log('[global-setup] Complex students registered');

  console.log('[global-setup] Creating complex institution...');
  const complexInstitutionId = await createInstitution(
    adminToken,
    'E2E Complex University',
    2, 5, 12, 8,
    8, 0, 60, 1
  );
  console.log(`[global-setup] Complex institution created: ${complexInstitutionId}`);

  // Add all professors to complex institution
  await addUserToInstitution(adminToken, complexInstitutionId, professorId, 'professor');
  await addUserToInstitution(adminToken, complexInstitutionId, profAlphaId, 'professor');
  await addUserToInstitution(adminToken, complexInstitutionId, profBetaId, 'professor');
  await addUserToInstitution(adminToken, complexInstitutionId, profGammaId, 'professor');
  console.log('[global-setup] Professors added to complex institution');

  // Add students to complex institution
  await addUserToInstitution(adminToken, complexInstitutionId, studentY1aId, 'student');
  await addUserToInstitution(adminToken, complexInstitutionId, studentY1bId, 'student');
  await addUserToInstitution(adminToken, complexInstitutionId, studentY2aId, 'student');
  await addUserToInstitution(adminToken, complexInstitutionId, studentY3aId, 'student');
  console.log('[global-setup] Students added to complex institution');

  // Create groups for complex institution
  console.log('[global-setup] Creating complex institution groups...');
  const year1aId = await createGroup(adminToken, complexInstitutionId, 'Year1-A');
  const year1bId = await createGroup(adminToken, complexInstitutionId, 'Year1-B');
  const year2aId = await createGroup(adminToken, complexInstitutionId, 'Year2-A');
  const year2bId = await createGroup(adminToken, complexInstitutionId, 'Year2-B');
  const year3aId = await createGroup(adminToken, complexInstitutionId, 'Year3-A');
  const year3bId = await createGroup(adminToken, complexInstitutionId, 'Year3-B');
  console.log('[global-setup] Complex groups created');

  await addStudentToGroup(adminToken, year1aId, studentY1aId);
  await addStudentToGroup(adminToken, year1bId, studentY1bId);
  await addStudentToGroup(adminToken, year2aId, studentY2aId);
  await addStudentToGroup(adminToken, year3aId, studentY3aId);
  console.log('[global-setup] Students added to complex groups');

  // Create courses for complex institution
  console.log('[global-setup] Creating complex courses...');
  const cMathIId = await createCourse(adminToken, complexInstitutionId, 'Mathematics I');
  const cPhysicsIId = await createCourse(adminToken, complexInstitutionId, 'Physics I');
  const cProgIId = await createCourse(adminToken, complexInstitutionId, 'Programming I');
  const cMathIIId = await createCourse(adminToken, complexInstitutionId, 'Mathematics II');
  const cAlgoId = await createCourse(adminToken, complexInstitutionId, 'Algorithms');
  const cDbId = await createCourse(adminToken, complexInstitutionId, 'Databases');
  const cSEId = await createCourse(adminToken, complexInstitutionId, 'Software Engineering');
  console.log('[global-setup] Complex courses created');

  // Create rooms for complex institution
  console.log('[global-setup] Creating complex rooms...');
  const hallAId = await createRoom(adminToken, complexInstitutionId, 'Hall A', 150, []);
  const hallBId = await createRoom(adminToken, complexInstitutionId, 'Hall B', 100, []);
  const seminar1Id = await createRoom(adminToken, complexInstitutionId, 'Seminar 1', 30, []);
  const seminar2Id = await createRoom(adminToken, complexInstitutionId, 'Seminar 2', 30, []);
  const seminar3Id = await createRoom(adminToken, complexInstitutionId, 'Seminar 3', 30, []);
  const seminar4Id = await createRoom(adminToken, complexInstitutionId, 'Seminar 4', 30, []);
  const cLab1Id = await createRoom(adminToken, complexInstitutionId, 'Lab 1', 25, ['laborator']);
  const cLab2Id = await createRoom(adminToken, complexInstitutionId, 'Lab 2', 25, ['laborator']);
  console.log('[global-setup] Complex rooms created');

  // Create activities for complex institution
  console.log('[global-setup] Creating complex activities...');

  // Year 1 - Mathematics I
  await createActivity(adminToken, complexInstitutionId, cMathIId, 'lecture', year1aId, profAlphaId, 2, 'weekly', []);
  await createActivity(adminToken, complexInstitutionId, cMathIId, 'lecture', year1bId, profAlphaId, 2, 'weekly', []);
  await createActivity(adminToken, complexInstitutionId, cMathIId, 'seminar', year1aId, profAlphaId, 2, 'biweekly', []);
  await createActivity(adminToken, complexInstitutionId, cMathIId, 'seminar', year1bId, profAlphaId, 2, 'biweekly', []);

  // Year 1 - Physics I
  await createActivity(adminToken, complexInstitutionId, cPhysicsIId, 'lecture', year1aId, profBetaId, 2, 'weekly', []);
  await createActivity(adminToken, complexInstitutionId, cPhysicsIId, 'lecture', year1bId, profBetaId, 2, 'weekly', []);
  await createActivity(adminToken, complexInstitutionId, cPhysicsIId, 'laboratory', year1aId, profBetaId, 2, 'biweekly', ['laborator']);
  await createActivity(adminToken, complexInstitutionId, cPhysicsIId, 'laboratory', year1bId, profBetaId, 2, 'biweekly', ['laborator']);

  // Year 1 - Programming I
  await createActivity(adminToken, complexInstitutionId, cProgIId, 'lecture', year1aId, profGammaId, 2, 'weekly', []);
  await createActivity(adminToken, complexInstitutionId, cProgIId, 'lecture', year1bId, profGammaId, 2, 'weekly', []);
  await createActivity(adminToken, complexInstitutionId, cProgIId, 'laboratory', year1aId, profGammaId, 2, 'weekly', ['laborator']);
  await createActivity(adminToken, complexInstitutionId, cProgIId, 'laboratory', year1bId, profGammaId, 2, 'weekly', ['laborator']);

  // Year 2 - Mathematics II
  await createActivity(adminToken, complexInstitutionId, cMathIIId, 'lecture', year2aId, profAlphaId, 2, 'weekly', []);
  await createActivity(adminToken, complexInstitutionId, cMathIIId, 'lecture', year2bId, profAlphaId, 2, 'weekly', []);

  // Year 2 - Algorithms
  await createActivity(adminToken, complexInstitutionId, cAlgoId, 'lecture', year2aId, profGammaId, 2, 'weekly', []);
  await createActivity(adminToken, complexInstitutionId, cAlgoId, 'lecture', year2bId, profGammaId, 2, 'weekly', []);
  await createActivity(adminToken, complexInstitutionId, cAlgoId, 'seminar', year2aId, profGammaId, 2, 'biweekly', []);
  await createActivity(adminToken, complexInstitutionId, cAlgoId, 'seminar', year2bId, profGammaId, 2, 'biweekly', []);

  // Year 2 - Databases
  await createActivity(adminToken, complexInstitutionId, cDbId, 'lecture', year2aId, profBetaId, 2, 'weekly', []);
  await createActivity(adminToken, complexInstitutionId, cDbId, 'lecture', year2bId, profBetaId, 2, 'weekly', []);
  await createActivity(adminToken, complexInstitutionId, cDbId, 'laboratory', year2aId, profBetaId, 2, 'weekly', ['laborator']);
  await createActivity(adminToken, complexInstitutionId, cDbId, 'laboratory', year2bId, profBetaId, 2, 'weekly', ['laborator']);

  // Year 3 - Software Engineering
  await createActivity(adminToken, complexInstitutionId, cSEId, 'lecture', year3aId, profAlphaId, 2, 'weekly', []);
  await createActivity(adminToken, complexInstitutionId, cSEId, 'lecture', year3bId, profAlphaId, 2, 'weekly', []);
  await createActivity(adminToken, complexInstitutionId, cSEId, 'seminar', year3aId, profGammaId, 2, 'biweekly', []);
  await createActivity(adminToken, complexInstitutionId, cSEId, 'seminar', year3bId, profGammaId, 2, 'biweekly', []);

  console.log('[global-setup] Complex activities created');

  // ── Write fixtures ───────────────────────────────────────────────────────────
  const fixtures = {
    adminId,
    adminEmail: 'e2e-admin@test.odes',
    adminPassword: 'E2eAdmin1234!',

    professorId,
    professorEmail: 'e2e-prof@test.odes',
    professorPassword: 'E2eProf1234!',

    studentId,
    studentEmail: 'e2e-student@test.odes',
    studentPassword: 'E2eStudent1234!',

    simpleInstitutionId,
    simpleInstitutionName: 'E2E Test University',

    courseIds: {
      mathematics: mathId,
      computerScience: csId,
      algorithms: algoId,
      databases: dbId,
      operatingSystems: osId,
    },
    groupIds: {
      groupA: groupAId,
      groupB: groupBId,
    },
    roomIds: {
      lectureHall101: lectureHallId,
      lab201: labId,
    },
    activityIds: {
      mathLecture: mathLectureId,
      csLab: csLabId,
    },

    complexInstitutionId,
    complexInstitutionName: 'E2E Complex University',

    complexProfessors: {
      profAlphaId,
      profBetaId,
      profGammaId,
    },
    complexStudents: {
      studentY1aId,
      studentY1bId,
      studentY2aId,
      studentY3aId,
    },
    complexGroups: {
      year1aId,
      year1bId,
      year2aId,
      year2bId,
      year3aId,
      year3bId,
    },
    complexRooms: {
      hallAId,
      hallBId,
      seminar1Id,
      seminar2Id,
      seminar3Id,
      seminar4Id,
      cLab1Id,
      cLab2Id,
    },
  };

  fs.writeFileSync(FIXTURES_PATH, JSON.stringify(fixtures, null, 2));
  console.log(`[global-setup] Fixtures written to ${FIXTURES_PATH}`);
  console.log('[global-setup] Setup complete!');
}

export default globalSetup;
