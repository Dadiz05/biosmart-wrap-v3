import { useState } from "react";
import { useStore } from "../store/useStore";
import { IconShield, IconClock, IconTrendingDown } from "./Icons";
import PhSensorDial from "./PhSensorDial";

type AlertStatus = "fresh" | "degraded" | "spoiled" | "critical";

function statusUserFriendly(status: AlertStatus) {
  switch (status) {
    case "fresh":
      return { keyword: "TƯƠI", emoji: "✨", color: "bg-emerald-500", icon: IconShield };
    case "degraded":
      return { keyword: "GIẢM CHẤT LƯỢNG", emoji: "⏱️", color: "bg-yellow-500", icon: IconClock };
    case "spoiled":
      return { keyword: "ÔI THIU", emoji: "⚠️", color: "bg-orange-500", icon: IconTrendingDown };
    case "critical":
      return { keyword: "NGUY HIỂM", emoji: "🚫", color: "bg-red-500", icon: IconTrendingDown };
  }
}

function statusExplanation(status: AlertStatus) {
  switch (status) {
    case "fresh":
      return "Thực phẩm vẫn giữ nguyên chất dinh dưỡng và độ tươi tốt nhất. An toàn để sử dụng.";
    case "degraded":
      return "Độ tươi bắt đầu giảm. Hãy chế biến ngay để đảm bảo hương vị tốt nhất và tránh mất chất dinh dưỡng.";
    case "spoiled":
      return "Thực phẩm đã ôi thiu. Kiểm tra kỹ mùi và bề mặt, cân nhắc trước khi sử dụng.";
    case "critical":
      return "Thực phẩm đã hỏng nặng, nguy cơ cao. Nên loại bỏ để đảm bảo an toàn.";
  }
}

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
      return "Mẫu chưa rõ";
    case "qr-unreadable":
      return "Không nhận diện được QR";
    case "qr-invalid":
      return "QR không hợp lệ hoặc không phải BioSmart";
    case "analysis-failed":
      return "Phân tích thất bại";
    case "qr-structure-broken":
      return "Cấu trúc QR bị vỡ";
    case "ai-unavailable":
      return "AI fallback";
    case "ai-visual-inspection":
      return "AI visual inspection";
    default:
      return issue;
  }
}

type ResultCardProps = {
  lightMode?: boolean;
  compact?: boolean;
  onViewProduct?: (qrId: string) => void;
};

