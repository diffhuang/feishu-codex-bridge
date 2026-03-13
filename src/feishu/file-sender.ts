import { readFile } from "node:fs/promises";
import type { ValidatedAttachment, FeishuFileType } from "../files/file-policy";

type FeishuFileClient = {
  im: {
    v1: {
      file: {
        create: (payload: {
          data: {
            file: Buffer;
            file_name: string;
            file_type: FeishuFileType;
          };
        }) => Promise<{ file_key?: string } | null>;
      };
      message: {
        create: (payload: {
          data: {
            content: string;
            msg_type: "file";
            receive_id: string;
          };
          params: {
            receive_id_type: "chat_id";
          };
        }) => Promise<unknown>;
      };
    };
  };
};

export type FileSendPayload = {
  attachment: ValidatedAttachment;
  chatId: string;
  requestId?: string;
};

export function buildFileSendPlan(input: { chatId: string; fileKey: string }) {
  return {
    chatId: input.chatId,
    content: JSON.stringify({ file_key: input.fileKey }),
    msgType: "file" as const,
  };
}

export function createFileSender(client: FeishuFileClient) {
  return async (payload: FileSendPayload): Promise<void> => {
    const upload = await client.im.v1.file.create({
      data: {
        file: await readFile(payload.attachment.absolutePath),
        file_name: payload.attachment.fileName,
        file_type: payload.attachment.fileType,
      },
    });

    const fileKey = upload?.file_key;
    if (!fileKey) {
      throw new Error(`Feishu did not return a file key for ${payload.attachment.relativePath}.`);
    }

    const plan = buildFileSendPlan({
      chatId: payload.chatId,
      fileKey,
    });

    await client.im.v1.message.create({
      data: {
        content: plan.content,
        msg_type: plan.msgType,
        receive_id: plan.chatId,
      },
      params: {
        receive_id_type: "chat_id",
      },
    });
  };
}
