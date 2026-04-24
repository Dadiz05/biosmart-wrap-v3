import fs from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";

const OUT_DIR = path.resolve("public", "qr");
const QR_TEXT = "BS-2026-X9";

const PRODUCT_METADATA = {
  id: "BS-2026-X9",
  deployment: "Màng bọc BioSmart v2.1",
  production_date: "2026-04-23",
  indicator_ink: "Anthocyanin Complex (Bắp cải tím + Khoai lang tím)",
  certifications: ["VietGAP", "ISO 22000", "HACCP"],
  scanning_logic: "Quét mã để nhận biết mẫu, sau đó đọc màu của mẫu để tính pH.",
};

const QR_STATES = [
  {
    state: "fresh",
    label: "Tươi",
    file: "fresh.svg",
    color: "#6d28d9",
    ph_range: [5.0, 6.0],
  },
  {
    state: "degraded",
    label: "Giảm chất lượng",
    file: "degraded.svg",
    color: "#38bdf8",
    ph_range: [6.1, 7.0],
  },
  {
    state: "spoiled",
    label: "Ôi thiu",
    file: "spoiled.svg",
    color: "#22c55e",
    ph_range: [7.1, 8.4],
  },
  {
    state: "critical",
    label: "Hỏng nặng",
    file: "critical.svg",
    color: "#facc15",
    ph_range: [8.5, 9.5],
  },
];

function makeSeedFromState(state) {
  return Array.from(state).reduce((acc, char) => acc + char.charCodeAt(0), 0) + 97;
}

function createSeededRandom(seed) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function generateDamageRects(state, seed) {
  const rand = createSeededRandom(seed);
  const config = {
    degraded: { count: 12, maxSize: 2, opacity: 0.28 },
    spoiled: { count: 20, maxSize: 2, opacity: 0.4 },
    critical: { count: 30, maxSize: 3, opacity: 0.52 },
  }[state] ?? { count: 0, maxSize: 1, opacity: 0 };

  const rects = [];
  for (let i = 0; i < config.count; i += 1) {
    const x = 1 + Math.floor(rand() * 23);
    const y = 1 + Math.floor(rand() * 23);
    const w = 1 + Math.floor(rand() * config.maxSize);
    const h = 1 + Math.floor(rand() * config.maxSize);
    const opacity = (config.opacity * (0.72 + rand() * 0.56)).toFixed(2);
    rects.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#ffffff" opacity="${opacity}"/>`);
  }

  return rects.join("");
}

function buildDistortedQrSvg(baseSvg, state, color) {
  const darkPathMatch = baseSvg.match(/<path\s+stroke="[^"]+"\s+d="([^"]+)"\/>/);
  const darkPath = darkPathMatch?.[1];
  if (!darkPath) {
    return baseSvg;
  }

  const seed = makeSeedFromState(state);
  const damageRects = generateDamageRects(state, seed);
  const filterConfig = {
    degraded: { turbulence: 0.018, scale: 0.25, opacity: 0.95 },
    spoiled: { turbulence: 0.028, scale: 0.48, opacity: 0.92 },
    critical: { turbulence: 0.038, scale: 0.72, opacity: 0.88 },
  }[state] ?? { turbulence: 0, scale: 0, opacity: 1 };

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 25 25" shape-rendering="crispEdges">
  <defs>
    <filter id="distort" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="${filterConfig.turbulence}" numOctaves="2" seed="${seed}" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="${filterConfig.scale}" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
  </defs>
  <path fill="#ffffff" d="M0 0h25v25H0z"/>
  <g filter="url(#distort)" opacity="${filterConfig.opacity}">
    <path stroke="${color}" d="${darkPath}"/>
  </g>
  <g>${damageRects}</g>
</svg>`;
}

await fs.rm(OUT_DIR, { recursive: true, force: true });
await fs.mkdir(OUT_DIR, { recursive: true });

for (const state of QR_STATES) {
  const svg = await QRCode.toString(QR_TEXT, {
    type: "svg",
    margin: 2,
    width: 512,
    errorCorrectionLevel: "H",
    color: {
      dark: "#111111",
      light: "#ffffff",
    },
  });

  if (state.state === "fresh") {
    const freshSvg = svg.replace('stroke="#111111"', `stroke="${state.color}"`);
    await fs.writeFile(path.join(OUT_DIR, state.file), freshSvg, "utf8");
    continue;
  }

  const distortedSvg = buildDistortedQrSvg(svg, state.state, state.color);

  await fs.writeFile(path.join(OUT_DIR, state.file), distortedSvg, "utf8");
}

await fs.writeFile(
  path.join(OUT_DIR, "metadata.json"),
  JSON.stringify(
    {
      qr_text: QR_TEXT,
      generated_at: new Date().toISOString(),
      product_metadata: PRODUCT_METADATA,
      qr_states: QR_STATES,
    },
    null,
    2
  ),
  "utf8"
);

console.log(`Generated ${QR_STATES.length} QR assets in ${OUT_DIR}`);