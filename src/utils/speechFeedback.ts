import type { AIResult } from "../types";

/**
 * Nhãn trạng thái viết theo cách TTS tiếng Việt đọc rõ nhất.
 * "ôi thiu" → "ôi thiu" vẫn bị đọc sai trên một số engine,
 * dùng "đã ôi" ngắn hơn và rõ hơn.
 */
function statusLabel(status: string): string {
  switch (status) {
    case "fresh":    return "còn tươi, an toàn";
    case "degraded": return "giảm chất lượng, cần lưu ý";
    case "spoiled":  return "đã ôi, cần cẩn thận";
    case "critical": return "hỏng nặng, nguy hiểm";
    default:         return status;
  }
}

function buildSpeechText(result: AIResult): string {
  const status = statusLabel(result.ph.status);
  // Đọc pH dạng "5 chấm 8 0" thay vì "5 phẩy 80" — engine đọc tự nhiên hơn
  const phInt = Math.floor(result.ph.ph);
  const phDec = result.ph.ph.toFixed(2).split(".")[1];
  const ph = `${phInt} chấm ${phDec}`;
  const advice = dynamicAdviceForPh(result.ph.status, result.ph.ph);

  return `Thực phẩm ${status}. Chỉ số pH ${ph}. ${advice}`;
}

function dynamicAdviceForPh(status: string, ph: number): string {
  switch (status) {
    case "fresh":
      return "Thực phẩm đang ở trạng thái tươi tốt. Hãy bảo quản lạnh để giữ chất lượng.";
    case "degraded":
      return ph >= 6.8
        ? "Độ tươi bắt đầu giảm. Nên chế biến sớm trong hôm nay."
        : "Độ tươi đang giảm nhẹ. Nên ưu tiên dùng sớm.";
    case "spoiled":
      return ph >= 8.2
        ? "Thực phẩm đang tiến sát mức nguy hiểm. Cần kiểm tra kỹ trước khi dùng."
        : "Thực phẩm đã vào vùng cảnh báo. Kiểm tra mùi và bề mặt trước khi sử dụng.";
    case "critical":
      return "Thực phẩm đã hỏng nặng. Không nên tiếp tục sử dụng.";
    default:
      return "";
  }
}

/**
 * Tìm voice tiếng Việt giọng nữ tốt nhất.
 * Thứ tự ưu tiên:
 *   1. vi-VN + giọng nữ (gender === "female" hoặc tên chứa từ khoá nữ)
 *   2. vi-VN bất kỳ
 *   3. vi-* bất kỳ
 */
function getVietnameseVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();

  // Từ khoá tên voice nữ phổ biến trên Chrome/Edge/iOS/Android
  const femaleKeywords = ["female", "woman", "girl", "thu", "linh", "lan", "huong", "my", "ha", "nu"];

  const isFemale = (v: SpeechSynthesisVoice) =>
    femaleKeywords.some((kw) => v.name.toLowerCase().includes(kw));

  return (
    // 1. vi-VN giọng nữ
    voices.find((v) => v.lang === "vi-VN" && isFemale(v)) ??
    // 2. vi-VN bất kỳ (fallback)
    voices.find((v) => v.lang === "vi-VN") ??
    // 3. vi-* bất kỳ
    voices.find((v) => v.lang.startsWith("vi")) ??
    null
  );
}

export function speakScanResult(result: AIResult, enabled: boolean = false): void {
  if (!enabled) return;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  try {
    window.speechSynthesis.cancel();

    const text = buildSpeechText(result);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "vi-VN";
    utterance.rate = 0.92;   // hơi chậm cho dễ nghe
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Gán voice tiếng Việt nếu tìm được
    const voice = getVietnameseVoice();
    if (voice) utterance.voice = voice;

    // Một số trình duyệt load voices bất đồng bộ — thử lại sau 200ms nếu chưa có voice
    if (!voice && window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.addEventListener(
        "voiceschanged",
        () => {
          const retryVoice = getVietnameseVoice();
          if (retryVoice) utterance.voice = retryVoice;
          window.speechSynthesis.speak(utterance);
        },
        { once: true },
      );
      return;
    }

    window.speechSynthesis.speak(utterance);
  } catch {
    // Bỏ qua lỗi trên thiết bị không hỗ trợ
  }
}

export function stopSpeechFeedback(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
}