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
  scanning_logic: "Color-to-pH Mapping",
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
    ph_range: [6.5, 7.0],
  },
  {
    state: "spoiled",
    label: "Ôi thiu",
    file: "spoiled.svg",
    color: "#22c55e",
    ph_range: [7.5, 8.5],
  },
  {
    state: "critical",
    label: "Hỏng nặng",
    file: "critical.svg",
    color: "#facc15",
    ph_range: [8.5, 9.5],
  },
];

await fs.rm(OUT_DIR, { recursive: true, force: true });
await fs.mkdir(OUT_DIR, { recursive: true });

for (const state of QR_STATES) {
  const svg = await QRCode.toString(QR_TEXT, {
    type: "svg",
    margin: 2,
    width: 512,
    errorCorrectionLevel: "H",
    color: {
      dark: state.color,
      light: "#ffffff",
    },
  });

  await fs.writeFile(path.join(OUT_DIR, state.file), svg, "utf8");
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