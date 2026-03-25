// Local types replacing @workspace/api-client-react

export enum TimeSlotDay {
  Monday = "Monday",
  Tuesday = "Tuesday",
  Wednesday = "Wednesday",
  Thursday = "Thursday",
  Friday = "Friday",
  Saturday = "Saturday",
  Sunday = "Sunday",
}

export interface TimeSlot {
  id: string;
  day: TimeSlotDay;
  time: string;
  label?: string;
}

export interface Subject {
  id: string;
  name: string;
  teacherId: string;
  sessionsPerWeek?: number;
}

export interface Teacher {
  id: string;
  name: string;
  availableSlots?: string[];
}

export interface Room {
  id: string;
  name: string;
  capacity?: number;
}

export interface TimetableEntry {
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  timeSlotId: string;
  day: string;
  time: string;
  roomId: string;
  roomName: string;
}

export interface SolvingStep {
  stepNumber: number;
  action: string;
  variable: string;
  value: string;
  message: string;
  domainsRemaining: Record<string, number>;
}

export interface SolverStats {
  assignments: number;
  backtracks: number;
  propagations: number;
  timeMs: number;
}

export interface CspResponse {
  success: boolean;
  solutions: TimetableEntry[][];
  solutionsFound: number;
  steps?: SolvingStep[];
  stats: SolverStats;
  message: string;
}
