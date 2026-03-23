import { Activity, Clock, RotateCcw, Zap, type LucideIcon } from "lucide-react";
import type { SolverStats } from "@workspace/api-client-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  color: string;
  bg: string;
  glowColor: string;
}

const StatCard = ({ icon: Icon, label, value, color, bg, glowColor }: StatCardProps) => (
  <div className="stat-card">
    <div className={`stat-icon-wrap ${bg}`} style={{ boxShadow: `0 0 16px ${glowColor}` }}>
      <Icon size={20} className={color} />
    </div>
    <div>
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
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
        bg="bg-success/15"
        glowColor="rgba(34,197,94,.25)"
      />
      <StatCard
        icon={RotateCcw}
        label="Backtracks"
        value={stats.backtracks}
        color="text-destructive"
        bg="bg-destructive/15"
        glowColor="rgba(239,68,68,.25)"
      />
      <StatCard
        icon={Zap}
        label="Propagations"
        value={stats.propagations}
        color="text-secondary"
        bg="bg-secondary/15"
        glowColor="rgba(34,211,238,.25)"
      />
      <StatCard
        icon={Clock}
        label="Solve Time"
        value={`${stats.timeMs.toFixed(1)} ms`}
        color="text-accent"
        bg="bg-accent/15"
        glowColor="rgba(236,72,153,.25)"
      />
    </div>
  );
};
