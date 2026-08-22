import { describe, expect, it } from "vitest";
import { legacyCategory } from "./openquizzdb-taxonomy.mjs";

describe("taxonomie OpenQuizzDB historique", () => {
  it.each([
    [23, "Tennis", "sport"],
    [63, "Jurassic Park", "cinema"],
    [71, "Chimie", "sciences"],
    [102, "Pokemon", "anime"],
    [159, "Variété française", "musique"],
    [223, "Crypto-monnaies", "technologie"],
    [260, "Pomme de terre", "gastronomie"],
    [10, "Requins", "animaux"],
    [147, "Feuilletons télévisés", "television"],
    [164, "Santé et bien-être", "sante"],
    [240, "Paris aujourd’hui", "voyages"],
    [124, "Tintin", "bandes-dessinees"],
  ])("classe le quiz %i dans %s", (id, title, expected) => {
    expect(legacyCategory(id, title)).toBe(expected);
  });

  it("désactive les collections adultes", () => {
    expect(legacyCategory(162, "Magazine Playboy")).toBe("__skip");
  });

  it("conserve les vrais quiz transversaux en culture", () => {
    expect(legacyCategory(154, "Culture générale 2")).toBe("culture");
  });
});
