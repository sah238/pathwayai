import { describe, expect, it } from "vitest";
import { findNumbers, numbersAreGrounded } from "./verify-numbers";

describe("findNumbers", () => {
  it.each([
    ["$52,340 a year", [52340]],
    ["up 10.2%", [10.2]],
    ["about 85k", [85000]],
    ["2 million jobs", [2000000]],
    ["twelve hours", [12]],
    ["half the day", [0.5]],
    ["work 24/7", [24, 7]],
    ["a 3D model", [3]],
    ["½ day", [1, 2]],
    ["１２ hours", [12]],
  ])("reads %s", (text, expected) => {
    expect(findNumbers(text)).toEqual(expected);
  });

  it("finds nothing in ordinary text", () => {
    expect(findNumbers("First you help someone, then no one waits for one another.")).toEqual([]);
  });

  it("does not read a unit as a scale", () => {
    expect(findNumbers("5 miles")).toEqual([5]);
  });
});

describe("numbersAreGrounded", () => {
  it("accepts text with no numbers", () => {
    expect(numbersAreGrounded("You fix wiring.", ["Repair wiring."])).toBe(true);
  });

  it("accepts the same value written another way", () => {
    expect(numbersAreGrounded("Lift twelve boxes and $1,500 of gear.", ["Lift 12 boxes.", "Track 1500 dollars."])).toBe(true);
  });

  it("rejects a number not in the source", () => {
    expect(numbersAreGrounded("You work 40 hours.", ["Repair wiring."])).toBe(false);
  });

  it("rejects a rounded number", () => {
    expect(numbersAreGrounded("About 52,000.", ["Pay is 52,340."])).toBe(false);
  });
});
