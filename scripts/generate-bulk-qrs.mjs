import fs from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";

const outDir = path.resolve("public", "qr", "batch");
await fs.mkdir(outDir, { recursive: true });

const total = Number(process.argv[2] ?? 160);
const minPh = 5.0;
const maxPh = 9.5;

const COLOR_STOPS = [
  { at: 0.0, h: 282, s: 80, l: 35 }, // tim
  { at: 0.33, h: 220, s: 82, l: 36 }, // xanh lam
  { at: 0.66, h: 140, s: 78, l: 34 }, // xanh la
  { at: 1.0, h: 82, s: 84, l: 36 }, // xanh vang
];

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function hslToHex(h, s, l) {
  const hh = ((h % 360) + 360) % 360;
  const ss = clamp01(s / 100);
  const ll = clamp01(l / 100);
  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = ll - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (hh < 60) {
    r = c;
    g = x;
  } else if (hh < 120) {
    r = x;
    g = c;
  } else if (hh < 180) {
    g = c;
    b = x;
  } else if (hh < 240) {
    g = x;
    b = c;
  } else if (hh < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  const toHex = (n) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function gradientByIndex(index, count) {
  const t = count <= 1 ? 0 : (index - 1) / (count - 1);

  let left = COLOR_STOPS[0];
  let right = COLOR_STOPS[COLOR_STOPS.length - 1];
  for (let i = 0; i < COLOR_STOPS.length - 1; i += 1) {
    const a = COLOR_STOPS[i];
    const b = COLOR_STOPS[i + 1];
    if (t >= a.at && t <= b.at) {
      left = a;
      right = b;
      break;
    }
  }

  const localT = right.at === left.at ? 0 : (t - left.at) / (right.at - left.at);
  return {
    t,
    h: lerp(left.h, right.h, localT),
    s: lerp(left.s, right.s, localT),
    l: lerp(left.l, right.l, localT),
  };
}

function phFromIndex(index, count) {
  const t = count <= 1 ? 0 : (index - 1) / (count - 1);
  return Number((minPh + (maxPh - minPh) * t).toFixed(2));
}

function labelFromPh(ph) {
  if (ph < 6.3) return { key: "fresh", label: "Tuoi" };
  if (ph < 7.25) return { key: "degraded", label: "Giam chat luong" };
  if (ph < 8.4) return { key: "spoiled", label: "Oi thiu" };
  return { key: "critical", label: "Hong nang" };
}

function colorForIndex(index, count) {
  const base = gradientByIndex(index, count);
  const hue = base.h;
  // Keep 160 colors visually smooth while avoiding accidental duplicate hex values.
  const saturation = base.s + ((index % 5) - 2) * 0.12;
  const lightness = base.l + ((index % 7) - 3) * 0.16;
  const darkHex = hslToHex(hue, saturation, lightness);
  return {
    hue,
    darkHex,
  };
}

let generated = 0;

const manifest = [];

for (let i = 1; i <= total; i += 1) {
  const { hue, darkHex } = colorForIndex(i, total);
  const expectedPh = phFromIndex(i, total);
  const info = labelFromPh(expectedPh);
  const id = `QR-${String(i).padStart(3, "0")}`;
  const filename = `qr-${id}.svg`;
  const filePath = path.join(outDir, filename);

  const svg = await QRCode.toString(id, {
    type: "svg",
    margin: 2,
    width: 512,
    errorCorrectionLevel: "M",
    version: 1,
    maskPattern: 0,
    color: {
      dark: darkHex,
      light: "#ffffff",
    },
  });

  await fs.writeFile(filePath, svg, "utf8");

  manifest.push({
    id,
    file: `/qr/batch/${filename}`,
    group: info.key,
    expectedPh,
    expectedLabel: info.label,
    darkHex,
  });

  generated += 1;
}

const manifestPath = path.join(outDir, "manifest.json");
await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

const rowsHtml = manifest
  .map(
    (item) => `
      <article class="card">
        <img src="${item.file}" alt="${item.id}" />
        <div class="meta">
          <div class="id">${item.id}</div>
          <div class="small">${item.expectedLabel} • pH ~ ${item.expectedPh}</div>
          <div class="small">${item.darkHex}</div>
        </div>
      </article>
    `
  )
  .join("\n");

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Bulk QR Sheet</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; background: #f8fafc; color: #0f172a; }
      h1 { margin: 0 0 8px; }
      p { margin: 0 0 16px; }
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
      .card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 8px; }
      img { width: 100%; display: block; border-radius: 8px; background: white; }
      .meta { margin-top: 8px; }
      .id { font-weight: 700; font-size: 13px; }
      .small { font-size: 11px; color: #475569; }
      @media print {
        body { margin: 0; background: white; }
        .card { break-inside: avoid; }
      }
    </style>
  </head>
  <body>
    <h1>Bulk QR Sheet</h1>
    <p>Total: ${generated} QRs</p>
    <div class="grid">${rowsHtml}</div>
  </body>
</html>
`;

await fs.writeFile(path.join(outDir, "index.html"), html, "utf8");

console.log(`Generated ${generated} QR files in ${outDir}`);
console.log(`Manifest: ${manifestPath}`);
