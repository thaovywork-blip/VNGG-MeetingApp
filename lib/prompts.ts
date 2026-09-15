export const GEMINI_IMAGE_PROMPT =
  "Đọc toàn bộ chữ có trong ảnh này và ghi lại thành văn bản thuần. Chỉ trả về phần chữ, không giải thích.";
export const GEMINI_AUDIO_PROMPT =
  "Nghe đoạn ghi âm và chuyển thành chữ (transcript) đầy đủ, giữ nguyên ý. Chỉ trả về phần chữ, không giải thích.";

export function buildClaudePrompt(rawText: string, language: string): string {
  return `Bạn là trợ lý ghi biên bản họp. Dưới đây là ghi chú thô của một cuộc họp (nhiều nguồn, đã ghép lại).

Làm theo đúng các bước:
0. Chuẩn hoá ngôn ngữ: dịch mọi thứ về ngôn ngữ "${language}", diễn giải slang/viết tắt/Gen Z (vd "chốt kèo" = đã thống nhất).
1. Tạo một tiêu đề ngắn gọn (khoảng 3-8 từ) nêu chủ đề chính của cuộc họp, đặt vào field "title".
2. Viết meeting minutes vào "summary": tóm tắt ý chính cuộc họp.
3. Rút danh sách việc cần làm: với mỗi việc, tách nội dung việc (task), hạn (deadline), và ghi chú ngắn nếu cần (note) — ví dụ bối cảnh hoặc lưu ý thêm.

QUAN TRỌNG: KHÔNG gán người phụ trách (PIC) cho bất kỳ việc nào — người dùng sẽ tự nhập tay. KHÔNG phân loại việc là "chốt" hay "đề xuất".

CHỈ trả về một object JSON hợp lệ, KHÔNG kèm chữ nào khác, theo đúng khuôn:
{"title": string, "summary": string, "language": "${language}", "tasks": [{"task": string, "deadline": string, "note": string}]}

GHI CHÚ THÔ:
"""
${rawText}
"""`;
}

export function buildRecheckPrompt(rawText: string, currentJson: string, language: string): string {
  return `Đây là ghi chú thô gốc và bảng kết quả hiện tại (có thể có lỗi).
Đọc lại ghi chú gốc, soát và sửa lại task/deadline/note cho đúng. Bảng hiện tại có trường "pic" do người dùng tự nhập tay cho từng việc — GIỮ NGUYÊN giá trị "pic" của mỗi việc, chỉ echo lại y nguyên, KHÔNG được tự thêm/sửa/xoá PIC. Bảng hiện tại cũng có trường "title" — GIỮ NGUYÊN hoặc tinh chỉnh nhẹ cho gọn hơn nếu cần, KHÔNG được bỏ trống.
CHỈ trả về JSON đúng khuôn sau, ngôn ngữ "${language}":
{"title": string, "summary": string, "language": "${language}", "tasks": [{"task": string, "pic": string, "deadline": string, "note": string}]}

GHI CHÚ GỐC:
"""
${rawText}
"""

BẢNG HIỆN TẠI:
${currentJson}`;
}
