import { describe, expect, it } from "vitest";
import { proportionalBonusAmount, summarizeWalletTotals } from "./ledger.js";

describe("wallet bonus partition", () => {
  it("separates a real deposit from a non-withdrawable bonus", () => {
    expect(summarizeWalletTotals(1_500, 500)).toEqual({
      balanceCoins: 1_500,
      playableCoins: 1_500,
      bonusCoins: 500,
      withdrawableCoins: 1_000,
      realCoins: 1_000,
    });
  });

  it("never exposes a bonus-only wallet as withdrawable", () => {
    expect(summarizeWalletTotals(500, 500).withdrawableCoins).toBe(0);
  });

  it("keeps the funding ratio when winnings come from a mixed stake pool", () => {
    expect(proportionalBonusAmount(1_800, -2_000, -500)).toBe(450);
  });

  it("keeps winnings fully non-withdrawable when the stake was all bonus", () => {
    expect(proportionalBonusAmount(180, -100, -100)).toBe(180);
  });
});
