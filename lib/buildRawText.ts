export interface RawInput { text: string; participants: string; context: string; media: { label: string; text: string }[]; }
export function buildRawText(input: RawInput): string {
  const parts: string[] = [];
  if (input.participants.trim()) parts.push(`## Participants\n${input.participants.trim()}`);
  if (input.context.trim()) parts.push(`## Context\n${input.context.trim()}`);
  if (input.text.trim()) parts.push(`## Written notes\n${input.text.trim()}`);
  for (const m of input.media) {
    if (m.text.trim()) parts.push(`## ${m.label}\n${m.text.trim()}`);
  }
  return parts.join("\n\n");
}
