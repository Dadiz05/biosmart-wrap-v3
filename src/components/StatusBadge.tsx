type Status = "fresh" | "degraded" | "spoiled" | "critical";

export default function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, { label: string; cls: string }> = {
    fresh: {
      label: "Tươi",
      cls: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    },
    degraded: {
      label: "Giảm chất lượng",
      cls: "bg-amber-50 text-amber-900 ring-amber-200",
    },
    spoiled: {
      label: "Ôi thiu",
      cls: "bg-lime-50 text-lime-900 ring-lime-200",
    },
    critical: {
      label: "Hỏng nặng",
      cls: "bg-rose-50 text-rose-900 ring-rose-200",
    },
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide ring-1 ${map[status].cls}`}
    >
      {map[status].label}
    </span>
  );
}