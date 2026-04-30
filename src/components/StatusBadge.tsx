type StatusBadgeProps = {
  status: string;
};

const styles: Record<string, string> = {
  approved: "bg-success/10 text-success border-success/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  open: "bg-danger/10 text-danger border-danger/20",
  acknowledged: "bg-warning/10 text-warning border-warning/20",
  resolved: "bg-success/10 text-success border-success/20",
  online: "bg-success/10 text-success border-success/20",
  active: "bg-success/10 text-success border-success/20",
  observing: "bg-warning/10 text-warning border-warning/20",
  stowaway: "bg-danger/10 text-danger border-danger/20",
  ticketed: "bg-success/10 text-success border-success/20",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const labels: Record<string, string> = {
    observing: "dipantau",
    stowaway: "stowaway",
    ticketed: "ticketed",
  };

  return (
    <span className={`inline-flex h-6 items-center rounded-full border px-2 text-xs font-bold uppercase ${styles[status] ?? "bg-muted text-muted-foreground border-border"}`}>
      {labels[status] ?? status}
    </span>
  );
}
