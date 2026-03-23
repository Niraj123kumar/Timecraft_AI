import React, { useRef } from "react";
import { motion } from "framer-motion";
import { Download, ChevronLeft, ChevronRight } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import type { TimetableEntry } from "@workspace/api-client-react";
import { generateColorFromString, generateDarkerColorFromString } from "@/lib/utils";

interface Props {
  solutions: TimetableEntry[][];
  currentSolutionIdx: number;
  setSolutionIdx: (i: number) => void;
}

const ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const TimetableGrid = ({ solutions, currentSolutionIdx, setSolutionIdx }: Props) => {
  const gridRef = useRef<HTMLDivElement>(null);
  
  if (!solutions || solutions.length === 0) return null;
  const currentSolution = solutions[currentSolutionIdx];

  const usedDays = Array.from(new Set(currentSolution.map(e => e.day)))
    .sort((a, b) => ALL_DAYS.indexOf(a) - ALL_DAYS.indexOf(b));
  const DAYS = usedDays.length > 0 ? usedDays : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  const usedTimes = Array.from(new Set(currentSolution.map(e => e.time))).sort();
  const TIMES = usedTimes.length > 0 ? usedTimes : ["09:00", "10:00", "11:00"];

  const exportPDF = async () => {
    if (!gridRef.current) return;
    try {
      const canvas = await html2canvas(gridRef.current, { backgroundColor: '#0A0C10', scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`schedule-solution-${currentSolutionIdx + 1}.pdf`);
    } catch (err) {
      console.error("PDF generation failed", err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black/20 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
      
      {/* Header / Controls */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
        <h2 className="font-display font-semibold text-lg">Generated Timetable</h2>
        
        <div className="flex items-center gap-6">
          {solutions.length > 1 && (
            <div className="flex items-center gap-3 bg-black/40 rounded-xl p-1 border border-white/5">
              <button 
                onClick={() => setSolutionIdx(Math.max(0, currentSolutionIdx - 1))}
                disabled={currentSolutionIdx === 0}
                className="p-1 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-medium text-white/70">
                Sol {currentSolutionIdx + 1} <span className="text-white/30">/ {solutions.length}</span>
              </span>
              <button 
                onClick={() => setSolutionIdx(Math.min(solutions.length - 1, currentSolutionIdx + 1))}
                disabled={currentSolutionIdx === solutions.length - 1}
                className="p-1 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
          
          <button 
            onClick={exportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary border border-primary/30 rounded-xl hover:bg-primary/30 transition-colors text-sm font-medium"
          >
            <Download size={16} /> Export PDF
          </button>
        </div>
      </div>
      
      {/* Grid */}
      <div className="p-6 overflow-auto flex-1 custom-scrollbar">
        <div ref={gridRef} className="min-w-[800px] p-4 rounded-xl bg-card border border-white/5 shadow-2xl">
          <div 
            className="grid gap-2" 
            style={{ gridTemplateColumns: `80px repeat(${DAYS.length}, minmax(140px, 1fr))` }}
          >
            {/* Header Row */}
            <div className="font-medium text-white/40 text-xs uppercase tracking-wider flex items-end pb-2 justify-end pr-4">Time</div>
            {DAYS.map(day => (
              <div key={day} className="font-display font-semibold text-white/80 py-3 px-4 bg-white/5 rounded-xl border border-white/5 text-center">
                {day}
              </div>
            ))}
            
            {/* Rows */}
            {TIMES.map(time => (
              <React.Fragment key={time}>
                <div className="font-medium text-white/40 text-xs flex justify-end pr-4 items-center">
                  {time}
                </div>
                {DAYS.map(day => {
                  const entry = currentSolution.find(e => e.day === day && e.time === time);
                  
                  if (!entry) {
                    return (
                      <div key={`${day}-${time}`} className="h-28 rounded-xl border border-dashed border-white/5 bg-black/20 flex items-center justify-center">
                        <span className="text-white/10 text-xs font-medium">Free Slot</span>
                      </div>
                    );
                  }
                  
                  const color = generateColorFromString(entry.subjectId);
                  const bgDark = generateDarkerColorFromString(entry.subjectId);
                  
                  return (
                    <motion.div 
                      key={`${day}-${time}-${entry.subjectId}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="h-28 rounded-xl p-3 flex flex-col justify-between border shadow-lg relative overflow-hidden group hover:scale-[1.02] transition-transform"
                      style={{ borderColor: color, backgroundColor: bgDark }}
                    >
                      <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-white to-transparent pointer-events-none" />
                      <div>
                        <h4 className="font-display font-bold leading-tight" style={{ color }}>{entry.subjectName}</h4>
                        <p className="text-xs text-white/70 mt-1 flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-white/40" />
                          {entry.teacherName}
                        </p>
                      </div>
                      <div className="text-xs font-medium px-2 py-1 bg-black/40 rounded-md w-fit text-white/80 border border-white/10">
                        {entry.roomName}
                      </div>
                    </motion.div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
