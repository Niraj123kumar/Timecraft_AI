import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type { Subject, Teacher, Room, TimeSlot } from "@workspace/api-client-react";

// Extending the generated types locally for form management, before sending to API
export interface StoreState {
  subjects: Subject[];
  teachers: Teacher[];
  rooms: Room[];
  timeSlots: TimeSlot[];
  maxSolutions: number;
  includeSteps: boolean;
  
  // Actions
  addSubject: (s: Omit<Subject, "id">) => void;
  updateSubject: (id: string, s: Partial<Subject>) => void;
  removeSubject: (id: string) => void;
  
  addTeacher: (t: Omit<Teacher, "id">) => void;
  updateTeacher: (id: string, t: Partial<Teacher>) => void;
  removeTeacher: (id: string) => void;
  
  addRoom: (r: Omit<Room, "id">) => void;
  updateRoom: (id: string, r: Partial<Room>) => void;
  removeRoom: (id: string) => void;
  
  addTimeSlot: (ts: Omit<TimeSlot, "id">) => void;
  removeTimeSlot: (id: string) => void;
  
  setMaxSolutions: (n: number) => void;
  setIncludeSteps: (b: boolean) => void;
  resetToDefaults: () => void;
}

const defaultTeachers: Teacher[] = [
  { id: "t1", name: "Dr. Smith", availableSlots: [] },
  { id: "t2", name: "Dr. Jones", availableSlots: [] },
  { id: "t3", name: "Dr. Brown", availableSlots: [] },
];

const defaultSubjects: Subject[] = [
  { id: "s1", name: "Calculus I", teacherId: "t1", sessionsPerWeek: 3 },
  { id: "s2", name: "Physics 101", teacherId: "t1", sessionsPerWeek: 2 },
  { id: "s3", name: "Organic Chemistry", teacherId: "t2", sessionsPerWeek: 2 },
  { id: "s4", name: "Literature", teacherId: "t2", sessionsPerWeek: 3 },
  { id: "s5", name: "World History", teacherId: "t3", sessionsPerWeek: 2 },
];

const defaultRooms: Room[] = [
  { id: "r1", name: "Room 101", capacity: 30 },
  { id: "r2", name: "Room 102", capacity: 30 },
  { id: "r3", name: "Lab A", capacity: 20 },
];

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;
const times = ["09:00", "10:00", "11:00"];

const defaultTimeSlots: TimeSlot[] = days.flatMap(day => 
  times.map(time => ({
    id: `ts-${day}-${time}`,
    day,
    time,
    label: `${day} ${time}`
  }))
);

export const useSchedulerStore = create<StoreState>((set) => ({
  subjects: [...defaultSubjects],
  teachers: [...defaultTeachers],
  rooms: [...defaultRooms],
  timeSlots: [...defaultTimeSlots],
  maxSolutions: 3,
  includeSteps: true,
  
  addSubject: (s) => set((state) => ({ subjects: [...state.subjects, { ...s, id: uuidv4() }] })),
  updateSubject: (id, updates) => set((state) => ({
    subjects: state.subjects.map(s => s.id === id ? { ...s, ...updates } : s)
  })),
  removeSubject: (id) => set((state) => ({ subjects: state.subjects.filter(s => s.id !== id) })),
  
  addTeacher: (t) => set((state) => ({ teachers: [...state.teachers, { ...t, id: uuidv4() }] })),
  updateTeacher: (id, updates) => set((state) => ({
    teachers: state.teachers.map(t => t.id === id ? { ...t, ...updates } : t)
  })),
  removeTeacher: (id) => set((state) => {
    const remainingTeachers = state.teachers.filter(t => t.id !== id);
    const fallbackTeacherId = remainingTeachers[0]?.id ?? "";
    // Reassign subjects that referenced the removed teacher to the first remaining teacher
    const updatedSubjects = state.subjects.map(s =>
      s.teacherId === id ? { ...s, teacherId: fallbackTeacherId } : s
    );
    return { teachers: remainingTeachers, subjects: updatedSubjects };
  }),
  
  addRoom: (r) => set((state) => ({ rooms: [...state.rooms, { ...r, id: uuidv4() }] })),
  updateRoom: (id, updates) => set((state) => ({
    rooms: state.rooms.map(r => r.id === id ? { ...r, ...updates } : r)
  })),
  removeRoom: (id) => set((state) => ({ rooms: state.rooms.filter(r => r.id !== id) })),
  
  addTimeSlot: (ts) => set((state) => ({ timeSlots: [...state.timeSlots, { ...ts, id: uuidv4() }] })),
  removeTimeSlot: (id) => set((state) => ({ timeSlots: state.timeSlots.filter(ts => ts.id !== id) })),
  
  setMaxSolutions: (n) => set({ maxSolutions: n }),
  setIncludeSteps: (b) => set({ includeSteps: b }),
  
  resetToDefaults: () => set({
    subjects: [...defaultSubjects],
    teachers: [...defaultTeachers],
    rooms: [...defaultRooms],
    timeSlots: [...defaultTimeSlots],
    maxSolutions: 3,
    includeSteps: true
  })
}));
