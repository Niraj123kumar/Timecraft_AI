import { Activity, Clock, RotateCcw, Zap, type LucideIcon } from "lucide-react";
import type { SolverStats } from "@workspace/api-client-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  color: string;
  bg: string;
}

const StatCard = ({ icon: Icon, label, value, color, bg }: StatCardProps) => (
  <div className="glass-panel p-4 rounded-2xl flex items-center gap-4">
    <div className={`p-3 rounded-xl ${bg} ${color}`}>
      <Icon size={20} />
    </div>
    <div>
      <p className="text-xs font-medium text-white/50 uppercase tracking-wider">{label}</p>
      <p className="text-xl font-display font-bold text-white mt-0.5">{value}</p>
    </div>
  </div>
);

export const StatsBar = ({ stats }: { stats: SolverStats }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        icon={Activity}
        label="Assignments"
        value={stats.assignments}
        color="text-success"
        bg="bg-success/10"
      />
      <StatCard
        icon={RotateCcw}
        label="Backtracks"
        value={stats.backtracks}
        color="text-destructive"
        bg="bg-destructive/10"
      />
      <StatCard
        icon={Zap}
        label="Propagations"
        value={stats.propagations}
        color="text-secondary"
        bg="bg-secondary/10"
      />
      <StatCard
        icon={Clock}
        label="Solve Time"
        value={`${stats.timeMs.toFixed(1)} ms`}
        color="text-accent"
        bg="bg-accent/10"
      />
    </div>
  );
};
