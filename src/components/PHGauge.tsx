import { motion } from "framer-motion";

type PHGaugeProps = {
  currentPH: number;
  onScanNext?: () => void;
  onGoHome?: () => void;
};

type GaugeBand = {
  color: string;
  status: string;
  alertTitle: string;
  advice: string;
  bgClass: string;
  infoCardClass: string;
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

function getBand(currentPH: number): GaugeBand {
  if (currentPH <= 6.0) {
    return {
      color: "#22C55E",
      status: "TƯƠI",
      alertTitle: "AN TOÀN",
      advice: "Thực phẩm tươi ngon. Tiếp tục bảo quản đúng nhiệt độ để giữ chất lượng.",
      bgClass: "from-emerald-500 to-emerald-700",
      infoCardClass: "bg-emerald-50 text-emerald-900 ring-emerald-200",
    };
  }
  if (currentPH <= 7.0) {
    return {
      color: "#EAB308",
      status: "GIẢM CHẤT LƯỢNG",
      alertTitle: "LƯU Ý",
      advice: "Độ tươi bắt đầu giảm. Nên chế biến sớm để đảm bảo chất lượng.",
      bgClass: "from-yellow-500 to-yellow-700",
      infoCardClass: "bg-yellow-50 text-yellow-900 ring-yellow-200",
    };
  }
  if (currentPH <= 8.5) {
    return {
      color: "#F97316",
      status: "CẢNH BÁO",
      alertTitle: "CẦN CẨN TRỌNG",
      advice: "Vùng màu đã chuyển sang cam. Kiểm tra kỹ mùi và bề mặt trước khi dùng.",
      bgClass: "from-orange-500 to-orange-700",
      infoCardClass: "bg-orange-50 text-orange-900 ring-orange-200",
    };
  }

  return {
    color: "#EF4444",
    status: "NGUY HIỂM",
    alertTitle: "NGUY HIỂM",
    advice: "Thực phẩm vào mức nguy hiểm. Khuyến cáo loại bỏ để đảm bảo an toàn.",
    bgClass: "from-red-600 to-red-800",
    infoCardClass: "bg-red-50 text-red-900 ring-red-200",
  };
}

function needleRotationForPH(currentPH: number) {
  const ph = clamp(currentPH, 5, 9.5);

  let t = 0;
  if (ph <= 6.0) {
    t = ((ph - 5.0) / 1.0) * 0.25;
  } else if (ph <= 7.0) {
    t = 0.25 + ((ph - 6.0) / 1.0) * 0.25;
  } else if (ph <= 8.5) {
    t = 0.5 + ((ph - 7.0) / 1.5) * 0.25;
  } else {
    t = 0.75 + ((ph - 8.5) / 1.0) * 0.25;
  }

  return -90 + clamp(t, 0, 1) * 180;
}

export default function PHGauge({ currentPH, onScanNext, onGoHome }: PHGaugeProps) {
  const safePH = clamp(currentPH, 0, 14);
  const band = getBand(safePH);
  const needleRotate = needleRotationForPH(safePH);

  const cx = 120;
  const cy = 132;
  const radius = 92;

  return (
    <div className={`mx-auto w-full max-w-md rounded-[28px] bg-gradient-to-b p-4 text-white shadow-2xl ring-1 ring-white/20 sm:p-5 ${band.bgClass}`}>
      <div className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-white/80">Kết quả quét BioSmart</div>

      <div className="relative mx-auto mt-3 w-full max-w-[350px]">
        <svg viewBox="0 0 240 178" className="h-auto w-full" role="img" aria-label={`Đồng hồ pH, giá trị hiện tại ${safePH.toFixed(2)}`}>
          <path d={describeArc(cx, cy, radius, 180, 0)} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="18" strokeLinecap="round" />

          <path d={describeArc(cx, cy, radius, 180, 135)} fill="none" stroke="#22C55E" strokeWidth="18" strokeLinecap="butt" />
          <path d={describeArc(cx, cy, radius, 135, 90)} fill="none" stroke="#EAB308" strokeWidth="18" strokeLinecap="butt" />
          <path d={describeArc(cx, cy, radius, 90, 45)} fill="none" stroke="#F97316" strokeWidth="18" strokeLinecap="butt" />
          <path d={describeArc(cx, cy, radius, 45, 0)} fill="none" stroke="#EF4444" strokeWidth="18" strokeLinecap="butt" />

          <motion.g
            initial={{ rotate: -90 }}
            animate={{ rotate: needleRotate }}
            transition={{ type: "spring", stiffness: 115, damping: 16, mass: 0.75 }}
            style={{ originX: `${cx}px`, originY: `${cy}px` }}
          >
            <line x1={cx} y1={cy} x2={cx} y2={54} stroke={band.color} strokeWidth={4} strokeLinecap="round" />
          </motion.g>

          <circle cx={cx} cy={cy} r={7} fill="#0f172a" stroke="#ffffff" strokeWidth={2} />
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-3 text-center">
          <div className="text-4xl font-black leading-none sm:text-5xl">{safePH.toFixed(2)}</div>
          <div className="mt-1 text-sm font-bold tracking-wide sm:text-base">{band.status}</div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-black/20 p-3 ring-1 ring-white/20 backdrop-blur-sm">
        <div className="text-xl font-black leading-tight">{band.alertTitle}</div>
        <p className="mt-1 text-sm text-white/90">{band.advice}</p>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={onScanNext}
          className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-900 shadow-lg shadow-black/20 active:scale-[0.98]"
        >
          Quét tiếp
        </button>
        <button
          type="button"
          onClick={onGoHome}
          className="inline-flex items-center justify-center rounded-2xl bg-white/20 px-4 py-3 text-sm font-semibold text-white ring-1 ring-white/40 backdrop-blur active:scale-[0.98]"
        >
          Về trang chính
        </button>
      </div>
    </div>
  );
}