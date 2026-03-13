import { describe, expect, it } from "vitest";
import { createExecutionBuffer } from "../src/codex/execution-buffer";

describe("createExecutionBuffer", () => {
  it("returns appended lines in order", () => {
    const buffer = createExecutionBuffer(3);

    buffer.append("first");
    buffer.append("second");

    expect(buffer.snapshot()).toBe("first\nsecond");
  });

  it("keeps only the most recent configured number of lines", () => {
    const buffer = createExecutionBuffer(2);

    buffer.append("first");
    buffer.append("second");
    buffer.append("third");

    expect(buffer.snapshot()).toBe("second\nthird");
  });
});
