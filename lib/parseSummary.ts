// Parses the plain-string `summary` field, which the AI writes using a lightweight
// markdown-style convention ("## " topic headings, "- " bullet points), into structured
// blocks. Shared by ResultView (screen rendering) and PrintDocument (print/PDF rendering)
// so both stay in sync with the same parsing rules.
export type SummaryBlock =
  | { type: "heading"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "paragraph"; text: string };

export const BULLET_PREFIXES = ["- ", "* ", "• "];

export function parseSummaryBlocks(summary: string): SummaryBlock[] {
  const lines = summary.split("\n");
  const blocks: SummaryBlock[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith("## ")) {
      blocks.push({ type: "heading", text: line.slice(3).trim() });
      continue;
    }

    const bulletPrefix = BULLET_PREFIXES.find((prefix) => line.startsWith(prefix));
    if (bulletPrefix) {
      const item = line.slice(bulletPrefix.length).trim();
      const last = blocks[blocks.length - 1];
      if (last && last.type === "bullets") {
        last.items.push(item);
      } else {
        blocks.push({ type: "bullets", items: [item] });
      }
      continue;
    }

    blocks.push({ type: "paragraph", text: line });
  }

  return blocks;
}
