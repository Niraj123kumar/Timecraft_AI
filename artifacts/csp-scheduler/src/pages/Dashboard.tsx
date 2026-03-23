import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Settings2, AlertTriangle, RefreshCcw, ChevronDown } from "lucide-react";
import { useSchedulerStore } from "@/store/use-scheduler";
import { useSolveCsp } from "@workspace/api-client-react";
import { TeachersForm, RoomsForm, SubjectsForm, TimeSlotsForm } from "@/components/forms/EntityForms";
import { TimetableGrid } from "@/components/timetable/TimetableGrid";
import { SolvingTrace } from "@/components/timetable/SolvingTrace";
import { StatsBar } from "@/components/timetable/StatsBar";

export default function Dashboard() {
  const store = useSchedulerStore();
  const { mutate, isPending, data, isError, error, reset } = useSolveCsp();

  const [solutionIdx, setSolutionIdx] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showTrace, setShowTrace] = useState(false);

  const subjectsWithoutTeacher = store.subjects.filter(
    (s) => !s.teacherId || !store.teachers.find((t) => t.id === s.teacherId)
  );
  const canGenerate =
    store.subjects.length > 0 &&
    store.teachers.length > 0 &&
    store.rooms.length > 0 &&
    store.timeSlots.length > 0 &&
    subjectsWithoutTeacher.length === 0;

  const handleGenerate = () => {
    setSolutionIdx(0);
    reset();
    mutate({
      data: {
        subjects: store.subjects,
        teachers: store.teachers,
        rooms: store.rooms,
        timeSlots: store.timeSlots,
        maxSolutions: store.maxSolutions,
        includeSteps: store.includeSteps,
      },
    });
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden selection:bg-primary/30">
      {/* Ambient background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-25%] left-[-15%] w-[55%] h-[55%] bg-primary/15 blur-[180px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-secondary/12 blur-[160px] rounded-full" />
        <div className="absolute top-[40%] right-[20%] w-[30%] h-[30%] bg-accent/8 blur-[120px] rounded-full" />
      </div>

      {/* App shell */}
      <div className="relative z-10 flex flex-col h-screen max-w-screen-2xl mx-auto">

        {/* ── Header ── */}
        <header className="flex items-center justify-between px-6 py-4 shrink-0 border-b border-white/6 backdrop-blur-sm bg-black/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary via-primary/80 to-accent flex items-center justify-center shadow-lg shadow-primary/25">
              <Sparkles className="text-white" size={17} />
            </div>
            <div>
              <h1 className="text-lg font-display font-bold text-white leading-tight">AI CSP Scheduler</h1>
              <p className="text-xs text-white/40 font-medium leading-tight">Constraint Satisfaction Solver Engine</p>
            </div>
          </div>

          <button
            onClick={store.resetToDefaults}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-white/55 hover:text-white hover:bg-white/6 hover:border-white/20 transition-all duration-200 text-sm font-medium"
          >
            <RefreshCcw size={13} />
            Reset Data
          </button>
        </header>

        {/* ── Main layout: sidebar + content ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ── LEFT SIDEBAR ── */}
          <aside className="w-[380px] shrink-0 flex flex-col border-r border-white/6 bg-black/10 backdrop-blur-sm">

            {/* Solver Config card */}
            <div className="px-4 pt-4 shrink-0">
              <div className="rounded-2xl border border-white/8 bg-white/4 shadow-xl shadow-black/30 backdrop-blur-md overflow-hidden mb-4">
                <div className="flex items-center justify-between px-5 py-4">
                  <h2 className="font-display font-semibold text-sm text-white/80 tracking-wide uppercase">
                    Solver Config
                  </h2>
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-1.5 text-white/40 hover:text-white/80 hover:bg-white/8 transition-all duration-150 rounded-lg"
                  >
                    <motion.div animate={{ rotate: showSettings ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <Settings2 size={15} />
                    </motion.div>
                  </button>
                </div>

                <AnimatePresence>
                  {showSettings && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="px-5 pb-4 flex flex-col gap-4 border-t border-white/6"
                    >
                      <div className="pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-medium text-white/55">Max Solutions</label>
                          <span className="text-xs font-bold text-primary">{store.maxSolutions}</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          step="1"
                          value={store.maxSolutions}
                          onChange={(e) => store.setMaxSolutions(parseInt(e.target.value))}
                          className="w-full accent-primary"
                        />
                      </div>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={store.includeSteps}
                          onChange={(e) => store.setIncludeSteps(e.target.checked)}
                          className="w-4 h-4 rounded border-white/20 bg-black/30 text-primary focus:ring-primary/50 focus:ring-offset-0"
                        />
                        <span className="text-sm text-white/70">Include step-by-step trace</span>
                      </label>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Generate button */}
                <div className="px-5 pb-5 pt-2">
                  <button
                    onClick={handleGenerate}
                    disabled={!canGenerate || isPending}
                    className="button-glow w-full py-3.5 px-6 rounded-xl font-bold text-white bg-gradient-to-r from-primary to-accent shadow-lg shadow-primary/20 hover:shadow-primary/35 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:-translate-y-px active:translate-y-0"
                  >
                    <span className="flex items-center justify-center gap-2 text-sm">
                      {isPending ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, ease: "linear", duration: 1 }}
                            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                          />
                          Solving…
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          Generate Schedule
                        </>
                      )}
                    </span>
                  </button>

                  {!canGenerate && (
                    <p className="text-xs text-warning mt-2.5 text-center leading-relaxed">
                      {subjectsWithoutTeacher.length > 0
                        ? `${subjectsWithoutTeacher.length} subject(s) missing a valid teacher.`
                        : "Add at least one subject, teacher, room, and time slot."}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Entity form cards — scrollable column */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-6 flex flex-col gap-3">
              <SubjectsForm />
              <TeachersForm />
              <RoomsForm />
              <TimeSlotsForm />
            </div>

          </aside>

          {/* ── RIGHT MAIN PANEL ── */}
          <main className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
            <div className="flex-1 flex flex-col gap-5 p-6">

              {isPending ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="relative mb-8">
                    <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="text-primary animate-pulse" size={22} />
                    </div>
                  </div>
                  <h3 className="text-2xl font-display font-bold text-white mb-2">Running AI Solver…</h3>
                  <p className="text-white/45 text-center max-w-sm text-sm leading-relaxed">
                    Applying backtracking, AC-3 constraint propagation, and MRV heuristics to find the optimal schedule.
                  </p>
                </div>
              ) : data ? (
                data.success ? (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col gap-5 flex-1"
                  >
                    <StatsBar stats={data.stats} />

                    <div className="flex-1 min-h-[360px]">
                      <TimetableGrid
                        solutions={data.solutions}
                        currentSolutionIdx={solutionIdx}
                        setSolutionIdx={setSolutionIdx}
                      />
                    </div>

                    {data.steps && data.steps.length > 0 && (
                      <div>
                        <button
                          onClick={() => setShowTrace(!showTrace)}
                          className="flex items-center gap-2 mb-3 text-sm font-medium text-secondary/80 hover:text-secondary transition-colors duration-150"
                        >
                          <motion.div animate={{ rotate: showTrace ? 180 : 0 }} transition={{ duration: 0.2 }}>
                            <ChevronDown size={16} />
                          </motion.div>
                          {showTrace ? "Hide" : "View"} Step-by-Step AI Trace
                        </button>
                        <AnimatePresence>
                          {showTrace && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.22 }}
                            >
                              <SolvingTrace steps={data.steps} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="rounded-3xl border border-destructive/25 bg-destructive/8 p-10 max-w-lg w-full text-center backdrop-blur-sm">
                      <div className="w-14 h-14 bg-destructive/20 text-destructive rounded-2xl flex items-center justify-center mx-auto mb-5">
                        <AlertTriangle size={28} />
                      </div>
                      <h3 className="text-xl font-display font-bold text-white mb-2">No Valid Schedule Found</h3>
                      <p className="text-white/55 text-sm mb-6 leading-relaxed">
                        {data.message ||
                          "The solver exhausted all possibilities. Try adding more rooms, teachers, or time slots."}
                      </p>
                      {data.stats && (
                        <div className="bg-black/25 rounded-xl p-4 mb-6 text-sm text-left border border-white/6 space-y-1.5">
                          <p>
                            <span className="text-white/40">Assignments attempted: </span>
                            <strong className="text-white">{data.stats.assignments}</strong>
                          </p>
                          <p>
                            <span className="text-white/40">Backtracks triggered: </span>
                            <strong className="text-white">{data.stats.backtracks}</strong>
                          </p>
                          <p>
                            <span className="text-white/40">Time elapsed: </span>
                            <strong className="text-white">{data.stats.timeMs.toFixed(1)} ms</strong>
                          </p>
                        </div>
                      )}
                      <button
                        onClick={() => reset()}
                        className="px-6 py-2.5 bg-white/8 hover:bg-white/15 rounded-xl font-medium text-sm transition-colors duration-150 border border-white/8 hover:border-white/20"
                      >
                        Acknowledge &amp; Adjust
                      </button>
                    </div>
                  </div>
                )
              ) : isError ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                  <AlertTriangle className="text-destructive mb-4" size={44} />
                  <h3 className="text-xl font-bold mb-2 text-white">API Error</h3>
                  <p className="text-white/45 max-w-md text-sm">{String(error) || "Failed to communicate with the solver backend."}</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-35 px-6">
                  <div className="w-20 h-20 border-2 border-dashed border-white/20 rounded-full flex items-center justify-center mb-5">
                    <Sparkles size={30} />
                  </div>
                  <h3 className="text-2xl font-display font-semibold mb-2 text-white">Ready to Solve</h3>
                  <p className="max-w-sm mx-auto text-sm leading-relaxed">
                    Configure your constraints on the left and hit Generate to see the AI algorithm in action.
                  </p>
                </div>
              )}
            </div>
          </main>

        </div>
      </div>
    </div>
  );
}
