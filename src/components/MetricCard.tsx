import type { LucideIcon } from "lucide-react";

type MetricCardProps = {
  title: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "default" | "danger" | "success" | "warning";
  caption?: string;
};

const toneStyles = {
  default: "bg-primary/10 text-primary",
  danger: "bg-danger/10 text-danger",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
};

export function MetricCard({ title, value, icon: Icon, tone = "default", caption }: MetricCardProps) {
  return (
    <div className="panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-bold">{value}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${toneStyles[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {caption ? <p className="mt-3 text-xs text-muted-foreground">{caption}</p> : null}
    </div>
  );
}
