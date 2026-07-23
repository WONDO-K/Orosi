import { adSlots, sanitizePublicText, validateReport } from "./safety";
describe("safety policy", () => {
  it("places non-personalized ads after eight cards and every twenty thereafter", () =>
    expect(adSlots(48)).toEqual([8, 28, 48]));
  it("sanitizes executable markup and links before public use", () =>
    expect(sanitizePublicText("<script>x</script> https://bad.test")).toBe(
      "x [link]",
    ));
  it("validates report categories", () =>
    expect(() => validateReport("spam", "")).not.toThrow());
});
