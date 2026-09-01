import { describe, expect, it } from "vitest";
import { resolveVipStatus, VIP_WIN_TARGET } from "./service.js";

describe("VIP eligibility", () => {
  it("keeps a standard player locked below the performance target", () => {
    expect(resolveVipStatus(null, VIP_WIN_TARGET - 1)).toMatchObject({
      isVip: false,
      source: null,
      remainingWins: 1,
      canCreateTournament: false,
    });
  });

  it("unlocks every VIP permission at the performance target", () => {
    expect(resolveVipStatus(null, VIP_WIN_TARGET)).toMatchObject({
      isVip: true,
      source: "PERFORMANCE",
      remainingWins: 0,
      canCreateTournament: true,
    });
  });

  it("gives an admin-appointed player the same VIP entitlement", () => {
    const grantedAt = new Date("2026-08-27T09:00:00.000Z");
    expect(resolveVipStatus(grantedAt, 0)).toMatchObject({
      isVip: true,
      source: "ADMIN",
      grantedAt,
      canCreateTournament: true,
    });
  });

  it("lets an administrator operate tournaments without forging a VIP badge", () => {
    expect(resolveVipStatus(null, 0, true)).toMatchObject({
      isVip: false,
      source: null,
      canCreateTournament: true,
    });
  });
});
