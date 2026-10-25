import crypto from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(crypto.scrypt);

export class PasswordService {
  private static readonly KEY_LEN = 64;
  private static readonly SALT_LEN = 32;

  public static async hash(password: string): Promise<string> {
    const salt = crypto.randomBytes(this.SALT_LEN).toString("hex");
    const derivedKey = (await scryptAsync(password, salt, this.KEY_LEN)) as Buffer;
    return `scrypt:${salt}:${derivedKey.toString("hex")}`;
  }

  public static async verify(password: string, hash: string): Promise<boolean> {
    const parts = hash.split(":");
    if (parts.length !== 3 || parts[0] !== "scrypt") {
      return false;
    }
    const [, salt, originalKeyHex] = parts;
    const originalKey = Buffer.from(originalKeyHex, "hex");
    const derivedKey = (await scryptAsync(password, salt, this.KEY_LEN)) as Buffer;
    if (originalKey.length !== derivedKey.length) {
      return false;
    }
    return crypto.timingSafeEqual(originalKey, derivedKey);
  }
}
