import { motion } from "framer-motion";

type PhBandInfo = {
  color: string;
  status: string;
  desc: string;
};

const DIAL_MIN_PH = 5;
const DIAL_MAX_PH = 10.5;
const ARC_START_ANGLE = -135;
const ARC_END_ANGLE = 135;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function degToRad(value: number) {
  return (value * Math.PI) / 180;
}

function pointOnArc(cx: number, cy: number, radius: number, angle: number) {
  const rad = degToRad(angle);
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

function arcPath(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = pointOnArc(cx, cy, radius, startAngle);
  const end = pointOnArc(cx, cy, radius, endAngle);
  const largeArcFlag = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

export function getPhBand(currentPH: number): PhBandInfo {
  if (currentPH <= 6.0) {
    return {
      color: "#4B0082",
      status: "Rất Tươi",
      desc: "Anthocyanin: Cation flavylium",
    };
  }
  if (currentPH <= 7.5) {
    return {
      color: "#4169E1",
      status: "Giảm Chất Lượng",
      desc: "Anthocyanin: Base quinoidal",
    };
  }
  if (currentPH <= 9.0) {
    return {
      color: "#228B22",
      status: "Ôi Thiu",
      desc: "Anthocyanin: Pseudobase",
    };
  }
  return {
    color: "#ADFF2F",
    status: "Thối Rữa",
    desc: "Anthocyanin: Chalcone",
  };
}

function phToAngle(ph: number) {
  const normalized = (clamp(ph, DIAL_MIN_PH, DIAL_MAX_PH) - DIAL_MIN_PH) / (DIAL_MAX_PH - DIAL_MIN_PH);
  return ARC_START_ANGLE + normalized * (ARC_END_ANGLE - ARC_START_ANGLE);
}

function bandArc(fromPh: number, toPh: number) {
  return {
    startAngle: phToAngle(fromPh),
    endAngle: phToAngle(toPh),
  };
}

type PhSensorDialProps = {
  currentPH: number;
  lightMode?: boolean;
  compact?: boolean;
};

export default function PhSensorDial({ currentPH, lightMode = false, compact = false }: PhSensorDialProps) {
  const band = getPhBand(currentPH);
  const angle = phToAngle(currentPH);
  const safePh = clamp(currentPH, DIAL_MIN_PH, 14);
  const arcStroke = compact ? 11 : 14;
  const radius = compact ? 66 : 76;
  const trackPath = arcPath(100, 100, radius, ARC_START_ANGLE, ARC_END_ANGLE);

  const bands = [
    { ...bandArc(5.0, 6.0), color: "#4B0082" },
    { ...bandArc(6.1, 7.5), color: "#4169E1" },
    { ...bandArc(7.6, 9.0), color: "#228B22" },
    { ...bandArc(9.01, 10.5), color: "#ADFF2F" },
  ];

  return (
    <div className={`mx-auto w-full ${compact ? "max-w-[260px]" : "max-w-[360px]"}`}>
      <div className={`relative mx-auto aspect-square w-full ${compact ? "max-w-[250px]" : "max-w-[340px]"}`}>
        <svg viewBox="0 0 200 200" className="h-full w-full" role="img" aria-label={`Đồng hồ pH, chỉ số hiện tại ${safePh.toFixed(2)}`}>
          <path d={trackPath} fill="none" stroke={lightMode ? "#cbd5e1" : "rgba(148,163,184,0.35)"} strokeWidth={arcStroke} strokeLinecap="round" />
          {bands.map((segment, index) => (
            <path
              key={index}
              d={arcPath(100, 100, radius, segment.startAngle, segment.endAngle)}
              fill="none"
              stroke={segment.color}
              strokeWidth={arcStroke}
              strokeLinecap="round"
            />
          ))}
        </svg>

        <div className="pointer-events-none absolute inset-0">
          <motion.div
            className="absolute left-1/2 top-1/2 h-[34%] w-[4px] origin-bottom rounded-full shadow"
            style={{
              backgroundColor: band.color,
              transform: "translate(-50%, -100%)",
            }}
            initial={{ rotate: ARC_START_ANGLE }}
            animate={{ rotate: angle }}
            transition={{ type: "spring", stiffness: 110, damping: 16, mass: 0.8, delay: 0.08 }}
          />

          <motion.div
            className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2"
            style={{
              backgroundColor: band.color,
              borderColor: lightMode ? "#ffffff" : "#0f172a",
            }}
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />

          <div className="absolute inset-0 flex flex-col items-center justify-center pt-7 text-center">
            <div className={`font-black leading-none ${compact ? "text-3xl" : "text-4xl"}`}>{safePh.toFixed(2)}</div>
            <div className={`mt-1 font-bold ${compact ? "text-xs" : "text-sm"}`} style={{ color: band.color }}>
              {band.status.toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      <div className={`mt-3 rounded-2xl p-3 text-sm ring-1 ${lightMode ? "bg-slate-50 text-slate-700 ring-slate-200" : "bg-white/5 text-white/80 ring-white/15"}`}>
        <div className="text-xs font-semibold uppercase tracking-wide opacity-70">Cấu trúc phân tử chiếm ưu thế</div>
        <div className="mt-1 font-medium">{band.desc}</div>
      </div>
    </div>
  );
}