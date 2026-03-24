import type {
  Subject,
  Teacher,
  Room,
  TimeSlot,
  CspResponse,
  TimetableEntry,
  SolvingStep,
} from "@workspace/api-client-react";

type Variable = readonly [string, number];
type Value = readonly [string, string];

type DomainMap = Map<string, Value[]>;

function varKey(v: Variable): string {
  return `${v[0]}#${v[1]}`;
}

function conflicts(
  subjA: Subject, valA: Value,
  subjB: Subject, valB: Value,
): boolean {
  const [tsA, roomA] = valA;
  const [tsB, roomB] = valB;
  if (tsA !== tsB) return false;
  if (roomA === roomB) return true;
  if (subjA.teacherId === subjB.teacherId) return true;
  if (subjA.id === subjB.id) return true;
  return false;
}

function cloneDomains(domains: DomainMap): DomainMap {
  const copy: DomainMap = new Map();
  for (const [k, v] of domains) {
    copy.set(k, [...v]);
  }
  return copy;
}

export interface CspInput {
  subjects: Subject[];
  teachers: Teacher[];
  rooms: Room[];
  timeSlots: TimeSlot[];
  maxSolutions?: number;
  includeSteps?: boolean;
}

export function solveCsp(input: CspInput): CspResponse {
  const {
    subjects,
    teachers,
    rooms,
    timeSlots,
    maxSolutions = 3,
    includeSteps = false,
  } = input;

  const subjectsMap = new Map<string, Subject>(subjects.map((s) => [s.id, s]));
  const teachersMap = new Map<string, Teacher>(teachers.map((t) => [t.id, t]));
  const roomsMap = new Map<string, Room>(rooms.map((r) => [r.id, r]));
  const timeSlotsMap = new Map<string, TimeSlot>(timeSlots.map((ts) => [ts.id, ts]));

  for (const subj of subjects) {
    if (!teachersMap.has(subj.teacherId)) {
      throw new Error(
        `Subject '${subj.name}' references teacher ID '${subj.teacherId}' which does not exist.`,
      );
    }
  }

  const stats = { assignments: 0, backtracks: 0, propagations: 0 };
  const steps: SolvingStep[] = [];
  let stepCounter = 0;

  const variables: Variable[] = [];
  for (const s of subjects) {
    for (let i = 0; i < (s.sessionsPerWeek ?? 1); i++) {
      variables.push([s.id, i] as const);
    }
  }

  const initialDomains: DomainMap = new Map();
  for (const v of variables) {
    const [subjId] = v;
    const subj = subjectsMap.get(subjId)!;
    const teacher = teachersMap.get(subj.teacherId)!;

    const allowedSlotIds: Set<string> =
      teacher.availableSlots && teacher.availableSlots.length > 0
        ? new Set(teacher.availableSlots.filter((sid) => timeSlotsMap.has(sid)))
        : new Set(timeSlotsMap.keys());

    const domain: Value[] = [];
    for (const tsId of allowedSlotIds) {
      for (const r of rooms) {
        domain.push([tsId, r.id] as const);
      }
    }
    initialDomains.set(varKey(v), domain);
  }

  function addStep(
    action: string,
    variable: Variable,
    value: string,
    message: string,
    domains: DomainMap,
  ): void {
    if (!includeSteps) return;
    stepCounter++;
    const remaining: Record<string, number> = {};
    for (const v of variables) {
      remaining[varKey(v)] = domains.get(varKey(v))?.length ?? 0;
    }
    const subjName = subjectsMap.get(variable[0])!.name;
    steps.push({
      stepNumber: stepCounter,
      action,
      variable: `${subjName} (session ${variable[1] + 1})`,
      value,
      message,
      domainsRemaining: remaining,
    });
  }

  function isConsistent(
    assignment: Map<string, Value>,
    v: Variable,
    value: Value,
  ): boolean {
    const subj = subjectsMap.get(v[0])!;
    for (const [assignedKey, assignedVal] of assignment) {
      const [assignedSubjId] = assignedKey.split("#");
      const otherSubj = subjectsMap.get(assignedSubjId)!;
      if (conflicts(subj, value, otherSubj, assignedVal)) return false;
    }
    return true;
  }

  function revise(domains: DomainMap, varI: Variable, varJ: Variable): boolean {
    const subjI = subjectsMap.get(varI[0])!;
    const subjJ = subjectsMap.get(varJ[0])!;
    const keyI = varKey(varI);
    const keyJ = varKey(varJ);
    const domJ = domains.get(keyJ) ?? [];
    const domI = domains.get(keyI) ?? [];
    const toRemove: Value[] = [];

    for (const valI of domI) {
      const hasSupport = domJ.some(
        (valJ) => !conflicts(subjI, valI, subjJ, valJ),
      );
      if (!hasSupport) {
        toRemove.push(valI);
      }
    }

    if (toRemove.length === 0) return false;

    const newDomI = domI.filter((v) => !toRemove.includes(v));
    domains.set(keyI, newDomI);
    stats.propagations += toRemove.length;
    return true;
  }

  function ac3(domains: DomainMap, seedVars?: Variable[]): boolean {
    const queue: Array<[Variable, Variable]> = [];
    if (seedVars) {
      for (const sv of seedVars) {
        for (const other of variables) {
          if (varKey(other) !== varKey(sv)) {
            queue.push([other, sv]);
          }
        }
      }
    } else {
      for (const vi of variables) {
        for (const vj of variables) {
          if (varKey(vi) !== varKey(vj)) {
            queue.push([vi, vj]);
          }
        }
      }
    }

    let head = 0;
    while (head < queue.length) {
      const [varI, varJ] = queue[head++];
      const keyI = varKey(varI);
      const keyJ = varKey(varJ);
      if (!domains.has(keyI) || !domains.has(keyJ)) continue;

      if (revise(domains, varI, varJ)) {
        if ((domains.get(keyI) ?? []).length === 0) return false;
        for (const varK of variables) {
          const keyK = varKey(varK);
          if (keyK !== keyI && keyK !== keyJ) {
            queue.push([varK, varI]);
          }
        }
      }
    }
    return true;
  }

  function forwardCheck(
    assignment: Map<string, Value>,
    v: Variable,
    value: Value,
    domains: DomainMap,
  ): [boolean, DomainMap] {
    const subj = subjectsMap.get(v[0])!;
    const newDomains = cloneDomains(domains);
    const vKey = varKey(v);

    for (const other of variables) {
      const otherKey = varKey(other);
      if (assignment.has(otherKey) || otherKey === vKey) continue;

      const otherSubj = subjectsMap.get(other[0])!;
      const filtered = (newDomains.get(otherKey) ?? []).filter(
        (val) => !conflicts(subj, value, otherSubj, val),
      );
      const removed = (newDomains.get(otherKey) ?? []).length - filtered.length;
      stats.propagations += removed;
      newDomains.set(otherKey, filtered);

      if (filtered.length === 0) return [false, newDomains];
    }

    const unassigned = variables.filter(
      (other) => !assignment.has(varKey(other)) && varKey(other) !== vKey,
    );
    if (unassigned.length > 0) {
      const ac3Domains = cloneDomains(newDomains);
      const feasible = ac3(ac3Domains, [v]);
      if (!feasible) return [false, newDomains];
      for (const u of unassigned) {
        const uk = varKey(u);
        newDomains.set(uk, ac3Domains.get(uk) ?? []);
      }
    }

    return [true, newDomains];
  }

  function selectUnassigned(
    assignment: Map<string, Value>,
    domains: DomainMap,
  ): Variable {
    const unassigned = variables.filter((v) => !assignment.has(varKey(v)));

    function degree(v: Variable): number {
      const subj = subjectsMap.get(v[0])!;
      let count = 0;
      for (const other of unassigned) {
        if (varKey(other) === varKey(v)) continue;
        const otherSubj = subjectsMap.get(other[0])!;
        if (
          otherSubj.teacherId === subj.teacherId ||
          otherSubj.id === subj.id
        ) {
          count++;
        }
      }
      return count;
    }

    return unassigned.sort((a, b) => {
      const domA = (domains.get(varKey(a)) ?? []).length;
      const domB = (domains.get(varKey(b)) ?? []).length;
      if (domA !== domB) return domA - domB;
      return degree(b) - degree(a);
    })[0];
  }

  function orderDomainValues(
    v: Variable,
    domains: DomainMap,
    assignment: Map<string, Value>,
  ): Value[] {
    const subj = subjectsMap.get(v[0])!;
    const vKey = varKey(v);
    const dom = domains.get(vKey) ?? [];

    function constraintCount(value: Value): number {
      let count = 0;
      for (const other of variables) {
        const otherKey = varKey(other);
        if (assignment.has(otherKey) || otherKey === vKey) continue;
        const otherSubj = subjectsMap.get(other[0])!;
        count += (domains.get(otherKey) ?? []).filter((val) =>
          conflicts(subj, value, otherSubj, val),
        ).length;
      }
      return count;
    }

    return [...dom].sort((a, b) => constraintCount(a) - constraintCount(b));
  }

  function buildSolution(assignment: Map<string, Value>): TimetableEntry[] {
    const entries: TimetableEntry[] = [];
    for (const [key, value] of assignment) {
      const [subjId] = key.split("#");
      const [tsId, roomId] = value;
      const subj = subjectsMap.get(subjId)!;
      const teacher = teachersMap.get(subj.teacherId)!;
      const room = roomsMap.get(roomId)!;
      const ts = timeSlotsMap.get(tsId)!;
      entries.push({
        subjectId: subjId,
        subjectName: subj.name,
        teacherId: subj.teacherId,
        teacherName: teacher.name,
        roomId,
        roomName: room.name,
        timeSlotId: tsId,
        day: ts.day,
        time: ts.time,
        label: ts.label ?? `${ts.day} ${ts.time}`,
      });
    }
    return entries.sort((a, b) =>
      a.day !== b.day ? a.day.localeCompare(b.day) : a.time.localeCompare(b.time),
    );
  }

  function backtrack(
    assignment: Map<string, Value>,
    domains: DomainMap,
    solutions: TimetableEntry[][],
  ): void {
    if (solutions.length >= maxSolutions) return;

    if (assignment.size === variables.length) {
      solutions.push(buildSolution(assignment));
      return;
    }

    const v = selectUnassigned(assignment, domains);
    const vKey = varKey(v);
    const [, sessionIdx] = v;
    const subj = subjectsMap.get(v[0])!;

    for (const value of orderDomainValues(v, domains, assignment)) {
      const [tsId, roomId] = value;
      const ts = timeSlotsMap.get(tsId)!;
      const room = roomsMap.get(roomId)!;
      const valStr = `${ts.label ?? ts.day + " " + ts.time} in ${room.name}`;

      if (!isConsistent(assignment, v, value)) continue;

      assignment.set(vKey, value);
      stats.assignments++;
      addStep(
        "assign",
        v,
        valStr,
        `Assigned ${subj.name} (session ${sessionIdx + 1}) → ${valStr}`,
        domains,
      );

      const [feasible, newDomains] = forwardCheck(assignment, v, value, domains);

      if (feasible) {
        if (includeSteps) {
          addStep(
            "propagate",
            v,
            valStr,
            `AC-3 propagation passed; remaining domain sizes stable`,
            newDomains,
          );
        }
        backtrack(assignment, newDomains, solutions);
      } else {
        addStep(
          "forward_check",
          v,
          valStr,
          `Domain wipe-out detected after AC-3 — pruning branch`,
          domains,
        );
      }

      assignment.delete(vKey);
    }

    stats.backtracks++;
    addStep(
      "backtrack",
      v,
      "",
      `Backtracking from ${subj.name} (session ${sessionIdx + 1}) — no valid value`,
      domains,
    );
  }

  const startMs = performance.now();

  const solutions: TimetableEntry[][] = [];
  const workingDomains = cloneDomains(initialDomains);
  const feasible = ac3(workingDomains);

  if (feasible) {
    backtrack(new Map(), workingDomains, solutions);
  }

  const elapsedMs = performance.now() - startMs;

  return {
    success: solutions.length > 0,
    solutions,
    solutionsFound: solutions.length,
    steps: includeSteps ? steps : undefined,
    stats: {
      assignments: stats.assignments,
      backtracks: stats.backtracks,
      propagations: stats.propagations,
      timeMs: Math.round(elapsedMs * 100) / 100,
    },
    message:
      solutions.length > 0
        ? `Found ${solutions.length} solution(s)`
        : "No valid schedule found. Try adding more time slots, rooms, or adjusting constraints.",
  };
}
