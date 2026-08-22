import { describe, expect, it } from "vitest";
import { botWinnerPayout } from "./bot.js";

describe("botWinnerPayout", () => {
  it.each([
    ["facile", 500, 600],
    ["moyen", 500, 750],
    ["difficile", 500, 1000],
    ["facile", 1000, 1200],
    ["moyen", 1000, 1500],
    ["difficile", 1000, 2000],
  ] as const)("applique le multiplicateur %s", (difficulty, stake, expected) => {
    expect(botWinnerPayout(stake, difficulty)).toBe(expected);
  });

  it("refuse une mise négative", () => {
    expect(() => botWinnerPayout(-1, "facile")).toThrow("Mise IA invalide");
  });
});
