import type { AIModelStatus, AIRecognitionMeta, AlertStatus, PatchAnalysis, SegmentationLabel } from "./types";

type AnalyzeAIVisionInput = {
  imageData: ImageData;
  patch: PatchAnalysis;
  qrDecoded: boolean;
};

type TFModel = {
  classify: (img: HTMLCanvasElement, topK?: number) => Promise<Array<{ className: string; probability: number }>>;
};

type AIModelRuntime = {
  model: TFModel | null;
  status: AIModelStatus;
};

let cachedRuntimePromise: Promise<AIModelRuntime> | null = null;

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

async function ensureAIModel(): Promise<AIModelRuntime> {
  if (cachedRuntimePromise) return cachedRuntimePromise;

  cachedRuntimePromise = (async () => {
    const startedAt = performance.now();

    try {
      const tf = await import("@tensorflow/tfjs");
      const mobilenet = await import("@tensorflow-models/mobilenet");

      let backend: AIModelStatus["backend"] = "cpu";
      try {
        await tf.setBackend("webgl");
        backend = "webgl";
      } catch {
        await tf.setBackend("cpu");
        backend = "cpu";
      }
      await tf.ready();

      const model = await mobilenet.load({ version: 1, alpha: 0.5 });

      return {
        model,
        status: {
          ready: true,
          fallbackOnly: false,
          provider: "tfjs-mobilenet",
          backend,
          loadMs: Math.round(performance.now() - startedAt),
        },
      };
    } catch {
      return {
        model: null,
        status: {
          ready: false,
          fallbackOnly: true,
          provider: "heuristic",
          backend: "none",
          loadMs: Math.round(performance.now() - startedAt),
        },
      };
    }
  })();

  return cachedRuntimePromise;
}

function toCanvas(imageData: ImageData) {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function cropRegion(imageData: ImageData, region: PatchAnalysis["region"]) {
  const src = toCanvas(imageData);
  if (!src) return null;

  const canvas = document.createElement("canvas");
  canvas.width = region.width;
  canvas.height = region.height;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(src, region.x, region.y, region.width, region.height, 0, 0, region.width, region.height);
  return canvas;
}

function estimateCornerAndEdgeDensity(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { edgeDensity: 0, cornerDensity: 0 };

  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  if (width < 3 || height < 3) return { edgeDensity: 0, cornerDensity: 0 };

  const lum = new Float32Array(width * height);
  for (let i = 0, j = 0; i < data.length; i += 4, j += 1) {
    lum[j] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  }

  let edgeCount = 0;
  let cornerCount = 0;
  let total = 0;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const idx = y * width + x;
      const gx = lum[idx + 1] - lum[idx - 1];
      const gy = lum[idx + width] - lum[idx - width];
      const mag = Math.hypot(gx, gy);
      if (mag > 35) edgeCount += 1;

      const g45 = lum[idx + width + 1] - lum[idx - width - 1];
      const g135 = lum[idx + width - 1] - lum[idx - width + 1];
      const harrisLike = gx * gx * gy * gy - 0.04 * (gx * gx + gy * gy + g45 * g45 + g135 * g135);
      if (harrisLike > 1_500_000) cornerCount += 1;

      total += 1;
    }
  }

  return {
    edgeDensity: total === 0 ? 0 : edgeCount / total,
    cornerDensity: total === 0 ? 0 : cornerCount / total,
  };
}

function segmentationFromPatch(patch: PatchAnalysis) {
  const hue = patch.hsv.h;
  const warmLightBias = (patch.averageRgb.r + 1) / (patch.averageRgb.b + 1);

  let label: SegmentationLabel = "purple-under-warm-light";
  if (hue <= 170) label = "green-advanced-spoilage";
  else if (hue <= 238) label = "blue-spoilage";

  if (label === "purple-under-warm-light" && warmLightBias < 1.08 && hue < 245) {
    label = "blue-spoilage";
  }

  const confidence = clamp01(
    0.42 +
      patch.clarityScore * 0.2 +
      patch.confidence * 0.2 +
      Math.max(0, 0.25 - patch.glareScore * 0.9) +
      Math.max(0, 0.2 - patch.lowLightScore * 0.8)
  );

  return {
    label,
    confidence,
  };
}

