# Scan Test Checklist

## Muc tieu
- Xac nhan luong 2 pipeline: decode QR va phan tich mau tren QR hoat dong doc lap.
- Dam bao khong doan mo ID neu QR khong doc duoc.
- Danh gia fallback khi mau QR mo, thieu sang, bi loa.

## Tieu chi pass/fail dinh luong
- QR timeout: fail neu > 12s ma chua doc duoc QR.
- QR case pass: co QR ID hop le, khong rong, khong suy dien tu mau.
- pH case pass: hien thi pH lien tuc (2 chu so thap phan) va phLevel 0-200.
- Confidence pass co ban: >= 0.70 trong dieu kien tot.
- Fallback mau fail: confidence < 0.50 + warning nang phai thong bao yeu cau quet lai.

## Matrix moi truong
| Moi truong | Cach test | Muc tieu pass |
|---|---|---|
| Trong nha | den phong thong thuong | QR doc < 12s, confidence pH >= 0.70 |
| Ngoai troi | anh sang tu nhien | QR doc on dinh, confidence pH >= 0.65 |
| Co loa nhe | de nguon sang chieu xien | Co warning glare, app khong crash |
| Goc nghieng | nghieng camera 20-35 do | QR van doc duoc, pH dao dong <= 0.5 |
| Khoang cach gan/xa | 15cm va 45cm | Co it nhat 1 khoang cach pass on dinh |

## Case nghiep vu
### 1) QR doc duoc, mau QR tot
- Buoc:
  1. Dua toan bo QR vao trong 1 khung quet.
  2. Quet trong anh sang on dinh.
- Ky vong:
  - Hien QR ID.
  - Hien pH so lien tuc.
  - Hien trang thai canh bao.
  - Hien confidence.

### 2) QR doc duoc, mau QR loi
- Buoc:
  1. Van de QR ro.
  2. Co tinh tao dieu kien mau QR xau (loa, mo, qua toi).
- Ky vong:
  - Van ghi nhan QR ID dung.
  - Thong bao loi de hieu: mau QR khong du ro, yeu cau quet lai.
  - Khong gan ID sai.

### 3) QR khong doc duoc
- Buoc:
  1. Che mot phan QR hoac de QR ngoai khung.
- Ky vong:
  - Bao loi ro rang QR khong doc duoc.
  - Khong tra ve QR ID gia.
  - Khong sang buoc phan tich mau-final.

## Mau bao cao nhanh
| Ngay | Nguoi test | Dieu kien | Case | Ket qua | Confidence | Ghi chu |
|---|---|---|---|---|---|---|
| YYYY-MM-DD |  |  |  | Pass/Fail | 0.00 |  |
