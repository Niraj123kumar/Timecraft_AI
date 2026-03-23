import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Zap, FastForward } from "lucide-react";
import type { SolvingStep } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

export const SolvingTrace = ({ steps }: { steps?: SolvingStep[] }) => {
  if (!steps || steps.length === 0) return null;

  return (
    <div className="bg-black/30 border border-white/10 rounded-2xl flex flex-col h-[300px] backdrop-blur-md overflow-hidden">
      <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
        <h3 className="font-display font-semibold text-white/90">Solver Trace Log</h3>
        <span className="text-xs font-medium text-white/40 bg-black/50 px-2 py-1 rounded-md">{steps.length} steps</span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-2">
        <AnimatePresence>
          {steps.map((step, idx) => {
            let Icon = CheckCircle2;
            let colorClass = "text-success bg-success/10 border-success/20";
            
            if (step.action === 'backtrack') {
              Icon = XCircle;
              colorClass = "text-destructive bg-destructive/10 border-destructive/20";
            } else if (step.action === 'propagate') {
              Icon = Zap;
              colorClass = "text-secondary bg-secondary/10 border-secondary/20";
            } else if (step.action === 'forward_check') {
              Icon = FastForward;
              colorClass = "text-accent bg-accent/10 border-accent/20";
            }

            return (
              <motion.div 
                key={`${step.stepNumber}-${idx}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(idx * 0.02, 1) }} // cap delay
                className={cn("p-3 rounded-xl border flex items-start gap-3 text-sm", colorClass)}
              >
                <div className="mt-0.5">
                  <Icon size={16} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold opacity-80 uppercase tracking-wider text-[10px]">{step.action}</span>
                    <span className="opacity-50 text-[10px] font-mono">Step {step.stepNumber}</span>
                  </div>
                  <p className="mt-1 font-medium leading-snug">{step.message}</p>
                  
                  {step.value && (
                    <p className="mt-1.5 text-xs opacity-70 border-t border-current pt-1">
                      <span className="font-mono">{step.variable}</span> ← <span className="font-mono font-semibold">{step.value}</span>
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
