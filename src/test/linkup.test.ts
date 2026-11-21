import { describe, expect, it } from "vitest";

import { canApproveJoinRequest, isPublicVenue } from "@/lib/linkup";

describe("public LinkUp hangouts", () => {
  it("accepts Tamasha, Eldoret as a public venue", () => {
    expect(isPublicVenue("Tamasha, Eldoret")).toBe(true);
  });

  it("accepts any typed place, not just known venue names", () => {
    expect(isPublicVenue("Sirikwa Grounds")).toBe(true);
    expect(isPublicVenue("Kapsoya Gardens, Eldoret")).toBe(true);
  });

  it("keeps house parties out of the public plans", () => {
    expect(isPublicVenue("My house, Eldoret")).toBe(false);
    expect(isPublicVenue("house party at Kimumu")).toBe(false);
  });

  it("rejects an empty venue", () => {
    expect(isPublicVenue("   ")).toBe(false);
  });
});

describe("LinkUp crew seat approvals", () => {
  it("allows the requested approval when 3 of 6 seats are filled", () => {
    expect(canApproveJoinRequest(3, 6)).toBe(true);
  });

  it("does not approve a request when all 6 seats are filled", () => {
    expect(canApproveJoinRequest(6, 6)).toBe(false);
  });
});
