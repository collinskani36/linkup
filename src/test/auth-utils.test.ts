import { describe, expect, it } from "vitest";

import {
  ageProblem,
  emailProblem,
  normalizeKenyanPhone,
  passwordProblem,
  usernameProblem,
} from "@/lib/auth-utils";

describe("normalizeKenyanPhone", () => {
  it.each([
    ["0712 345 678", "+254712345678"],
    ["0112345678", "+254112345678"],
    ["254712345678", "+254712345678"],
    ["+254 712-345-678", "+254712345678"],
    ["712345678", "+254712345678"],
  ])("accepts %s", (input, expected) => {
    expect(normalizeKenyanPhone(input)).toBe(expected);
  });

  it.each(["", "12345", "0912345678", "+255712345678", "07123456789"])("rejects %s", (input) => {
    expect(normalizeKenyanPhone(input)).toBeNull();
  });
});

describe("field rules", () => {
  it("validates usernames", () => {
    expect(usernameProblem("wanjiku_m")).toBeNull();
    expect(usernameProblem("Wanjiku_M")).toBeNull(); // lower-cased before checking
    expect(usernameProblem("ab")).not.toBeNull();
    expect(usernameProblem("has space")).not.toBeNull();
    expect(usernameProblem("way_too_long_username_here")).not.toBeNull();
  });

  it("validates age, email and password", () => {
    expect(ageProblem("17")).not.toBeNull();
    expect(ageProblem("18")).toBeNull();
    expect(ageProblem("")).not.toBeNull();
    expect(emailProblem("a@b.co")).toBeNull();
    expect(emailProblem("nope")).not.toBeNull();
    expect(passwordProblem("1234567")).not.toBeNull();
    expect(passwordProblem("12345678")).toBeNull();
  });
});
