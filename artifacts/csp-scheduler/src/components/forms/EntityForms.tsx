import { type ReactNode } from "react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useShallow } from "zustand/shallow";
import { useSchedulerStore } from "@/store/use-scheduler";
import { Plus, Trash2, Users, BookOpen, MapPin, Clock, ChevronDown } from "lucide-react";
import { TimeSlotDay } from "@/lib/mocks/api-client-react";

interface FormSectionProps {
  title: string;
  icon: React.ElementType;
  children: ReactNode;
  count: number;
  accent: string;
}

const FormSection = ({ title, icon: Icon, children, count, accent }: FormSectionProps) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="form-card fade-in">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition-colors duration-150 group rounded-2xl focus:outline-none focus:ring-2 focus:ring-white/10"
        type="button"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
            <Icon size={15} />
          </div>
          <span className="font-display font-semibold text-[15px] text-white/90 tracking-tight">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="section-badge">{count}</span>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="text-white/30 group-hover:text-white/65 transition-colors"
          >
            <ChevronDown size={15} />
          </motion.div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-3 border-t border-white/[0.07] flex flex-col gap-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const inputCls = "glass-input w-full";
const numInputCls = "glass-input w-full text-center";
const selectCls = "glass-input w-full";

const FieldLabel = ({ children }: { children: ReactNode }) => (
  <span className="field-label">{children}</span>
);

const DeleteBtn = ({ onClick, title }: { onClick: () => void; title: string }) => (
  <button onClick={onClick} title={title} className="icon-btn" type="button">
    <Trash2 size={15} />
  </button>
);

const AddButton = ({ onClick, label }: { onClick: () => void; label: string }) => (
  <button onClick={onClick} className="add-btn" type="button">
    <Plus size={14} />
    {label}
  </button>
);

export const SubjectsForm = () => {
  const { subjects, teachers, addSubject, updateSubject, removeSubject } = useSchedulerStore(
    useShallow((state) => ({
      subjects: state.subjects,
      teachers: state.teachers,
      addSubject: state.addSubject,
      updateSubject: state.updateSubject,
      removeSubject: state.removeSubject,
    }))
  );

  return (
    <FormSection
      title="Subjects"
      icon={BookOpen}
      count={subjects.length}
      accent="text-primary bg-primary/20"
    >
      <AnimatePresence>
        {subjects.map((s) => {
          const hasTeacher = !!teachers.find((t) => t.id === s.teacherId);
          const warn = s.teacherId && !hasTeacher;

          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className={`subject-item flex flex-col gap-2.5 ${warn ? "warn" : ""}`}
            >
              <div>
                <FieldLabel>Subject Name</FieldLabel>
                <div className="flex items-center gap-2">
                  <input
                    value={s.name}
                    onChange={(e) => updateSubject(s.id, { name: e.target.value })}
                    className={inputCls}
                    placeholder="e.g. Mathematics"
                  />
                  <DeleteBtn onClick={() => removeSubject(s.id)} title="Remove subject" />
                </div>
              </div>

              <div className="flex gap-2">
                <div className="flex-1 min-w-0">
                  <FieldLabel>Teacher</FieldLabel>
                  <select
                    value={s.teacherId}
                    onChange={(e) => updateSubject(s.id, { teacherId: e.target.value })}
                    className={selectCls}
                  >
                    <option value="" disabled className="bg-gray-900">
                      Select teacher…
                    </option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id} className="bg-gray-900">
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-24 shrink-0">
                  <FieldLabel>Sessions/wk</FieldLabel>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={s.sessionsPerWeek}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val) && val >= 1) {
                        updateSubject(s.id, { sessionsPerWeek: val });
                      }
                    }}
                    className={numInputCls}
                  />
                </div>
              </div>

              {warn && (
                <p className="text-xs text-destructive/90 font-medium">
                  Teacher no longer exists — please reassign.
                </p>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      <AddButton
        onClick={() =>
          addSubject({
            name: "",
            teacherId: teachers[0]?.id || "",
            sessionsPerWeek: 2,
          })
        }
        label="Add Subject"
      />
    </FormSection>
  );
};

