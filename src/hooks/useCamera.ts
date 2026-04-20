import { useCallback, useMemo } from "react";
import { captureVideoFrame } from "../scan/camera";

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
      return captureVideoFrame(video, opts);
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

