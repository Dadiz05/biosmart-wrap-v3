import fs from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";

const outDir = path.resolve("public", "qr");
await fs.mkdir(outDir, { recursive: true });

const items = [
  { id: "789", label: "Cảnh báo (warning)" },
  { id: "999", label: "Nguy hiểm (spoiled)" },
];

for (const it of items) {
  const svg = await QRCode.toString(it.id, {
    type: "svg",
    margin: 2,
    width: 512,
    color: { dark: "#0b1220", light: "#ffffff" },
  });
  const file = path.join(outDir, `demo-${it.id}.svg`);
  await fs.writeFile(file, svg, "utf8");
  console.log("wrote", file, "-", it.label);
}

