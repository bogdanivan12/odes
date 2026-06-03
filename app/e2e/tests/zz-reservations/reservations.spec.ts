import { expect } from '@playwright/test';
import { test } from '../../fixtures/auth.fixture';
import * as fs from 'fs';
import * as path from 'path';
import { login, apiCall } from '../../helpers/api';

// Room-reservation coverage, all from the admin account.  Lives in
// "zz-reservations" so it runs AFTER schedules/ - the conflict engine validates
// against the *active schedule*, which must already exist and be active.

interface Reservation { _id?: string; id?: string; status: string; decision_reason?: string | null }
interface SchedRecord { activity_id?: string; room_id?: string; start_timeslot: number }
interface TimeGrid { start_hour: number; start_minute: number; timeslot_duration_minutes: number; timeslots_per_day: number; start_day: number }

function loadFixtures(): Record<string, any> {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '.fixtures.json'), 'utf-8'));
}

const rid = (r: Reservation) => String(r._id ?? r.id ?? '');

// Timezone-safe ISO date arithmetic.
function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

test.describe.configure({ mode: 'serial' });

test.describe('Room reservations (admin)', () => {
  test('reservations page renders', async ({ adminPage }) => {
    const fixtures = loadFixtures();
    await adminPage.goto(`/institutions/${fixtures.complexInstitutionId}/requests`);
    await adminPage.waitForLoadState('networkidle');
    await expect(adminPage.getByRole('heading', { name: 'Room requests' })).toBeVisible({ timeout: 10_000 });
    await expect(adminPage.getByRole('button', { name: 'New reservation' })).toBeVisible({ timeout: 10_000 });
  });

  test('lifecycle: create, approve, conflict-block, refuse, delete', async () => {
    const fixtures = loadFixtures();
    const token = await login(fixtures.adminEmail, fixtures.adminPassword);
    const instId = fixtures.complexInstitutionId;
    const roomId = fixtures.complexReservationRoomId;
    // A day inside calendar week 1, in the evening (20:00+) - outside the
    // schedule's daily window (08:00–20:00), so it can't collide with classes
    // regardless of which weekdays the institution runs on.
    const date = addDays(fixtures.complexWeek1Monday, 2);
    const url = `/api/v1/institutions/${instId}/reservations`;

    // A: 20:00–21:00 → pending → approve
    const a = (await apiCall('POST', url, { room_id: roomId, date, start_minute: 1200, end_minute: 1260, reason: 'E2E A' }, token)) as { reservation: Reservation };
    expect(a.reservation.status).toBe('pending');
    const aId = rid(a.reservation);
    const approved = (await apiCall('POST', `/api/v1/reservations/${aId}/approve`, undefined, token)) as { reservation: Reservation };
    expect(approved.reservation.status).toBe('approved');

    // Overlapping slot (20:00–22:00) conflicts with the APPROVED reservation
    const conflict = (await apiCall('POST', `${url}/check-conflict`, { room_id: roomId, date, start_minute: 1200, end_minute: 1320 }, token)) as { ok: boolean; conflicts: { type: string }[] };
    expect(conflict.ok).toBe(false);
    expect(conflict.conflicts.some((c) => c.type === 'reservation')).toBe(true);

    let rejected = false;
    try {
      await apiCall('POST', url, { room_id: roomId, date, start_minute: 1200, end_minute: 1320, reason: 'overlap' }, token);
    } catch (err) { rejected = true; expect(String(err)).toContain('409'); }
    expect(rejected).toBe(true);

    // Non-overlapping slot (21:00–22:00) is free → create C, refuse with reason
    const free = (await apiCall('POST', `${url}/check-conflict`, { room_id: roomId, date, start_minute: 1260, end_minute: 1320 }, token)) as { ok: boolean };
    expect(free.ok).toBe(true);
    const c = (await apiCall('POST', url, { room_id: roomId, date, start_minute: 1260, end_minute: 1320, reason: 'E2E C' }, token)) as { reservation: Reservation };
    const cId = rid(c.reservation);
    const refused = (await apiCall('POST', `/api/v1/reservations/${cId}/refuse`, { reason: 'No reason needed' }, token)) as { reservation: Reservation };
    expect(refused.reservation.status).toBe('refused');
    expect(refused.reservation.decision_reason).toBe('No reason needed');

    // Create D (22:00–23:00), delete it
    const d = (await apiCall('POST', url, { room_id: roomId, date, start_minute: 1320, end_minute: 1380, reason: 'E2E D' }, token)) as { reservation: Reservation };
    const dId = rid(d.reservation);
    await apiCall('DELETE', `/api/v1/reservations/${dId}`, undefined, token);

    const list = (await apiCall('GET', url, undefined, token)) as { reservations: Reservation[] };
    const byId = new Map(list.reservations.map((r) => [rid(r), r]));
    expect(byId.get(aId)?.status).toBe('approved');
    expect(byId.get(cId)?.status).toBe('refused');
    expect(byId.has(dId)).toBe(false);
  });

  test('the active schedule blocks a reservation in an occupied room/time', async () => {
    const fixtures = loadFixtures();
    const token = await login(fixtures.adminEmail, fixtures.adminPassword);
    const instId = fixtures.complexInstitutionId;

    const inst = (await apiCall('GET', `/api/v1/institutions/${instId}`, undefined, token)) as { institution: { active_schedule_id?: string | null; time_grid_config: TimeGrid } };
    const scheduleId = inst.institution.active_schedule_id;
    test.skip(!scheduleId, 'No active schedule - generate.spec must have run and set one active.');
    const tg = inst.institution.time_grid_config;

    const sa = (await apiCall('GET', `/api/v1/schedules/${scheduleId}/scheduled-activities`, undefined, token)) as { scheduled_activities: SchedRecord[] };
    const pinned = sa.scheduled_activities.find((r) => String(r.activity_id) === fixtures.complexPinnedActivityId);
    test.skip(!pinned, 'Pinned activity not found in the active schedule.');

    // Compute the activity's real weekday + clock time, then a matching date in
    // calendar week 1 (its Monday + weekday offset).
    const day = Math.floor(pinned!.start_timeslot / tg.timeslots_per_day);
    const slotInDay = pinned!.start_timeslot % tg.timeslots_per_day;
    const weekday = (tg.start_day + day) % 7;
    const date = addDays(fixtures.complexWeek1Monday, weekday);
    const startMin = tg.start_hour * 60 + tg.start_minute + slotInDay * tg.timeslot_duration_minutes;
    const endMin = startMin + 2 * tg.timeslot_duration_minutes; // pinned activity is 2 slots
    const roomId = String(pinned!.room_id);

    const check = (await apiCall('POST', `/api/v1/institutions/${instId}/reservations/check-conflict`, {
      room_id: roomId, date, start_minute: startMin, end_minute: endMin,
    }, token)) as { ok: boolean; conflicts: { type: string }[] };
    expect(check.ok).toBe(false);
    expect(check.conflicts.some((c) => c.type === 'schedule')).toBe(true);

    let rejected = false;
    try {
      await apiCall('POST', `/api/v1/institutions/${instId}/reservations`, {
        room_id: roomId, date, start_minute: startMin, end_minute: endMin, reason: 'clashes with class',
      }, token);
    } catch (err) { rejected = true; expect(String(err)).toContain('409'); }
    expect(rejected).toBe(true);
  });
});
