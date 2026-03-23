"""
AI Constraint Satisfaction Problem (CSP) Solver — FastAPI Service

Implements:
- Backtracking Search
- Forward Checking
- Arc Consistency (AC-3) constraint propagation
- MRV (Minimum Remaining Values) heuristic
- Degree Heuristic (tiebreaker for MRV)
- LCV (Least Constraining Value) ordering
"""

import os
import time
from collections import deque
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="CSP Solver", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Pydantic Models ────────────────────────────────────────────────────────

class Subject(BaseModel):
    id: str
    name: str
    teacherId: str
    sessionsPerWeek: int = 1


class Teacher(BaseModel):
    id: str
    name: str
    availableSlots: list[str] = []


class Room(BaseModel):
    id: str
    name: str
    capacity: int = 30


class TimeSlot(BaseModel):
    id: str
    day: str
    time: str
    label: Optional[str] = None


class CspRequest(BaseModel):
    subjects: list[Subject]
    teachers: list[Teacher]
    rooms: list[Room]
    timeSlots: list[TimeSlot]
    maxSolutions: int = Field(default=3, ge=1, le=10)
    includeSteps: bool = False


class TimetableEntry(BaseModel):
    subjectId: str
    subjectName: str
    teacherId: str
    teacherName: str
    roomId: str
    roomName: str
    timeSlotId: str
    day: str
    time: str
    label: str


class SolvingStep(BaseModel):
    stepNumber: int
    action: str
    variable: str
    value: str
    message: str
    domainsRemaining: Optional[dict[str, int]] = None


class SolverStats(BaseModel):
    assignments: int
    backtracks: int
    propagations: int
    timeMs: float


class CspResponse(BaseModel):
    success: bool
    solutions: list[list[TimetableEntry]]
    solutionsFound: int
    steps: Optional[list[SolvingStep]] = None
    stats: SolverStats
    message: Optional[str] = None


# ─── CSP Engine ─────────────────────────────────────────────────────────────

# A variable is (subject_id, session_index).
# A value is (time_slot_id, room_id).
Variable = tuple[str, int]
Value = tuple[str, str]
Domain = list[Value]
Domains = dict[Variable, Domain]


def _conflicts(
    subj_a: Subject,
    val_a: Value,
    subj_b: Subject,
    val_b: Value,
) -> bool:
    """Return True if assigning val_a to subj_a's variable conflicts with val_b for subj_b."""
    ts_a, room_a = val_a
    ts_b, room_b = val_b
    if ts_a != ts_b:
        return False
    # Same room at same time
    if room_a == room_b:
        return True
    # Same teacher at same time
    if subj_a.teacherId == subj_b.teacherId:
        return True
    # Same subject (different session) at same time
    if subj_a.id == subj_b.id:
        return True
    return False


