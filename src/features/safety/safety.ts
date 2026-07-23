export const REPORT_CATEGORIES = [
  "spam",
  "abuse",
  "copyright",
  "sexual",
  "violence",
  "other",
] as const;
export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

export function validateReport(category: ReportCategory, detail: string): void {
  if (!REPORT_CATEGORIES.includes(category))
    throw new Error("Unsupported report category");
  if (detail.trim().length > 1000) throw new Error("Report detail is too long");
}

export function adSlots(organicCardCount: number): number[] {
  if (organicCardCount < 8) return [];
  const slots = [8];
  for (let position = 28; position <= organicCardCount; position += 20)
    slots.push(position);
  return slots;
}

export function sanitizePublicText(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/https?:\/\/\S+/gi, "[link]")
    .trim();
}
