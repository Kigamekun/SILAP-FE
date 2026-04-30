export function formatDateTime(value: string | null): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}
