import { CheckCircle2, Clock, Wrench, AlertCircle, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface MaintenanceTimelineProps {
  status: string;
  createdAt: string;
  technician: string;
  issue: string;
  resolvedAt?: string;
  resolution?: string;
  cost?: number;
}

export function MaintenanceTimeline({
  status,
  createdAt,
  technician,
  issue,
  resolvedAt,
  resolution = "Awaiting technician diagnostic report.",
  cost,
}: MaintenanceTimelineProps) {
  const isPending = status.toLowerCase() === "pending";
  const isInProgress = status.toLowerCase() === "in progress" || status.toLowerCase() === "in_progress";
  const isCompleted = status.toLowerCase() === "completed";
  const isCancelled = status.toLowerCase() === "cancelled";

  const steps = [
    {
      title: "Maintenance Scheduled & Issue Logged",
      time: createdAt,
      desc: `Issue reported: "${issue}"`,
      active: true,
      done: true,
      icon: AlertCircle,
      color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    },
    {
      title: "Technician Assignment",
      time: isPending ? "Pending Assignment" : createdAt,
      desc: technician ? `Assigned to ${technician}` : "Awaiting dispatcher action",
      active: !isPending,
      done: !isPending,
      icon: Wrench,
      color: isPending
        ? "text-muted-foreground bg-muted border-muted"
        : "text-amber-500 bg-amber-500/10 border-amber-500/20",
    },
    {
      title: "Diagnostic & Repair Process",
      time: isInProgress || isCompleted ? "In Progress" : "Awaiting diagnosis",
      desc: isCompleted ? "Repair complete" : isInProgress ? "Unit on repair bench" : "Pending diagnostic",
      active: isInProgress || isCompleted,
      done: isCompleted,
      icon: Clock,
      color: isCompleted
        ? "text-green-500 bg-green-500/10 border-green-500/20"
        : isInProgress
        ? "text-orange-500 bg-orange-500/10 border-orange-500/20"
        : "text-muted-foreground bg-muted border-muted",
    },
    {
      title: "Quality Check & Completed",
      time: isCompleted ? resolvedAt || "Completed" : "Awaiting completion",
      desc: isCompleted
        ? `Resolution: ${resolution}${cost ? ` (Cost: $${cost})` : ""}`
        : "Pending repair completion",
      active: isCompleted,
      done: isCompleted,
      icon: CheckCircle2,
      color: isCompleted
        ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
        : "text-muted-foreground bg-muted border-muted",
    },
  ];

  return (
    <div className="relative pl-6 border-l border-border space-y-6 ml-3 animate-in fade-in-50 duration-200">
      {steps.map((step, idx) => {
        const Icon = step.icon;
        return (
          <div key={idx} className="relative">
            <span className={cn(
              "absolute -left-[37px] top-0.5 h-6 w-6 rounded-full border grid place-items-center shrink-0 z-10 transition-colors duration-200",
              step.done ? step.color : "bg-card text-muted-foreground border-border"
            )}>
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="flex justify-between items-start gap-4">
              <div className="min-w-0">
                <h4 className={cn(
                  "text-sm font-semibold leading-tight",
                  step.active ? "text-foreground" : "text-muted-foreground"
                )}>
                  {step.title}
                </h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-sm">
                  {step.desc}
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium shrink-0 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {step.time}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
