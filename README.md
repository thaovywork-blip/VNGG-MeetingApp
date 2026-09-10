# Mini app: Cuộc họp

Ứng dụng nhỏ giúp xử lý cuộc họp: nhận ghi chú, ảnh chụp (bảng, slide, tài liệu...) hoặc file ghi âm của cuộc họp, sau đó tự động tạo ra **biên bản họp (meeting minutes)** và **bảng kế hoạch hành động (action plan)** gồm các cột Task / PIC (người phụ trách) / Loại / Deadline / Reference. Kết quả có thể **sửa tay** trực tiếp trên giao diện, bấm **"Kiểm tra lại với AI"** để AI rà soát lại, và **xuất ra file CSV** để dùng tiếp (Excel, Google Sheets...). App chạy ngay trên máy cá nhân (localhost), không cần deploy server.

## 1. Yêu cầu

Cần cài **Node.js** trước khi chạy app. Kiểm tra máy đã có Node.js chưa bằng lệnh:

```bash
node -v
```

Nếu lệnh trên báo lỗi "không tìm thấy" (not recognized), tải và cài Node.js bản LTS tại https://nodejs.org rồi thử lại.

## 2. Cài đặt

Mở terminal tại thư mục gốc của project, chạy:

```bash
npm install
```

Lệnh này tải về các thư viện cần thiết cho app, chỉ cần chạy 1 lần (hoặc lại khi có cập nhật code).

## 3. Cấu hình API key

App cần 2 nhóm key để hoạt động:

1. Copy file `.env.example` thành file mới tên `.env.local`.
2. Mở `.env.local` và điền các giá trị:
   - `GEMINI_API_KEY`: key lấy từ Google AI Studio, dùng để **đọc ảnh** và **nghe file ghi âm rồi chuyển thành chữ**.
   - `GREENODE_BASE_URL`, `GREENODE_API_KEY`, `GREENODE_MODEL`: thông tin endpoint model nội bộ (Greenode), dùng để **viết biên bản họp** và **phân loại task** trong action plan.

**Quan trọng: KHÔNG commit file `.env.local` lên git** (file này chứa key riêng của bạn). File đã được thêm sẵn vào `.gitignore` nên git sẽ tự động bỏ qua, không cần làm gì thêm — chỉ cần không cố tình ép add nó vào.

## 4. Chạy app

```bash
npm run dev
```

Sau khi terminal báo server đã chạy, mở trình duyệt vào:

```
http://localhost:3000
```

## 5. Chạy test

```bash
npm test
```

## 6. Lưu ý bảo mật / dữ liệu

Khi test app, **chỉ dùng dữ liệu giả** (tên giả, nội dung giả). **Không** upload ghi âm thật, CV thật, hay tên người thật của đồng nghiệp/khách hàng lên app khi thử nghiệm, để tránh rò rỉ thông tin cá nhân/nhạy cảm.
