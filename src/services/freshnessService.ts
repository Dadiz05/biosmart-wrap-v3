type FreshStateStatus = 0 | 1;

export type FreshStateResult = {
  status: FreshStateStatus;
  fresh: boolean;
  label: string;
  message: string;
  confidence: number;
  qrDecoded: boolean;
  metrics: {
    purpleScore: number;
    lab: { l: number; a: number; b: number };
    structuralIntegrity: number;
    contrast: number;
    glareScore: number;
    inkDominance: number;
  };
};

type LabColor = { l: number; a: number; b: number };

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function clamp255(value: number) {
  return Math.max(0, Math.min(255, value));
}

function sharpenImageData(imageData: ImageData) {
  const { width, height, data } = imageData;
  const output = new Uint8ClampedArray(data.length);
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (let ky = -1; ky <= 1; ky += 1) {
        for (let kx = -1; kx <= 1; kx += 1) {
          const sampleX = Math.max(0, Math.min(width - 1, x + kx));
          const sampleY = Math.max(0, Math.min(height - 1, y + ky));
          const sourceIndex = (sampleY * width + sampleX) * 4;
          const weight = kernel[(ky + 1) * 3 + (kx + 1)];

          r += data[sourceIndex] * weight;
          g += data[sourceIndex + 1] * weight;
          b += data[sourceIndex + 2] * weight;
          a += data[sourceIndex + 3] * weight;
        }
      }

      const targetIndex = (y * width + x) * 4;
      output[targetIndex] = clamp255(r);
      output[targetIndex + 1] = clamp255(g);
      output[targetIndex + 2] = clamp255(b);
      output[targetIndex + 3] = clamp255(a / 9);
    }
  }

  return new ImageData(output, width, height);
}

