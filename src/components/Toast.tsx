import { useEffect } from "react";

type Tone = "success" | "warning" | "danger" | "info";

const toneClasses: Record<Tone, string> = {
  success: "bg-emerald-600 text-white",
  warning: "bg-amber-500 text-black",
  danger: "bg-rose-600 text-white",
  info: "bg-slate-900 text-white",
};

export default function Toast({
  open,
  message,
  tone = "info",
  durationMs = 2600,
  onClose,
}: {
  open: boolean;
  message: string;
  tone?: Tone;
  durationMs?: number;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(onClose, durationMs);
    return () => clearTimeout(t);
  }, [open, durationMs, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 top-3 z-[10000] flex justify-center px-4">
      <div
        className={`max-w-md w-full rounded-2xl px-4 py-3 shadow-lg ring-1 ring-black/10 backdrop-blur ${toneClasses[tone]}`}
        role="status"
      >
        <div className="text-sm font-medium">{message}</div>
      </div>
    </div>
  );
}

