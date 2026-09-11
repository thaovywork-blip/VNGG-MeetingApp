# Thiết kế: Mini App "Ghi chú họp → Việc cần làm"

- **Ngày:** 2026-09-10
- **Trạng thái:** Đã duyệt design trong chat, chờ review spec
- **Repo:** VNGG-MeetingApp

> **Sửa đổi 2026-09-11:** Bỏ nhãn **Chốt/Đề xuất** và cột **Reference**. Cột **PIC** vẫn giữ nhưng **model KHÔNG gán** — để trống cho người dùng **tự nhập tay** (vì với input text khó biết ai nói câu nào). Thêm cột **Note** (ghi chú ngắn) và **STT** (số thứ tự dòng). Bảng kết quả mới: **STT · Task · PIC · Deadline · Note**. (Code app đang có dùng schema cũ; cần cập nhật theo mục 4–6.)

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
  - **Greenode:** chuẩn hoá ngôn ngữ + viết minutes + rút danh sách việc cần làm (task + deadline + note). **Không gán PIC** (người dùng tự nhập), không phân loại Chốt/Đề xuất.

## 4. Luồng dữ liệu

1. **Nhận input:** text dùng thẳng; ảnh + ghi âm gửi Gemini → chữ; kèm context tuỳ chọn (giúp model hiểu bối cảnh, không dùng để gán PIC nữa).
2. **Gộp** tất cả thành **bản chữ thô** (đánh dấu nguồn từng đoạn: từ text nào / ảnh nào / đoạn ghi âm nào).
3. **Gửi model** với prompt 3 bước:
   - (0) Chuẩn hoá ngôn ngữ: dịch về 1 ngôn ngữ đã chọn + diễn giải slang/viết tắt/Gen Z (vd "chốt kèo", "hẻ").
   - (1) Viết meeting minutes (tóm tắt ý chính).
   - (2) Rút **danh sách việc cần làm**, mỗi việc gồm: **task** (việc cần làm), **deadline** (nếu có), **note** (ghi chú ngắn nếu cần — vd "chưa chốt", "cần xác nhận"). **Không** gán PIC (để trống cho người dùng nhập), **không** phân loại Chốt/Đề xuất.
4. **Kiểm tra kết quả** (backend): đủ field và đúng cấu trúc không. Thiếu → tự thử lại 1 lần.
5. **Hiển thị:** tóm tắt + bảng follow-up (cột: **STT / Task / PIC / Deadline / Note**). STT là số thứ tự dòng do giao diện tự đánh; **PIC để trống, người dùng tự nhập tay**.
6. **Người dùng review:** sửa tay inline, hoặc bấm "Kiểm tra lại với AI" (model đọc lại bản gốc + bảng hiện tại, tự soát & sửa).
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
      "pic": "string — LUÔN rỗng từ model; người dùng tự nhập trên bảng",
      "deadline": "string — hạn (có thể rỗng)",
      "note": "string — ghi chú ngắn (có thể rỗng)"
    }
  ]
}
```

- **STT** hiển thị trên bảng = số thứ tự dòng, giao diện tự đánh (1, 2, 3…), không nằm trong JSON.
- **pic** có trong JSON để bảng/CSV có chỗ chứa, nhưng model luôn trả rỗng — người dùng gõ vào. Khi "Kiểm tra lại với AI", giữ nguyên `pic` người dùng đã nhập.

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
