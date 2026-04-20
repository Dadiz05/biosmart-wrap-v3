import { useStore } from "../store/useStore";
import StatusBadge from "./StatusBadge";

function confidenceClass(value: number, lightMode: boolean) {
  if (value >= 0.85) {
    return lightMode ? "bg-emerald-100 text-emerald-800 ring-emerald-200" : "bg-emerald-500/15 text-emerald-100 ring-emerald-400/30";
  }
  if (value >= 0.65) {
    return lightMode ? "bg-amber-100 text-amber-800 ring-amber-200" : "bg-amber-500/15 text-amber-100 ring-amber-400/30";
  }
  return lightMode ? "bg-rose-100 text-rose-800 ring-rose-200" : "bg-rose-500/15 text-rose-100 ring-rose-400/30";
}

function warningLabel(issue: string) {
  switch (issue) {
    case "patch-low-light":
      return "Ánh sáng yếu";
    case "patch-glare":
      return "Lóa sáng";
    case "patch-unclear":
      return "Patch chưa rõ";
    case "qr-unreadable":
      return "QR không đọc được";
    case "qr-invalid":
      return "QR không hợp lệ";
    case "analysis-failed":
      return "Phân tích thất bại";
    default:
      return issue;
  }
}

type ResultCardProps = {
  lightMode?: boolean;
  compact?: boolean;
};

export default function ResultCard({ lightMode = false, compact = false }: ResultCardProps) {
  const { aiResult } = useStore();

  if (!aiResult) return null;

  const confidence = aiResult.ph.confidence;
  const confidenceTone = confidenceClass(confidence, lightMode);
  const panelClass = lightMode
    ? "rounded-2xl p-3 ring-1 bg-slate-50 ring-slate-200"
    : "rounded-2xl p-3 ring-1 bg-white/16 ring-white/30";
  const labelClass = lightMode ? "text-xs font-medium text-slate-500" : "text-xs font-medium text-current/75";
  const metaClass = lightMode ? "mt-1 text-[11px] text-slate-500" : "mt-1 text-[11px] text-current/75";

  return (
    <div className={`rounded-3xl p-4 shadow-xl ring-1 backdrop-blur ${lightMode ? "bg-white text-slate-900 ring-slate-200" : "bg-white/16 text-current ring-white/30"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={`text-xs font-semibold uppercase tracking-wide ${lightMode ? "text-slate-500" : "text-current/80"}`}>
            Scan summary
          </div>
          <div className="mt-1 text-lg font-semibold">QR ID {aiResult.qr.qrId}</div>
          <div className={`mt-1 text-xs ${lightMode ? "text-slate-500" : "text-current/80"}`}>
            Decoder: {aiResult.qr.decoder} • Live mode
          </div>
        </div>
        <StatusBadge status={aiResult.ph.status} />
      </div>

      <div className={`mt-4 grid gap-3 ${compact ? "grid-cols-1" : "grid-cols-2"}`}>
        <div className={panelClass}>
          <div className={labelClass}>QR ID</div>
          <div className="mt-1 text-sm font-semibold">{aiResult.qr.qrId}</div>
          <div className={metaClass}>
            Confidence {Math.round(aiResult.qr.confidence * 100)}%
          </div>
        </div>

        <div className={panelClass}>
          <div className={labelClass}>pH số</div>
          <div className="mt-1 text-sm font-semibold">{aiResult.ph.ph.toFixed(2)}</div>
          <div className={metaClass}>
            {aiResult.ph.phLevel}/200 mức
          </div>
        </div>

        <div className={panelClass}>
          <div className={labelClass}>Trạng thái</div>
          <div className="mt-1 text-sm font-semibold">{aiResult.ph.label}</div>
          <div className={metaClass}>
            {aiResult.ph.message}
          </div>
        </div>

        {!compact ? (
          <div className={panelClass}>
            <div className={labelClass}>Độ tin cậy</div>
            <div className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-sm font-semibold ring-1 ${confidenceTone}`}>
              {Math.round(confidence * 100)}%
            </div>
            <div className={metaClass}>
              Mau QR {Math.round(aiResult.patch.confidence * 100)}% • Calibration {Math.round(aiResult.patch.calibration.quality * 100)}%
            </div>
          </div>
        ) : null}
      </div>

      {aiResult.warnings.length > 0 && !compact ? (
        <div className={`mt-4 rounded-2xl p-3 ring-1 ${lightMode ? "bg-amber-50 ring-amber-200 text-amber-900" : "bg-white/20 ring-white/35 text-current"}`}>
          <div className="text-sm font-semibold">Cảnh báo kỹ thuật</div>
          <div className="mt-1 flex flex-wrap gap-2 text-xs">
            {aiResult.warnings.map((issue) => (
              <span key={issue} className={`rounded-full px-2.5 py-1 ring-1 ${lightMode ? "bg-white ring-amber-200" : "bg-white/15 ring-white/30"}`}>
                {warningLabel(issue)}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {!compact ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className={panelClass}>
            <div className={labelClass}>Mau QR sau hieu chinh</div>
            <div className="mt-1 text-sm font-semibold">
              RGB {Math.round(aiResult.patch.calibratedRgb.r)}, {Math.round(aiResult.patch.calibratedRgb.g)}, {Math.round(aiResult.patch.calibratedRgb.b)}
            </div>
            <div className={metaClass}>
              Hue {Math.round(aiResult.patch.hsv.h)}° • Saturation {Math.round(aiResult.patch.hsv.s * 100)}%
            </div>
          </div>

          <div className={panelClass}>
            <div className={labelClass}>Calibration</div>
            <div className="mt-1 text-sm font-semibold uppercase">{aiResult.patch.calibration.method}</div>
            <div className={metaClass}>
              Exposure {aiResult.patch.calibration.exposureScale.toFixed(2)} • Gamma {aiResult.patch.calibration.gamma.toFixed(2)}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
