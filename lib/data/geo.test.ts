import { describe, expect, it } from "vitest";
import { zipToState } from "./geo";

describe("zipToState", () => {
  it.each([
    ["20001", "DC"],
    ["20199", "VA"],
    ["20201", "DC"],
    ["20599", "DC"],
    ["20601", "MD"],
    ["21999", "MD"],
    ["22001", "VA"],
    ["24699", "VA"],
    ["20746-1234", "MD"],
  ])("%s → %s", (zip, state) => {
    expect(zipToState(zip)).toBe(state);
  });

  it.each(["24701", "10001", "94720", "1999", "2000a", "", "200011"])("%s → null", (zip) => {
    expect(zipToState(zip)).toBeNull();
  });
});
