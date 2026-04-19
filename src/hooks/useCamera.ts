import { useCallback, useMemo } from "react";

export function useCamera(readerId = "reader") {
  const getVideoElement = useCallback((): HTMLVideoElement | null => {
    const root = document.getElementById(readerId);
    if (!root) return null;
    return root.querySelector("video");
  }, [readerId]);

  const captureFrame = useCallback(
    (opts?: { maxSize?: number; quality?: number }) => {
      const video = getVideoElement();
      if (!video) return null;

      const vw = video.videoWidth || video.clientWidth;
      const vh = video.videoHeight || video.clientHeight;
      if (!vw || !vh) return null;

      const maxSize = opts?.maxSize ?? 512;
      const scale = Math.min(1, maxSize / Math.max(vw, vh));
      const w = Math.max(1, Math.round(vw * scale));
      const h = Math.max(1, Math.round(vh * scale));

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;

      ctx.drawImage(video, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const previewDataUrl = canvas.toDataURL("image/jpeg", opts?.quality ?? 0.82);

      return { imageData, previewDataUrl, width: w, height: h };
    },
    [getVideoElement]
  );

  return useMemo(
    () => ({
      getVideoElement,
      captureFrame,
    }),
    [getVideoElement, captureFrame]
  );
}

