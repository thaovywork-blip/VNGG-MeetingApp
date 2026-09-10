# Thiết kế: Mini App "Ghi chú họp → Việc cần làm"

- **Ngày:** 2026-09-10
- **Trạng thái:** Đã duyệt design trong chat, chờ review spec
- **Repo:** VNGG-MeetingApp

## 1. Mục tiêu & người dùng

Tóm tắt cuộc họp và tạo follow-up tasks nhanh, hiệu quả cho nhóm 2–5 người trong team HR.
Người dùng không phải dân code. Input là ghi chú/ghi âm/ảnh của cuộc họp hoặc buổi phone-screen phỏng vấn; output là **meeting minutes** + **bảng action plan**.

## 2. Phạm vi v1

**Làm:**
- Input: text (dán/upload), ảnh, ghi âm.
- Chuyển ảnh/ghi âm → chữ (Gemini).
- Viết meeting minutes + bảng task (Greenode/Claude).
- Sửa tay trực tiếp trên bảng.
- "Kiểm tra lại với AI" (recheck).
- Xuất CSV.
- Chạy trên máy người dùng (localhost), Tiếng Việt mặc định.

**Chưa làm (để sau):**
- Video input.
- Timestamp reference (giây thứ mấy trong ghi âm).
- Deploy cho cả team.
- Lưu lịch sử nhiều cuộc họp / đăng nhập.

## 3. Kiến trúc tổng thể

Next.js (App Router) + Tailwind, chạy local (`npm run dev` → `localhost:3000`).

- **Frontend (trình duyệt):** 1 trang — khu nhập (upload file + ô mô tả/context + danh sách người tham gia) + nút "Tạo biên bản"; khu kết quả (tóm tắt + bảng task sửa được).
- **Backend (Next.js API routes, chạy trên máy):** giữ 2 API key, nhận file, gọi Gemini và Greenode, trả kết quả. Key **không bao giờ** xuất hiện ở phía trình duyệt.
- **Hai "bộ não" AI (chia vai):**
  - **Gemini (Google AI Studio):** đọc ảnh + nghe ghi âm → chữ.
  - **Greenode (Claude):** chuẩn hoá ngôn ngữ + viết minutes + phân loại task.

## 4. Luồng dữ liệu

1. **Nhận input:** text dùng thẳng; ảnh + ghi âm gửi Gemini → chữ; kèm list người tham gia & context (giúp gán đúng PIC, tránh nhầm tên).
2. **Gộp** tất cả thành **bản chữ thô** (đánh dấu nguồn từng đoạn: từ text nào / ảnh nào / đoạn ghi âm nào).
3. **Gửi Claude** với prompt 4 bước:
   - (0) Chuẩn hoá ngôn ngữ: dịch về 1 ngôn ngữ đã chọn + diễn giải slang/viết tắt/Gen Z (vd "chốt kèo", "hẻ").
   - (1) Viết meeting minutes (tóm tắt ý chính).
   - (2) Phân loại task: **Chốt** / **Đề xuất**.
   - (3) Với task đã chốt → tách **Task / PIC / Deadline**.
4. **Kiểm tra kết quả** (backend): đủ field và đúng cấu trúc không. Thiếu → tự thử lại 1 lần.
5. **Hiển thị:** tóm tắt + bảng follow-up (cột: Task / PIC / Loại(Chốt·Đề xuất) / Deadline / Reference).
6. **Người dùng review:** sửa tay inline, hoặc bấm "Kiểm tra lại với AI" (Claude đọc lại bản gốc + bảng hiện tại, tự soát & sửa).
7. **(tuỳ chọn) Xuất CSV.**

## 5. Cấu trúc dữ liệu kết quả

Backend trả về JSON có cấu trúc cố định để frontend dựng bảng và để test:

```
{
  "summary": "string — tóm tắt ý chính cuộc họp",
  "language": "vi",
  "tasks": [
    {
      "id": "string",
      "task": "string — việc cần làm",
      "pic": "string — người phụ trách (có thể rỗng)",
      "type": "chot | de_xuat",
      "deadline": "string — hạn (có thể rỗng)",
      "reference": "string — trích đoạn trong bản gốc mà task dựa vào"
    }
  ]
}
```

## 6. Giao diện & 3 trạng thái bắt buộc

- **Chưa có dữ liệu** (mới mở): hướng dẫn ngắn "kéo thả file hoặc dán ghi chú vào đây".
- **Đang chờ:** hiện tiến trình từng bước (đang nghe ghi âm → đang đọc ảnh → đang viết minutes…).
- **Lỗi:** báo rõ hỏng ở bước nào, cho thử lại, giữ nguyên dữ liệu đã nhập.
- Bảng kết quả sửa inline; có nút đổi ngôn ngữ output (mặc định Tiếng Việt).
- Áp dụng chuẩn `emil-design-eng` cho toàn bộ phần giao diện; toast dùng Sonner.

## 7. Xử lý lỗi

- File quá lớn / định dạng lạ → báo rõ, không crash.
- Gemini/Greenode lỗi hoặc hết quota → báo rõ bước nào, cho thử lại; dữ liệu đã nhập không mất.
- Kết quả thiếu field → tự thử lại 1 lần, vẫn thiếu thì hiện phần có được + cảnh báo.

## 8. Bảo mật & dữ liệu

- 2 key (Gemini + Greenode) trong `.env`; `.env` nằm trong `.gitignore`.
- Chỉ gọi AI từ backend, key không lộ ra trình duyệt.
- **Chỉ dùng dữ liệu giả để test** — không dùng ghi âm/CV/tên người thật.

## 9. Kiểm thử

- Test hàm ghép "bản chữ thô" bằng dữ liệu mẫu giả.
- Test hàm bóc/parse JSON kết quả từ Claude (chịu được trường hợp model trả kèm chữ thừa).
- Test từng API route với input giả (mock lời gọi AI, không tốn quota mỗi lần chạy).
- Tự bấm thử end-to-end 1 bộ dữ liệu giả: 1 đoạn text + 1 ảnh + 1 ghi âm ngắn.

## 10. Thứ tự build (milestones)

1. **Lõi text:** dán text → Claude → minutes + bảng task hiển thị được. (Chạy được đầu tiên.)
2. **Thêm ảnh:** upload ảnh → Gemini đọc chữ → gộp vào bản thô.
3. **Thêm ghi âm:** upload audio → Gemini nghe ra chữ → gộp vào bản thô.
4. **Review:** sửa tay inline + "Kiểm tra lại với AI".
5. **Xuất CSV.**
6. **Đánh bóng giao diện** theo `emil-design-eng` + `review-animations`.

Mỗi milestone là một vòng nhỏ: làm → tự bấm thử → merge vào `main`.

## 11. Cấu trúc thư mục dự kiến

```
app/                     # Next.js App Router (giao diện + API routes)
  page.tsx               # trang chính
  api/process/route.ts   # nhận input → gọi Gemini + Claude → trả kết quả
  api/recheck/route.ts   # kiểm tra lại với AI
lib/
  gemini.ts              # gọi Gemini (ảnh/audio → chữ)
  greenode.ts            # gọi Greenode/Claude (minutes + phân loại)
  buildRawText.ts        # gộp input → bản chữ thô
  parseResult.ts         # bóc JSON kết quả từ Claude
  prompts.ts             # các prompt
components/              # bảng task, khu upload, trạng thái…
.env.example             # mẫu 2 key (không chứa key thật)
```
