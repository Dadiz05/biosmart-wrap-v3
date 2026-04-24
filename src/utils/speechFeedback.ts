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
 * Lấy voice tiếng Việt giọng nữ.
 * Ưu tiên: vi-VN nữ → vi-VN bất kỳ → vi-* bất kỳ
 */
function getVietnameseVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const femaleKeywords = ["female", "woman", "thu", "linh", "lan", "huong", "my", "ha", "nu"];
  const isFemale = (v: SpeechSynthesisVoice) =>
    femaleKeywords.some((kw) => v.name.toLowerCase().includes(kw));

  return (
    voices.find((v) => v.lang === "vi-VN" && isFemale(v)) ??
    voices.find((v) => v.lang === "vi-VN") ??
    voices.find((v) => v.lang.startsWith("vi")) ??
    null
  );
}

/**
 * Đợi voices load xong rồi mới speak.
 * - Desktop Chrome: getVoices() đã có ngay
 * - Mobile Chrome/Android: cần chờ sự kiện voiceschanged
 * - iOS Safari: getVoices() sync nhưng đôi khi rỗng lần đầu
 */
function speakWhenReady(utterance: SpeechSynthesisUtterance): void {
  const trySpeak = () => {
    const voice = getVietnameseVoice();
    if (voice) utterance.voice = voice;
    // Đảm bảo lang luôn là vi-VN dù có voice hay không
    utterance.lang = "vi-VN";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const voices = window.speechSynthesis.getVoices();

  if (voices.length > 0) {
    // Voices đã sẵn sàng (desktop hoặc iOS sync)
    trySpeak();
  } else {
    // Mobile async — chờ voiceschanged
    const onVoicesChanged = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
      trySpeak();
    };
    window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);

    // Fallback sau 1.5s nếu voiceschanged không bao giờ fire (một số thiết bị cũ)
    setTimeout(() => {
      window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
      // Speak dù không có voice tiếng Việt — ít nhất còn đọc được
      utterance.lang = "vi-VN";
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }, 1500);
  }
}

export function speakScanResult(result: AIResult, enabled: boolean = false): void {
  if (!enabled) return;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  try {
    const text = buildSpeechText(result);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "vi-VN";
    utterance.rate = 0.92;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    speakWhenReady(utterance);
  } catch {
    // Bỏ qua lỗi trên thiết bị không hỗ trợ
  }
}

export function stopSpeechFeedback(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
}