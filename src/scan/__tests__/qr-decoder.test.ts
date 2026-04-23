import { describe, expect, it } from "vitest";
import { isValidQrId, normalizeQrId } from "../qr-decoder";

describe("qr-decoder helpers", () => {
  it("normalizes whitespace around qr id", () => {
    expect(normalizeQrId("  BS-2026-X9  ")).toBe("BS-2026-X9");
  });

  it("accepts valid qr ids", () => {
    expect(isValidQrId("QR-123_ABC")).toBe(true);
    expect(isValidQrId("A1")).toBe(true);
  });

  it("rejects invalid qr ids", () => {
    expect(isValidQrId("" )).toBe(false);
    expect(isValidQrId("bad id with spaces")).toBe(false);
    expect(isValidQrId("x")).toBe(false);
  });
});