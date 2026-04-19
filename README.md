# BioSmart Wrap (PWA)

**BioSmart Wrap** là Progressive Web App (PWA) quét **QR sinh học (mực Anthocyanin)** để đánh giá độ tươi thực phẩm:

- **Quét được QR** → truy xuất thông tin sản phẩm + phân tích màu QR (AI) → suy ra **pH** → đánh giá **tươi/cảnh báo/nguy hiểm**
- **Không quét được / lỗi** → **chốt chặn số**: “QR bị vô hiệu hóa → có thể thực phẩm đã hỏng”

## Tech Stack

- **Frontend**: React + TypeScript + Vite, TailwindCSS, html5-qrcode, TensorFlow.js, Zustand
- **Backend**: Node.js (Express)
- **Database**: Neo4j (tuỳ chọn). Nếu chưa cấu hình Neo4j thì backend dùng mock data để chạy ngay.

## Cấu trúc thư mục (Frontend)

`src/`

- `components/` (`QRScanner.tsx`, `ResultCard.tsx`, `StatusBadge.tsx`, `Toast.tsx`)
- `pages/` (`Home.tsx`)
- `services/` (`api.ts`, `aiService.ts`)
- `hooks/` (`useCamera.ts`)
- `store/` (`useStore.ts`)

## Chạy project (Dev)

### 1) Backend

```bash
cd backend
npm install
npm run dev
```

API:

- `GET /product/:qrId`
- `GET /health`

### 2) Frontend

```bash
cd ..
npm install
npm run dev
```

Mở app tại URL Vite in ra (thường là `http://localhost:5173`).

## Neo4j (Tuỳ chọn)

Nếu bạn có Neo4j, set env và backend sẽ ưu tiên query Neo4j trước, nếu không có sẽ fallback mock:

```bash
set NEO4J_URI=neo4j://localhost:7687
set NEO4J_USER=neo4j
set NEO4J_PASSWORD=your_password
```

Graph schema gợi ý:

- `(p:Product { qrId, name, packDate })-[:SUPPLIED_BY]->(s:Supplier { name })`

## AI model (Tuỳ chọn)

`src/services/aiService.ts` có 2 mode:

- **Có model TFJS**: đặt model tại `public/model/model.json` (GraphModel), output classes theo thứ tự: `[purple, blue, green, yellow]`
- **Không có model**: fallback heuristic (HSV bucket) để chạy ngay

## PWA

- `public/manifest.json`
- `public/sw.js` (cache cơ bản)
- App tự register service worker trong `src/main.tsx`

## Demo QR (2 case)

Đã tạo sẵn 2 mã QR để bạn test nhanh:

- `public/qr/demo-789.svg` → **Cảnh báo** (AI demo override: `blue`, pH ~7.2)
- `public/qr/demo-999.svg` → **Nguy hiểm** (AI demo override: `yellow`, pH ~10.6)

Chạy dev server rồi mở trực tiếp:

- `/qr/demo-789.svg`
- `/qr/demo-999.svg`
