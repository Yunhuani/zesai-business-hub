import { describe, expect, it } from "vitest";
import {
  DIAGNOSIS_DIMENSIONS,
  getEstimatedDimensionStates,
} from "../client/src/pages/diagnosisProgress";

describe("diagnosis waiting progress", () => {
  it("advances dimensions on an estimated schedule while diagnosis is running", () => {
    expect(getEstimatedDimensionStates("running", 0)).toEqual([
      "active",
      "pending",
      "pending",
      "pending",
      "pending",
    ]);
    expect(getEstimatedDimensionStates("running", 35_000)).toEqual([
      "complete",
      "complete",
      "active",
      "pending",
      "pending",
    ]);
  });

  it("never shows all dimensions complete before the engine is truly done", () => {
    const states = getEstimatedDimensionStates("running", 9 * 60 * 1_000);

    expect(states).toEqual([
      "complete",
      "complete",
      "complete",
      "complete",
      "active",
    ]);
    expect(states.filter(state => state === "complete")).toHaveLength(4);
  });

  it("marks every dimension complete only for a real done status", () => {
    expect(getEstimatedDimensionStates("done", 0)).toEqual(
      DIAGNOSIS_DIMENSIONS.map(() => "complete")
    );
  });
});
