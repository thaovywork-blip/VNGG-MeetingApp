import { expect, test } from "vitest";
import { buildRawText } from "../buildRawText";

test("includes participants, context, typed text and each media block with its label", () => {
  const out = buildRawText({
    text: "Chốt kèo deadline thứ 6",
    participants: "An, Bình",
    context: "Họp tuyển dụng",
    media: [{ label: "Ảnh 1", text: "ghi chú bảng trắng" }, { label: "Ghi âm 1", text: "phần thảo luận" }],
  });
  expect(out).toContain("An, Bình");
  expect(out).toContain("Họp tuyển dụng");
  expect(out).toContain("Chốt kèo deadline thứ 6");
  expect(out).toContain("Ảnh 1");
  expect(out).toContain("ghi chú bảng trắng");
  expect(out).toContain("Ghi âm 1");
});
test("omits empty sections cleanly", () => {
  const out = buildRawText({ text: "chỉ có text", participants: "", context: "", media: [] });
  expect(out).toContain("chỉ có text");
  expect(out.toLowerCase()).not.toContain("người tham gia");
});