function visualInspectionStatus(segmentationLabel: SegmentationLabel, qrStructureScore: number) {
  if (segmentationLabel === "green-advanced-spoilage") {
    return {
      status: "critical" as const,
      confidence: clamp01(0.74 + (1 - qrStructureScore) * 0.2),
    };
  }

  if (segmentationLabel === "blue-spoilage") {
    return {
      status: "spoiled" as const,
      confidence: clamp01(0.66 + (1 - qrStructureScore) * 0.16),
    };
  }

  return {
    status: "spoiled" as const,
    confidence: clamp01(0.55 + (1 - qrStructureScore) * 0.14),
  };
}

function statusToNotes(status: AlertStatus) {
  if (status === "critical") return "Mau va bien dang cho thay nguy co hu hong cao.";
  if (status === "spoiled") return "Mau da vuot nguong canh bao trong che do visual inspection.";
  return "Ket qua visual inspection duoc tinh theo rung chuong canh bao.";
}

export async function analyzeAIVision(input: AnalyzeAIVisionInput): Promise<AIRecognitionMeta> {
  const runtime = await ensureAIModel();
  const patchCanvas = cropRegion(input.imageData, input.patch.region);

  const detectionBase = clamp01(
    0.38 +
      input.patch.clarityScore * 0.24 +
      input.patch.confidence * 0.18 +
      Math.max(0, 0.2 - input.patch.glareScore * 0.8) +
      Math.max(0, 0.2 - input.patch.lowLightScore * 0.8)
  );

  const geometry = patchCanvas ? estimateCornerAndEdgeDensity(patchCanvas) : { edgeDensity: 0, cornerDensity: 0 };
  const rectificationScore = clamp01(0.36 + geometry.edgeDensity * 0.35 + geometry.cornerDensity * 0.55);

  let objectDetectionConfidence = detectionBase;
  const notes: string[] = [];

  if (runtime.model && patchCanvas) {
    try {
      const predictions = await runtime.model.classify(patchCanvas, 2);
      const top = predictions[0]?.probability ?? 0;
      objectDetectionConfidence = clamp01(detectionBase * 0.82 + top * 0.18);
      notes.push(`AI model active (${runtime.status.backend})`);
    } catch {
      notes.push("AI model classification failed, heuristic mode applied");
    }
  } else {
    notes.push("AI model unavailable, heuristic fallback applied");
  }

  const segmentation = segmentationFromPatch(input.patch);
  const qrStructureScore = clamp01(
    objectDetectionConfidence * 0.24 +
      rectificationScore * 0.36 +
      input.patch.clarityScore * 0.25 +
      Math.max(0, 0.15 - input.patch.glareScore * 0.45) +
      Math.max(0, 0.14 - input.patch.lowLightScore * 0.4)
  );

  const mode: AIRecognitionMeta["mode"] = input.qrDecoded && qrStructureScore >= 0.7 ? "decoder-first" : "visual-inspection";

  if (mode === "decoder-first") {
    notes.push("QR structure is stable enough for jsQR/html5 decoder path.");
    return {
      mode,
      qrStructureScore: Number(qrStructureScore.toFixed(2)),
      objectDetectionConfidence: Number(objectDetectionConfidence.toFixed(2)),
      segmentationConfidence: Number(segmentation.confidence.toFixed(2)),
      segmentationLabel: segmentation.label,
      rectificationScore: Number(rectificationScore.toFixed(2)),
      model: runtime.status,
      notes,
    };
  }

  const visualDecision = visualInspectionStatus(segmentation.label, qrStructureScore);
  notes.push(statusToNotes(visualDecision.status));

  return {
    mode,
    qrStructureScore: Number(qrStructureScore.toFixed(2)),
    objectDetectionConfidence: Number(objectDetectionConfidence.toFixed(2)),
    segmentationConfidence: Number(segmentation.confidence.toFixed(2)),
    segmentationLabel: segmentation.label,
    rectificationScore: Number(rectificationScore.toFixed(2)),
    visualStatus: visualDecision.status,
    visualConfidence: Number(visualDecision.confidence.toFixed(2)),
    model: runtime.status,
    notes,
  };
}
