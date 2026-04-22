import { useStore } from "../store/useStore";

export default function FeedbackSettings() {
  const { feedbackSettings, setFeedbackSettings } = useStore();

  return (
    <div className="rounded-2xl p-4 ring-1 bg-white/5 ring-white/20">
      <div className="text-sm font-semibold mb-3">⚙️ Phản hồi</div>
      
      <div className="space-y-2">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={feedbackSettings.haptic}
            onChange={(e) =>
              setFeedbackSettings({
                ...feedbackSettings,
                haptic: e.target.checked,
              })
            }
            className="w-4 h-4 rounded accent-blue-500"
            aria-label="Bật hoặc tắt rung điện thoại"
          />
          <span className="text-xs">Rung điện thoại</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={feedbackSettings.sound}
            onChange={(e) =>
              setFeedbackSettings({
                ...feedbackSettings,
                sound: e.target.checked,
              })
            }
            className="w-4 h-4 rounded accent-blue-500"
            aria-label="Bật hoặc tắt âm thanh phản hồi"
          />
          <span className="text-xs">Âm thanh phản hồi</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={feedbackSettings.voice}
            onChange={(e) =>
              setFeedbackSettings({
                ...feedbackSettings,
                voice: e.target.checked,
              })
            }
            className="w-4 h-4 rounded accent-blue-500"
            aria-label="Bật hoặc tắt đọc kết quả bằng giọng nói"
          />
          <span className="text-xs">Đọc kết quả bằng giọng nói</span>
        </label>
      </div>
    </div>
  );
}
