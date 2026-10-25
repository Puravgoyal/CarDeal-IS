export function validateRupeeInput(val: string): string | null {
  const trimmed = val.trim();
  if (trimmed === "") {
    return "Price is required.";
  }
  const num = Number(trimmed);
  if (isNaN(num)) {
    return "Price must be a valid number.";
  }
  if (num < 0) {
    return "Price must be a non-negative number.";
  }
  const parts = trimmed.split(".");
  if (parts.length > 2 || (parts.length === 2 && parts[1].length > 2)) {
    return "Price cannot have more than 2 decimal places.";
  }
  return null;
}

export function rupeesToPaise(val: string | number): number {
  const str = String(val).trim();
  const error = validateRupeeInput(str);
  if (error) {
    throw new Error(`Invalid currency amount: ${error}`);
  }

  const parts = str.split(".");
  const wholePart = BigInt(parts[0]);
  let fractionalPaise = 0n;

  if (parts.length === 2) {
    const fracStr = parts[1].padEnd(2, "0");
    fractionalPaise = BigInt(fracStr);
  }

  const totalPaise = wholePart * 100n + fractionalPaise;
  if (totalPaise > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("Currency amount exceeds maximum safe integer.");
  }

  return Number(totalPaise);
}

export function formatPaiseToINR(paise: number): string {
  if (!Number.isSafeInteger(paise) || paise < 0) {
    return "₹0";
  }

  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: paise % 100 === 0 ? 0 : 2
  }).format(rupees);
}
