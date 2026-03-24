import React, { useRef, useEffect } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      const needsScroll = container.scrollWidth > container.clientWidth;
      container.classList.toggle('show-scroll-hint', needsScroll);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [solutions, currentSolutionIdx]);

  if (!solutions || solutions.length === 0) return null;
  const currentSolution = solutions[currentSolutionIdx];

  const usedDays = Array.from(new Set(currentSolution.map(e => e.day)))
    .sort((a, b) => ALL_DAYS.indexOf(a) - ALL_DAYS.indexOf(b));
  const DAYS = usedDays.length > 0 ? usedDays : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  const usedTimes = Array.from(new Set(currentSolution.map(e => e.time))).sort();
  const TIMES = usedTimes.length > 0 ? usedTimes : ["09:00", "10:00", "11:00"];

  const exportPDF = async () => {
    if (!gridRef.current) return;
    const el = gridRef.current;
    const prevMinWidth = el.style.minWidth;
    const prevWidth = el.style.width;
    try {
      el.style.minWidth = '800px';
      el.style.width = '800px';
      const canvas = await html2canvas(el, { backgroundColor: '#0a0b0f', scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`timecraft-schedule-${currentSolutionIdx + 1}.pdf`);
    } catch (err) {
      console.error("PDF generation failed", err);
    } finally {
      el.style.minWidth = prevMinWidth;
      el.style.width = prevWidth;
    }
  };

  return (
    <div className="timetable-panel flex flex-col h-full">
      
      {/* Header / Controls */}
      <div className="timetable-panel-header flex items-center justify-between">
        <h2 className="font-display font-semibold text-[15px] text-white/85 tracking-tight">Generated Timetable</h2>
        
        <div className="flex items-center gap-4">
          {solutions.length > 1 && (
            <div className="flex items-center gap-2 bg-black/40 rounded-xl p-1 border border-white/[0.06]">
              <button 
                onClick={() => setSolutionIdx(Math.max(0, currentSolutionIdx - 1))}
                disabled={currentSolutionIdx === 0}
                className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-semibold text-white/65 px-1 tabular-nums">
                Sol {currentSolutionIdx + 1}<span className="text-white/25"> / {solutions.length}</span>
              </span>
              <button 
                onClick={() => setSolutionIdx(Math.min(solutions.length - 1, currentSolutionIdx + 1))}
                disabled={currentSolutionIdx === solutions.length - 1}
                className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
          
          <button onClick={exportPDF} className="export-btn">
            <Download size={14} /> Export PDF
          </button>
        </div>
      </div>
      
      {/* Grid */}
      <div ref={containerRef} className="timetable-container p-5 overflow-auto flex-1 custom-scrollbar">
        <div ref={gridRef} className="timetable-table p-4 rounded-2xl bg-black/30 border border-white/[0.05]">
          <div 
            className="grid gap-2" 
            style={{ gridTemplateColumns: `76px repeat(${DAYS.length}, minmax(140px, 1fr))` }}
          >
            {/* Header Row */}
            <div className="font-medium text-white/35 text-[10px] uppercase tracking-widest flex items-end pb-2 justify-end pr-3">
              Time
            </div>
            {DAYS.map(day => (
              <div key={day} className="tt-day-header">
                {day}
              </div>
            ))}
            
            {/* Time rows */}
            {TIMES.map(time => (
              <React.Fragment key={time}>
                <div className="font-mono text-white/35 text-[11px] flex justify-end pr-3 items-center">
                  {time}
                </div>
                {DAYS.map(day => {
                  const entry = currentSolution.find(e => e.day === day && e.time === time);
                  
                  if (!entry) {
                    return (
                      <div key={`${day}-${time}`} className="tt-free-slot">
                        <span>Free</span>
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
                      className="h-28 rounded-xl p-3 flex flex-col justify-between border shadow-lg relative overflow-hidden group hover:scale-[1.02] hover:shadow-2xl transition-all duration-200"
                      style={{
                        borderColor: color,
                        backgroundColor: bgDark,
                        boxShadow: `0 4px 16px rgba(0,0,0,.4)`,
                      }}
                    >
                      <div className="absolute inset-0 opacity-[0.08] bg-gradient-to-br from-white to-transparent pointer-events-none" />
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                        style={{ background: `radial-gradient(ellipse at top left, ${color}22 0%, transparent 70%)` }}
                      />
                      <div>
                        <h4 className="font-display font-bold text-sm leading-tight" style={{ color }}>{entry.subjectName}</h4>
                        <p className="text-xs text-white/60 mt-1 flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full inline-block" style={{ backgroundColor: color, opacity: 0.6 }} />
                          {entry.teacherName}
                        </p>
                      </div>
                      <div className="text-[11px] font-medium px-2 py-1 bg-black/45 rounded-lg w-fit text-white/75 border border-white/[0.08] backdrop-blur-sm">
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
