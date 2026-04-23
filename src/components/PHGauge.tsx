import { motion } from "framer-motion";

type PHGaugeProps = {
  currentPH: number;
  onScanNext?: () => void;
  onGoHome?: () => void;
};

type GaugeBand = {
  color: string;
  status: string;
  molecule: string;
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
      color: "#4B0082",
      status: "RẤT TƯƠI",
      molecule: "Anthocyanin: Cation flavylium",
      alertTitle: "AN TOÀN",
      advice: "Thực phẩm đang ở trạng thái tươi ngon cao. Tiếp tục bảo quản đúng nhiệt độ để giữ chất lượng.",
      bgClass: "from-emerald-500 to-emerald-700",
      infoCardClass: "bg-emerald-50 text-emerald-900 ring-emerald-200",
    };
  }
  if (currentPH <= 7.0) {
    return {
      color: "#4169E1",
      status: "GIẢM CHẤT LƯỢNG",
      molecule: "Anthocyanin: Base quinoidal",
      alertTitle: "LƯU Ý",
      advice: "Độ tươi bắt đầu giảm. Nên chế biến sớm để giảm rủi ro và giữ hương vị.",
      bgClass: "from-sky-500 to-indigo-700",
      infoCardClass: "bg-sky-50 text-sky-900 ring-sky-200",
    };
  }
  if (currentPH <= 8.5) {
    return {
      color: "#228B22",
      status: "ÔI THIU",
      molecule: "Anthocyanin: Pseudobase carbinol",
      alertTitle: "CẢNH BÁO",
      advice: "Thực phẩm có dấu hiệu ôi thiu. Kiểm tra kỹ mùi và bề mặt trước khi sử dụng.",
      bgClass: "from-amber-500 to-orange-700",
      infoCardClass: "bg-amber-50 text-amber-900 ring-amber-200",
    };
  }

  return {
    color: "#ADFF2F",
    status: "THỐI RỮA",
    molecule: "Anthocyanin: Chalcone suy thoái",
    alertTitle: "NGUY HIỂM",
    advice: "Thực phẩm có nguy cơ ôi thiu cao. Khuyến cáo loại bỏ để đảm bảo an toàn.",
    bgClass: "from-rose-600 to-red-800",
    infoCardClass: "bg-rose-50 text-rose-900 ring-rose-200",
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

          <path d={describeArc(cx, cy, radius, 180, 135)} fill="none" stroke="#4B0082" strokeWidth="18" strokeLinecap="butt" />
          <path d={describeArc(cx, cy, radius, 135, 90)} fill="none" stroke="#4169E1" strokeWidth="18" strokeLinecap="butt" />
          <path d={describeArc(cx, cy, radius, 90, 45)} fill="none" stroke="#228B22" strokeWidth="18" strokeLinecap="butt" />
          <path d={describeArc(cx, cy, radius, 45, 0)} fill="none" stroke="#ADFF2F" strokeWidth="18" strokeLinecap="butt" />

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

      <div className={`mt-3 rounded-2xl p-3 text-sm ring-1 ${band.infoCardClass}`}>
        <div className="text-xs font-semibold uppercase tracking-wide opacity-85">Cấu trúc phân tử Anthocyanin chiếm ưu thế</div>
        <div className="mt-1 font-semibold">{band.molecule}</div>
      </div>

      <div className="mt-3 rounded-2xl bg-black/20 p-3 ring-1 ring-white/20 backdrop-blur-sm">
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