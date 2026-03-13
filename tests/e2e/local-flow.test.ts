import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("local bridge flow guide", () => {
  it("documents the expected local verification steps", () => {
    const readme = readFileSync(
      join(process.cwd(), "README.md"),
      "utf8",
    );

    expect(readme).toContain("ping");
    expect(readme).toContain("non-allowlisted");
    expect(readme).toContain("timeout");
    expect(readme).toContain("npm run dev");
    expect(readme).toContain("/reset");
    expect(readme).toContain("attachments");
  });
});
