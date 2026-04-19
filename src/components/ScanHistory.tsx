import type { ScanRecord } from "../types";
import { formatPackDate, formatScanDateTime } from "../utils/date";

function statusLabel(record: ScanRecord): { label: string; cls: string } {
  if (record.status === "blocked") {
    return { label: "Không đọc được", cls: "bg-slate-700 text-slate-100 ring-slate-500/40" };
  }
  const m: Record<string, { label: string; cls: string }> = {
    fresh: { label: "Tươi", cls: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30" },
    warning: { label: "Cảnh báo", cls: "bg-amber-500/15 text-amber-100 ring-amber-400/30" },
    spoiled: { label: "Nguy hiểm", cls: "bg-rose-500/15 text-rose-100 ring-rose-400/30" },
  };
  return m[record.status] ?? { label: record.status, cls: "bg-white/10 text-white ring-white/15" };
}

export default function ScanHistory({
  items,
  onClear,
}: {
  items: ScanRecord[];
  onClear: () => void;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-3xl bg-white/5 p-4 ring-1 ring-white/10 text-sm text-white/60">
        Chưa có lần quét nào. Sau khi quét, lịch sử hiển thị tại đây (tối đa 30 mục).
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/10">
        <span className="text-xs font-semibold text-white/70">Lịch sử quét</span>
        <button
          type="button"
          onClick={onClear}
          className="text-[11px] font-semibold text-white/50 hover:text-white/80 active:scale-[0.99]"
        >
          Xóa lịch sử
        </button>
      </div>
      <ul className="max-h-[min(360px,50vh)] overflow-y-auto divide-y divide-white/10">
        {items.map((r) => {
          const badge = statusLabel(r);
          const title =
            r.product?.name ?? (r.qrId ? `Mã ${r.qrId}` : "Không quét được QR");
          return (
            <li key={r.id} className="px-4 py-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-white truncate">{title}</div>
                  <div className="mt-1 text-[11px] text-white/55">
                    {formatScanDateTime(r.scannedAt)}
                    {r.qrId ? <span className="text-white/40"> · QR {r.qrId}</span> : null}
                  </div>
                  {r.product?.packDate ? (
                    <div className="mt-1 text-[11px] text-white/60">
                      Ngày đóng gói:{" "}
                      <span className="text-white/85">{formatPackDate(r.product.packDate)}</span>
                    </div>
                  ) : null}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ring-1 ${badge.cls}`}
                >
                  {badge.label}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
