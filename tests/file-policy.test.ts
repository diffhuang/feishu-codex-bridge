import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveAllowedAttachment } from "../src/files/file-policy";

describe("resolveAllowedAttachment", () => {
  it("rejects paths outside the workspace root", () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "bridge-policy-"));
    writeFileSync(join(workspaceRoot, "README.md"), "hello");

    expect(() =>
      resolveAllowedAttachment(workspaceRoot, "../secret.txt"),
    ).toThrow();
  });

  it("returns file metadata for root-level files inside the workspace root", () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "bridge-policy-"));
    const filePath = join(workspaceRoot, "agent.md");
    writeFileSync(filePath, "hello");

    expect(resolveAllowedAttachment(workspaceRoot, "agent.md")).toMatchObject({
      fileName: "agent.md",
      fileType: "stream",
      relativePath: "agent.md",
    });
  });

  it("returns file metadata for nested files inside the workspace root", () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "bridge-policy-"));
    const docsRoot = join(workspaceRoot, "docs");
    const filePath = join(docsRoot, "notes.txt");
    mkdirSync(docsRoot, { recursive: true });
    writeFileSync(filePath, "hello");

    expect(resolveAllowedAttachment(workspaceRoot, "docs/notes.txt")).toMatchObject({
      fileName: "notes.txt",
      fileType: "stream",
      relativePath: "docs/notes.txt",
    });
  });
});
