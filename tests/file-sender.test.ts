import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  buildFileSendPlan,
  createFileSender,
} from "../src/feishu/file-sender";

describe("buildFileSendPlan", () => {
  it("builds a file message request for a validated file key", () => {
    const plan = buildFileSendPlan({
      chatId: "oc_1",
      fileKey: "file_key",
    });

    expect(plan.chatId).toBe("oc_1");
    expect(plan.content).toBe(JSON.stringify({ file_key: "file_key" }));
    expect(plan.msgType).toBe("file");
  });
});

describe("createFileSender", () => {
  it("uploads the file and sends a file message", async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "bridge-file-sender-"));
    const filePath = join(workspaceRoot, "report.txt");
    writeFileSync(filePath, "report");

    const client = {
      im: {
        v1: {
          file: {
            create: vi.fn().mockResolvedValue({ file_key: "file_key" }),
          },
          message: {
            create: vi.fn().mockResolvedValue(undefined),
          },
        },
      },
    };
    const sender = createFileSender(client);

    await sender({
      attachment: {
        absolutePath: filePath,
        fileName: "report.txt",
        fileType: "stream",
        relativePath: "report.txt",
        sizeBytes: 6,
      },
      chatId: "oc_1",
    });

    expect(client.im.v1.file.create).toHaveBeenCalled();
    expect(client.im.v1.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          content: JSON.stringify({ file_key: "file_key" }),
          msg_type: "file",
          receive_id: "oc_1",
        }),
      }),
    );
  });
});
