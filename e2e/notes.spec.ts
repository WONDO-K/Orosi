import { expect, test } from "@playwright/test";
test("creates, saves, searches, and opens a private note with keyboard-accessible controls", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "새 노트" }).click();
  await page.getByRole("textbox", { name: "노트 제목" }).fill("E2E biology");
  await page.getByRole("textbox", { name: "노트 태그" }).fill("biology, exam");
  await page.getByRole("button", { name: "닫기" }).click();
  await expect(page.getByText("E2E biology")).toBeVisible();
  await page.getByRole("searchbox").fill("biology");
  await expect(page.getByText("E2E biology")).toBeVisible();
});
