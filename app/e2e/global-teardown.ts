import * as fs from 'fs';
import * as path from 'path';

const API_BASE = 'http://localhost:8080';
const FIXTURES_PATH = path.join(__dirname, '.fixtures.json');

async function apiCall(
  method: string,
  endpoint: string,
  body?: Record<string, unknown>,
  token?: string
): Promise<unknown> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    if (!text) return {};
    try { return JSON.parse(text); } catch { return text; }
  } catch (err) {
    console.warn(`[global-teardown] ${method} ${endpoint} error:`, err);
    return {};
  }
}

async function login(email: string, password: string): Promise<string> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
    });
    const data = await res.json() as { access_token: string };
    return data.access_token;
  } catch (err) {
    console.warn(`[global-teardown] login failed for ${email}:`, err);
    return '';
  }
}

async function deleteInstitution(token: string, institutionId: string): Promise<void> {
  try {
    await apiCall('DELETE', `/api/v1/institutions/${institutionId}`, undefined, token);
    console.log(`[global-teardown] Deleted institution ${institutionId}`);
  } catch (err) {
    console.warn(`[global-teardown] Failed to delete institution ${institutionId}:`, err);
  }
}

async function deleteUserAsSelf(email: string, password: string): Promise<void> {
  try {
    const token = await login(email, password);
    if (!token) return;
    await apiCall('DELETE', '/api/v1/users/me', undefined, token);
    console.log(`[global-teardown] Deleted user ${email}`);
  } catch (err) {
    console.warn(`[global-teardown] Failed to delete user ${email}:`, err);
  }
}

async function globalTeardown(): Promise<void> {
  console.log('[global-teardown] Starting cleanup...');

  if (!fs.existsSync(FIXTURES_PATH)) {
    console.log('[global-teardown] No fixtures file found, skipping teardown');
    return;
  }

  const fixtures = JSON.parse(fs.readFileSync(FIXTURES_PATH, 'utf-8'));

  // Login as admin
  const adminToken = await login(fixtures.adminEmail, fixtures.adminPassword);

  // Delete simple institution (cascades activities, rooms, groups, courses)
  if (fixtures.simpleInstitutionId) {
    await deleteInstitution(adminToken, fixtures.simpleInstitutionId);
  }

  // Delete complex institution (cascades everything)
  if (fixtures.complexInstitutionId) {
    await deleteInstitution(adminToken, fixtures.complexInstitutionId);
  }

  // Delete complex professors
  if (fixtures.complexProfessors) {
    await deleteUserAsSelf('e2e-prof-alpha@test.odes', 'E2eProfAlpha1234!');
    await deleteUserAsSelf('e2e-prof-beta@test.odes', 'E2eProfBeta1234!');
    await deleteUserAsSelf('e2e-prof-gamma@test.odes', 'E2eProfGamma1234!');
  }

  // Delete complex students
  if (fixtures.complexStudents) {
    await deleteUserAsSelf('e2e-student-y1a@test.odes', 'E2eStudentY1a1234!');
    await deleteUserAsSelf('e2e-student-y1b@test.odes', 'E2eStudentY1b1234!');
    await deleteUserAsSelf('e2e-student-y2a@test.odes', 'E2eStudentY2a1234!');
    await deleteUserAsSelf('e2e-student-y3a@test.odes', 'E2eStudentY3a1234!');
  }

  // Delete simple institution users
  await deleteUserAsSelf(fixtures.professorEmail, fixtures.professorPassword);
  await deleteUserAsSelf(fixtures.studentEmail, fixtures.studentPassword);

  // Delete admin last
  await deleteUserAsSelf(fixtures.adminEmail, fixtures.adminPassword);

  // Remove fixtures file
  try {
    fs.unlinkSync(FIXTURES_PATH);
    console.log('[global-teardown] Fixtures file removed');
  } catch (err) {
    console.warn('[global-teardown] Could not remove fixtures file:', err);
  }

  console.log('[global-teardown] Cleanup complete!');
}

export default globalTeardown;