export default function ResultCard({ lightMode = false, compact = false, onViewProduct }: ResultCardProps) {
  const { aiResult } = useStore();
  const [showTechnical, setShowTechnical] = useState(false);

  if (!aiResult) return null;

  const confidence = aiResult.ph.confidence;
  const status = aiResult.ph.status;
  const userFriendly = statusUserFriendly(status);
  const explanation = statusExplanation(status);
  const confidenceTone = confidenceClass(confidence, lightMode);

  // Nếu là compact mode (trong modal), hiển thị gọn
  if (compact) {
    return (
      <div className={`rounded-2xl p-3 ring-1 ${lightMode ? "bg-slate-50 ring-slate-200" : "bg-white/10 ring-white/20"}`}>
        <div className="flex flex-col items-center justify-center gap-3 py-1 text-center">
          <PhSensorDial currentPH={aiResult.ph.ph} lightMode={lightMode} compact />
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider text-white ${userFriendly.color}`}>
            {userFriendly.emoji} {userFriendly.keyword}
          </span>
          <p className="text-sm text-current/80">{explanation}</p>
        </div>
      </div>
    );
  }

  // Full card view
  return (
    <div className={`rounded-3xl p-5 shadow-xl ring-1 backdrop-blur ${lightMode ? "bg-white text-slate-900 ring-slate-200" : "bg-white/10 text-current ring-white/20"}`}>
      {/* Kết quả quét */}
      <div className="flex flex-col items-center justify-center mb-5">
        <PhSensorDial currentPH={aiResult.ph.ph} lightMode={lightMode} />
        {/* Badge trạng thái nổi bật */}
        <span className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-black uppercase tracking-wider text-white shadow-md ${userFriendly.color}`}>
          {userFriendly.emoji} {userFriendly.keyword}
        </span>
        <p className={`mt-2 text-sm text-center max-w-sm ${lightMode ? "text-slate-600" : "text-current/70"}`}>
          {explanation}
        </p>
      </div>

      {/* Grid thông tin chính */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className={`rounded-2xl p-3 ring-1 ${lightMode ? "bg-slate-50 ring-slate-200" : "bg-white/5 ring-white/20"}`}>
          <div className={`text-xs font-medium ${lightMode ? "text-slate-500" : "text-current/60"}`}>Độ tươi</div>
          <div className="mt-1 text-2xl font-black">{aiResult.ph.phLevel}/200</div>
          <div className={`text-[11px] mt-1 ${lightMode ? "text-slate-600" : "text-current/70"}`}>Từ màu của mẫu</div>
        </div>

        <div className={`rounded-2xl p-3 ring-1 ${lightMode ? "bg-slate-50 ring-slate-200" : "bg-white/5 ring-white/20"}`}>
          <div className={`text-xs font-medium ${lightMode ? "text-slate-500" : "text-current/60"}`}>Độ tin cậy</div>
          <div className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${confidenceTone}`}>
            {Math.round(confidence * 100)}%
          </div>
          <div className={`text-[11px] mt-1 ${lightMode ? "text-slate-600" : "text-current/70"}`}>
            Độ rõ của mẫu {Math.round(aiResult.patch.confidence * 100)}%
          </div>
        </div>
      </div>

      {aiResult.qr.qrId && onViewProduct ? (
        <button
          type="button"
          onClick={() => onViewProduct(aiResult.qr.qrId)}
          className={`mb-5 w-full rounded-2xl px-4 py-3 text-sm font-semibold ring-1 active:scale-[0.99] ${
            lightMode ? "bg-slate-900 text-white ring-slate-900" : "bg-white/10 text-current ring-white/20"
          }`}
        >
          Xem thêm thông tin sản phẩm
        </button>
      ) : null}

      {/* Cảnh báo nếu có */}
      {aiResult.warnings.length > 0 ? (
        <div className={`rounded-2xl p-3 mb-5 ring-1 ${lightMode ? "bg-amber-50 ring-amber-200" : "bg-white/5 ring-white/20"}`}>
          <div className={`text-xs font-medium mb-2 ${lightMode ? "text-amber-800" : "text-amber-300"}`}>⚠️ Cảnh báo kỹ thuật</div>
          <div className="flex flex-wrap gap-2">
            {aiResult.warnings.map((issue) => (
              <span key={issue} className={`text-xs px-2 py-1 rounded-full ring-1 ${lightMode ? "bg-white ring-amber-200 text-amber-800" : "bg-white/10 ring-white/20 text-current/80"}`}>
                {warningLabel(issue)}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* Chi tiết kỹ thuật (toggle) */}
      <button
        onClick={() => setShowTechnical(!showTechnical)}
        className={`w-full py-2 px-3 text-xs font-medium rounded-lg text-center transition-colors ${
          lightMode
            ? `${showTechnical ? "bg-slate-200 text-slate-800" : "bg-slate-100 text-slate-600 hover:bg-slate-150"}`
            : `${showTechnical ? "bg-white/20 text-white" : "bg-white/10 text-current/70 hover:bg-white/15"}`
        }`}
      >
        {showTechnical ? "— Ẩn" : "+ Xem"} chi tiết kỹ thuật
      </button>

      {showTechnical ? (
        <div className={`mt-4 rounded-2xl p-3 ring-1 ${lightMode ? "bg-sky-50 ring-sky-200 text-sky-900" : "bg-white/5 ring-white/20"}`}>
          <div className="text-xs font-semibold mb-2">🔬 AI Recognition Metadata</div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <span className="opacity-75">Mode:</span>
              <div className="font-medium">{aiResult.ai.mode}</div>
            </div>
            <div>
              <span className="opacity-75">Provider:</span>
              <div className="font-medium">{aiResult.ai.model.provider}</div>
            </div>
            <div>
              <span className="opacity-75">QR Structure:</span>
              <div className="font-medium">{Math.round(aiResult.ai.qrStructureScore * 100)}%</div>
            </div>
            <div>
              <span className="opacity-75">Rectification:</span>
              <div className="font-medium">{Math.round(aiResult.ai.rectificationScore * 100)}%</div>
            </div>
            <div>
              <span className="opacity-75">Segmentation:</span>
              <div className="font-medium">{aiResult.ai.segmentationLabel}</div>
            </div>
            <div>
              <span className="opacity-75">Seg Conf:</span>
              <div className="font-medium">{Math.round(aiResult.ai.segmentationConfidence * 100)}%</div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="text-xs font-semibold mb-2">🎨 Màu mẫu sau hiệu chỉnh</div>
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-lg shadow-md"
                style={{
                  backgroundColor: `rgb(${Math.round(aiResult.patch.calibratedRgb.r)}, ${Math.round(aiResult.patch.calibratedRgb.g)}, ${Math.round(aiResult.patch.calibratedRgb.b)})`,
                }}
              ></div>
              <div className="text-[10px]">
                <div>
                  RGB {Math.round(aiResult.patch.calibratedRgb.r)}, {Math.round(aiResult.patch.calibratedRgb.g)}, {Math.round(aiResult.patch.calibratedRgb.b)}
                </div>
                <div className="mt-1">
                  Hue {Math.round(aiResult.patch.hsv.h)}° • Sat {Math.round(aiResult.patch.hsv.s * 100)}%
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="text-xs font-semibold mb-2">⚙️ Calibration</div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <span className="opacity-75">Method:</span>
                <div className="font-medium uppercase">{aiResult.patch.calibration.method}</div>
              </div>
              <div>
                <span className="opacity-75">Quality:</span>
                <div className="font-medium">{Math.round(aiResult.patch.calibration.quality * 100)}%</div>
              </div>
              <div>
                <span className="opacity-75">Exposure:</span>
                <div className="font-medium">{aiResult.patch.calibration.exposureScale.toFixed(2)}x</div>
              </div>
              <div>
                <span className="opacity-75">Gamma:</span>
                <div className="font-medium">{aiResult.patch.calibration.gamma.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}