class CSPSolver:
    """
    Models the timetable scheduling problem as a CSP:
    - Variables: Each (subject_id, session_index) pair that needs scheduling
    - Domains: (time_slot_id, room_id) combinations valid for the variable
    - Constraints:
        1. No two classes in the same time slot in the same room
        2. No teacher teaching two classes at the same time
        3. Teacher must be available for the time slot (if availableSlots is set)
        4. Same subject cannot appear twice in the same time slot

    Algorithm: Backtracking + Forward Checking + AC-3 propagation + MRV/Degree + LCV
    """

    def __init__(
        self,
        subjects: list[Subject],
        teachers: list[Teacher],
        rooms: list[Room],
        time_slots: list[TimeSlot],
        max_solutions: int = 3,
        include_steps: bool = False,
    ):
        self.subjects_map: dict[str, Subject] = {s.id: s for s in subjects}
        self.teachers_map: dict[str, Teacher] = {t.id: t for t in teachers}
        self.rooms_map: dict[str, Room] = {r.id: r for r in rooms}
        self.time_slots_map: dict[str, TimeSlot] = {ts.id: ts for ts in time_slots}

        # Validate referential integrity before running the solver
        for subj in subjects:
            if subj.teacherId not in self.teachers_map:
                raise ValueError(
                    f"Subject '{subj.name}' references teacher ID '{subj.teacherId}' which does not exist. "
                    "Please assign a valid teacher to every subject."
                )
            for slot_id in self.teachers_map[subj.teacherId].availableSlots:
                if slot_id not in self.time_slots_map:
                    raise ValueError(
                        f"Teacher '{self.teachers_map[subj.teacherId].name}' has an available slot ID "
                        f"'{slot_id}' that does not match any defined time slot."
                    )

        self.max_solutions = max_solutions
        self.include_steps = include_steps

        self.stats: dict[str, int] = {"assignments": 0, "backtracks": 0, "propagations": 0}
        self.steps: list[SolvingStep] = []
        self.step_counter = 0

        # Build variables: each (subject_id, session_number) that needs a slot+room
        self.variables: list[Variable] = []
        for s in subjects:
            for i in range(s.sessionsPerWeek):
                self.variables.append((s.id, i))

        # Build initial domains for each variable
        self.initial_domains: Domains = {}
        for var in self.variables:
            subj_id, _ = var
            subj = self.subjects_map[subj_id]
            teacher = self.teachers_map[subj.teacherId]

            # Restrict to teacher's available slots, or all slots if none specified
            if teacher.availableSlots:
                allowed_slot_ids = {sid for sid in teacher.availableSlots if sid in self.time_slots_map}
            else:
                allowed_slot_ids = set(self.time_slots_map.keys())

            domain: Domain = []
            for ts_id in allowed_slot_ids:
                for r in rooms:
                    domain.append((ts_id, r.id))
            self.initial_domains[var] = domain

    # ── Logging ────────────────────────────────────────────────────────────

    def _add_step(
        self, action: str, variable: Variable, value: str, message: str, domains: Domains
    ) -> None:
        if not self.include_steps:
            return
        self.step_counter += 1
        remaining = {f"{v[0]}#{v[1]}": len(d) for v, d in domains.items()}
        subj_name = self.subjects_map[variable[0]].name
        self.steps.append(
            SolvingStep(
                stepNumber=self.step_counter,
                action=action,
                variable=f"{subj_name} (session {variable[1] + 1})",
                value=value,
                message=message,
                domainsRemaining=remaining,
            )
        )

    # ── Consistency helpers ────────────────────────────────────────────────

    def _is_consistent(
        self, assignment: dict[Variable, Value], var: Variable, value: Value
    ) -> bool:
        """Check if assigning value to var is consistent with the current assignment."""
        subj = self.subjects_map[var[0]]
        for assigned_var, assigned_val in assignment.items():
            other_subj = self.subjects_map[assigned_var[0]]
            if _conflicts(subj, value, other_subj, assigned_val):
                return False
        return True

    # ── AC-3 Constraint Propagation ────────────────────────────────────────

    def _revise(
        self, domains: Domains, var_i: Variable, var_j: Variable
    ) -> bool:
        """
        AC-3 revise step: remove values from domain of var_i that have no
        support in the domain of var_j.  Returns True if the domain was revised.
        """
        subj_i = self.subjects_map[var_i[0]]
        subj_j = self.subjects_map[var_j[0]]
        revised = False
        to_remove: list[Value] = []

        for val_i in domains[var_i]:
            # Check if there is at least one value in domain(var_j) consistent with val_i
            has_support = any(
                not _conflicts(subj_i, val_i, subj_j, val_j)
                for val_j in domains[var_j]
            )
            if not has_support:
                to_remove.append(val_i)
                revised = True

        for val in to_remove:
            domains[var_i].remove(val)
            self.stats["propagations"] += 1

        return revised

    def _ac3(self, domains: Domains, seed_vars: Optional[list[Variable]] = None) -> bool:
        """
        Run AC-3 on the given domains.
        If seed_vars is provided, only initialise the queue with arcs from those variables.
        Returns False if any domain is wiped out (unsatisfiable), True otherwise.
        """
        # Build initial arc queue
        if seed_vars is not None:
            queue: deque[tuple[Variable, Variable]] = deque()
            for v in seed_vars:
                for other in self.variables:
                    if other != v:
                        queue.append((other, v))
        else:
            queue = deque(
                (vi, vj)
                for vi in self.variables
                for vj in self.variables
                if vi != vj
            )

        while queue:
            var_i, var_j = queue.popleft()
            if var_i not in domains or var_j not in domains:
                continue
            if self._revise(domains, var_i, var_j):
                if not domains[var_i]:
                    return False  # Domain wipe-out
                # Re-add all arcs pointing to var_i (except from var_j)
                for var_k in self.variables:
                    if var_k != var_i and var_k != var_j:
                        queue.append((var_k, var_i))

        return True

    # ── Forward Checking ────────────────────────────────────────────────────

    def _forward_check(
        self,
        assignment: dict[Variable, Value],
        var: Variable,
        value: Value,
        domains: Domains,
    ) -> tuple[bool, Domains]:
        """
        After assigning var=value, prune values from unassigned variables' domains
        that are now inconsistent.  Applies AC-3 seeded at `var` for full propagation.
        Returns (still_feasible, updated_domains).
        """
        subj = self.subjects_map[var[0]]
        new_domains: Domains = {k: list(v) for k, v in domains.items()}

        # Initial prune: remove values from unassigned variables that directly conflict
        for other_var in self.variables:
            if other_var in assignment or other_var == var:
                continue
            other_subj = self.subjects_map[other_var[0]]
            to_remove: list[Value] = [
                val for val in new_domains[other_var]
                if _conflicts(subj, value, other_subj, val)
            ]
            for val in to_remove:
                new_domains[other_var].remove(val)
                self.stats["propagations"] += 1

            if not new_domains[other_var]:
                return False, new_domains  # Domain wipe-out

        # Full AC-3 propagation seeded from var's neighbours
        unassigned_vars = [v for v in self.variables if v not in assignment and v != var]
        if unassigned_vars:
            ac3_domains = {v: list(new_domains[v]) for v in unassigned_vars}
            ok = self._ac3(ac3_domains, seed_vars=[var])
            if not ok:
                return False, new_domains
            for v in unassigned_vars:
                new_domains[v] = ac3_domains[v]

        return True, new_domains

    # ── Variable / Value Ordering ───────────────────────────────────────────

    def _select_unassigned_variable(
        self, assignment: dict[Variable, Value], domains: Domains
    ) -> Variable:
        """
        Variable ordering:
        1. MRV: pick the variable with the fewest remaining values
        2. Degree (tiebreaker): pick the variable involved in most constraints
           with other unassigned variables
        """
        unassigned = [v for v in self.variables if v not in assignment]

        def degree(v: Variable) -> int:
            subj = self.subjects_map[v[0]]
            count = 0
            for other in unassigned:
                if other == v:
                    continue
                other_subj = self.subjects_map[other[0]]
                # Constraint exists if same teacher or same subject
                if other_subj.teacherId == subj.teacherId or other_subj.id == subj.id:
                    count += 1
            return count

        unassigned.sort(key=lambda v: (len(domains[v]), -degree(v)))
        return unassigned[0]

    def _order_domain_values(
        self, var: Variable, domains: Domains, assignment: dict[Variable, Value]
    ) -> list[Value]:
        """
        LCV (Least Constraining Value): prefer values that eliminate
        the fewest options from neighbouring unassigned variables.
        """
        subj = self.subjects_map[var[0]]

        def constraint_count(value: Value) -> int:
            count = 0
            for other_var in self.variables:
                if other_var in assignment or other_var == var:
                    continue
                other_subj = self.subjects_map[other_var[0]]
                count += sum(
                    1 for val in domains[other_var]
                    if _conflicts(subj, value, other_subj, val)
                )
            return count

        return sorted(domains[var], key=constraint_count)

    # ── Backtracking Search ─────────────────────────────────────────────────

    def _backtrack(
        self,
        assignment: dict[Variable, Value],
        domains: Domains,
        solutions: list[list[TimetableEntry]],
    ) -> None:
        """Main recursive backtracking search with forward checking + AC-3."""
        if len(solutions) >= self.max_solutions:
            return

        if len(assignment) == len(self.variables):
            solutions.append(self._build_solution(assignment))
            return

        var = self._select_unassigned_variable(assignment, domains)

        for value in self._order_domain_values(var, domains, assignment):
            ts_id, room_id = value
            ts = self.time_slots_map[ts_id]
            room = self.rooms_map[room_id]
            subj = self.subjects_map[var[0]]
            val_str = f"{ts.label or ts.day + ' ' + ts.time} in {room.name}"

            if not self._is_consistent(assignment, var, value):
                continue

            assignment[var] = value
            self.stats["assignments"] += 1
            self._add_step("assign", var, val_str,
                           f"Assigned {subj.name} (session {var[1] + 1}) → {val_str}", domains)

            feasible, new_domains = self._forward_check(assignment, var, value, domains)

            if feasible:
                if self.include_steps:
                    self._add_step(
                        "propagate", var, val_str,
                        f"AC-3 propagation passed; remaining domain sizes stable",
                        new_domains,
                    )
                self._backtrack(assignment, new_domains, solutions)
            else:
                self._add_step(
                    "forward_check", var, val_str,
                    f"Domain wipe-out detected after AC-3 — pruning branch",
                    domains,
                )

            del assignment[var]

        # All values tried without success — backtrack
        self.stats["backtracks"] += 1
        self._add_step(
            "backtrack", var, "",
            f"Backtracking from {self.subjects_map[var[0]].name} (session {var[1] + 1}) — no valid value",
            domains,
        )

    # ── Solution Building ───────────────────────────────────────────────────

    def _build_solution(self, assignment: dict[Variable, Value]) -> list[TimetableEntry]:
        """Convert assignment dict to a sorted list of TimetableEntry objects."""
        entries: list[TimetableEntry] = []
        for var, value in assignment.items():
            subj_id, _ = var
            ts_id, room_id = value
            subj = self.subjects_map[subj_id]
            teacher = self.teachers_map[subj.teacherId]
            room = self.rooms_map[room_id]
            ts = self.time_slots_map[ts_id]
            entries.append(
                TimetableEntry(
                    subjectId=subj_id,
                    subjectName=subj.name,
                    teacherId=subj.teacherId,
                    teacherName=teacher.name,
                    roomId=room_id,
                    roomName=room.name,
                    timeSlotId=ts_id,
                    day=ts.day,
                    time=ts.time,
                    label=ts.label or f"{ts.day} {ts.time}",
                )
            )
        return sorted(entries, key=lambda e: (e.day, e.time))

    # ── Entry Point ─────────────────────────────────────────────────────────

    def solve(self) -> CspResponse:
        start = time.perf_counter()
        solutions: list[list[TimetableEntry]] = []

        # Start with a copy of the initial domains and run AC-3 globally first
        working_domains: Domains = {k: list(v) for k, v in self.initial_domains.items()}
        feasible = self._ac3(working_domains)

        if feasible:
            self._backtrack({}, working_domains, solutions)

        elapsed_ms = (time.perf_counter() - start) * 1000

        return CspResponse(
            success=len(solutions) > 0,
            solutions=solutions,
            solutionsFound=len(solutions),
            steps=self.steps if self.include_steps else None,
            stats=SolverStats(
                assignments=self.stats["assignments"],
                backtracks=self.stats["backtracks"],
                propagations=self.stats["propagations"],
                timeMs=round(elapsed_ms, 2),
            ),
            message=(
                f"Found {len(solutions)} solution(s)"
                if solutions
                else "No valid schedule found. Try adding more time slots, rooms, or adjusting constraints."
            ),
        )


# ─── Routes ─────────────────────────────────────────────────────────────────

@app.get("/csp/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/csp/solve", response_model=CspResponse)
async def solve_csp(request: CspRequest) -> CspResponse:
    try:
        solver = CSPSolver(
            subjects=request.subjects,
            teachers=request.teachers,
            rooms=request.rooms,
            time_slots=request.timeSlots,
            max_solutions=request.maxSolutions,
            include_steps=request.includeSteps,
        )
        return solver.solve()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Solver error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("CSP_PORT", "8001"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
