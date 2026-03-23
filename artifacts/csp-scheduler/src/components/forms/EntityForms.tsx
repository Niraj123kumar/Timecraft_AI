import { type ReactNode } from "react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSchedulerStore } from "@/store/use-scheduler";
import { Plus, Trash2, Users, BookOpen, MapPin, Clock, ChevronDown } from "lucide-react";
import { TimeSlotDay } from "@workspace/api-client-react";

interface FormSectionProps {
  title: string;
  icon: React.ElementType;
  children: ReactNode;
  count: number;
  accentColor?: string;
}

const FormSection = ({ title, icon: Icon, children, count, accentColor = "text-primary bg-primary/15" }: FormSectionProps) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="rounded-2xl overflow-hidden border border-white/8 bg-white/4 shadow-xl shadow-black/30 backdrop-blur-md transition-all duration-200 hover:border-white/15 hover:shadow-black/50 hover:shadow-2xl">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors duration-150 group"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${accentColor} transition-colors`}>
            <Icon size={16} />
          </div>
          <h3 className="font-display font-semibold text-base text-white/90 tracking-tight">{title}</h3>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-medium px-2.5 py-1 bg-black/30 rounded-lg text-white/55 border border-white/5">
            {count}
          </span>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-white/30 group-hover:text-white/60 transition-colors"
          >
            <ChevronDown size={16} />
          </motion.div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="border-t border-white/6"
          >
            <div className="p-4 flex flex-col gap-3 max-h-72 overflow-y-auto custom-scrollbar">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const TeachersForm = () => {
  const { teachers, addTeacher, updateTeacher, removeTeacher } = useSchedulerStore();

  return (
    <FormSection title="Teachers" icon={Users} count={teachers.length} accentColor="text-secondary bg-secondary/15">
      <AnimatePresence>
        {teachers.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2.5"
          >
            <input
              value={t.name}
              onChange={(e) => updateTeacher(t.id, { name: e.target.value })}
              className="flex-1 glass-input rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 outline-none"
              placeholder="Teacher name"
            />
            <button
              onClick={() => removeTeacher(t.id)}
              className="p-2 text-white/25 hover:text-destructive hover:bg-destructive/10 transition-all duration-150 rounded-lg shrink-0"
              title="Remove teacher"
            >
              <Trash2 size={15} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
      <AddButton onClick={() => addTeacher({ name: "", availableSlots: [] })} label="Add Teacher" />
    </FormSection>
  );
};

export const RoomsForm = () => {
  const { rooms, addRoom, updateRoom, removeRoom } = useSchedulerStore();

  return (
    <FormSection title="Rooms" icon={MapPin} count={rooms.length} accentColor="text-accent bg-accent/15">
      <AnimatePresence>
        {rooms.map((r) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2.5"
          >
            <input
              value={r.name}
              onChange={(e) => updateRoom(r.id, { name: e.target.value })}
              className="flex-1 glass-input rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 outline-none"
              placeholder="Room name"
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-white/40 hidden sm:block">Cap</span>
              <input
                type="number"
                min="1"
                value={r.capacity}
                onChange={(e) => updateRoom(r.id, { capacity: parseInt(e.target.value) || 1 })}
                className="w-20 glass-input rounded-xl px-3 py-2.5 text-sm text-white outline-none text-center"
                placeholder="30"
              />
            </div>
            <button
              onClick={() => removeRoom(r.id)}
              className="p-2 text-white/25 hover:text-destructive hover:bg-destructive/10 transition-all duration-150 rounded-lg shrink-0"
              title="Remove room"
            >
              <Trash2 size={15} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
      <AddButton onClick={() => addRoom({ name: "", capacity: 30 })} label="Add Room" />
    </FormSection>
  );
};

export const SubjectsForm = () => {
  const { subjects, teachers, addSubject, updateSubject, removeSubject } = useSchedulerStore();

  return (
    <FormSection title="Subjects" icon={BookOpen} count={subjects.length} accentColor="text-primary bg-primary/15">
      <AnimatePresence>
        {subjects.map((s) => {
          const missingTeacher = s.teacherId && !teachers.find((t) => t.id === s.teacherId);
          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className={`flex flex-col gap-2 p-3 rounded-xl border transition-colors ${
                missingTeacher
                  ? "bg-destructive/10 border-destructive/30"
                  : "bg-white/4 border-white/6 hover:border-white/12"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <input
                  value={s.name}
                  onChange={(e) => updateSubject(s.id, { name: e.target.value })}
                  className="flex-1 glass-input rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none"
                  placeholder="Subject name"
                />
                <button
                  onClick={() => removeSubject(s.id)}
                  className="p-2 text-white/25 hover:text-destructive hover:bg-destructive/10 transition-all duration-150 rounded-lg shrink-0"
                  title="Remove subject"
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="flex items-center gap-2.5">
                <select
                  value={s.teacherId}
                  onChange={(e) => updateSubject(s.id, { teacherId: e.target.value })}
                  className="flex-1 glass-input rounded-lg px-3 py-2 text-sm text-white outline-none appearance-none cursor-pointer"
                >
                  <option value="" disabled className="text-black bg-gray-900">
                    Select teacher…
                  </option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id} className="text-black bg-gray-900">
                      {t.name}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-1.5 text-white/50 text-xs shrink-0">
                  <span>Sessions</span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={s.sessionsPerWeek}
                    onChange={(e) => updateSubject(s.id, { sessionsPerWeek: parseInt(e.target.value) || 1 })}
                    className="w-14 glass-input rounded-lg px-2 py-2 text-center text-white text-sm outline-none"
                  />
                </label>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
      <AddButton
        onClick={() => addSubject({ name: "", teacherId: teachers[0]?.id || "", sessionsPerWeek: 2 })}
        label="Add Subject"
      />
    </FormSection>
  );
};

const DAYS = Object.values(TimeSlotDay);

export const TimeSlotsForm = () => {
  const { timeSlots, addTimeSlot, removeTimeSlot } = useSchedulerStore();
  const [newDay, setNewDay] = useState<TimeSlotDay>(TimeSlotDay.Monday);
  const [newTime, setNewTime] = useState("09:00");

  const handleAdd = () => {
    const trimmedTime = newTime.trim();
    if (!trimmedTime || !newDay) return;
    const exists = timeSlots.some((ts) => ts.day === newDay && ts.time === trimmedTime);
    if (exists) return;
    addTimeSlot({ day: newDay, time: trimmedTime, label: `${newDay} ${trimmedTime}` });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAdd();
  };

  return (
    <FormSection title="Time Slots" icon={Clock} count={timeSlots.length} accentColor="text-warning bg-warning/15">
      <AnimatePresence>
        {timeSlots.map((ts) => (
          <motion.div
            key={ts.id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2.5"
          >
            <span className="flex-1 text-sm text-white/80 px-3.5 py-2.5 bg-white/4 rounded-xl border border-white/6 font-mono">
              {ts.label ?? `${ts.day} ${ts.time}`}
            </span>
            <button
              onClick={() => removeTimeSlot(ts.id)}
              className="p-2 text-white/25 hover:text-destructive hover:bg-destructive/10 transition-all duration-150 rounded-lg shrink-0"
              title="Remove time slot"
            >
              <Trash2 size={15} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="flex items-center gap-2 pt-2 border-t border-white/6 mt-1">
        <select
          value={newDay}
          onChange={(e) => setNewDay(e.target.value as TimeSlotDay)}
          className="flex-1 glass-input rounded-xl px-3 py-2 text-sm text-white outline-none appearance-none cursor-pointer"
        >
          {DAYS.map((d) => (
            <option key={d} value={d} className="text-black bg-gray-900">
              {d}
            </option>
          ))}
        </select>
        <input
          type="time"
          value={newTime}
          onChange={(e) => setNewTime(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-28 glass-input rounded-xl px-3 py-2 text-sm text-white outline-none"
        />
        <button
          onClick={handleAdd}
          className="p-2.5 text-primary hover:bg-primary/15 transition-all duration-150 rounded-xl border border-primary/30 hover:border-primary/60 shrink-0"
          title="Add time slot"
        >
          <Plus size={15} />
        </button>
      </div>
    </FormSection>
  );
};

const AddButton = ({ onClick, label }: { onClick: () => void; label: string }) => (
  <button
    onClick={onClick}
    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-dashed border-white/15 text-white/45 hover:text-primary hover:border-primary/45 hover:bg-primary/5 transition-all duration-200 text-sm font-medium mt-1"
  >
    <Plus size={15} />
    {label}
  </button>
);
