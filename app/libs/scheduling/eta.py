"""Shared formulas for estimating schedule generation duration.

Calibrated empirically against observed run-times of the OR-Tools schedule
generator.  Reference data point: an institution with 106 activities takes
~417 s end-to-end with stagnation early-exit (~80 s model build + ~317 s
typical solver runtime + ~20 s data-fetch / DB overhead).

Scheduling complexity is super-linear:
  * Model build emits O(activities × rooms × possible_starts) BoolVars and
    O(activities² + activities × rooms × slots) constraints, so practical
    growth tracks a power-law in num_activities (we use ~exponent 1.3).
  * CP-SAT search time grows even faster but is bounded by both a hard
    wall-clock ceiling (``estimate_solver_seconds``) and a stagnation
    watchdog (``estimate_stagnation_seconds``).  The "typical" runtime
    (``estimate_solver_typical_seconds``) accounts for the watchdog
    firing — which is the common path.

Three solver-time helpers, used in different places:
  - ``estimate_solver_seconds``         : worst-case ceiling. Used by the
                                          worker to set CP-SAT's
                                          ``max_time_in_seconds``.
  - ``estimate_stagnation_seconds``     : watchdog idle-time limit. Used by
                                          the worker's _StagnationMonitor.
  - ``estimate_solver_typical_seconds`` : expected runtime accounting for
                                          watchdog firing. Drives the
                                          user-facing ETA.
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


def estimate_stagnation_seconds(num_activities: int) -> int:
    """Max wall-clock time without an objective improvement before we
    give up early on the CP-SAT search.

    Smaller problems converge faster so they should bail sooner; bigger
    ones might need a few minutes of plateau before the search is truly
    done.  Power-law in num_activities, clamped to [60, 180] seconds.
    """
    if num_activities <= 0:
        return 60
    raw = int(0.4 * _power(num_activities, 1.2))
    return max(60, min(180, raw))


def estimate_solver_typical_seconds(num_activities: int) -> int:
    """Expected/typical solver runtime, accounting for the stagnation
    watchdog implemented in the worker.

    The worker's CP-SAT call has two exit paths:
      - ``max_time_in_seconds`` (worst case) — what ``estimate_solver_seconds``
        returns and what we pass to CP-SAT as the hard ceiling.
      - Stagnation early-exit — fires when no improvement has been seen for
        ``estimate_stagnation_seconds`` seconds.  This is the *common* path
        for problems above ~30 activities.

    Empirically the solver finds its best incumbent at roughly 30–40 % of
    the worst-case budget, then plateaus until stagnation fires:

        typical_solver = 0.35 × worst_case + stagnation_seconds

    Used by ``estimate_total_duration_seconds`` for the user-facing ETA so
    the progress bar tracks realistic completion rather than the worst-case
    ceiling.
    """
    if num_activities <= 0:
        return _SOLVER_MIN_SECONDS
    worst = estimate_solver_seconds(num_activities)
    stagnation = estimate_stagnation_seconds(num_activities)
    return int(0.35 * worst) + stagnation


def estimate_total_duration_seconds(num_activities: int) -> int:
    """Total end-to-end ETA: overhead + model build + *typical* solver time.

    This is what the UI shows as the expected duration.  We use the
    typical solver time (not the worst-case budget) so the progress bar
    tracks realistic completion — most runs end via stagnation early-exit
    well before ``max_time_in_seconds`` would expire.  The hard ceiling is
    still enforced inside the worker (via ``estimate_solver_seconds``)."""
    if num_activities <= 0:
        return _OVERHEAD_SECONDS + _SOLVER_MIN_SECONDS
    return (
        _OVERHEAD_SECONDS
        + estimate_model_build_seconds(num_activities)
        + estimate_solver_typical_seconds(num_activities)
    )
