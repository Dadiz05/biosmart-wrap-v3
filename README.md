# BioSmart Wrap V2

BioSmart Wrap V2 là bản frontend riêng cho luồng quét QR sinh học. Thiết kế mới tách rõ hai pipeline:

1. Pipeline A: decode QR để lấy ID, không đoán mò nếu QR không đọc được.
2. Pipeline B: phân tích màu ngay trên vùng QR, sau khi hiệu chỉnh ánh sáng và cân bằng màu.

Kết quả scan là giá trị pH liên tục, có confidence, có mapping sang trạng thái cảnh báo để UI hiển thị rõ trên mobile.

## Kiến trúc mới

Các module chính nằm trong `src/scan/`:

- `camera.ts`: capture frame từ video, hỗ trợ crop vùng QR.
- `qr-decoder.ts`: wrapper QR decoder và validate QR ID.
- `patch-detector.ts`: tách vùng QR trung tâm, đo màu, phát hiện lóa/ánh sáng yếu.
- `color-calibration.ts`: cân bằng trắng, hiệu chỉnh sáng, chuẩn hóa màu.
- `ph-estimator.ts`: suy pH liên tục và map sang trạng thái.
- `scan-pipeline.ts`: ghép output cuối cùng cho scan session.
- `types.ts`: kiểu dữ liệu scan đầy đủ.

UI và state cũng được tách lại:

- `src/components/QRScanner.tsx`: luồng quét 2 bước với modal kết quả trực quan.
- `src/components/ResultCard.tsx`: hiển thị kết quả scan với UI thân thiện: vòng tròn màu sắc lớn, từ khóa dễ hiểu ("TƯƠI NGON", "CẦN NẤU KỸ", "CẢNH BÁO", "NGUY HIỂM"), lời giải thích ngắn gọn, và toggle chi tiết kỹ thuật.
- `src/components/ScanHistory.tsx`: lịch sử scan có pH/confidence.
- `src/pages/Home.tsx`: điều khiển live/mock mode và chọn demo preset.
- `src/store/useStore.ts`: lưu scan state, phase, history.

## Tính năng chính

- QR ban đầu cố định, dễ in/dặm thủ công.
- Camera đọc QR và phân tích màu ngay trên QR trong cùng một lượt scan.
- **Giao diện kết quả thân thiện với người dùng**: hiển thị trạng thái bằng vòng tròn màu sắc lớn + emoji, từ khóa rõ ràng, giải thích lý do chi tiết.
- pH trả về dạng liên tục, kèm `phLevel` trên thang 0-200.
- Có confidence cho QR, màu QR, và pH.
- Có fallback khi ánh sáng kém, lóa, hoặc vùng QR không rõ.
- Chi tiết kỹ thuật ẩn sau nút toggle để không làm người dùng bối rối.

## Chạy local

### Frontend

```bash
npm install
npm run dev
```

Các mode môi trường:

```bash
npm run dev:staging
npm run build:dev
npm run build:staging
npm run build:prod
```

### Backend riêng

Backend nằm trong thư mục `backend/` và có thể chạy độc lập:

```bash
cd backend
npm install
npm run dev
```

## Lưu ý deploy Vercel

Frontend và backend deploy tách riêng.

- Frontend Vercel không cần env bắt buộc nếu gọi API cùng domain qua `/api`.
- Nếu frontend cần trỏ API public khác domain, set `VITE_API_BASE_URL`.
- Nếu dùng `api/proxy.ts` trên Vercel, cần set `BIOSMART_BACKEND_URL` trỏ tới backend đã deploy, ví dụ `https://your-backend.example.com`.
- Giá trị `BIOSMART_BACKEND_URL` không được có dấu `/` cuối.

## PWA / Offline

- Ứng dụng có service worker để cache giao diện, QR gốc và dataset mẫu.
- Khi mất mạng, app sẽ mở trang offline nhẹ thay vì lỗi trắng màn hình.
- Trên trình duyệt hỗ trợ, người dùng có thể cài app qua nút `Cài app` ở màn hình chính.

## Lịch sử quét

- Lịch sử quét có biểu đồ xu hướng pH dạng SVG gọn nhẹ.
- Có thể tải lịch sử ra CSV hoặc JSON ngay trong giao diện.
- Khi gặp lỗi runtime, app hiển thị màn hình an toàn thay vì trắng trang.

## Accessibility

- Hỗ trợ phím tắt trong màn hình quét: `Esc` để đóng, `Enter` để quét lại/bắt đầu.
- Có tuỳ chọn đọc kết quả bằng giọng nói trong mục `Phản hồi`.
- Scanner đã thêm ARIA role/label cho dialog, trạng thái và nút chính.

## Kiểm thử

- `npm test`: chạy bộ test Vitest cho pH estimator, QR decoder và fallback logic.
- `npm run build`: kiểm tra build production sau khi thay đổi UI hoặc logic.

## Demo QR chuan

Home page dung 4 ma QR BioSmart moi trong `public/qr` de test nhanh:

- `BS-2026-X9` → fresh / degraded / spoiled / critical
- Metadata tra cuu sau scan nam o `public/qr/metadata.json`

## Checklist test

Checklist chi tiet de test thuc dia nam o `docs/scan-test-checklist.md`.

### Điều kiện môi trường

- Trong nhà: pass nếu QR decode trong 12 giây và pH confidence >= 0.70.
- Ngoài trời: pass nếu vẫn đọc QR ổn định và confidence vùng màu QR >= 0.65.
- Có lóa nhẹ: pass nếu app cảnh báo lóa nhưng vẫn trả pH với confidence >= 0.55.
- Góc nghiêng: pass nếu QR vẫn đọc được và pH không nhảy quá 0.5 đơn vị giữa 2 lần quét liên tiếp.
- Khoảng cách gần/xa: pass nếu QR đọc được ở cả hai đầu khoảng cách sử dụng thực tế.

### Case nghiệp vụ

- QR đọc được, màu QR tốt: pass khi QR ID hiển thị đúng, pH có 2 chữ số thập phân, confidence >= 0.70.
- QR đọc được, màu QR lỗi: pass khi app vẫn cho pH nhưng gắn warning rõ ràng, hoặc yêu cầu quét lại nếu confidence quá thấp.
- QR không đọc được: pass khi app báo lỗi rõ ràng và không tạo ID giả.

### Tiêu chí định lượng cơ bản

- QR decode timeout mặc định: 12 giây.
- pH hiển thị trên thang liên tục, đồng thời có `phLevel` 0-200.
- Confidence dưới 0.5 cần hiển thị cảnh báo rõ ràng cho người dùng.

## Ghi chú kỹ thuật

- TensorFlow.js đã được bỏ khỏi luồng runtime hiện tại để giữ build nhẹ hơn.
- Khi sau này muốn thay heuristic bằng model ML, chỉ cần thay phần `scan/` mà không phải đổi UI.
