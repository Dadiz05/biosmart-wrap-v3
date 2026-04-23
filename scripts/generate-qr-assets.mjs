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

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function buildQrCardSvg(qrSvg, state) {
  const qrInner = qrSvg
    .replace(/^<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "");
  const accent = state.color;
  const label = escapeXml(state.label);
  const range = escapeXml(`pH ${state.ph_range[0]} - ${state.ph_range[1]}`);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 760" width="640" height="760" role="img" aria-label="Mã QR BioSmart ${label}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#f8fafc"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="640" height="760" rx="40" fill="url(#bg)"/>
  <rect x="28" y="28" width="584" height="704" rx="36" fill="#ffffff" stroke="${accent}" stroke-width="16"/>
  <rect x="64" y="56" width="512" height="72" rx="22" fill="${accent}" opacity="0.12"/>
  <text x="320" y="100" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#0f172a">${label}</text>
  <text x="320" y="690" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="600" fill="#334155">${range}</text>
  <g transform="translate(64 150)">${qrInner}</g>
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

  const cardSvg = buildQrCardSvg(svg, state);

  await fs.writeFile(path.join(OUT_DIR, state.file), cardSvg, "utf8");
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