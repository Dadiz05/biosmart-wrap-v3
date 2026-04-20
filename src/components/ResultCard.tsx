import { useStore } from "../store/useStore";
import StatusBadge from "./StatusBadge";

function colorLabel(color: "purple" | "blue" | "green" | "yellow") {
  switch (color) {
    case "purple":
      return "Tím";
    case "blue":
      return "Xanh lam";
    case "green":
      return "Xanh";
    case "yellow":
      return "Xanh vàng";
  }
}

export default function ResultCard({ lightMode = false }: { lightMode?: boolean }) {
  const { aiResult } = useStore();

  if (!aiResult) return null;

  const colorToneClass =
    aiResult.color === "purple"
      ? "bg-violet-50 text-violet-950 ring-violet-200"
      : aiResult.color === "blue"
        ? "bg-blue-50 text-blue-950 ring-blue-200"
        : aiResult.color === "green"
          ? "bg-green-50 text-green-950 ring-green-200"
          : "bg-lime-50 text-lime-900 ring-lime-200";

  return (
    <div
      className={`rounded-3xl p-4 shadow-xl ring-1 backdrop-blur ${
        lightMode ? "bg-white text-slate-900 ring-slate-200" : colorToneClass
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 text-sm font-semibold text-slate-700">Kết quả phân tích QR</div>
        <StatusBadge status={aiResult.status} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div
          className={`rounded-2xl p-3 ring-1 ${
            lightMode ? "bg-white ring-slate-200" : "bg-slate-50 ring-slate-200"
          }`}
        >
          <div className="text-xs font-medium text-slate-600">🌡 pH (AI)</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">
            {aiResult.ph}
          </div>
        </div>

        <div
          className={`rounded-2xl p-3 ring-1 ${
            lightMode ? "bg-white ring-slate-200" : "bg-slate-50 ring-slate-200"
          }`}
        >
          <div className="text-xs font-medium text-slate-600">🎨 Màu nền</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">
            {colorLabel(aiResult.color)}
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

      {aiResult.status === "critical" && (
        <div className="mt-4 rounded-2xl bg-rose-50 p-3 text-rose-900 ring-1 ring-rose-200">
          <div className="text-sm font-semibold">⚠️ Cảnh báo</div>
          <div className="mt-1 text-sm">
            Mức pH cho thấy thực phẩm đã hỏng nặng. Vui lòng không sử dụng.
          </div>
        </div>
      )}
    </div>
  );
}