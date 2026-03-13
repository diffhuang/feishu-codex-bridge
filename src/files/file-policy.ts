import { realpathSync, statSync } from "node:fs";
import { basename, extname, isAbsolute, relative, resolve } from "node:path";

export type FeishuFileType =
  | "doc"
  | "mp4"
  | "opus"
  | "pdf"
  | "ppt"
  | "stream"
  | "xls";

export type ValidatedAttachment = {
  absolutePath: string;
  fileName: string;
  fileType: FeishuFileType;
  relativePath: string;
  sizeBytes: number;
};

const MAX_FILE_BYTES = 30 * 1024 * 1024;

export function resolveAllowedAttachment(
  workspaceRoot: string,
  attachmentPath: string,
): ValidatedAttachment {
  const normalizedPath = attachmentPath.trim();
  if (!normalizedPath) {
    throw new Error("Attachment path cannot be empty.");
  }

  const workspaceRealPath = realpathSync(workspaceRoot);
  const targetPath = isAbsolute(normalizedPath)
    ? normalizedPath
    : resolve(workspaceRealPath, normalizedPath);
  const targetRealPath = realpathSync(targetPath);
  const relativePath = relative(workspaceRealPath, targetRealPath);

  if (!relativePath || relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new Error("Attachment path must stay inside the workspace root.");
  }

  const normalizedRelativePath = relativePath.replaceAll("\\", "/");

  const targetStat = statSync(targetRealPath);
  if (!targetStat.isFile()) {
    throw new Error("Attachment path must point to a file.");
  }

  if (targetStat.size <= 0) {
    throw new Error("Attachment file is empty.");
  }

  if (targetStat.size > MAX_FILE_BYTES) {
    throw new Error("Attachment file exceeds the 30 MB Feishu limit.");
  }

  const fileName = basename(targetRealPath);

  return {
    absolutePath: targetRealPath,
    fileName,
    fileType: inferFeishuFileType(fileName),
    relativePath: normalizedRelativePath,
    sizeBytes: targetStat.size,
  };
}

function inferFeishuFileType(fileName: string): FeishuFileType {
  switch (extname(fileName).toLowerCase()) {
    case ".doc":
    case ".docx":
      return "doc";
    case ".mp4":
      return "mp4";
    case ".opus":
      return "opus";
    case ".pdf":
      return "pdf";
    case ".ppt":
    case ".pptx":
      return "ppt";
    case ".xls":
    case ".xlsx":
      return "xls";
    default:
      return "stream";
  }
}