export const TeachersForm = () => {
  const { teachers, addTeacher, updateTeacher, removeTeacher } = useSchedulerStore(
    useShallow((state) => ({
      teachers: state.teachers,
      addTeacher: state.addTeacher,
      updateTeacher: state.updateTeacher,
      removeTeacher: state.removeTeacher,
    }))
  );

  return (
    <FormSection
      title="Teachers"
      icon={Users}
      count={teachers.length}
      accent="text-secondary bg-secondary/20"
    >
      <AnimatePresence>
        {teachers.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.15 }}
          >
            <FieldLabel>Teacher Name</FieldLabel>
            <div className="flex items-center gap-2">
              <input
                value={t.name}
                onChange={(e) => updateTeacher(t.id, { name: e.target.value })}
                className={inputCls}
                placeholder="e.g. Dr. Smith"
              />
              <DeleteBtn onClick={() => removeTeacher(t.id)} title="Remove teacher" />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      <AddButton
        onClick={() => addTeacher({ name: "", availableSlots: [] })}
        label="Add Teacher"
      />
    </FormSection>
  );
};

export const RoomsForm = () => {
  const { rooms, addRoom, updateRoom, removeRoom } = useSchedulerStore(
    useShallow((state) => ({
      rooms: state.rooms,
      addRoom: state.addRoom,
      updateRoom: state.updateRoom,
      removeRoom: state.removeRoom,
    }))
  );

  return (
    <FormSection
      title="Rooms"
      icon={MapPin}
      count={rooms.length}
      accent="text-accent bg-accent/20"
    >
      <AnimatePresence>
        {rooms.map((r) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="flex gap-2"
          >
            <div className="flex-1 min-w-0">
              <FieldLabel>Room Name</FieldLabel>
              <input
                value={r.name}
                onChange={(e) => updateRoom(r.id, { name: e.target.value })}
                className={inputCls}
                placeholder="e.g. Lab A"
              />
            </div>
            <div className="w-24 shrink-0">
              <FieldLabel>Capacity</FieldLabel>
              <input
                type="number"
                min="1"
                value={r.capacity}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val >= 1) {
                    updateRoom(r.id, { capacity: val });
                  }
                }}
                className={numInputCls}
                placeholder="30"
              />
            </div>
            <div className="pt-[22px]">
              <DeleteBtn onClick={() => removeRoom(r.id)} title="Remove room" />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      <AddButton onClick={() => addRoom({ name: "", capacity: 30 })} label="Add Room" />
    </FormSection>
  );
};

const DAYS = Object.values(TimeSlotDay);

export const TimeSlotsForm = () => {
  const { timeSlots, addTimeSlot, removeTimeSlot } = useSchedulerStore(
    useShallow((state) => ({
      timeSlots: state.timeSlots,
      addTimeSlot: state.addTimeSlot,
      removeTimeSlot: state.removeTimeSlot,
    }))
  );
  const [newDay, setNewDay] = useState<TimeSlotDay>(TimeSlotDay.Monday);
  const [newTime, setNewTime] = useState("09:00");

  const handleAdd = () => {
    const t = newTime.trim();
    if (!t || !newDay) return;
    if (timeSlots.some((ts) => ts.day === newDay && ts.time === t)) {
      alert("This time slot already exists!");
      return;
    }
    addTimeSlot({ day: newDay, time: t, label: `${newDay} ${t}` });
    setNewTime("09:00");
  };

  return (
    <FormSection
      title="Time Slots"
      icon={Clock}
      count={timeSlots.length}
      accent="text-warning bg-warning/20"
    >
      <AnimatePresence>
        {timeSlots.map((ts) => (
          <motion.div
            key={ts.id}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2"
          >
            <span className="slot-pill">{ts.label ?? `${ts.day} ${ts.time}`}</span>
            <DeleteBtn onClick={() => removeTimeSlot(ts.id)} title="Remove time slot" />
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="flex gap-2 pt-1 border-t border-white/[0.07] mt-1">
        <div className="flex-1 min-w-0">
          <FieldLabel>Day</FieldLabel>
          <select
            value={newDay}
            onChange={(e) => setNewDay(e.target.value as TimeSlotDay)}
            className={selectCls}
          >
            {DAYS.map((d) => (
              <option key={d} value={d} className="bg-gray-900">
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="w-32 shrink-0">
          <FieldLabel>Time</FieldLabel>
          <input
            type="time"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className={inputCls}
          />
        </div>
        <div className="pt-[22px] shrink-0">
          <button
            onClick={handleAdd}
            className="icon-btn border border-primary/30 text-primary hover:text-white hover:bg-primary/20 hover:border-primary/60"
            title="Add slot"
            type="button"
          >
            <Plus size={15} />
          </button>
        </div>
      </div>
    </FormSection>
  );
};
