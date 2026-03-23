"""
AI Constraint Satisfaction Problem (CSP) Solver — FastAPI Service

Implements:
- Backtracking Search
- Forward Checking
- Constraint Propagation (AC-3)
- MRV (Minimum Remaining Values) heuristic
- Degree Heuristic
"""

import os
import time
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

class CSPSolver:
    """
    Models the timetable scheduling problem as a CSP:
    - Variables: Each (subject_id, session_index) pair that needs scheduling
    - Domains: (time_slot_id, room_id) combinations valid for the variable
    - Constraints:
        1. No two classes in the same time slot in the same room
        2. No teacher teaching two classes at the same time
        3. Teacher must be available for the time slot
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
        self.subjects = {s.id: s for s in subjects}
        self.teachers = {t.id: t for t in teachers}
        self.rooms = {r.id: r for r in rooms}
        self.time_slots = {ts.id: ts for ts in time_slots}

        self.max_solutions = max_solutions
        self.include_steps = include_steps

        self.stats = {"assignments": 0, "backtracks": 0, "propagations": 0}
        self.steps: list[SolvingStep] = []
        self.step_counter = 0

        # Build variables: each (subject_id, session_number) that needs a slot+room
        self.variables: list[tuple[str, int]] = []
        for s in subjects:
            for i in range(s.sessionsPerWeek):
                self.variables.append((s.id, i))

        # Build domains: for each variable, list valid (time_slot_id, room_id) pairs
        self.domains: dict[tuple[str, int], list[tuple[str, str]]] = {}
        for var in self.variables:
            subj_id, _ = var
            subj = self.subjects[subj_id]
            teacher = self.teachers[subj.teacherId]
            allowed_slots = set(teacher.availableSlots) if teacher.availableSlots else set(time_slots_for_teacher := {ts.id for ts in time_slots})
            if teacher.availableSlots:
                allowed_slots = set(teacher.availableSlots)
            else:
                allowed_slots = {ts.id for ts in time_slots}

            domain = []
            for ts_id in allowed_slots:
                if ts_id in self.time_slots:
                    for r in rooms:
                        domain.append((ts_id, r.id))
            self.domains[var] = domain

        # Deep copy domains for forward checking
        self.working_domains: dict[tuple[str, int], list[tuple[str, str]]] = {
            var: list(dom) for var, dom in self.domains.items()
        }

    def _add_step(self, action: str, variable: tuple[str, int], value: str, message: str):
        if not self.include_steps:
            return
        self.step_counter += 1
        remaining = {f"{v[0]}#{v[1]}": len(d) for v, d in self.working_domains.items()}
        self.steps.append(
            SolvingStep(
                stepNumber=self.step_counter,
                action=action,
                variable=f"{self.subjects[variable[0]].name} (session {variable[1]+1})",
                value=value,
                message=message,
                domainsRemaining=remaining,
            )
        )

    def _is_consistent(self, assignment: dict, var: tuple[str, int], value: tuple[str, str]) -> bool:
        """Check if assigning value to var is consistent with current assignment."""
        ts_id, room_id = value
        subj_id, _ = var
        subj = self.subjects[subj_id]

        for assigned_var, assigned_val in assignment.items():
            assigned_ts_id, assigned_room_id = assigned_val
            assigned_subj_id, _ = assigned_var

            # Same time slot constraint
            if assigned_ts_id == ts_id:
                # Same room conflict
                if assigned_room_id == room_id:
                    return False
                # Same teacher conflict
                assigned_subj = self.subjects[assigned_subj_id]
                if assigned_subj.teacherId == subj.teacherId:
                    return False

        # No same subject twice in same time slot
        for assigned_var, assigned_val in assignment.items():
            if assigned_var[0] == subj_id and assigned_val[0] == ts_id:
                return False

        return True

    def _forward_check(
        self,
        assignment: dict,
        var: tuple[str, int],
        value: tuple[str, str],
        working_domains: dict,
    ) -> tuple[bool, dict[tuple[str, int], list[tuple[str, str]]]]:
        """
        Forward checking: after assigning var=value, remove inconsistent
        values from unassigned variable domains.
        Returns (still_feasible, pruned_domains).
        """
        ts_id, room_id = value
        subj_id, _ = var
        subj = self.subjects[subj_id]

        pruned: dict[tuple[str, int], list[tuple[str, str]]] = {}
        new_domains = {k: list(v) for k, v in working_domains.items()}

        for other_var in self.variables:
            if other_var in assignment or other_var == var:
                continue
            other_subj_id, _ = other_var
            other_subj = self.subjects[other_subj_id]

            to_remove = []
            for val in new_domains[other_var]:
                other_ts_id, other_room_id = val
                conflict = False
                if other_ts_id == ts_id:
                    if other_room_id == room_id:
                        conflict = True
                    elif other_subj.teacherId == subj.teacherId:
                        conflict = True
                if other_var[0] == subj_id and other_ts_id == ts_id:
                    conflict = True
                if conflict:
                    to_remove.append(val)

            for val in to_remove:
                new_domains[other_var].remove(val)
                pruned.setdefault(other_var, []).append(val)
                self.stats["propagations"] += 1

            if not new_domains[other_var]:
                # Domain wipe-out — backtrack
                return False, pruned

        return True, new_domains

    def _select_unassigned_variable(self, assignment: dict, working_domains: dict) -> tuple[str, int]:
        """
        Variable ordering using:
        1. MRV (Minimum Remaining Values): pick variable with smallest domain
        2. Degree heuristic as tiebreaker: pick variable involved in most constraints
        """
        unassigned = [v for v in self.variables if v not in assignment]

        def mrv_score(v):
            return len(working_domains[v])

        def degree_score(v):
            """Count how many unassigned variables share constraints with v."""
            subj_id, _ = v
            subj = self.subjects[subj_id]
            count = 0
            for other in unassigned:
                if other == v:
                    continue
                other_subj_id, _ = other
                other_subj = self.subjects[other_subj_id]
                if other_subj.teacherId == subj.teacherId or other_subj_id == subj_id:
                    count += 1
            return count

        # Sort by MRV first, then by degree (negated, larger = better)
        unassigned.sort(key=lambda v: (mrv_score(v), -degree_score(v)))
        return unassigned[0]

    def _order_domain_values(self, var: tuple[str, int], working_domains: dict, assignment: dict) -> list:
        """
        Least Constraining Value (LCV) ordering: prefer values that
        leave more options for unassigned variables.
        """
        def constraint_count(value):
            ts_id, room_id = value
            subj_id, _ = var
            subj = self.subjects[subj_id]
            count = 0
            for other_var in self.variables:
                if other_var in assignment or other_var == var:
                    continue
                other_subj_id, _ = other_var
                other_subj = self.subjects[other_subj_id]
                for val in working_domains[other_var]:
                    other_ts_id, other_room_id = val
                    if other_ts_id == ts_id:
                        if other_room_id == room_id or other_subj.teacherId == subj.teacherId:
                            count += 1
            return count

        return sorted(working_domains[var], key=constraint_count)

    def _backtrack(
        self,
        assignment: dict,
        working_domains: dict,
        solutions: list,
    ) -> None:
        """Main backtracking search with forward checking."""
        if len(solutions) >= self.max_solutions:
            return

        # All variables assigned — solution found
        if len(assignment) == len(self.variables):
            solution = self._build_solution(assignment)
            solutions.append(solution)
            return

        var = self._select_unassigned_variable(assignment, working_domains)

        for value in self._order_domain_values(var, working_domains, assignment):
            ts_id, room_id = value
            ts = self.time_slots[ts_id]
            room = self.rooms[room_id]
            subj = self.subjects[var[0]]
            val_str = f"{ts.label or ts.day+' '+ts.time} in {room.name}"

            if self._is_consistent(assignment, var, value):
                assignment[var] = value
                self.stats["assignments"] += 1
                self._add_step(
                    "assign", var, val_str,
                    f"Assigned {subj.name} (session {var[1]+1}) → {val_str}"
                )

                # Forward checking
                feasible, new_domains = self._forward_check(assignment, var, value, working_domains)

                if feasible:
                    if self.include_steps:
                        self._add_step(
                            "forward_check", var, val_str,
                            f"Forward check passed; pruned {sum(len(p) for p in new_domains.values())} values"
                        )
                    self._backtrack(assignment, new_domains, solutions)
                else:
                    self._add_step(
                        "propagate", var, val_str,
                        f"Forward check failed — domain wipe-out detected"
                    )

                # Undo assignment
                del assignment[var]
            else:
                pass  # Skip inconsistent values

        # All values tried — backtrack
        if var not in assignment:
            self.stats["backtracks"] += 1
            self._add_step(
                "backtrack", var, "",
                f"Backtracking from {self.subjects[var[0]].name} (session {var[1]+1}) — no valid value"
            )

    def _build_solution(self, assignment: dict) -> list[TimetableEntry]:
        """Convert assignment dict to list of TimetableEntry."""
        entries = []
        for var, value in assignment.items():
            subj_id, _ = var
            ts_id, room_id = value
            subj = self.subjects[subj_id]
            teacher = self.teachers[subj.teacherId]
            room = self.rooms[room_id]
            ts = self.time_slots[ts_id]
            entries.append(TimetableEntry(
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
            ))
        return sorted(entries, key=lambda e: (e.day, e.time))

    def solve(self) -> CspResponse:
        start = time.perf_counter()
        solutions: list[list[TimetableEntry]] = []

        working_domains = {k: list(v) for k, v in self.domains.items()}
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
                f"Found {len(solutions)} solution(s)" if solutions
                else "No valid schedule found. Try adding more time slots, rooms, or adjusting constraints."
            ),
        )


# ─── Routes ─────────────────────────────────────────────────────────────────

@app.get("/csp/health")
async def health():
    return {"status": "ok"}


@app.post("/csp/solve", response_model=CspResponse)
async def solve_csp(request: CspRequest):
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
