import { describe, it, expect } from "vitest";
import { rupeesToPaise, formatPaiseToINR, validateRupeeInput } from "./currency.js";

describe("Frontend Currency Utilities", () => {
  it("converts integer rupees string to exact integer paise", () => {
    expect(rupeesToPaise("2500000")).toBe(250000000);
    expect(rupeesToPaise("0")).toBe(0);
    expect(rupeesToPaise("150.50")).toBe(15050);
  });

  it("rejects malformed currency input and fractional paise without silent rounding", () => {
    expect(() => rupeesToPaise("150.555")).toThrow(/Invalid currency amount/);
    expect(() => rupeesToPaise("-500")).toThrow(/Invalid currency amount/);
    expect(() => rupeesToPaise("abc")).toThrow(/Invalid currency amount/);
  });

  it("formats integer paise to standard Indian Rupee string", () => {
    expect(formatPaiseToINR(125000000)).toBe("₹12,50,000");
    expect(formatPaiseToINR(0)).toBe("₹0");
    expect(formatPaiseToINR(15050)).toBe("₹150.50");
  });

  it("validates rupee input strings for forms", () => {
    expect(validateRupeeInput("1000")).toBeNull();
    expect(validateRupeeInput("1000.50")).toBeNull();
    expect(validateRupeeInput("")).toBe("Price is required.");
    expect(validateRupeeInput("-10")).toBe("Price must be a non-negative number.");
    expect(validateRupeeInput("10.999")).toBe("Price cannot have more than 2 decimal places.");
  });
});
