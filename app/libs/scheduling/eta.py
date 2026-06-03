"""Shared formulas for estimating schedule generation duration.

Calibrated for the k8s worker: 3 CPU cores, 8 GiB RAM, NUM_SEARCH_WORKERS=3.
(Reduced from 4 to leave 1 vCPU headroom for API and UI pods on the same node.)

Original reference (8 workers, 8 CPUs, 12 GB - compose only):
  106 activities → ~417 s total (~80 s model build + ~317 s typical solver
  + ~20 s data-fetch / DB overhead).

With 3 CP-SAT search workers, solver throughput is roughly 2× lower than
8 workers (CP-SAT's parallelism is sub-linear; 8 workers ≈ 4-5× faster
than 1, 3 workers ≈ 2-2.5×).  The model-build phase is single-threaded so
its coefficient is unchanged.  Stagnation patience kept at 300 s - with 3
parallel threads improvements arrive frequently enough that 300 s of idle
reliably means the search has converged.

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

# Model-build cost: power-law in num_activities.  Single-threaded.
# Re-calibrated for the room-pooling model, which builds far fewer variables
# than the old per-(activity,room,week) formulation.  Measured: 700 activities
# → ~1.2 s of Python model construction (worker log: "Generating schedule" to
# "Phase 1" gap).  build = _BUILD_COEF * n ** 1.3 with 1.2 = c * 700**1.3 →
# c ≈ 0.00024.  Build is now negligible; the solver dominates end-to-end time.
_BUILD_COEF = 0.00024
_BUILD_EXPONENT = 1.3

# Solver *budget* (worst-case ceiling passed to CP-SAT as max_time_in_seconds).
# Kept generous so hard instances aren't starved - the two-phase solve almost
# always stops earlier via the stagnation watchdog (see typical estimate below).
#   solver = _SOLVER_COEF * n ** _SOLVER_EXPONENT
_SOLVER_COEF = 3.36
_SOLVER_EXPONENT = 1.3
_SOLVER_MIN_SECONDS = 120      # tiny problems still need warm-up time
_SOLVER_MAX_SECONDS = 7200     # 2-hour hard ceiling

# Typical solver runtime (drives the user-facing ETA).  This is what runs
# actually take: phase-1 feasibility + phase-2 optimisation until the stagnation
# watchdog stops it - well below the worst-case budget.  Measured: 700 activities
# → ~4.8 k s total wall time, of which ~4.78 k s is solver (phase 1 ≈ 270 s +
# phase 2 ≈ 4.5 k s).  typical = _SOLVER_TYPICAL_COEF * n ** 1.3 with
# 4780 = c * 700**1.3 → c ≈ 0.96.  Clamped to [MIN, worst-case budget].
_SOLVER_TYPICAL_COEF = 0.96


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

    Excludes model-build and data-fetch overhead - those happen before/after
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
    With 4 parallel search threads improvements arrive frequently; 300 s of
    idle reliably signals convergence.
    """
    if num_activities <= 0:
        return 60
    raw = int(0.4 * _power(num_activities, 1.2))
    return max(60, min(300, raw))


def estimate_solver_typical_seconds(num_activities: int) -> int:
    """Expected/typical solver runtime - the basis for the user-facing ETA.

    The two-phase solve (phase-1 feasibility + phase-2 optimisation with the
    stagnation watchdog) almost never runs to the worst-case ``max_time``
    budget; it stops once the objective plateaus.  So the typical runtime has
    its own power law fitted to observed end-to-end runs, independent of the
    (deliberately generous) worst-case budget.

    Calibration (room-pooling model, 3-worker k8s): 700 activities → ~4.78 k s
    of solver time → ``_SOLVER_TYPICAL_COEF ≈ 0.96``.

    Clamped to ``[_SOLVER_MIN_SECONDS, worst-case budget]`` so it never exceeds
    the hard ceiling we actually grant CP-SAT.
    """
    if num_activities <= 0:
        return _SOLVER_MIN_SECONDS
    raw = int(_SOLVER_TYPICAL_COEF * _power(num_activities, _SOLVER_EXPONENT))
    worst = estimate_solver_seconds(num_activities)
    return max(_SOLVER_MIN_SECONDS, min(worst, raw))


def estimate_total_duration_seconds(num_activities: int) -> int:
    """Total end-to-end ETA: overhead + model build + *typical* solver time.

    This is what the UI shows as the expected duration.  We use the
    typical solver time (not the worst-case budget) so the progress bar
    tracks realistic completion - most runs end via stagnation early-exit
    well before ``max_time_in_seconds`` would expire.  The hard ceiling is
    still enforced inside the worker (via ``estimate_solver_seconds``)."""
    if num_activities <= 0:
        return _OVERHEAD_SECONDS + _SOLVER_MIN_SECONDS
    return (
        _OVERHEAD_SECONDS
        + estimate_model_build_seconds(num_activities)
        + estimate_solver_typical_seconds(num_activities)
    )
