import fs from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";

const outDir = path.resolve("public", "qr");
await fs.mkdir(outDir, { recursive: true });

const items = [
  { id: "123", label: "Tươi (pH 5-6, tím)" },
  { id: "456", label: "Giảm chất lượng (pH 6.5-7.5, xanh lam)" },
  { id: "789", label: "Ôi thiu (pH 7.5-8.5, xanh)" },
  { id: "999", label: "Hỏng nặng (pH 8.5-9.5, xanh vàng)" },
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

