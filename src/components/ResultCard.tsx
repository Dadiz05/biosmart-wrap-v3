import { useStore } from "../store/useStore";
import StatusBadge from "./StatusBadge";

export default function ResultCard() {
  const { product, aiResult } = useStore();

  if (!product || !aiResult) return null;

  return (
    <div className="rounded-3xl bg-white/95 p-4 shadow-xl ring-1 ring-black/5 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-900 truncate">
            {product.name}
          </h2>
          <div className="mt-1 text-xs text-slate-600">
            <span className="font-medium">🏭</span> {product.supplier}
            <span className="mx-2 text-slate-300">•</span>
            <span className="font-medium">📅</span> {product.packDate}
          </div>
        </div>
        <StatusBadge status={aiResult.status} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <div className="text-xs font-medium text-slate-600">🌡 pH (AI)</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">
            {aiResult.ph}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <div className="text-xs font-medium text-slate-600">🎨 Màu detect</div>
          <div className="mt-1 text-sm font-semibold text-slate-900 capitalize">
            {aiResult.color}
          </div>
        </div>
      </div>

      {aiResult.previewDataUrl && (
        <div className="mt-4">
          <div className="text-xs font-medium text-slate-600 mb-2">Preview</div>
          <img
            src={aiResult.previewDataUrl}
            alt="Captured frame preview"
            className="w-full rounded-2xl ring-1 ring-black/5"
            loading="lazy"
          />
        </div>
      )}

      {aiResult.status === "spoiled" && (
        <div className="mt-4 rounded-2xl bg-rose-50 p-3 text-rose-900 ring-1 ring-rose-200">
          <div className="text-sm font-semibold">⚠️ Cảnh báo</div>
          <div className="mt-1 text-sm">
            Thực phẩm có dấu hiệu ôi thiu/hỏng. Vui lòng không sử dụng.
          </div>
        </div>
      )}
    </div>
  );
}