import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { login, apiCall } from '../../helpers/api';

// Validates solver behaviour that changed with the room-pooling / two-phase
// rewrite and the group timeslot-preference feature:
//   1. UNAVAILABLE group preferences are hard-honoured in the generated schedule.
//   2. No room is double-booked (the room-pooling + greedy colouring must keep
//      each room used by at most one activity per (week, time) — the soundness
//      property of the cumulative reformulation).
//
// Reads the schedule produced by schedules/generate.spec.ts (which runs first
// under the serial single-worker config) instead of regenerating.

interface ScheduledActivity {
  activity_id: string;
  room_id: string;
  start_timeslot: number;
  active_weeks: number[];
}
interface Activity { _id: string; duration_slots: number }

// Loaded inside each test (not at module scope): .fixtures.json is written by
// global-setup, which runs *after* Playwright imports the spec files.
function loadFixtures(): Record<string, any> {
  const p = path.join(__dirname, '..', '..', '.fixtures.json');
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

async function completedScheduleActivities(
  token: string,
  institutionId: string,
): Promise<ScheduledActivity[] | null> {
  const res = (await apiCall(
    'GET',
    `/api/v1/institutions/${institutionId}/schedules`,
    undefined,
    token,
  )) as { schedules: Array<{ _id: string; status: string }> };
  const completed = res.schedules.find((s) => s.status === 'completed');
  if (!completed) return null;
  const sa = (await apiCall(
    'GET',
    `/api/v1/schedules/${completed._id}/scheduled-activities`,
    undefined,
    token,
  )) as { scheduled_activities: ScheduledActivity[] };
  return sa.scheduled_activities;
}

test.describe('Schedule honours constraints', () => {
  test('respects group UNAVAILABLE timeslot preferences', async () => {
    const fixtures = loadFixtures();
    const token = await login(fixtures.adminEmail, fixtures.adminPassword);
    const scheduled = await completedScheduleActivities(token, fixtures.complexInstitutionId);
    test.skip(!scheduled, 'No completed schedule — generate.spec.ts must run first');

    const tpd = fixtures.complexTimeslotsPerDay as number;
    const blocked = new Set<number>(fixtures.complexUnavailableSlotsInDay as number[]);

    // Activities that belong to the preference group, with their durations.
    const actRes = (await apiCall(
      'GET',
      `/api/v1/groups/${fixtures.complexPreferenceGroupId}/activities`,
      undefined,
      token,
    )) as { activities: Activity[] };
    const durByActivity = new Map<string, number>(
      actRes.activities.map((a) => [a._id, a.duration_slots]),
    );
    expect(durByActivity.size).toBeGreaterThan(0);

    // No scheduled occurrence of a group activity may touch a blocked slot-in-day.
    const offending = scheduled!.filter((sa) => {
      const dur = durByActivity.get(sa.activity_id);
      if (dur === undefined) return false;
      const slotInDay = sa.start_timeslot % tpd;
      for (let s = slotInDay; s < slotInDay + dur; s++) {
        if (blocked.has(s)) return true;
      }
      return false;
    });
    expect(
      offending,
      `group activities placed in UNAVAILABLE slots: ${JSON.stringify(offending)}`,
    ).toHaveLength(0);
  });

  test('places a pinned (selected) timeslot exactly where requested', async () => {
    const fixtures = loadFixtures();
    const token = await login(fixtures.adminEmail, fixtures.adminPassword);
    const scheduled = await completedScheduleActivities(token, fixtures.complexInstitutionId);
    test.skip(!scheduled, 'No completed schedule — generate.spec.ts must run first');

    const rows = scheduled!.filter(
      (sa) => sa.activity_id === fixtures.complexPinnedActivityId,
    );
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(
        r.start_timeslot,
        `pinned activity scheduled at ${r.start_timeslot}, expected ${fixtures.complexPinnedStartTimeslot}`,
      ).toBe(fixtures.complexPinnedStartTimeslot);
    }
  });

  test('does not double-book any room', async () => {
    const fixtures = loadFixtures();
    const token = await login(fixtures.adminEmail, fixtures.adminPassword);
    const scheduled = await completedScheduleActivities(token, fixtures.complexInstitutionId);
    test.skip(!scheduled, 'No completed schedule — generate.spec.ts must run first');

    const allActs = (await apiCall(
      'GET',
      `/api/v1/institutions/${fixtures.complexInstitutionId}/activities`,
      undefined,
      token,
    )) as { activities: Activity[] };
    const durById = new Map<string, number>(
      allActs.activities.map((a) => [a._id, a.duration_slots]),
    );

    // Expand each scheduled activity into (room, week) occupancy spans.
    type Span = { start: number; end: number; week: number; room: string; id: string };
    const spans: Span[] = [];
    for (const sa of scheduled!) {
      const dur = durById.get(sa.activity_id) ?? 1;
      for (const w of sa.active_weeks) {
        spans.push({
          start: sa.start_timeslot,
          end: sa.start_timeslot + dur,
          week: w,
          room: sa.room_id,
          id: sa.activity_id,
        });
      }
    }

    // Brute-force overlap check — small dataset.  Two spans in the same room and
    // week must not overlap in time.
    for (let i = 0; i < spans.length; i++) {
      for (let j = i + 1; j < spans.length; j++) {
        const a = spans[i];
        const b = spans[j];
        if (a.room !== b.room || a.week !== b.week) continue;
        const overlaps = a.start < b.end && b.start < a.end;
        expect(
          overlaps,
          `room ${a.room} double-booked in week ${a.week}: ${a.id} vs ${b.id}`,
        ).toBeFalsy();
      }
    }
  });
});
