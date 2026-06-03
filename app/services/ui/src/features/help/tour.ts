import { driver, type DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';

// Bump the suffix to re-show the tour to everyone after a major change.
const TOUR_FLAG = 'odes_tour_done_v1';

/**
 * Steps for the product tour. Each targets a `data-tour="…"` anchor in the
 * navbar / layout. Steps whose element isn't on the page (e.g. the per-
 * institution nav when no institution is selected) are skipped automatically.
 */
const STEPS: DriveStep[] = [
  {
    element: '[data-tour="institution-selector"]',
    popover: {
      title: 'Start with an institution',
      description: 'Everything in ODES lives inside an institution (a faculty or university). Pick one here, or create a new one.',
    },
  },
  {
    element: '[data-tour="nav-pages"]',
    popover: {
      title: 'Build your schedule',
      description: 'For the selected institution you manage members, groups, courses, rooms and activities - then generate a clash-free schedule.',
    },
  },
  {
    element: '[data-tour="my-schedule"]',
    popover: {
      title: 'My Schedule',
      description: 'Your own timetable across every institution, with calendar (iCal) export.',
    },
  },
  {
    element: '[data-tour="help-button"]',
    popover: {
      title: 'Help is always here',
      description: 'Open the full guide anytime - every concept is explained, with a glossary and setup steps.',
    },
  },
  {
    element: '[data-tour="account"]',
    popover: {
      title: 'Your account',
      description: 'Profile and availability, settings, the guide, and sign out.',
    },
  },
];

function availableSteps(): DriveStep[] {
  return STEPS.filter((s) => {
    if (typeof s.element !== 'string') return false;
    const el = document.querySelector(s.element) as HTMLElement | null;
    if (!el) return false;
    // Skip elements hidden on the current viewport (e.g. desktop-only nav on mobile).
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
}

/** Start the guided tour immediately (used by the "Take a tour" menu item). */
export function startTour(): void {
  const steps = availableSteps();
  if (steps.length === 0) return;
  driver({
    showProgress: true,
    allowClose: true,
    nextBtnText: 'Next',
    prevBtnText: 'Back',
    doneBtnText: 'Got it',
    steps,
  }).drive();
}

/** Run the tour once, on a user's first authenticated visit. */
export function maybeAutoStartTour(): void {
  try {
    if (localStorage.getItem(TOUR_FLAG)) return;
    localStorage.setItem(TOUR_FLAG, '1');
  } catch {
    return;
  }
  // Defer so the navbar has mounted and laid out before we highlight it.
  window.setTimeout(() => startTour(), 800);
}
