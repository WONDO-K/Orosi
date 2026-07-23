import type { NoteDocument } from "./note";

export function spreadsheetTableFromText(text: string): NoteDocument | null {
  if (!text.includes("\t")) return null;
  const rows = text
    .replace(/\r/g, "")
    .split("\n")
    .filter((row) => row.length > 0)
    .map((row) => row.split("\t"));
  const columnCount = rows[0]?.length ?? 0;
  if (
    rows.length < 2 ||
    columnCount < 2 ||
    rows.some((row) => row.length !== columnCount)
  ) {
    return null;
  }

  return {
    type: "doc",
    content: [
      {
        type: "table",
        content: rows.map((row, rowIndex) => ({
          type: "tableRow",
          content: row.map((cell) => ({
            type: rowIndex === 0 ? "tableHeader" : "tableCell",
            content: [
              {
                type: "paragraph",
                content: cell ? [{ type: "text", text: cell }] : [],
              },
            ],
          })),
        })),
      },
    ],
  };
}
