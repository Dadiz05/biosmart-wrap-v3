import type { ColorTriple, RegionRect } from "./types";

export type VideoFrameCapture = {
  imageData: ImageData;
  previewDataUrl: string;
  width: number;
  height: number;
};

function clampRect(region: RegionRect, width: number, height: number): RegionRect {
  const x = Math.max(0, Math.min(width - 1, Math.round(region.x)));
  const y = Math.max(0, Math.min(height - 1, Math.round(region.y)));
  const w = Math.max(1, Math.min(width - x, Math.round(region.width)));
  const h = Math.max(1, Math.min(height - y, Math.round(region.height)));
  return { x, y, width: w, height: h };
}

export function captureVideoFrame(
  video: HTMLVideoElement,
  opts?: { maxSize?: number; quality?: number; region?: RegionRect }
): VideoFrameCapture | null {
  const vw = video.videoWidth || video.clientWidth;
  const vh = video.videoHeight || video.clientHeight;
  if (!vw || !vh) return null;

  const maxSize = opts?.maxSize ?? 960;
  const scale = Math.min(1, maxSize / Math.max(vw, vh));
  const width = Math.max(1, Math.round(vw * scale));
  const height = Math.max(1, Math.round(vh * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, width, height);

  const region = opts?.region ? clampRect(opts.region, width, height) : null;
  const imageData = region
    ? ctx.getImageData(region.x, region.y, region.width, region.height)
    : ctx.getImageData(0, 0, width, height);

  const previewDataUrl = canvas.toDataURL("image/jpeg", opts?.quality ?? 0.84);

  return { imageData, previewDataUrl, width, height };
}

export function averageColorFromImageData(imageData: ImageData): ColorTriple {
  const data = imageData.data;
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let count = 0;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 16) continue;
    rSum += data[i];
    gSum += data[i + 1];
    bSum += data[i + 2];
    count += 1;
  }

  if (count === 0) {
    return { r: 0, g: 0, b: 0 };
  }

  return {
    r: rSum / count,
    g: gSum / count,
    b: bSum / count,
  };
}
