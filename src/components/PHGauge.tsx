import { motion } from "framer-motion";

type PHGaugeProps = {
  currentPH: number;
  onScanNext?: () => void;
  onGoHome?: () => void;
  qrId?: string | null;
  onViewDetails?: (qrId: string) => void;
};

type GaugeBand = {
  color: string;
  status: string;
  alertTitle: string;
  advice: string;
  bgClass: string;
  infoCardClass: string;
  infoTitleClass: string;
  infoBodyClass: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function polar(cx: number, cy: number, radius: number, angleDeg: number) {
  const angle = toRad(angleDeg);
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

function describeArc(cx: number, cy: number, radius: number, startDeg: number, endDeg: number) {
  const start = polar(cx, cy, radius, startDeg);
  const end = polar(cx, cy, radius, endDeg);
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`;
}

function arcAngleForPH(currentPH: number) {
  const ph = clamp(currentPH, 5, 9.5);
  const t = (ph - 5.0) / 4.5;
  return 180 + clamp(t, 0, 1) * 180;
}

function dynamicAdviceForPh(currentPH: number) {
  if (currentPH <= 6.0) {
    return "Thực phẩm đang ở trạng thái tươi. Duy trì bảo quản lạnh để giữ chất lượng.";
  }
  if (currentPH <= 7.0) {
    return currentPH >= 6.8
      ? "Độ tươi bắt đầu giảm. Nên chế biến sớm."
      : "Độ tươi đang giảm nhẹ. Nên ưu tiên dùng trong hôm nay.";
  }
  if (currentPH <= 8.5) {
    return currentPH >= 8.2
      ? "Mẫu đang tiến sát ngưỡng nguy hiểm. Cần kiểm tra kỹ trước khi dùng."
      : "Mẫu đã vào vùng cảnh báo. Kiểm tra mùi và bề mặt trước khi sử dụng.";
  }

  return "Thực phẩm đã vào mức nguy hiểm. Khuyến cáo không tiếp tục sử dụng.";
}

function getBand(currentPH: number): GaugeBand {
  if (currentPH <= 6.0) {
    return {
      color: "#22c55e",
      status: "TƯƠI",
      alertTitle: "AN TOÀN",
      advice: dynamicAdviceForPh(currentPH),
      bgClass: "from-emerald-500 to-emerald-800",
      infoCardClass: "bg-emerald-50 text-emerald-900 ring-emerald-200",
      infoTitleClass: "text-emerald-900",
      infoBodyClass: "text-emerald-800",
    };
  }
  if (currentPH <= 7.0) {
    return {
      color: "#eab308",
      status: "GIẢM CHẤT LƯỢNG",
      alertTitle: "LƯU Ý",
      advice: dynamicAdviceForPh(currentPH),
      bgClass: "from-yellow-500 to-yellow-800",
      infoCardClass: "bg-yellow-50 text-yellow-900 ring-yellow-200",
      infoTitleClass: "text-yellow-900",
      infoBodyClass: "text-yellow-800",
    };
  }
  if (currentPH <= 8.5) {
    return {
      color: "#f97316",
      status: "ÔI THIU",
      alertTitle: "CẦN CẨN TRỌNG",
      advice: dynamicAdviceForPh(currentPH),
      bgClass: "from-orange-500 to-orange-800",
      infoCardClass: "bg-orange-50 text-orange-900 ring-orange-200",
      infoTitleClass: "text-orange-900",
      infoBodyClass: "text-orange-800",
    };
  }

  return {
    color: "#ef4444",
    status: "HỎNG NẶNG",
    alertTitle: "NGUY HIỂM",
    advice: dynamicAdviceForPh(currentPH),
    bgClass: "from-red-600 to-red-900",
    infoCardClass: "bg-red-50 text-red-900 ring-red-200",
    infoTitleClass: "text-red-900",
    infoBodyClass: "text-red-800",
  };
}

export default function PHGauge({ currentPH, onScanNext, onGoHome, qrId, onViewDetails }: PHGaugeProps) {
  const safePH = clamp(currentPH, 0, 14);
  const band = getBand(safePH);
  const arrowAngle = arcAngleForPH(safePH);
  const canViewDetails = Boolean(qrId && onViewDetails);

  const cx = 120;
  const cy = 132;
  const radius = 92;
  const arrowTrackPoint = polar(cx, cy, radius + 12, arrowAngle);
  const arrowRotation = arrowAngle + 180;

  const glowStyle = {
    textShadow: `0 0 14px ${band.color}99, 0 0 30px ${band.color}55`,
  };

  return (
    <div className={`mx-auto w-full max-w-md rounded-[28px] bg-gradient-to-b p-4 text-white shadow-2xl ring-1 ring-white/20 sm:p-5 ${band.bgClass}`}>
      <div className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-white/80">Kết quả quét BioSmart</div>

      <div className="relative mx-auto mt-3 w-full max-w-[350px]">
        <svg viewBox="0 0 240 178" className="h-auto w-full" role="img" aria-label={`Đồng hồ pH, giá trị hiện tại ${safePH.toFixed(2)}`}>
          <defs>
            {/*
              pH scale 5.0–9.5 mapped to 0–100%:
                5.0 = 0%   → tím (#7c3aed)
                6.0 = 22%  → tím-lam (#818cf8)
                6.5 = 33%  → xanh lam (#60a5fa)
                7.5 = 55%  → teal (#34d399)
                8.5 = 77%  → vàng (#fbbf24)
                9.5 = 100% → vàng nhạt (#fde68a)
            */}
            <linearGradient id="phSweep" x1="28" y1="132" x2="212" y2="132" gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor="#7c3aed" />
              <stop offset="22%"  stopColor="#818cf8" />
              <stop offset="33%"  stopColor="#60a5fa" />
              <stop offset="55%"  stopColor="#34d399" />
              <stop offset="77%"  stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#fde68a" />
            </linearGradient>
          </defs>

          <path d={describeArc(cx, cy, radius, 180, 0)} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="18" strokeLinecap="round" />

          <path d={describeArc(cx, cy, radius, 180, 0)} fill="none" stroke="url(#phSweep)" strokeWidth="18" strokeLinecap="round" />

          <motion.g
            initial={{ x: arrowTrackPoint.x, y: arrowTrackPoint.y, rotate: arrowRotation }}
            animate={{ x: arrowTrackPoint.x, y: arrowTrackPoint.y, rotate: arrowRotation }}
            transition={{ type: "spring", stiffness: 120, damping: 18, mass: 0.7 }}
            style={{ filter: `drop-shadow(0 0 8px ${band.color}cc)` }}
          >
            <path d="M 0 0 L -14 -8 L -14 8 Z" fill={band.color} stroke="rgba(255,255,255,0.9)" strokeWidth="1" />
          </motion.g>

          <circle cx={cx} cy={cy} r={7} fill="#0f172a" stroke="#ffffff" strokeWidth={2} />
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-3 text-center">
          <div className="text-5xl font-black leading-none sm:text-6xl" style={glowStyle}>{safePH.toFixed(2)}</div>
          <div className="mt-1 whitespace-nowrap px-2 text-[11px] font-bold tracking-wide sm:text-sm" style={glowStyle}>{band.status}</div>
        </div>
      </div>

      <div className={`mt-6 rounded-2xl p-3 ring-1 backdrop-blur-sm ${band.infoCardClass}`}>
        {/* Trạng thái nổi bật */}
        <div className="flex items-center gap-2 mb-2">
          <span
            className="inline-flex items-center rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider text-white shadow-sm"
            style={{ backgroundColor: band.color }}
          >
            {band.status}
          </span>
        </div>
        <div className={`text-xl font-black leading-tight ${band.infoTitleClass}`}>{band.alertTitle}</div>
        <p className={`mt-1 text-sm ${band.infoBodyClass}`}>{band.advice}</p>
      </div>

      <div className="mt-4 grid gap-2">
        <button
          type="button"
          onClick={onScanNext}
          className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-900 shadow-lg shadow-black/20 active:scale-[0.98]"
        >
          Quét tiếp
        </button>
        <button
          type="button"
          onClick={() => {
            if (qrId && onViewDetails) {
              onViewDetails(qrId);
            }
          }}
          disabled={!canViewDetails}
          className="inline-flex items-center justify-center rounded-2xl border border-white/55 bg-transparent px-4 py-3 text-sm font-semibold text-white ring-1 ring-white/45 backdrop-blur active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Xem nguồn gốc sản phẩm
        </button>
      </div>

      <button
        type="button"
        onClick={onGoHome}
        className="mt-3 block w-full text-center text-sm font-semibold text-white/90 underline underline-offset-4 hover:text-white"
      >
        Về trang chính
      </button>
    </div>
  );
}