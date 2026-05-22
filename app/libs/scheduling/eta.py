"""Shared formulas for estimating schedule generation duration.

Calibrated for the k8s worker: 2 CPU cores, 4 GiB RAM, NUM_SEARCH_WORKERS=2.

Original reference (8 workers, 8 CPUs, 12 GB — compose only):
  106 activities → ~417 s total (~80 s model build + ~317 s typical solver
  + ~20 s data-fetch / DB overhead).

With 2 CP-SAT search workers instead of 8, solver throughput is roughly
2.5× lower (CP-SAT's parallelism is sub-linear; 8 workers ≈ 4-5× faster
than 1, 2 workers ≈ 1.5-2×).  The model-build phase is single-threaded so
its coefficient is unchanged.  Stagnation patience is raised from 180 → 300 s
because improvements arrive less frequently with fewer workers.

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

# Model-build cost: power-law in num_activities.  Single-threaded — unchanged
# from the 8-worker calibration.
# Calibration: 106 activities → ~80 s of build time.
#   build = _BUILD_COEF * n ** _BUILD_EXPONENT
#   80 = c * 106 ** 1.3 → c ≈ 0.224
_BUILD_COEF = 0.224
_BUILD_EXPONENT = 1.3

# Solver budget: re-calibrated for 2 CP-SAT workers (k8s deployment).
# 8-worker reference: 106 activities → 600 s  (c ≈ 1.68)
# 2-worker estimate : multiply by 2.5×         → c ≈ 4.20
#   solver = _SOLVER_COEF * n ** _SOLVER_EXPONENT
#   1500 = c * 106 ** 1.3 → c ≈ 4.20
_SOLVER_COEF = 4.20
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
    done.  Power-law in num_activities, clamped to [60, 300] seconds.
    Upper bound raised from 180 → 300 s for the 2-worker k8s deployment:
    with fewer parallel search threads, improvements arrive less frequently
    so a longer idle window is needed before declaring stagnation.
    """
    if num_activities <= 0:
        return 60
    raw = int(0.4 * _power(num_activities, 1.2))
    return max(60, min(300, raw))


def estimate_solver_typical_seconds(num_activities: int) -> int:
    """Expected/typical solver runtime, accounting for the stagnation
    watchdog implemented in the worker.

    The worker's CP-SAT call has two exit paths:
      - ``max_time_in_seconds`` (worst case) — what ``estimate_solver_seconds``
        returns and what we pass to CP-SAT as the hard ceiling.
      - Stagnation early-exit — fires when no improvement has been seen for
        ``estimate_stagnation_seconds`` seconds.

    Calibrated for the 2-worker k8s deployment (2 CPU / 4 GiB):
      Observed: 229 activities → ~2100 s total (~261 s build + ~1819 s solver).
      The solver hit the 1800 s cap — with 2 workers it keeps finding
      improvements throughout the budget rather than plateauing early.

    Formula: min(worst, 0.9 × worst + stagnation)
      - Resolves to ~worst for any instance where worst ≥ stagnation × 10
        (i.e. all non-trivial problems with the current coefficients).
      - For very small problems (tiny worst budget) the stagnation term
        can still produce an early-exit estimate, which keeps the ETA
        from being overly pessimistic on toy instances.

    Used by ``estimate_total_duration_seconds`` for the user-facing ETA.
    """
    if num_activities <= 0:
        return _SOLVER_MIN_SECONDS
    worst = estimate_solver_seconds(num_activities)
    stagnation = estimate_stagnation_seconds(num_activities)
    return min(worst, int(0.9 * worst) + stagnation)


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
