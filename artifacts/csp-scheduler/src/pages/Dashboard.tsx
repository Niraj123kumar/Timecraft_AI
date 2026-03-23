import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Settings2, AlertTriangle, RefreshCcw } from "lucide-react";
import { useSchedulerStore } from "@/store/use-scheduler";
import { useSolveCsp } from "@workspace/api-client-react";
import { TeachersForm, RoomsForm, SubjectsForm } from "@/components/forms/EntityForms";
import { TimetableGrid } from "@/components/timetable/TimetableGrid";
import { SolvingTrace } from "@/components/timetable/SolvingTrace";
import { StatsBar } from "@/components/timetable/StatsBar";

export default function Dashboard() {
  const store = useSchedulerStore();
  const { mutate, isPending, data, isError, error, reset } = useSolveCsp();
  
  const [solutionIdx, setSolutionIdx] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showTrace, setShowTrace] = useState(false);

  const canGenerate = store.subjects.length > 0 && store.teachers.length > 0 && store.rooms.length > 0 && store.timeSlots.length > 0;

  const handleGenerate = () => {
    setSolutionIdx(0);
    reset(); // reset previous query state
    mutate({
      data: {
        subjects: store.subjects,
        teachers: store.teachers,
        rooms: store.rooms,
        timeSlots: store.timeSlots,
        maxSolutions: store.maxSolutions,
        includeSteps: store.includeSteps
      }
    });
  };

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden selection:bg-primary/30">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[url('/images/hero-bg.png')] bg-cover bg-center opacity-40 mix-blend-screen" />
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-secondary/20 blur-[150px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col h-screen">
        {/* Header */}
        <header className="flex items-center justify-between mb-8 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
              <Sparkles className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-white tracking-tight">AI CSP Scheduler</h1>
              <p className="text-sm text-white/50 font-medium">Constraint Satisfaction Solver Engine</p>
            </div>
          </div>
          
          <button 
            onClick={store.resetToDefaults}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-all text-sm font-medium"
          >
            <RefreshCcw size={14} /> Reset Data
          </button>
        </header>

        <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0">
          
          {/* LEFT PANEL: Inputs */}
          <div className="w-full lg:w-[400px] flex flex-col gap-4 shrink-0 overflow-y-auto custom-scrollbar pr-2 pb-8">
            
            <div className="glass-panel p-5 rounded-2xl mb-2 relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-display font-bold text-lg">Solver Config</h2>
                  <button onClick={() => setShowSettings(!showSettings)} className="p-2 text-white/50 hover:text-white transition-colors rounded-lg bg-white/5">
                    <Settings2 size={16} />
                  </button>
                </div>
                
                <AnimatePresence>
                  {showSettings && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex flex-col gap-4 mb-4 pb-4 border-b border-white/10">
                      <div>
                        <label className="text-xs font-medium text-white/60 mb-2 block">Max Solutions to Find: {store.maxSolutions}</label>
                        <input 
                          type="range" min="1" max="10" step="1" 
                          value={store.maxSolutions} onChange={(e) => store.setMaxSolutions(parseInt(e.target.value))}
                          className="w-full accent-primary"
                        />
                      </div>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={store.includeSteps} onChange={(e) => store.setIncludeSteps(e.target.checked)}
                          className="w-4 h-4 rounded border-white/20 bg-black/30 text-primary focus:ring-primary/50 focus:ring-offset-0"
                        />
                        <span className="text-sm text-white/80">Include step-by-step trace log</span>
                      </label>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={handleGenerate}
                  disabled={!canGenerate || isPending}
                  className="w-full button-glow relative py-4 px-6 rounded-xl font-bold text-white bg-gradient-to-r from-primary to-accent shadow-xl shadow-primary/25 hover:shadow-primary/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isPending ? (
                      <>
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, ease: "linear", duration: 1 }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                        Solving...
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} /> Generate Schedule
                      </>
                    )}
                  </span>
                </button>
                
                {!canGenerate && (
                  <p className="text-xs text-warning mt-3 text-center">Add at least one of each entity to generate.</p>
                )}
              </div>
            </div>

            <SubjectsForm />
            <TeachersForm />
            <RoomsForm />
            {/* Keeping TimeSlots simple for UI sake, as it's static in defaults, but could be editable */}
            
          </div>

          {/* RIGHT PANEL: Results */}
          <div className="flex-1 flex flex-col gap-6 min-w-0">
            {isPending ? (
              <div className="flex-1 flex flex-col items-center justify-center glass-panel rounded-3xl p-12">
                <div className="relative">
                  <div className="w-24 h-24 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="text-primary animate-pulse" size={24} />
                  </div>
                </div>
                <h3 className="mt-8 text-2xl font-display font-bold">Running AI Solver...</h3>
                <p className="mt-2 text-white/50 text-center max-w-md">
                  Applying backtracking, constraint propagation, and MRV heuristics to find the optimal schedule.
                </p>
              </div>
            ) : data ? (
              data.success ? (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col gap-6 min-h-0">
                  <StatsBar stats={data.stats} />
                  
                  <div className="flex-1 min-h-[400px]">
                    <TimetableGrid 
                      solutions={data.solutions} 
                      currentSolutionIdx={solutionIdx} 
                      setSolutionIdx={setSolutionIdx} 
                    />
                  </div>
                  
                  {data.steps && data.steps.length > 0 && (
                    <div className="shrink-0">
                      <button 
                        onClick={() => setShowTrace(!showTrace)}
                        className="mb-4 text-sm font-medium text-secondary hover:text-white transition-colors"
                      >
                        {showTrace ? "Hide Solving Trace" : "View Step-by-Step AI Trace"}
                      </button>
                      <AnimatePresence>
                        {showTrace && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                            <SolvingTrace steps={data.steps} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="glass-panel p-8 rounded-3xl max-w-lg w-full text-center border-destructive/30">
                    <div className="w-16 h-16 bg-destructive/20 text-destructive rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <AlertTriangle size={32} />
                    </div>
                    <h3 className="text-2xl font-display font-bold text-white mb-2">No Valid Schedule Found</h3>
                    <p className="text-white/60 mb-6">
                      {data.message || "The solver exhausted all possibilities but could not satisfy the given constraints. Try adding more rooms, teachers, or time slots, or reducing the required sessions."}
                    </p>
                    {data.stats && (
                      <div className="bg-black/30 rounded-xl p-4 mb-6 text-sm text-left border border-white/5">
                        <p><span className="text-white/40">Assignments attempted:</span> <strong className="text-white">{data.stats.assignments}</strong></p>
                        <p><span className="text-white/40">Backtracks triggered:</span> <strong className="text-white">{data.stats.backtracks}</strong></p>
                        <p><span className="text-white/40">Time elapsed:</span> <strong className="text-white">{data.stats.timeMs.toFixed(1)} ms</strong></p>
                      </div>
                    )}
                    <button onClick={() => reset()} className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors">
                      Acknowledge & Adjust
                    </button>
                  </div>
                </div>
              )
            ) : isError ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <AlertTriangle className="text-destructive mb-4" size={48} />
                <h3 className="text-xl font-bold mb-2">API Error</h3>
                <p className="text-white/50 max-w-md">{String(error) || "Failed to communicate with the solver backend."}</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                <div className="w-24 h-24 border-2 border-dashed border-white/20 rounded-full flex items-center justify-center mb-6">
                  <Sparkles size={32} />
                </div>
                <h3 className="text-2xl font-display font-semibold mb-2">Ready to Solve</h3>
                <p className="max-w-md mx-auto">Configure your constraints on the left and hit Generate to see the AI algorithm in action.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
