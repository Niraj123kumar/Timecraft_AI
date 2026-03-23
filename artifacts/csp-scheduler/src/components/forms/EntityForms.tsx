import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSchedulerStore } from "@/store/use-scheduler";
import { Plus, Trash2, Users, BookOpen, MapPin, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const FormSection = ({ title, icon: Icon, children, count }: any) => {
  const [isOpen, setIsOpen] = useState(true);
  
  return (
    <div className="bg-black/20 border border-white/5 rounded-2xl overflow-hidden mb-4">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 text-primary rounded-xl">
            <Icon size={18} />
          </div>
          <h3 className="font-display font-semibold text-lg">{title}</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium px-2 py-1 bg-black/30 rounded-lg text-white/70">
            {count} items
          </span>
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }} className="text-white/40">
            ▼
          </motion.div>
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/5"
          >
            <div className="p-4 flex flex-col gap-4">
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
    <FormSection title="Teachers" icon={Users} count={teachers.length}>
      <AnimatePresence>
        {teachers.map((t) => (
          <motion.div 
            key={t.id}
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center gap-3"
          >
            <input 
              value={t.name}
              onChange={(e) => updateTeacher(t.id, { name: e.target.value })}
              className="flex-1 glass-input rounded-xl px-4 py-2 text-sm text-white placeholder:text-white/30 outline-none"
              placeholder="Teacher Name"
            />
            <button onClick={() => removeTeacher(t.id)} className="p-2 text-white/30 hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10">
              <Trash2 size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
      <button 
        onClick={() => addTeacher({ name: "New Teacher", availableSlots: [] })}
        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-dashed border-white/20 text-white/50 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all text-sm font-medium"
      >
        <Plus size={16} /> Add Teacher
      </button>
    </FormSection>
  );
};

export const RoomsForm = () => {
  const { rooms, addRoom, updateRoom, removeRoom } = useSchedulerStore();
  
  return (
    <FormSection title="Rooms" icon={MapPin} count={rooms.length}>
      <AnimatePresence>
        {rooms.map((r) => (
          <motion.div key={r.id} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="flex items-center gap-3">
            <input 
              value={r.name}
              onChange={(e) => updateRoom(r.id, { name: e.target.value })}
              className="flex-1 glass-input rounded-xl px-4 py-2 text-sm text-white placeholder:text-white/30 outline-none"
              placeholder="Room Name"
            />
            <input 
              type="number" min="1" value={r.capacity}
              onChange={(e) => updateRoom(r.id, { capacity: parseInt(e.target.value) || 1 })}
              className="w-24 glass-input rounded-xl px-4 py-2 text-sm text-white outline-none"
              placeholder="Cap."
            />
            <button onClick={() => removeRoom(r.id)} className="p-2 text-white/30 hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10">
              <Trash2 size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
      <button onClick={() => addRoom({ name: "New Room", capacity: 30 })} className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-dashed border-white/20 text-white/50 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all text-sm font-medium">
        <Plus size={16} /> Add Room
      </button>
    </FormSection>
  );
};

export const SubjectsForm = () => {
  const { subjects, teachers, addSubject, updateSubject, removeSubject } = useSchedulerStore();
  
  return (
    <FormSection title="Subjects" icon={BookOpen} count={subjects.length}>
      <AnimatePresence>
        {subjects.map((s) => (
          <motion.div key={s.id} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="flex flex-col gap-2 p-3 bg-white/5 rounded-xl border border-white/5">
            <div className="flex items-center gap-3">
              <input 
                value={s.name}
                onChange={(e) => updateSubject(s.id, { name: e.target.value })}
                className="flex-1 glass-input rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none"
                placeholder="Subject Name"
              />
              <button onClick={() => removeSubject(s.id)} className="p-2 text-white/30 hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10">
                <Trash2 size={16} />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <select 
                value={s.teacherId}
                onChange={(e) => updateSubject(s.id, { teacherId: e.target.value })}
                className="flex-1 glass-input rounded-lg px-3 py-2 text-sm text-white outline-none appearance-none cursor-pointer"
              >
                <option value="" disabled className="text-black">Select Teacher</option>
                {teachers.map(t => <option key={t.id} value={t.id} className="text-black">{t.name}</option>)}
              </select>
              <div className="flex items-center gap-2 text-white/50 text-sm">
                <span>Sessions:</span>
                <input 
                  type="number" min="1" max="10" value={s.sessionsPerWeek}
                  onChange={(e) => updateSubject(s.id, { sessionsPerWeek: parseInt(e.target.value) || 1 })}
                  className="w-16 glass-input rounded-lg px-2 py-1 text-center text-white outline-none"
                />
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      <button onClick={() => addSubject({ name: "New Subject", teacherId: teachers[0]?.id || "", sessionsPerWeek: 2 })} className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-dashed border-white/20 text-white/50 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all text-sm font-medium">
        <Plus size={16} /> Add Subject
      </button>
    </FormSection>
  );
};
