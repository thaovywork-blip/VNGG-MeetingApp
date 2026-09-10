export const GEMINI_IMAGE_PROMPT =
  "Đọc toàn bộ chữ có trong ảnh này và ghi lại thành văn bản thuần. Chỉ trả về phần chữ, không giải thích.";
export const GEMINI_AUDIO_PROMPT =
  "Nghe đoạn ghi âm và chuyển thành chữ (transcript) đầy đủ, giữ nguyên ý. Chỉ trả về phần chữ, không giải thích.";

export function buildClaudePrompt(rawText: string, language: string): string {
  return `Bạn là trợ lý ghi biên bản họp. Dưới đây là ghi chú thô của một cuộc họp (nhiều nguồn, đã ghép lại).

Làm theo đúng 4 bước:
0. Chuẩn hoá ngôn ngữ: dịch mọi thứ về ngôn ngữ "${language}", diễn giải slang/viết tắt/Gen Z (vd "chốt kèo" = đã thống nhất).
1. Viết meeting minutes: tóm tắt ý chính cuộc họp.
2. Phân loại mỗi việc là "chot" (đã chốt) hay "de_xuat" (mới đề xuất).
3. Với mỗi việc, tách: nội dung việc (task), người phụ trách (pic), hạn (deadline). Mỗi việc kèm "reference" = trích đúng đoạn trong ghi chú thô mà việc đó dựa vào.

CHỈ trả về một object JSON hợp lệ, KHÔNG kèm chữ nào khác, theo đúng khuôn:
{"summary": string, "language": "${language}", "tasks": [{"task": string, "pic": string, "type": "chot"|"de_xuat", "deadline": string, "reference": string}]}

GHI CHÚ THÔ:
"""
${rawText}
"""`;
}
