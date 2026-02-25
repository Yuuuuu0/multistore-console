import { describe, it, expect, beforeAll } from "vitest";
import { encrypt, decrypt } from "./crypto";

beforeAll(() => {
  process.env.ENCRYPTION_KEY = "test-secret-key-for-unit-tests-ok";
});

describe("crypto", () => {
  it("encrypts and decrypts roundtrip", () => {
    const secret = "AKIAIOSFODNN7EXAMPLE";
    expect(decrypt(encrypt(secret))).toBe(secret);
  });

  it("produces different ciphertext each time due to random IV", () => {
    const secret = "same-input";
    expect(encrypt(secret)).not.toBe(encrypt(secret));
  });

  it("throws if ENCRYPTION_KEY is not set", () => {
    const original = process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY;
    expect(() => encrypt("test")).toThrow("ENCRYPTION_KEY is not set");
    process.env.ENCRYPTION_KEY = original;
  });
});
