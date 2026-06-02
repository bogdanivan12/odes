import { expect } from '@playwright/test';
import { test } from '../../fixtures/auth.fixture';
import * as fs from 'fs';
import * as path from 'path';
import { login, apiCall } from '../../helpers/api';

// Room-reservation coverage, all from the admin account.  This suite lives in
// "zz-reservations" so it runs AFTER schedules/ — the conflict engine validates
// against the *active schedule*, so a schedule must already exist and be active.

interface Reservation {
  _id?: string;
  id?: string;
  status: string;
  decision_reason?: string | null;
}
interface SchedRecord { activity_id?: string; room_id?: string; start_timeslot: number }

function loadFixtures(): Record<string, any> {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '.fixtures.json'), 'utf-8'));
}

const rid = (r: Reservation) => String(r._id ?? r.id ?? '');

test.describe.configure({ mode: 'serial' });

test.describe('Room reservations (admin)', () => {
  test('reservations page renders', async ({ adminPage }) => {
    const fixtures = loadFixtures();
    await adminPage.goto(`/institutions/${fixtures.complexInstitutionId}/requests`);
    await adminPage.waitForLoadState('networkidle');
    await expect(adminPage.getByRole('heading', { name: 'Room requests' })).toBeVisible({ timeout: 10_000 });
    await expect(adminPage.getByRole('button', { name: 'New reservation' })).toBeVisible({ timeout: 10_000 });
  });

  test('lifecycle on a free day: create, approve, conflict-block, refuse, delete', async () => {
    const fixtures = loadFixtures();
    const token = await login(fixtures.adminEmail, fixtures.adminPassword);
    const instId = fixtures.complexInstitutionId;
    const roomId = fixtures.complexReservationRoomId;
    const date = fixtures.complexReservationFreeDate; // day 5 — never occupied by the schedule
    const url = `/api/v1/institutions/${instId}/reservations`;

    // Create A (08:00–10:00) → pending → approve
    const a = (await apiCall('POST', url, { room_id: roomId, date, start_minute: 480, end_minute: 600, reason: 'E2E A' }, token)) as { reservation: Reservation };
    expect(a.reservation.status).toBe('pending');
    const aId = rid(a.reservation);
    const approved = (await apiCall('POST', `/api/v1/reservations/${aId}/approve`, undefined, token)) as { reservation: Reservation };
    expect(approved.reservation.status).toBe('approved');

    // Overlapping slot now conflicts with the APPROVED reservation
    const conflict = (await apiCall('POST', `${url}/check-conflict`, { room_id: roomId, date, start_minute: 540, end_minute: 660 }, token)) as { ok: boolean; conflicts: { type: string }[] };
    expect(conflict.ok).toBe(false);
    expect(conflict.conflicts.some((c) => c.type === 'reservation')).toBe(true);

    // Creating it is rejected (409)
    let rejected = false;
    try {
      await apiCall('POST', url, { room_id: roomId, date, start_minute: 540, end_minute: 660, reason: 'overlap' }, token);
    } catch (err) { rejected = true; expect(String(err)).toContain('409'); }
    expect(rejected).toBe(true);

    // Non-overlapping slot is free → create C, refuse with reason
    const free = (await apiCall('POST', `${url}/check-conflict`, { room_id: roomId, date, start_minute: 600, end_minute: 660 }, token)) as { ok: boolean };
    expect(free.ok).toBe(true);
    const c = (await apiCall('POST', url, { room_id: roomId, date, start_minute: 600, end_minute: 660, reason: 'E2E C' }, token)) as { reservation: Reservation };
    const cId = rid(c.reservation);
    const refused = (await apiCall('POST', `/api/v1/reservations/${cId}/refuse`, { reason: 'No reason needed' }, token)) as { reservation: Reservation };
    expect(refused.reservation.status).toBe('refused');
    expect(refused.reservation.decision_reason).toBe('No reason needed');

    // Create D, delete it
    const d = (await apiCall('POST', url, { room_id: roomId, date, start_minute: 660, end_minute: 720, reason: 'E2E D' }, token)) as { reservation: Reservation };
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

    // Find the active schedule and the pinned activity within it.
    const inst = (await apiCall('GET', `/api/v1/institutions/${instId}`, undefined, token)) as { institution: { active_schedule_id?: string | null } };
    const scheduleId = inst.institution.active_schedule_id;
    test.skip(!scheduleId, 'No active schedule — generate.spec must have run and set one active.');

    const sa = (await apiCall('GET', `/api/v1/schedules/${scheduleId}/scheduled-activities`, undefined, token)) as { scheduled_activities: SchedRecord[] };
    const pinned = sa.scheduled_activities.find((r) => String(r.activity_id) === fixtures.complexPinnedActivityId);
    test.skip(!pinned, 'Pinned activity not found in the active schedule.');

    // It is pinned to start_timeslot 4 → day 0, slot 4 → 12:00–14:00 (duration 2).
    const tpd = fixtures.complexTimeslotsPerDay as number; // 12
    const slotInDay = pinned!.start_timeslot % tpd;
    const startMin = 8 * 60 + slotInDay * 60; // grid starts 08:00, 60-min slots
    const endMin = startMin + 2 * 60;
    const roomId = String(pinned!.room_id);
    const date = fixtures.complexReservationScheduleDate; // day 0 of week 1

    const check = (await apiCall('POST', `/api/v1/institutions/${instId}/reservations/check-conflict`, {
      room_id: roomId, date, start_minute: startMin, end_minute: endMin,
    }, token)) as { ok: boolean; conflicts: { type: string }[] };
    expect(check.ok).toBe(false);
    expect(check.conflicts.some((c) => c.type === 'schedule')).toBe(true);

    // And creating it is rejected (409).
    let rejected = false;
    try {
      await apiCall('POST', `/api/v1/institutions/${instId}/reservations`, {
        room_id: roomId, date, start_minute: startMin, end_minute: endMin, reason: 'clashes with class',
      }, token);
    } catch (err) { rejected = true; expect(String(err)).toContain('409'); }
    expect(rejected).toBe(true);
  });
});
