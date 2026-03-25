import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type { Subject, Teacher, Room, TimeSlot } from "@/lib/types";

export interface StoreState {
  subjects: Subject[];
  teachers: Teacher[];
  rooms: Room[];
  timeSlots: TimeSlot[];
  maxSolutions: number;
  includeSteps: boolean;

  addSubject: (s: Omit<Subject, "id">) => void;
  updateSubject: (id: string, updates: Partial<Subject>) => void;
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

export const useSchedulerStore = create<StoreState>((set) => ({
  subjects: [],
  teachers: [],
  rooms: [],
  timeSlots: [],
  maxSolutions: 3,
  includeSteps: false,

  addSubject: (s) =>
    set((state) => ({
      subjects: [...state.subjects, { ...s, id: uuidv4() }],
    })),

  updateSubject: (id, updates) =>
    set((state) => ({
      subjects: state.subjects.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    })),

  removeSubject: (id) =>
    set((state) => ({
      subjects: state.subjects.filter((s) => s.id !== id),
    })),

  addTeacher: (t) =>
    set((state) => ({
      teachers: [...state.teachers, { ...t, id: uuidv4() }],
    })),

  updateTeacher: (id, t) =>
    set((state) => ({
      teachers: state.teachers.map((teacher) =>
        teacher.id === id ? { ...teacher, ...t } : teacher
      ),
    })),

  removeTeacher: (id) =>
    set((state) => ({
      teachers: state.teachers.filter((t) => t.id !== id),
    })),

  addRoom: (r) =>
    set((state) => ({
      rooms: [...state.rooms, { ...r, id: uuidv4() }],
    })),

  updateRoom: (id, r) =>
    set((state) => ({
      rooms: state.rooms.map((room) =>
        room.id === id ? { ...room, ...r } : room
      ),
    })),

  removeRoom: (id) =>
    set((state) => ({
      rooms: state.rooms.filter((r) => r.id !== id),
    })),

  addTimeSlot: (ts) =>
    set((state) => ({
      timeSlots: [...state.timeSlots, { ...ts, id: uuidv4() }],
    })),

  removeTimeSlot: (id) =>
    set((state) => ({
      timeSlots: state.timeSlots.filter((ts) => ts.id !== id),
    })),

  setMaxSolutions: (n) => set({ maxSolutions: n }),
  setIncludeSteps: (b) => set({ includeSteps: b }),

  resetToDefaults: () =>
    set({
      subjects: [],
      teachers: [],
      rooms: [],
      timeSlots: [],
    }),
}));