function srgbToLinear(value: number) {
  const normalized = value / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function rgbToLab(r: number, g: number, b: number): LabColor {
  const rl = srgbToLinear(r);
  const gl = srgbToLinear(g);
  const bl = srgbToLinear(b);

  const x = rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375;
  const y = rl * 0.2126729 + gl * 0.7151522 + bl * 0.072175;
  const z = rl * 0.0193339 + gl * 0.119192 + bl * 0.9503041;

  const xr = x / 0.95047;
  const yr = y / 1.0;
  const zr = z / 1.08883;

  const f = (t: number) => (t > 0.008856 ? t ** (1 / 3) : 7.787 * t + 16 / 116);

  const fx = f(xr);
  const fy = f(yr);
  const fz = f(zr);

  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

function rgbToHsv(r: number, g: number, b: number) {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;

  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const delta = max - min;

  let hue = 0;
  if (delta !== 0) {
    if (max === rr) hue = ((gg - bb) / delta) % 6;
    else if (max === gg) hue = (bb - rr) / delta + 2;
    else hue = (rr - gg) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  const saturation = max === 0 ? 0 : delta / max;
  const value = max;
  return { h: hue, s: saturation, v: value };
}

function labDistance(a: LabColor, b: LabColor) {
  const dl = a.l - b.l;
  const da = a.a - b.a;
  const db = a.b - b.b;
  return Math.sqrt(dl * dl + da * da + db * db);
}

function sampleRegion(
  imageData: ImageData,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  ignoreGlare = true
) {
  const { data, width, height } = imageData;
  const left = Math.max(0, Math.min(width, startX));
  const top = Math.max(0, Math.min(height, startY));
  const right = Math.max(left + 1, Math.min(width, endX));
  const bottom = Math.max(top + 1, Math.min(height, endY));

  let total = 0;
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let sumL = 0;
  let glareCount = 0;
  let darkCount = 0;

  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      const index = (y * width + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const a = data[index + 3];
      if (a < 16) continue;

      const hsv = rgbToHsv(r, g, b);
      const luminance = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
      const glare = hsv.v > 0.95 || luminance > 0.95;
      if (glare) {
        glareCount += 1;
        if (ignoreGlare) continue;
      }

      if (luminance < 0.2) darkCount += 1;

      total += 1;
      sumR += r;
      sumG += g;
      sumB += b;
      sumL += luminance;
    }
  }

  const avgR = total === 0 ? 0 : sumR / total;
  const avgG = total === 0 ? 0 : sumG / total;
  const avgB = total === 0 ? 0 : sumB / total;

  return {
    total,
    glareCount,
    darkCount,
    averageRgb: { r: avgR, g: avgG, b: avgB },
    averageLuminance: total === 0 ? 0 : sumL / total,
  };
}

function computePurpleScore(lab: LabColor, rgb: { r: number; g: number; b: number }) {
  const referenceA = rgbToLab(128, 0, 128); // #800080
  const referenceB = rgbToLab(75, 0, 130); // #4B0082
  const distanceA = labDistance(lab, referenceA);
  const distanceB = labDistance(lab, referenceB);
  const referenceDistance = Math.min(distanceA, distanceB);

  const bScore = clamp01((-lab.b) / 40);
  const hue = rgbToHsv(rgb.r, rgb.g, rgb.b).h;
  const hueScore = hue >= 250 && hue <= 315 ? 1 : hue >= 230 && hue < 250 ? 0.7 : 0.2;
  const distanceScore = clamp01(1 - referenceDistance / 45);

  return clamp01(bScore * 0.5 + hueScore * 0.25 + distanceScore * 0.25);
}

function computeStructuralIntegrity(imageData: ImageData) {
  const { width, height } = imageData;
  const corners = [
    sampleRegion(imageData, 0, 0, Math.round(width * 0.28), Math.round(height * 0.28), true),
    sampleRegion(imageData, Math.round(width * 0.72), 0, width, Math.round(height * 0.28), true),
    sampleRegion(imageData, 0, Math.round(height * 0.72), Math.round(width * 0.28), height, true),
  ];

  const cornerScores = corners.map((corner) => {
    if (corner.total === 0) return 0;
    const rgb = corner.averageRgb;
    const lab = rgbToLab(rgb.r, rgb.g, rgb.b);
    const contrastBias = clamp01((Math.abs(lab.a) + Math.abs(lab.b)) / 90);
    const darknessBias = clamp01(1 - corner.averageLuminance * 1.2);
    const glarePenalty = clamp01(1 - corner.glareCount / Math.max(corner.total, 1) * 2.5);
    return clamp01(contrastBias * 0.45 + darknessBias * 0.35 + glarePenalty * 0.2);
  });

  const averageCornerIntegrity = cornerScores.reduce((sum, value) => sum + value, 0) / cornerScores.length;

  const center = sampleRegion(
    imageData,
    Math.round(width * 0.32),
    Math.round(height * 0.32),
    Math.round(width * 0.68),
    Math.round(height * 0.68),
    true
  );
  const border = sampleRegion(
    imageData,
    Math.round(width * 0.08),
    Math.round(height * 0.08),
    Math.round(width * 0.92),
    Math.round(height * 0.92),
    true
  );

  const centerLab = rgbToLab(center.averageRgb.r, center.averageRgb.g, center.averageRgb.b);
  const borderLab = rgbToLab(border.averageRgb.r, border.averageRgb.g, border.averageRgb.b);
  const contrastDelta = Math.abs(centerLab.l - borderLab.l);
  const contrast = clamp01(contrastDelta / 42);

  const glarePenalty = clamp01(1 - border.glareCount / Math.max(border.total, 1) * 3);
  const integrity = clamp01(averageCornerIntegrity * 0.62 + contrast * 0.28 + glarePenalty * 0.1);

  return {
    structuralIntegrity: integrity,
    contrast,
  };
}

function analyzeFreshness(imageData: ImageData) {
  const sharpened = sharpenImageData(imageData);
  const { width, height } = sharpened;
  const scanArea = sampleRegion(
    sharpened,
    Math.round(width * 0.1),
    Math.round(height * 0.1),
    Math.round(width * 0.9),
    Math.round(height * 0.9),
    true
  );

  const lab = rgbToLab(scanArea.averageRgb.r, scanArea.averageRgb.g, scanArea.averageRgb.b);
  const purpleScore = computePurpleScore(lab, scanArea.averageRgb);
  const { structuralIntegrity, contrast } = computeStructuralIntegrity(sharpened);
  const glareScore = clamp01(scanArea.glareCount / Math.max(scanArea.total, 1));
  const inkDominance = clamp01((scanArea.darkCount / Math.max(scanArea.total, 1)) * 1.6);

  const qrDecoded = structuralIntegrity >= 0.95 && contrast >= 0.72 && glareScore <= 0.18;
  const inPurpleRange = purpleScore >= 0.72 && lab.b < -6 && lab.b >= -42;
  const fresh = qrDecoded && inPurpleRange && structuralIntegrity >= 0.95 && contrast >= 0.72;

  const confidence = clamp01(
    fresh
      ? purpleScore * 0.42 + structuralIntegrity * 0.3 + contrast * 0.18 + (1 - glareScore) * 0.1
      : purpleScore * 0.22 + structuralIntegrity * 0.22 + contrast * 0.16 + (1 - glareScore) * 0.1
  );

  return {
    status: fresh ? 1 : 0,
    fresh,
    label: fresh ? "TƯƠI" : "KHÔNG ĐẠT",
    message: fresh ? "Thực phẩm đạt độ tươi ngon 100%" : "Mẫu chưa đạt dải tím chuẩn hoặc cấu trúc QR chưa đủ ổn định.",
    confidence: Number(confidence.toFixed(2)),
    qrDecoded,
    metrics: {
      purpleScore: Number(purpleScore.toFixed(2)),
      lab: {
        l: Number(lab.l.toFixed(2)),
        a: Number(lab.a.toFixed(2)),
        b: Number(lab.b.toFixed(2)),
      },
      structuralIntegrity: Number(structuralIntegrity.toFixed(2)),
      contrast: Number(contrast.toFixed(2)),
      glareScore: Number(glareScore.toFixed(2)),
      inkDominance: Number(inkDominance.toFixed(2)),
    },
  } satisfies FreshStateResult;
}

export function checkFreshState(imageData: ImageData): FreshStateResult {
  return analyzeFreshness(imageData);
}