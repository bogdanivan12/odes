"""Shared formulas for estimating schedule generation duration.

Calibrated empirically against observed run-times of the OR-Tools schedule
generator.  Reference data point: an institution with 106 activities takes
~700 s end-to-end (≈80 s model build + 600 s solver budget + ~20 s of
data-fetch / DB overhead).

Scheduling complexity is super-linear:
  * Model build emits O(activities × rooms × possible_starts) BoolVars and
    O(activities² + activities × rooms × slots) constraints, so practical
    growth tracks a power-law in num_activities (we use ~exponent 1.3).
  * CP-SAT search time grows even faster, but we cap it at 10 min so the
    UI doesn't promise unrealistic durations.

These helpers are used in two places:
  - worker  : to set CP-SAT's max_time_in_seconds dynamically per institution
  - api     : to expose a user-facing ETA to the UI for progress display
"""

# Fixed overhead: data fetching from the API, DB writes, network round-trips.
_OVERHEAD_SECONDS = 20

# Model-build cost: power-law in num_activities.
# Calibration: 106 activities → ~80 s of build time.
#   build = _BUILD_COEF * n ** _BUILD_EXPONENT
#   80 = c * 106 ** 1.3 → c ≈ 0.224
_BUILD_COEF = 0.224
_BUILD_EXPONENT = 1.3

# Solver budget: also super-linear in num_activities, but bounded so the
# UI never promises more than 30 minutes.  Beyond ~30 min users won't sit
# and watch — that workflow needs an explicit "run overnight" affordance,
# which we don't have yet.
# Calibration: 106 activities → 600 s solver budget (our reference data point).
#   solver = _SOLVER_COEF * n ** _SOLVER_EXPONENT
#   600 = c * 106 ** 1.3 → c ≈ 1.68
_SOLVER_COEF = 1.68
_SOLVER_EXPONENT = 1.3
_SOLVER_MIN_SECONDS = 120      # tiny problems still need warm-up time
_SOLVER_MAX_SECONDS = 1800     # 30-minute cap (interactive ceiling)


def _power(base: float, exponent: float) -> float:
    """math.pow without importing math (keep deps minimal)."""
    return base ** exponent


def estimate_model_build_seconds(num_activities: int) -> int:
    """Power-law estimate of the wall-clock time to construct the CP-SAT
    model (allocation vars + all hard/soft constraints)."""
    if num_activities <= 0:
        return 0
    return int(_BUILD_COEF * _power(num_activities, _BUILD_EXPONENT))


def estimate_solver_seconds(num_activities: int) -> int:
    """Time budget for the CP-SAT solver itself.

    Excludes model-build and data-fetch overhead — those happen before/after
    the solver runs.  Bounded between SOLVER_MIN and SOLVER_MAX so we don't
    burn cycles on trivial problems or promise unrealistic times on huge
    ones."""
    if num_activities <= 0:
        return _SOLVER_MIN_SECONDS
    raw = int(_SOLVER_COEF * _power(num_activities, _SOLVER_EXPONENT))
    return max(_SOLVER_MIN_SECONDS, min(_SOLVER_MAX_SECONDS, raw))


def estimate_total_duration_seconds(num_activities: int) -> int:
    """Total end-to-end ETA: overhead + model build + solver budget.

    This is what the UI shows as the expected duration so the user can see
    progress towards a realistic target."""
    if num_activities <= 0:
        return _OVERHEAD_SECONDS + _SOLVER_MIN_SECONDS
    return (
        _OVERHEAD_SECONDS
        + estimate_model_build_seconds(num_activities)
        + estimate_solver_seconds(num_activities)
    )
