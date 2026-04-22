import { describe, expect, it } from "vitest";
import { isValidQrId, normalizeQrId } from "../qr-decoder";

describe("qr-decoder helpers", () => {
  it("normalizes whitespace around qr id", () => {
    expect(normalizeQrId("  QR-ORIGINAL-FRESH  ")).toBe("QR-ORIGINAL-FRESH");
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