// Parses the plain-string `summary` field, which the AI writes using a lightweight
// markdown-style convention ("## " topic headings, "- " bullet points), into structured
// blocks. Shared by ResultView (screen rendering) and PrintDocument (print/PDF rendering)
// so both stay in sync with the same parsing rules.
export type SummaryBlock =
  | { type: "heading"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "paragraph"; text: string };

export const BULLET_PREFIXES = ["- ", "* ", "• "];

// A markdown table row: trims to something starting AND ending with "|".
function isTableRowLine(line: string): boolean {
  return line.length >= 2 && line.startsWith("|") && line.endsWith("|");
}

// Splits a "|"-delimited row into trimmed cells, dropping the leading/trailing
// empty cells produced by the row's own enclosing pipes.
function splitTableRow(line: string): string[] {
  const cells = line.split("|");
  if (cells.length && cells[0].trim() === "") cells.shift();
  if (cells.length && cells[cells.length - 1].trim() === "") cells.pop();
  return cells.map((cell) => cell.trim());
}

// The separator row between a table's header and its data rows, e.g. "| --- | --- |":
// every cell contains only dashes/colons (alignment markers), nothing else.
function isSeparatorRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every((cell) => /^:?-+:?$/.test(cell));
}

export function parseSummaryBlocks(summary: string): SummaryBlock[] {
  const lines = summary.split("\n");
  const blocks: SummaryBlock[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
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

    if (isTableRowLine(line)) {
      const headers = splitTableRow(line);
      const rows: string[][] = [];
      let j = i + 1;
      if (j < lines.length) {
        const nextLine = lines[j].trim();
        if (isTableRowLine(nextLine) && isSeparatorRow(splitTableRow(nextLine))) {
          j++;
        }
      }
      while (j < lines.length) {
        const rowLine = lines[j].trim();
        if (!isTableRowLine(rowLine)) break;
        rows.push(splitTableRow(rowLine));
        j++;
      }
      blocks.push({ type: "table", headers, rows });
      i = j - 1;
      continue;
    }

    blocks.push({ type: "paragraph", text: line });
  }

  return blocks;
}
